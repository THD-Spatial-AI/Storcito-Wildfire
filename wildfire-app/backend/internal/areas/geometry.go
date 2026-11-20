package areas

import (
	"encoding/json"
	"fmt"
	"math"
)

type point [2]float64 // lon lat

type polygon struct {
	rings                  [][]point // outer then holes
	minX, minY, maxX, maxY float64
}

const (
	// border tolerance metres
	borderToleranceM = 300.0
	// allowed outside share
	outsideShare = 0.02
	maxVertices  = 4000
)

type geoJSON struct {
	Type        string            `json:"type"`
	Coordinates json.RawMessage   `json:"coordinates"`
	Geometry    json.RawMessage   `json:"geometry"`
	Geometries  []json.RawMessage `json:"geometries"`
	Features    []json.RawMessage `json:"features"`
}

// all vertices drawn
func vertices(raw json.RawMessage) ([]point, error) {
	var g geoJSON
	if err := json.Unmarshal(raw, &g); err != nil {
		return nil, err
	}
	switch g.Type {
	case "Feature":
		return vertices(g.Geometry)
	case "FeatureCollection", "GeometryCollection":
		parts := g.Features
		if g.Type == "GeometryCollection" {
			parts = g.Geometries
		}
		var out []point
		for _, p := range parts {
			v, err := vertices(p)
			if err != nil {
				return nil, err
			}
			out = append(out, v...)
		}
		return out, nil
	case "Point":
		var p point
		err := json.Unmarshal(g.Coordinates, &p)
		return []point{p}, err
	case "MultiPoint", "LineString":
		var ps []point
		err := json.Unmarshal(g.Coordinates, &ps)
		return ps, err
	case "Polygon", "MultiLineString":
		var rs [][]point
		err := json.Unmarshal(g.Coordinates, &rs)
		return flatten(rs), err
	case "MultiPolygon":
		var ps [][][]point
		if err := json.Unmarshal(g.Coordinates, &ps); err != nil {
			return nil, err
		}
		var out []point
		for _, p := range ps {
			out = append(out, flatten(p)...)
		}
		return out, nil
	}
	return nil, fmt.Errorf("unsupported geometry %q", g.Type)
}

func flatten(rings [][]point) []point {
	var out []point
	for _, r := range rings {
		out = append(out, r...)
	}
	return out
}

// polygons with bbox
func polygons(raw json.RawMessage) ([]polygon, error) {
	var g geoJSON
	if err := json.Unmarshal(raw, &g); err != nil {
		return nil, err
	}
	var sets [][][]point
	switch g.Type {
	case "Polygon":
		var rs [][]point
		if err := json.Unmarshal(g.Coordinates, &rs); err != nil {
			return nil, err
		}
		sets = [][][]point{rs}
	case "MultiPolygon":
		if err := json.Unmarshal(g.Coordinates, &sets); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("boundary geometry %q", g.Type)
	}
	out := make([]polygon, 0, len(sets))
	for _, rs := range sets {
		if len(rs) == 0 {
			continue
		}
		p := polygon{rings: rs, minX: math.Inf(1), minY: math.Inf(1), maxX: math.Inf(-1), maxY: math.Inf(-1)}
		for _, v := range rs[0] {
			p.minX, p.maxX = math.Min(p.minX, v[0]), math.Max(p.maxX, v[0])
			p.minY, p.maxY = math.Min(p.minY, v[1]), math.Max(p.maxY, v[1])
		}
		out = append(out, p)
	}
	return out, nil
}

// even-odd ray cast
func inRing(p point, ring []point) bool {
	in := false
	for i, j := 0, len(ring)-1; i < len(ring); j, i = i, i+1 {
		a, b := ring[i], ring[j]
		if (a[1] > p[1]) != (b[1] > p[1]) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0] {
			in = !in
		}
	}
	return in
}

func (pg polygon) contains(p point) bool {
	if p[0] < pg.minX || p[0] > pg.maxX || p[1] < pg.minY || p[1] > pg.maxY {
		return false
	}
	if !inRing(p, pg.rings[0]) {
		return false
	}
	for _, hole := range pg.rings[1:] {
		if inRing(p, hole) {
			return false
		}
	}
	return true
}

// metres to edge
func distanceM(p point, ring []point) float64 {
	kx := 111320 * math.Cos(p[1]*math.Pi/180)
	const ky = 110540.0
	best := math.Inf(1)
	for i := 1; i < len(ring); i++ {
		ax, ay := (ring[i-1][0]-p[0])*kx, (ring[i-1][1]-p[1])*ky
		bx, by := (ring[i][0]-p[0])*kx, (ring[i][1]-p[1])*ky
		dx, dy := bx-ax, by-ay
		t := 0.0
		if l := dx*dx + dy*dy; l > 0 {
			t = math.Max(0, math.Min(1, -(ax*dx+ay*dy)/l))
		}
		best = math.Min(best, math.Hypot(ax+t*dx, ay+t*dy))
	}
	return best
}

// near or inside
func covered(p point, allowed []polygon) bool {
	for _, pg := range allowed {
		if pg.contains(p) {
			return true
		}
	}
	for _, pg := range allowed {
		// cheap bbox reject
		margin := 0.01
		if p[0] < pg.minX-margin || p[0] > pg.maxX+margin || p[1] < pg.minY-margin || p[1] > pg.maxY+margin {
			continue
		}
		if distanceM(p, pg.rings[0]) <= borderToleranceM {
			return true
		}
	}
	return false
}

// drawn area inside
func within(drawn []point, allowed []polygon) bool {
	if len(drawn) == 0 {
		return true
	}
	step := 1
	if len(drawn) > maxVertices {
		step = len(drawn)/maxVertices + 1
	}
	checked, outside := 0, 0
	for i := 0; i < len(drawn); i += step {
		checked++
		if !covered(drawn[i], allowed) {
			outside++
		}
	}
	return float64(outside) <= outsideShare*float64(checked)
}
