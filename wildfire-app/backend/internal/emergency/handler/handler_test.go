package emergencyhandler

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/datatypes"

	emergencystore "spatialhub_backend/internal/store/emergency"
	resultstore "spatialhub_backend/internal/store/result"
	"spatialhub_backend/internal/testutil"
)

func TestCentroidOfGeoJSON(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		wantLon float64
		wantLat float64
		wantOK  bool
	}{
		{
			name:    "polygon",
			raw:     `{"type":"Polygon","coordinates":[[[-8,42],[-8,43],[-9,43],[-9,42],[-8,42]]]}`,
			wantLon: -8.4,
			wantLat: 42.4,
			wantOK:  true,
		},
		{
			name:    "point",
			raw:     `{"type":"Point","coordinates":[-8.5,42.8]}`,
			wantLon: -8.5,
			wantLat: 42.8,
			wantOK:  true,
		},
		{
			name:    "multi polygon",
			raw:     `{"type":"MultiPolygon","coordinates":[[[[0,0],[2,0],[0,2],[0,0]]],[[[10,10],[12,10],[10,12],[10,10]]]]}`,
			wantLon: 5.5,
			wantLat: 5.5,
			wantOK:  true,
		},
		{
			name:    "feature",
			raw:     `{"type":"Feature","geometry":{"type":"Point","coordinates":[-8.5,42.8]},"properties":{}}`,
			wantLon: -8.5,
			wantLat: 42.8,
			wantOK:  true,
		},
		{
			name:    "feature collection",
			raw:     `{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}},{"type":"Feature","geometry":{"type":"Point","coordinates":[2,2]}}]}`,
			wantLon: 1,
			wantLat: 1,
			wantOK:  true,
		},
		{name: "invalid json", raw: `{not json`, wantOK: false},
		{name: "missing coordinates", raw: `{"type":"Polygon"}`, wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lon, lat, ok := centroidOfGeoJSON(datatypes.JSON(tt.raw))
			assert.Equal(t, tt.wantOK, ok)
			if tt.wantOK {
				assert.InDelta(t, tt.wantLon, lon, 1e-9)
				assert.InDelta(t, tt.wantLat, lat, 1e-9)
			}
		})
	}

	_, _, ok := centroidOfGeoJSON(nil)
	assert.False(t, ok)
}

func newTestContext(method, target, modelID string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(method, target, nil)
	c.Params = gin.Params{{Key: "id", Value: modelID}}
	return c, recorder
}

func newTestHandler(t *testing.T) (*Handler, sqlmock.Sqlmock) {
	db, mock := testutil.NewMockDB(t)
	return NewHandler(emergencystore.NewStore(db), resultstore.NewStore(db)), mock
}

func expectModelQuery(mock sqlmock.Sqlmock, rows *sqlmock.Rows) {
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "models" WHERE id = $1`)).
		WillReturnRows(rows)
}

func TestGetNearestUnauthenticated(t *testing.T) {
	handler, _ := newTestHandler(t)
	c, recorder := newTestContext(http.MethodGet, "/api/models/1/emergency-services/nearest", "1")

	handler.GetNearest(c)

	assert.Equal(t, http.StatusUnauthorized, recorder.Code)
}

func TestGetNearestInvalidModelID(t *testing.T) {
	handler, _ := newTestHandler(t)
	c, recorder := newTestContext(http.MethodGet, "/api/models/abc/emergency-services/nearest", "abc")
	c.Set("user_id", "user-1")

	handler.GetNearest(c)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
}

func TestGetNearestModelNotFound(t *testing.T) {
	handler, mock := newTestHandler(t)
	expectModelQuery(mock, sqlmock.NewRows(nil))
	c, recorder := newTestContext(http.MethodGet, "/api/models/999/emergency-services/nearest", "999")
	c.Set("user_id", "user-1")

	handler.GetNearest(c)

	assert.Equal(t, http.StatusNotFound, recorder.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetNearestModelWithoutLocation(t *testing.T) {
	handler, mock := newTestHandler(t)
	rows := sqlmock.NewRows([]string{"id", "user_id", "user_email", "coordinates"}).
		AddRow(1, "user-1", "user@example.com", nil)
	expectModelQuery(mock, rows)
	c, recorder := newTestContext(http.MethodGet, "/api/models/1/emergency-services/nearest", "1")
	c.Set("user_id", "user-1")

	handler.GetNearest(c)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetNearestSuccess(t *testing.T) {
	handler, mock := newTestHandler(t)
	modelRows := sqlmock.NewRows([]string{"id", "user_id", "user_email", "coordinates"}).
		AddRow(1, "user-1", "user@example.com", `{"type":"Polygon","coordinates":[[[-8,42],[-8,43],[-9,43],[-9,42],[-8,42]]]}`)
	expectModelQuery(mock, modelRows)

	serviceColumns := []string{"id", "name", "category", "service_type", "address", "postcode", "city", "phone", "email", "longitude", "latitude", "distance_m"}
	mock.ExpectQuery(regexp.QuoteMeta("row_number() OVER")).
		WithArgs(-8.4, 42.4, 1).
		WillReturnRows(sqlmock.NewRows(serviceColumns).
			AddRow(7, "A Coruña", "bombeiros", "Bombeiros", nil, nil, nil, nil, nil, -8.42, 43.35, 1234.5))

	c, recorder := newTestContext(http.MethodGet, "/api/models/1/emergency-services/nearest", "1")
	c.Set("user_id", "user-1")

	handler.GetNearest(c)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	assert.Contains(t, recorder.Body.String(), `"distance_m":1234.5`)
	assert.NoError(t, mock.ExpectationsWereMet())
}
