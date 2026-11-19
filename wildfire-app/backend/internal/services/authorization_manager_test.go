package services

import (
	"context"
	"errors"
	"testing"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
)

func TestManagerGroupsAccessRules(t *testing.T) {
	s := &authorizationService{} // no keycloak
	ctx := context.Background()

	if _, _, err := s.managerGroups(ctx, nil); !errors.Is(err, ErrAccessDenied) {
		t.Fatalf("nil actor: want denied, got %v", err)
	}
	if _, expert, err := s.managerGroups(ctx, &httputil.UserContext{AccessLevel: constants.AccessLevelExpert}); err != nil || !expert {
		t.Fatalf("expert: want allowed, got expert=%v err=%v", expert, err)
	}
	if _, _, err := s.managerGroups(ctx, &httputil.UserContext{AccessLevel: constants.AccessLevelIntermediate}); !errors.Is(err, ErrAccessDenied) {
		t.Fatalf("intermediate: want denied, got %v", err)
	}
	// manager without keycloak
	if _, _, err := s.managerGroups(ctx, &httputil.UserContext{AccessLevel: constants.AccessLevelManager}); !errors.Is(err, ErrAccessDenied) {
		t.Fatalf("manager without kc: want denied, got %v", err)
	}
	if err := s.CanManageGroup(ctx, &httputil.UserContext{AccessLevel: constants.AccessLevelExpert}, "g1"); err != nil {
		t.Fatalf("expert group: want nil, got %v", err)
	}
	if err := s.CanManageUser(ctx, nil, "u1"); !errors.Is(err, ErrAccessDenied) {
		t.Fatalf("nil manage user: want denied, got %v", err)
	}
}
