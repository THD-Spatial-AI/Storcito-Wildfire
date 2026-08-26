package resultservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	commonModels "platform.local/common/pkg/models"
)

const (
	rasterOverviewMinBytes       int64 = 16 * 1024 * 1024
	rasterOverviewCommandTimeout       = 2 * time.Minute
)

var rasterOverviewLevels = []string{"2", "4", "8", "16", "32", "64", "128"}

func (s *ResultService) PrepareRasterOverviews(ctx context.Context, result *commonModels.ModelResult) error {
	rasterPaths, decodeErr := rasterPathsForResult(result)
	return errors.Join(decodeErr, prepareRasterOverviews(ctx, rasterPaths))
}

func rasterPathsForResult(result *commonModels.ModelResult) ([]string, error) {
	if result == nil {
		return nil, nil
	}

	rasterPaths := make([]string, 0, 1)
	if result.TifFilePath != "" {
		rasterPaths = append(rasterPaths, result.TifFilePath)
	}

	var decodeErr error
	if len(result.Layers) > 0 {
		var layers []commonModels.ResultLayer
		if err := json.Unmarshal(result.Layers, &layers); err != nil {
			decodeErr = fmt.Errorf("decode published result layers: %w", err)
		} else {
			for _, layer := range layers {
				rasterPaths = append(rasterPaths, layer.FilePath)
			}
		}
	}

	return rasterPaths, decodeErr
}

func prepareRasterOverviews(ctx context.Context, rasterPaths []string) error {
	if len(rasterPaths) == 0 {
		return nil
	}

	gdaladdo, err := exec.LookPath("gdaladdo")
	if err != nil {
		return fmt.Errorf("gdaladdo is unavailable: %w", err)
	}

	var failures []error
	seen := make(map[string]struct{}, len(rasterPaths))
	for _, rawPath := range rasterPaths {
		path := filepath.Clean(strings.TrimSpace(rawPath))
		if path == "." || path == "" {
			continue
		}
		if _, duplicate := seen[path]; duplicate {
			continue
		}
		seen[path] = struct{}{}

		needsBuild, statErr := rasterNeedsExternalOverviews(path)
		if statErr != nil {
			failures = append(failures, fmt.Errorf("inspect %s: %w", path, statErr))
			continue
		}
		if !needsBuild {
			continue
		}

		args := []string{
			"--config", "COMPRESS_OVERVIEW", "DEFLATE",
			"--config", "BIGTIFF_OVERVIEW", "IF_SAFER",
			"-ro",
			"-r", "nearest",
			path,
		}
		args = append(args, rasterOverviewLevels...)

		commandCtx, cancelCommand := context.WithTimeout(ctx, rasterOverviewCommandTimeout)
		output, commandErr := exec.CommandContext(commandCtx, gdaladdo, args...).CombinedOutput()
		commandContextErr := commandCtx.Err()
		cancelCommand()
		if commandErr != nil {
			message := strings.TrimSpace(string(output))
			if len(message) > 1024 {
				message = message[:1024]
			}
			if errors.Is(commandContextErr, context.DeadlineExceeded) {
				failures = append(
					failures,
					fmt.Errorf("build overviews for %s timed out after %s: %w (%s)", path, rasterOverviewCommandTimeout, commandErr, message),
				)
			} else {
				failures = append(
					failures,
					fmt.Errorf("build overviews for %s: %w (%s)", path, commandErr, message),
				)
			}
		}

		if ctx.Err() != nil {
			failures = append(failures, ctx.Err())
			break
		}
	}

	return errors.Join(failures...)
}

func rasterNeedsExternalOverviews(path string) (bool, error) {
	info, err := os.Stat(path)
	if err != nil {
		return false, err
	}
	if !info.Mode().IsRegular() || info.Size() < rasterOverviewMinBytes {
		return false, nil
	}

	overviewInfo, err := os.Stat(path + ".ovr")
	if err == nil {
		return overviewInfo.Size() == 0 || overviewInfo.ModTime().Before(info.ModTime()), nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return false, err
	}
	return true, nil
}

// NeedsRasterOverviews reports whether any published raster for the result is
// still missing an up-to-date overview pyramid. A batch that ran out of time
// leaves some rasters done and others not, and the GeoServer status cannot
// distinguish the two, so callers use this to decide whether to resume.
func (s *ResultService) NeedsRasterOverviews(result *commonModels.ModelResult) bool {
	rasterPaths, _ := rasterPathsForResult(result)
	for _, rawPath := range rasterPaths {
		path := filepath.Clean(strings.TrimSpace(rawPath))
		if path == "." || path == "" {
			continue
		}
		// An unreadable raster is reported by prepareRasterOverviews; treating
		// it as "not needed" here keeps this a pure scheduling question.
		if needsBuild, err := rasterNeedsExternalOverviews(path); err == nil && needsBuild {
			return true
		}
	}
	return false
}
