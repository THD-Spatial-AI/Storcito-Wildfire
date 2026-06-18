package result

import (
	resultservice "spatialhub_backend/internal/result/service"
)

// geoServerOpts returns the ResultService options derived from the
// handler's configuration — centralised so the construction of a
// ResultService is consistent across call sites.
func (h *ResultHandler) geoServerOpts() []resultservice.Option {
	if h == nil || h.geoClient == nil {
		return nil
	}
	return []resultservice.Option{resultservice.WithGeoServerClient(h.geoClient)}
}
