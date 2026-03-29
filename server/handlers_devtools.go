package main

import (
	"log"
	"net/http"
)

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

func (a *app) handleEmitServerLog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	log.Printf("[dev-tools/server-log] emitted minimal server log")

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"message": "Minimal server log emitted.",
	})
}
