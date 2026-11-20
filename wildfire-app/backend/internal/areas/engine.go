package areas

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"

	"spatialhub_backend/internal/webservice"
)

// boundary data source
type Boundaries interface {
	Geometry(ctx context.Context, ref Ref) (json.RawMessage, error)
	Children(ctx context.Context, level, parent string) ([]string, error)
}

const boundaryCacheTTL = time.Hour

type cached struct {
	at   time.Time
	geom json.RawMessage
	kids []string
}

// engine boundaries cached
type engineBoundaries struct {
	client *webservice.Client
	mu     sync.Mutex
	cache  map[string]cached
}

func NewEngineBoundaries(client *webservice.Client) Boundaries {
	return &engineBoundaries{client: client, cache: map[string]cached{}}
}

func (e *engineBoundaries) get(key string) (cached, bool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	c, ok := e.cache[key]
	if !ok || time.Since(c.at) > boundaryCacheTTL {
		return cached{}, false
	}
	return c, true
}

func (e *engineBoundaries) put(key string, c cached) {
	e.mu.Lock()
	defer e.mu.Unlock()
	c.at = time.Now()
	e.cache[key] = c
}

func (e *engineBoundaries) fetch(ctx context.Context, path string, out any) error {
	if e.client == nil {
		return fmt.Errorf("no webservice client")
	}
	resp, err := e.client.Forward(ctx, http.MethodGet, "/api/webservices/boundaries"+path, nil, http.Header{"Accept": {"application/json"}})
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("boundaries %s: status %d", path, resp.StatusCode)
	}
	envelope := struct {
		Data json.RawMessage `json:"data"`
	}{}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return err
	}
	return json.Unmarshal(envelope.Data, out)
}

func (e *engineBoundaries) Geometry(ctx context.Context, ref Ref) (json.RawMessage, error) {
	key := "g:" + ref.key()
	if c, ok := e.get(key); ok {
		return c.geom, nil
	}
	var detail struct {
		Geometry json.RawMessage `json:"geometry"`
	}
	if err := e.fetch(ctx, "/"+ref.Level+"/"+url.PathEscape(ref.Code), &detail); err != nil {
		return nil, err
	}
	if len(detail.Geometry) == 0 || string(detail.Geometry) == "null" {
		return nil, fmt.Errorf("boundary %s has no geometry", ref.key())
	}
	e.put(key, cached{geom: detail.Geometry})
	return detail.Geometry, nil
}

func (e *engineBoundaries) Children(ctx context.Context, level, parent string) ([]string, error) {
	key := "c:" + level + ":" + parent
	if c, ok := e.get(key); ok {
		return c.kids, nil
	}
	var list struct {
		Items []struct {
			Code string `json:"code"`
		} `json:"items"`
	}
	if err := e.fetch(ctx, "/"+level+"?parent="+url.QueryEscape(parent), &list); err != nil {
		return nil, err
	}
	kids := make([]string, 0, len(list.Items))
	for _, it := range list.Items {
		kids = append(kids, it.Code)
	}
	e.put(key, cached{kids: kids})
	return kids, nil
}
