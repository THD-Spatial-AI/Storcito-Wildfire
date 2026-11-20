package result

import (
	"archive/zip"
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTryDownloadStoredZip_ServesEngineArchive(t *testing.T) {
	zipPath := filepath.Join(t.TempDir(), "20260712T141048Z_53b123b6.zip")
	require.NoError(t, os.WriteFile(zipPath, []byte("zipdata"), 0o644))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	h := &ResultHandler{}
	assert.True(t, h.tryDownloadStoredZip(c, "42", zipPath))
	assert.Equal(t, "zipdata", w.Body.String())
	assert.Contains(t, w.Header().Get("Content-Disposition"), "sim_42.zip")
}

func TestTryDownloadStoredZip_MissingFile(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	h := &ResultHandler{}
	assert.False(t, h.tryDownloadStoredZip(c, "42", ""))
	assert.False(t, h.tryDownloadStoredZip(c, "42", filepath.Join(t.TempDir(), "gone.zip")))
}

func TestTryDownloadExtractedDir_ZipsResultFolder(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "layers"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "forest_fire_risk_map.tif"), []byte("tif"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "layers", "ndvi.tif"), []byte("ndvi"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "layers", "ndvi.tif.aux.xml"), []byte("x"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "old.zip"), []byte("z"), 0o644))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	h := &ResultHandler{}
	require.True(t, h.tryDownloadExtractedDir(c, "287", dir))
	assert.Contains(t, w.Header().Get("Content-Disposition"), "sim_287.zip")

	zr, err := zip.NewReader(bytes.NewReader(w.Body.Bytes()), int64(w.Body.Len()))
	require.NoError(t, err)
	var names []string
	for _, f := range zr.File {
		names = append(names, f.Name)
	}
	assert.ElementsMatch(t, []string{"forest_fire_risk_map.tif", "layers/ndvi.tif"}, names)
}

func TestTryDownloadExtractedDir_MissingDir(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	h := &ResultHandler{}
	assert.False(t, h.tryDownloadExtractedDir(c, "287", ""))
	assert.False(t, h.tryDownloadExtractedDir(c, "287", filepath.Join(t.TempDir(), "gone")))
}
