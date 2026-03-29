package main

import (
	"context"
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

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
