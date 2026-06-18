package routes

import (
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"platform.local/common/pkg/httputil"
	"platform.local/platform/logger"
	"spatialhub_backend/internal/webservice"
)

func registerWebserviceProxyRoutes(api *gin.RouterGroup, client *webservice.Client) {
	proxy := makeWebserviceProxyHandler(client)
	api.Any("/webservices", proxy)
	api.Any("/webservices/*proxyPath", proxy)
}

func makeWebserviceProxyHandler(client *webservice.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userCtx, ok := httputil.GetUserContext(c)
		if !ok {
			httputil.Unauthorized(c, "Missing or invalid session")
			return
		}

		body, err := readRequestBody(c.Request.Body)
		if err != nil {
			httputil.InternalError(c, "Failed to read request body")
			return
		}

		headers := buildWebserviceProxyHeaders(c.Request.Header, userCtx)
		path := buildProxyPath(c.Request.URL)

		resp, err := client.Forward(c.Request.Context(), c.Request.Method, path, body, headers)
		if err != nil {
			logger.Logger.WithFields(logrus.Fields{
				"component": "webservice_proxy",
				"error":     err,
				"target":    client.BaseURL(),
				"path":      path,
			}).Warn("Webservice request failed")
			httputil.ErrorResponse(c, http.StatusBadGateway, "Webservice request failed")
			return
		}

		if err := writeProxyResponse(c, resp); err != nil {
			logger.Logger.WithFields(logrus.Fields{
				"component": "webservice_proxy",
				"error":     err,
			}).Warn("Failed to write response")
		}
	}
}

func readRequestBody(body io.ReadCloser) ([]byte, error) {
	if body == nil {
		return nil, nil
	}
	return io.ReadAll(body)
}

func buildWebserviceProxyHeaders(src http.Header, userCtx *httputil.UserContext) http.Header {
	headers := make(http.Header)
	copyHeaderIfPresent(headers, src, headerContentType)
	copyHeaderIfPresent(headers, src, headerAccept)
	addForwardableHeaders(headers, src)
	setUserContextHeaders(headers, userCtx)
	return headers
}

func addForwardableHeaders(dst, src http.Header) {
	for key, values := range src {
		if shouldSkipForwardHeader(key) {
			continue
		}
		for _, v := range values {
			dst.Add(key, v)
		}
	}
}

func shouldSkipForwardHeader(key string) bool {
	lower := strings.ToLower(key)
	switch lower {
	case strings.ToLower(headerContentType), strings.ToLower(headerAccept), "content-length", "host", "cookie", "authorization":
		return true
	default:
		return false
	}
}

func setUserContextHeaders(headers http.Header, userCtx *httputil.UserContext) {
	headers.Set("X-User-ID", userCtx.UserID)
	headers.Set("X-User-Email", userCtx.Email)
	headers.Set("X-User-Name", userCtx.Name)
	headers.Set("X-Access-Level", userCtx.AccessLevel)
	headers.Set("X-Group-ID", userCtx.GroupID)
}

func buildProxyPath(u *url.URL) string {
	if u == nil {
		return ""
	}
	path := u.Path
	if rawQuery := u.RawQuery; rawQuery != "" {
		path += "?" + rawQuery
	}
	return path
}

func writeProxyResponse(c *gin.Context, resp *http.Response) error {
	defer resp.Body.Close()
	copyResponseHeaders(c.Writer.Header(), resp.Header)
	c.Writer.WriteHeader(resp.StatusCode)
	_, err := io.Copy(c.Writer, resp.Body)
	return err
}

func copyResponseHeaders(dst http.Header, src http.Header) {
	for key, values := range src {
		lower := strings.ToLower(key)
		if lower == "content-length" || lower == "connection" ||
			lower == headerAccessControlAllowOrigin ||
			lower == headerAccessControlAllowCredentials ||
			lower == headerAccessControlAllowMethods ||
			lower == headerAccessControlAllowHeaders ||
			lower == headerAccessControlExposeHeaders {
			continue
		}
		for _, v := range values {
			dst.Add(key, v)
		}
	}
}

func copyHeaderIfPresent(dst http.Header, src http.Header, key string) {
	if val := src.Get(key); val != "" {
		dst.Set(key, val)
	}
}
