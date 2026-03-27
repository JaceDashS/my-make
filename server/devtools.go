package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"
)

const (
	defaultLicenseDuration = 365 * 24 * time.Hour
)

var managedDropStatements = []string{
	"DROP TABLE MAIMEI_ACCOUNTS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_STUDENTS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_TEACHERS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_STAFF CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_LICENSES CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_ACADEMIES CASCADE CONSTRAINTS PURGE",
	"DROP SEQUENCE MAIMEI_ACCOUNTS_SEQ",
	"DROP SEQUENCE MAIMEI_STUDENT_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_STUDENTS_SEQ",
	"DROP SEQUENCE MAIMEI_TEACHER_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_TEACHERS_SEQ",
	"DROP SEQUENCE MAIMEI_STAFF_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_STAFF_SEQ",
	"DROP SEQUENCE MAIMEI_LICENSES_SEQ",
	"DROP SEQUENCE MAIMEI_ACADEMIES_SEQ",
}

type devToolsResponse struct {
	Status      string   `json:"status"`
	Message     string   `json:"message"`
	Migrations  []string `json:"migrations,omitempty"`
	LicenseCode string   `json:"licenseCode,omitempty"`
	ExpiresAt   string   `json:"expiresAt,omitempty"`
}

type devToolsRunner interface {
	InitializeTables(ctx context.Context) (devToolsResponse, error)
	CreateLicense(ctx context.Context) (devToolsResponse, error)
}

type devToolsService struct {
	db            *sql.DB
	now           func() time.Time
	migrationsDir string
}

func newDevToolsServiceFromEnv() (*devToolsService, error) {
	cfg, err := loadOracleConfigFromEnv()
	if err != nil {
		return nil, err
	}

	db, err := openOracleDB(cfg)
	if err != nil {
		return nil, err
	}

	return &devToolsService{
		db:            db,
		now:           time.Now,
		migrationsDir: resolveMigrationsDir(),
	}, nil
}

func resolveMigrationsDir() string {
	candidates := []string{
		filepath.Join("server", "migrations"),
		"migrations",
	}

	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate
		}
	}

	return candidates[0]
}

func (s *devToolsService) InitializeTables(ctx context.Context) (devToolsResponse, error) {
	if s == nil || s.db == nil {
		return devToolsResponse{}, fmt.Errorf("oracle dev tools service is not configured")
	}

	for _, statement := range managedDropStatements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil && !isIgnorableDropError(err) {
			return devToolsResponse{}, fmt.Errorf("reset managed objects: %w", err)
		}
	}

	migrationFiles, err := loadMigrationFiles(s.migrationsDir)
	if err != nil {
		return devToolsResponse{}, err
	}

	applied := make([]string, 0, len(migrationFiles))
	for _, migrationFile := range migrationFiles {
		statements, err := parseMigrationStatements(migrationFile)
		if err != nil {
			return devToolsResponse{}, err
		}

		for _, statement := range statements {
			if _, err := s.db.ExecContext(ctx, statement); err != nil {
				return devToolsResponse{}, fmt.Errorf("apply migration %s: %w", filepath.Base(migrationFile), err)
			}
		}

		applied = append(applied, filepath.Base(migrationFile))
	}

	return devToolsResponse{
		Status:     "ok",
		Message:    "Managed tables have been initialized.",
		Migrations: applied,
	}, nil
}

func (s *devToolsService) CreateLicense(ctx context.Context) (devToolsResponse, error) {
	if s == nil || s.db == nil {
		return devToolsResponse{}, fmt.Errorf("oracle dev tools service is not configured")
	}

	now := time.Now
	if s.now != nil {
		now = s.now
	}

	expiresAt := now().Add(defaultLicenseDuration).UTC()

	for range 5 {
		licenseCode, err := generateLicenseCode()
		if err != nil {
			return devToolsResponse{}, fmt.Errorf("generate license code: %w", err)
		}

		query := `
INSERT INTO MAIMEI_LICENSES (
    LICENSE_CODE,
    STATUS_CODE,
    EXPIRES_AT
) VALUES (
    :1,
    'UNASSIGNED',
    :2
)`

		if _, err := s.db.ExecContext(ctx, query, licenseCode, expiresAt); err != nil {
			if isUniqueConstraintError(err) {
				continue
			}
			return devToolsResponse{}, fmt.Errorf("create license: %w", err)
		}

		return devToolsResponse{
			Status:      "ok",
			Message:     "License has been created.",
			LicenseCode: licenseCode,
			ExpiresAt:   expiresAt.Format(time.RFC3339),
		}, nil
	}

	return devToolsResponse{}, fmt.Errorf("create license: could not generate a unique license code")
}

func loadMigrationFiles(migrationsDir string) ([]string, error) {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return nil, fmt.Errorf("read migrations directory: %w", err)
	}

	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".oracle.sql") {
			continue
		}

		files = append(files, filepath.Join(migrationsDir, entry.Name()))
	}

	slices.Sort(files)
	if len(files) == 0 {
		return nil, fmt.Errorf("no migration files found in %s", migrationsDir)
	}

	return files, nil
}

func parseMigrationStatements(path string) ([]string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read migration file %s: %w", filepath.Base(path), err)
	}

	lines := strings.Split(string(content), "\n")
	statements := make([]string, 0, 8)
	var builder strings.Builder
	inTriggerBlock := false

	flush := func(trimSemicolon bool) {
		statement := strings.TrimSpace(builder.String())
		if trimSemicolon {
			statement = strings.TrimSuffix(statement, ";")
			statement = strings.TrimSpace(statement)
		}
		if statement != "" {
			statements = append(statements, statement)
		}
		builder.Reset()
	}

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		upper := strings.ToUpper(trimmed)

		if trimmed == "" {
			continue
		}

		if strings.HasPrefix(trimmed, "--") {
			continue
		}

		if upper == "/" {
			flush(false)
			inTriggerBlock = false
			continue
		}

		builder.WriteString(line)
		builder.WriteString("\n")

		if strings.HasPrefix(upper, "CREATE OR REPLACE TRIGGER") {
			inTriggerBlock = true
		}

		if !inTriggerBlock && strings.HasSuffix(trimmed, ";") {
			flush(true)
		}
	}

	flush(true)

	return statements, nil
}

func generateLicenseCode() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	return strings.ToUpper(hex.EncodeToString(buf)), nil
}

func isIgnorableDropError(err error) bool {
	message := err.Error()
	return strings.Contains(message, "ORA-00942") || strings.Contains(message, "ORA-02289")
}

func isUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}

	message := err.Error()
	return strings.Contains(message, "ORA-00001") || errors.Is(err, sql.ErrNoRows)
}
