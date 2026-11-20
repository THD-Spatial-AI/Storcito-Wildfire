package users

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"platform.local/platform/auth"
	"spatialhub_backend/internal/config"
)

func TestSendSetPasswordEmail(t *testing.T) {
	var gotMethod, gotPath, gotBody string
	var gotQuery map[string][]string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod, gotPath, gotQuery = r.Method, r.URL.Path, r.URL.Query()
		b, _ := io.ReadAll(r.Body)
		gotBody = string(b)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	s := New(&config.Config{Auth: auth.Config{BaseURL: srv.URL, Realm: "r1", ClientID: "app"}, AppURL: "https://app.example/"})
	if err := s.SendSetPasswordEmail("token", "u-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotMethod != http.MethodPut || gotPath != "/admin/realms/r1/users/u-1/execute-actions-email" {
		t.Fatalf("wrong call %s %s", gotMethod, gotPath)
	}
	if gotBody != `["UPDATE_PASSWORD"]` {
		t.Fatalf("wrong actions %s", gotBody)
	}
	// link back to app
	if gotQuery["redirect_uri"][0] != "https://app.example/login" || gotQuery["client_id"][0] != "app" || gotQuery["lifespan"][0] != "259200" {
		t.Fatalf("wrong query %v", gotQuery)
	}
}

func TestSendSetPasswordEmailRetriesWithoutRedirect(t *testing.T) {
	var calls []url.Values
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls = append(calls, r.URL.Query())
		if r.URL.Query().Get("redirect_uri") != "" {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"errorMessage":"Invalid redirect uri."}`))
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	s := New(&config.Config{Auth: auth.Config{BaseURL: srv.URL, Realm: "r1", ClientID: "app"}, AppURL: "http://wrong:8000"})
	if err := s.SendSetPasswordEmail("token", "u-1"); err != nil {
		t.Fatalf("expected fallback success, got %v", err)
	}
	// second call plain
	if len(calls) != 2 || calls[1].Get("redirect_uri") != "" || calls[1].Get("lifespan") != "259200" {
		t.Fatalf("unexpected calls %v", calls)
	}
}
