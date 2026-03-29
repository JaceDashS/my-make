package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
)

type app struct {
	accounts accountService
	devTools devToolsRunner
	health   healthChecker
	sessions *sessionManager
}

type healthChecker interface {
	Check(ctx context.Context) (healthResponse, error)
}

func main() {
	if err := loadRuntimeEnv(); err != nil {
		log.Printf("failed to load env file: %v", err)
	}

	addr := envOrDefault("PORT", "8080")
	application := newApp()

	server := &http.Server{
		Addr:    ":" + addr,
		Handler: application.routes(),
	}

	listener, err := net.Listen("tcp", ":"+addr)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("server listening on :%s", addr)

	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func newApp() *app {
	var health healthChecker
	loadedHealth, err := newHealthServiceFromEnv()
	if err != nil {
		log.Printf("oracle health service unavailable: %v", err)
	} else {
		health = loadedHealth
	}

	var devTools devToolsRunner
	loadedDevTools, err := newDevToolsServiceFromEnv()
	if err != nil {
		log.Printf("oracle dev tools service unavailable: %v", err)
	} else {
		devTools = loadedDevTools
	}

	var accounts accountService
	loadedAccounts, err := newAccountServiceFromEnv()
	if err != nil {
		log.Printf("oracle account service unavailable: %v", err)
	} else {
		accounts = loadedAccounts
	}

	return &app{
		accounts: accounts,
		devTools: devTools,
		health:   health,
		sessions: newSessionManager(),
	}
}

func (a *app) ensureSessionManager() *sessionManager {
	if a.sessions == nil {
		a.sessions = newSessionManager()
	}

	return a.sessions
}

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", a.handleRoot)
	mux.HandleFunc("/health", a.handleHealth)
	mux.HandleFunc("/api/accounts/login", a.handleLogin)
	mux.HandleFunc("/api/accounts/session", a.handleSession)
	mux.HandleFunc("/api/accounts/profile", a.handleProfile)
	mux.HandleFunc("/api/accounts/profile/update", a.handleUpdateProfile)
	mux.HandleFunc("/api/accounts/logout", a.handleLogout)
	mux.HandleFunc("/api/accounts/member-register", a.handleMemberRegister)
	mux.HandleFunc("/api/accounts/root-register", a.handleRootRegister)
	mux.HandleFunc("/api/members/academy/search", a.handleSearchAcademyMembers)
	mux.HandleFunc("/api/members/academy/status", a.handleUpdateAcademyMemberStatus)
	mux.HandleFunc("/api/members/pending/search", a.handleSearchPendingMembers)
	mux.HandleFunc("/api/members/pending/approve", a.handleApprovePendingMember)
	mux.HandleFunc("/api/licenses/renew", a.handleRenewLicense)
	mux.HandleFunc("/api/dev-tools/tables/init", a.handleInitializeTables)
	mux.HandleFunc("/api/dev-tools/tables/init-and-inject", a.handleInitializeTablesAndInjectTestData)
	mux.HandleFunc("/api/dev-tools/licenses", a.handleCreateLicense)
	mux.HandleFunc("/api/dev-tools/client-logs", a.handleClientLogs)
	return mux
}

func (a *app) handleRoot(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"service": "my-make-server",
		"status":  "running",
	})
}

func (a *app) handleHealth(w http.ResponseWriter, r *http.Request) {
	if a.health == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "health", "oracle health service is not configured")
		return
	}

	result, err := a.health.Check(r.Context())
	if err != nil {
		writeAPIError(w, http.StatusServiceUnavailable, "health", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleInitializeTables(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.devTools == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "initialize-tables", "oracle dev tools service is not configured")
		return
	}

	result, err := a.devTools.InitializeTables(r.Context())
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "initialize-tables", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleInitializeTablesAndInjectTestData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.devTools == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "initialize-and-inject-test-data", "oracle dev tools service is not configured")
		return
	}

	logServerRuntime("dev-tools", "init-and-inject:start", map[string]any{
		"academyName": seededAcademyName,
		"rootLoginId": seededRootLoginID,
	})

	result, err := a.devTools.InitializeTablesAndInjectTestData(r.Context())
	if err != nil {
		logServerRuntime("dev-tools", "init-and-inject:error", map[string]any{
			"academyName": seededAcademyName,
			"error":       err.Error(),
			"rootLoginId": seededRootLoginID,
		})
		writeAPIError(w, http.StatusInternalServerError, "initialize-and-inject-test-data", err.Error())
		return
	}

	logServerRuntime("dev-tools", "init-and-inject:success", map[string]any{
		"academyName":     result.AcademyName,
		"licenseCode":     result.LicenseCode,
		"pendingAdmins":   result.PendingAdmins,
		"pendingStudents": result.PendingStudents,
		"pendingTeachers": result.PendingTeachers,
		"rootLoginId":     result.RootLoginID,
	})

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleCreateLicense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.devTools == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "create-license", "oracle dev tools service is not configured")
		return
	}

	result, err := a.devTools.CreateLicense(r.Context())
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "create-license", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
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
		"academyCode": input.AcademyCode,
		"loginId":     input.LoginID,
		"roleCode":    input.ActorRoleCode,
	})

	result, err := a.accounts.ApprovePendingMember(r.Context(), input)
	if err != nil {
		logServerRuntime("members", "pending-approve:error", map[string]any{
			"academyCode": input.AcademyCode,
			"error":       err.Error(),
			"loginId":     input.LoginID,
			"roleCode":    input.ActorRoleCode,
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

func (a *app) handleClientLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	entry, err := decodeJSONBody[clientLogEntry](r)
	if err != nil {
		logServerRuntime("client-logs", "decode-error", map[string]any{
			"error": err.Error(),
		})
		writeAPIError(w, http.StatusBadRequest, "client-logs", err.Error())
		return
	}

	if err := appendClientLog(entry); err != nil {
		logServerRuntime("client-logs", "append-error", map[string]any{
			"channel": entry.Channel,
			"error":   err.Error(),
			"event":   entry.Event,
		})
		writeAPIError(w, http.StatusInternalServerError, "client-logs", err.Error())
		return
	}

	logClientRuntime(entry)
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	}
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
