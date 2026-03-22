package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type stubHealthStore struct {
	exists          bool
	storedDate      string
	createCalls     int
	dropCalls       int
	insertCalls     int
	insertedPayload []string
}

func (s *stubHealthStore) TableExists(context.Context) (bool, error) {
	return s.exists, nil
}

func (s *stubHealthStore) FetchStoredDate(context.Context) (string, error) {
	return s.storedDate, nil
}

func (s *stubHealthStore) CreateTable(context.Context) error {
	s.exists = true
	s.createCalls++
	return nil
}

func (s *stubHealthStore) DropTable(context.Context) error {
	s.exists = false
	s.storedDate = ""
	s.dropCalls++
	return nil
}

func (s *stubHealthStore) InsertStoredDate(_ context.Context, storedDate string) error {
	s.storedDate = storedDate
	s.insertCalls++
	s.insertedPayload = append(s.insertedPayload, storedDate)
	return nil
}

func TestHealthServiceCreatesTableForToday(t *testing.T) {
	store := &stubHealthStore{}
	service := &healthService{
		store: store,
		now: func() time.Time {
			return time.Date(2026, 3, 21, 9, 0, 0, 0, time.UTC)
		},
	}

	result, err := service.Check(context.Background())
	if err != nil {
		t.Fatalf("health check failed: %v", err)
	}

	if store.createCalls != 1 {
		t.Fatalf("expected 1 table creation, got %d", store.createCalls)
	}

	if store.insertCalls != 1 {
		t.Fatalf("expected 1 insert, got %d", store.insertCalls)
	}

	if result.StoredDate != "2026-03-21" {
		t.Fatalf("expected stored date 2026-03-21, got %q", result.StoredDate)
	}

	if result.CurrentTimestamp != "2026-03-21T09:00:00Z" {
		t.Fatalf("expected current timestamp 2026-03-21T09:00:00Z, got %q", result.CurrentTimestamp)
	}
}

func TestHealthServiceRecreatesTableWhenDateChanges(t *testing.T) {
	store := &stubHealthStore{
		exists:     true,
		storedDate: "2026-03-20",
	}
	service := &healthService{
		store: store,
		now: func() time.Time {
			return time.Date(2026, 3, 21, 9, 0, 0, 0, time.UTC)
		},
	}

	result, err := service.Check(context.Background())
	if err != nil {
		t.Fatalf("health check failed: %v", err)
	}

	if store.dropCalls != 1 {
		t.Fatalf("expected 1 drop, got %d", store.dropCalls)
	}

	if store.createCalls != 1 {
		t.Fatalf("expected 1 create after drop, got %d", store.createCalls)
	}

	if result.StoredDate != "2026-03-21" {
		t.Fatalf("expected stored date to refresh to today, got %q", result.StoredDate)
	}

	if result.CurrentTimestamp != "2026-03-21T09:00:00Z" {
		t.Fatalf("expected current timestamp 2026-03-21T09:00:00Z, got %q", result.CurrentTimestamp)
	}
}

func TestHealthReturnsStoredDate(t *testing.T) {
	application := &app{
		health: &healthService{
			store: &stubHealthStore{
				exists:     true,
				storedDate: "2026-03-21",
			},
			now: func() time.Time {
				return time.Date(2026, 3, 21, 9, 0, 0, 0, time.UTC)
			},
		},
	}

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	if contentType := rec.Header().Get("Content-Type"); contentType != "application/json; charset=utf-8" {
		t.Fatalf("expected json content type, got %q", contentType)
	}

	var body healthResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.StoredDate != "2026-03-21" {
		t.Fatalf("expected stored date in response, got %q", body.StoredDate)
	}

	if body.Today != "2026-03-21" {
		t.Fatalf("expected today in response, got %q", body.Today)
	}

	if body.CurrentTimestamp != "2026-03-21T09:00:00Z" {
		t.Fatalf("expected current timestamp in response, got %q", body.CurrentTimestamp)
	}
}
