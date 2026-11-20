package areas

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"gorm.io/gorm"
	"platform.local/common/pkg/constants"
)

const dayFormat = "2006-01-02"

var ErrOutsidePeriod = errors.New("dates outside allowed periods")

// one allowed range
type Period struct {
	From string `json:"from"`
	To   string `json:"to"`
}

// stored period row
type PeriodGrant struct {
	ID          uint      `gorm:"primaryKey"`
	SubjectType string    `gorm:"size:8;not null"`
	SubjectID   string    `gorm:"size:64;not null"`
	DateFrom    time.Time `gorm:"type:date;not null"`
	DateTo      time.Time `gorm:"type:date;not null"`
	CreatedAt   time.Time
}

func (PeriodGrant) TableName() string { return "period_grants" }

// inherited group periods
type GroupPeriods struct {
	GroupID   string   `json:"group_id"`
	GroupName string   `json:"group_name"`
	Periods   []Period `json:"periods"`
}

// user period summary
type UserPeriods struct {
	Restricted bool           `json:"restricted"`
	Direct     []Period       `json:"direct"`
	Groups     []GroupPeriods `json:"groups"`
	Effective  []Period       `json:"effective"`
}

type span struct{ from, to time.Time }

func parsePeriod(p Period) (span, error) {
	from, err := time.Parse(dayFormat, p.From)
	if err != nil {
		return span{}, fmt.Errorf("invalid period start %q", p.From)
	}
	to, err := time.Parse(dayFormat, p.To)
	if err != nil {
		return span{}, fmt.Errorf("invalid period end %q", p.To)
	}
	if to.Before(from) {
		return span{}, fmt.Errorf("period ends before it starts: %s to %s", p.From, p.To)
	}
	return span{from, to}, nil
}

// joined touching ranges
func merge(periods []Period) []span {
	spans := make([]span, 0, len(periods))
	for _, p := range periods {
		if s, err := parsePeriod(p); err == nil {
			spans = append(spans, s)
		}
	}
	sort.Slice(spans, func(i, j int) bool { return spans[i].from.Before(spans[j].from) })
	var out []span
	for _, s := range spans {
		if n := len(out); n > 0 && !s.from.After(out[n-1].to.AddDate(0, 0, 1)) {
			if s.to.After(out[n-1].to) {
				out[n-1].to = s.to
			}
			continue
		}
		out = append(out, s)
	}
	return out
}

// range fits inside
func fits(allowed []span, from, to time.Time) bool {
	for _, s := range allowed {
		if !from.Before(s.from) && !to.After(s.to) {
			return true
		}
	}
	return false
}

func toPeriods(spans []span) []Period {
	out := make([]Period, 0, len(spans))
	for _, s := range spans {
		out = append(out, Period{From: s.from.Format(dayFormat), To: s.to.Format(dayFormat)})
	}
	return out
}

type periodStore struct{ db *gorm.DB }

func (s periodStore) list(subjectType string, ids ...string) (map[string][]Period, error) {
	var rows []PeriodGrant
	q := s.db.Where("subject_type = ?", subjectType)
	if len(ids) > 0 {
		q = q.Where("subject_id IN ?", ids)
	}
	if err := q.Order("date_from, date_to").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := map[string][]Period{}
	for _, g := range rows {
		out[g.SubjectID] = append(out[g.SubjectID], Period{From: g.DateFrom.Format(dayFormat), To: g.DateTo.Format(dayFormat)})
	}
	return out, nil
}

func (s periodStore) replace(subjectType, subjectID string, periods []Period) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("subject_type = ? AND subject_id = ?", subjectType, subjectID).Delete(&PeriodGrant{}).Error; err != nil {
			return err
		}
		for _, p := range periods {
			sp, err := parsePeriod(p)
			if err != nil {
				return err
			}
			row := PeriodGrant{SubjectType: subjectType, SubjectID: subjectID, DateFrom: sp.from, DateTo: sp.to}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// direct and inherited
func (s *Service) PeriodsForUser(ctx context.Context, userID string) (UserPeriods, error) {
	out := UserPeriods{Direct: []Period{}, Groups: []GroupPeriods{}, Effective: []Period{}}
	direct, err := s.periods.list(SubjectUser, userID)
	if err != nil {
		return out, err
	}
	out.Direct = append(out.Direct, direct[userID]...)
	all := append([]Period{}, out.Direct...)
	groups, err := s.userGroups(ctx, userID)
	if err != nil {
		return out, err
	}
	if len(groups) > 0 {
		ids := make([]string, 0, len(groups))
		for _, g := range groups {
			ids = append(ids, g.ID)
		}
		byGroup, err := s.periods.list(SubjectGroup, ids...)
		if err != nil {
			return out, err
		}
		for _, g := range groups {
			if ps := byGroup[g.ID]; len(ps) > 0 {
				out.Groups = append(out.Groups, GroupPeriods{GroupID: g.ID, GroupName: g.Name, Periods: ps})
				all = append(all, ps...)
			}
		}
	}
	out.Effective = toPeriods(merge(all))
	out.Restricted = len(out.Effective) > 0
	return out, nil
}

func (s *Service) periodScope(ctx context.Context, userID, accessLevel string) ([]span, error) {
	if accessLevel == constants.AccessLevelExpert {
		return nil, nil
	}
	up, err := s.PeriodsForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return merge(up.Effective), nil
}

func (s *Service) PeriodGrants(subjectType string) (map[string][]Period, error) {
	return s.periods.list(subjectType)
}

func (s *Service) GroupPeriodGrants(groupID string) ([]Period, error) {
	m, err := s.periods.list(SubjectGroup, groupID)
	if err != nil {
		return nil, err
	}
	if m[groupID] == nil {
		return []Period{}, nil
	}
	return m[groupID], nil
}

// scoped period update
func (s *Service) SetPeriods(ctx context.Context, actorID, actorLevel, subjectType, subjectID string, periods []Period) error {
	for _, p := range periods {
		if _, err := parsePeriod(p); err != nil {
			return err
		}
	}
	periods = toPeriods(merge(periods))
	scope, err := s.periodScope(ctx, actorID, actorLevel)
	if err != nil {
		return err
	}
	// empty means always
	if len(scope) > 0 && len(periods) == 0 {
		if subjectType == SubjectGroup {
			return fmt.Errorf("%w: cannot remove all periods", ErrNotInScope)
		}
		up, err := s.PeriodsForUser(ctx, subjectID)
		if err != nil {
			return err
		}
		if len(up.Groups) == 0 {
			return fmt.Errorf("%w: cannot remove all periods", ErrNotInScope)
		}
	}
	if len(scope) > 0 {
		for _, p := range periods {
			sp, _ := parsePeriod(p)
			if !fits(scope, sp.from, sp.to) {
				return fmt.Errorf("%w: %s to %s", ErrNotInScope, p.From, p.To)
			}
		}
	}
	return s.periods.replace(subjectType, subjectID, periods)
}

// model dates check
func (s *Service) CheckModelPeriod(ctx context.Context, userID, accessLevel string, from, to time.Time) error {
	scope, err := s.periodScope(ctx, userID, accessLevel)
	if err != nil || len(scope) == 0 {
		return err
	}
	day := func(t time.Time) time.Time { return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC) }
	if !fits(scope, day(from), day(to)) {
		return ErrOutsidePeriod
	}
	return nil
}
