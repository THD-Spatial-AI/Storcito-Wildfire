package emergency

import (
	"fmt"

	"gorm.io/gorm"

	"spatialhub_backend/internal/models"
)

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) *Store {
	return &Store{db: db}
}

// NearestService is a flattened row of the nearest-per-category search.
type NearestService struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	ServiceType string  `json:"service_type"`
	Address     *string `json:"address,omitempty"`
	Postcode    *string `json:"postcode,omitempty"`
	City        *string `json:"city,omitempty"`
	Phone       *string `json:"phone,omitempty"`
	Email       *string `json:"email,omitempty"`
	Longitude   float64 `json:"longitude"`
	Latitude    float64 `json:"latitude"`
	DistanceM   float64 `json:"distance_m"`
}

// ReplaceAll re-imports the full dataset in one transaction.
func (s *Store) ReplaceAll(services []models.EmergencyService) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("TRUNCATE TABLE emergency_services").Error; err != nil {
			return fmt.Errorf("truncate emergency_services: %w", err)
		}
		if len(services) == 0 {
			return nil
		}
		if err := tx.CreateInBatches(services, 200).Error; err != nil {
			return fmt.Errorf("insert emergency_services: %w", err)
		}
		return nil
	})
}

// NearestPerCategory returns up to perCategory nearest services per category.
func (s *Store) NearestPerCategory(lon, lat float64, perCategory int) ([]NearestService, error) {
	if perCategory < 1 {
		perCategory = 1
	}
	if perCategory > 3 {
		perCategory = 3
	}

	var services []NearestService
	err := s.db.Raw(`
SELECT id, name, category, service_type, address, postcode, city, phone, email,
       longitude, latitude, distance_m
FROM (
    SELECT id, name, category, service_type, address, postcode, city, phone, email,
           ST_X(geom::geometry) AS longitude,
           ST_Y(geom::geometry) AS latitude,
           ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m,
           row_number() OVER (
               PARTITION BY category
               ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
           ) AS category_rank
    FROM emergency_services
) ranked
WHERE category_rank <= $3
ORDER BY category, category_rank`, lon, lat, perCategory).Scan(&services).Error
	if err != nil {
		return nil, fmt.Errorf("nearest emergency services: %w", err)
	}
	return services, nil
}

func (s *Store) Count() (int64, error) {
	var count int64
	if err := s.db.Model(&models.EmergencyService{}).Count(&count).Error; err != nil {
		return 0, fmt.Errorf("count emergency services: %w", err)
	}
	return count, nil
}
