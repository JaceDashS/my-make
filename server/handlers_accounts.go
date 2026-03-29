package main

import (
	"net/http"
)

func tokenPreviewFromRequest(r *http.Request) string {
	token, ok := readSessionCookie(r)
	if !ok {
		return ""
	}

	return tokenPreview(token)
}

func tokenPreview(token string) string {
	if token == "" {
		return ""
	}
	if len(token) <= 8 {
		return token
	}

	return token[:8]
}

func (a *app) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "login", "oracle account service is not configured")
		return
	}

	input, err := decodeJSONBody[loginInput](r)
	if err != nil {
		logServerRuntime("accounts", "login:decode-error", map[string]any{
			"error": err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "login", err.Error())
		return
	}

	logServerRuntime("accounts", "login:start", map[string]any{
		"loginId": input.LoginID,
		"token":   tokenPreviewFromRequest(r),
	})

	result, err := a.accounts.Login(r.Context(), input)
	if err != nil {
		logServerRuntime("accounts", "login:error", map[string]any{
			"error":   err.Error(),
			"loginId": input.LoginID,
		})
		writeAPIError(w, http.StatusBadRequest, "login", err.Error())
		return
	}

	logServerRuntime("accounts", "login:success", map[string]any{
		"academyCode": result.AcademyCode,
		"loginId":     result.LoginID,
		"roleCode":    result.RoleCode,
	})
	token, err := a.ensureSessionManager().Create(result)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "session", err.Error())
		return
	}
	logServerRuntime("accounts", "login:session-created", map[string]any{
		"loginId":     result.LoginID,
		"roleCode":    result.RoleCode,
		"tokenPrefix": tokenPreview(token),
	})
	setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	token, ok := readSessionCookie(r)
	if !ok {
		writeAPIError(w, http.StatusUnauthorized, "session", "No active session was found.")
		return
	}

	account, ok := a.ensureSessionManager().Get(token)
	if !ok {
		clearSessionCookie(w)
		writeAPIError(w, http.StatusUnauthorized, "session", "No active session was found.")
		return
	}

	account.Status = "ok"
	account.Message = "Active session found."
	writeJSON(w, http.StatusOK, account)
}

func (a *app) handleProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "profile", "oracle account service is not configured")
		return
	}

	token, ok := readSessionCookie(r)
	if !ok {
		logServerRuntime("accounts", "profile:no-cookie", map[string]any{})
		writeAPIError(w, http.StatusUnauthorized, "profile", "No active session was found.")
		return
	}

	account, ok := a.ensureSessionManager().Get(token)
	if !ok {
		logServerRuntime("accounts", "profile:session-miss", map[string]any{
			"tokenPrefix": tokenPreview(token),
		})
		clearSessionCookie(w)
		writeAPIError(w, http.StatusUnauthorized, "profile", "No active session was found.")
		return
	}
	logServerRuntime("accounts", "profile:session-hit", map[string]any{
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
		"tokenPrefix": tokenPreview(token),
	})

	result, err := a.accounts.GetProfile(r.Context(), account.LoginID)
	if err != nil {
		logServerRuntime("accounts", "profile:error", map[string]any{
			"loginId":     account.LoginID,
			"tokenPrefix": tokenPreview(token),
			"error":       err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "profile", err.Error())
		return
	}
	logServerRuntime("accounts", "profile:success", map[string]any{
		"loginId":        result.LoginID,
		"roleCode":       result.RoleCode,
		"detailsCount":   len(result.Details),
		"profileCode":    result.AccountCode,
		"sessionLoginId": account.LoginID,
		"tokenPrefix":    tokenPreview(token),
	})

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "profile-update", "oracle account service is not configured")
		return
	}

	token, ok := readSessionCookie(r)
	if !ok {
		writeAPIError(w, http.StatusUnauthorized, "profile-update", "No active session was found.")
		return
	}

	account, ok := a.ensureSessionManager().Get(token)
	if !ok {
		clearSessionCookie(w)
		writeAPIError(w, http.StatusUnauthorized, "profile-update", "No active session was found.")
		return
	}

	input, err := decodeJSONBody[profileUpdateInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "profile-update", err.Error())
		return
	}

	logServerRuntime("accounts", "profile-update:start", map[string]any{
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
		"tokenPrefix": tokenPreview(token),
	})

	result, err := a.accounts.UpdateProfile(r.Context(), account, input)
	if err != nil {
		logServerRuntime("accounts", "profile-update:error", map[string]any{
			"loginId":     account.LoginID,
			"roleCode":    account.RoleCode,
			"tokenPrefix": tokenPreview(token),
			"error":       err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "profile-update", err.Error())
		return
	}

	logServerRuntime("accounts", "profile-update:success", map[string]any{
		"loginId":      result.LoginID,
		"roleCode":     result.RoleCode,
		"detailsCount": len(result.Details),
		"tokenPrefix":  tokenPreview(token),
	})

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if token, ok := readSessionCookie(r); ok {
		logServerRuntime("accounts", "logout:start", map[string]any{
			"tokenPrefix": tokenPreview(token),
		})
		a.ensureSessionManager().Delete(token)
	}
	clearSessionCookie(w)
	logServerRuntime("accounts", "logout:success", map[string]any{
		"token": tokenPreviewFromRequest(r),
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"message": "Signed out successfully.",
	})
}

func (a *app) handleRootRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "root-register", "oracle account service is not configured")
		return
	}

	input, err := decodeJSONBody[rootRegisterInput](r)
	if err != nil {
		logServerRuntime("accounts", "root-register:decode-error", map[string]any{
			"error": err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "root-register", err.Error())
		return
	}

	logServerRuntime("accounts", "root-register:start", map[string]any{
		"academyName": input.AcademyName,
		"licenseCode": input.LicenseCode,
		"loginId":     input.RootLoginID,
	})

	result, err := a.accounts.RegisterRoot(r.Context(), input)
	if err != nil {
		logServerRuntime("accounts", "root-register:error", map[string]any{
			"error":       err.Error(),
			"academyName": input.AcademyName,
			"licenseCode": input.LicenseCode,
			"loginId":     input.RootLoginID,
		})
		writeAPIError(w, http.StatusBadRequest, "root-register", err.Error())
		return
	}

	logServerRuntime("accounts", "root-register:success", map[string]any{
		"academyCode": result.AcademyCode,
		"academyName": result.AcademyName,
		"loginId":     result.LoginID,
		"roleCode":    result.RoleCode,
	})
	token, err := a.ensureSessionManager().Create(result)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "session", err.Error())
		return
	}
	setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleMemberRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "member-register", "oracle account service is not configured")
		return
	}

	input, err := decodeJSONBody[memberRegisterInput](r)
	if err != nil {
		logServerRuntime("accounts", "member-register:decode-error", map[string]any{
			"error": err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "member-register", err.Error())
		return
	}

	logServerRuntime("accounts", "member-register:start", map[string]any{
		"loginId":           input.LoginID,
		"requestedRoleCode": input.RequestedRoleCode,
	})

	result, err := a.accounts.RegisterMember(r.Context(), input)
	if err != nil {
		logServerRuntime("accounts", "member-register:error", map[string]any{
			"error":             err.Error(),
			"loginId":           input.LoginID,
			"requestedRoleCode": input.RequestedRoleCode,
		})
		writeAPIError(w, http.StatusBadRequest, "member-register", err.Error())
		return
	}

	logServerRuntime("accounts", "member-register:success", map[string]any{
		"loginId":  result.LoginID,
		"roleCode": result.RoleCode,
	})
	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleRenewLicense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.accounts == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "renew-license", "oracle account service is not configured")
		return
	}

	input, err := decodeJSONBody[renewLicenseInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "renew-license", err.Error())
		return
	}

	result, err := a.accounts.RenewLicense(r.Context(), input)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "renew-license", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}
