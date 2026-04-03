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
	mux.HandleFunc("/api/inventory/list", a.handleAcademyInventoryList)
	mux.HandleFunc("/api/inventory/create", a.handleAcademyInventoryCreate)
	mux.HandleFunc("/api/inventory/update", a.handleAcademyInventoryUpdate)
	mux.HandleFunc("/api/inventory/delete", a.handleAcademyInventoryDelete)
	mux.HandleFunc("/api/inventory/sell", a.handleAcademyInventorySell)
	mux.HandleFunc("/api/inventory/search", a.handlePresetInventorySearch)
	mux.HandleFunc("/api/reservations/student/availability", a.handleStudentReservationAvailability)
	mux.HandleFunc("/api/reservations/student/list", a.handleStudentReservationList)
	mux.HandleFunc("/api/reservations/student/create", a.handleStudentReservationCreate)
	mux.HandleFunc("/api/reservations/student/cancel", a.handleStudentReservationCancel)
	mux.HandleFunc("/api/reservations/teacher/list", a.handleTeacherReservationList)
	mux.HandleFunc("/api/reservations/teacher/approve", a.handleTeacherReservationApprove)
	mux.HandleFunc("/api/reservations/teacher/cancel", a.handleTeacherReservationCancel)
	mux.HandleFunc("/api/members/academy/search", a.handleSearchAcademyMembers)
	mux.HandleFunc("/api/members/academy/status", a.handleUpdateAcademyMemberStatus)
	mux.HandleFunc("/api/members/academy/profile", a.handleGetAcademyMemberProfile)
	mux.HandleFunc("/api/members/academy/profile/update", a.handleUpdateAcademyMemberProfile)
	mux.HandleFunc("/api/members/pending/search", a.handleSearchPendingMembers)
	mux.HandleFunc("/api/members/pending/approve", a.handleApprovePendingMember)
	mux.HandleFunc("/api/licenses/renew", a.handleRenewLicense)
	mux.HandleFunc("/api/dev-tools/tables/init", a.handleInitializeTables)
	mux.HandleFunc("/api/dev-tools/tables/init-and-inject", a.handleInitializeTablesAndInjectTestData)
	mux.HandleFunc("/api/dev-tools/licenses", a.handleCreateLicense)
	mux.HandleFunc("/api/dev-tools/server-log", a.handleEmitServerLog)
	return corsMiddleware(mux)
}

// corsMiddleware allows the Electron webpack-dev-server (localhost:3001) to
// call the API during development without CORS errors.
func corsMiddleware(next http.Handler) http.Handler {
	const devOrigin = "http://localhost:3001"
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") == devOrigin {
			w.Header().Set("Access-Control-Allow-Origin", devOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
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
