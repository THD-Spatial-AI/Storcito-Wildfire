package apitoken

import (
	"strings"
	"testing"
)

func TestNewGeneratesDistinctPrefixedTokens(t *testing.T) {
	a, err := New()
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	b, err := New()
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	if !strings.HasPrefix(a.Plaintext, Prefix) {
		t.Errorf("token missing prefix: %q", a.Plaintext)
	}
	if a.Plaintext == b.Plaintext {
		t.Error("two generated tokens are identical")
	}
	if len(a.Plaintext) < len(Prefix)+40 {
		t.Errorf("token too short: %d chars", len(a.Plaintext))
	}
	if a.Hash != Hash(a.Plaintext) {
		t.Error("stored hash does not match recomputed hash")
	}
	if len(a.Hash) != 64 {
		t.Errorf("hash should be 64 hex chars, got %d", len(a.Hash))
	}
	if !strings.HasPrefix(a.Plaintext, a.DisplayPrefix) {
		t.Errorf("display prefix %q is not a prefix of the token", a.DisplayPrefix)
	}
}

func TestFromAuthorizationHeader(t *testing.T) {
	cases := []struct {
		header string
		want   string
	}{
		{"Bearer whf_abc123", "whf_abc123"},
		{"Bearer  whf_abc123", "whf_abc123"},
		{"Bearer eyJhbGciOi...", ""}, // JWT, not ours
		{"Basic d2hmXw==", ""},
		{"whf_abc123", ""}, // missing scheme
		{"", ""},
	}
	for _, tc := range cases {
		if got := FromAuthorizationHeader(tc.header); got != tc.want {
			t.Errorf("FromAuthorizationHeader(%q) = %q, want %q", tc.header, got, tc.want)
		}
	}
}
