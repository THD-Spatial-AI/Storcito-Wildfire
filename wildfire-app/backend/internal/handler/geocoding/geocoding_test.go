package geocoding

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

type doerFunc func(req *http.Request) (*http.Response, error)

func (f doerFunc) Do(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestGetAdministrativeRegion(t *testing.T) {
	gin.SetMode(gin.TestMode)

	client := doerFunc(func(req *http.Request) (*http.Response, error) {
		query := req.URL.Query()
		if query.Get("lat") != "42.8782" || query.Get("lon") != "-8.5448" {
			t.Fatalf("unexpected coordinates: %s", req.URL.RawQuery)
		}
		if query.Get("zoom") != "5" || query.Get("polygon_threshold") != "0.001" {
			t.Fatalf("unexpected administrative query: %s", req.URL.RawQuery)
		}
		if got := req.Header.Get("User-Agent"); got != "Storcito-Test/1.0" {
			t.Fatalf("unexpected User-Agent: %q", got)
		}

		body := `{
			"place_id": 123,
			"name": "Galicia",
			"display_name": "Galicia, España",
			"address": {"state":"Galicia","country":"España","country_code":"es"},
			"geojson": {"type":"MultiPolygon","coordinates":[[[[-8.6,42.8],[-8.5,42.8],[-8.5,42.9],[-8.6,42.8]]]]}
		}`
		return jsonResponse(http.StatusOK, body), nil
	})

	handler := NewHandlerWithClient("https://nominatim.example", "Storcito-Test/1.0", client)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/?lat=42.8782&lon=-8.5448", nil)
	handler.GetAdministrativeRegion(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Success bool `json:"success"`
		Data    struct {
			Name        string `json:"name"`
			CountryCode string `json:"countryCode"`
			GeoJSON     struct {
				Type string `json:"type"`
			} `json:"geojson"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.Success || response.Data.Name != "Galicia" || response.Data.CountryCode != "ES" || response.Data.GeoJSON.Type != "MultiPolygon" {
		t.Fatalf("unexpected response: %s", recorder.Body.String())
	}
}

func TestSearchProxiesNominatimWithoutExposingItsURLToFrontend(t *testing.T) {
	gin.SetMode(gin.TestMode)

	client := doerFunc(func(req *http.Request) (*http.Response, error) {
		if req.URL.Path != "/search" || req.URL.Query().Get("q") != "Galicia" {
			t.Fatalf("unexpected request URL: %s", req.URL.String())
		}
		return jsonResponse(http.StatusOK, `[{
			"place_id": 123,
			"display_name": "Galicia, España",
			"lat": "42.61946",
			"lon": "-7.863112"
		}]`), nil
	})

	handler := NewHandlerWithClient("https://nominatim.example", "Storcito-Test/1.0", client)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/?q=Galicia", nil)
	handler.Search(context)

	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), "Galicia, España") {
		t.Fatalf("unexpected response (%d): %s", recorder.Code, recorder.Body.String())
	}
}

func TestAdministrativeRegionRejectsInvalidCoordinates(t *testing.T) {
	gin.SetMode(gin.TestMode)

	clientCalled := false
	handler := NewHandlerWithClient("https://nominatim.example", "Storcito-Test/1.0", doerFunc(func(req *http.Request) (*http.Response, error) {
		clientCalled = true
		return nil, nil
	}))

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/?lat=120&lon=-8", nil)
	handler.GetAdministrativeRegion(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if clientCalled {
		t.Fatal("external client should not be called for invalid coordinates")
	}
}

func jsonResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}
