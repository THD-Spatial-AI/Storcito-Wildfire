package httputil

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Token header
const CSRFHeaderName = "X-CSRF-Token"

// Frontend retry codes
const (
	CSRFCodeMissing = "CSRF_TOKEN_MISSING"
	CSRFCodeInvalid = "CSRF_TOKEN_INVALID"
)

// Header must match cookie
func CSRFProtection(skip func(*gin.Context) bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !csrfApplies(c) || (skip != nil && skip(c)) {
			c.Next()
			return
		}

		code, message := checkCSRF(c)
		if code != "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   message,
				"code":    code,
			})
			return
		}
		c.Next()
	}
}

func csrfApplies(c *gin.Context) bool {
	switch c.Request.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions, http.MethodTrace:
		return false
	}
	return GetSessionCookieOrEmpty(c) != ""
}

func checkCSRF(c *gin.Context) (code, message string) {
	cookie, err := c.Cookie(csrfTokenCookieName)
	if err != nil || cookie == "" {
		return CSRFCodeMissing, "CSRF token missing"
	}
	header := c.GetHeader(CSRFHeaderName)
	if header == "" {
		return CSRFCodeMissing, "CSRF token missing in request header"
	}
	if subtle.ConstantTimeCompare([]byte(cookie), []byte(header)) != 1 {
		return CSRFCodeInvalid, "CSRF token validation failed"
	}
	return "", ""
}
