package main

import (
	"encoding/json"
	"flag"
	"log"
	"os"

	"gorm.io/datatypes"

	"platform.local/platform/database"
	"spatialhub_backend/internal/config"
	"spatialhub_backend/internal/models"
	emergencystore "spatialhub_backend/internal/store/emergency"
)

const defaultGeoJSONPath = "../../data/galicia-emergency/galicia_emergency.geojson"

type pointGeometry struct {
	Type        string    `json:"type"`
	Coordinates []float64 `json:"coordinates"`
}

type geoFeature struct {
	Geometry   *pointGeometry         `json:"geometry"`
	Properties map[string]interface{} `json:"properties"`
}

type featureCollection struct {
	Features []geoFeature `json:"features"`
}

// nameKeys maps each category to its name property key.
var nameKeys = map[string]string{
	"bombeiros":        "NOMEBOMBEIROS",
	"ges":              "NOMEGES",
	"policia_nacional": "DEPENDENCI",
	"garda_civil":      "UNIDADES",
	"policia_local":    "CONCELLO",
	"smpc":             "NOMESMPC",
	"avpc":             "NOMEAVPC",
	"upa":              "NOME",
}

func stringProp(props map[string]interface{}, key string) *string {
	if key == "" {
		return nil
	}
	if v, ok := props[key].(string); ok && v != "" {
		return &v
	}
	return nil
}

func intProp(props map[string]interface{}, key string) *int {
	if v, ok := props[key].(float64); ok {
		i := int(v)
		return &i
	}
	return nil
}

// mapFeature converts one GeoJSON feature; ok is false for skippable features.
func mapFeature(f geoFeature) (models.EmergencyService, bool) {
	if f.Geometry == nil || len(f.Geometry.Coordinates) < 2 {
		return models.EmergencyService{}, false
	}

	props := f.Properties
	category, _ := props["category"].(string)
	serviceType, _ := props["source_layer"].(string)

	name := ""
	if v := stringProp(props, nameKeys[category]); v != nil {
		name = *v
	}

	externalID := intProp(props, "OBJECTID")
	if externalID == nil {
		externalID = intProp(props, "OBJECTID_1")
	}

	city := stringProp(props, "MUNICIPIO")
	if city == nil {
		city = stringProp(props, "CONCELLO")
	}

	raw, err := json.Marshal(props)
	if err != nil {
		return models.EmergencyService{}, false
	}

	return models.EmergencyService{
		ExternalID:  externalID,
		Name:        name,
		Category:    category,
		ServiceType: serviceType,
		Address:     stringProp(props, "DIRECCION"),
		City:        city,
		Phone:       stringProp(props, "TELEFONO"),
		Email:       stringProp(props, "CORREO"),
		Geom: models.GeographyPoint{
			Lon: f.Geometry.Coordinates[0],
			Lat: f.Geometry.Coordinates[1],
		},
		Properties: datatypes.JSON(raw),
	}, true
}

func main() {
	filePath := flag.String("file", defaultGeoJSONPath, "path to the emergency services GeoJSON")
	flag.Parse()

	cfg, err := config.LoadFromEnv()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, sqlDB, err := database.ConnectWithPing(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer sqlDB.Close()

	data, err := os.ReadFile(*filePath)
	if err != nil {
		log.Fatalf("Failed to read %s: %v", *filePath, err)
	}

	var fc featureCollection
	if err := json.Unmarshal(data, &fc); err != nil {
		log.Fatalf("Failed to decode %s: %v", *filePath, err)
	}

	services := make([]models.EmergencyService, 0, len(fc.Features))
	skipped := 0
	for _, feature := range fc.Features {
		service, ok := mapFeature(feature)
		if !ok {
			skipped++
			continue
		}
		services = append(services, service)
	}

	store := emergencystore.NewStore(db)
	if err := store.ReplaceAll(services); err != nil {
		log.Fatalf("Failed to import emergency services: %v", err)
	}

	log.Printf("Inserted %d services, skipped %d (total features %d)", len(services), skipped, len(fc.Features))
}
