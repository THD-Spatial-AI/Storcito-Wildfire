package riskmetricsservice

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

// defaultCacheTTL is a safety expiry; metrics are immutable per result.
const defaultCacheTTL = 7 * 24 * time.Hour

// RedisCache is a Redis-backed Cache for computed risk Metrics.
type RedisCache struct {
	client *goredis.Client
	ttl    time.Duration
}

// NewRedisCache builds a RedisCache; non-positive ttl falls back to defaultCacheTTL.
func NewRedisCache(client *goredis.Client, ttl time.Duration) *RedisCache {
	if ttl <= 0 {
		ttl = defaultCacheTTL
	}
	return &RedisCache{client: client, ttl: ttl}
}

func (c *RedisCache) key(resultID uint) string {
	return fmt.Sprintf("risk_metrics:result:%d", resultID)
}

// Get returns cached metrics for the result, or false on miss / any error.
func (c *RedisCache) Get(ctx context.Context, resultID uint) (*Metrics, bool) {
	if c == nil || c.client == nil {
		return nil, false
	}
	raw, err := c.client.Get(ctx, c.key(resultID)).Bytes()
	if err != nil {
		return nil, false
	}
	var m Metrics
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, false
	}
	return &m, true
}

// Set stores metrics for the result; failures are swallowed (cache is optional).
func (c *RedisCache) Set(ctx context.Context, resultID uint, m *Metrics) {
	if c == nil || c.client == nil || m == nil {
		return
	}
	raw, err := json.Marshal(m)
	if err != nil {
		return
	}
	_ = c.client.Set(ctx, c.key(resultID), raw, c.ttl).Err()
}

func (c *RedisCache) dailyKey(resultID uint) string {
	return fmt.Sprintf("risk_metrics:daily:%d", resultID)
}

// GetDaily returns the cached per-day series, or false on miss / any error.
func (c *RedisCache) GetDaily(ctx context.Context, resultID uint) (*DailySeries, bool) {
	if c == nil || c.client == nil {
		return nil, false
	}
	raw, err := c.client.Get(ctx, c.dailyKey(resultID)).Bytes()
	if err != nil {
		return nil, false
	}
	var s DailySeries
	if err := json.Unmarshal(raw, &s); err != nil {
		return nil, false
	}
	return &s, true
}

// SetDaily stores the per-day series; failures are swallowed (cache is optional).
func (c *RedisCache) SetDaily(ctx context.Context, resultID uint, s *DailySeries) {
	if c == nil || c.client == nil || s == nil {
		return
	}
	raw, err := json.Marshal(s)
	if err != nil {
		return
	}
	_ = c.client.Set(ctx, c.dailyKey(resultID), raw, c.ttl).Err()
}
