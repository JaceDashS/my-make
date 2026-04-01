package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

const (
	constraintAcademiesName    = "uq_maimei_academies_name"
	constraintAdminRootAcademy = "uq_maimei_admins_root_per_academy"
	constraintAdminEmail       = "uq_maimei_admins_email"
	constraintAdminLoginID     = "uq_maimei_admins_login_id"
	constraintTeachersEmail    = "uq_maimei_teachers_email"
	constraintTeacherLoginID   = "uq_maimei_teachers_login_id"
	constraintStudentEmail     = "uq_maimei_students_email"
	constraintStudentLoginID   = "uq_maimei_students_login_id"
)

type accountService interface {
	Login(ctx context.Context, input loginInput) (accountResponse, error)
	GetProfile(ctx context.Context, loginID string) (profileResponse, error)
	UpdateProfile(ctx context.Context, actor accountResponse, input profileUpdateInput) (profileResponse, error)
	RegisterMember(ctx context.Context, input memberRegisterInput) (accountResponse, error)
	RegisterRoot(ctx context.Context, input rootRegisterInput) (accountResponse, error)
	SearchAcademyMembers(ctx context.Context, input academyMemberSearchInput) (academyMembersResponse, error)
	UpdateAcademyMemberStatus(ctx context.Context, input academyMemberStatusUpdateInput) (academyMemberStatusUpdateResponse, error)
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

type profileUpdateInput struct {
	Password         *string `json:"password"`
	Email            *string `json:"email"`
	Phone            *string `json:"phone"`
	Note             *string `json:"note"`
	AuthPolicy       *string `json:"authPolicy"`
	StatusCode       *string `json:"statusCode"`
	SkinLValue       *string `json:"skinLValue"`
	SkinCValue       *string `json:"skinCValue"`
	SkinHValue       *string `json:"skinHValue"`
	SkinTraits       *string `json:"skinTraits"`
	PreferenceRanges *string `json:"preferenceRanges"`
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
	Status      string          `json:"status"`
	Message     string          `json:"message"`
	AccountCode string          `json:"accountCode,omitempty"`
	AcademyCode string          `json:"academyCode"`
	AcademyName string          `json:"academyName"`
	DisplayName string          `json:"displayName"`
	Email       string          `json:"email,omitempty"`
	LoginID     string          `json:"loginId"`
	Note        string          `json:"note,omitempty"`
	Phone       string          `json:"phone,omitempty"`
	RoleCode    string          `json:"roleCode"`
	LicenseCode string          `json:"licenseCode,omitempty"`
	ExpiresAt   string          `json:"expiresAt,omitempty"`
	Details     []profileDetail `json:"details,omitempty"`
}

type profileResponse struct {
	Status      string          `json:"status"`
	Message     string          `json:"message"`
	AccountCode string          `json:"accountCode,omitempty"`
	AcademyCode string          `json:"academyCode,omitempty"`
	AcademyName string          `json:"academyName,omitempty"`
	DisplayName string          `json:"displayName"`
	Email       string          `json:"email,omitempty"`
	Phone       string          `json:"phone,omitempty"`
	LoginID     string          `json:"loginId"`
	Note        string          `json:"note,omitempty"`
	RoleCode    string          `json:"roleCode"`
	LicenseCode string          `json:"licenseCode,omitempty"`
	ExpiresAt   string          `json:"expiresAt,omitempty"`
	Details     []profileDetail `json:"details,omitempty"`
}

type profileDetail struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Value string `json:"value"`
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

type academyMemberSearchInput struct {
	AcademyCode   string `json:"academyCode"`
	ActorRoleCode string `json:"actorRoleCode"`
	Field         string `json:"field"`
	Query         string `json:"query"`
	StatusFilter  string `json:"statusFilter"`
}

type academyMemberStatusUpdateInput struct {
	AcademyCode   string `json:"academyCode"`
	ActorRoleCode string `json:"actorRoleCode"`
	LoginID       string `json:"loginId"`
	CurrentStatus string `json:"currentStatus"`
	NextStatus    string `json:"nextStatus"`
}

type academyMemberRecord struct {
	AcademyCode string `json:"academyCode,omitempty"`
	AcademyName string `json:"academyName,omitempty"`
	CreatedAt   string `json:"createdAt"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email,omitempty"`
	Phone       string `json:"phone,omitempty"`
	LoginID     string `json:"loginId"`
	RoleCode    string `json:"roleCode"`
	StatusCode  string `json:"statusCode"`
}

type academyMembersResponse struct {
	Status  string                `json:"status"`
	Message string                `json:"message"`
	Members []academyMemberRecord `json:"members"`
}

type academyMemberStatusUpdateResponse struct {
	Status        string `json:"status"`
	Message       string `json:"message"`
	LoginID       string `json:"loginId"`
	DisplayName   string `json:"displayName,omitempty"`
	RoleCode      string `json:"roleCode,omitempty"`
	CurrentStatus string `json:"currentStatus"`
	NextStatus    string `json:"nextStatus"`
}

type licenseRenewResponse struct {
	Status      string `json:"status"`
	Message     string `json:"message"`
	LicenseCode string `json:"licenseCode"`
	ExpiresAt   string `json:"expiresAt"`
}

type storedAccount struct {
	accountCode        sql.NullString
	academyCode        sql.NullString
	academyName        sql.NullString
	academyState       sql.NullString
	authPolicy         sql.NullString
	availableSchedule  sql.NullString
	displayName        string
	email              sql.NullString
	loginID            string
	note               sql.NullString
	passwordHash       string
	passRemainingCount sql.NullInt64
	passTotalCount     sql.NullInt64
	phone              sql.NullString
	preferenceRanges   sql.NullString
	preset             sql.NullString
	primaryTeacherID   sql.NullInt64
	roleCode           string
	skinCValue         sql.NullFloat64
	skinHValue         sql.NullFloat64
	skinLValue         sql.NullFloat64
	skinTraits         sql.NullString
	statusCode         string
	licenseCode        sql.NullString
	expiresAt          sql.NullTime
	sourceTable        string
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

type academySearchRoleSpec struct {
	alias              string
	profileTable       string
	roleCodeExpression string
}

type academyMemberRoleStatus struct {
	roleCode   string
	statusCode string
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
		alias:         "st",
		profileTable:  "MAIMEI_ADMINS",
		roleCode:      "ADMIN",
		extraWhereSQL: "\n      AND st.ROLE_CODE = 'ADMIN'",
	},
}

var academySearchRoleSpecs = []academySearchRoleSpec{
	{
		alias:              "adm",
		profileTable:       "MAIMEI_ADMINS",
		roleCodeExpression: "adm.ROLE_CODE",
	},
	{
		alias:              "tch",
		profileTable:       "MAIMEI_TEACHERS",
		roleCodeExpression: "'TEACHER'",
	},
	{
		alias:              "stu",
		profileTable:       "MAIMEI_STUDENTS",
		roleCodeExpression: "'STUDENT'",
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

	response := accountResponse{
		Status:      "ok",
		Message:     "Signed in successfully.",
		AccountCode: nullStringValue(account.accountCode),
		AcademyCode: nullStringValue(account.academyCode),
		AcademyName: nullStringValue(account.academyName),
		DisplayName: account.displayName,
		Email:       nullStringValue(account.email),
		LoginID:     account.loginID,
		Note:        nullStringValue(account.note),
		Phone:       nullStringValue(account.phone),
		RoleCode:    account.roleCode,
		LicenseCode: nullStringValue(account.licenseCode),
		Details:     buildProfileDetails(account),
	}
	if account.expiresAt.Valid {
		response.ExpiresAt = account.expiresAt.Time.UTC().Format(time.RFC3339)
	}

	return response, nil
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
		AccountCode: nullStringValue(account.accountCode),
		AcademyCode: nullStringValue(account.academyCode),
		AcademyName: nullStringValue(account.academyName),
		DisplayName: account.displayName,
		Email:       nullStringValue(account.email),
		Phone:       nullStringValue(account.phone),
		LoginID:     account.loginID,
		Note:        nullStringValue(account.note),
		RoleCode:    account.roleCode,
		LicenseCode: nullStringValue(account.licenseCode),
		Details:     buildProfileDetails(account),
	}
	if account.expiresAt.Valid {
		response.ExpiresAt = account.expiresAt.Time.UTC().Format(time.RFC3339)
	}

	return response, nil
}

func (s *oracleAccountService) UpdateProfile(
	ctx context.Context,
	actor accountResponse,
	input profileUpdateInput,
) (profileResponse, error) {
	loginID := strings.TrimSpace(actor.LoginID)
	if loginID == "" {
		return profileResponse{}, fmt.Errorf("No active session was found.")
	}

	account, err := s.fetchAccount(ctx, loginID)
	if err != nil {
		return profileResponse{}, err
	}

	assignments := make([]string, 0, 6)
	args := make([]any, 0, 8)
	nextArg := 1

	if input.Password != nil && strings.TrimSpace(*input.Password) != "" {
		passwordHash, err := hashPassword(strings.TrimSpace(*input.Password))
		if err != nil {
			return profileResponse{}, fmt.Errorf("We could not prepare your password right now. Please try again.")
		}
		assignments = append(assignments, fmt.Sprintf("PASSWORD_HASH = :%d", nextArg))
		args = append(args, passwordHash)
		nextArg++
	}

	if input.Email != nil {
		assignments = append(assignments, fmt.Sprintf("EMAIL = :%d", nextArg))
		args = append(args, nullIfEmpty(strings.TrimSpace(*input.Email)))
		nextArg++
	}

	if input.Phone != nil {
		if strings.TrimSpace(*input.Phone) == "" {
			return profileResponse{}, fmt.Errorf("Please enter a phone number.")
		}
		assignments = append(assignments, fmt.Sprintf("PHONE = :%d", nextArg))
		args = append(args, strings.TrimSpace(*input.Phone))
		nextArg++
	}

	if input.Note != nil {
		assignments = append(assignments, fmt.Sprintf("NOTE_BODY = :%d", nextArg))
		args = append(args, nullIfEmpty(strings.TrimSpace(*input.Note)))
		nextArg++
	}

	if input.AuthPolicy != nil {
		if actor.RoleCode != "ROOT" {
			return profileResponse{}, fmt.Errorf("Only root accounts can update auth policy.")
		}

		assignments = append(assignments, fmt.Sprintf("AUTH_POLICY = :%d", nextArg))
		args = append(args, nullIfEmpty(strings.TrimSpace(*input.AuthPolicy)))
		nextArg++
	}

	if input.StatusCode != nil {
		if !canUpdateProfileStatus(actor.RoleCode, account.roleCode) {
			return profileResponse{}, fmt.Errorf("You do not have permission to update this status.")
		}
		if !isAllowedAccountStatus(strings.TrimSpace(*input.StatusCode)) {
			return profileResponse{}, fmt.Errorf("Please choose a valid status.")
		}

		assignments = append(assignments, fmt.Sprintf("STATUS_CODE = :%d", nextArg))
		args = append(args, strings.TrimSpace(*input.StatusCode))
		nextArg++
	}

	if account.sourceTable == "MAIMEI_STUDENTS" {
		if input.SkinLValue != nil {
			parsedValue, err := parseOptionalStudentFloat(*input.SkinLValue, "skin L value")
			if err != nil {
				return profileResponse{}, err
			}
			assignments = append(assignments, fmt.Sprintf("SKIN_L_VALUE = :%d", nextArg))
			args = append(args, parsedValue)
			nextArg++
		}

		if input.SkinCValue != nil {
			parsedValue, err := parseOptionalStudentFloat(*input.SkinCValue, "skin C value")
			if err != nil {
				return profileResponse{}, err
			}
			assignments = append(assignments, fmt.Sprintf("SKIN_C_VALUE = :%d", nextArg))
			args = append(args, parsedValue)
			nextArg++
		}

		if input.SkinHValue != nil {
			parsedValue, err := parseOptionalStudentFloat(*input.SkinHValue, "skin H value")
			if err != nil {
				return profileResponse{}, err
			}
			assignments = append(assignments, fmt.Sprintf("SKIN_H_VALUE = :%d", nextArg))
			args = append(args, parsedValue)
			nextArg++
		}

		if input.SkinTraits != nil {
			assignments = append(assignments, fmt.Sprintf("SKIN_TRAITS_BODY = :%d", nextArg))
			args = append(args, nullIfEmpty(strings.TrimSpace(*input.SkinTraits)))
			nextArg++
		}

		if input.PreferenceRanges != nil {
			assignments = append(assignments, fmt.Sprintf("PREFERENCE_RANGES_BODY = :%d", nextArg))
			args = append(args, nullIfEmpty(strings.TrimSpace(*input.PreferenceRanges)))
			nextArg++
		}
	}

	if len(assignments) == 0 {
		return s.GetProfile(ctx, loginID)
	}

	var tableName string
	switch account.sourceTable {
	case "MAIMEI_ADMINS":
		tableName = "MAIMEI_ADMINS"
	case "MAIMEI_TEACHERS":
		tableName = "MAIMEI_TEACHERS"
	case "MAIMEI_STUDENTS":
		tableName = "MAIMEI_STUDENTS"
	default:
		return profileResponse{}, fmt.Errorf("Your account is unavailable right now.")
	}

	query := fmt.Sprintf(`
UPDATE %s
   SET %s
 WHERE LOGIN_ID = :%d`, tableName, strings.Join(assignments, ",\n       "), nextArg)
	args = append(args, loginID)

	if _, err := s.execWithReconnect(ctx, query, args...); err != nil {
		return profileResponse{}, fmt.Errorf("We could not update your profile right now. Please try again.")
	}

	updatedAccount, err := s.fetchAccount(ctx, loginID)
	if err != nil {
		return profileResponse{}, err
	}

	response := profileResponse{
		Status:      "ok",
		Message:     "Profile updated successfully.",
		AccountCode: nullStringValue(updatedAccount.accountCode),
		AcademyCode: nullStringValue(updatedAccount.academyCode),
		AcademyName: nullStringValue(updatedAccount.academyName),
		DisplayName: updatedAccount.displayName,
		Email:       nullStringValue(updatedAccount.email),
		Phone:       nullStringValue(updatedAccount.phone),
		LoginID:     updatedAccount.loginID,
		Note:        nullStringValue(updatedAccount.note),
		RoleCode:    updatedAccount.roleCode,
		LicenseCode: nullStringValue(updatedAccount.licenseCode),
		Details:     buildProfileDetails(updatedAccount),
	}
	if updatedAccount.expiresAt.Valid {
		response.ExpiresAt = updatedAccount.expiresAt.Time.UTC().Format(time.RFC3339)
	}

	return response, nil
}

func buildProfileDetails(account storedAccount) []profileDetail {
	details := make([]profileDetail, 0, 16)

	appendDetail := func(key, label, value string) {
		if strings.TrimSpace(value) == "" {
			return
		}

		details = append(details, profileDetail{
			Key:   key,
			Label: label,
			Value: value,
		})
	}

	codeLabel := "Student Code"
	switch account.roleCode {
	case "ROOT", "ADMIN":
		codeLabel = "Admin Code"
	case "TEACHER":
		codeLabel = "Teacher Code"
	}

	appendDetail("accountCode", codeLabel, nullStringValue(account.accountCode))
	appendDetail("academyCode", "Academy Code", nullStringValue(account.academyCode))
	appendDetail("loginId", "Login ID", account.loginID)
	appendDetail("password", "Masked Password", "••••••••")
	appendDetail("displayName", "Display Name", account.displayName)
	appendDetail("email", "Email", nullStringValue(account.email))
	appendDetail("phone", "Phone", nullStringValue(account.phone))
	note := strings.TrimSpace(nullStringValue(account.note))
	if note == "" {
		note = "-"
	}
	appendDetail("note", "Note", note)

	switch account.roleCode {
	case "ROOT", "ADMIN":
		authPolicy := strings.TrimSpace(nullStringValue(account.authPolicy))
		if authPolicy == "" {
			authPolicy = "-"
		}
		appendDetail("authPolicy", "Auth Policy", authPolicy)
	case "TEACHER":
		preset := strings.TrimSpace(nullStringValue(account.preset))
		if preset == "" {
			preset = "-"
		}
		availableSchedule := strings.TrimSpace(nullStringValue(account.availableSchedule))
		if availableSchedule == "" {
			availableSchedule = "-"
		}
		appendDetail("preset", "Preset", preset)
		appendDetail("availableSchedule", "Available Schedule", availableSchedule)
	case "STUDENT":
		appendDetail("skinLValue", "Skin L Value", nullFloat64Value(account.skinLValue))
		appendDetail("skinCValue", "Skin C Value", nullFloat64Value(account.skinCValue))
		appendDetail("skinHValue", "Skin H Value", nullFloat64Value(account.skinHValue))
		appendDetail("skinTraits", "Skin Traits", nullStringValue(account.skinTraits))
		appendDetail("preferenceRanges", "Preference Ranges", nullStringValue(account.preferenceRanges))
		appendDetail("primaryTeacherId", "Primary Teacher ID", nullInt64Value(account.primaryTeacherID))
		appendDetail("passTotalCount", "Pass Total Count", nullInt64Value(account.passTotalCount))
		appendDetail("passRemainingCount", "Pass Remaining Count", nullInt64Value(account.passRemainingCount))
	}

	appendDetail("roleCode", "Role", account.roleCode)
	appendDetail("statusCode", "Status", account.statusCode)

	return details
}

func nullFloat64Value(value sql.NullFloat64) string {
	if !value.Valid {
		return ""
	}

	return fmt.Sprintf("%.4f", value.Float64)
}

func nullInt64Value(value sql.NullInt64) string {
	if !value.Valid {
		return ""
	}

	return fmt.Sprintf("%d", value.Int64)
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

func buildAcademyMembersSearchQuery(
	field pendingSearchField,
	statusFilter string,
) string {
	selectBlocks := make([]string, 0, len(academySearchRoleSpecs))
	for _, spec := range academySearchRoleSpecs {
		matchExpression := fmt.Sprintf(
			strings.ReplaceAll(field.matchExpression, ":1", ":2"),
			spec.alias,
			field.column,
		)
		statusClause := ""
		if statusFilter != "ALL" {
			statusClause = fmt.Sprintf("\n        AND %[1]s.STATUS_CODE = '%[2]s'", spec.alias, statusFilter)
		} else {
			statusClause = fmt.Sprintf(
				"\n        AND %[1]s.STATUS_CODE IN ('ACTIVE', 'HOLD', 'INACTIVE')",
				spec.alias,
			)
		}
		selectBlocks = append(selectBlocks, fmt.Sprintf(`
      SELECT
          %[1]s.ACADEMY_CODE AS academy_code,
          aca.ACADEMY_NAME AS academy_name,
          %[1]s.LOGIN_ID AS login_id,
          %[1]s.DISPLAY_NAME AS display_name,
          %[1]s.EMAIL AS email,
          %[1]s.PHONE AS phone,
          %[3]s AS role_code,
          %[1]s.CREATED_AT AS created_at,
          %[1]s.STATUS_CODE AS status_code
      FROM %[2]s %[1]s
      LEFT JOIN MAIMEI_ACADEMIES aca
        ON aca.ACADEMY_CODE = %[1]s.ACADEMY_CODE
      WHERE %[1]s.ACADEMY_CODE = :1
        %[4]s
        AND %s`, spec.alias, spec.profileTable, spec.roleCodeExpression, statusClause, matchExpression))
	}

	return fmt.Sprintf(`
SELECT
    academy_code,
    academy_name,
    login_id,
    display_name,
    email,
    phone,
    role_code,
    created_at,
    status_code
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

func scanAcademyMemberRecords(rows *sql.Rows) ([]academyMemberRecord, error) {
	members := make([]academyMemberRecord, 0, 4)
	for rows.Next() {
		var (
			academyCode string
			academyName string
			loginID     string
			displayName string
			email       sql.NullString
			phone       sql.NullString
			roleCode    string
			createdAt   time.Time
			statusCode  string
		)

		if err := rows.Scan(
			&academyCode,
			&academyName,
			&loginID,
			&displayName,
			&email,
			&phone,
			&roleCode,
			&createdAt,
			&statusCode,
		); err != nil {
			return nil, err
		}

		members = append(members, academyMemberRecord{
			AcademyCode: academyCode,
			AcademyName: academyName,
			DisplayName: displayName,
			Email:       nullStringValue(email),
			Phone:       nullStringValue(phone),
			LoginID:     loginID,
			RoleCode:    roleCode,
			CreatedAt:   createdAt.UTC().Format(time.RFC3339),
			StatusCode:  statusCode,
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

func (s *oracleAccountService) SearchAcademyMembers(
	ctx context.Context,
	input academyMemberSearchInput,
) (academyMembersResponse, error) {
	input.AcademyCode = strings.TrimSpace(input.AcademyCode)
	input.ActorRoleCode = strings.ToUpper(strings.TrimSpace(input.ActorRoleCode))
	input.Field = strings.TrimSpace(input.Field)
	input.Query = strings.TrimSpace(input.Query)
	input.StatusFilter = strings.ToUpper(strings.TrimSpace(input.StatusFilter))

	if err := validateAcademyModerationAccess(input.AcademyCode, input.ActorRoleCode); err != nil {
		return academyMembersResponse{}, err
	}

	if input.Field == "" {
		return academyMembersResponse{}, fmt.Errorf("Please choose a search field.")
	}

	field, ok := pendingSearchFields[input.Field]
	if !ok {
		return academyMembersResponse{}, fmt.Errorf("Please choose a valid search field.")
	}

	if input.StatusFilter == "" {
		input.StatusFilter = "ALL"
	}
	if err := validateAcademyMemberStatusFilter(input.StatusFilter); err != nil {
		return academyMembersResponse{}, err
	}

	input.Query = normalizePendingSearchQuery(input.Field, input.Query)
	if input.Query != "" {
		if err := validatePendingSearchQuery(input.Field, input.Query); err != nil {
			return academyMembersResponse{}, err
		}
	}

	query := buildAcademyMembersSearchQuery(field, input.StatusFilter)
	rows, err := s.db.QueryContext(ctx, query, input.AcademyCode, input.Query)
	if err != nil {
		return academyMembersResponse{}, err
	}
	defer rows.Close()

	members, err := scanAcademyMemberRecords(rows)
	if err != nil {
		return academyMembersResponse{}, err
	}

	if len(members) == 0 {
		return academyMembersResponse{}, fmt.Errorf("No academy members matched that %s.", field.label)
	}

	return academyMembersResponse{
		Status:  "ok",
		Message: "Academy members found.",
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

func (s *oracleAccountService) UpdateAcademyMemberStatus(
	ctx context.Context,
	input academyMemberStatusUpdateInput,
) (academyMemberStatusUpdateResponse, error) {
	input.AcademyCode = strings.TrimSpace(input.AcademyCode)
	input.ActorRoleCode = strings.ToUpper(strings.TrimSpace(input.ActorRoleCode))
	input.LoginID = strings.TrimSpace(input.LoginID)
	input.CurrentStatus = strings.ToUpper(strings.TrimSpace(input.CurrentStatus))
	input.NextStatus = strings.ToUpper(strings.TrimSpace(input.NextStatus))

	if err := validateAcademyModerationAccess(input.AcademyCode, input.ActorRoleCode); err != nil {
		return academyMemberStatusUpdateResponse{}, err
	}
	if input.LoginID == "" {
		return academyMemberStatusUpdateResponse{}, fmt.Errorf("Please choose an academy member.")
	}
	if err := validateAcademyMemberStatusTransition(input.CurrentStatus, input.NextStatus); err != nil {
		return academyMemberStatusUpdateResponse{}, err
	}

	tx, err := s.beginTxWithReconnect(ctx)
	if err != nil {
		return academyMemberStatusUpdateResponse{}, err
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback()
		}
	}()

	target, err := lookupAcademyAccountRoleAndStatus(ctx, tx, input.AcademyCode, input.LoginID)
	if err != nil {
		return academyMemberStatusUpdateResponse{}, err
	}
	if err := validateAcademyMemberTargetRole(target.roleCode); err != nil {
		return academyMemberStatusUpdateResponse{}, err
	}
	if target.statusCode != input.CurrentStatus {
		return academyMemberStatusUpdateResponse{}, fmt.Errorf("The member status changed before this update. Please search again.")
	}

	if err := updateAcademyMemberStatusProfile(ctx, tx, target, input); err != nil {
		return academyMemberStatusUpdateResponse{}, err
	}

	if err := tx.Commit(); err != nil {
		return academyMemberStatusUpdateResponse{}, err
	}
	tx = nil

	return academyMemberStatusUpdateResponse{
		Status:        "ok",
		Message:       "Academy member status updated.",
		LoginID:       input.LoginID,
		CurrentStatus: input.CurrentStatus,
		NextStatus:    input.NextStatus,
		RoleCode:      target.roleCode,
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

func lookupAcademyAccountRoleAndStatus(
	ctx context.Context,
	tx *sql.Tx,
	academyCode string,
	loginID string,
) (academyMemberRoleStatus, error) {
	readRole := `
SELECT role_code, status_code
  FROM (
    SELECT ROLE_CODE AS role_code, STATUS_CODE AS status_code
      FROM MAIMEI_ADMINS
     WHERE LOGIN_ID = :1
       AND ACADEMY_CODE = :2
       AND STATUS_CODE IN ('ACTIVE', 'HOLD', 'INACTIVE')
    UNION ALL
    SELECT 'TEACHER' AS role_code, STATUS_CODE AS status_code
      FROM MAIMEI_TEACHERS
     WHERE LOGIN_ID = :1
       AND ACADEMY_CODE = :2
       AND STATUS_CODE IN ('ACTIVE', 'HOLD', 'INACTIVE')
    UNION ALL
    SELECT 'STUDENT' AS role_code, STATUS_CODE AS status_code
      FROM MAIMEI_STUDENTS
     WHERE LOGIN_ID = :1
       AND ACADEMY_CODE = :2
       AND STATUS_CODE IN ('ACTIVE', 'HOLD', 'INACTIVE')
  )
 WHERE ROWNUM = 1`

	var target academyMemberRoleStatus
	if err := tx.QueryRowContext(ctx, readRole, loginID, academyCode).Scan(&target.roleCode, &target.statusCode); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return academyMemberRoleStatus{}, fmt.Errorf("That academy member could not be found.")
		}
		return academyMemberRoleStatus{}, err
	}

	return target, nil
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

func updateAcademyMemberStatusProfile(
	ctx context.Context,
	tx *sql.Tx,
	target academyMemberRoleStatus,
	input academyMemberStatusUpdateInput,
) error {
	var updateProfile string
	switch target.roleCode {
	case "ROOT", "ADMIN":
		updateProfile = `
UPDATE MAIMEI_ADMINS
   SET STATUS_CODE = :1
 WHERE ACADEMY_CODE = :2
   AND LOGIN_ID = :3
   AND STATUS_CODE = :4`
	case "TEACHER":
		updateProfile = `
UPDATE MAIMEI_TEACHERS
   SET STATUS_CODE = :1
 WHERE ACADEMY_CODE = :2
   AND LOGIN_ID = :3
   AND STATUS_CODE = :4`
	case "STUDENT":
		updateProfile = `
UPDATE MAIMEI_STUDENTS
   SET STATUS_CODE = :1
 WHERE ACADEMY_CODE = :2
   AND LOGIN_ID = :3
   AND STATUS_CODE = :4`
	default:
		return fmt.Errorf("That academy member could not be found.")
	}

	result, err := tx.ExecContext(
		ctx,
		updateProfile,
		input.NextStatus,
		input.AcademyCode,
		input.LoginID,
		input.CurrentStatus,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected != 1 {
		return fmt.Errorf("That academy member could not be found.")
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
    account_code,
    academy_code,
    academy_name,
    academy_state,
    auth_policy,
    available_schedule,
    display_name,
    email,
    status_code,
    login_id,
    note,
    password_hash,
    pass_remaining_count,
    pass_total_count,
    phone,
    preference_ranges,
    preset,
    primary_teacher_id,
    role_code,
    skin_c_value,
    skin_h_value,
    skin_l_value,
    skin_traits,
    license_code,
    expires_at,
    source_table
FROM (
    SELECT
        adm.ADMIN_CODE AS account_code,
        adm.ACADEMY_CODE AS academy_code,
        aca.ACADEMY_NAME AS academy_name,
        aca.STATUS_CODE AS academy_state,
        DBMS_LOB.SUBSTR(adm.AUTH_POLICY, 4000, 1) AS auth_policy,
        CAST(NULL AS VARCHAR2(4000)) AS available_schedule,
        adm.DISPLAY_NAME AS display_name,
        adm.EMAIL AS email,
        adm.STATUS_CODE AS status_code,
        adm.LOGIN_ID AS login_id,
        DBMS_LOB.SUBSTR(adm.NOTE_BODY, 4000, 1) AS note,
        adm.PASSWORD_HASH AS password_hash,
        CAST(NULL AS NUMBER(10, 0)) AS pass_remaining_count,
        CAST(NULL AS NUMBER(10, 0)) AS pass_total_count,
        adm.PHONE AS phone,
        CAST(NULL AS VARCHAR2(4000)) AS preference_ranges,
        CAST(NULL AS VARCHAR2(4000)) AS preset,
        CAST(NULL AS NUMBER(19, 0)) AS primary_teacher_id,
        adm.ROLE_CODE AS role_code,
        CAST(NULL AS NUMBER(10, 4)) AS skin_c_value,
        CAST(NULL AS NUMBER(10, 4)) AS skin_h_value,
        CAST(NULL AS NUMBER(10, 4)) AS skin_l_value,
        CAST(NULL AS VARCHAR2(4000)) AS skin_traits,
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
        tch.TEACHER_CODE AS account_code,
        tch.ACADEMY_CODE AS academy_code,
        aca.ACADEMY_NAME AS academy_name,
        aca.STATUS_CODE AS academy_state,
        CAST(NULL AS VARCHAR2(4000)) AS auth_policy,
        DBMS_LOB.SUBSTR(tch.AVAILABLE_SCHEDULE, 4000, 1) AS available_schedule,
        tch.DISPLAY_NAME AS display_name,
        tch.EMAIL AS email,
        tch.STATUS_CODE AS status_code,
        tch.LOGIN_ID AS login_id,
        DBMS_LOB.SUBSTR(tch.NOTE_BODY, 4000, 1) AS note,
        tch.PASSWORD_HASH AS password_hash,
        CAST(NULL AS NUMBER(10, 0)) AS pass_remaining_count,
        CAST(NULL AS NUMBER(10, 0)) AS pass_total_count,
        tch.PHONE AS phone,
        CAST(NULL AS VARCHAR2(4000)) AS preference_ranges,
        DBMS_LOB.SUBSTR(tch.PRESET, 4000, 1) AS preset,
        CAST(NULL AS NUMBER(19, 0)) AS primary_teacher_id,
        'TEACHER' AS role_code,
        CAST(NULL AS NUMBER(10, 4)) AS skin_c_value,
        CAST(NULL AS NUMBER(10, 4)) AS skin_h_value,
        CAST(NULL AS NUMBER(10, 4)) AS skin_l_value,
        CAST(NULL AS VARCHAR2(4000)) AS skin_traits,
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
        stu.STUDENT_CODE AS account_code,
        stu.ACADEMY_CODE AS academy_code,
        aca.ACADEMY_NAME AS academy_name,
        aca.STATUS_CODE AS academy_state,
        CAST(NULL AS VARCHAR2(4000)) AS auth_policy,
        CAST(NULL AS VARCHAR2(4000)) AS available_schedule,
        stu.DISPLAY_NAME AS display_name,
        stu.EMAIL AS email,
        stu.STATUS_CODE AS status_code,
        stu.LOGIN_ID AS login_id,
        DBMS_LOB.SUBSTR(stu.NOTE_BODY, 4000, 1) AS note,
        stu.PASSWORD_HASH AS password_hash,
        stu.PASS_REMAINING_COUNT AS pass_remaining_count,
        stu.PASS_TOTAL_COUNT AS pass_total_count,
        stu.PHONE AS phone,
        DBMS_LOB.SUBSTR(stu.PREFERENCE_RANGES_BODY, 4000, 1) AS preference_ranges,
        CAST(NULL AS VARCHAR2(4000)) AS preset,
        stu.PRIMARY_TEACHER_ID AS primary_teacher_id,
        'STUDENT' AS role_code,
        stu.SKIN_C_VALUE AS skin_c_value,
        stu.SKIN_H_VALUE AS skin_h_value,
        stu.SKIN_L_VALUE AS skin_l_value,
        DBMS_LOB.SUBSTR(stu.SKIN_TRAITS_BODY, 4000, 1) AS skin_traits,
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
			&account.accountCode,
			&account.academyCode,
			&account.academyName,
			&account.academyState,
			&account.authPolicy,
			&account.availableSchedule,
			&account.displayName,
			&account.email,
			&account.statusCode,
			&account.loginID,
			&account.note,
			&account.passwordHash,
			&account.passRemainingCount,
			&account.passTotalCount,
			&account.phone,
			&account.preferenceRanges,
			&account.preset,
			&account.primaryTeacherID,
			&account.roleCode,
			&account.skinCValue,
			&account.skinHValue,
			&account.skinLValue,
			&account.skinTraits,
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

func validateAcademyModerationAccess(academyCode, actorRoleCode string) error {
	if academyCode == "" {
		return fmt.Errorf("Please enter your academy code.")
	}

	switch actorRoleCode {
	case "ROOT", "ADMIN":
		return nil
	default:
		return fmt.Errorf("Only root or admin accounts can manage academy members.")
	}
}

func validateAcademyMemberStatusFilter(statusFilter string) error {
	switch statusFilter {
	case "ALL", "ACTIVE", "HOLD", "INACTIVE":
		return nil
	default:
		return fmt.Errorf("Please choose a valid status filter.")
	}
}

func validateAcademyMemberStatusTransition(currentStatus, nextStatus string) error {
	if currentStatus == nextStatus {
		return fmt.Errorf("Please choose a different next status.")
	}

	switch currentStatus {
	case "ACTIVE":
		if nextStatus == "HOLD" || nextStatus == "INACTIVE" {
			return nil
		}
	case "HOLD":
		if nextStatus == "ACTIVE" || nextStatus == "INACTIVE" {
			return nil
		}
	case "INACTIVE":
		if nextStatus == "ACTIVE" || nextStatus == "HOLD" {
			return nil
		}
	}

	return fmt.Errorf("That academy member status transition is not allowed.")
}

func validateAcademyMemberTargetRole(roleCode string) error {
	if roleCode == "ROOT" {
		return fmt.Errorf("Root accounts cannot change status here.")
	}

	return nil
}

func canUpdateProfileStatus(actorRoleCode, targetRoleCode string) bool {
	if targetRoleCode == "ROOT" {
		return false
	}

	switch actorRoleCode {
	case "ROOT":
		return true
	case "ADMIN":
		return targetRoleCode != "ROOT" && targetRoleCode != "ADMIN"
	default:
		return false
	}
}

func isAllowedAccountStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "ACTIVE", "HOLD", "INACTIVE":
		return true
	default:
		return false
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

func parseOptionalStudentFloat(value string, label string) (any, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}

	parsedValue, err := strconv.ParseFloat(trimmed, 64)
	if err != nil {
		return nil, fmt.Errorf("Please enter a valid %s.", label)
	}

	return parsedValue, nil
}
