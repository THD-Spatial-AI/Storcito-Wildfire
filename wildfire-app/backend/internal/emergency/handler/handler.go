package emergencyhandler

import (
	"encoding/json"
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"

	"platform.local/common/pkg/httputil"

	"spatialhub_backend/internal/access"
	emergencystore "spatialhub_backend/internal/store/emergency"
)

// Handler serves the emergency-services endpoints.
type Handler struct {
	store       *emergencystore.Store
	accessStore access.ModelAccessStore
}

func NewHandler(store *emergencystore.Store, accessStore access.ModelAccessStore) *Handler {
	return &Handler{store: store, accessStore: accessStore}
}

// GetNearest handles GET /models/:id/emergency-services/nearest.
func (h *Handler) GetNearest(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	modelID, ok := parseModelID(c)
	if !ok {
		return
	}

	model, err := access.EnsureModelAccess(h.accessStore, userCtx, modelID)
	if err != nil {
		switch {
		case errors.Is(err, access.ErrModelNotFound):
			httputil.NotFound(c, "Model not found")
		case errors.Is(err, access.ErrForbidden):
			httputil.Forbidden(c, "Access denied")
		default:
			httputil.InternalError(c, "Failed to verify model access")
		}
		return
	}

	lon, lat, ok := centroidOfGeoJSON(model.Coordinates)
	if !ok {
		httputil.BadRequest(c, "Model has no valid location")
		return
	}

	services, err := h.store.NearestPerCategory(lon, lat, parseLimit(c.Query("limit")))
	if err != nil {
		httputil.InternalError(c, "Failed to fetch emergency services")
		return
	}

	httputil.SuccessResponse(c, services)
}

func parseModelID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		httputil.BadRequest(c, "Invalid model id")
		return 0, false
	}
	return uint(id), true
}

func parseLimit(raw string) int {
	if raw == "" {
		return 1
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 1
	}
	return value
}

// geoObject is a partial GeoJSON node used for centroid extraction.
type geoObject struct {
	Type        string          `json:"type"`
	Coordinates json.RawMessage `json:"coordinates"`
	Geometry    *geoObject      `json:"geometry"`
	Geometries  []*geoObject    `json:"geometries"`
	Features    []*geoObject    `json:"features"`
}

// centroidOfGeoJSON averages all coordinate positions of the geometry.
func centroidOfGeoJSON(raw datatypes.JSON) (lon, lat float64, ok bool) {
	if len(raw) == 0 {
		return 0, 0, false
	}
	var obj geoObject
	if err := json.Unmarshal(raw, &obj); err != nil {
		return 0, 0, false
	}
	var sumX, sumY float64
	var n int
	obj.collectPositions(&sumX, &sumY, &n)
	if n == 0 {
		return 0, 0, false
	}
	return sumX / float64(n), sumY / float64(n), true
}

func (g *geoObject) collectPositions(sumX, sumY *float64, n *int) {
	switch g.Type {
	case "Point":
		var point []float64
		if json.Unmarshal(g.Coordinates, &point) == nil {
			addPosition(point, sumX, sumY, n)
		}
	case "MultiPoint", "LineString":
		var points [][]float64
		if json.Unmarshal(g.Coordinates, &points) == nil {
			addPositions(points, sumX, sumY, n)
		}
	case "Polygon", "MultiLineString":
		var rings [][][]float64
		if json.Unmarshal(g.Coordinates, &rings) == nil {
			for _, ring := range rings {
				addPositions(ring, sumX, sumY, n)
			}
		}
	case "MultiPolygon":
		var polys [][][][]float64
		if json.Unmarshal(g.Coordinates, &polys) == nil {
			for _, poly := range polys {
				for _, ring := range poly {
					addPositions(ring, sumX, sumY, n)
				}
			}
		}
	case "GeometryCollection":
		for _, child := range g.Geometries {
			child.collectPositions(sumX, sumY, n)
		}
	case "Feature":
		if g.Geometry != nil {
			g.Geometry.collectPositions(sumX, sumY, n)
		}
	case "FeatureCollection":
		for _, feature := range g.Features {
			feature.collectPositions(sumX, sumY, n)
		}
	}
}

func addPositions(points [][]float64, sumX, sumY *float64, n *int) {
	for _, point := range points {
		addPosition(point, sumX, sumY, n)
	}
}

func addPosition(point []float64, sumX, sumY *float64, n *int) {
	if len(point) < 2 {
		return
	}
	*sumX += point[0]
	*sumY += point[1]
	*n++
}
