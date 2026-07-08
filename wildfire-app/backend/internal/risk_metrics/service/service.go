// Package riskmetricsservice computes risk analytics from published rasters.
package riskmetricsservice

import (
	"context"
	"errors"
	"fmt"
	"math"

	"gorm.io/gorm"

	"spatialhub_backend/internal/geoserver"

	commonModels "platform.local/common/pkg/models"
)

// Level is a categorical risk classification exposed to clients.
type Level string

const (
	LevelUnknown  Level = "unknown"
	LevelVeryLow  Level = "very_low"
	LevelLow      Level = "low"
	LevelModerate Level = "moderate"
	LevelHigh     Level = "high"
	LevelVeryHigh Level = "very_high"
)

// Trend describes how the current risk compares to the previous run.
type Trend string

const (
	TrendUnknown   Trend = "unknown"
	TrendImproving Trend = "improving"
	TrendStable    Trend = "stable"
	TrendWorsening Trend = "worsening"
)

// Distribution mirrors geoserver.Distribution in the domain layer.
type Distribution struct {
	VeryLow  int `json:"very_low"`
	Low      int `json:"low"`
	Moderate int `json:"moderate"`
	High     int `json:"high"`
	VeryHigh int `json:"very_high"`
}

// Metrics is the JSON payload returned to the frontend.
type Metrics struct {
	ModelID          uint         `json:"model_id"`
	ResultID         uint         `json:"result_id"`
	OverallScore     float64      `json:"overall_score"`
	Level            Level        `json:"level"`
	AffectedAreaKm2  float64      `json:"affected_area_km2"`
	TotalAreaKm2     float64      `json:"total_area_km2"`
	AffectedFraction float64      `json:"affected_fraction"`
	Distribution     Distribution `json:"distribution"`
	SampleCount      int          `json:"sample_count"`
	Trend            Trend        `json:"trend"`
	PreviousScore    *float64     `json:"previous_score,omitempty"`
}

// MapSample is one valid geographically positioned raster sample.
type MapSample struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Value  float64 `json:"value"`
	Level  Level   `json:"level"`
	Row    int     `json:"row"`
	Column int     `json:"column"`
}

// MapSamples powers frontend geo heatmap and choropleth charts.
type MapSamples struct {
	ModelID      uint                   `json:"model_id"`
	ResultID     uint                   `json:"result_id"`
	Bounds       geoserver.Bounds       `json:"bounds"`
	GridSize     int                    `json:"grid_size"`
	Samples      []MapSample            `json:"samples"`
	ValidSamples int                    `json:"valid_samples"`
	TotalSamples int                    `json:"total_samples"`
	Distribution geoserver.Distribution `json:"distribution"`
}

// DayAreas is the analyzed surface area per risk class, in km².
type DayAreas struct {
	VeryLow  float64 `json:"very_low"`
	Low      float64 `json:"low"`
	Moderate float64 `json:"moderate"`
	High     float64 `json:"high"`
	VeryHigh float64 `json:"very_high"`
}

// DayDistribution is one day of a dynamic run, as counts and km² per class.
type DayDistribution struct {
	Date         string       `json:"date"`
	Distribution Distribution `json:"distribution"`
	AreaKm2      DayAreas     `json:"area_km2"`
	ValidSamples int          `json:"valid_samples"`
	TotalSamples int          `json:"total_samples"`
}

// DailySeries powers the risk-over-time stacked area chart for dynamic runs.
type DailySeries struct {
	ModelID  uint              `json:"model_id"`
	ResultID uint              `json:"result_id"`
	Days     []DayDistribution `json:"days"`
}

// severityWeights assigns a normalized risk weight to each bucket
var severityWeights = map[string]float64{
	"very_low":  0.20,
	"low":       0.40,
	"moderate":  0.60,
	"high":      0.80,
	"very_high": 1.00,
}

// defaultSampleCount is the pixel sample target sent to the geoservice.
const defaultSampleCount = 2000

const defaultMapSampleCount = 625

const defaultDailySampleCount = 0

// ResultStore is the minimum surface we need from persistence.
type ResultStore interface {
	// LatestConfiguredResult returns the newest configured result (ErrRecordNotFound when absent).
	LatestConfiguredResult(ctx context.Context, modelID uint) (*commonModels.ModelResult, error)
	// PreviousConfiguredResult returns the prior configured result, for the trend.
	PreviousConfiguredResult(ctx context.Context, modelID, excludeResultID uint) (*commonModels.ModelResult, error)
}

// ErrNoConfiguredResult means the model has no configured GeoServer layer.
var ErrNoConfiguredResult = errors.New("risk_metrics: no configured result for model")

// Cache stores computed Metrics keyed by the immutable result ID.
type Cache interface {
	Get(ctx context.Context, resultID uint) (*Metrics, bool)
	Set(ctx context.Context, resultID uint, m *Metrics)
	GetDaily(ctx context.Context, resultID uint) (*DailySeries, bool)
	SetDaily(ctx context.Context, resultID uint, s *DailySeries)
}

// Service computes risk metrics.
type Service struct {
	geo   geoserver.Client
	store ResultStore
	cache Cache
}

// NewService constructs a Service. Both dependencies are required.
func NewService(store ResultStore, geo geoserver.Client) *Service {
	return &Service{store: store, geo: geo}
}

// WithCache attaches a metrics cache and returns the service for chaining.
func (s *Service) WithCache(c Cache) *Service {
	s.cache = c
	return s
}

// CalculateForModel computes Metrics for the latest configured result.
func (s *Service) CalculateForModel(ctx context.Context, modelID uint) (*Metrics, error) {
	if s == nil || s.store == nil || s.geo == nil {
		return nil, errors.New("risk_metrics: service not configured")
	}

	result, err := s.store.LatestConfiguredResult(ctx, modelID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNoConfiguredResult
		}
		return nil, fmt.Errorf("risk_metrics: load latest result: %w", err)
	}

	// Cache hit (keyed by immutable result ID) skips the GeoServer sampling.
	if s.cache != nil {
		if cached, ok := s.cache.Get(ctx, result.ID); ok {
			return cached, nil
		}
	}

	sample, err := s.geo.SampleDistribution(ctx, result.ID, defaultSampleCount)
	if err != nil {
		return nil, fmt.Errorf("risk_metrics: sample distribution: %w", err)
	}

	bounds, err := s.geo.GetBounds(ctx, result.ID)
	if err != nil {
		return nil, fmt.Errorf("risk_metrics: get bounds: %w", err)
	}

	metrics := buildMetrics(modelID, result.ID, sample, bounds)
	s.applyTrend(ctx, modelID, result.ID, metrics)

	if s.cache != nil {
		s.cache.Set(ctx, result.ID, metrics)
	}

	return metrics, nil
}

// SampleMapForModel returns positioned raster samples for map charts.
func (s *Service) SampleMapForModel(ctx context.Context, modelID uint, sampleCount int) (*MapSamples, error) {
	if s == nil || s.store == nil || s.geo == nil {
		return nil, errors.New("risk_metrics: service not configured")
	}

	result, err := s.store.LatestConfiguredResult(ctx, modelID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNoConfiguredResult
		}
		return nil, fmt.Errorf("risk_metrics: load latest result: %w", err)
	}

	if sampleCount <= 0 {
		sampleCount = defaultMapSampleCount
	}

	grid, err := s.geo.SampleGrid(ctx, result.ID, sampleCount)
	if err != nil {
		return nil, fmt.Errorf("risk_metrics: sample map grid: %w", err)
	}

	out := &MapSamples{
		ModelID:      modelID,
		ResultID:     result.ID,
		Bounds:       grid.Bounds,
		GridSize:     grid.GridSize,
		Samples:      make([]MapSample, 0, len(grid.Samples)),
		ValidSamples: grid.ValidSamples,
		TotalSamples: grid.TotalSamples,
	}
	for _, sample := range grid.Samples {
		level := Level(sample.Level)
		if level == "" {
			level = LevelUnknown
		}
		out.Samples = append(out.Samples, MapSample{
			X:      sample.X,
			Y:      sample.Y,
			Value:  sample.Value,
			Level:  level,
			Row:    sample.Row,
			Column: sample.Column,
		})
		addToDistribution(&out.Distribution, level)
	}

	return out, nil
}

// DailyDistributionsForModel returns per-day class areas (km²), cached by result ID.
func (s *Service) DailyDistributionsForModel(ctx context.Context, modelID uint) (*DailySeries, error) {
	if s == nil || s.store == nil || s.geo == nil {
		return nil, errors.New("risk_metrics: service not configured")
	}

	result, err := s.store.LatestConfiguredResult(ctx, modelID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNoConfiguredResult
		}
		return nil, fmt.Errorf("risk_metrics: load latest result: %w", err)
	}

	if s.cache != nil {
		if cached, ok := s.cache.GetDaily(ctx, result.ID); ok {
			return cached, nil
		}
	}

	days, err := s.geo.SampleDailyDistributions(ctx, result.ID, defaultDailySampleCount)
	if err != nil {
		return nil, fmt.Errorf("risk_metrics: sample daily distributions: %w", err)
	}

	bounds, err := s.geo.GetBounds(ctx, result.ID)
	if err != nil {
		return nil, fmt.Errorf("risk_metrics: get bounds: %w", err)
	}
	bboxArea := areaKm2(bounds)

	series := &DailySeries{ModelID: modelID, ResultID: result.ID, Days: make([]DayDistribution, 0, len(days))}
	for _, day := range days {
		entry := DayDistribution{
			Date: day.Date,
			Distribution: Distribution{
				VeryLow:  day.Distribution.VeryLow,
				Low:      day.Distribution.Low,
				Moderate: day.Distribution.Moderate,
				High:     day.Distribution.High,
				VeryHigh: day.Distribution.VeryHigh,
			},
			ValidSamples: day.ValidSamples,
			TotalSamples: day.TotalSamples,
		}
		if day.ValidSamples > 0 && day.TotalSamples > 0 {
			analyzed := bboxArea * float64(day.ValidSamples) / float64(day.TotalSamples)
			perSample := analyzed / float64(day.ValidSamples)
			entry.AreaKm2 = DayAreas{
				VeryLow:  round(perSample*float64(day.Distribution.VeryLow), 3),
				Low:      round(perSample*float64(day.Distribution.Low), 3),
				Moderate: round(perSample*float64(day.Distribution.Moderate), 3),
				High:     round(perSample*float64(day.Distribution.High), 3),
				VeryHigh: round(perSample*float64(day.Distribution.VeryHigh), 3),
			}
		}
		series.Days = append(series.Days, entry)
	}

	if s.cache != nil {
		s.cache.SetDaily(ctx, result.ID, series)
	}

	return series, nil
}

func (s *Service) applyTrend(ctx context.Context, modelID, currentResultID uint, current *Metrics) {
	prev, err := s.store.PreviousConfiguredResult(ctx, modelID, currentResultID)
	if err != nil || prev == nil {
		return
	}
	prevSample, err := s.geo.SampleDistribution(ctx, prev.ID, defaultSampleCount)
	if err != nil {
		return
	}
	prevScore := overallScore(prevSample.Distribution)
	current.PreviousScore = &prevScore
	current.Trend = classifyTrend(current.OverallScore, prevScore)
}

func buildMetrics(modelID, resultID uint, sample geoserver.SampleResult, bounds geoserver.Bounds) *Metrics {
	dist := sample.Distribution
	total := dist.Total()
	score := overallScore(dist)
	affectedFraction := riskyFraction(dist)
	bboxArea := areaKm2(bounds)

	// Scale the bbox area down to the non-nodata surface.
	validFraction := sample.ValidFraction()
	analyzedArea := bboxArea
	if validFraction > 0 {
		analyzedArea = bboxArea * validFraction
	}

	return &Metrics{
		ModelID:          modelID,
		ResultID:         resultID,
		OverallScore:     round(score, 4),
		Level:            classifyLevel(score),
		TotalAreaKm2:     round(analyzedArea, 3),
		AffectedAreaKm2:  round(analyzedArea*affectedFraction, 3),
		AffectedFraction: round(affectedFraction, 4),
		Distribution: Distribution{
			VeryLow:  dist.VeryLow,
			Low:      dist.Low,
			Moderate: dist.Moderate,
			High:     dist.High,
			VeryHigh: dist.VeryHigh,
		},
		SampleCount: total,
		Trend:       TrendUnknown,
	}
}

// overallScore is a weighted mean of bucket proportions (0 when empty).
func overallScore(d geoserver.Distribution) float64 {
	total := float64(d.Total())
	if total == 0 {
		return 0
	}
	sum := severityWeights["very_low"]*float64(d.VeryLow) +
		severityWeights["low"]*float64(d.Low) +
		severityWeights["moderate"]*float64(d.Moderate) +
		severityWeights["high"]*float64(d.High) +
		severityWeights["very_high"]*float64(d.VeryHigh)
	return sum / total
}

// riskyFraction is the fraction of pixels classified high or very high.
func riskyFraction(d geoserver.Distribution) float64 {
	total := d.Total()
	if total == 0 {
		return 0
	}
	return float64(d.High+d.VeryHigh) / float64(total)
}

func addToDistribution(d *geoserver.Distribution, level Level) {
	switch level {
	case LevelVeryLow:
		d.VeryLow++
	case LevelLow:
		d.Low++
	case LevelModerate:
		d.Moderate++
	case LevelHigh:
		d.High++
	case LevelVeryHigh:
		d.VeryHigh++
	}
}

// classifyLevel maps the continuous score to a Level at class midpoints.
func classifyLevel(score float64) Level {
	switch {
	case score <= 0:
		return LevelUnknown
	case score < 0.30:
		return LevelVeryLow
	case score < 0.50:
		return LevelLow
	case score < 0.70:
		return LevelModerate
	case score < 0.90:
		return LevelHigh
	default:
		return LevelVeryHigh
	}
}

// classifyTrend compares scores; a ±5% band counts as stable.
func classifyTrend(current, previous float64) Trend {
	const band = 0.05
	delta := current - previous
	switch {
	case math.Abs(delta) <= band:
		return TrendStable
	case delta > 0:
		return TrendWorsening
	default:
		return TrendImproving
	}
}

// areaKm2 approximates the EPSG:4326 bbox area (flat-earth, dashboard-grade).
func areaKm2(b geoserver.Bounds) float64 {
	dx := math.Abs(b.MaxX - b.MinX)
	dy := math.Abs(b.MaxY - b.MinY)
	if dx == 0 || dy == 0 {
		return 0
	}
	midLat := (b.MinY + b.MaxY) / 2
	// Degrees to km, approximate (WGS84 mean).
	const kmPerDegLat = 110.574
	const kmPerDegLonAtEq = 111.320
	widthKm := dx * kmPerDegLonAtEq * math.Cos(midLat*math.Pi/180)
	heightKm := dy * kmPerDegLat
	return widthKm * heightKm
}

func round(v float64, decimals int) float64 {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0
	}
	p := math.Pow(10, float64(decimals))
	return math.Round(v*p) / p
}
