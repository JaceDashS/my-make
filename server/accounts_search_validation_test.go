package main

import (
	"context"
	"strings"
	"testing"
)

func TestBuildPendingMembersSearchQueryUsesPartialMatchForDisplayName(t *testing.T) {
	query := buildPendingMembersSearchQuery(pendingSearchFields["displayName"])

	if !strings.Contains(query, "LIKE '%' || LOWER(:1) || '%'") {
		t.Fatalf("expected display name search query to use partial match, got %q", query)
	}
}

func TestBuildPendingMembersSearchQueryNormalizesPhoneForPartialMatch(t *testing.T) {
	query := buildPendingMembersSearchQuery(pendingSearchFields["phone"])

	if !strings.Contains(query, "REPLACE(") || !strings.Contains(query, "LIKE '%' || REPLACE(:1, '-', '') || '%'") {
		t.Fatalf("expected phone search query to normalize phone digits for partial match, got %q", query)
	}
}

func TestValidatePendingSearchQueryAllowsPartialPhoneQuery(t *testing.T) {
	if err := validatePendingSearchQuery("phone", "010-1234"); err != nil {
		t.Fatalf("expected partial phone query to pass validation, got %q", err.Error())
	}
}

func TestSearchPendingMembersRejectsSingleCharacterNameQuery(t *testing.T) {
	service := &oracleAccountService{}

	_, err := service.SearchPendingMembers(context.Background(), pendingMemberSearchInput{
		AcademyCode:   "abc123def456",
		ActorRoleCode: "ROOT",
		Field:         "displayName",
		Query:         "가",
	})
	if err == nil {
		t.Fatal("expected single-character name query to fail validation")
	}

	if !strings.Contains(err.Error(), "at least two characters") {
		t.Fatalf("expected two-character validation error, got %q", err.Error())
	}
}

func TestValidatePendingSearchQueryAllowsPartialEmailQuery(t *testing.T) {
	if err := validatePendingSearchQuery("email", "student1@exam"); err != nil {
		t.Fatalf("expected partial email query to pass validation, got %q", err.Error())
	}
}

func TestBuildAcademyMembersSearchQueryUsesAcademyAndAllStatusFilter(t *testing.T) {
	query := buildAcademyMembersSearchQuery(pendingSearchFields["displayName"], "ALL")

	if !strings.Contains(query, "ACADEMY_CODE = :1") {
		t.Fatalf("expected academy code filter in query, got %q", query)
	}

	if !strings.Contains(query, "STATUS_CODE IN ('ACTIVE', 'HOLD', 'INACTIVE')") {
		t.Fatalf("expected all-status filter in query, got %q", query)
	}

	if !strings.Contains(query, "LIKE '%' || LOWER(:2) || '%'") {
		t.Fatalf("expected academy members query to reuse normalized search binding, got %q", query)
	}

	if !strings.Contains(query, "adm.ROLE_CODE AS role_code") {
		t.Fatalf("expected academy admin roles to keep their stored role code, got %q", query)
	}
}

func TestBuildAcademyMembersSearchQueryFiltersSpecificStatus(t *testing.T) {
	query := buildAcademyMembersSearchQuery(pendingSearchFields["email"], "ACTIVE")

	if !strings.Contains(query, "AND adm.STATUS_CODE = 'ACTIVE'") {
		t.Fatalf("expected active filter for admins, got %q", query)
	}

	if !strings.Contains(query, "AND tch.STATUS_CODE = 'ACTIVE'") {
		t.Fatalf("expected active filter for teachers, got %q", query)
	}
}

func TestSearchAcademyMembersRejectsInvalidStatusFilter(t *testing.T) {
	service := &oracleAccountService{}

	_, err := service.SearchAcademyMembers(context.Background(), academyMemberSearchInput{
		AcademyCode:   "abc123def456",
		ActorRoleCode: "ROOT",
		Field:         "displayName",
		Query:         "Kim",
		StatusFilter:  "SUSPENDED",
	})
	if err == nil {
		t.Fatal("expected invalid status filter to fail")
	}

	if !strings.Contains(err.Error(), "valid status filter") {
		t.Fatalf("expected status filter validation error, got %q", err.Error())
	}
}


func TestValidateAcademyMemberStatusTransitionAllowsConfiguredTransitions(t *testing.T) {
	allowed := []struct {
		current string
		next    string
	}{
		{current: "ACTIVE", next: "HOLD"},
		{current: "ACTIVE", next: "INACTIVE"},
		{current: "HOLD", next: "ACTIVE"},
		{current: "HOLD", next: "INACTIVE"},
		{current: "INACTIVE", next: "ACTIVE"},
		{current: "INACTIVE", next: "HOLD"},
	}

	for _, tt := range allowed {
		if err := validateAcademyMemberStatusTransition(tt.current, tt.next); err != nil {
			t.Fatalf("expected %s -> %s to be allowed, got %q", tt.current, tt.next, err.Error())
		}
	}
}

func TestValidateAcademyMemberTargetRoleRejectsRoot(t *testing.T) {
	err := validateAcademyMemberTargetRole("ROOT")
	if err == nil {
		t.Fatal("expected root target role to be rejected")
	}
}
