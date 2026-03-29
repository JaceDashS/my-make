package main

import (
	"net/http"
)

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
	mux.HandleFunc("/api/dev-tools/server-log", a.handleEmitServerLog)
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
