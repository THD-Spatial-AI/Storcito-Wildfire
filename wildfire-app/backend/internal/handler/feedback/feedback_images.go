package feedback

import (
	"encoding/json"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"platform.local/common/pkg/constants"
	"platform.local/common/pkg/httputil"
	"spatialhub_backend/internal/api/contracts"

	"github.com/gin-gonic/gin"
)

const (
	feedbackImagesDir = "feedback_images"
	maxImageSize      = 15 * 1024 * 1024 // 15MB
)

var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
	"image/bmp":  ".bmp",
	"image/tiff": ".tiff",
}

type imageInfo struct {
	Path     string `json:"path"`
	MimeType string `json:"mime_type"`
	Size     int64  `json:"size"`
}

func collectImageFileHeaders(c *gin.Context) []*multipart.FileHeader {
	form, _ := c.MultipartForm()
	var fileHeaders []*multipart.FileHeader
	if form != nil {
		fileHeaders = append(fileHeaders, form.File["image"]...)
		fileHeaders = append(fileHeaders, form.File["images"]...)
	}
	return fileHeaders
}

func validateImageUploads(c *gin.Context, fileHeaders []*multipart.FileHeader) bool {
	for _, fh := range fileHeaders {
		if fh.Size > maxImageSize {
			httputil.BadRequest(c, fmt.Sprintf("Image %q exceeds 15MB limit", fh.Filename))
			return false
		}
		ct := fh.Header.Get("Content-Type")
		if _, ok := allowedImageTypes[ct]; !ok {
			httputil.BadRequest(c, fmt.Sprintf("Image %q has invalid type. Allowed: jpeg, png, gif, webp", fh.Filename))
			return false
		}
	}
	return true
}

func (h *FeedbackHandler) buildImageUpdate(c *gin.Context, fileHeaders []*multipart.FileHeader, feedbackID uint) contracts.FeedbackUpdate {
	var savedImages []imageInfo
	for _, fh := range fileHeaders {
		ct := fh.Header.Get("Content-Type")
		ext := allowedImageTypes[ct]
		imagePath, err := h.saveImage(c, fh, feedbackID, ext)
		if err != nil {
			continue // skip failed saves
		}
		savedImages = append(savedImages, imageInfo{Path: imagePath, MimeType: ct, Size: fh.Size})
	}

	imageUpdate := contracts.FeedbackUpdate{}
	if len(savedImages) > 0 {
		first := savedImages[0]
		imageUpdate.ImagePath = &first.Path
		imageUpdate.ImageMimeType = &first.MimeType
		imageUpdate.ImageSize = &first.Size
	}
	if imagesJSON, err := json.Marshal(savedImages); err == nil {
		images := string(imagesJSON)
		imageUpdate.Images = &images
	}
	return imageUpdate
}

// saveImage saves the uploaded image to disk and returns the relative path
func (h *FeedbackHandler) saveImage(c *gin.Context, fileHeader *multipart.FileHeader, feedbackID uint, ext string) (string, error) {
	imagesDir := filepath.Join(constants.StorageDataDir, feedbackImagesDir)
	if err := os.MkdirAll(imagesDir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create images directory: %w", err)
	}

	filename := fmt.Sprintf("%d_%d%s", feedbackID, time.Now().UnixNano(), ext)
	fullPath := filepath.Join(imagesDir, filename)

	if err := c.SaveUploadedFile(fileHeader, fullPath); err != nil {
		return "", fmt.Errorf("failed to save image: %w", err)
	}

	return filepath.Join(feedbackImagesDir, filename), nil
}

// GetFeedbackImage serves the image attached to a feedback
func (h *FeedbackHandler) GetFeedbackImage(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	id, ok := httputil.ParseUintParam(c, "id", errInvalidFeedbackID)
	if !ok {
		return
	}

	feedback, err := h.feedbackStore.GetFeedbackByID(id)
	if err != nil {
		httputil.HandleError(c, err)
		return
	}

	isOwner := feedback.UserID == userCtx.UserID
	isAdmin := httputil.IsExpertAccess(userCtx.AccessLevel)
	if !isOwner && !isAdmin {
		httputil.Forbidden(c, "Access denied")
		return
	}

	if feedback.ImagePath == nil || *feedback.ImagePath == "" {
		httputil.NotFound(c, "No image found for this feedback")
		return
	}

	fullPath := filepath.Join(constants.StorageDataDir, *feedback.ImagePath)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		httputil.NotFound(c, "Image file not found")
		return
	}

	if feedback.ImageMimeType != nil && *feedback.ImageMimeType != "" {
		c.Header("Content-Type", *feedback.ImageMimeType)
	}

	c.File(fullPath)
}

// GetFeedbackImageByIndex serves a specific image from the images JSON array
func (h *FeedbackHandler) GetFeedbackImageByIndex(c *gin.Context) {
	userCtx, ok := httputil.GetUserContext(c)
	if !ok {
		return
	}

	id, ok := httputil.ParseUintParam(c, "id", errInvalidFeedbackID)
	if !ok {
		return
	}

	indexStr := c.Param("index")
	index, err := strconv.Atoi(indexStr)
	if err != nil || index < 0 {
		httputil.BadRequest(c, "Invalid image index")
		return
	}

	fb, err := h.feedbackStore.GetFeedbackByID(id)
	if err != nil {
		httputil.HandleError(c, err)
		return
	}

	isOwner := fb.UserID == userCtx.UserID
	isAdmin := httputil.IsExpertAccess(userCtx.AccessLevel)
	if !isOwner && !isAdmin {
		httputil.Forbidden(c, "Access denied")
		return
	}

	if fb.Images == nil || *fb.Images == "" {
		httputil.NotFound(c, "No images found for this feedback")
		return
	}

	var images []imageInfo
	if err := json.Unmarshal([]byte(*fb.Images), &images); err != nil || index >= len(images) {
		httputil.NotFound(c, "Image not found")
		return
	}

	img := images[index]
	fullPath := filepath.Join(constants.StorageDataDir, img.Path)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		httputil.NotFound(c, "Image file not found")
		return
	}

	if img.MimeType != "" {
		c.Header("Content-Type", img.MimeType)
	}
	c.File(fullPath)
}
