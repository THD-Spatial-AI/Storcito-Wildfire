// Package arch tests that each store only touches entities of its own domain (exceptions listed in allowedCrossDomain).
package arch

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"
)

const commonModelsPath = "platform.local/common/pkg/models"

// entityOwner maps each shared DB entity to the domain that owns it.
var entityOwner = map[string]string{
	"Model":              "model",
	"ModelShare":         "model",
	"ModelResult":        "result",
	"Workspace":          "workspace",
	"WorkspaceMember":    "workspace",
	"WorkspaceGroup":     "workspace",
	"Group":              "group",
	"GroupMember":        "group",
	"Feedback":           "feedback",
	"UserSetting":        "settings",
	"WebserviceInstance": "compute_engine",
}

// storeDomain maps an internal/store/<dir> package to its domain.
var storeDomain = map[string]string{
	"model":          "model",
	"result":         "result",
	"feedback":       "feedback",
	"settings":       "settings",
	"notification":   "notification",
	"users":          "users",
	"compute_engine": "compute_engine",
	"apitoken":       "apitoken",
}

// allowedCrossDomain lists the accepted cross-domain reads with a short reason.
var allowedCrossDomain = map[string]map[string]string{
	// Model store reads workspace data for access checks.
	"model": {
		"Workspace":       "access checks: model belongs to a workspace",
		"WorkspaceMember": "access checks: workspace membership",
		"WorkspaceGroup":  "access checks: workspace groups",
	},
	// Result store joins to the parent model and checks group membership.
	"result": {
		"Model":       "join result → owning model",
		"GroupMember": "access checks: group membership",
	},
	// Settings store reads Model for usage limits.
	"settings": {
		"Model": "usage/limit accounting",
	},
}

func storeRoot(t *testing.T) string {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve caller path")
	}
	// .../internal/arch/boundaries_test.go -> .../internal/store
	return filepath.Join(filepath.Dir(filepath.Dir(thisFile)), "store")
}

// parsePackage returns the entity references and imports of a store package.
func parsePackage(t *testing.T, dir string) (entities map[string]bool, imports map[string]bool) {
	entities = map[string]bool{}
	imports = map[string]bool{}
	fset := token.NewFileSet()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read dir %s: %v", dir, err)
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".go") || strings.HasSuffix(e.Name(), "_test.go") {
			continue
		}
		f, err := parser.ParseFile(fset, filepath.Join(dir, e.Name()), nil, parser.SkipObjectResolution)
		if err != nil {
			t.Fatalf("parse %s: %v", e.Name(), err)
		}
		alias := ""
		for _, imp := range f.Imports {
			path := strings.Trim(imp.Path.Value, `"`)
			imports[path] = true
			if path == commonModelsPath {
				if imp.Name != nil {
					alias = imp.Name.Name
				} else {
					alias = "models"
				}
			}
		}
		if alias == "" {
			continue
		}
		ast.Inspect(f, func(n ast.Node) bool {
			sel, ok := n.(*ast.SelectorExpr)
			if !ok {
				return true
			}
			id, ok := sel.X.(*ast.Ident)
			if !ok || id.Name != alias {
				return true
			}
			if _, isEntity := entityOwner[sel.Sel.Name]; isEntity {
				entities[sel.Sel.Name] = true
			}
			return true
		})
	}
	return entities, imports
}

func TestStoreDomainBoundaries(t *testing.T) {
	root := storeRoot(t)
	dirs, err := os.ReadDir(root)
	if err != nil {
		t.Fatalf("read store root: %v", err)
	}

	var violations []string
	for _, d := range dirs {
		if !d.IsDir() {
			continue
		}
		pkg := d.Name()
		domain, known := storeDomain[pkg]
		if !known {
			t.Fatalf("store package %q has no declared domain; add it to storeDomain", pkg)
		}
		entities, imports := parsePackage(t, filepath.Join(root, pkg))

		// Rule 1: no store → store imports.
		for path := range imports {
			if strings.Contains(path, "/internal/store/") && !strings.HasSuffix(path, "/store/"+pkg) {
				violations = append(violations, pkg+" imports another store package: "+path+
					" (cross-domain access must go through a service interface)")
			}
		}

		// Rule 2: entities referenced must be owned by this domain or explicitly allowed.
		for entity := range entities {
			owner := entityOwner[entity]
			if owner == domain {
				continue
			}
			if _, allowed := allowedCrossDomain[domain][entity]; allowed {
				continue
			}
			violations = append(violations, pkg+" store references foreign entity "+entity+
				" (owned by '"+owner+"'); refactor behind a service interface or justify in allowedCrossDomain")
		}
	}

	if len(violations) > 0 {
		sort.Strings(violations)
		t.Fatalf("domain boundary violations:\n  - %s", strings.Join(violations, "\n  - "))
	}
}
