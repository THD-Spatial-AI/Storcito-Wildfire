package model

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	commonmodels "platform.local/common/pkg/models"
	modelstore "spatialhub_backend/internal/store/model"
	"spatialhub_backend/internal/testutil"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestNewModelHandler(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)
	assert.NotNil(t, handler)
	assert.NotNil(t, handler.store)
}

func TestNewModelHandlerWithCache(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)
	assert.NotNil(t, handler)
	assert.NotNil(t, handler.store)
}

func TestCreateModel_NoUserContext(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/models", strings.NewReader(`{"title":"test"}`))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.CreateModel(c)

	assert.NotEqual(t, http.StatusOK, w.Code)
}

func TestGetModel_NoUserContext(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/models/1", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	handler.GetModel(c)

	assert.NotEqual(t, http.StatusOK, w.Code)
}

func TestGetModels_NoUserContext(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/models", nil)

	handler.GetModels(c)

	assert.NotEqual(t, http.StatusOK, w.Code)
}

func TestDeleteModel_NoUserContext(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/models/1", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	handler.DeleteModel(c)

	assert.NotEqual(t, http.StatusOK, w.Code)
}

func TestShareModel_NoUserContext(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/models/1/share", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	handler.ShareModel(c)

	assert.NotEqual(t, http.StatusOK, w.Code)
}

func TestRevokeModelShare_OwnerCanRevoke(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)

	mock.ExpectQuery(`SELECT \* FROM "models" WHERE id = \$1`).
		WithArgs("128", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "user_email"}).
			AddRow(128, "owner-id", "owner@example.com"))
	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "model_shares" WHERE id = \$1 AND model_id = \$2`).
		WithArgs(9, 128).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/models/128/shares/9", nil)
	c.Params = gin.Params{{Key: "id", Value: "128"}, {Key: "shareId", Value: "9"}}
	c.Set("user_id", "owner-id")
	c.Set("user_email", "owner@example.com")
	c.Set("access_level", "intermediate")

	handler.RevokeModelShare(c)

	assert.Equal(t, http.StatusOK, w.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRevokeModelShare_RecipientCannotRevoke(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)

	mock.ExpectQuery(`SELECT \* FROM "models" WHERE id = \$1`).
		WithArgs("128", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "user_email"}).
			AddRow(128, "owner-id", "owner@example.com"))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/models/128/shares/9", nil)
	c.Params = gin.Params{{Key: "id", Value: "128"}, {Key: "shareId", Value: "9"}}
	c.Set("user_id", "recipient-id")
	c.Set("user_email", "recipient@example.com")
	c.Set("access_level", "intermediate")

	handler.RevokeModelShare(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetModelStats_NoUserContext(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	handler := NewModelHandlerWithCache(db, nil, nil, "http://kc", "realm", nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/models/stats", nil)

	handler.GetModelStats(c)

	assert.NotEqual(t, http.StatusOK, w.Code)
}

func TestBuildQueryWithWorkspaceFilter_ExpertDefaultIncludesDirectShares(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	handler := &ModelHandler{store: modelstore.NewStore(db)}

	mock.ExpectQuery(`SELECT \* FROM "workspaces" WHERE user_id = \$1 AND is_default = \$2`).
		WithArgs("recipient-id", true, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "is_default"}).
			AddRow(42, "recipient-id", true))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/models?workspace_id=42", nil)

	query, ok := handler.buildQueryWithWorkspaceFilter(c, &httputil.UserContext{
		UserID:      "recipient-id",
		Email:       "recipient@example.com",
		AccessLevel: constants.AccessLevelExpert,
	}, "42", 100, 0)
	require.True(t, ok)

	var modelsList []commonmodels.Model
	stmt := query.Session(&gorm.Session{DryRun: true}).Find(&modelsList).Statement
	require.NoError(t, stmt.Error)
	assert.Contains(t, stmt.SQL.String(), "model_shares")
	assert.Contains(t, stmt.SQL.String(), "LOWER(email) = LOWER(")
	require.NoError(t, mock.ExpectationsWereMet())
}
