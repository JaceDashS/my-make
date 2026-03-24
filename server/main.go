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
	health, err := newHealthServiceFromEnv()
	if err != nil {
		log.Printf("oracle health service unavailable: %v", err)
	}

	devTools, err := newDevToolsServiceFromEnv()
	if err != nil {
		log.Printf("oracle dev tools service unavailable: %v", err)
	}

	accounts, err := newAccountServiceFromEnv()
	if err != nil {
		log.Printf("oracle account service unavailable: %v", err)
	}

	return &app{
		accounts: accounts,
		devTools: devTools,
		health:   health,
	}
}

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", a.handleRoot)
	mux.HandleFunc("/health", a.handleHealth)
	mux.HandleFunc("/api/accounts/login", a.handleLogin)
	mux.HandleFunc("/api/accounts/member-register", a.handleMemberRegister)
	mux.HandleFunc("/api/accounts/root-register", a.handleRootRegister)
	mux.HandleFunc("/api/licenses/renew", a.handleRenewLicense)
	mux.HandleFunc("/api/dev-tools/tables/init", a.handleInitializeTables)
	mux.HandleFunc("/api/dev-tools/licenses", a.handleCreateLicense)
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
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"error":  "oracle health service is not configured",
		})
		return
	}

	result, err := a.health.Check(r.Context())
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"error":  err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleInitializeTables(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	if a.devTools == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"error":  "oracle dev tools service is not configured",
		})
		return
	}

	result, err := a.devTools.InitializeTables(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleCreateLicense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	if a.devTools == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"error":  "oracle dev tools service is not configured",
		})
		return
	}

	result, err := a.devTools.CreateLicense(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	if a.accounts == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"error":  "oracle account service is not configured",
		})
		return
	}

	input, err := decodeJSONBody[loginInput](r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	result, err := a.accounts.Login(r.Context(), input)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleRootRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	if a.accounts == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"error":  "oracle account service is not configured",
		})
		return
	}

	input, err := decodeJSONBody[rootRegisterInput](r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	result, err := a.accounts.RegisterRoot(r.Context(), input)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleMemberRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	if a.accounts == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"error":  "oracle account service is not configured",
		})
		return
	}

	input, err := decodeJSONBody[memberRegisterInput](r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	result, err := a.accounts.RegisterMember(r.Context(), input)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleRenewLicense(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	if a.accounts == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"error":  "oracle account service is not configured",
		})
		return
	}

	input, err := decodeJSONBody[renewLicenseInput](r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	result, err := a.accounts.RenewLicense(r.Context(), input)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, result)
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
