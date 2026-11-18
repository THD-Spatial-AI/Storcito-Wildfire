package httputil

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func csrfRouter(skip func(*gin.Context) bool) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CSRFProtection(skip))
	ok := func(c *gin.Context) { c.Status(http.StatusOK) }
	r.GET("/x", ok)
	r.POST("/x", ok)
	r.DELETE("/x", ok)
	return r
}

type csrfCase struct {
	name    string
	method  string
	session bool
	cookie  string
	header  string
	want    int
	code    string
}

func TestCSRFProtection(t *testing.T) {
	cases := []csrfCase{
		{name: "safe method passes", method: http.MethodGet, session: true, want: http.StatusOK},
		{name: "no session cookie passes", method: http.MethodPost, want: http.StatusOK},
		{name: "matching token passes", method: http.MethodPost, session: true, cookie: "tok", header: "tok", want: http.StatusOK},
		{name: "delete with matching token", method: http.MethodDelete, session: true, cookie: "tok", header: "tok", want: http.StatusOK},
		{name: "missing cookie", method: http.MethodPost, session: true, header: "tok", want: http.StatusForbidden, code: CSRFCodeMissing},
		{name: "missing header", method: http.MethodPost, session: true, cookie: "tok", want: http.StatusForbidden, code: CSRFCodeMissing},
		{name: "mismatch", method: http.MethodPost, session: true, cookie: "tok", header: "other", want: http.StatusForbidden, code: CSRFCodeInvalid},
	}
	r := csrfRouter(nil)
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, "/x", nil)
			if tc.session {
				req.AddCookie(&http.Cookie{Name: sessionIDCookieName, Value: "sess"})
			}
			if tc.cookie != "" {
				req.AddCookie(&http.Cookie{Name: csrfTokenCookieName, Value: tc.cookie})
			}
			if tc.header != "" {
				req.Header.Set(CSRFHeaderName, tc.header)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tc.want {
				t.Fatalf("status = %d, want %d", w.Code, tc.want)
			}
			if tc.code != "" {
				var body struct{ Code string }
				_ = json.Unmarshal(w.Body.Bytes(), &body)
				if body.Code != tc.code {
					t.Fatalf("code = %q, want %q", body.Code, tc.code)
				}
			}
		})
	}
}

func TestCSRFProtectionSkip(t *testing.T) {
	r := csrfRouter(func(*gin.Context) bool { return true })
	req := httptest.NewRequest(http.MethodPost, "/x", nil)
	req.AddCookie(&http.Cookie{Name: sessionIDCookieName, Value: "sess"})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("skipped request status = %d, want 200", w.Code)
	}
}
