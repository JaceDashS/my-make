package main

import "testing"

func TestParseTeacherPresetDocumentAcceptsDocumentShape(t *testing.T) {
	value := `{"version":2,"presets":[{"id":"1","name":"Soft Daily Coral","createdAt":"2026-04-02T09:00:00+09:00","updatedAt":"2026-04-02T09:00:00+09:00","note":"Daily coral tone preset for soft warm classes.","items":{"base_foundation":[{"source":"inventory","sku":"FND-001","itemName":"Soft Natural Foundation 01","imageUrl":"https://example.com/images/fnd-001.jpg"}],"blush":[{"source":"inventory","sku":"BLS-002","itemName":"Soft Peach Blush","imageUrl":"https://example.com/images/bls-002.jpg"},{"source":"manual","sku":null,"itemName":"Apricot Cream Blush Pot","imageUrl":"https://example.com/images/manual-apricot-cream-blush.jpg"}],"lip_color":[{"source":"inventory","sku":"LIP-014","itemName":"Muted Coral Lip","imageUrl":"https://example.com/images/lip-014.jpg"}],"eyeshadow":[{"source":"inventory","sku":"EYE-021","itemName":"Soft Brown Eyeshadow","imageUrl":"https://example.com/images/eye-021.jpg"}],"contour":[{"source":"inventory","sku":"CON-004","itemName":"Neutral Soft Contour","imageUrl":"https://example.com/images/con-004.jpg"}],"highlighter":[{"source":"inventory","sku":"HIL-003","itemName":"Soft Gold Highlighter","imageUrl":"https://example.com/images/hil-003.jpg"}],"etc":null}}]}`

	document, err := parseTeacherPresetDocument(value)
	if err != nil {
		t.Fatalf("expected valid preset document, got error: %v", err)
	}
	if document.Version != 2 {
		t.Fatalf("expected version 2, got %d", document.Version)
	}
	if len(document.Presets) != 1 {
		t.Fatalf("expected 1 preset, got %d", len(document.Presets))
	}
}

func TestParseTeacherPresetDocumentRejectsEmptyCategoryArray(t *testing.T) {
	value := `{"version":2,"presets":[{"id":"1","name":"Soft Daily Coral","createdAt":"2026-04-02T09:00:00+09:00","updatedAt":"2026-04-02T09:00:00+09:00","note":"Daily coral tone preset for soft warm classes.","items":{"base_foundation":[{"source":"inventory","sku":"FND-001","itemName":"Soft Natural Foundation 01","imageUrl":"https://example.com/images/fnd-001.jpg"}],"blush":[],"lip_color":[{"source":"inventory","sku":"LIP-014","itemName":"Muted Coral Lip","imageUrl":"https://example.com/images/lip-014.jpg"}],"eyeshadow":[{"source":"inventory","sku":"EYE-021","itemName":"Soft Brown Eyeshadow","imageUrl":"https://example.com/images/eye-021.jpg"}],"contour":[{"source":"inventory","sku":"CON-004","itemName":"Neutral Soft Contour","imageUrl":"https://example.com/images/con-004.jpg"}],"highlighter":[{"source":"inventory","sku":"HIL-003","itemName":"Soft Gold Highlighter","imageUrl":"https://example.com/images/hil-003.jpg"}],"etc":null}}]}`

	if _, err := parseTeacherPresetDocument(value); err == nil {
		t.Fatal("expected empty category array to be rejected")
	}
}

func TestFirstTeacherPresetIDReadsPresetBundle(t *testing.T) {
	value := `{"version":2,"presets":[{"id":1,"name":"Soft Daily Coral","createdAt":"2026-04-02T09:00:00+09:00","updatedAt":"2026-04-02T09:00:00+09:00","note":"Daily coral tone preset for soft warm classes.","items":{"base_foundation":[{"source":"inventory","sku":"FND-001","itemName":"Soft Natural Foundation 01","imageUrl":"https://example.com/images/fnd-001.jpg"}],"blush":[{"source":"inventory","sku":"BLS-002","itemName":"Soft Peach Blush","imageUrl":"https://example.com/images/bls-002.jpg"}],"lip_color":[{"source":"inventory","sku":"LIP-014","itemName":"Muted Coral Lip","imageUrl":"https://example.com/images/lip-014.jpg"}],"eyeshadow":[{"source":"inventory","sku":"EYE-021","itemName":"Soft Brown Eyeshadow","imageUrl":"https://example.com/images/eye-021.jpg"}],"contour":[{"source":"inventory","sku":"CON-004","itemName":"Neutral Soft Contour","imageUrl":"https://example.com/images/con-004.jpg"}],"highlighter":[{"source":"inventory","sku":"HIL-003","itemName":"Soft Gold Highlighter","imageUrl":"https://example.com/images/hil-003.jpg"}],"etc":null}}]}`

	if presetID := firstTeacherPresetID(value); presetID != "1" {
		t.Fatalf("expected first preset id 1, got %q", presetID)
	}
}

func TestTeacherPresetDocumentHasIDMatchesKnownPreset(t *testing.T) {
	value := `{"version":2,"presets":[{"id":"preset-soft","name":"Soft Daily Coral","createdAt":"2026-04-02T09:00:00+09:00","updatedAt":"2026-04-02T09:00:00+09:00","note":"Daily coral tone preset for soft warm classes.","items":{"base_foundation":[{"source":"inventory","sku":"FND-001","itemName":"Soft Natural Foundation 01","imageUrl":"https://example.com/images/fnd-001.jpg"}],"blush":[{"source":"inventory","sku":"BLS-002","itemName":"Soft Peach Blush","imageUrl":"https://example.com/images/bls-002.jpg"}],"lip_color":[{"source":"inventory","sku":"LIP-014","itemName":"Muted Coral Lip","imageUrl":"https://example.com/images/lip-014.jpg"}],"eyeshadow":[{"source":"inventory","sku":"EYE-021","itemName":"Soft Brown Eyeshadow","imageUrl":"https://example.com/images/eye-021.jpg"}],"contour":[{"source":"inventory","sku":"CON-004","itemName":"Neutral Soft Contour","imageUrl":"https://example.com/images/con-004.jpg"}],"highlighter":[{"source":"inventory","sku":"HIL-003","itemName":"Soft Gold Highlighter","imageUrl":"https://example.com/images/hil-003.jpg"}],"etc":null}}]}`

	if !teacherPresetDocumentHasID(value, "preset-soft") {
		t.Fatal("expected preset id to be found in document")
	}
	if teacherPresetDocumentHasID(value, "preset-other") {
		t.Fatal("expected unknown preset id to be rejected")
	}
}
