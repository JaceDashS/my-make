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

const (
	constraintAccountsLoginID  = "uq_maimei_accounts_login_id"
	constraintAcademiesName    = "uq_maimei_academies_name"
	constraintStaffRootAcademy = "uq_maimei_staff_root_per_academy"
	constraintStaffEmail       = "uq_maimei_staff_email"
	constraintTeachersEmail    = "uq_maimei_teachers_email"
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
	detailStatus string
	loginID      string
	passwordHash string
	phone        sql.NullString
	roleCode     string
	statusCode   string
	licenseCode  sql.NullString
	expiresAt    sql.NullTime
}

type storedLicense struct {
	academyCode sql.NullString
	expiresAt   time.Time
	statusCode  string
}

type pendingSearchField struct {
	column string
	label  string
}

type pendingSearchRoleSpec struct {
	alias           string
	profileTable    string
	accountFKColumn string
	roleCode        string
	extraWhereSQL   string
}

type pendingMemberRoleSpec struct {
	roleCode             string
	sequenceName         string
	profileTable         string
	profileIDColumn      string
	accountFKColumn      string
	duplicateConstraint  string
	prepareAccountError  string
	insertProfileError   string
	insertAccountError   string
	roleInsertColumnSQL  string
	roleInsertValueSQL   string
	roleInsertValue      any
	approveExtraWhereSQL string
}

var pendingSearchFields = map[string]pendingSearchField{
	"displayName": {column: "DISPLAY_NAME", label: "display name"},
	"email":       {column: "EMAIL", label: "email"},
	"phone":       {column: "PHONE", label: "phone number"},
}

var pendingSearchRoleSpecs = []pendingSearchRoleSpec{
	{
		alias:           "s",
		profileTable:    "MAIMEI_STUDENTS",
		accountFKColumn: "STUDENT_ID",
		roleCode:        "STUDENT",
	},
	{
		alias:           "t",
		profileTable:    "MAIMEI_TEACHERS",
		accountFKColumn: "TEACHER_ID",
		roleCode:        "TEACHER",
	},
	{
		alias:           "st",
		profileTable:    "MAIMEI_STAFF",
		accountFKColumn: "STAFF_ID",
		roleCode:        "ADMIN",
		extraWhereSQL:   "\n      AND st.ROLE_CODE = 'ADMIN'",
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

	effectiveStatusCode := account.statusCode
	if account.detailStatus != "" {
		effectiveStatusCode = account.detailStatus
	}

	switch effectiveStatusCode {
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

	update := `UPDATE MAIMEI_ACCOUNTS SET LAST_LOGIN_AT = SYSTIMESTAMP WHERE LOGIN_ID = :1`
	if _, err := s.execWithReconnect(ctx, update, input.LoginID); err != nil {
		return accountResponse{}, fmt.Errorf("We couldn't complete sign-in right now. Please try again.")
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

	effectiveStatusCode := account.statusCode
	if account.detailStatus != "" {
		effectiveStatusCode = account.detailStatus
	}

	switch effectiveStatusCode {
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
		return accountResponse{}, fmt.Errorf("We couldn't prepare your password right now. Please try again.")
	}

	tx, err := s.beginTxWithReconnect(ctx)
	if err != nil {
		return accountResponse{}, fmt.Errorf("We couldn't start member registration right now. Please try again.")
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
		return accountResponse{}, fmt.Errorf("We couldn't complete member registration right now. Please try again.")
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
		return accountResponse{}, fmt.Errorf("We couldn't prepare your password right now. Please try again.")
	}

	tx, err := s.beginTxWithReconnect(ctx)
	if err != nil {
		return accountResponse{}, fmt.Errorf("We couldn't start registration right now. Please try again.")
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

		return accountResponse{}, fmt.Errorf("We couldn't create the academy right now. Please try again.")
	}

	readAcademyCode := `
SELECT ACADEMY_CODE
  FROM MAIMEI_ACADEMIES
 WHERE ACADEMY_NAME = :1`
	if err := tx.QueryRowContext(ctx, readAcademyCode, input.AcademyName).Scan(&academyCode); err != nil {
		return accountResponse{}, fmt.Errorf("We couldn't finish registration right now. Please try again.")
	}

	var staffID int64
	if err := tx.QueryRowContext(ctx, `SELECT MAIMEI_STAFF_SEQ.NEXTVAL FROM DUAL`).Scan(&staffID); err != nil {
		return accountResponse{}, fmt.Errorf("We couldn't prepare the root account right now. Please try again.")
	}

	createRootStaff := `
INSERT INTO MAIMEI_STAFF (
    STAFF_ID,
    ACADEMY_CODE,
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
    'ROOT',
    'ACTIVE'
)`
	if _, err := tx.ExecContext(
		ctx,
		createRootStaff,
		staffID,
		academyCode,
		nullIfEmpty(input.Email),
		input.Phone,
		input.RootDisplayName,
	); err != nil {
		if isAccountUniqueConstraintError(err, constraintStaffRootAcademy) {
			return accountResponse{}, fmt.Errorf("This academy already has a root account.")
		}

		return accountResponse{}, fmt.Errorf("We couldn't create the root profile right now. Please try again.")
	}

	createRootAccount := `
INSERT INTO MAIMEI_ACCOUNTS (
    LOGIN_ID,
    PASSWORD_HASH,
    ROLE_CODE,
    STATUS_CODE,
    STAFF_ID
) VALUES (
    :1,
    :2,
    'ROOT',
    'ACTIVE',
    :3
)`
	if _, err := tx.ExecContext(
		ctx,
		createRootAccount,
		input.RootLoginID,
		passwordHash,
		staffID,
	); err != nil {
		if isAccountUniqueConstraintError(err, constraintAccountsLoginID) {
			return accountResponse{}, fmt.Errorf("That login ID is already in use. Please choose another one.")
		}

		return accountResponse{}, fmt.Errorf("We couldn't create the root account right now. Please try again.")
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
		return accountResponse{}, fmt.Errorf("We couldn't assign the license right now. Please try again.")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return accountResponse{}, fmt.Errorf("We couldn't confirm the license assignment right now. Please try again.")
	}

	if rowsAffected != 1 {
		return accountResponse{}, fmt.Errorf("We couldn't assign that license. Please check the license and try again.")
	}

	if err := tx.Commit(); err != nil {
		return accountResponse{}, fmt.Errorf("We couldn't complete root registration right now. Please try again.")
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
			accountFKColumn:     "STUDENT_ID",
			prepareAccountError: "We couldn't prepare your member account right now. Please try again.",
			insertProfileError:  "We couldn't create your member profile right now. Please try again.",
			insertAccountError:  "We couldn't create your member account right now. Please try again.",
		}, nil
	case "TEACHER":
		return pendingMemberRoleSpec{
			roleCode:            "TEACHER",
			sequenceName:        "MAIMEI_TEACHERS_SEQ",
			profileTable:        "MAIMEI_TEACHERS",
			profileIDColumn:     "TEACHER_ID",
			accountFKColumn:     "TEACHER_ID",
			duplicateConstraint: constraintTeachersEmail,
			prepareAccountError: "We couldn't prepare your teacher account right now. Please try again.",
			insertProfileError:  "We couldn't create your teacher profile right now. Please try again.",
			insertAccountError:  "We couldn't create your teacher account right now. Please try again.",
		}, nil
	case "ADMIN":
		return pendingMemberRoleSpec{
			roleCode:             "ADMIN",
			sequenceName:         "MAIMEI_STAFF_SEQ",
			profileTable:         "MAIMEI_STAFF",
			profileIDColumn:      "STAFF_ID",
			accountFKColumn:      "STAFF_ID",
			duplicateConstraint:  constraintStaffEmail,
			prepareAccountError:  "We couldn't prepare your admin account right now. Please try again.",
			insertProfileError:   "We couldn't create your admin profile right now. Please try again.",
			insertAccountError:   "We couldn't create your admin account right now. Please try again.",
			roleInsertColumnSQL:  ",\n    ROLE_CODE",
			roleInsertValueSQL:   ",\n    :5",
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

func createPendingMemberAccount(
	ctx context.Context,
	tx *sql.Tx,
	loginID string,
	passwordHash string,
	roleCode string,
	targetColumn string,
	targetID int64,
) error {
	createAccount := fmt.Sprintf(`
INSERT INTO MAIMEI_ACCOUNTS (
    LOGIN_ID,
    PASSWORD_HASH,
    ROLE_CODE,
    STATUS_CODE,
    %s
) VALUES (
    :1,
    :2,
    :3,
    'HOLD',
    :4
)`, targetColumn)

	if _, err := tx.ExecContext(ctx, createAccount, loginID, passwordHash, roleCode, targetID); err != nil {
		if isAccountUniqueConstraintError(err, constraintAccountsLoginID) {
			return fmt.Errorf("That login ID is already in use. Please choose another one.")
		}
		return err
	}

	return nil
}

func insertPendingMemberProfile(
	ctx context.Context,
	tx *sql.Tx,
	spec pendingMemberRoleSpec,
	input memberRegisterInput,
) (int64, error) {
	entityID, err := nextSequenceValue(ctx, tx, spec.sequenceName)
	if err != nil {
		return 0, fmt.Errorf("%s", spec.prepareAccountError)
	}

	insertProfile := fmt.Sprintf(`
INSERT INTO %s (
    %s,
    ACADEMY_CODE,
    EMAIL,
    PHONE,
    DISPLAY_NAME%s,
    STATUS_CODE
) VALUES (
    :1,
    NULL,
    :2,
    :3,
    :4%s,
    'PENDING'
)`, spec.profileTable, spec.profileIDColumn, spec.roleInsertColumnSQL, spec.roleInsertValueSQL)

	args := []any{entityID, nullIfEmpty(input.Email), input.Phone, input.DisplayName}
	if spec.roleInsertValueSQL != "" {
		args = append(args, spec.roleInsertValue)
	}

	if spec.roleCode == "STUDENT" {
		insertProfile = `
INSERT INTO MAIMEI_STUDENTS (
    STUDENT_ID,
    EMAIL,
    PHONE,
    DISPLAY_NAME,
    STATUS_CODE
) VALUES (
    :1,
    :2,
    :3,
    :4,
    'PENDING'
)`
	}

	if _, err := tx.ExecContext(ctx, insertProfile, args...); err != nil {
		if spec.duplicateConstraint != "" && isAccountUniqueConstraintError(err, spec.duplicateConstraint) {
			return 0, fmt.Errorf("That email address is already in use. Please choose another one.")
		}
		return 0, fmt.Errorf("%s", spec.insertProfileError)
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
	entityID, err := insertPendingMemberProfile(ctx, tx, spec, input)
	if err != nil {
		return err
	}

	if err := createPendingMemberAccount(
		ctx,
		tx,
		input.LoginID,
		passwordHash,
		spec.roleCode,
		spec.accountFKColumn,
		entityID,
	); err != nil {
		if err.Error() == "That login ID is already in use. Please choose another one." {
			return err
		}
		return fmt.Errorf("%s", spec.insertAccountError)
	}

	return nil
}

func buildPendingMembersSearchQuery(field pendingSearchField) string {
	selectBlocks := make([]string, 0, len(pendingSearchRoleSpecs))
	for _, spec := range pendingSearchRoleSpecs {
		selectBlocks = append(selectBlocks, fmt.Sprintf(`
    SELECT
        a.LOGIN_ID AS login_id,
        %[1]s.DISPLAY_NAME AS display_name,
        %[1]s.EMAIL AS email,
        %[1]s.PHONE AS phone,
        a.ROLE_CODE AS role_code,
        %[1]s.CREATED_AT AS created_at
    FROM %[2]s %[1]s
    JOIN MAIMEI_ACCOUNTS a
      ON a.%[3]s = %[1]s.%[3]s
    WHERE %[1]s.STATUS_CODE = 'PENDING'
      AND %[1]s.ACADEMY_CODE IS NULL
      AND a.ROLE_CODE = '%[4]s'
      AND a.STATUS_CODE = 'HOLD'%[5]s
      AND %[1]s.%[6]s = :1`, spec.alias, spec.profileTable, spec.accountFKColumn, spec.roleCode, spec.extraWhereSQL, field.column))
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

	query := buildPendingMembersSearchQuery(field)

	rows, err := s.db.QueryContext(ctx, query, input.Query)
	if err != nil {
		return pendingMembersResponse{}, fmt.Errorf("We couldn't search pending members right now. Please try again.")
	}
	defer rows.Close()

	members, err := scanPendingMemberRecords(rows)
	if err != nil {
		return pendingMembersResponse{}, fmt.Errorf("We couldn't search pending members right now. Please try again.")
	}

	if len(members) == 0 {
		return pendingMembersResponse{}, fmt.Errorf("No pending members matched that exact %s.", field.label)
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
		return accountResponse{}, fmt.Errorf("We couldn't start approval right now. Please try again.")
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

	if err := activatePendingAccount(ctx, tx, input.LoginID, targetRoleCode); err != nil {
		return accountResponse{}, err
	}

	if err := tx.Commit(); err != nil {
		return accountResponse{}, fmt.Errorf("We couldn't complete approval right now. Please try again.")
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
SELECT ROLE_CODE
  FROM MAIMEI_ACCOUNTS
 WHERE LOGIN_ID = :1`

	var targetRoleCode string
	if err := tx.QueryRowContext(ctx, readRole, loginID).Scan(&targetRoleCode); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", fmt.Errorf("That pending member could not be found.")
		}
		return "", fmt.Errorf("We couldn't approve that member right now. Please try again.")
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
 WHERE %s = (
     SELECT %s
       FROM MAIMEI_ACCOUNTS
      WHERE LOGIN_ID = :2
        AND ROLE_CODE = '%s'
 )
   AND STATUS_CODE = 'PENDING'
   AND ACADEMY_CODE IS NULL%s`, spec.profileTable, spec.profileIDColumn, spec.accountFKColumn, spec.roleCode, spec.approveExtraWhereSQL)

	result, err := tx.ExecContext(ctx, approveProfile, academyCode, loginID)
	if err != nil {
		return fmt.Errorf("We couldn't approve that member right now. Please try again.")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("We couldn't approve that member right now. Please try again.")
	}

	if rowsAffected != 1 {
		return fmt.Errorf("That pending member could not be found.")
	}

	return nil
}

func activatePendingAccount(ctx context.Context, tx *sql.Tx, loginID string, roleCode string) error {
	activateAccount := `
UPDATE MAIMEI_ACCOUNTS
   SET STATUS_CODE = 'ACTIVE'
 WHERE LOGIN_ID = :1
   AND ROLE_CODE = :2
   AND STATUS_CODE = 'HOLD'`

	if _, err := tx.ExecContext(ctx, activateAccount, loginID, roleCode); err != nil {
		return fmt.Errorf("We couldn't approve that member right now. Please try again.")
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
		return licenseRenewResponse{}, fmt.Errorf("We couldn't renew the license right now. Please try again.")
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
    COALESCE(stf.ACADEMY_CODE, tch.ACADEMY_CODE, stu.ACADEMY_CODE),
    a.ACADEMY_NAME,
    a.STATUS_CODE,
    COALESCE(stf.DISPLAY_NAME, tch.DISPLAY_NAME, stu.DISPLAY_NAME),
    COALESCE(stf.EMAIL, tch.EMAIL, stu.EMAIL),
    COALESCE(stf.STATUS_CODE, tch.STATUS_CODE, stu.STATUS_CODE),
    acc.LOGIN_ID,
    acc.PASSWORD_HASH,
    COALESCE(stf.PHONE, tch.PHONE, stu.PHONE),
    acc.ROLE_CODE,
    acc.STATUS_CODE,
    (
        SELECT MAX(lic.LICENSE_CODE) KEEP (DENSE_RANK LAST ORDER BY lic.EXPIRES_AT)
        FROM MAIMEI_LICENSES lic
        WHERE lic.ACADEMY_CODE = COALESCE(stf.ACADEMY_CODE, tch.ACADEMY_CODE, stu.ACADEMY_CODE)
          AND lic.STATUS_CODE IN ('ACTIVE', 'SUSPENDED')
    ),
    (
        SELECT MAX(lic.EXPIRES_AT)
        FROM MAIMEI_LICENSES lic
        WHERE lic.ACADEMY_CODE = COALESCE(stf.ACADEMY_CODE, tch.ACADEMY_CODE, stu.ACADEMY_CODE)
          AND lic.STATUS_CODE IN ('ACTIVE', 'SUSPENDED')
    )
FROM MAIMEI_ACCOUNTS acc
LEFT JOIN MAIMEI_STAFF stf
  ON stf.STAFF_ID = acc.STAFF_ID
LEFT JOIN MAIMEI_TEACHERS tch
  ON tch.TEACHER_ID = acc.TEACHER_ID
LEFT JOIN MAIMEI_STUDENTS stu
  ON stu.STUDENT_ID = acc.STUDENT_ID
LEFT JOIN MAIMEI_ACADEMIES a
  ON a.ACADEMY_CODE = COALESCE(stf.ACADEMY_CODE, tch.ACADEMY_CODE, stu.ACADEMY_CODE)
WHERE acc.LOGIN_ID = :1`

	var account storedAccount
	scan := func(db *sql.DB) error {
		return db.QueryRowContext(ctx, query, loginID).Scan(
			&account.academyCode,
			&account.academyName,
			&account.academyState,
			&account.displayName,
			&account.email,
			&account.detailStatus,
			&account.loginID,
			&account.passwordHash,
			&account.phone,
			&account.roleCode,
			&account.statusCode,
			&account.licenseCode,
			&account.expiresAt,
		)
	}

	err := s.queryRowWithReconnect(ctx, scan)
	if errors.Is(err, sql.ErrNoRows) {
		return storedAccount{}, fmt.Errorf("The login ID or password is incorrect.")
	}
	if err != nil {
		return storedAccount{}, fmt.Errorf("We couldn't check your account right now. Please try again.")
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
		return storedLicense{}, fmt.Errorf("We couldn't check that license right now. Please try again.")
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
