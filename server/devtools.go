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
	"sync"
	"time"
)

const (
	defaultLicenseDuration = 365 * 24 * time.Hour
	seededAcademyName      = "Test Academy"
	seededRootLoginID      = "root"
	seededRootDisplayName  = "root"
	seededRootEmail        = "root@example.com"
	seededRootPassword     = "root"
	seededSeedMemberCount  = 5
)

var managedDropStatements = []string{
	"DROP TABLE MAIMEI_STUDENTS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_TEACHERS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_ADMINS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_LICENSES CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_ACADEMIES CASCADE CONSTRAINTS PURGE",
	"DROP SEQUENCE MAIMEI_STUDENT_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_STUDENTS_SEQ",
	"DROP SEQUENCE MAIMEI_TEACHER_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_TEACHERS_SEQ",
	"DROP SEQUENCE MAIMEI_ADMIN_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_ADMINS_SEQ",
	"DROP SEQUENCE MAIMEI_LICENSES_SEQ",
	"DROP SEQUENCE MAIMEI_ACADEMIES_SEQ",
}

type devToolsResponse struct {
	Status          string   `json:"status"`
	Message         string   `json:"message"`
	Migrations      []string `json:"migrations,omitempty"`
	LicenseCode     string   `json:"licenseCode,omitempty"`
	ExpiresAt       string   `json:"expiresAt,omitempty"`
	AcademyName     string   `json:"academyName,omitempty"`
	RootLoginID     string   `json:"rootLoginId,omitempty"`
	PendingStudents int      `json:"pendingStudents,omitempty"`
	PendingTeachers int      `json:"pendingTeachers,omitempty"`
	PendingAdmins   int      `json:"pendingAdmins,omitempty"`
}

type devToolsRunner interface {
	InitializeTables(ctx context.Context) (devToolsResponse, error)
	InitializeTablesAndInjectTestData(ctx context.Context) (devToolsResponse, error)
	CreateLicense(ctx context.Context) (devToolsResponse, error)
}

type devToolsService struct {
	db            *sql.DB
	now           func() time.Time
	migrationsDir string
	opMu          sync.Mutex
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

	if !s.opMu.TryLock() {
		return devToolsResponse{}, fmt.Errorf("another dev-tools operation is already running")
	}
	defer s.opMu.Unlock()

	return s.initializeTablesLocked(ctx)
}

func (s *devToolsService) initializeTablesLocked(ctx context.Context) (devToolsResponse, error) {
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

func (s *devToolsService) InitializeTablesAndInjectTestData(ctx context.Context) (devToolsResponse, error) {
	if s == nil || s.db == nil {
		return devToolsResponse{}, fmt.Errorf("oracle dev tools service is not configured")
	}

	if !s.opMu.TryLock() {
		return devToolsResponse{}, fmt.Errorf("another dev-tools operation is already running")
	}
	defer s.opMu.Unlock()

	logServerRuntime("dev-tools", "init-and-inject:initialize:start", map[string]any{
		"academyName": seededAcademyName,
	})

	result, err := s.initializeTablesLocked(ctx)
	if err != nil {
		return devToolsResponse{}, err
	}

	logServerRuntime("dev-tools", "init-and-inject:initialize:success", map[string]any{
		"academyName": seededAcademyName,
		"migrations":  len(result.Migrations),
	})

	seedResult, err := s.injectTestData(ctx)
	if err != nil {
		return devToolsResponse{}, err
	}

	result.Message = "Managed tables have been initialized and test data has been injected."
	result.LicenseCode = seedResult.LicenseCode
	result.ExpiresAt = seedResult.ExpiresAt
	result.AcademyName = seedResult.AcademyName
	result.RootLoginID = seedResult.RootLoginID
	result.PendingStudents = seedResult.PendingStudents
	result.PendingTeachers = seedResult.PendingTeachers
	result.PendingAdmins = seedResult.PendingAdmins

	return result, nil
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

func (s *devToolsService) injectTestData(ctx context.Context) (devToolsResponse, error) {
	if s == nil || s.db == nil {
		return devToolsResponse{}, fmt.Errorf("oracle dev tools service is not configured")
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:start", map[string]any{
		"academyName": seededAcademyName,
		"rootLoginId": seededRootLoginID,
	})

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return devToolsResponse{}, fmt.Errorf("start test data injection: %w", err)
	}

	defer func() {
		if tx != nil {
			_ = tx.Rollback()
		}
	}()

	now := time.Now
	if s.now != nil {
		now = s.now
	}

	expiresAt := now().Add(defaultLicenseDuration).UTC()
	licenseCode, err := createSeedLicense(ctx, tx, expiresAt)
	if err != nil {
		return devToolsResponse{}, err
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:license-created", map[string]any{
		"expiresAt":   expiresAt.Format(time.RFC3339),
		"licenseCode": licenseCode,
	})

	academyCode, err := createSeedAcademy(ctx, tx, seededAcademyName)
	if err != nil {
		return devToolsResponse{}, err
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:academy-created", map[string]any{
		"academyCode": academyCode,
		"academyName": seededAcademyName,
	})

	rootPhone, err := generateSeedPhoneNumber()
	if err != nil {
		return devToolsResponse{}, fmt.Errorf("generate root phone number: %w", err)
	}

	rootAdminID, err := nextSequenceValue(ctx, tx, "MAIMEI_ADMINS_SEQ")
	if err != nil {
		return devToolsResponse{}, fmt.Errorf("prepare root account: %w", err)
	}

	rootPasswordHash, err := hashPassword(seededRootPassword)
	if err != nil {
		return devToolsResponse{}, fmt.Errorf("prepare root password: %w", err)
	}

	if err := insertSeedRootAdmin(
		ctx,
		tx,
		rootAdminID,
		academyCode,
		seededRootLoginID,
		rootPasswordHash,
		seededRootEmail,
		rootPhone,
		seededRootDisplayName,
	); err != nil {
		return devToolsResponse{}, err
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:root-created", map[string]any{
		"academyCode": academyCode,
		"email":       seededRootEmail,
		"rootLoginId": seededRootLoginID,
	})

	if err := assignSeedLicense(ctx, tx, academyCode, licenseCode); err != nil {
		return devToolsResponse{}, err
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:license-assigned", map[string]any{
		"academyCode": academyCode,
		"licenseCode": licenseCode,
	})

	if err := seedPendingMembers(ctx, tx, "STUDENT", "student"); err != nil {
		return devToolsResponse{}, err
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:pending-members-created", map[string]any{
		"count":    seededSeedMemberCount,
		"roleCode": "STUDENT",
	})

	if err := seedPendingMembers(ctx, tx, "TEACHER", "teacher"); err != nil {
		return devToolsResponse{}, err
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:pending-members-created", map[string]any{
		"count":    seededSeedMemberCount,
		"roleCode": "TEACHER",
	})

	if err := seedPendingMembers(ctx, tx, "ADMIN", "admin"); err != nil {
		return devToolsResponse{}, err
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:pending-members-created", map[string]any{
		"count":    seededSeedMemberCount,
		"roleCode": "ADMIN",
	})

	if err := tx.Commit(); err != nil {
		return devToolsResponse{}, fmt.Errorf("complete test data injection: %w", err)
	}
	tx = nil

	result := devToolsResponse{
		Status:          "ok",
		Message:         "Test data has been injected.",
		LicenseCode:     licenseCode,
		ExpiresAt:       expiresAt.Format(time.RFC3339),
		AcademyName:     seededAcademyName,
		RootLoginID:     seededRootLoginID,
		PendingStudents: seededSeedMemberCount,
		PendingTeachers: seededSeedMemberCount,
		PendingAdmins:   seededSeedMemberCount,
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:success", map[string]any{
		"academyName":     result.AcademyName,
		"licenseCode":     result.LicenseCode,
		"pendingAdmins":   result.PendingAdmins,
		"pendingStudents": result.PendingStudents,
		"pendingTeachers": result.PendingTeachers,
		"rootLoginId":     result.RootLoginID,
	})

	return result, nil
}

func createSeedLicense(ctx context.Context, tx *sql.Tx, expiresAt time.Time) (string, error) {
	for range 5 {
		licenseCode, err := generateLicenseCode()
		if err != nil {
			return "", fmt.Errorf("generate license code: %w", err)
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
		if _, err := tx.ExecContext(ctx, query, licenseCode, expiresAt); err != nil {
			if isUniqueConstraintError(err) {
				continue
			}
			return "", fmt.Errorf("create seed license: %w", err)
		}

		return licenseCode, nil
	}

	return "", fmt.Errorf("create seed license: could not generate a unique license code")
}

func createSeedAcademy(ctx context.Context, tx *sql.Tx, academyName string) (string, error) {
	insertAcademy := `
INSERT INTO MAIMEI_ACADEMIES (
    ACADEMY_NAME,
    STATUS_CODE
) VALUES (
    :1,
    'ACTIVE'
)`
	if _, err := tx.ExecContext(ctx, insertAcademy, academyName); err != nil {
		return "", fmt.Errorf("create seed academy: %w", err)
	}

	var academyCode string
	readAcademyCode := `
SELECT ACADEMY_CODE
  FROM MAIMEI_ACADEMIES
 WHERE ACADEMY_NAME = :1`
	if err := tx.QueryRowContext(ctx, readAcademyCode, academyName).Scan(&academyCode); err != nil {
		return "", fmt.Errorf("create seed academy: %w", err)
	}

	return academyCode, nil
}

func insertSeedRootAdmin(
	ctx context.Context,
	tx *sql.Tx,
	adminID int64,
	academyCode string,
	loginID string,
	passwordHash string,
	email string,
	phone string,
	displayName string,
) error {
	insertRootAdmin := `
INSERT INTO MAIMEI_ADMINS (
    ADMIN_ID,
    ACADEMY_CODE,
    LOGIN_ID,
    PASSWORD_HASH,
    EMAIL,
    PHONE,
    DISPLAY_NAME,
    ROLE_CODE,
    STATUS_CODE
) VALUES (
    :1,
    :2,
    :3,
    :4,
    :5,
    :6,
    :7,
    'ROOT',
    'ACTIVE'
)`
	if _, err := tx.ExecContext(ctx, insertRootAdmin, adminID, academyCode, loginID, passwordHash, email, phone, displayName); err != nil {
		return fmt.Errorf("create seed root admin: %w", err)
	}

	return nil
}

func assignSeedLicense(ctx context.Context, tx *sql.Tx, academyCode string, licenseCode string) error {
	assignLicense := `
UPDATE MAIMEI_LICENSES
   SET ACADEMY_CODE = :1,
       STATUS_CODE = 'ACTIVE'
 WHERE LICENSE_CODE = :2
   AND ACADEMY_CODE IS NULL
   AND STATUS_CODE = 'UNASSIGNED'
   AND EXPIRES_AT > SYSTIMESTAMP`
	result, err := tx.ExecContext(ctx, assignLicense, academyCode, licenseCode)
	if err != nil {
		return fmt.Errorf("assign seed license: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("assign seed license: %w", err)
	}

	if rowsAffected != 1 {
		return fmt.Errorf("assign seed license: could not assign license to academy")
	}

	return nil
}

func seedPendingMembers(ctx context.Context, tx *sql.Tx, roleCode string, loginPrefix string) error {
	for index := 1; index <= seededSeedMemberCount; index++ {
		loginID := fmt.Sprintf("%s%d", loginPrefix, index)
		phone, err := generateSeedPhoneNumber()
		if err != nil {
			return fmt.Errorf("generate %s phone number: %w", roleCode, err)
		}

		if err := seedPendingMember(ctx, tx, roleCode, loginID, phone); err != nil {
			return err
		}
	}

	return nil
}

func seedPendingMember(ctx context.Context, tx *sql.Tx, roleCode string, loginID string, phone string) error {
	spec, err := resolvePendingMemberRoleSpec(roleCode)
	if err != nil {
		return err
	}

	input := memberRegisterInput{
		LoginID:           loginID,
		DisplayName:       loginID,
		Email:             fmt.Sprintf("%s@example.com", loginID),
		Phone:             phone,
		Password:          loginID,
		RequestedRoleCode: roleCode,
	}

	passwordHash, err := hashPassword(input.Password)
	if err != nil {
		return fmt.Errorf("prepare %s password: %w", roleCode, err)
	}

	if _, err := insertPendingMemberProfile(ctx, tx, spec, input, passwordHash); err != nil {
		return err
	}

	return nil
}

func generateSeedPhoneNumber() (string, error) {
	prefix, err := randomDigits(4)
	if err != nil {
		return "", err
	}

	suffix, err := randomDigits(4)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("010-%s-%s", prefix, suffix), nil
}

func randomDigits(length int) (string, error) {
	if length <= 0 {
		return "", fmt.Errorf("invalid digit length")
	}

	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	for i := range buf {
		buf[i] = '0' + (buf[i] % 10)
	}

	return string(buf), nil
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
