package geocoding

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
)

const (
	defaultNominatimURL       = "https://nominatim.openstreetmap.org"
	defaultNominatimUserAgent = "Storcito-Wildfire/1.0"
)

type httpDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

type Handler struct {
	client    httpDoer
	baseURL   string
	userAgent string
}

type nominatimGeometry struct {
	Type        string          `json:"type"`
	Coordinates json.RawMessage `json:"coordinates"`
}

type nominatimResponse struct {
	PlaceID     int64             `json:"place_id"`
	OSMType     string            `json:"osm_type"`
	OSMID       int64             `json:"osm_id"`
	Name        string            `json:"name"`
	DisplayName string            `json:"display_name"`
	AddressType string            `json:"addresstype"`
	GeoJSON     nominatimGeometry `json:"geojson"`
	Address     nominatimAddress  `json:"address"`
}

type nominatimAddress struct {
	State       string `json:"state"`
	Region      string `json:"region"`
	Country     string `json:"country"`
	CountryCode string `json:"country_code"`
}

type administrativeRegionResponse struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	DisplayName string            `json:"displayName"`
	Country     string            `json:"country"`
	CountryCode string            `json:"countryCode,omitempty"`
	AddressType string            `json:"addressType,omitempty"`
	Source      string            `json:"source"`
	GeoJSON     nominatimGeometry `json:"geojson"`
}

func NewHandler() *Handler {
	return NewHandlerWithClient(
		defaultNominatimURL,
		defaultNominatimUserAgent,
		&http.Client{Timeout: constants.HTTPTimeoutExternal},
	)
}

func NewHandlerWithClient(baseURL, userAgent string, client httpDoer) *Handler {
	return &Handler{
		client:    client,
		baseURL:   strings.TrimRight(baseURL, "/"),
		userAgent: userAgent,
	}
}

func (h *Handler) Search(c *gin.Context) {
	searchText := strings.TrimSpace(c.Query("q"))
	if searchText == "" {
		httputil.BadRequest(c, "q is required")
		return
	}
	if len(searchText) > 200 {
		httputil.BadRequest(c, "q must be 200 characters or fewer")
		return
	}

	query := url.Values{}
	query.Set("format", "jsonv2")
	query.Set("q", searchText)
	query.Set("limit", "8")
	query.Set("addressdetails", "1")
	query.Set("polygon_geojson", "1")
	query.Set("polygon_threshold", "0.001")

	proxyNominatimJSON(c, h, "/search", query, true)
}

func (h *Handler) Reverse(c *gin.Context) {
	latitude, longitude, ok := parseCoordinates(c)
	if !ok {
		return
	}

	query := url.Values{}
	query.Set("format", "jsonv2")
	query.Set("lat", strconv.FormatFloat(latitude, 'f', -1, 64))
	query.Set("lon", strconv.FormatFloat(longitude, 'f', -1, 64))
	query.Set("addressdetails", "1")

	proxyNominatimJSON(c, h, "/reverse", query, false)
}

func (h *Handler) GetAdministrativeRegion(c *gin.Context) {
	latitude, longitude, ok := parseCoordinates(c)
	if !ok {
		return
	}

	query := url.Values{}
	query.Set("format", "jsonv2")
	query.Set("lat", strconv.FormatFloat(latitude, 'f', -1, 64))
	query.Set("lon", strconv.FormatFloat(longitude, 'f', -1, 64))
	query.Set("zoom", "5")
	query.Set("addressdetails", "1")
	query.Set("polygon_geojson", "1")
	query.Set("polygon_threshold", "0.001")
	query.Set("layer", "address")

	resp, err := h.doNominatimRequest(c, "/reverse", query)
	if err != nil {
		httputil.BadGateway(c, "Administrative boundary service is unavailable")
		return
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusNotFound {
		httputil.NotFound(c, "No administrative region boundary was found for this location")
		return
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		httputil.BadGateway(c, "Administrative boundary service returned an error")
		return
	}

	var result nominatimResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		httputil.BadGateway(c, "Administrative boundary service returned an invalid response")
		return
	}

	name := strings.TrimSpace(result.Name)
	if name == "" {
		name = strings.TrimSpace(result.Address.State)
	}
	if name == "" {
		name = strings.TrimSpace(result.Address.Region)
	}
	if name == "" || (result.GeoJSON.Type != "Polygon" && result.GeoJSON.Type != "MultiPolygon") || len(result.GeoJSON.Coordinates) == 0 {
		httputil.NotFound(c, "No administrative region boundary was found for this location")
		return
	}

	if strings.EqualFold(result.AddressType, "country") {
		httputil.NotFound(c, "Only regions inside the covered area can be selected, not a whole country")
		return
	}

	displayName := strings.TrimSpace(result.DisplayName)
	if displayName == "" {
		displayName = name
	}

	id := fmt.Sprintf("nominatim-%d", result.PlaceID)
	if result.PlaceID == 0 {
		id = fmt.Sprintf("nominatim-%s-%d", result.OSMType, result.OSMID)
	}

	httputil.SuccessResponse(c, administrativeRegionResponse{
		ID:          id,
		Name:        name,
		DisplayName: displayName,
		Country:     strings.TrimSpace(result.Address.Country),
		CountryCode: strings.ToUpper(strings.TrimSpace(result.Address.CountryCode)),
		AddressType: strings.TrimSpace(result.AddressType),
		Source:      "nominatim",
		GeoJSON:     result.GeoJSON,
	})
}

func proxyNominatimJSON(c *gin.Context, handler *Handler, path string, query url.Values, expectArray bool) {
	resp, err := handler.doNominatimRequest(c, path, query)
	if err != nil {
		httputil.BadGateway(c, "Geocoding service is unavailable")
		return
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusNotFound {
		if expectArray {
			httputil.SuccessResponse(c, []json.RawMessage{})
		} else {
			httputil.NotFound(c, "No geocoding result was found for this location")
		}
		return
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		httputil.BadGateway(c, "Geocoding service returned an error")
		return
	}

	var payload json.RawMessage
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil || !json.Valid(payload) {
		httputil.BadGateway(c, "Geocoding service returned an invalid response")
		return
	}
	if expectArray && (len(payload) == 0 || payload[0] != '[') {
		httputil.BadGateway(c, "Geocoding service returned an invalid search response")
		return
	}
	if !expectArray && (len(payload) == 0 || payload[0] != '{') {
		httputil.BadGateway(c, "Geocoding service returned an invalid reverse response")
		return
	}

	httputil.SuccessResponse(c, payload)
}

func (h *Handler) doNominatimRequest(c *gin.Context, path string, query url.Values) (*http.Response, error) {
	endpoint, err := url.Parse(h.baseURL + path)
	if err != nil {
		return nil, err
	}
	endpoint.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", h.userAgent)
	if language := strings.TrimSpace(c.GetHeader("Accept-Language")); language != "" {
		req.Header.Set("Accept-Language", language)
	}

	return h.client.Do(req)
}

func parseCoordinates(c *gin.Context) (float64, float64, bool) {
	latitude, err := strconv.ParseFloat(strings.TrimSpace(c.Query("lat")), 64)
	if err != nil || latitude < -90 || latitude > 90 {
		httputil.BadRequest(c, "lat must be a number between -90 and 90")
		return 0, 0, false
	}

	longitude, err := strconv.ParseFloat(strings.TrimSpace(c.Query("lon")), 64)
	if err != nil || longitude < -180 || longitude > 180 {
		httputil.BadRequest(c, "lon must be a number between -180 and 180")
		return 0, 0, false
	}

	return latitude, longitude, true
}
