package result

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"platform.local/common/pkg/httputil"
	commonModels "platform.local/common/pkg/models"

	"github.com/gin-gonic/gin"

	"spatialhub_backend/internal/geoserver"
)

// buildAvailableLayers returns the selectable WMS layers for a result: the
// main risk map first, then each component raster. Component layer names
// mirror the deterministic scheme used by the geoservice
// (model_<id>_<key>), so no extra persistence is required.
func buildAvailableLayers(workspace, baseLayer string, result *commonModels.ModelResult) []AvailableLayer {
	qualify := func(name string) string {
		if workspace != "" && !strings.Contains(name, ":") {
			return workspace + ":" + name
		}
		return name
	}

	layers := []AvailableLayer{
		{Key: "risk", Title: "Fire Risk", LayerName: qualify(baseLayer)},
	}

	if len(result.Layers) == 0 {
		return layers
	}
	var components []commonModels.ResultLayer
	if err := json.Unmarshal(result.Layers, &components); err != nil {
		return layers
	}
	for _, cl := range components {
		layers = append(layers, AvailableLayer{
			Key:       cl.Key,
			Title:     cl.Title,
			LayerName: qualify(fmt.Sprintf("%s_%s", baseLayer, cl.Key)),
		})
	}
	return layers
}

// LayerInfoResponse is the payload consumed by the frontend to render a
// published WMS layer on the map.
type LayerInfoResponse struct {
	WMSURL          string           `json:"wms_url"`
	LayerName       string           `json:"layer_name"`
	Workspace       string           `json:"workspace,omitempty"`
	Status          string           `json:"status"`
	Bounds          *LayerBoundsDTO  `json:"bounds,omitempty"`
	Error           string           `json:"error,omitempty"`
	AvailableLayers []AvailableLayer `json:"available_layers,omitempty"`
}

// AvailableLayer is a single selectable WMS layer (the main risk map plus
// any component rasters such as vegetation or FWI) for the layer switcher.
type AvailableLayer struct {
	Key       string `json:"key"`
	Title     string `json:"title"`
	LayerName string `json:"layer_name"`
}

// LayerBoundsDTO is a map-friendly bounding box. Bounds returned by the
// geoservice are always in EPSG:4326, so the CRS is hard-coded here.
type LayerBoundsDTO struct {
	MinX float64 `json:"minx"`
	MinY float64 `json:"miny"`
	MaxX float64 `json:"maxx"`
	MaxY float64 `json:"maxy"`
	CRS  string  `json:"crs"`
}

// GetResultLayer returns the WMS layer coordinates for a published result.
// It is the companion endpoint used by the frontend viewer:
//
//	GET /results/:id/layer -> { wms_url, layer_name, status, bounds }
//
// When the layer is still being published (or has failed) we still
// respond 200 with status so the frontend can render an informative
// state without polling a 404.
func (h *ResultHandler) GetResultLayer(c *gin.Context) {
	result, ok := h.getResultFromRequest(c)
	if !ok {
		return
	}

	workspace := result.GeoserverWorkspace
	layer := result.GeoserverLayerName
	status := result.GeoserverStatus
	if status == "" {
		status = "pending"
	}

	qualifiedLayer := layer
	if workspace != "" && layer != "" && !strings.Contains(layer, ":") {
		qualifiedLayer = workspace + ":" + layer
	}

	resp := LayerInfoResponse{
		Status:    status,
		Workspace: workspace,
		LayerName: qualifiedLayer,
		WMSURL:    h.buildWMSURL(workspace),
		Error:     result.ErrorMessage,
	}

	if status == "configured" && layer != "" {
		resp.AvailableLayers = buildAvailableLayers(workspace, layer, result)
	}

	if status == "configured" && h.geoClient != nil {
		bounds, err := h.geoClient.GetBounds(c.Request.Context(), result.ID)
		if err == nil {
			resp.Bounds = &LayerBoundsDTO{
				MinX: bounds.MinX,
				MinY: bounds.MinY,
				MaxX: bounds.MaxX,
				MaxY: bounds.MaxY,
				CRS:  "EPSG:4326",
			}
		} else if !errors.Is(err, geoserver.ErrNotReady) {
			// Non-fatal: surface the error in the payload but still 200 so
			// the viewer can keep polling / show a clear message.
			resp.Error = err.Error()
		}
	}

	httputil.SuccessResponse(c, resp)
}

// buildWMSURL builds the workspace-scoped WMS endpoint served by the
// geoservice proxy. The geoservice (GEOSERVER_SERVICE_URL) exposes
// /api/geoserver-proxy/:workspace/wms which forwards to the real
// GeoServer. Returning the proxy URL keeps GeoServer itself off the
// public network.
func (h *ResultHandler) buildWMSURL(workspace string) string {
	if workspace == "" {
		return ""
	}
	base := strings.TrimRight(h.geoserverPublicURL, "/")
	if base == "" {
		return ""
	}
	return fmt.Sprintf("%s/api/geoserver-proxy/%s/wms", base, workspace)
}
