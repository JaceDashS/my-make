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

type stubHealthChecker struct {
	result healthResponse
	err    error
}

type stubDevToolsService struct {
	initializeResult          devToolsResponse
	initializeErr             error
	initializeAndInjectResult devToolsResponse
	initializeAndInjectErr    error
	createResult              devToolsResponse
	createErr                 error
}

func (s *stubDevToolsService) InitializeTables(context.Context) (devToolsResponse, error) {
	return s.initializeResult, s.initializeErr
}

func (s *stubDevToolsService) InitializeTablesAndInjectTestData(context.Context) (devToolsResponse, error) {
	return s.initializeAndInjectResult, s.initializeAndInjectErr
}

func (s *stubDevToolsService) CreateLicense(context.Context) (devToolsResponse, error) {
	return s.createResult, s.createErr
}

type stubAccountService struct {
	registerMemberResult             accountResponse
	registerMemberErr                error
	lastRegisterMember               memberRegisterInput
	profileResult                    profileResponse
	profileErr                       error
	updateProfileResult              profileResponse
	updateProfileErr                 error
	lastUpdateProfile                profileUpdateInput
	searchAcademyResult              academyMembersResponse
	searchAcademyErr                 error
	lastSearchAcademy                academyMemberSearchInput
	updateAcademyResult              academyMemberStatusUpdateResponse
	updateAcademyErr                 error
	lastUpdateAcademy                academyMemberStatusUpdateInput
	academyMemberProfileResult       profileResponse
	academyMemberProfileErr          error
	lastAcademyMemberProfile         academyMemberProfileInput
	updateAcademyMemberProfileResult profileResponse
	updateAcademyMemberProfileErr    error
	lastUpdateAcademyMemberProfile   academyMemberProfileUpdateInput
	searchPendingResult              pendingMembersResponse
	searchPendingErr                 error
	approvePendingResult             accountResponse
	approvePendingErr                error
	lastApprovePending               approvePendingMemberInput
	loginResult                      accountResponse
	loginErr                         error
	registerRootResult               accountResponse
	registerRootErr                  error
	renewResult                      licenseRenewResponse
	renewErr                         error
}

type stubReservationService struct {
	availabilityResult   reservationAvailabilityResponse
	availabilityErr      error
	lastAvailability     studentReservationAvailabilityInput
	createResult         reservationMutationResponse
	createErr            error
	lastCreate           studentReservationCreateInput
	listResult           studentReservationListResponse
	listErr              error
	lastList             studentReservationListInput
	cancelResult         reservationMutationResponse
	cancelErr            error
	lastCancel           studentReservationCancelInput
	teacherListResult    teacherReservationListResponse
	teacherListErr       error
	teacherApproveResult reservationMutationResponse
	teacherApproveErr    error
	lastTeacherApprove   teacherReservationMutationInput
	teacherCancelResult  reservationMutationResponse
	teacherCancelErr     error
	lastTeacherCancel    teacherReservationMutationInput
}

func (s *stubAccountService) Login(context.Context, loginInput) (accountResponse, error) {
	return s.loginResult, s.loginErr
}

func (s *stubAccountService) GetProfile(context.Context, string) (profileResponse, error) {
	return s.profileResult, s.profileErr
}

func (s *stubAccountService) UpdateProfile(_ context.Context, _ accountResponse, input profileUpdateInput) (profileResponse, error) {
	s.lastUpdateProfile = input
	return s.updateProfileResult, s.updateProfileErr
}

func (s *stubAccountService) RegisterMember(_ context.Context, input memberRegisterInput) (accountResponse, error) {
	s.lastRegisterMember = input
	return s.registerMemberResult, s.registerMemberErr
}

func (s *stubAccountService) RegisterRoot(context.Context, rootRegisterInput) (accountResponse, error) {
	return s.registerRootResult, s.registerRootErr
}

func (s *stubAccountService) SearchAcademyMembers(_ context.Context, input academyMemberSearchInput) (academyMembersResponse, error) {
	s.lastSearchAcademy = input
	return s.searchAcademyResult, s.searchAcademyErr
}

func (s *stubAccountService) UpdateAcademyMemberStatus(_ context.Context, input academyMemberStatusUpdateInput) (academyMemberStatusUpdateResponse, error) {
	s.lastUpdateAcademy = input
	return s.updateAcademyResult, s.updateAcademyErr
}

func (s *stubAccountService) GetAcademyMemberProfile(_ context.Context, _ accountResponse, input academyMemberProfileInput) (profileResponse, error) {
	s.lastAcademyMemberProfile = input
	return s.academyMemberProfileResult, s.academyMemberProfileErr
}

func (s *stubAccountService) UpdateAcademyMemberProfile(_ context.Context, _ accountResponse, input academyMemberProfileUpdateInput) (profileResponse, error) {
	s.lastUpdateAcademyMemberProfile = input
	return s.updateAcademyMemberProfileResult, s.updateAcademyMemberProfileErr
}

func (s *stubAccountService) SearchPendingMembers(context.Context, pendingMemberSearchInput) (pendingMembersResponse, error) {
	return s.searchPendingResult, s.searchPendingErr
}

func (s *stubAccountService) ApprovePendingMember(_ context.Context, input approvePendingMemberInput) (accountResponse, error) {
	s.lastApprovePending = input
	return s.approvePendingResult, s.approvePendingErr
}

func (s *stubAccountService) RenewLicense(context.Context, renewLicenseInput) (licenseRenewResponse, error) {
	return s.renewResult, s.renewErr
}

func (s *stubReservationService) GetStudentAvailability(_ context.Context, actor accountResponse, input studentReservationAvailabilityInput) (reservationAvailabilityResponse, error) {
	s.lastAvailability = input
	s.lastAvailability.ActorLoginID = actor.LoginID
	s.lastAvailability.ActorRoleCode = actor.RoleCode
	return s.availabilityResult, s.availabilityErr
}

func (s *stubReservationService) CreateStudentReservation(_ context.Context, actor accountResponse, input studentReservationCreateInput) (reservationMutationResponse, error) {
	s.lastCreate = input
	s.lastCreate.ActorLoginID = actor.LoginID
	s.lastCreate.ActorRoleCode = actor.RoleCode
	return s.createResult, s.createErr
}

func (s *stubReservationService) ListStudentReservations(_ context.Context, actor accountResponse, input studentReservationListInput) (studentReservationListResponse, error) {
	s.lastList = input
	s.lastAvailability.ActorLoginID = actor.LoginID
	s.lastAvailability.ActorRoleCode = actor.RoleCode
	return s.listResult, s.listErr
}

func (s *stubReservationService) CancelStudentReservation(_ context.Context, actor accountResponse, input studentReservationCancelInput) (reservationMutationResponse, error) {
	s.lastCancel = input
	s.lastCancel.ActorLoginID = actor.LoginID
	s.lastCancel.ActorRoleCode = actor.RoleCode
	return s.cancelResult, s.cancelErr
}

func (s *stubReservationService) ListTeacherReservations(_ context.Context, _ accountResponse, _ teacherReservationListInput) (teacherReservationListResponse, error) {
	return s.teacherListResult, s.teacherListErr
}

func (s *stubReservationService) ApproveTeacherReservation(_ context.Context, actor accountResponse, input teacherReservationMutationInput) (reservationMutationResponse, error) {
	s.lastTeacherApprove = input
	s.lastTeacherApprove.ActorLoginID = actor.LoginID
	s.lastTeacherApprove.ActorRoleCode = actor.RoleCode
	return s.teacherApproveResult, s.teacherApproveErr
}

func (s *stubReservationService) CancelTeacherReservation(_ context.Context, actor accountResponse, input teacherReservationMutationInput) (reservationMutationResponse, error) {
	s.lastTeacherCancel = input
	s.lastTeacherCancel.ActorLoginID = actor.LoginID
	s.lastTeacherCancel.ActorRoleCode = actor.RoleCode
	return s.teacherCancelResult, s.teacherCancelErr
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

func (s *stubHealthChecker) Check(context.Context) (healthResponse, error) {
	return s.result, s.err
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

func TestRunStartupDatabaseHealthCheckReturnsNilOnSuccess(t *testing.T) {
	err := runStartupDatabaseHealthCheck(&stubHealthChecker{
		result: healthResponse{
			Status:           "ok",
			Database:         "connected",
			StoredDate:       "2026-04-02",
			Today:            "2026-04-02",
			CurrentTimestamp: "2026-04-02T00:00:00Z",
		},
	})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}

func TestRunStartupDatabaseHealthCheckReturnsErrorWhenUnavailable(t *testing.T) {
	err := runStartupDatabaseHealthCheck(nil)
	if err == nil {
		t.Fatal("expected error when health checker is nil")
	}
	if err.Error() != "database health service is not configured" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRunStartupDatabaseHealthCheckReturnsHealthFailure(t *testing.T) {
	err := runStartupDatabaseHealthCheck(&stubHealthChecker{
		err: context.DeadlineExceeded,
	})
	if err == nil {
		t.Fatal("expected health failure error")
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

func TestInitializeTablesAndInjectTestDataRouteReturnsSeedSummary(t *testing.T) {
	application := &app{
		devTools: &stubDevToolsService{
			initializeAndInjectResult: devToolsResponse{
				Status:          "ok",
				Message:         "Managed tables have been initialized and test data has been injected.",
				AcademyName:     "Test Academy",
				RootLoginID:     "root",
				LicenseCode:     "TESTLICENSE",
				ExpiresAt:       "2027-03-24T00:00:00Z",
				PendingStudents: 1,
				PendingTeachers: 1,
				PendingAdmins:   1,
			},
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/dev-tools/tables/init-and-inject", nil)
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body devToolsResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.AcademyName != "Test Academy" {
		t.Fatalf("expected academy name Test Academy, got %q", body.AcademyName)
	}

	if body.RootLoginID != "root" {
		t.Fatalf("expected root login root, got %q", body.RootLoginID)
	}

	if body.LicenseCode != "TESTLICENSE" {
		t.Fatalf("expected license code TESTLICENSE, got %q", body.LicenseCode)
	}

	if body.ExpiresAt != "2027-03-24T00:00:00Z" {
		t.Fatalf("expected expires at 2027-03-24T00:00:00Z, got %q", body.ExpiresAt)
	}

	if body.Message != "Managed tables have been initialized and test data has been injected." {
		t.Fatalf("expected seed message, got %q", body.Message)
	}

	if body.PendingStudents != 1 || body.PendingTeachers != 1 || body.PendingAdmins != 1 {
		t.Fatalf("expected pending counts 1/1/1, got %+v", body)
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

func TestMemberRegisterRouteSupportsTeacherAndAdminPendingRoles(t *testing.T) {
	tests := []struct {
		name string
		role string
	}{
		{name: "teacher", role: "TEACHER"},
		{name: "admin", role: "ADMIN"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub := &stubAccountService{
				registerMemberResult: accountResponse{
					Status:      "ok",
					Message:     "Member registration submitted. Approval is required.",
					DisplayName: "New Member",
					LoginID:     "new-member",
					RoleCode:    tt.role,
				},
			}
			application := &app{accounts: stub}

			req := httptest.NewRequest(http.MethodPost, "/api/accounts/member-register", strings.NewReader(`{
  "loginId":"new-member",
  "displayName":"New Member",
  "email":"new-member@example.com",
  "phone":"010-1234-5678",
  "password":"secret",
  "requestedRoleCode":"`+tt.role+`"
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

			if body.RoleCode != tt.role {
				t.Fatalf("expected role %s, got %q", tt.role, body.RoleCode)
			}

			if stub.lastRegisterMember.RequestedRoleCode != tt.role {
				t.Fatalf("expected requested role %s to reach service, got %q", tt.role, stub.lastRegisterMember.RequestedRoleCode)
			}

			if stub.lastRegisterMember.LoginID != "new-member" {
				t.Fatalf("expected login ID new-member to reach service, got %q", stub.lastRegisterMember.LoginID)
			}
		})
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
				AccountCode: "AD0000000001",
				AcademyCode: "abc123def456",
				AcademyName: "My Academy",
				DisplayName: "Root Admin",
				Email:       "root@example.com",
				Phone:       "010-1234-5678",
				LoginID:     "root-admin",
				Note:        "Profile note",
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
	if body.AccountCode != "AD0000000001" {
		t.Fatalf("expected profile account code AD0000000001, got %q", body.AccountCode)
	}
	if body.Note != "Profile note" {
		t.Fatalf("expected profile note Profile note, got %q", body.Note)
	}
}

func TestUpdateProfileRouteReturnsUpdatedProfile(t *testing.T) {
	application := &app{
		accounts: &stubAccountService{
			updateProfileResult: profileResponse{
				Status:      "ok",
				Message:     "Profile updated successfully.",
				AccountCode: "AD0000000001",
				AcademyCode: "abc123def456",
				AcademyName: "My Academy",
				DisplayName: "Root Admin",
				Email:       "next@example.com",
				Phone:       "010-9999-0000",
				LoginID:     "root-admin",
				Note:        "Updated note",
				RoleCode:    "ROOT",
				LicenseCode: "LICENSE001",
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "root-admin",
		RoleCode: "ROOT",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/accounts/profile/update", strings.NewReader(`{
  "availableSchedule":"{\"timezone\":\"Asia/Seoul\",\"weekly\":{\"mon\":[{\"start\":\"10:00\",\"end\":\"12:00\"}],\"tue\":[],\"wed\":[],\"thu\":[],\"fri\":[],\"sat\":[],\"sun\":[]},\"exceptions\":[]}",
  "email":"next@example.com",
  "note":"Updated note",
  "phone":"010-9999-0000",
  "preset":"{\"version\":2,\"presets\":[{\"id\":\"1\",\"name\":\"Soft Daily Coral\",\"createdAt\":\"2026-04-02T09:00:00+09:00\",\"updatedAt\":\"2026-04-02T09:00:00+09:00\",\"note\":\"Daily coral tone preset for soft warm classes.\",\"items\":{\"base_foundation\":[{\"source\":\"inventory\",\"sku\":\"FND-001\",\"itemName\":\"Soft Natural Foundation 01\",\"imageUrl\":\"https://example.com/images/fnd-001.jpg\"}],\"blush\":[{\"source\":\"inventory\",\"sku\":\"BLS-002\",\"itemName\":\"Soft Peach Blush\",\"imageUrl\":\"https://example.com/images/bls-002.jpg\"},{\"source\":\"manual\",\"sku\":null,\"itemName\":\"Apricot Cream Blush Pot\",\"imageUrl\":\"https://example.com/images/manual-apricot-cream-blush.jpg\"}],\"lip_color\":[{\"source\":\"inventory\",\"sku\":\"LIP-014\",\"itemName\":\"Muted Coral Lip\",\"imageUrl\":\"https://example.com/images/lip-014.jpg\"}],\"eyeshadow\":[{\"source\":\"inventory\",\"sku\":\"EYE-021\",\"itemName\":\"Soft Brown Eyeshadow\",\"imageUrl\":\"https://example.com/images/eye-021.jpg\"}],\"contour\":[{\"source\":\"inventory\",\"sku\":\"CON-004\",\"itemName\":\"Neutral Soft Contour\",\"imageUrl\":\"https://example.com/images/con-004.jpg\"}],\"highlighter\":[{\"source\":\"inventory\",\"sku\":\"HIL-003\",\"itemName\":\"Soft Gold Highlighter\",\"imageUrl\":\"https://example.com/images/hil-003.jpg\"}],\"etc\":null}}]}",
  "skinLValue":"65.5",
  "skinCValue":"14.2",
  "skinHValue":"58.1",
  "skinTraits":"Neutral memo",
  "preferenceRanges":"{\"version\":1,\"space\":\"lch\",\"plane\":\"h-c\",\"hueMode\":\"unwrap\",\"regions\":[]}"
}`))
	req.Header.Set("Content-Type", "application/json")
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

	if body.Email != "next@example.com" {
		t.Fatalf("expected updated email next@example.com, got %q", body.Email)
	}
	if body.Note != "Updated note" {
		t.Fatalf("expected updated note Updated note, got %q", body.Note)
	}

	stub := application.accounts.(*stubAccountService)
	if stub.lastUpdateProfile.Email == nil || *stub.lastUpdateProfile.Email != "next@example.com" {
		t.Fatalf("expected email to reach service, got %+v", stub.lastUpdateProfile.Email)
	}
	if stub.lastUpdateProfile.Note == nil || *stub.lastUpdateProfile.Note != "Updated note" {
		t.Fatalf("expected note to reach service, got %+v", stub.lastUpdateProfile.Note)
	}
	if stub.lastUpdateProfile.AvailableSchedule == nil || *stub.lastUpdateProfile.AvailableSchedule != "{\"timezone\":\"Asia/Seoul\",\"weekly\":{\"mon\":[{\"start\":\"10:00\",\"end\":\"12:00\"}],\"tue\":[],\"wed\":[],\"thu\":[],\"fri\":[],\"sat\":[],\"sun\":[]},\"exceptions\":[]}" {
		t.Fatalf("expected available schedule to reach service, got %+v", stub.lastUpdateProfile.AvailableSchedule)
	}
	if stub.lastUpdateProfile.Preset == nil || *stub.lastUpdateProfile.Preset != "{\"version\":2,\"presets\":[{\"id\":\"1\",\"name\":\"Soft Daily Coral\",\"createdAt\":\"2026-04-02T09:00:00+09:00\",\"updatedAt\":\"2026-04-02T09:00:00+09:00\",\"note\":\"Daily coral tone preset for soft warm classes.\",\"items\":{\"base_foundation\":[{\"source\":\"inventory\",\"sku\":\"FND-001\",\"itemName\":\"Soft Natural Foundation 01\",\"imageUrl\":\"https://example.com/images/fnd-001.jpg\"}],\"blush\":[{\"source\":\"inventory\",\"sku\":\"BLS-002\",\"itemName\":\"Soft Peach Blush\",\"imageUrl\":\"https://example.com/images/bls-002.jpg\"},{\"source\":\"manual\",\"sku\":null,\"itemName\":\"Apricot Cream Blush Pot\",\"imageUrl\":\"https://example.com/images/manual-apricot-cream-blush.jpg\"}],\"lip_color\":[{\"source\":\"inventory\",\"sku\":\"LIP-014\",\"itemName\":\"Muted Coral Lip\",\"imageUrl\":\"https://example.com/images/lip-014.jpg\"}],\"eyeshadow\":[{\"source\":\"inventory\",\"sku\":\"EYE-021\",\"itemName\":\"Soft Brown Eyeshadow\",\"imageUrl\":\"https://example.com/images/eye-021.jpg\"}],\"contour\":[{\"source\":\"inventory\",\"sku\":\"CON-004\",\"itemName\":\"Neutral Soft Contour\",\"imageUrl\":\"https://example.com/images/con-004.jpg\"}],\"highlighter\":[{\"source\":\"inventory\",\"sku\":\"HIL-003\",\"itemName\":\"Soft Gold Highlighter\",\"imageUrl\":\"https://example.com/images/hil-003.jpg\"}],\"etc\":null}}]}" {
		t.Fatalf("expected preset to reach service, got %+v", stub.lastUpdateProfile.Preset)
	}
	if stub.lastUpdateProfile.SkinLValue == nil || *stub.lastUpdateProfile.SkinLValue != "65.5" {
		t.Fatalf("expected skin L value to reach service, got %+v", stub.lastUpdateProfile.SkinLValue)
	}
	if stub.lastUpdateProfile.SkinCValue == nil || *stub.lastUpdateProfile.SkinCValue != "14.2" {
		t.Fatalf("expected skin C value to reach service, got %+v", stub.lastUpdateProfile.SkinCValue)
	}
	if stub.lastUpdateProfile.SkinHValue == nil || *stub.lastUpdateProfile.SkinHValue != "58.1" {
		t.Fatalf("expected skin H value to reach service, got %+v", stub.lastUpdateProfile.SkinHValue)
	}
	if stub.lastUpdateProfile.SkinTraits == nil || *stub.lastUpdateProfile.SkinTraits != "Neutral memo" {
		t.Fatalf("expected skin traits to reach service, got %+v", stub.lastUpdateProfile.SkinTraits)
	}
	if stub.lastUpdateProfile.PreferenceRanges == nil || *stub.lastUpdateProfile.PreferenceRanges != "{\"version\":1,\"space\":\"lch\",\"plane\":\"h-c\",\"hueMode\":\"unwrap\",\"regions\":[]}" {
		t.Fatalf("expected preference ranges to reach service, got %+v", stub.lastUpdateProfile.PreferenceRanges)
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
  "loginId":"pending-user",
  "primaryTeacherLoginId":"teacher-1"
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

	stub := application.accounts.(*stubAccountService)
	if stub.lastApprovePending.PrimaryTeacherLoginID != "teacher-1" {
		t.Fatalf("expected primary teacher login to reach service, got %q", stub.lastApprovePending.PrimaryTeacherLoginID)
	}
}

func TestApprovePendingMemberRouteSupportsTeacherAndAdminApprovals(t *testing.T) {
	tests := []struct {
		name string
		role string
	}{
		{name: "teacher", role: "TEACHER"},
		{name: "admin", role: "ADMIN"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub := &stubAccountService{
				approvePendingResult: accountResponse{
					Status:   "ok",
					Message:  "Pending member approved successfully.",
					LoginID:  "pending-user",
					RoleCode: tt.role,
				},
			}
			application := &app{accounts: stub}

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

			if body.RoleCode != tt.role {
				t.Fatalf("expected approved role %s, got %q", tt.role, body.RoleCode)
			}

			if stub.lastApprovePending.LoginID != "pending-user" {
				t.Fatalf("expected login ID pending-user to reach service, got %q", stub.lastApprovePending.LoginID)
			}

			if stub.lastApprovePending.PrimaryTeacherLoginID != "" {
				t.Fatalf("expected non-student approval to omit primary teacher, got %q", stub.lastApprovePending.PrimaryTeacherLoginID)
			}

			if stub.lastApprovePending.ActorRoleCode != "ROOT" {
				t.Fatalf("expected actor role ROOT to reach service, got %q", stub.lastApprovePending.ActorRoleCode)
			}
		})
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

func TestStudentReservationAvailabilityRouteReturnsSlots(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			availabilityResult: reservationAvailabilityResponse{
				Status:  "ok",
				Message: "Availability loaded.",
				Date:    "2026-04-01",
				Slots: []studentReservationSlot{
					{StartTime: "10:00", Status: "available"},
				},
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "student01",
		RoleCode: "STUDENT",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/reservations/student/availability", strings.NewReader(`{
  "date":"2026-04-01"
}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body reservationAvailabilityResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(body.Slots) != 1 || body.Slots[0].StartTime != "10:00" {
		t.Fatalf("expected slot payload, got %+v", body.Slots)
	}
}

func TestStudentReservationAvailabilityRoutePassesTargetStudentLoginID(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			availabilityResult: reservationAvailabilityResponse{
				Status:  "ok",
				Message: "Availability loaded.",
				Slots:   []studentReservationSlot{},
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "admin01",
		RoleCode: "ADMIN",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/reservations/student/availability", strings.NewReader(`{
  "date":"2026-04-01",
  "studentLoginId":"student01"
}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	stub := application.reservations.(*stubReservationService)
	if stub.lastAvailability.StudentLoginID != "student01" {
		t.Fatalf("expected target student login id to reach service, got %+v", stub.lastAvailability)
	}
}

func TestStudentReservationCreateRoutePassesSlotPayload(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			createResult: reservationMutationResponse{
				Status:        "ok",
				Message:       "Reservation created.",
				ReservationID: "reservation-1",
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "student01",
		RoleCode: "STUDENT",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/reservations/student/create", strings.NewReader(`{
  "presetId":"preset-soft-daily-coral-001",
  "startsAtUtc":"2026-04-01T01:00:00Z"
}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	stub := application.reservations.(*stubReservationService)
	if stub.lastCreate.StartsAtUTC != "2026-04-01T01:00:00Z" || stub.lastCreate.PresetID != "preset-soft-daily-coral-001" {
		t.Fatalf("expected slot payload to reach service, got %+v", stub.lastCreate)
	}
}

func TestStudentReservationCreateRoutePassesTargetStudentLoginID(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			createResult: reservationMutationResponse{
				Status:  "ok",
				Message: "Reservation created.",
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "admin01",
		RoleCode: "ADMIN",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/reservations/student/create", strings.NewReader(`{
  "startsAtUtc":"2026-04-01T01:00:00Z",
  "studentLoginId":"student01"
}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	stub := application.reservations.(*stubReservationService)
	if stub.lastCreate.StudentLoginID != "student01" {
		t.Fatalf("expected target student login id to reach service, got %+v", stub.lastCreate)
	}
}

func TestStudentReservationListRouteReturnsReservations(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			listResult: studentReservationListResponse{
				Status:  "ok",
				Message: "Reservations loaded.",
				Reservations: []studentReservationRecord{
					{
						Date:        "2026-04-02",
						PresetID:    "preset-soft-daily-coral-001",
						ID:          "reservation-1",
						Status:      "PENDING",
						TeacherName: "Teacher Kim",
						Time:        "11:00",
					},
				},
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "student01",
		RoleCode: "STUDENT",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/reservations/student/list", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body studentReservationListResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(body.Reservations) != 1 || body.Reservations[0].ID != "reservation-1" {
		t.Fatalf("expected reservation payload, got %+v", body.Reservations)
	}
}

func TestStudentReservationListRoutePassesTargetStudentLoginID(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			listResult: studentReservationListResponse{
				Status:       "ok",
				Message:      "Reservations loaded.",
				Reservations: []studentReservationRecord{},
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "admin01",
		RoleCode: "ADMIN",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/reservations/student/list?studentLoginId=student01", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	stub := application.reservations.(*stubReservationService)
	if stub.lastList.StudentLoginID != "student01" {
		t.Fatalf("expected target student login id to reach service, got %+v", stub.lastList)
	}
}

func TestStudentReservationCancelRoutePassesReservationID(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			cancelResult: reservationMutationResponse{
				Status:        "ok",
				Message:       "Reservation canceled.",
				ReservationID: "reservation-1",
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "student01",
		RoleCode: "STUDENT",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/reservations/student/cancel", strings.NewReader(`{
  "reservationId":"reservation-1"
}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	stub := application.reservations.(*stubReservationService)
	if stub.lastCancel.ReservationID != "reservation-1" {
		t.Fatalf("expected reservation id to reach service, got %+v", stub.lastCancel)
	}
}

func TestStudentReservationCancelRoutePassesTargetStudentLoginID(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			cancelResult: reservationMutationResponse{
				Status:  "ok",
				Message: "Reservation canceled.",
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "admin01",
		RoleCode: "ADMIN",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/reservations/student/cancel", strings.NewReader(`{
  "reservationId":"reservation-1",
  "studentLoginId":"student01"
}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	stub := application.reservations.(*stubReservationService)
	if stub.lastCancel.StudentLoginID != "student01" {
		t.Fatalf("expected target student login id to reach service, got %+v", stub.lastCancel)
	}
}

func TestTeacherReservationListRouteReturnsReservations(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			teacherListResult: teacherReservationListResponse{
				Status:  "ok",
				Message: "Teacher reservations loaded.",
				Reservations: []teacherReservationRecord{
					{
						Date:        "2026-04-02",
						ID:          "reservation-1",
						PresetID:    "preset-soft-daily-coral-001",
						Status:      "pending",
						StudentName: "Hana Suzuki",
						Time:        "11:00",
					},
				},
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "teacher01",
		RoleCode: "TEACHER",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/reservations/teacher/list", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body teacherReservationListResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(body.Reservations) != 1 || body.Reservations[0].StudentName != "Hana Suzuki" {
		t.Fatalf("expected teacher reservation payload, got %+v", body.Reservations)
	}
}

func TestTeacherReservationApproveRoutePassesReservationID(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			teacherApproveResult: reservationMutationResponse{
				Status:        "ok",
				Message:       "Reservation approved.",
				ReservationID: "reservation-1",
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "teacher01",
		RoleCode: "TEACHER",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/reservations/teacher/approve", strings.NewReader(`{
  "reservationId":"reservation-1",
  "presetId":"preset-empty"
}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	stub := application.reservations.(*stubReservationService)
	if stub.lastTeacherApprove.ReservationID != "reservation-1" || stub.lastTeacherApprove.PresetID != "preset-empty" {
		t.Fatalf("expected reservation id to reach teacher approve service, got %+v", stub.lastTeacherApprove)
	}
}

func TestTeacherReservationCancelRoutePassesReservationID(t *testing.T) {
	application := &app{
		reservations: &stubReservationService{
			teacherCancelResult: reservationMutationResponse{
				Status:        "ok",
				Message:       "Reservation canceled.",
				ReservationID: "reservation-1",
			},
		},
		sessions: newSessionManager(),
	}

	token, err := application.sessions.Create(accountResponse{
		Status:   "ok",
		LoginID:  "teacher01",
		RoleCode: "TEACHER",
	})
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/reservations/teacher/cancel", strings.NewReader(`{
  "reservationId":"reservation-1"
}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	stub := application.reservations.(*stubReservationService)
	if stub.lastTeacherCancel.ReservationID != "reservation-1" {
		t.Fatalf("expected reservation id to reach teacher cancel service, got %+v", stub.lastTeacherCancel)
	}
}
