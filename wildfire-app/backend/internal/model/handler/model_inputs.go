package model

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
)

// modelInputsSubdir holds per-model user uploads (station data + DTM).
const modelInputsSubdir = "user_inputs"

var (
	allowedStationExt = map[string]bool{".xlsx": true, ".xls": true, ".csv": true, ".txt": true}
	allowedDtmExt     = map[string]bool{".tif": true, ".tiff": true}
	inputAllowedExt   = map[string]map[string]bool{
		"station_data": allowedStationExt,
		"dtm":          allowedDtmExt,
	}
)

// UploadModelInputs stores optional per-model input files (POST /models/:id/inputs).
func (h *ModelHandler) UploadModelInputs(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	model, _, ok := h.getEditableModelFromParam(c, userCtx.UserID)
	if !ok {
		return
	}

	dir := modelInputsDir(model.ID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		httputil.InternalError(c, "Failed to prepare upload directory")
		return
	}

	saved := make(map[string]string, 2)
	for kind, allowed := range inputAllowedExt {
		name, err := saveModelInputFile(c, kind, dir, allowed)
		if err != nil {
			httputil.BadRequest(c, err.Error())
			return
		}
		if name != "" {
			saved[kind] = name
		}
	}

	if len(saved) == 0 {
		httputil.BadRequest(c, "No input files provided")
		return
	}

	if err := h.recordModelInputs(model.ID, saved); err != nil {
		httputil.InternalError(c, "Failed to record uploaded inputs")
		return
	}

	httputil.SuccessResponse(c, gin.H{"uploaded": saved})
}

func (h *ModelHandler) GetModelInput(c *gin.Context) {
	id := c.Param("id")
	kind := c.Param("kind")
	if _, ok := inputAllowedExt[kind]; !ok {
		httputil.BadRequest(c, "Unknown input kind")
		return
	}

	model, ok := h.fetchModel(c, id)
	if !ok {
		return
	}

	inputs := modelInputConfig(model.Config)
	if filename, ok := inputs[kind]; ok && filename != "" {
		target := filepath.Join(modelInputsDir(model.ID), filename)
		if _, err := os.Stat(target); err == nil {
			c.File(target)
			return
		}
	}
	httputil.NotFound(c, "Requested input file not found")
}

func (h *ModelHandler) recordModelInputs(modelID uint, saved map[string]string) error {
	model, err := h.store.FindByID(fmt.Sprintf("%d", modelID))
	if err != nil {
		return err
	}

	config := map[string]any{}
	if len(model.Config) > 0 {
		_ = json.Unmarshal(model.Config, &config)
	}
	existing := map[string]string{}
	if rawExisting, ok := config["user_inputs"].(map[string]any); ok {
		for kind, filename := range rawExisting {
			if filenameString, ok := filename.(string); ok && filenameString != "" {
				existing[kind] = filenameString
			}
		}
	}
	for kind, filename := range saved {
		existing[kind] = filename
	}
	config["user_inputs"] = existing

	encoded, err := json.Marshal(config)
	if err != nil {
		return err
	}
	return h.store.Update(model, map[string]any{"config": datatypes.JSON(encoded)})
}

func modelInputsDir(modelID uint) string {
	return filepath.Join(constants.StorageDataDir, modelInputsSubdir, fmt.Sprintf("model_%d", modelID))
}

func saveModelInputFile(c *gin.Context, field, dir string, allowedExt map[string]bool) (string, error) {
	fileHeader, err := c.FormFile(field)
	if err != nil {
		return "", nil
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedExt[ext] {
		return "", fmt.Errorf("unsupported file type for %s: %s", field, ext)
	}

	name := field + ext
	for oldExt := range allowedExt {
		_ = os.Remove(filepath.Join(dir, field+oldExt))
	}
	if err := c.SaveUploadedFile(fileHeader, filepath.Join(dir, name)); err != nil {
		return "", fmt.Errorf("failed to save %s", field)
	}
	return name, nil
}

func modelInputConfig(rawConfig datatypes.JSON) map[string]string {
	config := map[string]any{}
	if len(rawConfig) > 0 {
		_ = json.Unmarshal(rawConfig, &config)
	}
	rawInputs, ok := config["user_inputs"].(map[string]any)
	if !ok {
		return nil
	}
	inputs := make(map[string]string, len(rawInputs))
	for kind, filename := range rawInputs {
		if filenameString, ok := filename.(string); ok && filenameString != "" {
			inputs[kind] = filenameString
		}
	}
	return inputs
}
