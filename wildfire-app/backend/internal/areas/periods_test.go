package areas

import (
	"testing"
	"time"
)

func day(s string) time.Time {
	t, _ := time.Parse(dayFormat, s)
	return t
}

func TestMergeAndFits(t *testing.T) {
	spans := merge([]Period{
		{"2026-06-01", "2026-06-30"},
		{"2026-07-01", "2026-07-15"}, // touching joins
		{"2026-09-01", "2026-09-10"},
		{"bad", "2026-01-01"},
	})
	if len(spans) != 2 {
		t.Fatalf("want 2 merged spans, got %v", spans)
	}
	cases := []struct {
		from, to string
		want     bool
	}{
		{"2026-06-10", "2026-07-10", true},  // across join
		{"2026-06-01", "2026-06-01", true},  // single day
		{"2026-07-10", "2026-07-20", false}, // runs past end
		{"2026-08-01", "2026-08-02", false}, // gap
		{"2026-09-01", "2026-09-10", true},
	}
	for _, c := range cases {
		if got := fits(spans, day(c.from), day(c.to)); got != c.want {
			t.Errorf("fits %s..%s = %v want %v", c.from, c.to, got, c.want)
		}
	}
}

func TestParsePeriodRejects(t *testing.T) {
	for _, p := range []Period{{"2026-07-01", "2026-06-01"}, {"2026-13-01", "2026-12-01"}, {"", ""}} {
		if _, err := parsePeriod(p); err == nil {
			t.Errorf("expected error for %v", p)
		}
	}
}
