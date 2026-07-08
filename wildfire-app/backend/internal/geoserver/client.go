package geoserver

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"platform.local/common/pkg/httpclient"
)

// Client is the geoservice contract consumed by application services.
type Client interface {
	ConfigureLayer(ctx context.Context, resultID uint) error
	DeleteLayer(ctx context.Context, resultID uint) error
	GetBounds(ctx context.Context, resultID uint) (Bounds, error)
	SampleDistribution(ctx context.Context, resultID uint, sampleCount int) (SampleResult, error)
	SampleGrid(ctx context.Context, resultID uint, sampleCount int) (GridSampleResult, error)
	SampleDailyDistributions(ctx context.Context, resultID uint, sampleCount int) ([]DailyDistribution, error)
}

// ErrNotReady means the layer is not configured yet; callers may retry.
var ErrNotReady = errors.New("geoserver: layer not configured yet")

// HTTPClient is the default Client implementation; safe for concurrent use.
type HTTPClient struct {
	rpc *httpclient.Client
}

// NewHTTPClient constructs an HTTPClient targeting baseURL.
func NewHTTPClient(baseURL string) *HTTPClient {
	return &HTTPClient{rpc: httpclient.New(baseURL, httpclient.WithTimeout(60*time.Second))}
}

const basePath = "/api/internal/geoserver/results"

// ConfigureLayer asks the geoservice to publish the result raster as a WMS layer.
func (c *HTTPClient) ConfigureLayer(ctx context.Context, resultID uint) error {
	path := fmt.Sprintf("%s/%d/configure", basePath, resultID)
	resp, err := c.rpc.DoJSON(ctx, http.MethodPost, path, struct{}{}, nil)
	if err != nil {
		return fmt.Errorf("geoserver: configure request failed: %w", err)
	}
	defer drain(resp.Body)

	if resp.StatusCode/100 != 2 {
		return decodeError(resp, "configure")
	}

	var out ConfigureLayerResponse
	if err := decodeJSONLenient(resp.Body, &out); err != nil {
		return fmt.Errorf("geoserver: decode configure response: %w", err)
	}
	return nil
}

// DeleteLayer removes the published WMS layer; 404 counts as success.
func (c *HTTPClient) DeleteLayer(ctx context.Context, resultID uint) error {
	path := fmt.Sprintf("%s/%d/layer", basePath, resultID)
	resp, err := c.rpc.Do(ctx, http.MethodDelete, path, nil, nil)
	if err != nil {
		return fmt.Errorf("geoserver: delete request failed: %w", err)
	}
	defer drain(resp.Body)

	if resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusNotFound {
		return nil
	}
	if resp.StatusCode/100 != 2 {
		return decodeError(resp, "delete")
	}
	return nil
}

// GetBounds returns the bounding box for the published layer.
func (c *HTTPClient) GetBounds(ctx context.Context, resultID uint) (Bounds, error) {
	path := fmt.Sprintf("%s/%d/bounds", basePath, resultID)
	resp, err := c.rpc.Do(ctx, http.MethodGet, path, nil, nil)
	if err != nil {
		return Bounds{}, fmt.Errorf("geoserver: bounds request failed: %w", err)
	}
	defer drain(resp.Body)

	if resp.StatusCode == http.StatusNotFound {
		return Bounds{}, ErrNotReady
	}
	if resp.StatusCode/100 != 2 {
		return Bounds{}, decodeError(resp, "bounds")
	}

	var out BoundsResponse
	if err := decodeJSONLenient(resp.Body, &out); err != nil {
		return Bounds{}, fmt.Errorf("geoserver: decode bounds response: %w", err)
	}
	return out.Bounds, nil
}

// SampleDistribution returns the pixel distribution with valid/total counts.
func (c *HTTPClient) SampleDistribution(ctx context.Context, resultID uint, sampleCount int) (SampleResult, error) {
	path := fmt.Sprintf("%s/%d/sample-distribution", basePath, resultID)

	resp, err := c.rpc.DoJSON(ctx, http.MethodPost, path, SampleDistributionRequest{SampleCount: sampleCount}, nil)
	if err != nil {
		return SampleResult{}, fmt.Errorf("geoserver: sample-distribution request failed: %w", err)
	}
	defer drain(resp.Body)

	if resp.StatusCode == http.StatusNotFound {
		return SampleResult{}, ErrNotReady
	}
	if resp.StatusCode/100 != 2 {
		return SampleResult{}, decodeError(resp, "sample-distribution")
	}

	var out DistributionResponse
	if err := decodeJSONLenient(resp.Body, &out); err != nil {
		return SampleResult{}, fmt.Errorf("geoserver: decode distribution response: %w", err)
	}
	return SampleResult{
		Distribution: out.Distribution,
		ValidSamples: out.ValidSamples,
		TotalSamples: out.TotalSamples,
	}, nil
}

// SampleGrid asks the geoservice for positioned raster samples.
func (c *HTTPClient) SampleGrid(ctx context.Context, resultID uint, sampleCount int) (GridSampleResult, error) {
	path := fmt.Sprintf("%s/%d/sample-grid", basePath, resultID)

	resp, err := c.rpc.DoJSON(ctx, http.MethodPost, path, SampleGridRequest{SampleCount: sampleCount}, nil)
	if err != nil {
		return GridSampleResult{}, fmt.Errorf("geoserver: sample-grid request failed: %w", err)
	}
	defer drain(resp.Body)

	if resp.StatusCode == http.StatusNotFound {
		return GridSampleResult{}, ErrNotReady
	}
	if resp.StatusCode/100 != 2 {
		return GridSampleResult{}, decodeError(resp, "sample-grid")
	}

	var out GridSampleResult
	if err := decodeJSONLenient(resp.Body, &out); err != nil {
		return GridSampleResult{}, fmt.Errorf("geoserver: decode sample-grid response: %w", err)
	}
	return out, nil
}

// SampleDailyDistributions returns one class histogram per daily risk layer.
func (c *HTTPClient) SampleDailyDistributions(ctx context.Context, resultID uint, sampleCount int) ([]DailyDistribution, error) {
	path := fmt.Sprintf("%s/%d/daily-distribution", basePath, resultID)

	resp, err := c.rpc.DoJSON(ctx, http.MethodPost, path, DailyDistributionRequest{SampleCount: sampleCount}, nil)
	if err != nil {
		return nil, fmt.Errorf("geoserver: daily-distribution request failed: %w", err)
	}
	defer drain(resp.Body)

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrNotReady
	}
	if resp.StatusCode/100 != 2 {
		return nil, decodeError(resp, "daily-distribution")
	}

	var out DailyDistributionResponse
	if err := decodeJSONLenient(resp.Body, &out); err != nil {
		return nil, fmt.Errorf("geoserver: decode daily-distribution response: %w", err)
	}
	return out.Days, nil
}

type errorEnvelope struct {
	Error string `json:"error"`
}

func decodeError(resp *http.Response, op string) error {
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 8*1024))
	var env errorEnvelope
	_ = json.Unmarshal(body, &env)
	if env.Error != "" {
		return fmt.Errorf("geoserver: %s failed (status %d): %s", op, resp.StatusCode, env.Error)
	}
	return fmt.Errorf("geoserver: %s failed (status %d)", op, resp.StatusCode)
}

func decodeJSONLenient(r io.Reader, out interface{}) error {
	body, err := io.ReadAll(io.LimitReader(r, 1*1024*1024))
	if err != nil {
		return err
	}
	if len(body) == 0 {
		return nil
	}
	return json.Unmarshal(body, out)
}

func drain(rc io.ReadCloser) {
	if rc == nil {
		return
	}
	_, _ = io.Copy(io.Discard, io.LimitReader(rc, 1*1024*1024))
	_ = rc.Close()
}
