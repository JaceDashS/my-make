package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"time"
)

type app struct {
	accounts     accountService
	devTools     devToolsRunner
	health       healthChecker
	inventory    inventoryService
	reservations reservationService
	sessions     *sessionManager
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

	if err := runStartupDatabaseHealthCheck(application.health); err != nil {
		log.Fatalf("startup aborted: %v", err)
	}

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

func runStartupDatabaseHealthCheck(health healthChecker) error {
	if health == nil {
		log.Printf("startup/db-health:start")
		log.Printf("startup/db-health:fail reason=health-service-unavailable")
		return errStartupHealthUnavailable
	}

	log.Printf("startup/db-health:start")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := health.Check(ctx)
	if err != nil {
		log.Printf("startup/db-health:fail error=%v", err)
		return err
	}

	log.Printf(
		"startup/db-health:success status=%s database=%s storedDate=%s today=%s currentTimestamp=%s",
		result.Status,
		result.Database,
		result.StoredDate,
		result.Today,
		result.CurrentTimestamp,
	)

	return nil
}

var errStartupHealthUnavailable = &startupError{message: "database health service is not configured"}

type startupError struct {
	message string
}

func (e *startupError) Error() string {
	if e == nil {
		return ""
	}
	return e.message
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

	var reservations reservationService
	loadedReservations, err := newReservationServiceFromEnv()
	if err != nil {
		log.Printf("oracle reservation service unavailable: %v", err)
	} else {
		reservations = loadedReservations
	}

	var inventory inventoryService
	loadedInventory, err := newInventoryServiceFromEnv()
	if err != nil {
		log.Printf("oracle inventory service unavailable: %v", err)
	} else {
		inventory = loadedInventory
	}

	return &app{
		accounts:     accounts,
		devTools:     devTools,
		health:       health,
		inventory:    inventory,
		reservations: reservations,
		sessions:     newSessionManager(),
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
