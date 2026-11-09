package result

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"platform.local/common/pkg/constants"
	commonModels "platform.local/common/pkg/models"

	"github.com/gin-gonic/gin"
)

// Full engine archive
func (h *ResultHandler) tryDownloadStoredZip(c *gin.Context, modelID, zipPath string) bool {
	if zipPath == "" || !fileExists(zipPath) {
		return false
	}
	c.FileAttachment(zipPath, fmt.Sprintf("sim_%s.zip", modelID))
	return true
}

// Zip extracted dir
func (h *ResultHandler) tryDownloadExtractedDir(c *gin.Context, modelID, dir string) bool {
	if dir == "" {
		return false
	}
	if info, err := os.Stat(dir); err != nil || !info.IsDir() {
		return false
	}
	files, err := collectArchiveFiles(dir)
	if err != nil || len(files) == 0 {
		return false
	}

	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="sim_%s.zip"`, modelID))
	zw := zip.NewWriter(c.Writer)
	for _, rel := range files {
		if err := addFileToZip(zw, dir, rel); err != nil {
			_ = c.Error(err)
			break
		}
	}
	_ = zw.Close()
	return true
}

func collectArchiveFiles(dir string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !d.Type().IsRegular() {
			return nil
		}
		name := strings.ToLower(d.Name())
		// Skip archives, sidecars
		if strings.HasSuffix(name, ".zip") || strings.HasSuffix(name, ".aux.xml") {
			return nil
		}
		rel, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		files = append(files, filepath.ToSlash(rel))
		return nil
	})
	return files, err
}

func addFileToZip(zw *zip.Writer, dir, rel string) error {
	src, err := os.Open(filepath.Join(dir, filepath.FromSlash(rel)))
	if err != nil {
		return err
	}
	defer src.Close()
	w, err := zw.Create(rel)
	if err != nil {
		return err
	}
	_, err = io.Copy(w, src)
	return err
}

func (h *ResultHandler) tryDownloadFromTifPath(c *gin.Context, modelID, tifFilePath string) bool {
	if tifFilePath == "" {
		return false
	}

	modelDir := filepath.Dir(tifFilePath)
	zipFileName := fmt.Sprintf("sim_%s.zip", modelID)

	// Try in model directory
	if zipPath := filepath.Join(modelDir, zipFileName); fileExists(zipPath) {
		c.FileAttachment(zipPath, zipFileName)
		return true
	}

	// Try in parent directory
	if zipPath := filepath.Join(filepath.Dir(modelDir), zipFileName); fileExists(zipPath) {
		c.FileAttachment(zipPath, zipFileName)
		return true
	}

	return false
}

func (h *ResultHandler) tryDownloadFromStorageDir(c *gin.Context, modelID string) bool {
	entries, err := os.ReadDir(constants.StorageDataDir)
	if err != nil {
		return false
	}

	modelPrefix := fmt.Sprintf("model_%s_", modelID)
	for _, entry := range entries {
		if !entry.IsDir() || !strings.HasPrefix(entry.Name(), modelPrefix) {
			continue
		}

		modelDir := filepath.Join(constants.StorageDataDir, entry.Name())
		if h.tryDownloadZipFromDir(c, modelID, modelDir) {
			return true
		}
	}
	return false
}

func (h *ResultHandler) tryDownloadZipFromDir(c *gin.Context, modelID, modelDir string) bool {
	// Try exact match first
	zipFileName := fmt.Sprintf("sim_%s.zip", modelID)
	if zipPath := filepath.Join(modelDir, zipFileName); fileExists(zipPath) {
		c.FileAttachment(zipPath, zipFileName)
		return true
	}

	// Search for sim_{modelID}_*.zip files
	dirEntries, err := os.ReadDir(modelDir)
	if err != nil {
		return false
	}

	simPrefix := fmt.Sprintf("sim_%s_", modelID)
	for _, f := range dirEntries {
		if !f.IsDir() && strings.HasPrefix(f.Name(), simPrefix) && strings.HasSuffix(f.Name(), ".zip") {
			c.FileAttachment(filepath.Join(modelDir, f.Name()), f.Name())
			return true
		}
	}
	return false
}

func (h *ResultHandler) tryDownloadTifFile(c *gin.Context, result commonModels.ModelResult) bool {
	if result.TifFilePath != "" && fileExists(result.TifFilePath) {
		c.FileAttachment(result.TifFilePath, result.TifFileName)
		return true
	}
	return false
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
