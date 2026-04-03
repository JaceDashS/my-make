package main

import (
	"net/http"
)

func (a *app) handleSearchAcademyMembers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "search-academy-members", "oracle account service is not configured")
		return
	}

	input, err := decodeJSONBody[academyMemberSearchInput](r)
	if err != nil {
		logServerRuntime("members", "academy-search:decode-error", map[string]any{
			"error": err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "search-academy-members", err.Error())
		return
	}

	logServerRuntime("members", "academy-search:start", map[string]any{
		"academyCode":  input.AcademyCode,
		"field":        input.Field,
		"query":        input.Query,
		"roleCode":     input.ActorRoleCode,
		"statusFilter": input.StatusFilter,
	})

	result, err := a.accounts.SearchAcademyMembers(r.Context(), input)
	if err != nil {
		logServerRuntime("members", "academy-search:error", map[string]any{
			"academyCode":  input.AcademyCode,
			"error":        err.Error(),
			"field":        input.Field,
			"query":        input.Query,
			"roleCode":     input.ActorRoleCode,
			"statusFilter": input.StatusFilter,
		})
		writeAPIError(w, http.StatusBadRequest, "search-academy-members", err.Error())
		return
	}

	logServerRuntime("members", "academy-search:success", map[string]any{
		"academyCode":  input.AcademyCode,
		"count":        len(result.Members),
		"field":        input.Field,
		"query":        input.Query,
		"statusFilter": input.StatusFilter,
	})
	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleUpdateAcademyMemberStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "update-academy-member-status", "oracle account service is not configured")
		return
	}

	input, err := decodeJSONBody[academyMemberStatusUpdateInput](r)
	if err != nil {
		logServerRuntime("members", "academy-status:decode-error", map[string]any{
			"error": err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "update-academy-member-status", err.Error())
		return
	}

	logServerRuntime("members", "academy-status:start", map[string]any{
		"academyCode":   input.AcademyCode,
		"currentStatus": input.CurrentStatus,
		"loginId":       input.LoginID,
		"nextStatus":    input.NextStatus,
		"roleCode":      input.ActorRoleCode,
	})

	result, err := a.accounts.UpdateAcademyMemberStatus(r.Context(), input)
	if err != nil {
		logServerRuntime("members", "academy-status:error", map[string]any{
			"academyCode":   input.AcademyCode,
			"currentStatus": input.CurrentStatus,
			"error":         err.Error(),
			"loginId":       input.LoginID,
			"nextStatus":    input.NextStatus,
			"roleCode":      input.ActorRoleCode,
		})
		writeAPIError(w, http.StatusBadRequest, "update-academy-member-status", err.Error())
		return
	}

	logServerRuntime("members", "academy-status:success", map[string]any{
		"academyCode": input.AcademyCode,
		"loginId":     result.LoginID,
		"nextStatus":  result.NextStatus,
	})
	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleGetAcademyMemberProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "get-academy-member-profile", "oracle account service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "get-academy-member-profile")
	if !ok {
		return
	}

	input, err := decodeJSONBody[academyMemberProfileInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "get-academy-member-profile", err.Error())
		return
	}

	result, err := a.accounts.GetAcademyMemberProfile(r.Context(), account, input)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "get-academy-member-profile", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleUpdateAcademyMemberProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "update-academy-member-profile", "oracle account service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "update-academy-member-profile")
	if !ok {
		return
	}

	input, err := decodeJSONBody[academyMemberProfileUpdateInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "update-academy-member-profile", err.Error())
		return
	}

	result, err := a.accounts.UpdateAcademyMemberProfile(r.Context(), account, input)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "update-academy-member-profile", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleSearchPendingMembers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "search-pending-members", "oracle account service is not configured")
		return
	}

	input, err := decodeJSONBody[pendingMemberSearchInput](r)
	if err != nil {
		logServerRuntime("members", "pending-search:decode-error", map[string]any{
			"error": err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "search-pending-members", err.Error())
		return
	}

	logServerRuntime("members", "pending-search:start", map[string]any{
		"academyCode": input.AcademyCode,
		"field":       input.Field,
		"query":       input.Query,
		"roleCode":    input.ActorRoleCode,
	})

	result, err := a.accounts.SearchPendingMembers(r.Context(), input)
	if err != nil {
		logServerRuntime("members", "pending-search:error", map[string]any{
			"academyCode": input.AcademyCode,
			"error":       err.Error(),
			"field":       input.Field,
			"query":       input.Query,
			"roleCode":    input.ActorRoleCode,
		})
		writeAPIError(w, http.StatusBadRequest, "search-pending-members", err.Error())
		return
	}

	logServerRuntime("members", "pending-search:success", map[string]any{
		"academyCode": input.AcademyCode,
		"count":       len(result.Members),
		"field":       input.Field,
		"query":       input.Query,
	})
	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleApprovePendingMember(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "approve-pending-member", "oracle account service is not configured")
		return
	}

	input, err := decodeJSONBody[approvePendingMemberInput](r)
	if err != nil {
		logServerRuntime("members", "pending-approve:decode-error", map[string]any{
			"error": err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "approve-pending-member", err.Error())
		return
	}

	logServerRuntime("members", "pending-approve:start", map[string]any{
		"academyCode":           input.AcademyCode,
		"loginId":               input.LoginID,
		"primaryTeacherLoginId": input.PrimaryTeacherLoginID,
		"roleCode":              input.ActorRoleCode,
	})

	result, err := a.accounts.ApprovePendingMember(r.Context(), input)
	if err != nil {
		logServerRuntime("members", "pending-approve:error", map[string]any{
			"academyCode":           input.AcademyCode,
			"error":                 err.Error(),
			"loginId":               input.LoginID,
			"primaryTeacherLoginId": input.PrimaryTeacherLoginID,
			"roleCode":              input.ActorRoleCode,
		})
		writeAPIError(w, http.StatusBadRequest, "approve-pending-member", err.Error())
		return
	}

	logServerRuntime("members", "pending-approve:success", map[string]any{
		"academyCode": input.AcademyCode,
		"loginId":     result.LoginID,
	})
	writeJSON(w, http.StatusOK, result)
}
