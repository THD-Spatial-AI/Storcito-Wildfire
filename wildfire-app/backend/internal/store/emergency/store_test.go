package emergency

import (
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"spatialhub_backend/internal/models"
	"spatialhub_backend/internal/testutil"
)

func TestNewStore(t *testing.T) {
	db, _ := testutil.NewMockDB(t)
	assert.NotNil(t, NewStore(db))
}

func TestNearestPerCategory(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	store := NewStore(db)

	columns := []string{"id", "name", "category", "service_type", "address", "postcode", "city", "phone", "email", "longitude", "latitude", "distance_m"}
	rows := sqlmock.NewRows(columns).
		AddRow(7, "A Coruña", "bombeiros", "Bombeiros", nil, nil, nil, nil, nil, -8.42, 43.35, 1234.5)

	mock.ExpectQuery(regexp.QuoteMeta("row_number() OVER")).
		WithArgs(-8.4, 43.3, 2).
		WillReturnRows(rows)

	services, err := store.NearestPerCategory(-8.4, 43.3, 2)
	require.NoError(t, err)
	require.Len(t, services, 1)
	assert.Equal(t, int64(7), services[0].ID)
	assert.Equal(t, "bombeiros", services[0].Category)
	assert.Equal(t, -8.42, services[0].Longitude)
	assert.Equal(t, 1234.5, services[0].DistanceM)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestNearestPerCategoryClampsLimit(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	store := NewStore(db)

	empty := sqlmock.NewRows([]string{"id", "name", "category", "service_type", "address", "postcode", "city", "phone", "email", "longitude", "latitude", "distance_m"})

	mock.ExpectQuery(regexp.QuoteMeta("row_number() OVER")).
		WithArgs(-8.4, 43.3, 1).
		WillReturnRows(empty)
	mock.ExpectQuery(regexp.QuoteMeta("row_number() OVER")).
		WithArgs(-8.4, 43.3, 3).
		WillReturnRows(empty)

	_, err := store.NearestPerCategory(-8.4, 43.3, 0)
	require.NoError(t, err)
	_, err = store.NearestPerCategory(-8.4, 43.3, 99)
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestReplaceAll(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	store := NewStore(db)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("TRUNCATE TABLE emergency_services")).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "emergency_services"`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

	err := store.ReplaceAll([]models.EmergencyService{{
		Name:        "A Coruña",
		Category:    "bombeiros",
		ServiceType: "Bombeiros",
		Geom:        models.GeographyPoint{Lon: -8.42, Lat: 43.35},
	}})
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestReplaceAllEmpty(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	store := NewStore(db)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("TRUNCATE TABLE emergency_services")).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	err := store.ReplaceAll(nil)
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCount(t *testing.T) {
	db, mock := testutil.NewMockDB(t)
	store := NewStore(db)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "emergency_services"`)).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(653))

	count, err := store.Count()
	require.NoError(t, err)
	assert.Equal(t, int64(653), count)
	assert.NoError(t, mock.ExpectationsWereMet())
}
