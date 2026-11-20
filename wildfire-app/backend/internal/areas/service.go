package areas

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"

	"gorm.io/gorm"
	"platform.local/common/pkg/constants"
	platformkeycloak "platform.local/platform/keycloak"
)

var (
	ErrOutsideArea     = errors.New("area outside allowed areas")
	ErrAreaUnavailable = errors.New("area check unavailable")
	ErrNotInScope      = errors.New("area outside your own areas")
)

// user group lookup
type GroupLookup interface {
	GetUserGroups(ctx context.Context, userID string) ([]platformkeycloak.Group, error)
}

// inherited group areas
type GroupAreas struct {
	GroupID   string `json:"group_id"`
	GroupName string `json:"group_name"`
	Areas     []Ref  `json:"areas"`
}

// user area summary
type UserAreas struct {
	Restricted bool         `json:"restricted"`
	Direct     []Ref        `json:"direct"`
	Groups     []GroupAreas `json:"groups"`
	Effective  []Ref        `json:"effective"`
}

type Service struct {
	store      grantStore
	periods    periodStore
	boundaries Boundaries
	groups     GroupLookup
}

func NewService(db *gorm.DB, boundaries Boundaries, groups GroupLookup) *Service {
	return &Service{store: grantStore{db: db}, periods: periodStore{db: db}, boundaries: boundaries, groups: groups}
}

// direct and inherited
func (s *Service) ForUser(ctx context.Context, userID string) (UserAreas, error) {
	out := UserAreas{Direct: []Ref{}, Groups: []GroupAreas{}, Effective: []Ref{}}
	direct, err := s.store.list(SubjectUser, userID)
	if err != nil {
		return out, err
	}
	out.Direct = append(out.Direct, direct[userID]...)
	all := append([]Ref{}, out.Direct...)

	if s.groups != nil {
		groups, err := s.userGroups(ctx, userID)
		if err != nil {
			return out, err
		}
		ids := make([]string, 0, len(groups))
		for _, g := range groups {
			ids = append(ids, g.ID)
		}
		if len(ids) > 0 {
			byGroup, err := s.store.list(SubjectGroup, ids...)
			if err != nil {
				return out, err
			}
			for _, g := range groups {
				if refs := byGroup[g.ID]; len(refs) > 0 {
					out.Groups = append(out.Groups, GroupAreas{GroupID: g.ID, GroupName: g.Name, Areas: refs})
					all = append(all, refs...)
				}
			}
		}
	}
	out.Effective = normalize(all)
	// none means everywhere
	out.Restricted = len(out.Effective) > 0
	return out, nil
}

// keycloak user groups
func (s *Service) userGroups(ctx context.Context, userID string) ([]platformkeycloak.Group, error) {
	if s.groups == nil {
		return nil, nil
	}
	groups, err := s.groups.GetUserGroups(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrAreaUnavailable, err)
	}
	return groups, nil
}

// actor effective scope
func (s *Service) scope(ctx context.Context, userID, accessLevel string) ([]Ref, error) {
	if accessLevel == constants.AccessLevelExpert {
		return nil, nil
	}
	ua, err := s.ForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return ua.Effective, nil
}

func (s *Service) Grants(subjectType string) (map[string][]Ref, error) {
	return s.store.list(subjectType)
}

func (s *Service) GroupGrants(groupID string) ([]Ref, error) {
	m, err := s.store.list(SubjectGroup, groupID)
	if err != nil {
		return nil, err
	}
	if m[groupID] == nil {
		return []Ref{}, nil
	}
	return m[groupID], nil
}

// scoped grant update
func (s *Service) Set(ctx context.Context, actorID, actorLevel, subjectType, subjectID string, refs []Ref) error {
	if err := Validate(refs); err != nil {
		return err
	}
	refs = normalize(refs)
	scope, err := s.scope(ctx, actorID, actorLevel)
	if err != nil {
		return err
	}
	// empty means everywhere
	if len(scope) > 0 && len(refs) == 0 {
		if subjectType == SubjectGroup {
			return fmt.Errorf("%w: cannot remove all areas", ErrNotInScope)
		}
		ua, err := s.ForUser(ctx, subjectID)
		if err != nil {
			return err
		}
		if len(ua.Groups) == 0 {
			return fmt.Errorf("%w: cannot remove all areas", ErrNotInScope)
		}
	}
	for _, r := range refs {
		ok, err := s.covers(ctx, scope, r)
		if err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("%w: %s %s", ErrNotInScope, r.Level, r.Code)
		}
	}
	return s.store.replace(subjectType, subjectID, refs)
}

// scope includes target
func (s *Service) covers(ctx context.Context, scope []Ref, target Ref) (bool, error) {
	if len(scope) == 0 {
		return true, nil
	}
	province := ""
	switch target.Level {
	case LevelMunicipality:
		province = target.Code[:2]
	case LevelProvince:
		province = target.Code
	}
	for _, a := range scope {
		switch {
		case a.Level == target.Level && a.Code == target.Code:
			return true, nil
		case a.Level == LevelProvince && target.Level == LevelMunicipality && a.Code == province:
			return true, nil
		case a.Level == LevelCommunity && province != "":
			kids, err := s.boundaries.Children(ctx, LevelProvince, a.Code)
			if err != nil {
				return false, fmt.Errorf("%w: %v", ErrAreaUnavailable, err)
			}
			if slices.Contains(kids, province) {
				return true, nil
			}
		}
	}
	return false, nil
}

// model area check
func (s *Service) CheckModelArea(ctx context.Context, userID, accessLevel string, coordinates json.RawMessage) error {
	if len(coordinates) == 0 || string(coordinates) == "null" {
		return nil
	}
	scope, err := s.scope(ctx, userID, accessLevel)
	if err != nil || len(scope) == 0 {
		return err
	}
	drawn, err := vertices(coordinates)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrOutsideArea, err)
	}
	var allowed []polygon
	for _, r := range scope {
		raw, err := s.boundaries.Geometry(ctx, r)
		if err != nil {
			return fmt.Errorf("%w: %v", ErrAreaUnavailable, err)
		}
		ps, err := polygons(raw)
		if err != nil {
			return fmt.Errorf("%w: %v", ErrAreaUnavailable, err)
		}
		allowed = append(allowed, ps...)
	}
	if !within(drawn, allowed) {
		return ErrOutsideArea
	}
	return nil
}
