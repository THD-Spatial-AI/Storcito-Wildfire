package areas

import (
	"context"
	"encoding/json"
	"testing"
)

// one degree square
const squareJSON = `{"type":"MultiPolygon","coordinates":[[[[-8,42],[-7,42],[-7,43],[-8,43],[-8,42]]]]}`

type fakeBoundaries struct{ kids map[string][]string }

func (fakeBoundaries) Geometry(context.Context, Ref) (json.RawMessage, error) {
	return json.RawMessage(squareJSON), nil
}

func (f fakeBoundaries) Children(_ context.Context, _ string, parent string) ([]string, error) {
	return f.kids[parent], nil
}

func TestWithin(t *testing.T) {
	allowed, err := polygons(json.RawMessage(squareJSON))
	if err != nil {
		t.Fatal(err)
	}
	cases := map[string]struct {
		geo  string
		want bool
	}{
		"inside":       {`{"type":"Polygon","coordinates":[[[-7.6,42.4],[-7.4,42.4],[-7.4,42.6],[-7.6,42.4]]]}`, true},
		"on border":    {`{"type":"Polygon","coordinates":[[[-8,42.2],[-7.5,42.2],[-7.5,42.5],[-8,42.2]]]}`, true},
		"just outside": {`{"type":"Point","coordinates":[-8.002,42.5]}`, true},
		"far outside":  {`{"type":"Polygon","coordinates":[[[-9,42.4],[-7.4,42.4],[-7.4,42.6],[-9,42.4]]]}`, false},
		"feature":      {`{"type":"Feature","geometry":{"type":"Point","coordinates":[-7.5,42.5]}}`, true},
	}
	for name, tc := range cases {
		pts, err := vertices(json.RawMessage(tc.geo))
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if got := within(pts, allowed); got != tc.want {
			t.Errorf("%s: within=%v want %v", name, got, tc.want)
		}
	}
}

func TestCovers(t *testing.T) {
	s := &Service{boundaries: fakeBoundaries{kids: map[string][]string{"12": {"15", "27", "32", "36"}}}}
	ctx := context.Background()
	scope := []Ref{{LevelProvince, "32"}}
	check := func(scope []Ref, r Ref, want bool) {
		t.Helper()
		got, err := s.covers(ctx, scope, r)
		if err != nil || got != want {
			t.Errorf("covers(%v, %v)=%v,%v want %v", scope, r, got, err, want)
		}
	}
	check(scope, Ref{LevelMunicipality, "32072"}, true)
	check(scope, Ref{LevelMunicipality, "15001"}, false)
	check(scope, Ref{LevelProvince, "32"}, true)
	check(scope, Ref{LevelCommunity, "12"}, false)
	check([]Ref{{LevelCommunity, "12"}}, Ref{LevelMunicipality, "36001"}, true)
	check([]Ref{{LevelCommunity, "12"}}, Ref{LevelProvince, "33"}, false)
	// empty scope unrestricted
	check(nil, Ref{LevelCommunity, "01"}, true)
}

func TestValidate(t *testing.T) {
	if err := Validate([]Ref{{LevelMunicipality, "32072"}, {LevelProvince, "32"}}); err != nil {
		t.Fatal(err)
	}
	for _, bad := range []Ref{{"country", "ES"}, {LevelMunicipality, "32"}, {LevelProvince, "3a"}} {
		if Validate([]Ref{bad}) == nil {
			t.Errorf("expected error for %v", bad)
		}
	}
}

func TestCheckModelAreaExpertSkips(t *testing.T) {
	s := &Service{boundaries: fakeBoundaries{}}
	far := json.RawMessage(`{"type":"Point","coordinates":[2,41]}`)
	if err := s.CheckModelArea(context.Background(), "u", "expert", far); err != nil {
		t.Fatalf("expert blocked: %v", err)
	}
}
