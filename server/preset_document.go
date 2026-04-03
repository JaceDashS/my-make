package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

var teacherPresetCategories = []string{
	"base_foundation",
	"blush",
	"lip_color",
	"eyeshadow",
	"contour",
	"highlighter",
	"etc",
}

type teacherPresetDocument struct {
	Version int                 `json:"version"`
	Presets []teacherPresetItem `json:"presets"`
}

type teacherPresetItem struct {
	ID        any                                     `json:"id"`
	Name      string                                  `json:"name"`
	CreatedAt string                                  `json:"createdAt"`
	UpdatedAt string                                  `json:"updatedAt"`
	Note      string                                  `json:"note"`
	Items     map[string]teacherPresetCategoryItemSet `json:"items"`
}

type teacherPresetSummary struct {
	ID    string
	Items map[string][]string
	Name  string
	Note  string
}

type teacherPresetCategoryItemSet []teacherPresetCategoryItem

type teacherPresetCategoryItem struct {
	Source   string  `json:"source"`
	SKU      *string `json:"sku"`
	ItemName string  `json:"itemName"`
	ImageURL *string `json:"imageUrl"`
}

func (items *teacherPresetCategoryItemSet) UnmarshalJSON(data []byte) error {
	trimmed := bytes.TrimSpace(data)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		*items = nil
		return nil
	}

	var legacySKUs []string
	if err := json.Unmarshal(trimmed, &legacySKUs); err == nil {
		nextItems := make([]teacherPresetCategoryItem, 0, len(legacySKUs))
		for _, sku := range legacySKUs {
			trimmedSKU := strings.TrimSpace(sku)
			nextItems = append(nextItems, teacherPresetCategoryItem{
				Source:   "inventory",
				SKU:      stringPointer(trimmedSKU),
				ItemName: trimmedSKU,
			})
		}
		*items = nextItems
		return nil
	}

	var nextItems []teacherPresetCategoryItem
	if err := json.Unmarshal(trimmed, &nextItems); err != nil {
		return err
	}
	*items = nextItems
	return nil
}

func parseTeacherPresetDocument(value string) (teacherPresetDocument, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" || trimmed == "-" {
		return teacherPresetDocument{}, nil
	}

	decoder := json.NewDecoder(strings.NewReader(trimmed))
	decoder.UseNumber()

	var document teacherPresetDocument
	if err := decoder.Decode(&document); err != nil {
		return teacherPresetDocument{}, fmt.Errorf("Please provide a valid preset document.")
	}
	if err := validateTeacherPresetDocument(document); err != nil {
		return teacherPresetDocument{}, err
	}

	return document, nil
}

func validateTeacherPresetDocument(document teacherPresetDocument) error {
	if document.Version <= 0 {
		return fmt.Errorf("Preset version is required.")
	}
	if document.Presets == nil {
		return fmt.Errorf("Preset presets array is required.")
	}

	seenIDs := make(map[string]struct{}, len(document.Presets))
	for index, preset := range document.Presets {
		presetID, ok := normalizeTeacherPresetID(preset.ID)
		if !ok {
			return fmt.Errorf("Preset %d must include a valid id.", index+1)
		}
		if _, exists := seenIDs[presetID]; exists {
			return fmt.Errorf("Preset id %s must be unique.", presetID)
		}
		seenIDs[presetID] = struct{}{}

		if strings.TrimSpace(preset.Name) == "" {
			return fmt.Errorf("Preset %s must include a name.", presetID)
		}
		if strings.TrimSpace(preset.CreatedAt) == "" {
			return fmt.Errorf("Preset %s must include createdAt.", presetID)
		}
		if strings.TrimSpace(preset.UpdatedAt) == "" {
			return fmt.Errorf("Preset %s must include updatedAt.", presetID)
		}
		if preset.Items == nil {
			return fmt.Errorf("Preset %s must include items.", presetID)
		}

		for _, category := range teacherPresetCategories {
			if _, exists := preset.Items[category]; !exists {
				return fmt.Errorf("Preset %s must include category %s.", presetID, category)
			}
		}
		for category, skuList := range preset.Items {
			if !isTeacherPresetCategory(category) {
				return fmt.Errorf("Preset %s contains an unknown category %s.", presetID, category)
			}
			if skuList != nil && len(skuList) == 0 {
				return fmt.Errorf("Preset %s category %s must use null instead of an empty array.", presetID, category)
			}
			for itemIndex, item := range skuList {
				source := strings.TrimSpace(item.Source)
				if source == "" {
					source = "inventory"
				}
				if source != "inventory" && source != "manual" {
					return fmt.Errorf("Preset %s category %s contains an unsupported source.", presetID, category)
				}
				if strings.TrimSpace(item.ItemName) == "" {
					return fmt.Errorf("Preset %s category %s item %d must include itemName.", presetID, category, itemIndex+1)
				}
				if source == "inventory" {
					if item.SKU == nil || strings.TrimSpace(*item.SKU) == "" {
						return fmt.Errorf("Preset %s category %s item %d must include sku.", presetID, category, itemIndex+1)
					}
				}
			}
		}
	}

	return nil
}

func firstTeacherPresetID(value string) string {
	document, err := parseTeacherPresetDocument(value)
	if err != nil || len(document.Presets) == 0 {
		return ""
	}
	presetID, _ := normalizeTeacherPresetID(document.Presets[0].ID)
	return presetID
}

func teacherPresetDocumentHasID(value string, targetPresetID string) bool {
	document, err := parseTeacherPresetDocument(value)
	if err != nil {
		return false
	}

	trimmedTarget := strings.TrimSpace(targetPresetID)
	if trimmedTarget == "" {
		return false
	}

	for _, preset := range document.Presets {
		presetID, ok := normalizeTeacherPresetID(preset.ID)
		if ok && presetID == trimmedTarget {
			return true
		}
	}

	return false
}

func findTeacherPresetSummary(value string, targetPresetID string) (teacherPresetSummary, bool) {
	document, err := parseTeacherPresetDocument(value)
	if err != nil {
		return teacherPresetSummary{}, false
	}

	trimmedTarget := strings.TrimSpace(targetPresetID)
	if trimmedTarget == "" {
		return teacherPresetSummary{}, false
	}

	for _, preset := range document.Presets {
		presetID, ok := normalizeTeacherPresetID(preset.ID)
		if !ok || presetID != trimmedTarget {
			continue
		}

		return teacherPresetSummary{
			ID:    presetID,
			Items: normalizeTeacherPresetSummaryItems(preset.Items),
			Name:  strings.TrimSpace(preset.Name),
			Note:  strings.TrimSpace(preset.Note),
		}, true
	}

	return teacherPresetSummary{}, false
}

func normalizeTeacherPresetSummaryItems(value map[string]teacherPresetCategoryItemSet) map[string][]string {
	if len(value) == 0 {
		return nil
	}

	normalized := make(map[string][]string, len(teacherPresetCategories))
	for _, category := range teacherPresetCategories {
		rawItems, exists := value[category]
		if !exists || len(rawItems) == 0 {
			continue
		}

		items := make([]string, 0, len(rawItems))
		for _, item := range rawItems {
			if item.SKU == nil {
				continue
			}
			trimmed := strings.TrimSpace(*item.SKU)
			if trimmed == "" {
				continue
			}
			items = append(items, trimmed)
		}
		if len(items) > 0 {
			normalized[category] = items
		}
	}

	if len(normalized) == 0 {
		return nil
	}

	return normalized
}

func normalizeTeacherPresetID(value any) (string, bool) {
	switch typed := value.(type) {
	case nil:
		return "", false
	case string:
		trimmed := strings.TrimSpace(typed)
		return trimmed, trimmed != ""
	case json.Number:
		return strings.TrimSpace(typed.String()), strings.TrimSpace(typed.String()) != ""
	case float64:
		if typed == float64(int64(typed)) {
			return strconv.FormatInt(int64(typed), 10), true
		}
		return strconv.FormatFloat(typed, 'f', -1, 64), true
	default:
		raw, err := json.Marshal(typed)
		if err != nil {
			return "", false
		}
		raw = bytes.TrimSpace(raw)
		if len(raw) == 0 || bytes.Equal(raw, []byte("null")) {
			return "", false
		}
		if raw[0] == '"' {
			var asString string
			if err := json.Unmarshal(raw, &asString); err == nil {
				asString = strings.TrimSpace(asString)
				return asString, asString != ""
			}
		}
		return string(raw), true
	}
}

func isTeacherPresetCategory(value string) bool {
	for _, category := range teacherPresetCategories {
		if value == category {
			return true
		}
	}
	return false
}

func stringPointer(value string) *string {
	return &value
}
