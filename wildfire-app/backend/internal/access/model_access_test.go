package access

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"platform.local/common/pkg/httputil"
	commonModels "platform.local/common/pkg/models"
)

type fakeModelAccessStore struct {
	model       *commonModels.Model
	modelErr    error
	groupIDs    []string
	groupErr    error
	hasShare    bool
	shareErr    error
	shareUserID string
	shareEmail  string
}

func (s *fakeModelAccessStore) GetModelByIDWithWorkspace(uint) (*commonModels.Model, error) {
	return s.model, s.modelErr
}

func (s *fakeModelAccessStore) GetUserGroupIDs(string) ([]string, error) {
	return s.groupIDs, s.groupErr
}

func (s *fakeModelAccessStore) HasModelShare(_ uint, userID, email string) (bool, error) {
	s.shareUserID = userID
	s.shareEmail = email
	return s.hasShare, s.shareErr
}

func TestEnsureModelAccessAllowsDirectEmailShare(t *testing.T) {
	store := &fakeModelAccessStore{
		model:    &commonModels.Model{ID: 128, UserID: "owner-id"},
		hasShare: true,
	}
	user := &httputil.UserContext{
		UserID: "recipient-id",
		Email:  "Recipient@Example.com",
	}

	model, err := EnsureModelAccess(store, user, 128)

	require.NoError(t, err)
	assert.Equal(t, uint(128), model.ID)
	assert.Equal(t, "recipient-id", store.shareUserID)
	assert.Equal(t, "Recipient@Example.com", store.shareEmail)
}

func TestEnsureModelAccessKeepsOwnerAccessWithoutResultOwnership(t *testing.T) {
	store := &fakeModelAccessStore{
		model: &commonModels.Model{
			ID:        128,
			UserID:    "owner-id",
			UserEmail: "owner@example.com",
		},
	}

	model, err := EnsureModelAccess(store, &httputil.UserContext{UserID: "owner-id"}, 128)

	require.NoError(t, err)
	assert.Equal(t, uint(128), model.ID)
	assert.Empty(t, store.shareUserID, "owner access must not depend on a share record")
}

func TestEnsureModelAccessRecognizesOwnerByEmailAfterIdentityIDChange(t *testing.T) {
	store := &fakeModelAccessStore{
		model: &commonModels.Model{
			ID:        128,
			UserID:    "old-owner-id",
			UserEmail: "Owner@Example.com",
		},
	}
	user := &httputil.UserContext{
		UserID: "new-owner-id",
		Email:  "owner@example.com",
	}

	_, err := EnsureModelAccess(store, user, 128)

	require.NoError(t, err)
	assert.Empty(t, store.shareUserID, "owner access must not depend on a share record")
}

func TestEnsureModelAccessDeniesUnsharedUser(t *testing.T) {
	store := &fakeModelAccessStore{
		model: &commonModels.Model{ID: 128, UserID: "owner-id"},
	}

	_, err := EnsureModelAccess(store, &httputil.UserContext{UserID: "other-id"}, 128)

	assert.ErrorIs(t, err, ErrForbidden)
}

func TestEnsureModelAccessPropagatesShareLookupFailure(t *testing.T) {
	lookupErr := errors.New("database unavailable")
	store := &fakeModelAccessStore{
		model:    &commonModels.Model{ID: 128, UserID: "owner-id"},
		shareErr: lookupErr,
	}

	_, err := EnsureModelAccess(store, &httputil.UserContext{UserID: "recipient-id"}, 128)

	assert.ErrorIs(t, err, lookupErr)
}

func TestEnsureModelAccessMapsMissingModel(t *testing.T) {
	store := &fakeModelAccessStore{modelErr: gorm.ErrRecordNotFound}

	_, err := EnsureModelAccess(store, &httputil.UserContext{UserID: "recipient-id"}, 128)

	assert.ErrorIs(t, err, ErrModelNotFound)
}
