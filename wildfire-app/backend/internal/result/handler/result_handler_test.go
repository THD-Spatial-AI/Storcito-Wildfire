package result

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"spatialhub_backend/internal/middleware"
	"spatialhub_backend/internal/testutil"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestNewResultHandler(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewResultHandler(db, nil, nil, "secret", nil, nil, "")
	assert.NotNil(t, handler)
	assert.NotNil(t, handler.store)
	assert.Equal(t, "secret", handler.callbackSecret)
}

func TestGetModelResults_NoUserContext(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewResultHandler(db, nil, nil, "secret", nil, nil, "")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/models/1/results", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	handler.GetModelResults(c)

	// Without user context, should return error
	assert.NotEqual(t, http.StatusOK, w.Code)
}

func TestGetResultLayer_DirectShareCanLoadConfiguredLayer(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	handler := NewResultHandler(db, nil, nil, "secret", nil, nil, "https://wildfire.example")

	mock.ExpectQuery(`SELECT \* FROM "model_results".*"model_results"."id" = \$1.*LIMIT \$2`).
		WithArgs(75, 1).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "model_id", "user_id", "geoserver_workspace",
			"geoserver_layer_name", "geoserver_store_name", "geoserver_status",
		}).AddRow(
			75, 128, "owner-id", "fire_risk",
			"model_128", "model_128_store", "configured",
		))
	mock.ExpectQuery(`SELECT \* FROM "models".*"models"."id" = \$1`).
		WithArgs(128).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "user_email", "workspace_id"}).
			AddRow(128, "owner-id", "owner@example.com", nil))
	mock.ExpectQuery(`SELECT \* FROM "models".*id = \$1.*LIMIT \$2`).
		WithArgs(128, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "user_email", "workspace_id"}).
			AddRow(128, "owner-id", "owner@example.com", nil))
	mock.ExpectQuery(`SELECT count\(\*\) FROM "model_shares".*model_id = \$1.*user_id = \$2.*LOWER\(email\) = LOWER\(\$3\)`).
		WithArgs(128, "recipient-id", "recipient@example.com").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/results/75/layer", nil)
	c.Params = gin.Params{{Key: "id", Value: "75"}}
	c.Set("user_id", "recipient-id")
	c.Set("user_email", "recipient@example.com")
	c.Set("access_level", "intermediate")

	handler.GetResultLayer(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	var response struct {
		Data LayerInfoResponse `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	assert.Equal(t, "configured", response.Data.Status)
	assert.Equal(t, "fire_risk:model_128", response.Data.LayerName)
	assert.Equal(t, "https://wildfire.example/api/geoserver-proxy/fire_risk/wms", response.Data.WMSURL)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetResultLayer_ModelOwnerDoesNotDependOnResultUserID(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	handler := NewResultHandler(db, nil, nil, "secret", nil, nil, "https://wildfire.example")

	mock.ExpectQuery(`SELECT \* FROM "model_results".*"model_results"."id" = \$1.*LIMIT \$2`).
		WithArgs(75, 1).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "model_id", "user_id", "geoserver_workspace",
			"geoserver_layer_name", "geoserver_store_name", "geoserver_status",
		}).AddRow(
			75, 128, "stale-result-user-id", "fire_risk",
			"model_128", "model_128_store", "configured",
		))
	mock.ExpectQuery(`SELECT \* FROM "models".*"models"."id" = \$1`).
		WithArgs(128).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "user_email", "workspace_id"}).
			AddRow(128, "owner-id", "owner@example.com", nil))
	mock.ExpectQuery(`SELECT \* FROM "models".*id = \$1.*LIMIT \$2`).
		WithArgs(128, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "user_email", "workspace_id"}).
			AddRow(128, "owner-id", "owner@example.com", nil))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/results/75/layer", nil)
	c.Params = gin.Params{{Key: "id", Value: "75"}}
	c.Set("user_id", "owner-id")
	c.Set("user_email", "owner@example.com")
	c.Set("access_level", "intermediate")

	handler.GetResultLayer(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCallbackUpload_MissingSecret(t *testing.T) {
	t.Setenv("CALLBACK_SECRET", "mysecret")
	t.Setenv("APP_ENV", "production")

	db, _ := testutil.NewMockDB(t)
	handler := NewResultHandler(db, nil, nil, "mysecret", nil, nil, "")

	router := gin.New()
	router.POST("/callback/:id", middleware.CallbackAuthMiddleware(), handler.CallbackUpload)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/callback/1", nil)
	router.ServeHTTP(w, req)

	// Missing or wrong callback secret should fail
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
