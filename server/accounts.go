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
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

const (
	constraintAcademiesName   = "uq_maimei_academies_name"
	constraintAdminRootAcademy = "uq_maimei_admins_root_per_academy"
	constraintAdminEmail      = "uq_maimei_admins_email"
	constraintAdminLoginID    = "uq_maimei_admins_login_id"
	constraintTeachersEmail   = "uq_maimei_teachers_email"
	constraintTeacherLoginID  = "uq_maimei_teachers_login_id"
	constraintStudentEmail    = "uq_maimei_students_email"
	constraintStudentLoginID  = "uq_maimei_students_login_id"
)

type accountService interface {
	Login(ctx context.Context, input loginInput) (accountResponse, error)
	GetProfile(ctx context.Context, loginID string) (profileResponse, error)
	RegisterMember(ctx context.Context, input memberRegisterInput) (accountResponse, error)
	RegisterRoot(ctx context.Context, input rootRegisterInput) (accountResponse, error)
	SearchPendingMembers(ctx context.Context, input pendingMemberSearchInput) (pendingMembersResponse, error)
	ApprovePendingMember(ctx context.Context, input approvePendingMemberInput) (accountResponse, error)
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
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	Password        string `json:"password"`
}

type memberRegisterInput struct {
	LoginID           string `json:"loginId"`
	DisplayName       string `json:"displayName"`
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	Password          string `json:"password"`
	RequestedRoleCode string `json:"requestedRoleCode"`
	AcademyCode       string `json:"academyCode"`
}

type renewLicenseInput struct {
	LicenseCode string `json:"licenseCode"`
}

type pendingMemberSearchInput struct {
	AcademyCode   string `json:"academyCode"`
	ActorRoleCode string `json:"actorRoleCode"`
	Field         string `json:"field"`
	Query         string `json:"query"`
}

type approvePendingMemberInput struct {
	AcademyCode   string `json:"academyCode"`
	ActorRoleCode string `json:"actorRoleCode"`
	LoginID       string `json:"loginId"`
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

type profileResponse struct {
	Status      string `json:"status"`
	Message     string `json:"message"`
	AcademyCode string `json:"academyCode,omitempty"`
	AcademyName string `json:"academyName,omitempty"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email,omitempty"`
	Phone       string `json:"phone,omitempty"`
	LoginID     string `json:"loginId"`
	RoleCode    string `json:"roleCode"`
	LicenseCode string `json:"licenseCode,omitempty"`
	ExpiresAt   string `json:"expiresAt,omitempty"`
}

type pendingMemberRecord struct {
	DisplayName string `json:"displayName"`
	Email       string `json:"email,omitempty"`
	Phone       string `json:"phone,omitempty"`
	LoginID     string `json:"loginId"`
	RoleCode    string `json:"roleCode"`
	CreatedAt   string `json:"createdAt"`
}

type pendingMembersResponse struct {
	Status  string                `json:"status"`
	Message string                `json:"message"`
	Members []pendingMemberRecord `json:"members"`
}

type licenseRenewResponse struct {
	Status      string `json:"status"`
	Message     string `json:"message"`
	LicenseCode string `json:"licenseCode"`
	ExpiresAt   string `json:"expiresAt"`
}

type storedAccount struct {
	academyCode  sql.NullString
	academyName  sql.NullString
	academyState sql.NullString
	displayName  string
	email        sql.NullString
	loginID      string
	passwordHash string
	phone        sql.NullString
	roleCode     string
	statusCode   string
	licenseCode  sql.NullString
	expiresAt    sql.NullTime
	sourceTable  string
}

type storedLicense struct {
	academyCode sql.NullString
	expiresAt   time.Time
	statusCode  string
}

type pendingSearchField struct {
	column          string
	label           string
	matchExpression string
	normalizeValue  func(string) string
}

type pendingSearchRoleSpec struct {
	alias         string
	profileTable  string
	roleCode      string
	extraWhereSQL string
}

type pendingMemberRoleSpec struct {
	roleCode             string
	sequenceName         string
	profileTable         string
	profileIDColumn      string
	loginConstraint      string
	duplicateConstraint  string
	prepareAccountError  string
	insertProfileError   string
	roleInsertColumnSQL  string
	roleInsertValueSQL   string
	roleInsertValue      any
	approveExtraWhereSQL string
}

var pendingSearchFields = map[string]pendingSearchField{
	"displayName": {
		column:          "DISPLAY_NAME",
		label:           "display name",
		matchExpression: "LOWER(%s.%s) LIKE '%%' || LOWER(:1) || '%%'",
	},
	"email": {
		column:          "EMAIL",
		label:           "email",
		matchExpression: "LOWER(%s.%s) LIKE '%%' || LOWER(:1) || '%%'",
	},
	"phone": {
		column:          "PHONE",
		label:           "phone number",
		matchExpression: "REPLACE(%s.%s, '-', '') LIKE '%%' || REPLACE(:1, '-', '') || '%%'",
	},
}

var pendingSearchRoleSpecs = []pendingSearchRoleSpec{
	{
		alias:        "s",
		profileTable: "MAIMEI_STUDENTS",
		roleCode:     "STUDENT",
	},
	{
		alias:        "t",
		profileTable: "MAIMEI_TEACHERS",
		roleCode:     "TEACHER",
	},
	{
		alias:        "st",
		profileTable: "MAIMEI_ADMINS",
		roleCode:     "ADMIN",
		extraWhereSQL: "\n      AND st.ROLE_CODE = 'ADMIN'",
	},
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
		return accountResponse{}, fmt.Errorf("Please enter your login ID and password.")
	}

	account, err := s.fetchAccount(ctx, input.LoginID)
	if err != nil {
		return accountResponse{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(account.passwordHash), []byte(input.Password)); err != nil {
		return accountResponse{}, fmt.Errorf("The login ID or password is incorrect.")
	}

	switch account.statusCode {
	case "PENDING":
		return accountResponse{}, fmt.Errorf("Your account is waiting for approval.")
	case "HOLD":
		return accountResponse{}, fmt.Errorf("Your account is currently on hold.")
	case "INACTIVE":
		return accountResponse{}, fmt.Errorf("Your account is inactive.")
	case "ACTIVE":
	default:
		return accountResponse{}, fmt.Errorf("Your account is unavailable right now.")
	}

	if account.academyCode.Valid && account.academyState.Valid && account.academyState.String != "ACTIVE" {
		return accountResponse{}, fmt.Errorf("Your academy is currently inactive.")
	}

	if err := s.updateLastLoginAt(ctx, account); err != nil {
		return accountResponse{}, err
	}

	return accountResponse{
		Status:      "ok",
		Message:     "Signed in successfully.",
		AcademyCode: nullStringValue(account.academyCode),
		AcademyName: nullStringValue(account.academyName),
		DisplayName: account.displayName,
		LoginID:     account.loginID,
		RoleCode:    account.roleCode,
	}, nil
}

func (s *oracleAccountService) GetProfile(ctx context.Context, loginID string) (profileResponse, error) {
	loginID = strings.TrimSpace(loginID)
	if loginID == "" {
		return profileResponse{}, fmt.Errorf("No active session was found.")
	}

	account, err := s.fetchAccount(ctx, loginID)
	if err != nil {
		return profileResponse{}, err
	}

	switch account.statusCode {
	case "PENDING":
		return profileResponse{}, fmt.Errorf("Your account is waiting for approval.")
	case "HOLD":
		return profileResponse{}, fmt.Errorf("Your account is currently on hold.")
	case "INACTIVE":
		return profileResponse{}, fmt.Errorf("Your account is inactive.")
	case "ACTIVE":
	default:
		return profileResponse{}, fmt.Errorf("Your account is unavailable right now.")
	}

	if account.academyCode.Valid && account.academyState.Valid && account.academyState.String != "ACTIVE" {
		return profileResponse{}, fmt.Errorf("Your academy is currently inactive.")
	}

	response := profileResponse{
		Status:      "ok",
		Message:     "Profile loaded successfully.",
		AcademyCode: nullStringValue(account.academyCode),
		AcademyName: nullStringValue(account.academyName),
		DisplayName: account.displayName,
		Email:       nullStringValue(account.email),
		Phone:       nullStringValue(account.phone),
		LoginID:     account.loginID,
		RoleCode:    account.roleCode,
		LicenseCode: nullStringValue(account.licenseCode),
	}
	if account.expiresAt.Valid {
		response.ExpiresAt = account.expiresAt.Time.UTC().Format(time.RFC3339)
	}

	return response, nil
}

func (s *oracleAccountService) RegisterMember(
	ctx context.Context,
	input memberRegisterInput,
) (accountResponse, error) {
	input.LoginID = strings.TrimSpace(input.LoginID)
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.Email = strings.TrimSpace(input.Email)
	input.Phone = strings.TrimSpace(input.Phone)
	input.RequestedRoleCode = strings.ToUpper(strings.TrimSpace(input.RequestedRoleCode))

	if err := validateMemberRegisterInput(input); err != nil {
		return accountResponse{}, err
	}

	passwordHash, err := hashPassword(input.Password)
	if err != nil {
		return accountResponse{}, err
	}

	if err := s.ensureLoginIDAvailable(ctx, input.LoginID); err != nil {
		return accountResponse{}, err
	}

	tx, err := s.beginTxWithReconnect(ctx)
	if err != nil {
		return accountResponse{}, err
	}

	defer func() {
		if tx != nil {
			_ = tx.Rollback()
		}
	}()

	spec, err := resolvePendingMemberRoleSpec(input.RequestedRoleCode)
	if err != nil {
		return accountResponse{}, err
	}

	if err := registerPendingMember(ctx, tx, spec, input, passwordHash); err != nil {
		return accountResponse{}, err
	}

	if err := tx.Commit(); err != nil {
		return accountResponse{}, err
	}
	tx = nil

	return accountResponse{
		Status:      "ok",
		Message:     "Member registration submitted. Approval is required.",
		DisplayName: input.DisplayName,
		LoginID:     input.LoginID,
		RoleCode:    input.RequestedRoleCode,
	}, nil
}

func (s *oracleAccountService) RegisterRoot(ctx context.Context, input rootRegisterInput) (accountResponse, error) {
	input.LicenseCode = strings.TrimSpace(input.LicenseCode)
	input.AcademyName = strings.TrimSpace(input.AcademyName)
	input.RootLoginID = strings.TrimSpace(input.RootLoginID)
	input.RootDisplayName = strings.TrimSpace(input.RootDisplayName)
	input.Email = strings.TrimSpace(input.Email)
	input.Phone = strings.TrimSpace(input.Phone)

	switch {
	case input.LicenseCode == "":
		return accountResponse{}, fmt.Errorf("Please enter a license code.")
	case input.AcademyName == "":
		return accountResponse{}, fmt.Errorf("Please enter an academy name.")
	case input.RootLoginID == "":
		return accountResponse{}, fmt.Errorf("Please enter a root login ID.")
	case input.RootDisplayName == "":
		return accountResponse{}, fmt.Errorf("Please enter a root display name.")
	case input.Phone == "":
		return accountResponse{}, fmt.Errorf("Please enter a phone number.")
	case input.Password == "":
		return accountResponse{}, fmt.Errorf("Please enter a password.")
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
		return accountResponse{}, fmt.Errorf("This license has already been assigned to an academy.")
	}

	if license.statusCode != "UNASSIGNED" {
		return accountResponse{}, fmt.Errorf("This license is not available for registration.")
	}

	if !license.expiresAt.After(now()) {
		return accountResponse{}, fmt.Errorf("This license has expired.")
	}

	passwordHash, err := hashPassword(input.Password)
	if err != nil {
		return accountResponse{}, err
	}

	if err := s.ensureLoginIDAvailable(ctx, input.RootLoginID); err != nil {
		return accountResponse{}, err
	}

	tx, err := s.beginTxWithReconnect(ctx)
	if err != nil {
		return accountResponse{}, err
	}

	defer func() {
		if tx != nil {
			_ = tx.Rollback()
		}
	}()

	var academyCode string
	createAcademy := `
INSERT INTO MAIMEI_ACADEMIES (
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
		if isAccountUniqueConstraintError(err, constraintAcademiesName) {
			return accountResponse{}, fmt.Errorf("That academy name is already in use. Please choose another one.")
		}

		return accountResponse{}, err
	}

	readAcademyCode := `
SELECT ACADEMY_CODE
  FROM MAIMEI_ACADEMIES
 WHERE ACADEMY_NAME = :1`
	if err := tx.QueryRowContext(ctx, readAcademyCode, input.AcademyName).Scan(&academyCode); err != nil {
		return accountResponse{}, err
	}

	var adminID int64
	if err := tx.QueryRowContext(ctx, `SELECT MAIMEI_ADMINS_SEQ.NEXTVAL FROM DUAL`).Scan(&adminID); err != nil {
		return accountResponse{}, err
	}

	createRootAdmin := `
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
	if _, err := tx.ExecContext(
		ctx,
		createRootAdmin,
		adminID,
		academyCode,
		input.RootLoginID,
		passwordHash,
		nullIfEmpty(input.Email),
		input.Phone,
		input.RootDisplayName,
	); err != nil {
		if isAccountUniqueConstraintError(err, constraintAdminRootAcademy) {
			return accountResponse{}, fmt.Errorf("This academy already has a root account.")
		}
		if isAccountUniqueConstraintError(err, constraintAdminLoginID) {
			return accountResponse{}, fmt.Errorf("That login ID is already in use. Please choose another one.")
		}
		if isAccountUniqueConstraintError(err, constraintAdminEmail) {
			return accountResponse{}, fmt.Errorf("That email address is already in use. Please choose another one.")
		}

		return accountResponse{}, err
	}

	assignLicense := `
UPDATE MAIMEI_LICENSES
   SET ACADEMY_CODE = :1,
       STATUS_CODE = 'ACTIVE'
 WHERE LICENSE_CODE = :2
   AND ACADEMY_CODE IS NULL
   AND STATUS_CODE = 'UNASSIGNED'
   AND EXPIRES_AT > SYSTIMESTAMP`
	result, err := tx.ExecContext(ctx, assignLicense, academyCode, input.LicenseCode)
	if err != nil {
		return accountResponse{}, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return accountResponse{}, err
	}

	if rowsAffected != 1 {
		return accountResponse{}, fmt.Errorf("We couldn't assign that license. Please check the license and try again.")
	}

	if err := tx.Commit(); err != nil {
		return accountResponse{}, err
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

func validateMemberRegisterInput(input memberRegisterInput) error {
	switch {
	case input.LoginID == "":
		return fmt.Errorf("Please enter a login ID.")
	case input.DisplayName == "":
		return fmt.Errorf("Please enter a display name.")
	case input.Phone == "":
		return fmt.Errorf("Please enter a phone number.")
	case input.Password == "":
		return fmt.Errorf("Please enter a password.")
	case input.RequestedRoleCode == "":
		return fmt.Errorf("Please choose a member role.")
	}

	switch input.RequestedRoleCode {
	case "STUDENT", "TEACHER", "ADMIN":
		return nil
	default:
		return fmt.Errorf("Please choose a valid member role.")
	}
}

func resolvePendingMemberRoleSpec(roleCode string) (pendingMemberRoleSpec, error) {
	switch roleCode {
	case "STUDENT":
		return pendingMemberRoleSpec{
			roleCode:            "STUDENT",
			sequenceName:        "MAIMEI_STUDENTS_SEQ",
			profileTable:        "MAIMEI_STUDENTS",
			profileIDColumn:     "STUDENT_ID",
			loginConstraint:     constraintStudentLoginID,
			prepareAccountError: "We couldn't prepare your member account right now. Please try again.",
			insertProfileError:  "We couldn't create your member profile right now. Please try again.",
			duplicateConstraint: constraintStudentEmail,
		}, nil
	case "TEACHER":
		return pendingMemberRoleSpec{
			roleCode:            "TEACHER",
			sequenceName:        "MAIMEI_TEACHERS_SEQ",
			profileTable:        "MAIMEI_TEACHERS",
			profileIDColumn:     "TEACHER_ID",
			loginConstraint:     constraintTeacherLoginID,
			duplicateConstraint: constraintTeachersEmail,
			prepareAccountError: "We couldn't prepare your teacher account right now. Please try again.",
			insertProfileError:  "We couldn't create your teacher profile right now. Please try again.",
		}, nil
	case "ADMIN":
		return pendingMemberRoleSpec{
			roleCode:             "ADMIN",
			sequenceName:         "MAIMEI_ADMINS_SEQ",
			profileTable:         "MAIMEI_ADMINS",
			profileIDColumn:      "ADMIN_ID",
			loginConstraint:      constraintAdminLoginID,
			duplicateConstraint:  constraintAdminEmail,
			prepareAccountError:  "We couldn't prepare your admin account right now. Please try again.",
			insertProfileError:   "We couldn't create your admin profile right now. Please try again.",
			roleInsertColumnSQL:  ",\n    ROLE_CODE",
			roleInsertValueSQL:   ",\n    :7",
			roleInsertValue:      "ADMIN",
			approveExtraWhereSQL: "\n   AND ROLE_CODE = 'ADMIN'",
		}, nil
	default:
		return pendingMemberRoleSpec{}, fmt.Errorf("Please choose a valid member role.")
	}
}

func nextSequenceValue(ctx context.Context, tx *sql.Tx, sequenceName string) (int64, error) {
	query := fmt.Sprintf("SELECT %s.NEXTVAL FROM DUAL", sequenceName)
	var value int64
	if err := tx.QueryRowContext(ctx, query).Scan(&value); err != nil {
		return 0, err
	}
	return value, nil
}

func insertPendingMemberProfile(
	ctx context.Context,
	tx *sql.Tx,
	spec pendingMemberRoleSpec,
	input memberRegisterInput,
	passwordHash string,
) (int64, error) {
	entityID, err := nextSequenceValue(ctx, tx, spec.sequenceName)
	if err != nil {
		return 0, err
	}

	insertProfile := fmt.Sprintf(`
INSERT INTO %s (
    %s,
    ACADEMY_CODE,
    LOGIN_ID,
    PASSWORD_HASH,
    EMAIL,
    PHONE,
    DISPLAY_NAME%s,
    STATUS_CODE
) VALUES (
    :1,
    NULL,
    :2,
    :3,
    :4,
    :5,
    :6%s,
    'PENDING'
)`, spec.profileTable, spec.profileIDColumn, spec.roleInsertColumnSQL, spec.roleInsertValueSQL)

	args := []any{entityID, input.LoginID, passwordHash, nullIfEmpty(input.Email), input.Phone, input.DisplayName}
	if spec.roleInsertValueSQL != "" {
		args = append(args, spec.roleInsertValue)
	}

	if _, err := tx.ExecContext(ctx, insertProfile, args...); err != nil {
		if spec.loginConstraint != "" && isAccountUniqueConstraintError(err, spec.loginConstraint) {
			return 0, fmt.Errorf("That login ID is already in use. Please choose another one.")
		}
		if spec.duplicateConstraint != "" && isAccountUniqueConstraintError(err, spec.duplicateConstraint) {
			return 0, fmt.Errorf("That email address is already in use. Please choose another one.")
		}
		return 0, err
	}

	return entityID, nil
}

func registerPendingMember(
	ctx context.Context,
	tx *sql.Tx,
	spec pendingMemberRoleSpec,
	input memberRegisterInput,
	passwordHash string,
) error {
	_, err := insertPendingMemberProfile(ctx, tx, spec, input, passwordHash)
	return err
}

func buildPendingMembersSearchQuery(field pendingSearchField) string {
	selectBlocks := make([]string, 0, len(pendingSearchRoleSpecs))
	for _, spec := range pendingSearchRoleSpecs {
		matchExpression := fmt.Sprintf(
			field.matchExpression,
			spec.alias,
			field.column,
		)
		selectBlocks = append(selectBlocks, fmt.Sprintf(`
    SELECT
        %[1]s.LOGIN_ID AS login_id,
        %[1]s.DISPLAY_NAME AS display_name,
        %[1]s.EMAIL AS email,
        %[1]s.PHONE AS phone,
        '%[3]s' AS role_code,
        %[1]s.CREATED_AT AS created_at
    FROM %[2]s %[1]s
    WHERE %[1]s.STATUS_CODE = 'PENDING'
      AND %[1]s.ACADEMY_CODE IS NULL
      %[4]s
      AND %s`, spec.alias, spec.profileTable, spec.roleCode, strings.TrimPrefix(spec.extraWhereSQL, "\n"), matchExpression))
	}

	return fmt.Sprintf(`
SELECT
    login_id,
    display_name,
    email,
    phone,
    role_code,
    created_at
FROM (
%s
)
ORDER BY created_at DESC`, strings.Join(selectBlocks, "\n\n    UNION ALL\n"))
}

func scanPendingMemberRecords(rows *sql.Rows) ([]pendingMemberRecord, error) {
	members := make([]pendingMemberRecord, 0, 4)
	for rows.Next() {
		var (
			loginID     string
			displayName string
			email       sql.NullString
			phone       sql.NullString
			roleCode    string
			createdAt   time.Time
		)

		if err := rows.Scan(&loginID, &displayName, &email, &phone, &roleCode, &createdAt); err != nil {
			return nil, err
		}

		members = append(members, pendingMemberRecord{
			DisplayName: displayName,
			Email:       nullStringValue(email),
			Phone:       nullStringValue(phone),
			LoginID:     loginID,
			RoleCode:    roleCode,
			CreatedAt:   createdAt.UTC().Format(time.RFC3339),
		})
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return members, nil
}

func (s *oracleAccountService) SearchPendingMembers(
	ctx context.Context,
	input pendingMemberSearchInput,
) (pendingMembersResponse, error) {
	input.AcademyCode = strings.TrimSpace(input.AcademyCode)
	input.ActorRoleCode = strings.ToUpper(strings.TrimSpace(input.ActorRoleCode))
	input.Field = strings.TrimSpace(input.Field)
	input.Query = strings.TrimSpace(input.Query)

	if err := validatePendingModerationAccess(input.AcademyCode, input.ActorRoleCode); err != nil {
		return pendingMembersResponse{}, err
	}

	if input.Field == "" {
		return pendingMembersResponse{}, fmt.Errorf("Please choose a search field.")
	}
	if input.Query == "" {
		return pendingMembersResponse{}, fmt.Errorf("Please enter a search value.")
	}

	field, ok := pendingSearchFields[input.Field]
	if !ok {
		return pendingMembersResponse{}, fmt.Errorf("Please choose a valid search field.")
	}

	input.Query = normalizePendingSearchQuery(input.Field, input.Query)
	if err := validatePendingSearchQuery(input.Field, input.Query); err != nil {
		return pendingMembersResponse{}, err
	}

	query := buildPendingMembersSearchQuery(field)

	rows, err := s.db.QueryContext(ctx, query, input.Query)
	if err != nil {
		return pendingMembersResponse{}, err
	}
	defer rows.Close()

	members, err := scanPendingMemberRecords(rows)
	if err != nil {
		return pendingMembersResponse{}, err
	}

	if len(members) == 0 {
		return pendingMembersResponse{}, fmt.Errorf("No pending members matched that %s.", field.label)
	}

	return pendingMembersResponse{
		Status:  "ok",
		Message: "Pending members found.",
		Members: members,
	}, nil
}

func (s *oracleAccountService) ApprovePendingMember(
	ctx context.Context,
	input approvePendingMemberInput,
) (accountResponse, error) {
	input.AcademyCode = strings.TrimSpace(input.AcademyCode)
	input.ActorRoleCode = strings.ToUpper(strings.TrimSpace(input.ActorRoleCode))
	input.LoginID = strings.TrimSpace(input.LoginID)

	if err := validatePendingModerationAccess(input.AcademyCode, input.ActorRoleCode); err != nil {
		return accountResponse{}, err
	}
	if input.LoginID == "" {
		return accountResponse{}, fmt.Errorf("Please choose a pending member.")
	}

	tx, err := s.beginTxWithReconnect(ctx)
	if err != nil {
		return accountResponse{}, err
	}

	defer func() {
		if tx != nil {
			_ = tx.Rollback()
		}
	}()

	targetRoleCode, err := lookupPendingAccountRole(ctx, tx, input.LoginID)
	if err != nil {
		return accountResponse{}, err
	}

	spec, err := resolvePendingMemberRoleSpec(targetRoleCode)
	if err != nil {
		return accountResponse{}, fmt.Errorf("That pending member could not be found.")
	}

	if err := approvePendingMemberProfile(ctx, tx, spec, input.AcademyCode, input.LoginID); err != nil {
		return accountResponse{}, err
	}

	if err := tx.Commit(); err != nil {
		return accountResponse{}, err
	}
	tx = nil

	return accountResponse{
		Status:   "ok",
		Message:  "Pending member approved successfully.",
		LoginID:  input.LoginID,
		RoleCode: targetRoleCode,
	}, nil
}

func lookupPendingAccountRole(ctx context.Context, tx *sql.Tx, loginID string) (string, error) {
	readRole := `
SELECT role_code
  FROM (
    SELECT ROLE_CODE AS role_code
      FROM MAIMEI_ADMINS
     WHERE LOGIN_ID = :1
       AND STATUS_CODE = 'PENDING'
       AND ACADEMY_CODE IS NULL
       AND ROLE_CODE = 'ADMIN'
    UNION ALL
    SELECT 'TEACHER' AS role_code
      FROM MAIMEI_TEACHERS
     WHERE LOGIN_ID = :1
       AND STATUS_CODE = 'PENDING'
       AND ACADEMY_CODE IS NULL
    UNION ALL
    SELECT 'STUDENT' AS role_code
      FROM MAIMEI_STUDENTS
     WHERE LOGIN_ID = :1
       AND STATUS_CODE = 'PENDING'
       AND ACADEMY_CODE IS NULL
  )`

	var targetRoleCode string
	if err := tx.QueryRowContext(ctx, readRole, loginID).Scan(&targetRoleCode); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", fmt.Errorf("That pending member could not be found.")
		}
		return "", err
	}

	return targetRoleCode, nil
}

func approvePendingMemberProfile(
	ctx context.Context,
	tx *sql.Tx,
	spec pendingMemberRoleSpec,
	academyCode string,
	loginID string,
) error {
	approveProfile := fmt.Sprintf(`
UPDATE %s
   SET ACADEMY_CODE = :1,
        STATUS_CODE = 'ACTIVE'
 WHERE LOGIN_ID = :2
   AND STATUS_CODE = 'PENDING'
   AND ACADEMY_CODE IS NULL%s`, spec.profileTable, spec.approveExtraWhereSQL)

	result, err := tx.ExecContext(ctx, approveProfile, academyCode, loginID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected != 1 {
		return fmt.Errorf("That pending member could not be found.")
	}

	return nil
}
func (s *oracleAccountService) RenewLicense(ctx context.Context, input renewLicenseInput) (licenseRenewResponse, error) {
	input.LicenseCode = strings.TrimSpace(input.LicenseCode)
	if input.LicenseCode == "" {
		return licenseRenewResponse{}, fmt.Errorf("Please enter a license code.")
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
		return licenseRenewResponse{}, fmt.Errorf("This license can only be renewed before it expires.")
	}

	nextExpiresAt := license.expiresAt.Add(defaultLicenseDuration)
	query := `
UPDATE MAIMEI_LICENSES
   SET EXPIRES_AT = :1,
       STATUS_CODE = CASE
           WHEN STATUS_CODE = 'SUSPENDED' THEN 'SUSPENDED'
           ELSE 'ACTIVE'
       END
 WHERE LICENSE_CODE = :2`
	if _, err := s.execWithReconnect(ctx, query, nextExpiresAt, input.LicenseCode); err != nil {
		return licenseRenewResponse{}, err
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
    academy_code,
    academy_name,
    academy_state,
    display_name,
    email,
    status_code,
    login_id,
    password_hash,
    phone,
    role_code,
    license_code,
    expires_at,
    source_table
FROM (
    SELECT
        adm.ACADEMY_CODE AS academy_code,
        aca.ACADEMY_NAME AS academy_name,
        aca.STATUS_CODE AS academy_state,
        adm.DISPLAY_NAME AS display_name,
        adm.EMAIL AS email,
        adm.STATUS_CODE AS status_code,
        adm.LOGIN_ID AS login_id,
        adm.PASSWORD_HASH AS password_hash,
        adm.PHONE AS phone,
        adm.ROLE_CODE AS role_code,
        (
            SELECT MAX(lic.LICENSE_CODE) KEEP (DENSE_RANK LAST ORDER BY lic.EXPIRES_AT)
            FROM MAIMEI_LICENSES lic
            WHERE lic.ACADEMY_CODE = adm.ACADEMY_CODE
              AND lic.STATUS_CODE IN ('ACTIVE', 'SUSPENDED')
        ) AS license_code,
        (
            SELECT MAX(lic.EXPIRES_AT)
            FROM MAIMEI_LICENSES lic
            WHERE lic.ACADEMY_CODE = adm.ACADEMY_CODE
              AND lic.STATUS_CODE IN ('ACTIVE', 'SUSPENDED')
        ) AS expires_at,
        'MAIMEI_ADMINS' AS source_table
    FROM MAIMEI_ADMINS adm
    LEFT JOIN MAIMEI_ACADEMIES aca
      ON aca.ACADEMY_CODE = adm.ACADEMY_CODE
    WHERE adm.LOGIN_ID = :1
    UNION ALL
    SELECT
        tch.ACADEMY_CODE AS academy_code,
        aca.ACADEMY_NAME AS academy_name,
        aca.STATUS_CODE AS academy_state,
        tch.DISPLAY_NAME AS display_name,
        tch.EMAIL AS email,
        tch.STATUS_CODE AS status_code,
        tch.LOGIN_ID AS login_id,
        tch.PASSWORD_HASH AS password_hash,
        tch.PHONE AS phone,
        'TEACHER' AS role_code,
        (
            SELECT MAX(lic.LICENSE_CODE) KEEP (DENSE_RANK LAST ORDER BY lic.EXPIRES_AT)
            FROM MAIMEI_LICENSES lic
            WHERE lic.ACADEMY_CODE = tch.ACADEMY_CODE
              AND lic.STATUS_CODE IN ('ACTIVE', 'SUSPENDED')
        ) AS license_code,
        (
            SELECT MAX(lic.EXPIRES_AT)
            FROM MAIMEI_LICENSES lic
            WHERE lic.ACADEMY_CODE = tch.ACADEMY_CODE
              AND lic.STATUS_CODE IN ('ACTIVE', 'SUSPENDED')
        ) AS expires_at,
        'MAIMEI_TEACHERS' AS source_table
    FROM MAIMEI_TEACHERS tch
    LEFT JOIN MAIMEI_ACADEMIES aca
      ON aca.ACADEMY_CODE = tch.ACADEMY_CODE
    WHERE tch.LOGIN_ID = :1
    UNION ALL
    SELECT
        stu.ACADEMY_CODE AS academy_code,
        aca.ACADEMY_NAME AS academy_name,
        aca.STATUS_CODE AS academy_state,
        stu.DISPLAY_NAME AS display_name,
        stu.EMAIL AS email,
        stu.STATUS_CODE AS status_code,
        stu.LOGIN_ID AS login_id,
        stu.PASSWORD_HASH AS password_hash,
        stu.PHONE AS phone,
        'STUDENT' AS role_code,
        (
            SELECT MAX(lic.LICENSE_CODE) KEEP (DENSE_RANK LAST ORDER BY lic.EXPIRES_AT)
            FROM MAIMEI_LICENSES lic
            WHERE lic.ACADEMY_CODE = stu.ACADEMY_CODE
              AND lic.STATUS_CODE IN ('ACTIVE', 'SUSPENDED')
        ) AS license_code,
        (
            SELECT MAX(lic.EXPIRES_AT)
            FROM MAIMEI_LICENSES lic
            WHERE lic.ACADEMY_CODE = stu.ACADEMY_CODE
              AND lic.STATUS_CODE IN ('ACTIVE', 'SUSPENDED')
        ) AS expires_at,
        'MAIMEI_STUDENTS' AS source_table
    FROM MAIMEI_STUDENTS stu
    LEFT JOIN MAIMEI_ACADEMIES aca
      ON aca.ACADEMY_CODE = stu.ACADEMY_CODE
    WHERE stu.LOGIN_ID = :1
)`

	var account storedAccount
	scan := func(db *sql.DB) error {
		return db.QueryRowContext(ctx, query, loginID).Scan(
			&account.academyCode,
			&account.academyName,
			&account.academyState,
			&account.displayName,
			&account.email,
			&account.statusCode,
			&account.loginID,
			&account.passwordHash,
			&account.phone,
			&account.roleCode,
			&account.licenseCode,
			&account.expiresAt,
			&account.sourceTable,
		)
	}

	err := s.queryRowWithReconnect(ctx, scan)
	if errors.Is(err, sql.ErrNoRows) {
		return storedAccount{}, fmt.Errorf("The login ID or password is incorrect.")
	}
	if err != nil {
		return storedAccount{}, err
	}

	return account, nil
}

func (s *oracleAccountService) fetchLicense(ctx context.Context, licenseCode string) (storedLicense, error) {
	query := `
SELECT
    ACADEMY_CODE,
    EXPIRES_AT,
    STATUS_CODE
FROM MAIMEI_LICENSES
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
		return storedLicense{}, fmt.Errorf("That license code could not be found.")
	}
	if err != nil {
		return storedLicense{}, err
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

func (s *oracleAccountService) ensureLoginIDAvailable(ctx context.Context, loginID string) error {
	loginID = strings.TrimSpace(loginID)
	if loginID == "" {
		return fmt.Errorf("Please enter a login ID.")
	}

	query := `
SELECT COUNT(*)
  FROM (
    SELECT LOGIN_ID FROM MAIMEI_ADMINS WHERE LOGIN_ID = :1
    UNION ALL
    SELECT LOGIN_ID FROM MAIMEI_TEACHERS WHERE LOGIN_ID = :1
    UNION ALL
    SELECT LOGIN_ID FROM MAIMEI_STUDENTS WHERE LOGIN_ID = :1
  )`

	var count int
	scan := func(db *sql.DB) error {
		return db.QueryRowContext(ctx, query, loginID).Scan(&count)
	}

	if err := s.queryRowWithReconnect(ctx, scan); err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("That login ID is already in use. Please choose another one.")
	}

	return nil
}

func (s *oracleAccountService) updateLastLoginAt(ctx context.Context, account storedAccount) error {
	var query string
	switch account.sourceTable {
	case "MAIMEI_ADMINS":
		query = `UPDATE MAIMEI_ADMINS SET LAST_LOGIN_AT = SYSTIMESTAMP WHERE LOGIN_ID = :1`
	case "MAIMEI_TEACHERS":
		query = `UPDATE MAIMEI_TEACHERS SET LAST_LOGIN_AT = SYSTIMESTAMP WHERE LOGIN_ID = :1`
	case "MAIMEI_STUDENTS":
		query = `UPDATE MAIMEI_STUDENTS SET LAST_LOGIN_AT = SYSTIMESTAMP WHERE LOGIN_ID = :1`
	default:
		return fmt.Errorf("unknown account source")
	}

	_, err := s.execWithReconnect(ctx, query, account.loginID)
	return err
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

func nullStringValue(value sql.NullString) string {
	if !value.Valid {
		return ""
	}

	return value.String
}

func nullIfEmpty(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	return value
}

func isAccountUniqueConstraintError(err error, constraintName string) bool {
	if err == nil {
		return false
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "ora-00001") && strings.Contains(message, constraintName)
}

func validatePendingModerationAccess(academyCode, actorRoleCode string) error {
	if academyCode == "" {
		return fmt.Errorf("Please enter your academy code.")
	}

	switch actorRoleCode {
	case "ROOT", "ADMIN":
		return nil
	default:
		return fmt.Errorf("Only root or admin accounts can manage pending members.")
	}
}

func normalizePendingSearchQuery(field, query string) string {
	trimmed := strings.TrimSpace(query)
	if field != "phone" {
		return trimmed
	}

	digits := make([]rune, 0, len(trimmed))
	for _, char := range trimmed {
		if char >= '0' && char <= '9' {
			digits = append(digits, char)
		}
	}

	if len(digits) == 0 {
		return ""
	}

	if string(digits[:minInt(len(digits), 2)]) == "02" {
		switch {
		case len(digits) <= 2:
			return string(digits)
		case len(digits) <= 5:
			return fmt.Sprintf("%s-%s", string(digits[:2]), string(digits[2:]))
		case len(digits) <= 9:
			return fmt.Sprintf(
				"%s-%s-%s",
				string(digits[:2]),
				string(digits[2:5]),
				string(digits[5:]),
			)
		default:
			return fmt.Sprintf(
				"%s-%s-%s",
				string(digits[:2]),
				string(digits[2:6]),
				string(digits[6:]),
			)
		}
	}

	switch {
	case len(digits) <= 3:
		return string(digits)
	case len(digits) <= 7:
		return fmt.Sprintf("%s-%s", string(digits[:3]), string(digits[3:]))
	case len(digits) <= 10:
		return fmt.Sprintf(
			"%s-%s-%s",
			string(digits[:3]),
			string(digits[3:6]),
			string(digits[6:]),
		)
	default:
		return fmt.Sprintf(
			"%s-%s-%s",
			string(digits[:3]),
			string(digits[3:7]),
			string(digits[7:]),
		)
	}
}

func validatePendingSearchQuery(field, query string) error {
	switch field {
	case "displayName":
		if utf8.RuneCountInString(strings.TrimSpace(query)) < 2 {
			return fmt.Errorf("Name search requires at least two characters.")
		}
	}

	return nil
}

func minInt(left, right int) int {
	if left < right {
		return left
	}

	return right
}
