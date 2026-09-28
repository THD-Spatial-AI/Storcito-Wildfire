package models

import (
	"database/sql/driver"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"gorm.io/datatypes"
)

// GeographyPoint is an EPSG:4326 PostGIS geography point.
type GeographyPoint struct {
	Lon float64 `json:"longitude"`
	Lat float64 `json:"latitude"`
}

func (p GeographyPoint) Value() (driver.Value, error) {
	return fmt.Sprintf("SRID=4326;POINT(%g %g)", p.Lon, p.Lat), nil
}

func (p *GeographyPoint) Scan(value interface{}) error {
	switch v := value.(type) {
	case nil:
		return errors.New("cannot scan nil into GeographyPoint")
	case []byte:
		return p.scanEWKB(v)
	case string:
		return p.scanText(v)
	default:
		return fmt.Errorf("unsupported scan source %T", value)
	}
}

func (GeographyPoint) GormDataType() string {
	return "geography(Point,4326)"
}

// scanText handles hex EWKB or EWKT strings.
func (p *GeographyPoint) scanText(s string) error {
	if isHexEWKB(s) {
		data, err := hex.DecodeString(s)
		if err != nil {
			return fmt.Errorf("decode hex EWKB: %w", err)
		}
		return p.scanEWKB(data)
	}
	if idx := strings.Index(s, "POINT"); idx >= 0 {
		s = s[idx+len("POINT"):]
	}
	s = strings.Trim(s, "() \t")
	if _, err := fmt.Sscanf(s, "%g %g", &p.Lon, &p.Lat); err != nil {
		return fmt.Errorf("parse EWKT point %q: %w", s, err)
	}
	return nil
}

// scanEWKB parses a WKB/EWKB point (byte order, SRID flag aware).
func (p *GeographyPoint) scanEWKB(data []byte) error {
	if len(data) < 5 {
		return errors.New("invalid EWKB: too short")
	}
	var order binary.ByteOrder = binary.BigEndian
	switch data[0] {
	case 0:
	case 1:
		order = binary.LittleEndian
	default:
		return errors.New("invalid EWKB byte order flag")
	}
	wkbType := order.Uint32(data[1:5])
	if wkbType&0xFF != 1 {
		return fmt.Errorf("unsupported WKB geometry type %d", wkbType&0xFF)
	}
	offset := 5
	if wkbType&0x20000000 != 0 { // SRID flag
		if len(data) < offset+4 {
			return errors.New("invalid EWKB: missing SRID")
		}
		offset += 4
	}
	if len(data) < offset+16 {
		return errors.New("invalid EWKB: missing coordinates")
	}
	p.Lon = math.Float64frombits(order.Uint64(data[offset : offset+8]))
	p.Lat = math.Float64frombits(order.Uint64(data[offset+8 : offset+16]))
	return nil
}

func isHexEWKB(s string) bool {
	if len(s) < 10 || len(s)%2 != 0 {
		return false
	}
	if s[:2] != "00" && s[:2] != "01" {
		return false
	}
	for _, r := range s {
		isDigit := r >= '0' && r <= '9'
		isHex := r >= 'a' && r <= 'f' || r >= 'A' && r <= 'F'
		if !isDigit && !isHex {
			return false
		}
	}
	return true
}

// EmergencyService is an imported emergency-service point location.
type EmergencyService struct {
	ID          int64          `gorm:"primaryKey" json:"id"`
	ExternalID  *int           `json:"external_id,omitempty"`
	Name        string         `gorm:"type:text;not null" json:"name"`
	Category    string         `gorm:"type:text;not null;index" json:"category"`
	ServiceType string         `gorm:"type:text;not null" json:"service_type"`
	Address     *string        `json:"address,omitempty"`
	Postcode    *string        `json:"postcode,omitempty"`
	City        *string        `json:"city,omitempty"`
	Phone       *string        `json:"phone,omitempty"`
	Email       *string        `json:"email,omitempty"`
	Geom        GeographyPoint `gorm:"column:geom" json:"geom"`
	Properties  datatypes.JSON `gorm:"type:jsonb;not null" json:"properties"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

func (EmergencyService) TableName() string {
	return "emergency_services"
}
