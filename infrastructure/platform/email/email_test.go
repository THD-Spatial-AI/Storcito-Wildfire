package email

import (
	"strings"
	"testing"
)

func TestEmailFieldEscapes(t *testing.T) {
	got := emailField("Model Name", `<a href="x">bad</a>`, "margin:0")
	if strings.Contains(got, "<a href") {
		t.Fatalf("value not escaped: %s", got)
	}
	if !strings.Contains(got, "&lt;a href=") {
		t.Fatalf("escaped text missing: %s", got)
	}
}

func TestEmailLayoutKeepsShell(t *testing.T) {
	got := emailLayout("#fff", "#000", "✓ Done", "<p>body</p>")
	for _, want := range []string{"<!DOCTYPE html>", "Storcito", "✓ Done", "<p>body</p>", "Please do not reply"} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q", want)
		}
	}
	// percent signs rendered
	if strings.Contains(got, "%%") {
		t.Fatal("unformatted percent")
	}
}
