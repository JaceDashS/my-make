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
