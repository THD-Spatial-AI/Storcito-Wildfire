// Package geoserver exposes a strongly-typed client for the GeoServer
// control-plane microservice. It is intentionally decoupled from any
// persistence or HTTP framework concerns: the client is a pure
// outbound adapter.
package geoserver

// Bounds describes the bounding box (EPSG:4326) of a published layer.
type Bounds struct {
	MinX float64 `json:"minx"`
	MinY float64 `json:"miny"`
	MaxX float64 `json:"maxx"`
	MaxY float64 `json:"maxy"`
}

// Distribution maps severity buckets to pixel counts.
// Buckets are emitted by the geoservice as a fixed taxonomy.
type Distribution struct {
	VeryLow  int `json:"very_low"`
	Low      int `json:"low"`
	Moderate int `json:"moderate"`
	High     int `json:"high"`
	VeryHigh int `json:"very_high"`
}

// Total returns the sum of all bucket counts.
func (d Distribution) Total() int {
	return d.VeryLow + d.Low + d.Moderate + d.High + d.VeryHigh
}

type SampleResult struct {
	Distribution Distribution
	// ValidSamples is the number of grid samples that hit a non-nodata pixel.
	ValidSamples int
	// TotalSamples is the number of grid samples attempted across the layer
	// bounding box. ValidSamples / TotalSamples ≈ valid-pixel coverage.
	TotalSamples int
}

// GridSample is one valid geographically positioned sample from a raster.
type GridSample struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Value  float64 `json:"value"`
	Level  string  `json:"level"`
	Row    int     `json:"row"`
	Column int     `json:"column"`
}

// GridSampleResult is used by map-style chart visualizations.
type GridSampleResult struct {
	Bounds       Bounds       `json:"bounds"`
	GridSize     int          `json:"grid_size"`
	Samples      []GridSample `json:"samples"`
	ValidSamples int          `json:"valid_samples"`
	TotalSamples int          `json:"total_samples"`
}

// ValidFraction is the share of the layer bounding box that contains
// real data. Returns 0 when no samples were taken.
func (r SampleResult) ValidFraction() float64 {
	if r.TotalSamples <= 0 {
		return 0
	}
	return float64(r.ValidSamples) / float64(r.TotalSamples)
}

// ConfigureLayerResponse is returned by POST .../configure.
type ConfigureLayerResponse struct {
	Status string `json:"status"`
}

// BoundsResponse wraps Bounds as the geoservice does.
type BoundsResponse struct {
	Bounds Bounds `json:"bounds"`
}

// DistributionResponse wraps Distribution as the geoservice does.
type DistributionResponse struct {
	Distribution Distribution `json:"distribution"`
	// ValidSamples is the number of attempted samples that hit a non-nodata
	// pixel. Zero when the geoservice is an older version that does not
	// emit this field — callers must treat that as "unknown".
	ValidSamples int `json:"valid_samples,omitempty"`
	// TotalSamples is the total number of attempted samples (grid cells).
	// Zero when the geoservice is an older version.
	TotalSamples int `json:"total_samples,omitempty"`
}

// SampleDistributionRequest is the request body for sample-distribution.
type SampleDistributionRequest struct {
	SampleCount int `json:"sample_count"`
}

// SampleGridRequest is the request body for sample-grid.
type SampleGridRequest struct {
	SampleCount int `json:"sample_count"`
}
