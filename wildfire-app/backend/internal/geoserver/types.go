// Package geoserver is a typed client for the GeoServer control-plane service.
package geoserver

// Bounds describes the bounding box (EPSG:4326) of a published layer.
type Bounds struct {
	MinX float64 `json:"minx"`
	MinY float64 `json:"miny"`
	MaxX float64 `json:"maxx"`
	MaxY float64 `json:"maxy"`
}

// Distribution maps severity buckets to pixel counts.
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
	// TotalSamples is the number of attempted grid samples.
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

// ValidFraction is the share of samples that hit real data.
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
	// ValidSamples is the number of non-nodata hits (0 on older geoservices).
	ValidSamples int `json:"valid_samples,omitempty"`
	// TotalSamples is the attempted sample count (0 on older geoservices).
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

// DailyDistributionRequest is the request body for daily-distribution.
type DailyDistributionRequest struct {
	SampleCount int `json:"sample_count"`
}

// DailyDistribution is the class histogram of one day of a dynamic run.
type DailyDistribution struct {
	Date         string       `json:"date"`
	Distribution Distribution `json:"distribution"`
	ValidSamples int          `json:"valid_samples"`
	TotalSamples int          `json:"total_samples"`
}

// DailyDistributionResponse wraps the per-day histograms as the geoservice does.
type DailyDistributionResponse struct {
	Days []DailyDistribution `json:"days"`
}
