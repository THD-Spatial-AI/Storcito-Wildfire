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

// Client is the contract consumed by application services. Interface-first
// so the service layer can be unit tested with a fake and so alternative
// implementations (e.g. in-process, gRPC) can be swapped in.
type Client interface {
	ConfigureLayer(ctx context.Context, resultID uint) error
	DeleteLayer(ctx context.Context, resultID uint) error
	GetBounds(ctx context.Context, resultID uint) (Bounds, error)
	SampleDistribution(ctx context.Context, resultID uint, sampleCount int) (SampleResult, error)
	SampleGrid(ctx context.Context, resultID uint, sampleCount int) (GridSampleResult, error)
}

// ErrNotReady is returned when the geoservice reports the layer is not yet
// configured. Callers may choose to retry.
var ErrNotReady = errors.New("geoserver: layer not configured yet")

// HTTPClient is the default Client implementation backed by the shared
// platform HTTP client. It is safe for concurrent use.
type HTTPClient struct {
	rpc *httpclient.Client
}

// Option configures the HTTPClient.
type Option func(*httpClientOptions)

type httpClientOptions struct {
	timeout time.Duration
}

// WithTimeout overrides the per-request timeout.
func WithTimeout(d time.Duration) Option {
	return func(o *httpClientOptions) { o.timeout = d }
}

// NewHTTPClient constructs an HTTPClient targeting baseURL (e.g.
// "http://geoservice:8083").
func NewHTTPClient(baseURL string, opts ...Option) *HTTPClient {
	options := httpClientOptions{timeout: 60 * time.Second}
	for _, apply := range opts {
		apply(&options)
	}
	return &HTTPClient{rpc: httpclient.New(baseURL, httpclient.WithTimeout(options.timeout))}
}

const basePath = "/api/internal/geoserver/results"

// ConfigureLayer asks the geoservice to publish the result raster as a WMS
// layer. The geoservice persists geoserver_status and layer_name directly
// to model_results.
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

// DeleteLayer best-effort removes the published WMS layer. 404 is
// treated as idempotent success.
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

// SampleDistribution asks the geoservice for a bucketed pixel distribution
// together with the count of valid and total attempted samples. The
// valid/total ratio is required by callers to scale the layer bounding
// box down to its analyzed (non-nodata) surface area.
// When sampleCount <= 0 the geoservice default is used.
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
