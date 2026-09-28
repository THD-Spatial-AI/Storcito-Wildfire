package main

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func pointFeature(lon, lat float64, props map[string]interface{}) geoFeature {
	return geoFeature{
		Geometry:   &pointGeometry{Type: "Point", Coordinates: []float64{lon, lat}},
		Properties: props,
	}
}

func TestMapFeaturePerCategoryNames(t *testing.T) {
	tests := []struct {
		category string
		props    map[string]interface{}
		wantName string
	}{
		{"bombeiros", map[string]interface{}{"OBJECTID": 1.0, "NOMEBOMBEIROS": "A Coruña"}, "A Coruña"},
		{"ges", map[string]interface{}{"OBJECTID": 75.0, "NOMEGES": "Brión"}, "Brión"},
		{"policia_nacional", map[string]interface{}{"OBJECTID_1": 1.0, "DEPENDENCI": "Jefatura Superior"}, "Jefatura Superior"},
		{"garda_civil", map[string]interface{}{"OBJECTID": 1.0, "UNIDADES": "Comandancia"}, "Comandancia"},
		{"policia_local", map[string]interface{}{"OBJECTID": 1.0, "CONCELLO": "Tordoia"}, "Tordoia"},
		{"smpc", map[string]interface{}{"OBJECTID": 27.0, "NOMESMPC": "Arteixo"}, "Arteixo"},
		{"avpc", map[string]interface{}{"OBJECTID": 474.0, "NOMEAVPC": "Val Miñor"}, "Val Miñor"},
		{"upa", map[string]interface{}{"OBJECTID": 1.0, "NOME": "Santiago"}, "Santiago"},
	}

	for _, tt := range tests {
		t.Run(tt.category, func(t *testing.T) {
			tt.props["category"] = tt.category
			tt.props["source_layer"] = "Layer " + tt.category
			service, ok := mapFeature(pointFeature(-8.5, 42.8, tt.props))
			require.True(t, ok)
			assert.Equal(t, tt.wantName, service.Name)
			assert.Equal(t, tt.category, service.Category)
			assert.Equal(t, "Layer "+tt.category, service.ServiceType)
			assert.Equal(t, -8.5, service.Geom.Lon)
			assert.Equal(t, 42.8, service.Geom.Lat)
		})
	}
}

func TestMapFeatureSkipsNullGeometry(t *testing.T) {
	feature := geoFeature{Geometry: nil, Properties: map[string]interface{}{
		"category": "upa", "NOME": "Santiago",
	}}
	_, ok := mapFeature(feature)
	assert.False(t, ok)
}

func TestMapFeatureExternalIDFallback(t *testing.T) {
	withObjectID, ok := mapFeature(pointFeature(-8.5, 42.8, map[string]interface{}{
		"OBJECTID": 5.0, "category": "bombeiros", "NOMEBOMBEIROS": "Arteixo",
	}))
	require.True(t, ok)
	require.NotNil(t, withObjectID.ExternalID)
	assert.Equal(t, 5, *withObjectID.ExternalID)

	withObjectID1, ok := mapFeature(pointFeature(-8.5, 42.8, map[string]interface{}{
		"OBJECTID_1": 12.0, "category": "policia_nacional", "DEPENDENCI": "Jefatura",
	}))
	require.True(t, ok)
	require.NotNil(t, withObjectID1.ExternalID)
	assert.Equal(t, 12, *withObjectID1.ExternalID)
}

func TestMapFeatureOptionalFieldsAndRawProperties(t *testing.T) {
	props := map[string]interface{}{
		"OBJECTID":     1.0,
		"category":     "policia_nacional",
		"source_layer": "Policía nacional",
		"DEPENDENCI":   "Comisaría",
		"DIRECCION":    "Av. Do Porto 5-7",
		"MUNICIPIO":    "A Coruña",
	}
	service, ok := mapFeature(pointFeature(-8.4, 43.3, props))
	require.True(t, ok)

	require.NotNil(t, service.Address)
	assert.Equal(t, "Av. Do Porto 5-7", *service.Address)
	require.NotNil(t, service.City)
	assert.Equal(t, "A Coruña", *service.City)
	assert.Nil(t, service.Phone)
	assert.Nil(t, service.Email)

	var raw map[string]interface{}
	require.NoError(t, json.Unmarshal(service.Properties, &raw))
	assert.Equal(t, "Comisaría", raw["DEPENDENCI"])
}

func TestMapFeaturePoliciaLocalCityFromConcello(t *testing.T) {
	service, ok := mapFeature(pointFeature(-8.5, 42.8, map[string]interface{}{
		"OBJECTID": 1.0, "category": "policia_local", "CONCELLO": "Tordoia", "TIPO": "PL",
	}))
	require.True(t, ok)
	require.NotNil(t, service.City)
	assert.Equal(t, "Tordoia", *service.City)
	assert.Equal(t, "Tordoia", service.Name)
}
