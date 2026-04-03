package main

import (
	"testing"
	"time"
)

func TestResolveTeacherScheduleSourceSlotsBlocksPeriodRange(t *testing.T) {
	document := teacherScheduleDocument{
		Weekly: map[string][]teacherScheduleSlot{
			"thu": {
				{Start: "10:00", End: "18:00"},
			},
		},
		Exceptions: []teacherScheduleException{
			{
				Type:      "period-block",
				StartDate: "2026-04-02",
				EndDate:   "2026-04-04",
				AllDay:    true,
			},
		},
	}

	slots := resolveTeacherScheduleSourceSlots(
		document,
		time.Date(2026, time.April, 2, 0, 0, 0, 0, time.UTC),
	)

	if len(slots) != 0 {
		t.Fatalf("expected no slots during period block, got %+v", slots)
	}
}

func TestResolveTeacherScheduleSourceSlotsSubtractsTimeBlock(t *testing.T) {
	document := teacherScheduleDocument{
		Weekly: map[string][]teacherScheduleSlot{
			"thu": {
				{Start: "10:00", End: "18:00"},
			},
		},
		Exceptions: []teacherScheduleException{
			{
				Type:   "time-block",
				Date:   "2026-04-02",
				AllDay: false,
				Slots: []teacherScheduleSlot{
					{Start: "12:00", End: "14:00"},
				},
			},
		},
	}

	slots := resolveTeacherScheduleSourceSlots(
		document,
		time.Date(2026, time.April, 2, 0, 0, 0, 0, time.UTC),
	)

	if len(slots) != 2 {
		t.Fatalf("expected 2 remaining slot ranges, got %+v", slots)
	}
	if slots[0].Start != "10:00" || slots[0].End != "12:00" {
		t.Fatalf("expected morning segment to remain, got %+v", slots[0])
	}
	if slots[1].Start != "14:00" || slots[1].End != "18:00" {
		t.Fatalf("expected afternoon segment to remain, got %+v", slots[1])
	}
}

func TestResolveTeacherScheduleSourceSlotsTreatsCustomSlotsAsTimeBlock(t *testing.T) {
	document := teacherScheduleDocument{
		Weekly: map[string][]teacherScheduleSlot{
			"thu": {
				{Start: "10:00", End: "18:00"},
			},
		},
		Exceptions: []teacherScheduleException{
			{
				Type: "custom-slots",
				Date: "2026-04-02",
				Slots: []teacherScheduleSlot{
					{Start: "11:00", End: "13:00"},
				},
			},
		},
	}

	slots := resolveTeacherScheduleSourceSlots(
		document,
		time.Date(2026, time.April, 2, 0, 0, 0, 0, time.UTC),
	)

	if len(slots) != 2 {
		t.Fatalf("expected 2 remaining slot ranges, got %+v", slots)
	}
	if slots[0].Start != "10:00" || slots[0].End != "11:00" {
		t.Fatalf("expected morning segment to remain, got %+v", slots[0])
	}
	if slots[1].Start != "13:00" || slots[1].End != "18:00" {
		t.Fatalf("expected afternoon segment to remain, got %+v", slots[1])
	}
}
