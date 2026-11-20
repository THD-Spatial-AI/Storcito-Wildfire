package services

import (
	"strings"
	"testing"
)

func TestRiskStylePalettes(t *testing.T) {
	def := riskStyleDefinitions[0]
	cb := buildRiskStyleSLD(def, def.name+"_cb", riskPalettes["_cb"])
	if !strings.Contains(cb, "<Name>"+def.name+"_cb</Name>") {
		t.Fatal("cb style name missing")
	}
	for _, color := range riskPalettes["_cb"] {
		if !strings.Contains(cb, color) {
			t.Fatalf("cb color %s missing", color)
		}
	}
	// default palette unchanged
	plain := buildRiskStyleSLD(def, def.name, riskPalettes[""])
	if !strings.Contains(plain, "#dc2626") || strings.Contains(plain, "#7f2704") {
		t.Fatal("default palette changed")
	}
}
