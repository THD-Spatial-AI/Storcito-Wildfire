package main

import (
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthCheckRequested(t *testing.T) {
	assert.True(t, healthCheckRequested([]string{"server", "--health-check"}))
	assert.False(t, healthCheckRequested([]string{"server"}))
	assert.False(t, healthCheckRequested([]string{"server", "--other"}))
}

func TestCheckServerHealth(t *testing.T) {
	t.Run("healthy endpoint", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "/api/health", r.URL.Path)
			w.WriteHeader(http.StatusOK)
		}))
		defer server.Close()

		_, port, err := net.SplitHostPort(strings.TrimPrefix(server.URL, "http://"))
		require.NoError(t, err)
		require.NoError(t, checkServerHealth(port))
	})

	t.Run("unhealthy endpoint", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			http.Error(w, "not ready", http.StatusServiceUnavailable)
		}))
		defer server.Close()

		_, port, err := net.SplitHostPort(strings.TrimPrefix(server.URL, "http://"))
		require.NoError(t, err)
		assert.ErrorContains(t, checkServerHealth(port), "503 Service Unavailable")
	})
}
