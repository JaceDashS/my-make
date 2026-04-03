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
	seededRootDisplayName  = "Haruto Sato"
	seededRootEmail        = "root@example.com"
	seededRootPassword     = "root"
	seededPasswordHint     = "Seed account passwords match their login IDs (example: student-hold / student-hold)."
)

type seededMemberAccount struct {
	displayName string
	loginID     string
	roleCode    string
	statusCode  string
}

type seededStudentTeacherLink struct {
	studentLoginID string
	teacherLoginID string
}

type seededTeacherSchedule struct {
	loginID      string
	scheduleBody string
}

type seededTeacherPreset struct {
	loginID    string
	presetBody string
}

type seededStudentProfile struct {
	loginID          string
	skinLValue       float64
	skinCValue       float64
	skinHValue       float64
	skinTraits       string
	preferenceRanges string
}

type seededInventoryItem struct {
	sku        string
	itemName   string
	category   string
	cost       float64
	price      float64
	lValue     float64
	cValue     float64
	hValue     float64
	imageURL   string
	stockCount int
	noteBody   string
}

var seededMemberAccounts = []seededMemberAccount{
	{displayName: "Yuki Tanaka", loginID: "admin", roleCode: "ADMIN", statusCode: "ACTIVE"},
	{displayName: "Taro Yamada", loginID: "teacher", roleCode: "TEACHER", statusCode: "ACTIVE"},
	{displayName: "Hana Suzuki", loginID: "student", roleCode: "STUDENT", statusCode: "ACTIVE"},
	{displayName: "Kento Watanabe", loginID: "admin-active", roleCode: "ADMIN", statusCode: "ACTIVE"},
	{displayName: "Aoi Nakamura", loginID: "teacher-active", roleCode: "TEACHER", statusCode: "ACTIVE"},
	{displayName: "Yui Kobayashi", loginID: "student-active", roleCode: "STUDENT", statusCode: "ACTIVE"},
	{displayName: "Sota Ito", loginID: "admin-pending", roleCode: "ADMIN", statusCode: "PENDING"},
	{displayName: "Rin Takahashi", loginID: "teacher-pending", roleCode: "TEACHER", statusCode: "PENDING"},
	{displayName: "Mei Kato", loginID: "student-pending", roleCode: "STUDENT", statusCode: "PENDING"},
	{displayName: "My Teacher", loginID: "myteacher", roleCode: "TEACHER", statusCode: "PENDING"},
	{displayName: "My Student", loginID: "mystudent", roleCode: "STUDENT", statusCode: "PENDING"},
	{displayName: "Daiki Yoshida", loginID: "admin-hold", roleCode: "ADMIN", statusCode: "HOLD"},
	{displayName: "Mio Yamamoto", loginID: "teacher-hold", roleCode: "TEACHER", statusCode: "HOLD"},
	{displayName: "Riko Saito", loginID: "student-hold", roleCode: "STUDENT", statusCode: "HOLD"},
	{displayName: "Sho Matsumoto", loginID: "admin-inactive", roleCode: "ADMIN", statusCode: "INACTIVE"},
	{displayName: "Nanami Inoue", loginID: "teacher-inactive", roleCode: "TEACHER", statusCode: "INACTIVE"},
	{displayName: "Sara Kimura", loginID: "student-inactive", roleCode: "STUDENT", statusCode: "INACTIVE"},
}

var seededStudentTeacherLinks = []seededStudentTeacherLink{
	{studentLoginID: "student", teacherLoginID: "teacher"},
	{studentLoginID: "student-active", teacherLoginID: "teacher-active"},
	{studentLoginID: "student-pending", teacherLoginID: "teacher-pending"},
	{studentLoginID: "student-hold", teacherLoginID: "teacher-hold"},
	{studentLoginID: "student-inactive", teacherLoginID: "teacher-inactive"},
}

var seededTeacherSchedules = []seededTeacherSchedule{
	{
		loginID:      "teacher",
		scheduleBody: `{"timezone":"Asia/Seoul","weekly":{"mon":[{"start":"10:00","end":"18:00"}],"tue":[{"start":"10:00","end":"18:00"}],"wed":[{"start":"10:00","end":"18:00"}],"thu":[{"start":"10:00","end":"18:00"}],"fri":[{"start":"10:00","end":"18:00"}],"sat":[],"sun":[]},"exceptions":[]}`,
	},
	{
		loginID:      "teacher-active",
		scheduleBody: `{"timezone":"Asia/Seoul","weekly":{"mon":[{"start":"10:00","end":"18:00"}],"tue":[{"start":"10:00","end":"18:00"}],"wed":[{"start":"10:00","end":"18:00"}],"thu":[{"start":"10:00","end":"18:00"}],"fri":[{"start":"10:00","end":"18:00"}],"sat":[],"sun":[]},"exceptions":[]}`,
	},
}

var seededTeacherPresets = []seededTeacherPreset{
	{
		loginID:    "teacher",
		presetBody: `{"version":2,"presets":[{"id":"1","name":"Soft Daily Coral","createdAt":"2026-04-02T09:00:00+09:00","updatedAt":"2026-04-02T09:00:00+09:00","note":"Mostly aligned with the student's soft warm preference.","items":{"base_foundation":[{"source":"inventory","sku":"FND-001","itemName":"Soft Natural Foundation 01","imageUrl":"https://example.com/images/fnd-001.jpg"},{"source":"manual","sku":null,"itemName":"Glow Veil Mixing Base","imageUrl":"https://example.com/images/manual-glow-veil-base.jpg"}],"blush":[{"source":"inventory","sku":"BLS-002","itemName":"Soft Peach Blush","imageUrl":"https://example.com/images/bls-002.jpg"}],"lip_color":[{"source":"inventory","sku":"LIP-022","itemName":"Warm Peach Lip","imageUrl":"https://example.com/images/lip-022.jpg"}],"eyeshadow":null,"contour":null,"highlighter":[{"source":"inventory","sku":"HIL-003","itemName":"Soft Gold Highlighter","imageUrl":"https://example.com/images/hil-003.jpg"},{"source":"manual","sku":null,"itemName":"Pearl Balm Topper","imageUrl":null}],"etc":[{"source":"inventory","sku":"FIX-002","itemName":"Primer Base","imageUrl":"https://example.com/images/fix-002.jpg"},{"source":"manual","sku":null,"itemName":"Makeup Spatula Set","imageUrl":null}]}},{"id":"2","name":"Warm Contrast Coral","createdAt":"2026-04-02T09:30:00+09:00","updatedAt":"2026-04-02T10:10:00+09:00","note":"Intentionally contains partial mismatch for demo explanation.","items":{"base_foundation":[{"source":"inventory","sku":"FND-001","itemName":"Soft Natural Foundation 01","imageUrl":"https://example.com/images/fnd-001.jpg"}],"blush":[{"source":"inventory","sku":"BLS-003","itemName":"Warm Coral Blush","imageUrl":"https://example.com/images/bls-003.jpg"},{"source":"manual","sku":null,"itemName":"Apricot Cream Blush Pot","imageUrl":"https://example.com/images/manual-apricot-cream-blush.jpg"}],"lip_color":[{"source":"inventory","sku":"LIP-014","itemName":"Muted Coral Lip","imageUrl":"https://example.com/images/lip-014.jpg"}],"eyeshadow":[{"source":"inventory","sku":"EYE-031","itemName":"Rose Plum Eyeshadow","imageUrl":"https://example.com/images/eye-031.jpg"}],"contour":null,"highlighter":null,"etc":[{"source":"manual","sku":null,"itemName":"Disposable Lip Brush Set","imageUrl":null}]}}]}`,
	},
	{
		loginID:    "teacher-active",
		presetBody: `{"version":2,"presets":[{"id":"1","name":"Soft Daily Coral","createdAt":"2026-04-02T09:00:00+09:00","updatedAt":"2026-04-02T09:00:00+09:00","note":"Mostly aligned with the student's soft warm preference.","items":{"base_foundation":[{"source":"inventory","sku":"FND-001","itemName":"Soft Natural Foundation 01","imageUrl":"https://example.com/images/fnd-001.jpg"},{"source":"manual","sku":null,"itemName":"Glow Veil Mixing Base","imageUrl":"https://example.com/images/manual-glow-veil-base.jpg"}],"blush":[{"source":"inventory","sku":"BLS-002","itemName":"Soft Peach Blush","imageUrl":"https://example.com/images/bls-002.jpg"}],"lip_color":[{"source":"inventory","sku":"LIP-022","itemName":"Warm Peach Lip","imageUrl":"https://example.com/images/lip-022.jpg"}],"eyeshadow":null,"contour":null,"highlighter":[{"source":"inventory","sku":"HIL-003","itemName":"Soft Gold Highlighter","imageUrl":"https://example.com/images/hil-003.jpg"},{"source":"manual","sku":null,"itemName":"Pearl Balm Topper","imageUrl":null}],"etc":[{"source":"inventory","sku":"FIX-002","itemName":"Primer Base","imageUrl":"https://example.com/images/fix-002.jpg"},{"source":"manual","sku":null,"itemName":"Makeup Spatula Set","imageUrl":null}]}},{"id":"2","name":"Warm Contrast Coral","createdAt":"2026-04-02T09:30:00+09:00","updatedAt":"2026-04-02T10:10:00+09:00","note":"Intentionally contains partial mismatch for demo explanation.","items":{"base_foundation":[{"source":"inventory","sku":"FND-001","itemName":"Soft Natural Foundation 01","imageUrl":"https://example.com/images/fnd-001.jpg"}],"blush":[{"source":"inventory","sku":"BLS-003","itemName":"Warm Coral Blush","imageUrl":"https://example.com/images/bls-003.jpg"},{"source":"manual","sku":null,"itemName":"Apricot Cream Blush Pot","imageUrl":"https://example.com/images/manual-apricot-cream-blush.jpg"}],"lip_color":[{"source":"inventory","sku":"LIP-014","itemName":"Muted Coral Lip","imageUrl":"https://example.com/images/lip-014.jpg"}],"eyeshadow":[{"source":"inventory","sku":"EYE-031","itemName":"Rose Plum Eyeshadow","imageUrl":"https://example.com/images/eye-031.jpg"}],"contour":null,"highlighter":null,"etc":[{"source":"manual","sku":null,"itemName":"Disposable Lip Brush Set","imageUrl":null}]}}]}`,
	},
}

var seededStudentProfiles = []seededStudentProfile{
	{
		loginID:          "student",
		skinLValue:       65.5,
		skinCValue:       14.2,
		skinHValue:       58.1,
		skinTraits:       "Neutral undertone, soft natural finish preferred.",
		preferenceRanges: `{"version":3,"space":"hcl","matchMode":"point-distance","categories":{"base_foundation":{"pointMode":"multi","points":[{"l":64.5,"c":13.2,"h":57.0,"radius":6.0},{"l":66.2,"c":15.0,"h":60.0,"radius":5.0}]},"blush":{"pointMode":"multi","points":[{"l":66.0,"c":22.0,"h":42.0,"radius":10.0},{"l":68.0,"c":18.0,"h":48.0,"radius":6.0}]},"lip_color":{"pointMode":"single","points":[{"l":58.0,"c":22.0,"h":42.0,"radius":8.0}]}}}`,
	},
	{
		loginID:          "student-active",
		skinLValue:       65.5,
		skinCValue:       14.2,
		skinHValue:       58.1,
		skinTraits:       "Neutral undertone, soft natural finish preferred.",
		preferenceRanges: `{"version":3,"space":"hcl","matchMode":"point-distance","categories":{"base_foundation":{"pointMode":"multi","points":[{"l":64.5,"c":13.2,"h":57.0,"radius":6.0},{"l":66.2,"c":15.0,"h":60.0,"radius":5.0}]},"blush":{"pointMode":"multi","points":[{"l":66.0,"c":22.0,"h":42.0,"radius":10.0},{"l":68.0,"c":18.0,"h":48.0,"radius":6.0}]},"lip_color":{"pointMode":"single","points":[{"l":58.0,"c":22.0,"h":42.0,"radius":8.0}]}}}`,
	},
}

var seededInventoryItems = []seededInventoryItem{
	{sku: "FND-001", itemName: "Soft Natural Foundation 01", category: "base_foundation", cost: 32000, price: 48000, lValue: 64.5, cValue: 13.2, hValue: 57.0, imageURL: "https://example.com/items/fnd-001.png", stockCount: 12, noteBody: "Demo match foundation"},
	{sku: "FND-003", itemName: "Warm Natural Foundation 03", category: "base_foundation", cost: 32000, price: 48000, lValue: 70.0, cValue: 20.0, hValue: 74.0, imageURL: "https://example.com/items/fnd-003.png", stockCount: 8, noteBody: "Demo mismatch foundation"},
	{sku: "BLS-002", itemName: "Soft Peach Blush", category: "blush", cost: 18000, price: 29000, lValue: 67.0, cValue: 24.0, hValue: 44.0, imageURL: "https://example.com/items/bls-002.png", stockCount: 10, noteBody: "Demo match blush"},
	{sku: "BLS-003", itemName: "Warm Coral Blush", category: "blush", cost: 18000, price: 29000, lValue: 60.0, cValue: 36.0, hValue: 28.0, imageURL: "https://example.com/items/bls-003.png", stockCount: 9, noteBody: "Demo partial mismatch blush"},
	{sku: "LIP-014", itemName: "Muted Coral Lip", category: "lip_color", cost: 15000, price: 24000, lValue: 52.0, cValue: 40.0, hValue: 25.0, imageURL: "https://example.com/items/lip-014.png", stockCount: 15, noteBody: "Demo mismatch lip"},
	{sku: "LIP-022", itemName: "Warm Peach Lip", category: "lip_color", cost: 15000, price: 24000, lValue: 58.0, cValue: 22.0, hValue: 42.0, imageURL: "https://example.com/items/lip-022.png", stockCount: 14, noteBody: "Demo match lip"},
	{sku: "EYE-021", itemName: "Soft Brown Eyeshadow", category: "eyeshadow", cost: 21000, price: 34000, lValue: 48.0, cValue: 18.0, hValue: 42.0, imageURL: "https://example.com/items/eye-021.png", stockCount: 11, noteBody: "Demo support eyeshadow"},
	{sku: "EYE-031", itemName: "Rose Plum Eyeshadow", category: "eyeshadow", cost: 21000, price: 34000, lValue: 44.0, cValue: 26.0, hValue: 342.0, imageURL: "https://example.com/items/eye-031.png", stockCount: 7, noteBody: "Demo mismatch eyeshadow"},
	{sku: "CON-004", itemName: "Neutral Soft Contour", category: "contour", cost: 17000, price: 26000, lValue: 40.0, cValue: 14.0, hValue: 36.0, imageURL: "https://example.com/items/con-004.png", stockCount: 10, noteBody: "Demo contour"},
	{sku: "HIL-003", itemName: "Soft Gold Highlighter", category: "highlighter", cost: 17000, price: 27000, lValue: 84.0, cValue: 20.0, hValue: 52.0, imageURL: "https://example.com/items/hil-003.png", stockCount: 10, noteBody: "Demo highlighter"},
	{sku: "FIX-002", itemName: "Primer Base", category: "etc", cost: 14000, price: 22000, lValue: 62.0, cValue: 6.0, hValue: 52.0, imageURL: "https://example.com/items/fix-002.png", stockCount: 16, noteBody: "Demo primer"},
}

var managedDropStatements = []string{
	"DROP TABLE MAIMEI_LESSON_RESERVATIONS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_INVENTORIES CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_TEACHER_AVAILABLE_SCHEDULES CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_STUDENTS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_TEACHERS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_ADMINS CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_LICENSES CASCADE CONSTRAINTS PURGE",
	"DROP TABLE MAIMEI_ACADEMIES CASCADE CONSTRAINTS PURGE",
	"DROP SEQUENCE MAIMEI_STUDENT_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_STUDENTS_SEQ",
	"DROP SEQUENCE MAIMEI_INVENTORY_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_INVENTORIES_SEQ",
	"DROP SEQUENCE MAIMEI_RESERVATION_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_LESSON_RESERVATIONS_SEQ",
	"DROP SEQUENCE MAIMEI_TEACHER_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_TEACHERS_SEQ",
	"DROP SEQUENCE MAIMEI_ADMIN_CODE_SEQ",
	"DROP SEQUENCE MAIMEI_ADMINS_SEQ",
	"DROP SEQUENCE MAIMEI_LICENSES_SEQ",
	"DROP SEQUENCE MAIMEI_ACADEMIES_SEQ",
}

type devToolsResponse struct {
	Status           string   `json:"status"`
	Message          string   `json:"message"`
	Migrations       []string `json:"migrations,omitempty"`
	LicenseCode      string   `json:"licenseCode,omitempty"`
	ExpiresAt        string   `json:"expiresAt,omitempty"`
	AcademyName      string   `json:"academyName,omitempty"`
	RootLoginID      string   `json:"rootLoginId,omitempty"`
	SeedPasswordHint string   `json:"seedPasswordHint,omitempty"`
	PendingStudents  int      `json:"pendingStudents,omitempty"`
	PendingTeachers  int      `json:"pendingTeachers,omitempty"`
	PendingAdmins    int      `json:"pendingAdmins,omitempty"`
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
	result.SeedPasswordHint = seedResult.SeedPasswordHint
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

	pendingCounts := map[string]int{
		"ADMIN":   0,
		"TEACHER": 0,
		"STUDENT": 0,
	}

	for _, account := range seededMemberAccounts {
		if err := seedMemberAccount(ctx, tx, academyCode, account); err != nil {
			return devToolsResponse{}, err
		}

		if account.statusCode == "PENDING" {
			pendingCounts[account.roleCode]++
		}

		logServerRuntime("dev-tools", "init-and-inject:seed:member-created", map[string]any{
			"loginId":    account.loginID,
			"roleCode":   account.roleCode,
			"statusCode": account.statusCode,
		})
	}

	if err := linkSeedStudentsToTeachers(ctx, tx); err != nil {
		return devToolsResponse{}, err
	}

	if err := seedTeacherAvailableSchedules(ctx, tx); err != nil {
		return devToolsResponse{}, err
	}

	if err := seedTeacherPresets(ctx, tx); err != nil {
		return devToolsResponse{}, err
	}

	if err := seedDemoInventories(ctx, tx, academyCode); err != nil {
		return devToolsResponse{}, err
	}

	if err := seedStudentProfiles(ctx, tx); err != nil {
		return devToolsResponse{}, err
	}

	if err := seedStudentPassCounts(ctx, tx); err != nil {
		return devToolsResponse{}, err
	}

	if err := seedDemoReservation(ctx, tx, academyCode, now()); err != nil {
		return devToolsResponse{}, err
	}

	if err := tx.Commit(); err != nil {
		return devToolsResponse{}, fmt.Errorf("complete test data injection: %w", err)
	}
	tx = nil

	result := devToolsResponse{
		Status:           "ok",
		Message:          "Test data has been injected.",
		LicenseCode:      licenseCode,
		ExpiresAt:        expiresAt.Format(time.RFC3339),
		AcademyName:      seededAcademyName,
		RootLoginID:      seededRootLoginID,
		SeedPasswordHint: seededPasswordHint,
		PendingStudents:  pendingCounts["STUDENT"],
		PendingTeachers:  pendingCounts["TEACHER"],
		PendingAdmins:    pendingCounts["ADMIN"],
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

func seedMemberAccount(
	ctx context.Context,
	tx *sql.Tx,
	academyCode string,
	account seededMemberAccount,
) error {
	spec, err := resolvePendingMemberRoleSpec(account.roleCode)
	if err != nil {
		return err
	}

	phone, err := generateSeedPhoneNumber()
	if err != nil {
		return fmt.Errorf("generate %s phone number: %w", account.roleCode, err)
	}

	input := memberRegisterInput{
		LoginID:           account.loginID,
		DisplayName:       account.displayName,
		Email:             fmt.Sprintf("%s@example.com", account.loginID),
		Phone:             phone,
		Password:          account.loginID,
		RequestedRoleCode: account.roleCode,
	}

	passwordHash, err := hashPassword(input.Password)
	if err != nil {
		return fmt.Errorf("prepare %s password: %w", account.roleCode, err)
	}

	if _, err := insertPendingMemberProfile(ctx, tx, spec, input, passwordHash); err != nil {
		return err
	}

	if account.statusCode == "PENDING" {
		return nil
	}

	if err := approvePendingMemberProfile(ctx, tx, spec, academyCode, account.loginID, 0); err != nil {
		return err
	}

	if account.statusCode == "ACTIVE" {
		return nil
	}

	if err := updateAcademyMemberStatusProfile(ctx, tx, academyMemberRoleStatus{
		roleCode:   account.roleCode,
		statusCode: "ACTIVE",
	}, academyMemberStatusUpdateInput{
		AcademyCode:   academyCode,
		ActorRoleCode: "ROOT",
		LoginID:       account.loginID,
		CurrentStatus: "ACTIVE",
		NextStatus:    account.statusCode,
	}); err != nil {
		return err
	}

	return nil
}

func linkSeedStudentsToTeachers(ctx context.Context, tx *sql.Tx) error {
	if tx == nil {
		return fmt.Errorf("link seed students to teachers: transaction is nil")
	}

	updateQuery := `
UPDATE MAIMEI_STUDENTS stu
   SET stu.PRIMARY_TEACHER_ID = (
       SELECT tch.TEACHER_ID
         FROM MAIMEI_TEACHERS tch
        WHERE tch.LOGIN_ID = :1
   )
 WHERE stu.LOGIN_ID = :2`

	for _, link := range seededStudentTeacherLinks {
		result, err := tx.ExecContext(ctx, updateQuery, link.teacherLoginID, link.studentLoginID)
		if err != nil {
			return fmt.Errorf(
				"link seed student %s to teacher %s: %w",
				link.studentLoginID,
				link.teacherLoginID,
				err,
			)
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf(
				"link seed student %s to teacher %s: %w",
				link.studentLoginID,
				link.teacherLoginID,
				err,
			)
		}

		if rowsAffected == 0 {
			return fmt.Errorf(
				"link seed student %s to teacher %s: no student rows updated",
				link.studentLoginID,
				link.teacherLoginID,
			)
		}

		logServerRuntime("dev-tools", "init-and-inject:seed:student-teacher-linked", map[string]any{
			"studentLoginId": link.studentLoginID,
			"teacherLoginId": link.teacherLoginID,
		})
	}

	return nil
}

func seedStudentPassCounts(ctx context.Context, tx *sql.Tx) error {
	if tx == nil {
		return fmt.Errorf("seed student pass counts: transaction is nil")
	}

	query := `
UPDATE MAIMEI_STUDENTS
   SET PASS_TOTAL_COUNT = 20,
       PASS_REMAINING_COUNT = 10`

	if _, err := tx.ExecContext(ctx, query); err != nil {
		return fmt.Errorf("seed student pass counts: %w", err)
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:student-pass-counts", map[string]any{
		"passRemainingCount": 10,
		"passTotalCount":     20,
	})

	return nil
}

func seedStudentProfiles(ctx context.Context, tx *sql.Tx) error {
	if tx == nil {
		return fmt.Errorf("seed student profiles: transaction is nil")
	}

	query := `
UPDATE MAIMEI_STUDENTS
   SET SKIN_L_VALUE = :1,
       SKIN_C_VALUE = :2,
       SKIN_H_VALUE = :3,
       SKIN_TRAITS_BODY = :4,
       PREFERENCE_RANGES_BODY = :5,
       UPDATED_BY = 'devtools'
 WHERE LOGIN_ID = :6`

	for _, profile := range seededStudentProfiles {
		if _, err := tx.ExecContext(
			ctx,
			query,
			profile.skinLValue,
			profile.skinCValue,
			profile.skinHValue,
			profile.skinTraits,
			profile.preferenceRanges,
			profile.loginID,
		); err != nil {
			return fmt.Errorf("seed student profile for %s: %w", profile.loginID, err)
		}

		logServerRuntime("dev-tools", "init-and-inject:seed:student-profile", map[string]any{
			"loginId": profile.loginID,
		})
	}

	return nil
}

func seedDemoInventories(ctx context.Context, tx *sql.Tx, academyCode string) error {
	if tx == nil {
		return fmt.Errorf("seed demo inventories: transaction is nil")
	}

	query := `
INSERT INTO MAIMEI_INVENTORIES (
    ACADEMY_CODE,
    SKU,
    ITEM_NAME,
    CATEGORY_CODE,
    COST,
    PRICE,
    L_VALUE,
    C_VALUE,
    H_VALUE,
    IMAGE_URL,
    STOCK_COUNT,
    NOTE_BODY,
    STATUS_CODE,
    CREATED_BY,
    UPDATED_BY
) VALUES (
    :1,
    :2,
    :3,
    :4,
    :5,
    :6,
    :7,
    :8,
    :9,
    :10,
    :11,
    :12,
    'ACTIVE',
    'devtools',
    'devtools'
)`

	for _, item := range seededInventoryItems {
		if _, err := tx.ExecContext(
			ctx,
			query,
			academyCode,
			item.sku,
			item.itemName,
			item.category,
			item.cost,
			item.price,
			item.lValue,
			item.cValue,
			item.hValue,
			item.imageURL,
			item.stockCount,
			item.noteBody,
		); err != nil {
			return fmt.Errorf("seed demo inventory %s: %w", item.sku, err)
		}

		logServerRuntime("dev-tools", "init-and-inject:seed:inventory", map[string]any{
			"category": item.category,
			"sku":      item.sku,
		})
	}

	return nil
}

func seedTeacherAvailableSchedules(ctx context.Context, tx *sql.Tx) error {
	if tx == nil {
		return fmt.Errorf("seed teacher available schedules: transaction is nil")
	}

	scheduleTableQuery := `
MERGE INTO MAIMEI_TEACHER_AVAILABLE_SCHEDULES target
USING (
    SELECT TEACHER_ID
      FROM MAIMEI_TEACHERS
     WHERE LOGIN_ID = :1
) source
ON (target.TEACHER_ID = source.TEACHER_ID)
WHEN MATCHED THEN
    UPDATE SET TIMEZONE = 'Asia/Seoul',
               SCHEDULE_BODY = :2,
               UPDATED_BY = 'devtools'
WHEN NOT MATCHED THEN
    INSERT (TEACHER_ID, TIMEZONE, SCHEDULE_BODY, CREATED_BY, UPDATED_BY)
    VALUES (source.TEACHER_ID, 'Asia/Seoul', :2, 'devtools', 'devtools')`

	legacyTeacherQuery := `
UPDATE MAIMEI_TEACHERS
   SET AVAILABLE_SCHEDULE = :1,
       UPDATED_BY = 'devtools'
 WHERE LOGIN_ID = :2`

	for _, teacherSchedule := range seededTeacherSchedules {
		if _, err := tx.ExecContext(
			ctx,
			scheduleTableQuery,
			teacherSchedule.loginID,
			teacherSchedule.scheduleBody,
		); err != nil {
			return fmt.Errorf(
				"seed teacher available schedule for %s: %w",
				teacherSchedule.loginID,
				err,
			)
		}
		if _, err := tx.ExecContext(
			ctx,
			legacyTeacherQuery,
			teacherSchedule.scheduleBody,
			teacherSchedule.loginID,
		); err != nil {
			return fmt.Errorf(
				"seed legacy teacher available schedule for %s: %w",
				teacherSchedule.loginID,
				err,
			)
		}

		logServerRuntime("dev-tools", "init-and-inject:seed:teacher-schedule", map[string]any{
			"loginId": teacherSchedule.loginID,
		})
	}

	return nil
}

func seedTeacherPresets(ctx context.Context, tx *sql.Tx) error {
	if tx == nil {
		return fmt.Errorf("seed teacher presets: transaction is nil")
	}

	query := `
UPDATE MAIMEI_TEACHERS
   SET PRESET = :1,
       UPDATED_BY = 'devtools'
 WHERE LOGIN_ID = :2`

	for _, preset := range seededTeacherPresets {
		if _, err := tx.ExecContext(ctx, query, preset.presetBody, preset.loginID); err != nil {
			return fmt.Errorf("seed teacher preset for %s: %w", preset.loginID, err)
		}

		logServerRuntime("dev-tools", "init-and-inject:seed:teacher-preset", map[string]any{
			"loginId": preset.loginID,
		})
	}

	return nil
}

func seedDemoReservation(ctx context.Context, tx *sql.Tx, academyCode string, baseTime time.Time) error {
	if tx == nil {
		return fmt.Errorf("seed demo reservation: transaction is nil")
	}

	reservationTime, err := nextSeedReservationTime(baseTime)
	if err != nil {
		return fmt.Errorf("seed demo reservation: %w", err)
	}

	query := `
INSERT INTO MAIMEI_LESSON_RESERVATIONS (
    ACADEMY_CODE,
    STUDENT_ID,
    TEACHER_ID,
    PRESET_ID,
    STARTS_AT_UTC,
    RESERVATION_AT,
    STATUS_CODE,
    NOTE_BODY,
    CREATED_BY,
    UPDATED_BY
) VALUES (
    :1,
    (SELECT STUDENT_ID FROM MAIMEI_STUDENTS WHERE LOGIN_ID = :2),
    (SELECT TEACHER_ID FROM MAIMEI_TEACHERS WHERE LOGIN_ID = :3),
    NULL,
    :4,
    :5,
    'PENDING',
    :6,
    'devtools',
    'devtools'
)`

	noteBody := "Demo pending reservation for student booking and teacher approval flow."
	if _, err := tx.ExecContext(
		ctx,
		query,
		academyCode,
		"student",
		"teacher",
		reservationTime.UTC(),
		reservationTime,
		noteBody,
	); err != nil {
		return fmt.Errorf("seed demo reservation: %w", err)
	}

	logServerRuntime("dev-tools", "init-and-inject:seed:reservation", map[string]any{
		"startsAtUtc": reservationTime.UTC().Format(time.RFC3339),
		"student":     "student",
		"teacher":     "teacher",
	})

	return nil
}

func nextSeedReservationTime(baseTime time.Time) (time.Time, error) {
	location, err := time.LoadLocation("Asia/Seoul")
	if err != nil {
		return time.Time{}, err
	}

	currentLocal := baseTime.In(location)
	candidateDate := time.Date(currentLocal.Year(), currentLocal.Month(), currentLocal.Day(), 10, 0, 0, 0, location)
	if !candidateDate.After(currentLocal.Add(2 * time.Hour)) {
		candidateDate = candidateDate.AddDate(0, 0, 1)
	}

	for {
		switch candidateDate.Weekday() {
		case time.Saturday, time.Sunday:
			candidateDate = candidateDate.AddDate(0, 0, 1)
			candidateDate = time.Date(candidateDate.Year(), candidateDate.Month(), candidateDate.Day(), 10, 0, 0, 0, location)
			continue
		default:
			return candidateDate, nil
		}
	}
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
