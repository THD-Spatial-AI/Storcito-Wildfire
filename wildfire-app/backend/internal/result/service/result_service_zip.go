package resultservice

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	commonModels "platform.local/common/pkg/models"
	"platform.local/common/pkg/utils"
)

// layerTitles maps STORCITO layer keys to human-friendly titles shown in
// the frontend layer switcher.
var layerTitles = map[string]string{
	"ndvi":   "Vegetation (NDVI)",
	"ftm":    "Fuel Type",
	"meteo":  "Fire Weather Index",
	"mdt":    "Elevation",
	"slope":  "Slope",
	"aspect": "Aspect",
	"infra":  "Infrastructure",
	"wui":    "Wildland-Urban Interface",
	"fhist":  "Fire History",
}

// findResultLayers discovers the component rasters in <extractDir>/layers/
// (vegetation, FWI, etc.) that share the same 0–5 risk scale as the main
// map and can be published as additional WMS layers.
func findResultLayers(extractDir string) []commonModels.ResultLayer {
	layersDir := filepath.Join(extractDir, "layers")
	entries, err := os.ReadDir(layersDir)
	if err != nil {
		return nil
	}

	var out []commonModels.ResultLayer
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		lower := strings.ToLower(e.Name())
		if !strings.HasSuffix(lower, ".tif") && !strings.HasSuffix(lower, ".tiff") {
			continue
		}
		key := strings.TrimSuffix(strings.TrimSuffix(lower, ".tiff"), ".tif")
		if key == "reference_mdt" { // internal alignment reference, not user-facing
			continue
		}
		fullPath := filepath.Join(layersDir, e.Name())
		if !rasterHasData(fullPath) { // skip empty layers (e.g. no fuel data over the AOI)
			continue
		}
		title := layerTitles[key]
		if title == "" {
			title = strings.ToUpper(key[:1]) + key[1:]
		}
		out = append(out, commonModels.ResultLayer{
			Key:      key,
			Title:    title,
			FilePath: fullPath,
		})
	}
	return out
}

func isRiskRasterFilename(name string) bool {
	lower := strings.ToLower(name)
	return strings.Contains(lower, "forest_fire_risk_map") ||
		strings.Contains(lower, "risk_map") ||
		strings.Contains(lower, "mapa_final")
}

// findTifFile returns the result raster used by ModelResult.TifFilePath.
// Risk-named rasters are preferred; the first .tif/.tiff is kept as a
// back-compat fallback for older simulation archives.
func findTifFile(extractDir string) (string, string) {
	var firstTif string
	var riskTif string
	_ = filepath.Walk(extractDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info == nil || info.IsDir() {
			return nil
		}
		base := info.Name()
		lower := strings.ToLower(base)
		if !(strings.HasSuffix(lower, ".tif") || strings.HasSuffix(lower, ".tiff")) {
			return nil
		}
		if firstTif == "" {
			firstTif = path
		}
		if riskTif == "" && isRiskRasterFilename(base) {
			riskTif = path
		}
		return nil
	})

	tifPath := riskTif
	if tifPath == "" {
		tifPath = firstTif
	}
	if tifPath == "" {
		return "", ""
	}
	return tifPath, filepath.Base(tifPath)
}

func (s *ResultService) extractZip(zipPath, destDir string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer func() { _ = r.Close() }()

	for _, f := range r.File {
		if f.FileInfo().IsDir() {
			continue
		}

		fpath, err := validateAndBuildPath(f, destDir)
		if err != nil {
			return err
		}

		if err := extractFile(f, fpath); err != nil {
			return err
		}
	}

	return nil
}

func validateAndBuildPath(f *zip.File, destDir string) (string, error) {
	// Remove leading slash
	name := strings.TrimPrefix(f.Name, "/")
	name = strings.TrimPrefix(name, "\\")
	return utils.SafeFilePath(name, destDir)
}

func extractFile(f *zip.File, fpath string) error {
	dirPath := filepath.Dir(fpath)

	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return err
	}

	if err := os.Chmod(dirPath, 0755); err != nil {
		return fmt.Errorf("failed to set directory permissions: %w", err)
	}

	outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer outFile.Close()

	rc, err := f.Open()
	if err != nil {
		return err
	}
	defer rc.Close()

	if _, err := io.Copy(outFile, rc); err != nil {
		_ = os.Remove(fpath)
		return err
	}

	if err := os.Chmod(fpath, 0644); err != nil {
		_ = os.Remove(fpath)
		return err
	}
	return nil
}
