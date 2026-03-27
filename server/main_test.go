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
	registerMemberResult accountResponse
	registerMemberErr    error
	profileResult        profileResponse
	profileErr           error
	searchPendingResult  pendingMembersResponse
	searchPendingErr     error
	approvePendingResult accountResponse
	approvePendingErr    error
	loginResult          accountResponse
	loginErr             error
	registerRootResult   accountResponse
	registerRootErr      error
	renewResult          licenseRenewResponse
	renewErr             error
}

func (s *stubAccountService) Login(context.Context, loginInput) (accountResponse, error) {
	return s.loginResult, s.loginErr
}

func (s *stubAccountService) GetProfile(context.Context, string) (profileResponse, error) {
	return s.profileResult, s.profileErr
}

func (s *stubAccountService) RegisterMember(context.Context, memberRegisterInput) (accountResponse, error) {
	return s.registerMemberResult, s.registerMemberErr
}

func (s *stubAccountService) RegisterRoot(context.Context, rootRegisterInput) (accountResponse, error) {
	return s.registerRootResult, s.registerRootErr
}

func (s *stubAccountService) SearchPendingMembers(context.Context, pendingMemberSearchInput) (pendingMembersResponse, error) {
	return s.searchPendingResult, s.searchPendingErr
}

func (s *stubAccountService) ApprovePendingMember(context.Context, approvePendingMemberInput) (accountResponse, error) {
	return s.approvePendingResult, s.approvePendingErr
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
				Migrations: []string{"000_create_maimei_academies.oracle.sql"},
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/dev-tools/tables/init", nil)
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

	req := httptest.NewRequest(http.MethodPost, "/api/dev-tools/licenses", nil)
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

	req := httptest.NewRequest(http.MethodPost, "/api/accounts/root-register", strings.NewReader(`{
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

	foundCookie := false
	for _, cookie := range rec.Result().Cookies() {
		if cookie.Name == sessionCookieName && cookie.Value != "" {
			foundCookie = true
		}
	}
	if !foundCookie {
		t.Fatal("expected session cookie to be set on root register")
	}
}

func TestMemberRegisterRouteReturnsPendingRole(t *testing.T) {
	application := &app{
		accounts: &stubAccountService{
			registerMemberResult: accountResponse{
				Status:      "ok",
				Message:     "Member registration submitted. Approval is required.",
				DisplayName: "New Member",
				LoginID:     "new-member",
				RoleCode:    "STUDENT",
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/accounts/member-register", strings.NewReader(`{
  "loginId":"new-member",
  "displayName":"New Member",
  "password":"secret",
  "requestedRoleCode":"STUDENT"
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

	if body.RoleCode != "STUDENT" {
		t.Fatalf("expected role STUDENT, got %q", body.RoleCode)
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

	req := httptest.NewRequest(http.MethodPost, "/api/accounts/login", strings.NewReader(`{
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

	foundCookie := false
	for _, cookie := range rec.Result().Cookies() {
		if cookie.Name == sessionCookieName && cookie.Value != "" {
			foundCookie = true
		}
	}
	if !foundCookie {
		t.Fatal("expected session cookie to be set on login")
	}
}

func TestSessionRouteReturnsStoredSession(t *testing.T) {
	application := &app{
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:      "ok",
		Message:     "Signed in successfully.",
		AcademyCode: "abc123def456",
		AcademyName: "My Academy",
		DisplayName: "Root Admin",
		LoginID:     "root-admin",
		RoleCode:    "ROOT",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/accounts/session", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
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
		t.Fatalf("expected session login ID root-admin, got %q", body.LoginID)
	}
}

func TestProfileRouteReturnsStoredProfile(t *testing.T) {
	application := &app{
		accounts: &stubAccountService{
			profileResult: profileResponse{
				Status:      "ok",
				Message:     "Profile loaded successfully.",
				AcademyCode: "abc123def456",
				AcademyName: "My Academy",
				DisplayName: "Root Admin",
				Email:       "root@example.com",
				Phone:       "010-1234-5678",
				LoginID:     "root-admin",
				RoleCode:    "ROOT",
				LicenseCode: "LICENSE001",
				ExpiresAt:   "2027-03-24T00:00:00Z",
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:  "ok",
		LoginID: "root-admin",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/accounts/profile", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body profileResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.LoginID != "root-admin" {
		t.Fatalf("expected profile login ID root-admin, got %q", body.LoginID)
	}
	if body.Email != "root@example.com" {
		t.Fatalf("expected profile email root@example.com, got %q", body.Email)
	}
}

func TestLogoutRouteClearsSessionCookie(t *testing.T) {
	application := &app{
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:  "ok",
		LoginID: "root-admin",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/accounts/logout", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	cleared := false
	for _, cookie := range rec.Result().Cookies() {
		if cookie.Name == sessionCookieName && cookie.MaxAge < 0 {
			cleared = true
		}
	}
	if !cleared {
		t.Fatal("expected logout to clear session cookie")
	}
}

func TestSearchPendingMembersRouteReturnsMatches(t *testing.T) {
	application := &app{
		accounts: &stubAccountService{
			searchPendingResult: pendingMembersResponse{
				Status:  "ok",
				Message: "Pending members found.",
				Members: []pendingMemberRecord{
					{
						DisplayName: "Pending User",
						LoginID:     "pending-user",
						RoleCode:    "STUDENT",
						CreatedAt:   "2026-03-24T00:00:00Z",
					},
				},
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/members/pending/search", strings.NewReader(`{
  "academyCode":"abc123def456",
  "actorRoleCode":"ROOT",
  "field":"loginId",
  "query":"pending-user"
}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body pendingMembersResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(body.Members) != 1 || body.Members[0].LoginID != "pending-user" {
		t.Fatalf("expected pending-user in response, got %+v", body.Members)
	}
}

func TestApprovePendingMemberRouteReturnsApprovedLoginID(t *testing.T) {
	application := &app{
		accounts: &stubAccountService{
			approvePendingResult: accountResponse{
				Status:  "ok",
				Message: "Pending member approved successfully.",
				LoginID: "pending-user",
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/members/pending/approve", strings.NewReader(`{
  "academyCode":"abc123def456",
  "actorRoleCode":"ROOT",
  "loginId":"pending-user"
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

	if body.LoginID != "pending-user" {
		t.Fatalf("expected approved login ID pending-user, got %q", body.LoginID)
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

	req := httptest.NewRequest(http.MethodPost, "/api/licenses/renew", strings.NewReader(`{
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
