package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type accountService interface {
	Login(ctx context.Context, input loginInput) (accountResponse, error)
	RegisterRoot(ctx context.Context, input rootRegisterInput) (accountResponse, error)
	RenewLicense(ctx context.Context, input renewLicenseInput) (licenseRenewResponse, error)
}

type oracleAccountService struct {
	db         *sql.DB
	dbMu       sync.Mutex
	now        func() time.Time
	loadConfig func() (oracleConfig, error)
}

type loginInput struct {
	LoginID  string `json:"loginId"`
	Password string `json:"password"`
}

type rootRegisterInput struct {
	LicenseCode     string `json:"licenseCode"`
	AcademyName     string `json:"academyName"`
	RootLoginID     string `json:"rootLoginId"`
	RootDisplayName string `json:"rootDisplayName"`
	Password        string `json:"password"`
}

type renewLicenseInput struct {
	LicenseCode string `json:"licenseCode"`
}

type accountResponse struct {
	Status      string `json:"status"`
	Message     string `json:"message"`
	AcademyCode string `json:"academyCode"`
	AcademyName string `json:"academyName"`
	DisplayName string `json:"displayName"`
	LoginID     string `json:"loginId"`
	RoleCode    string `json:"roleCode"`
}

type licenseRenewResponse struct {
	Status      string `json:"status"`
	Message     string `json:"message"`
	LicenseCode string `json:"licenseCode"`
	ExpiresAt   string `json:"expiresAt"`
}

type storedAccount struct {
	academyCode  string
	academyName  string
	displayName  string
	loginID      string
	passwordHash string
	roleCode     string
}

type storedLicense struct {
	academyCode sql.NullString
	expiresAt   time.Time
	statusCode  string
}

func newAccountServiceFromEnv() (*oracleAccountService, error) {
	cfg, err := loadOracleConfigFromEnv()
	if err != nil {
		return nil, err
	}

	db, err := openOracleDB(cfg)
	if err != nil {
		return nil, err
	}

	return &oracleAccountService{
		db:         db,
		now:        time.Now,
		loadConfig: loadOracleConfigFromEnv,
	}, nil
}

func (s *oracleAccountService) Login(ctx context.Context, input loginInput) (accountResponse, error) {
	input.LoginID = strings.TrimSpace(input.LoginID)

	if input.LoginID == "" || input.Password == "" {
		return accountResponse{}, fmt.Errorf("loginId and password are required")
	}

	account, err := s.fetchAccount(ctx, input.LoginID)
	if err != nil {
		return accountResponse{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(account.passwordHash), []byte(input.Password)); err != nil {
		return accountResponse{}, fmt.Errorf("invalid login ID or password")
	}

	update := `UPDATE MAME_USERS SET LAST_LOGIN_AT = SYSTIMESTAMP WHERE LOGIN_ID = :1`
	if _, err := s.execWithReconnect(ctx, update, input.LoginID); err != nil {
		return accountResponse{}, fmt.Errorf("update last login: %w", err)
	}

	return accountResponse{
		Status:      "ok",
		Message:     "Signed in successfully.",
		AcademyCode: account.academyCode,
		AcademyName: account.academyName,
		DisplayName: account.displayName,
		LoginID:     account.loginID,
		RoleCode:    account.roleCode,
	}, nil
}

func (s *oracleAccountService) RegisterRoot(ctx context.Context, input rootRegisterInput) (accountResponse, error) {
	input.LicenseCode = strings.TrimSpace(input.LicenseCode)
	input.AcademyName = strings.TrimSpace(input.AcademyName)
	input.RootLoginID = strings.TrimSpace(input.RootLoginID)
	input.RootDisplayName = strings.TrimSpace(input.RootDisplayName)

	switch {
	case input.LicenseCode == "":
		return accountResponse{}, fmt.Errorf("licenseCode is required")
	case input.AcademyName == "":
		return accountResponse{}, fmt.Errorf("academyName is required")
	case input.RootLoginID == "":
		return accountResponse{}, fmt.Errorf("rootLoginId is required")
	case input.RootDisplayName == "":
		return accountResponse{}, fmt.Errorf("rootDisplayName is required")
	case input.Password == "":
		return accountResponse{}, fmt.Errorf("password is required")
	}

	license, err := s.fetchLicense(ctx, input.LicenseCode)
	if err != nil {
		return accountResponse{}, err
	}

	now := time.Now
	if s.now != nil {
		now = s.now
	}

	if license.academyCode.Valid {
		return accountResponse{}, fmt.Errorf("license is already assigned to an academy")
	}

	if license.statusCode != "UNASSIGNED" {
		return accountResponse{}, fmt.Errorf("license is not available for root registration")
	}

	if !license.expiresAt.After(now()) {
		return accountResponse{}, fmt.Errorf("license has expired")
	}

	passwordHash, err := hashPassword(input.Password)
	if err != nil {
		return accountResponse{}, fmt.Errorf("hash password: %w", err)
	}

	tx, err := s.beginTxWithReconnect(ctx)
	if err != nil {
		return accountResponse{}, fmt.Errorf("begin transaction: %w", err)
	}

	defer func() {
		if tx != nil {
			_ = tx.Rollback()
		}
	}()

	var academyCode string
	createAcademy := `
INSERT INTO MAME_ACADEMIES (
    ACADEMY_NAME,
    STATUS_CODE
) VALUES (
    :1,
    'ACTIVE'
)`
	if _, err := tx.ExecContext(
		ctx,
		createAcademy,
		input.AcademyName,
	); err != nil {
		return accountResponse{}, fmt.Errorf("create academy: %w", err)
	}

	readAcademyCode := `
SELECT ACADEMY_CODE
  FROM MAME_ACADEMIES
 WHERE ACADEMY_NAME = :1`
	if err := tx.QueryRowContext(ctx, readAcademyCode, input.AcademyName).Scan(&academyCode); err != nil {
		return accountResponse{}, fmt.Errorf("fetch created academy code: %w", err)
	}

	createRoot := `
INSERT INTO MAME_USERS (
    ACADEMY_CODE,
    LOGIN_ID,
    DISPLAY_NAME,
    PASSWORD_HASH,
    ROLE_CODE,
    STATUS_CODE
) VALUES (
    :1,
    :2,
    :3,
    :4,
    'ROOT',
    'ACTIVE'
)`
	if _, err := tx.ExecContext(
		ctx,
		createRoot,
		academyCode,
		input.RootLoginID,
		input.RootDisplayName,
		passwordHash,
	); err != nil {
		return accountResponse{}, fmt.Errorf("create root account: %w", err)
	}

	assignLicense := `
UPDATE MAME_LICENSES
   SET ACADEMY_CODE = :1,
       STATUS_CODE = 'ACTIVE'
 WHERE LICENSE_CODE = :2
   AND ACADEMY_CODE IS NULL
   AND STATUS_CODE = 'UNASSIGNED'
   AND EXPIRES_AT > SYSTIMESTAMP`
	result, err := tx.ExecContext(ctx, assignLicense, academyCode, input.LicenseCode)
	if err != nil {
		return accountResponse{}, fmt.Errorf("assign license: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return accountResponse{}, fmt.Errorf("read license assignment result: %w", err)
	}

	if rowsAffected != 1 {
		return accountResponse{}, fmt.Errorf("license assignment failed")
	}

	if err := tx.Commit(); err != nil {
		return accountResponse{}, fmt.Errorf("commit root registration: %w", err)
	}
	tx = nil

	return accountResponse{
		Status:      "ok",
		Message:     "Root registration completed.",
		AcademyCode: academyCode,
		AcademyName: input.AcademyName,
		DisplayName: input.RootDisplayName,
		LoginID:     input.RootLoginID,
		RoleCode:    "ROOT",
	}, nil
}

func (s *oracleAccountService) RenewLicense(ctx context.Context, input renewLicenseInput) (licenseRenewResponse, error) {
	input.LicenseCode = strings.TrimSpace(input.LicenseCode)
	if input.LicenseCode == "" {
		return licenseRenewResponse{}, fmt.Errorf("licenseCode is required")
	}

	license, err := s.fetchLicense(ctx, input.LicenseCode)
	if err != nil {
		return licenseRenewResponse{}, err
	}

	now := time.Now
	if s.now != nil {
		now = s.now
	}

	if !license.expiresAt.After(now()) || license.statusCode == "EXPIRED" {
		return licenseRenewResponse{}, fmt.Errorf("license can only be renewed before expiration")
	}

	nextExpiresAt := license.expiresAt.Add(defaultLicenseDuration)
	query := `
UPDATE MAME_LICENSES
   SET EXPIRES_AT = :1,
       STATUS_CODE = CASE
           WHEN STATUS_CODE = 'SUSPENDED' THEN 'SUSPENDED'
           ELSE 'ACTIVE'
       END
 WHERE LICENSE_CODE = :2`
	if _, err := s.execWithReconnect(ctx, query, nextExpiresAt, input.LicenseCode); err != nil {
		return licenseRenewResponse{}, fmt.Errorf("renew license: %w", err)
	}

	return licenseRenewResponse{
		Status:      "ok",
		Message:     "License has been renewed.",
		LicenseCode: input.LicenseCode,
		ExpiresAt:   nextExpiresAt.UTC().Format(time.RFC3339),
	}, nil
}

func (s *oracleAccountService) fetchAccount(ctx context.Context, loginID string) (storedAccount, error) {
	query := `
SELECT
    u.ACADEMY_CODE,
    a.ACADEMY_NAME,
    u.DISPLAY_NAME,
    u.LOGIN_ID,
    u.PASSWORD_HASH,
    u.ROLE_CODE
FROM MAME_USERS u
JOIN MAME_ACADEMIES a
  ON a.ACADEMY_CODE = u.ACADEMY_CODE
WHERE u.LOGIN_ID = :1
  AND u.STATUS_CODE = 'ACTIVE'
  AND a.STATUS_CODE = 'ACTIVE'`

	var account storedAccount
	scan := func(db *sql.DB) error {
		return db.QueryRowContext(ctx, query, loginID).Scan(
			&account.academyCode,
			&account.academyName,
			&account.displayName,
			&account.loginID,
			&account.passwordHash,
			&account.roleCode,
		)
	}

	err := s.queryRowWithReconnect(ctx, scan)
	if errors.Is(err, sql.ErrNoRows) {
		return storedAccount{}, fmt.Errorf("invalid login ID or password")
	}
	if err != nil {
		return storedAccount{}, fmt.Errorf("fetch account: %w", err)
	}

	return account, nil
}

func (s *oracleAccountService) fetchLicense(ctx context.Context, licenseCode string) (storedLicense, error) {
	query := `
SELECT
    ACADEMY_CODE,
    EXPIRES_AT,
    STATUS_CODE
FROM MAME_LICENSES
WHERE LICENSE_CODE = :1`

	var license storedLicense
	scan := func(db *sql.DB) error {
		return db.QueryRowContext(ctx, query, licenseCode).Scan(
			&license.academyCode,
			&license.expiresAt,
			&license.statusCode,
		)
	}

	err := s.queryRowWithReconnect(ctx, scan)
	if errors.Is(err, sql.ErrNoRows) {
		return storedLicense{}, fmt.Errorf("license code was not found")
	}
	if err != nil {
		return storedLicense{}, fmt.Errorf("fetch license: %w", err)
	}

	return license, nil
}

func hashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashed), nil
}

func decodeJSONBody[T any](r *http.Request) (T, error) {
	defer r.Body.Close()

	var input T
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		return input, fmt.Errorf("decode request body: %w", err)
	}

	return input, nil
}

func (s *oracleAccountService) beginTxWithReconnect(ctx context.Context) (*sql.Tx, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if !isClosedConnectionError(err) {
		return tx, err
	}

	if err := s.reconnect(ctx); err != nil {
		return nil, err
	}

	return s.db.BeginTx(ctx, nil)
}

func (s *oracleAccountService) execWithReconnect(
	ctx context.Context,
	query string,
	args ...any,
) (sql.Result, error) {
	result, err := s.db.ExecContext(ctx, query, args...)
	if !isClosedConnectionError(err) {
		return result, err
	}

	if err := s.reconnect(ctx); err != nil {
		return nil, err
	}

	return s.db.ExecContext(ctx, query, args...)
}

func (s *oracleAccountService) queryRowWithReconnect(
	ctx context.Context,
	scan func(db *sql.DB) error,
) error {
	err := scan(s.db)
	if !isClosedConnectionError(err) {
		return err
	}

	if err := s.reconnect(ctx); err != nil {
		return err
	}

	return scan(s.db)
}

func (s *oracleAccountService) reconnect(ctx context.Context) error {
	s.dbMu.Lock()
	defer s.dbMu.Unlock()

	if s.db != nil {
		if pingErr := s.db.PingContext(ctx); pingErr == nil {
			return nil
		}
	}

	loadConfig := s.loadConfig
	if loadConfig == nil {
		loadConfig = loadOracleConfigFromEnv
	}

	cfg, err := loadConfig()
	if err != nil {
		return fmt.Errorf("reload oracle config: %w", err)
	}

	db, err := openOracleDB(cfg)
	if err != nil {
		return fmt.Errorf("reconnect oracle account service: %w", err)
	}

	previous := s.db
	s.db = db
	if previous != nil {
		_ = previous.Close()
	}

	return nil
}

func isClosedConnectionError(err error) bool {
	if err == nil {
		return false
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "closed connection")
}
