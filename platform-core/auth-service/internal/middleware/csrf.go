package middleware

import (
	"crypto/rand"
	"encoding/base64"

	"platform.local/common/pkg/httputil"

	"github.com/gin-gonic/gin"
)

// Cookie settings
type CSRFConfig struct {
	CookieDomain string
	CookieMaxAge int
	IsProduction bool
}

func GenerateCSRFToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic("CSRF: Failed to generate secure random token: " + err.Error())
	}
	return base64.URLEncoding.EncodeToString(b)
}

func SetCSRFTokenCookie(c *gin.Context, token string, config *CSRFConfig) {
	// HttpOnly is intentionally set to false for CSRF tokens
	// because JavaScript must read this cookie to include it in the X-CSRF-Token header.
	// This is required for the double-submit cookie CSRF protection pattern.
	httputil.SetAuthCookie(c, httputil.CookieOptions{
		Domain:       config.CookieDomain,
		IsProduction: config.IsProduction,
	}, "csrf_token", token, config.CookieMaxAge, false)
}
