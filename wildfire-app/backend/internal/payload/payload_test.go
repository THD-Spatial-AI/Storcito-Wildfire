package payload

import (
	"testing"
	"time"
)

func TestFormatBerlinWindowBoundaryUsesSummerOffset(t *testing.T) {
	day := time.Date(2025, time.September, 5, 0, 0, 0, 0, time.UTC)

	got := formatBerlinWindowBoundary(day, 16)
	want := "2025-09-05T16:00:00.000+02:00"
	if got != want {
		t.Fatalf("formatBerlinWindowBoundary() = %q, want %q", got, want)
	}
}

func TestFormatBerlinWindowBoundaryUsesWinterOffset(t *testing.T) {
	day := time.Date(2025, time.December, 5, 0, 0, 0, 0, time.UTC)

	got := formatBerlinWindowBoundary(day, 17)
	want := "2025-12-05T17:00:00.000+01:00"
	if got != want {
		t.Fatalf("formatBerlinWindowBoundary() = %q, want %q", got, want)
	}
}
