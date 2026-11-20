package areas

import (
	"fmt"
	"regexp"
	"sort"
	"time"

	"gorm.io/gorm"
)

const (
	SubjectUser  = "user"
	SubjectGroup = "group"

	LevelCommunity    = "community"
	LevelProvince     = "province"
	LevelMunicipality = "municipality"
)

// engine ine codes
var codePatterns = map[string]*regexp.Regexp{
	LevelCommunity:    regexp.MustCompile(`^\d{2}$`),
	LevelProvince:     regexp.MustCompile(`^\d{2}$`),
	LevelMunicipality: regexp.MustCompile(`^\d{5}$`),
}

// one granted area
type Ref struct {
	Level string `json:"level"`
	Code  string `json:"code"`
}

func (r Ref) key() string { return r.Level + ":" + r.Code }

// stored grant row
type Grant struct {
	ID          uint   `gorm:"primaryKey"`
	SubjectType string `gorm:"size:8;not null"`
	SubjectID   string `gorm:"size:64;not null"`
	Level       string `gorm:"size:16;not null"`
	Code        string `gorm:"size:16;not null"`
	CreatedAt   time.Time
}

func (Grant) TableName() string { return "area_grants" }

// checks level code
func Validate(refs []Ref) error {
	for _, r := range refs {
		p, ok := codePatterns[r.Level]
		if !ok {
			return fmt.Errorf("unknown area level %q", r.Level)
		}
		if !p.MatchString(r.Code) {
			return fmt.Errorf("invalid %s code %q", r.Level, r.Code)
		}
	}
	return nil
}

// sorted unique refs
func normalize(refs []Ref) []Ref {
	seen := map[string]bool{}
	out := make([]Ref, 0, len(refs))
	for _, r := range refs {
		if !seen[r.key()] {
			seen[r.key()] = true
			out = append(out, r)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].key() < out[j].key() })
	return out
}

type grantStore struct{ db *gorm.DB }

func (s grantStore) list(subjectType string, ids ...string) (map[string][]Ref, error) {
	var rows []Grant
	q := s.db.Where("subject_type = ?", subjectType)
	if len(ids) > 0 {
		q = q.Where("subject_id IN ?", ids)
	}
	if err := q.Order("level, code").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := map[string][]Ref{}
	for _, g := range rows {
		out[g.SubjectID] = append(out[g.SubjectID], Ref{Level: g.Level, Code: g.Code})
	}
	return out, nil
}

// replace subject grants
func (s grantStore) replace(subjectType, subjectID string, refs []Ref) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("subject_type = ? AND subject_id = ?", subjectType, subjectID).Delete(&Grant{}).Error; err != nil {
			return err
		}
		for _, r := range refs {
			row := Grant{SubjectType: subjectType, SubjectID: subjectID, Level: r.Level, Code: r.Code}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
