package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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

type stubDevToolsService struct {
	initializeResult devToolsResponse
	initializeErr    error
	createResult     devToolsResponse
	createErr        error
}

func (s *stubDevToolsService) InitializeTables(context.Context) (devToolsResponse, error) {
	return s.initializeResult, s.initializeErr
}

func (s *stubDevToolsService) CreateLicense(context.Context) (devToolsResponse, error) {
	return s.createResult, s.createErr
}

type stubAccountService struct {
	loginResult        accountResponse
	loginErr           error
	registerRootResult accountResponse
	registerRootErr    error
	renewResult        licenseRenewResponse
	renewErr           error
}

func (s *stubAccountService) Login(context.Context, loginInput) (accountResponse, error) {
	return s.loginResult, s.loginErr
}

func (s *stubAccountService) RegisterRoot(context.Context, rootRegisterInput) (accountResponse, error) {
	return s.registerRootResult, s.registerRootErr
}

func (s *stubAccountService) RenewLicense(context.Context, renewLicenseInput) (licenseRenewResponse, error) {
	return s.renewResult, s.renewErr
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

func TestInitializeTablesRouteReturnsJSON(t *testing.T) {
	application := &app{
		devTools: &stubDevToolsService{
			initializeResult: devToolsResponse{
				Status:     "ok",
				Message:    "Managed tables have been initialized.",
				Migrations: []string{"000_create_mame_academies.oracle.sql"},
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/dev-tools/tables/init", nil)
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body devToolsResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.Status != "ok" {
		t.Fatalf("expected ok status, got %q", body.Status)
	}
}

func TestCreateLicenseRouteReturnsLicenseCode(t *testing.T) {
	application := &app{
		devTools: &stubDevToolsService{
			createResult: devToolsResponse{
				Status:      "ok",
				Message:     "License has been created.",
				LicenseCode: "ABC123",
				ExpiresAt:   "2027-03-24T00:00:00Z",
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/dev-tools/licenses", nil)
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body devToolsResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.LicenseCode != "ABC123" {
		t.Fatalf("expected license code ABC123, got %q", body.LicenseCode)
	}
}

func TestRootRegisterRouteReturnsAcademyCode(t *testing.T) {
	application := &app{
		accounts: &stubAccountService{
			registerRootResult: accountResponse{
				Status:      "ok",
				Message:     "Root registration completed.",
				AcademyCode: "abc123def456",
				AcademyName: "My Academy",
				LoginID:     "root-admin",
				DisplayName: "Root Admin",
				RoleCode:    "ROOT",
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/accounts/root-register", strings.NewReader(`{
  "licenseCode":"LICENSE001",
  "academyName":"My Academy",
  "rootLoginId":"root-admin",
  "rootDisplayName":"Root Admin",
  "password":"secret"
}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body accountResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.AcademyCode != "abc123def456" {
		t.Fatalf("expected academy code abc123def456, got %q", body.AcademyCode)
	}
}

func TestLoginRouteReturnsAccountPayload(t *testing.T) {
	application := &app{
		accounts: &stubAccountService{
			loginResult: accountResponse{
				Status:      "ok",
				Message:     "Signed in successfully.",
				AcademyCode: "abc123def456",
				AcademyName: "My Academy",
				DisplayName: "Root Admin",
				LoginID:     "root-admin",
				RoleCode:    "ROOT",
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/accounts/login", strings.NewReader(`{
  "loginId":"root-admin",
  "password":"secret"
}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body accountResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.LoginID != "root-admin" {
		t.Fatalf("expected login ID root-admin, got %q", body.LoginID)
	}
}

func TestRenewLicenseRouteReturnsNewExpiration(t *testing.T) {
	application := &app{
		accounts: &stubAccountService{
			renewResult: licenseRenewResponse{
				Status:      "ok",
				Message:     "License has been renewed.",
				LicenseCode: "LICENSE001",
				ExpiresAt:   "2027-03-24T00:00:00Z",
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/licenses/renew", strings.NewReader(`{
  "licenseCode":"LICENSE001"
}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body licenseRenewResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.ExpiresAt != "2027-03-24T00:00:00Z" {
		t.Fatalf("expected renewed expiration, got %q", body.ExpiresAt)
	}
}
