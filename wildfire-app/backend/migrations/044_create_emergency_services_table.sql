BEGIN;

-- PostGIS for spatial queries.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Imported emergency-service point locations.
CREATE TABLE IF NOT EXISTS emergency_services (
    id BIGSERIAL PRIMARY KEY,
    external_id INTEGER,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    service_type TEXT NOT NULL,
    address TEXT,
    postcode TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    geom geography(Point, 4326) NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emergency_services_geom_gix
    ON emergency_services USING GIST (geom);

CREATE INDEX IF NOT EXISTS emergency_services_category_idx
    ON emergency_services (category);

COMMIT;
