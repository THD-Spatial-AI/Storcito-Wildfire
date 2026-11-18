package services

import "testing"

func TestIsQuietRun(t *testing.T) {
	cases := map[string]bool{
		`{"quiet_run": true}`:               true,
		`{"quiet_run": false}`:              false,
		`{"parameters": {"x": 1}}`:          false,
		`null`:                              false,
		``:                                  false,
		`{"quiet_run": true, "other": "y"}`: true,
	}
	for raw, want := range cases {
		if got := IsQuietRun([]byte(raw)); got != want {
			t.Errorf("IsQuietRun(%q) = %v, want %v", raw, got, want)
		}
	}
}
