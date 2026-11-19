package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"regexp"

	"github.com/gin-gonic/gin"

	"platform.local/common/pkg/httputil"
	"spatialhub_webservice/internal/services"
)

var (
	boundaryLevelPattern = regexp.MustCompile(`^[a-z_]{1,32}$`)
	boundaryCodePattern  = regexp.MustCompile(`^[A-Za-z0-9]{1,16}$`)
)

// list one level
func (h *WebserviceHandler) ListBoundaries(c *gin.Context) {
	level := c.Param("level")
	if !boundaryLevelPattern.MatchString(level) {
		httputil.BadRequest(c, "Invalid boundary level")
		return
	}
	query := url.Values{}
	if parent := c.Query("parent"); parent != "" {
		if !boundaryCodePattern.MatchString(parent) {
			httputil.BadRequest(c, "Invalid parent code")
			return
		}
		query.Set("parent", parent)
	}
	h.respondBoundaries(c, "/"+level, query)
}

// one boundary geometry
func (h *WebserviceHandler) GetBoundary(c *gin.Context) {
	level, code := c.Param("level"), c.Param("code")
	if !boundaryLevelPattern.MatchString(level) || !boundaryCodePattern.MatchString(code) {
		httputil.BadRequest(c, "Invalid boundary level or code")
		return
	}
	h.respondBoundaries(c, "/"+level+"/"+code, url.Values{})
}

func (h *WebserviceHandler) respondBoundaries(c *gin.Context, subPath string, query url.Values) {
	result, err := h.service.GetBoundaries(c.Request.Context(), subPath, query)
	if err != nil {
		var upstream *services.BoundaryUpstreamError
		if errors.As(err, &upstream) && upstream.Status >= 400 && upstream.Status < 500 {
			httputil.ErrorResponse(c, upstream.Status, upstream.Message)
			return
		}
		if errors.As(err, &upstream) {
			httputil.ErrorResponse(c, http.StatusBadGateway, "Boundary data unavailable")
			return
		}
		httputil.HandleError(c, err)
		return
	}
	httputil.SuccessResponse(c, result)
}
