package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"spatialhub_backend/internal/apitoken"
	backendModels "spatialhub_backend/internal/models"
)

type fakeValidator struct {
	token *backendModels.APIToken
	err   error
}

func (f *fakeValidator) Validate(string) (*backendModels.APIToken, error) {
	return f.token, f.err
}

func runRequest(t *testing.T, validator APITokenValidator, method, authHeader string) (*httptest.ResponseRecorder, *gin.Context) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	var captured *gin.Context

	r := gin.New()
	r.Use(APITokenAuth(validator))
	r.Handle(method, "/x", func(c *gin.Context) {
		captured = c
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(method, "/x", nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	r.ServeHTTP(w, req)
	return w, captured
}

func TestAPITokenAuthPassesThroughWithoutToken(t *testing.T) {
	w, c := runRequest(t, &fakeValidator{err: apitoken.ErrInvalid}, http.MethodGet, "")
	if w.Code != http.StatusOK {
		t.Fatalf("expected pass-through 200, got %d", w.Code)
	}
	if c.GetBool("api_token_authenticated") {
		t.Error("request without token must not be marked token-authenticated")
	}
}

func TestAPITokenAuthRejectsInvalidToken(t *testing.T) {
	w, _ := runRequest(t, &fakeValidator{err: apitoken.ErrInvalid}, http.MethodGet, "Bearer whf_bad")
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for invalid token, got %d", w.Code)
	}
}

func TestAPITokenAuthSetsUserContext(t *testing.T) {
	tok := &backendModels.APIToken{
		ID: 1, UserID: "u-1", UserEmail: "u@example.com",
		Scope: backendModels.APITokenScopeRead, AccessLevel: "intermediate",
	}
	w, c := runRequest(t, &fakeValidator{token: tok}, http.MethodGet, "Bearer whf_good")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if got := c.GetString("user_id"); got != "u-1" {
		t.Errorf("user_id = %q", got)
	}
	if got := c.GetString("access_level"); got != "intermediate" {
		t.Errorf("access_level = %q", got)
	}
	if !c.GetBool("api_token_authenticated") {
		t.Error("expected api_token_authenticated flag")
	}
}

func TestAPITokenAuthReadScopeBlocksWrites(t *testing.T) {
	tok := &backendModels.APIToken{
		ID: 1, UserID: "u-1", UserEmail: "u@example.com",
		Scope: backendModels.APITokenScopeRead, AccessLevel: "intermediate",
	}
	w, _ := runRequest(t, &fakeValidator{token: tok}, http.MethodPost, "Bearer whf_good")
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for write with read scope, got %d", w.Code)
	}
}

func TestAPITokenExpiry(t *testing.T) {
	past := time.Now().UTC().Add(-time.Hour)
	tok := &backendModels.APIToken{ExpiresAt: &past}
	if tok.IsActive(time.Now().UTC()) {
		t.Error("expired token reported active")
	}
}
