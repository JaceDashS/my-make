package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSearchAcademyMembersRouteReturnsMatches(t *testing.T) {
	stub := &stubAccountService{
		searchAcademyResult: academyMembersResponse{
			Status:  "ok",
			Message: "Academy members found.",
			Members: []academyMemberRecord{
				{
					AcademyCode: "abc123def456",
					AcademyName: "My Academy",
					DisplayName: "Academy User",
					LoginID:     "academy-user",
					RoleCode:    "STUDENT",
					StatusCode:  "ACTIVE",
				},
			},
		},
	}

	application := &app{
		accounts: stub,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/members/academy/search", strings.NewReader(`{
  "academyCode":"abc123def456",
  "actorRoleCode":"ROOT",
  "field":"displayName",
  "query":"Kim",
  "statusFilter":"ALL"
}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body academyMembersResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.Status != "ok" {
		t.Fatalf("expected ok status, got %q", body.Status)
	}

	if len(body.Members) != 1 {
		t.Fatalf("expected 1 member, got %d", len(body.Members))
	}

	if body.Members[0].StatusCode != "ACTIVE" {
		t.Fatalf("expected active member, got %q", body.Members[0].StatusCode)
	}

	if stub.lastSearchAcademy.StatusFilter != "ALL" {
		t.Fatalf("expected ALL status filter to reach service, got %q", stub.lastSearchAcademy.StatusFilter)
	}
}

func TestSearchAcademyMembersRouteAllowsEmptyQueryForAllMembers(t *testing.T) {
	stub := &stubAccountService{
		searchAcademyResult: academyMembersResponse{
			Status:  "ok",
			Message: "Academy members found.",
			Members: []academyMemberRecord{},
		},
	}

	application := &app{
		accounts: stub,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/members/academy/search", strings.NewReader(`{
  "academyCode":"abc123def456",
  "actorRoleCode":"ROOT",
  "field":"displayName",
  "query":"",
  "statusFilter":"ALL"
}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	application.routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	if stub.lastSearchAcademy.Query != "" {
		t.Fatalf("expected empty query to reach service, got %q", stub.lastSearchAcademy.Query)
	}
}

func TestUpdateAcademyMemberStatusRouteSupportsAllowedTransitions(t *testing.T) {
	tests := []struct {
		name          string
		currentStatus string
		nextStatus    string
	}{
		{name: "active to hold", currentStatus: "ACTIVE", nextStatus: "HOLD"},
		{name: "active to inactive", currentStatus: "ACTIVE", nextStatus: "INACTIVE"},
		{name: "hold to active", currentStatus: "HOLD", nextStatus: "ACTIVE"},
		{name: "hold to inactive", currentStatus: "HOLD", nextStatus: "INACTIVE"},
		{name: "inactive to active", currentStatus: "INACTIVE", nextStatus: "ACTIVE"},
		{name: "inactive to hold", currentStatus: "INACTIVE", nextStatus: "HOLD"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub := &stubAccountService{
				updateAcademyResult: academyMemberStatusUpdateResponse{
					Status:        "ok",
					Message:       "Academy member status updated.",
					LoginID:       "academy-member",
					CurrentStatus: tt.currentStatus,
					NextStatus:    tt.nextStatus,
					RoleCode:      "STUDENT",
				},
			}
			application := &app{
				accounts: stub,
			}

			req := httptest.NewRequest(http.MethodPost, "/api/members/academy/status", strings.NewReader(`{
  "academyCode":"abc123def456",
  "actorRoleCode":"ROOT",
  "loginId":"academy-member",
  "currentStatus":"`+tt.currentStatus+`",
  "nextStatus":"`+tt.nextStatus+`"
}`))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			application.routes().ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
			}

			var body academyMemberStatusUpdateResponse
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decode response: %v", err)
			}

			if body.Status != "ok" {
				t.Fatalf("expected ok status, got %q", body.Status)
			}

			if body.CurrentStatus != tt.currentStatus || body.NextStatus != tt.nextStatus {
				t.Fatalf("expected transition %s -> %s, got %s -> %s", tt.currentStatus, tt.nextStatus, body.CurrentStatus, body.NextStatus)
			}

			if stub.lastUpdateAcademy.CurrentStatus != tt.currentStatus {
				t.Fatalf("expected current status %s to reach service, got %q", tt.currentStatus, stub.lastUpdateAcademy.CurrentStatus)
			}
		})
	}
}

func TestUpdateAcademyMemberStatusRejectsNoopTransition(t *testing.T) {
	service := &oracleAccountService{}

	_, err := service.UpdateAcademyMemberStatus(
		context.Background(),
		academyMemberStatusUpdateInput{
			AcademyCode:   "abc123def456",
			ActorRoleCode: "ROOT",
			LoginID:       "academy-member",
			CurrentStatus: "ACTIVE",
			NextStatus:    "ACTIVE",
		},
	)
	if err == nil {
		t.Fatal("expected noop transition to fail")
	}
}
