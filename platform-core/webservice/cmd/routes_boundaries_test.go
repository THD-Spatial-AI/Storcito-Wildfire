package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestBoundaryRoutesRegister(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	registerRoutes(r, &appDependencies{})

	want := map[string]bool{
		"/api/webservices/boundaries/:level":       false,
		"/api/webservices/boundaries/:level/:code": false,
	}
	for _, route := range r.Routes() {
		if _, ok := want[route.Path]; ok && route.Method == http.MethodGet {
			want[route.Path] = true
		}
	}
	for path, found := range want {
		if !found {
			t.Fatalf("route %s not registered", path)
		}
	}

	// bad level rejected
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/webservices/boundaries/BAD-LEVEL", nil))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
