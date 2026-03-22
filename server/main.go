package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type app struct {
	health *healthService
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

	log.Printf("server listening on :%s", addr)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func newApp() *app {
	health, err := newHealthServiceFromEnv()
	if err != nil {
		log.Printf("oracle health service unavailable: %v", err)
	}

	return &app{
		health: health,
	}
}

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", a.handleRoot)
	mux.HandleFunc("/health", a.handleHealth)
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
