package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type reservationService interface {
	GetStudentAvailability(ctx context.Context, actor accountResponse, input studentReservationAvailabilityInput) (reservationAvailabilityResponse, error)
	CreateStudentReservation(ctx context.Context, actor accountResponse, input studentReservationCreateInput) (reservationMutationResponse, error)
	ListStudentReservations(ctx context.Context, actor accountResponse, input studentReservationListInput) (studentReservationListResponse, error)
	CancelStudentReservation(ctx context.Context, actor accountResponse, input studentReservationCancelInput) (reservationMutationResponse, error)
	ListTeacherReservations(ctx context.Context, actor accountResponse, input teacherReservationListInput) (teacherReservationListResponse, error)
	ApproveTeacherReservation(ctx context.Context, actor accountResponse, input teacherReservationMutationInput) (reservationMutationResponse, error)
	CancelTeacherReservation(ctx context.Context, actor accountResponse, input teacherReservationMutationInput) (reservationMutationResponse, error)
}

type oracleReservationService struct {
	db *sql.DB
}

type studentReservationAvailabilityInput struct {
	Date           string `json:"date"`
	StudentLoginID string `json:"studentLoginId"`
	Timezone       string `json:"timezone"`
	ActorLoginID   string `json:"-"`
	ActorRoleCode  string `json:"-"`
}

type studentReservationCreateInput struct {
	StartsAtUTC    string `json:"startsAtUtc"`
	PresetID       string `json:"presetId"`
	StudentLoginID string `json:"studentLoginId"`
	Timezone       string `json:"timezone"`
	ActorLoginID   string `json:"-"`
	ActorRoleCode  string `json:"-"`
}

type studentReservationListInput struct {
	StudentLoginID string `json:"studentLoginId"`
}

type studentReservationCancelInput struct {
	ReservationID  string `json:"reservationId"`
	StudentLoginID string `json:"studentLoginId"`
	ActorLoginID   string `json:"-"`
	ActorRoleCode  string `json:"-"`
}

type teacherReservationListInput struct {
	TeacherLoginID string `json:"teacherLoginId"`
}

type teacherReservationMutationInput struct {
	ReservationID  string `json:"reservationId"`
	PresetID       string `json:"presetId"`
	TeacherLoginID string `json:"teacherLoginId"`
	ActorLoginID   string `json:"-"`
	ActorRoleCode  string `json:"-"`
}

type studentReservationSlot struct {
	StartTime     string `json:"startTime"`
	StartsAtUTC   string `json:"startsAtUtc,omitempty"`
	Status        string `json:"status"`
	ReservationID string `json:"reservationId,omitempty"`
}

type reservationAvailabilityResponse struct {
	Status   string                   `json:"status"`
	Message  string                   `json:"message"`
	Date     string                   `json:"date"`
	Timezone string                   `json:"timezone,omitempty"`
	Slots    []studentReservationSlot `json:"slots"`
}

type studentReservationRecord struct {
	ID          string                          `json:"id"`
	Date        string                          `json:"date"`
	Time        string                          `json:"time"`
	StartsAtUTC string                          `json:"startsAtUtc,omitempty"`
	PresetID    string                          `json:"presetId,omitempty"`
	Preset      *studentReservationPresetDetail `json:"preset,omitempty"`
	Status      string                          `json:"status"`
	TeacherName string                          `json:"teacherName,omitempty"`
}

type studentReservationPresetDetail struct {
	ID    string              `json:"id"`
	Items map[string][]string `json:"items,omitempty"`
	Name  string              `json:"name"`
	Note  string              `json:"note,omitempty"`
}

type studentReservationListResponse struct {
	Status       string                     `json:"status"`
	Message      string                     `json:"message"`
	Reservations []studentReservationRecord `json:"reservations"`
}

type teacherReservationRecord struct {
	ID                 string `json:"id"`
	Date               string `json:"date"`
	Time               string `json:"time"`
	StartsAtUTC        string `json:"startsAtUtc,omitempty"`
	PresetID           string `json:"presetId,omitempty"`
	Status             string `json:"status"`
	StudentName        string `json:"studentName,omitempty"`
	StudentLoginID     string `json:"studentLoginId,omitempty"`
	SkinLValue         string `json:"skinLValue,omitempty"`
	SkinCValue         string `json:"skinCValue,omitempty"`
	SkinHValue         string `json:"skinHValue,omitempty"`
	SkinTraits         string `json:"skinTraits,omitempty"`
	PreferenceRanges   string `json:"preferenceRanges,omitempty"`
	PassTotalCount     string `json:"passTotalCount,omitempty"`
	PassRemainingCount string `json:"passRemainingCount,omitempty"`
}

type teacherReservationListResponse struct {
	Status       string                     `json:"status"`
	Message      string                     `json:"message"`
	Reservations []teacherReservationRecord `json:"reservations"`
}

type reservationMutationResponse struct {
	Status        string `json:"status"`
	Message       string `json:"message"`
	PresetID      string `json:"presetId,omitempty"`
	ReservationID string `json:"reservationId,omitempty"`
}

type storedStudentReservationContext struct {
	academyCode        string
	defaultPresetID    string
	passRemainingCount int64
	primaryTeacherID   int64
	presetBody         string
	scheduleBody       string
	studentID          int64
	studentStatusCode  string
	teacherName        string
	teacherStatusCode  string
}

type storedTeacherReservationContext struct {
	academyCode       string
	presetBody        string
	teacherID         int64
	teacherStatusCode string
}

type teacherScheduleDocument struct {
	Exceptions []teacherScheduleException       `json:"exceptions"`
	Timezone   string                           `json:"timezone"`
	Weekly     map[string][]teacherScheduleSlot `json:"weekly"`
}

type teacherScheduleException struct {
	Type      string                `json:"type"`
	Closed    bool                  `json:"closed"`
	Date      string                `json:"date"`
	StartDate string                `json:"startDate"`
	EndDate   string                `json:"endDate"`
	AllDay    bool                  `json:"allDay"`
	Slots     []teacherScheduleSlot `json:"slots"`
}

type teacherScheduleSlot struct {
	End   string `json:"end"`
	Start string `json:"start"`
}

type scheduleTimeSlot struct {
	startTime string
	startUTC  time.Time
}

type storedTeacherReservation struct {
	reservationID string
	startTime     string
	startsAtUTC   time.Time
	statusCode    string
	studentID     int64
}

func newReservationServiceFromEnv() (*oracleReservationService, error) {
	cfg, err := loadOracleConfigFromEnv()
	if err != nil {
		return nil, err
	}

	db, err := openOracleDB(cfg)
	if err != nil {
		return nil, err
	}

	return &oracleReservationService{db: db}, nil
}

func (s *oracleReservationService) GetStudentAvailability(
	ctx context.Context,
	actor accountResponse,
	input studentReservationAvailabilityInput,
) (reservationAvailabilityResponse, error) {
	selectedDate, err := parseReservationDate(input.Date)
	if err != nil {
		return reservationAvailabilityResponse{}, err
	}

	storedContext, err := s.resolveStudentReservationContext(ctx, actor, input.StudentLoginID)
	if err != nil {
		return reservationAvailabilityResponse{}, err
	}
	if err := validateStudentReservationBookingContext(storedContext); err != nil {
		return reservationAvailabilityResponse{
			Status:   "ok",
			Message:  err.Error(),
			Date:     selectedDate.Format("2006-01-02"),
			Timezone: normalizeReservationTimezone(input.Timezone),
			Slots:    []studentReservationSlot{},
		}, nil
	}

	slots, err := s.buildAvailabilitySlots(
		ctx,
		storedContext,
		selectedDate,
		normalizeReservationTimezone(input.Timezone),
	)
	if err != nil {
		return reservationAvailabilityResponse{}, err
	}

	return reservationAvailabilityResponse{
		Status:   "ok",
		Message:  "Availability loaded.",
		Date:     selectedDate.Format("2006-01-02"),
		Timezone: normalizeReservationTimezone(input.Timezone),
		Slots:    slots,
	}, nil
}

func (s *oracleReservationService) CreateStudentReservation(
	ctx context.Context,
	actor accountResponse,
	input studentReservationCreateInput,
) (reservationMutationResponse, error) {
	storedContext, err := s.resolveStudentReservationContext(ctx, actor, input.StudentLoginID)
	if err != nil {
		return reservationMutationResponse{}, err
	}
	if err := validateStudentReservationBookingContext(storedContext); err != nil {
		return reservationMutationResponse{}, err
	}
	if storedContext.passRemainingCount <= 0 {
		return reservationMutationResponse{}, fmt.Errorf("No remaining passes are available for reservation.")
	}

	requestedStartsAtUTC, err := parseUTCText(strings.TrimSpace(input.StartsAtUTC))
	if err != nil {
		return reservationMutationResponse{}, fmt.Errorf("Please choose a valid time slot.")
	}
	displayTimezone := normalizeReservationTimezone(input.Timezone)
	displayLocation, err := loadReservationLocation(displayTimezone)
	if err != nil {
		return reservationMutationResponse{}, err
	}
	selectedLocalDate := requestedStartsAtUTC.In(displayLocation)
	selectedDate := time.Date(
		selectedLocalDate.Year(),
		selectedLocalDate.Month(),
		selectedLocalDate.Day(),
		0,
		0,
		0,
		0,
		displayLocation,
	)

	availableSlots, err := s.buildAvailabilitySlots(
		ctx,
		storedContext,
		selectedDate,
		displayTimezone,
	)
	if err != nil {
		return reservationMutationResponse{}, err
	}

	requestedStartsAtUTC, err = resolveRequestedReservationUTC(input, availableSlots)
	if err != nil {
		return reservationMutationResponse{}, err
	}
	scheduleDocument, err := parseTeacherScheduleDocument(storedContext.scheduleBody)
	if err != nil {
		return reservationMutationResponse{}, err
	}
	presetID := strings.TrimSpace(input.PresetID)
	scheduleLocation, err := loadReservationLocation(normalizeReservationTimezone(scheduleDocument.Timezone))
	if err != nil {
		return reservationMutationResponse{}, err
	}
	startLocal := requestedStartsAtUTC.In(scheduleLocation)

	slotMatched := false
	for _, slot := range availableSlots {
		if slot.StartsAtUTC == formatUTCText(requestedStartsAtUTC) && slot.Status == "available" {
			slotMatched = true
			break
		}
	}
	if !slotMatched {
		return reservationMutationResponse{}, fmt.Errorf("That reservation slot is no longer available.")
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
    CREATED_BY,
    UPDATED_BY
) VALUES (
    :1,
    :2,
    :3,
    :4,
    :5,
    :6,
    'PENDING',
    :7,
    :8
)`

	if _, err := s.db.ExecContext(
		ctx,
		query,
		storedContext.academyCode,
		storedContext.studentID,
		storedContext.primaryTeacherID,
		nullIfBlank(presetID),
		requestedStartsAtUTC.UTC(),
		startLocal,
		actor.LoginID,
		actor.LoginID,
	); err != nil {
		if isUniqueConstraintError(err) {
			return reservationMutationResponse{}, fmt.Errorf("That reservation slot is no longer available.")
		}
		return reservationMutationResponse{}, fmt.Errorf("We could not create the reservation right now. Please try again.")
	}

	var reservationID string
	readQuery := `
SELECT RESERVATION_CODE
  FROM MAIMEI_LESSON_RESERVATIONS
 WHERE STUDENT_ID = :1
   AND TEACHER_ID = :2
   AND STARTS_AT_UTC = :3
   AND STATUS_CODE = 'PENDING'
 ORDER BY CREATED_AT DESC
 FETCH FIRST 1 ROWS ONLY`
	if err := s.db.QueryRowContext(
		ctx,
		readQuery,
		storedContext.studentID,
		storedContext.primaryTeacherID,
		requestedStartsAtUTC.UTC(),
	).Scan(&reservationID); err != nil {
		return reservationMutationResponse{
			Status:   "ok",
			Message:  "Reservation created.",
			PresetID: presetID,
		}, nil
	}

	return reservationMutationResponse{
		Status:        "ok",
		Message:       "Reservation created.",
		PresetID:      presetID,
		ReservationID: reservationID,
	}, nil
}

func (s *oracleReservationService) ListStudentReservations(
	ctx context.Context,
	actor accountResponse,
	input studentReservationListInput,
) (studentReservationListResponse, error) {
	storedContext, err := s.resolveStudentReservationContext(ctx, actor, input.StudentLoginID)
	if err != nil {
		return studentReservationListResponse{}, err
	}

	query := `
SELECT res.RESERVATION_CODE,
       TO_CHAR(res.RESERVATION_AT, 'YYYY-MM-DD'),
       TO_CHAR(res.RESERVATION_AT, 'HH24:MI'),
       TO_CHAR(res.STARTS_AT_UTC, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
       res.PRESET_ID,
       res.STATUS_CODE,
       tch.DISPLAY_NAME
  FROM MAIMEI_LESSON_RESERVATIONS res
  JOIN MAIMEI_TEACHERS tch
    ON tch.TEACHER_ID = res.TEACHER_ID
 WHERE res.STUDENT_ID = :1
   AND res.STATUS_CODE IN ('PENDING', 'CONFIRMED', 'CANCELED')
 ORDER BY res.STARTS_AT_UTC ASC`

	rows, err := s.db.QueryContext(ctx, query, storedContext.studentID)
	if err != nil {
		if isOracleInvalidIdentifierError(err) {
			return s.listStudentReservationsLegacy(ctx, storedContext.studentID)
		}
		return studentReservationListResponse{}, fmt.Errorf("We could not load reservations right now. Please try again.")
	}
	defer rows.Close()

	records := make([]studentReservationRecord, 0, 8)
	for rows.Next() {
		var record studentReservationRecord
		var presetID sql.NullString
		var statusCode string
		if err := rows.Scan(
			&record.ID,
			&record.Date,
			&record.Time,
			&record.StartsAtUTC,
			&presetID,
			&statusCode,
			&record.TeacherName,
		); err != nil {
			return studentReservationListResponse{}, fmt.Errorf("We could not load reservations right now. Please try again.")
		}
		record.PresetID = strings.TrimSpace(nullStringValue(presetID))
		record.Status = normalizeReservationStatusCode(statusCode)
		if presetSummary, ok := findTeacherPresetSummary(storedContext.presetBody, record.PresetID); ok {
			record.Preset = &studentReservationPresetDetail{
				ID:    presetSummary.ID,
				Items: presetSummary.Items,
				Name:  presetSummary.Name,
				Note:  presetSummary.Note,
			}
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return studentReservationListResponse{}, fmt.Errorf("We could not load reservations right now. Please try again.")
	}

	return studentReservationListResponse{
		Status:       "ok",
		Message:      "Reservations loaded.",
		Reservations: records,
	}, nil
}

func (s *oracleReservationService) listStudentReservationsLegacy(
	ctx context.Context,
	studentID int64,
) (studentReservationListResponse, error) {
	query := `
SELECT res.RESERVATION_CODE,
       TO_CHAR(res.RESERVATION_AT, 'YYYY-MM-DD'),
       TO_CHAR(res.RESERVATION_AT, 'HH24:MI'),
       res.STATUS_CODE,
       tch.DISPLAY_NAME
  FROM MAIMEI_LESSON_RESERVATIONS res
  JOIN MAIMEI_TEACHERS tch
    ON tch.TEACHER_ID = res.TEACHER_ID
 WHERE res.STUDENT_ID = :1
   AND res.STATUS_CODE IN ('PENDING', 'CONFIRMED', 'CANCELED')
 ORDER BY res.RESERVATION_AT ASC`

	rows, err := s.db.QueryContext(ctx, query, studentID)
	if err != nil {
		return studentReservationListResponse{}, fmt.Errorf("We could not load reservations right now. Please try again.")
	}
	defer rows.Close()

	records := make([]studentReservationRecord, 0, 8)
	for rows.Next() {
		var record studentReservationRecord
		var statusCode string
		if err := rows.Scan(
			&record.ID,
			&record.Date,
			&record.Time,
			&statusCode,
			&record.TeacherName,
		); err != nil {
			return studentReservationListResponse{}, fmt.Errorf("We could not load reservations right now. Please try again.")
		}
		record.Status = normalizeReservationStatusCode(statusCode)
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return studentReservationListResponse{}, fmt.Errorf("We could not load reservations right now. Please try again.")
	}

	return studentReservationListResponse{
		Status:       "ok",
		Message:      "Reservations loaded.",
		Reservations: records,
	}, nil
}

func (s *oracleReservationService) CancelStudentReservation(
	ctx context.Context,
	actor accountResponse,
	input studentReservationCancelInput,
) (reservationMutationResponse, error) {
	reservationID := strings.TrimSpace(input.ReservationID)
	if reservationID == "" {
		return reservationMutationResponse{}, fmt.Errorf("Please choose a reservation to cancel.")
	}

	storedContext, err := s.resolveStudentReservationContext(ctx, actor, input.StudentLoginID)
	if err != nil {
		return reservationMutationResponse{}, err
	}

	var currentStatus string
	var ownerStudentID int64
	readQuery := `
SELECT STATUS_CODE, STUDENT_ID
  FROM MAIMEI_LESSON_RESERVATIONS
 WHERE RESERVATION_CODE = :1`
	if err := s.db.QueryRowContext(ctx, readQuery, reservationID).Scan(&currentStatus, &ownerStudentID); err != nil {
		if err == sql.ErrNoRows {
			return reservationMutationResponse{}, fmt.Errorf("That reservation could not be found.")
		}
		return reservationMutationResponse{}, fmt.Errorf("We could not cancel the reservation right now. Please try again.")
	}

	if ownerStudentID != storedContext.studentID {
		return reservationMutationResponse{}, fmt.Errorf("You can cancel only your own reservations.")
	}
	normalizedCurrentStatus := strings.ToUpper(strings.TrimSpace(currentStatus))
	if normalizedCurrentStatus != "PENDING" && normalizedCurrentStatus != "CONFIRMED" {
		return reservationMutationResponse{}, fmt.Errorf("Only reserved reservations can be canceled right now.")
	}

	updateQuery := `
UPDATE MAIMEI_LESSON_RESERVATIONS
   SET STATUS_CODE = 'CANCELED',
       CANCELED_AT = SYSTIMESTAMP,
       UPDATED_BY = :1
 WHERE RESERVATION_CODE = :2`
	if _, err := s.db.ExecContext(ctx, updateQuery, actor.LoginID, reservationID); err != nil {
		return reservationMutationResponse{}, fmt.Errorf("We could not cancel the reservation right now. Please try again.")
	}

	return reservationMutationResponse{
		Status:        "ok",
		Message:       "Reservation canceled.",
		ReservationID: reservationID,
	}, nil
}

func (s *oracleReservationService) ListTeacherReservations(
	ctx context.Context,
	actor accountResponse,
	input teacherReservationListInput,
) (teacherReservationListResponse, error) {
	storedContext, err := s.resolveTeacherReservationContext(ctx, actor, input.TeacherLoginID)
	if err != nil {
		return teacherReservationListResponse{}, err
	}

	query := `
SELECT res.RESERVATION_CODE,
       TO_CHAR(res.RESERVATION_AT, 'YYYY-MM-DD'),
       TO_CHAR(res.RESERVATION_AT, 'HH24:MI'),
       TO_CHAR(res.STARTS_AT_UTC, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
       res.PRESET_ID,
       res.STATUS_CODE,
       stu.DISPLAY_NAME,
       stu.LOGIN_ID,
       stu.SKIN_L_VALUE,
       stu.SKIN_C_VALUE,
       stu.SKIN_H_VALUE,
       DBMS_LOB.SUBSTR(stu.SKIN_TRAITS_BODY, 4000, 1),
       DBMS_LOB.SUBSTR(stu.PREFERENCE_RANGES_BODY, 4000, 1),
       stu.PASS_TOTAL_COUNT,
       stu.PASS_REMAINING_COUNT
  FROM MAIMEI_LESSON_RESERVATIONS res
  JOIN MAIMEI_STUDENTS stu
    ON stu.STUDENT_ID = res.STUDENT_ID
 WHERE res.TEACHER_ID = :1
   AND res.STATUS_CODE IN ('PENDING', 'CONFIRMED', 'CANCELED')
 ORDER BY CASE res.STATUS_CODE WHEN 'PENDING' THEN 0 ELSE 1 END,
          res.STARTS_AT_UTC ASC`

	rows, err := s.db.QueryContext(ctx, query, storedContext.teacherID)
	if err != nil {
		if isOracleInvalidIdentifierError(err) {
			return s.listTeacherReservationsLegacy(ctx, storedContext.teacherID)
		}
		return teacherReservationListResponse{}, fmt.Errorf("We could not load teacher reservations right now. Please try again.")
	}
	defer rows.Close()

	records := make([]teacherReservationRecord, 0, 8)
	for rows.Next() {
		var record teacherReservationRecord
		var presetID sql.NullString
		var statusCode string
		var skinLValue sql.NullFloat64
		var skinCValue sql.NullFloat64
		var skinHValue sql.NullFloat64
		var skinTraits sql.NullString
		var preferenceRanges sql.NullString
		var passTotalCount sql.NullInt64
		var passRemainingCount sql.NullInt64
		if err := rows.Scan(
			&record.ID,
			&record.Date,
			&record.Time,
			&record.StartsAtUTC,
			&presetID,
			&statusCode,
			&record.StudentName,
			&record.StudentLoginID,
			&skinLValue,
			&skinCValue,
			&skinHValue,
			&skinTraits,
			&preferenceRanges,
			&passTotalCount,
			&passRemainingCount,
		); err != nil {
			return teacherReservationListResponse{}, fmt.Errorf("We could not load teacher reservations right now. Please try again.")
		}
		record.PresetID = strings.TrimSpace(nullStringValue(presetID))
		record.Status = normalizeReservationStatusCode(statusCode)
		record.SkinLValue = nullFloat64Value(skinLValue)
		record.SkinCValue = nullFloat64Value(skinCValue)
		record.SkinHValue = nullFloat64Value(skinHValue)
		record.SkinTraits = strings.TrimSpace(nullStringValue(skinTraits))
		record.PreferenceRanges = strings.TrimSpace(nullStringValue(preferenceRanges))
		record.PassTotalCount = nullInt64Value(passTotalCount)
		record.PassRemainingCount = nullInt64Value(passRemainingCount)
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return teacherReservationListResponse{}, fmt.Errorf("We could not load teacher reservations right now. Please try again.")
	}

	return teacherReservationListResponse{
		Status:       "ok",
		Message:      "Teacher reservations loaded.",
		Reservations: records,
	}, nil
}

func (s *oracleReservationService) listTeacherReservationsLegacy(
	ctx context.Context,
	teacherID int64,
) (teacherReservationListResponse, error) {
	query := `
SELECT res.RESERVATION_CODE,
       TO_CHAR(res.RESERVATION_AT, 'YYYY-MM-DD'),
       TO_CHAR(res.RESERVATION_AT, 'HH24:MI'),
       res.STATUS_CODE,
       stu.DISPLAY_NAME,
       stu.LOGIN_ID,
       stu.SKIN_L_VALUE,
       stu.SKIN_C_VALUE,
       stu.SKIN_H_VALUE,
       DBMS_LOB.SUBSTR(stu.SKIN_TRAITS_BODY, 4000, 1),
       DBMS_LOB.SUBSTR(stu.PREFERENCE_RANGES_BODY, 4000, 1),
       stu.PASS_TOTAL_COUNT,
       stu.PASS_REMAINING_COUNT
  FROM MAIMEI_LESSON_RESERVATIONS res
  JOIN MAIMEI_STUDENTS stu
    ON stu.STUDENT_ID = res.STUDENT_ID
 WHERE res.TEACHER_ID = :1
   AND res.STATUS_CODE IN ('PENDING', 'CONFIRMED', 'CANCELED')
 ORDER BY CASE res.STATUS_CODE WHEN 'PENDING' THEN 0 ELSE 1 END,
          res.RESERVATION_AT ASC`

	rows, err := s.db.QueryContext(ctx, query, teacherID)
	if err != nil {
		return teacherReservationListResponse{}, fmt.Errorf("We could not load teacher reservations right now. Please try again.")
	}
	defer rows.Close()

	records := make([]teacherReservationRecord, 0, 8)
	for rows.Next() {
		var record teacherReservationRecord
		var statusCode string
		var skinLValue sql.NullFloat64
		var skinCValue sql.NullFloat64
		var skinHValue sql.NullFloat64
		var skinTraits sql.NullString
		var preferenceRanges sql.NullString
		var passTotalCount sql.NullInt64
		var passRemainingCount sql.NullInt64
		if err := rows.Scan(
			&record.ID,
			&record.Date,
			&record.Time,
			&statusCode,
			&record.StudentName,
			&record.StudentLoginID,
			&skinLValue,
			&skinCValue,
			&skinHValue,
			&skinTraits,
			&preferenceRanges,
			&passTotalCount,
			&passRemainingCount,
		); err != nil {
			return teacherReservationListResponse{}, fmt.Errorf("We could not load teacher reservations right now. Please try again.")
		}
		record.Status = normalizeReservationStatusCode(statusCode)
		record.SkinLValue = nullFloat64Value(skinLValue)
		record.SkinCValue = nullFloat64Value(skinCValue)
		record.SkinHValue = nullFloat64Value(skinHValue)
		record.SkinTraits = strings.TrimSpace(nullStringValue(skinTraits))
		record.PreferenceRanges = strings.TrimSpace(nullStringValue(preferenceRanges))
		record.PassTotalCount = nullInt64Value(passTotalCount)
		record.PassRemainingCount = nullInt64Value(passRemainingCount)
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return teacherReservationListResponse{}, fmt.Errorf("We could not load teacher reservations right now. Please try again.")
	}

	return teacherReservationListResponse{
		Status:       "ok",
		Message:      "Teacher reservations loaded.",
		Reservations: records,
	}, nil
}

func (s *oracleReservationService) ApproveTeacherReservation(
	ctx context.Context,
	actor accountResponse,
	input teacherReservationMutationInput,
) (reservationMutationResponse, error) {
	return s.mutateTeacherReservationStatus(ctx, actor, input, "CONFIRMED")
}

func (s *oracleReservationService) CancelTeacherReservation(
	ctx context.Context,
	actor accountResponse,
	input teacherReservationMutationInput,
) (reservationMutationResponse, error) {
	return s.mutateTeacherReservationStatus(ctx, actor, input, "CANCELED")
}

func (s *oracleReservationService) mutateTeacherReservationStatus(
	ctx context.Context,
	actor accountResponse,
	input teacherReservationMutationInput,
	nextStatus string,
) (reservationMutationResponse, error) {
	logServerRuntime("reservations", "teacher-mutation:start", map[string]any{
		"actorLoginId":  actor.LoginID,
		"actorRoleCode": actor.RoleCode,
		"nextStatus":    nextStatus,
		"reservationId": strings.TrimSpace(input.ReservationID),
	})

	if strings.TrimSpace(actor.LoginID) == "" {
		logServerRuntime("reservations", "teacher-mutation:reject", map[string]any{
			"reason": "missing-session",
		})
		return reservationMutationResponse{}, fmt.Errorf("No active session was found.")
	}
	reservationID := strings.TrimSpace(input.ReservationID)
	if reservationID == "" {
		logServerRuntime("reservations", "teacher-mutation:reject", map[string]any{
			"actorLoginId": actor.LoginID,
			"reason":       "missing-reservation-id",
		})
		return reservationMutationResponse{}, fmt.Errorf("Please choose a reservation first.")
	}

	storedContext, err := s.resolveTeacherReservationContext(ctx, actor, input.TeacherLoginID)
	if err != nil {
		logServerRuntime("reservations", "teacher-mutation:context-error", map[string]any{
			"actorLoginId":  actor.LoginID,
			"error":         err.Error(),
			"reservationId": reservationID,
		})
		return reservationMutationResponse{}, err
	}

	logServerRuntime("reservations", "teacher-mutation:context-loaded", map[string]any{
		"actorLoginId":      actor.LoginID,
		"reservationId":     reservationID,
		"teacherId":         storedContext.teacherID,
		"teacherStatusCode": storedContext.teacherStatusCode,
	})

	var currentStatus string
	var ownerTeacherID int64
	readQuery := `
SELECT STATUS_CODE, TEACHER_ID
  FROM MAIMEI_LESSON_RESERVATIONS
 WHERE RESERVATION_CODE = :1`
	if err := s.db.QueryRowContext(ctx, readQuery, reservationID).Scan(&currentStatus, &ownerTeacherID); err != nil {
		if err == sql.ErrNoRows {
			logServerRuntime("reservations", "teacher-mutation:reject", map[string]any{
				"reason":        "reservation-not-found",
				"reservationId": reservationID,
				"teacherId":     storedContext.teacherID,
			})
			return reservationMutationResponse{}, fmt.Errorf("That reservation could not be found.")
		}
		logServerRuntime("reservations", "teacher-mutation:query-error", map[string]any{
			"error":         err.Error(),
			"reservationId": reservationID,
			"teacherId":     storedContext.teacherID,
		})
		return reservationMutationResponse{}, fmt.Errorf("We could not update the reservation right now. Please try again.")
	}

	logServerRuntime("reservations", "teacher-mutation:reservation-loaded", map[string]any{
		"currentStatus":  currentStatus,
		"ownerTeacherId": ownerTeacherID,
		"reservationId":  reservationID,
		"teacherId":      storedContext.teacherID,
	})

	if ownerTeacherID != storedContext.teacherID {
		logServerRuntime("reservations", "teacher-mutation:reject", map[string]any{
			"ownerTeacherId": ownerTeacherID,
			"reason":         "teacher-mismatch",
			"reservationId":  reservationID,
			"teacherId":      storedContext.teacherID,
		})
		return reservationMutationResponse{}, fmt.Errorf("You can update only your own reservations.")
	}

	normalizedCurrentStatus := strings.ToUpper(strings.TrimSpace(currentStatus))
	if normalizedCurrentStatus == nextStatus {
		message := "Reservation approved."
		if nextStatus == "CANCELED" {
			message = "Reservation canceled."
		}
		logServerRuntime("reservations", "teacher-mutation:no-op", map[string]any{
			"currentStatus": normalizedCurrentStatus,
			"reservationId": reservationID,
			"teacherId":     storedContext.teacherID,
		})
		return reservationMutationResponse{
			Status:        "ok",
			Message:       message,
			PresetID:      strings.TrimSpace(input.PresetID),
			ReservationID: reservationID,
		}, nil
	}
	if nextStatus == "CANCELED" && normalizedCurrentStatus == "CONFIRMED" {
		updateQuery := `
UPDATE MAIMEI_LESSON_RESERVATIONS
   SET STATUS_CODE = 'CANCELED',
       CANCELED_AT = SYSTIMESTAMP,
       UPDATED_BY = :1
 WHERE RESERVATION_CODE = :2`
		if _, err := s.db.ExecContext(ctx, updateQuery, actor.LoginID, reservationID); err != nil {
			logServerRuntime("reservations", "teacher-mutation:update-error", map[string]any{
				"error":         err.Error(),
				"nextStatus":    nextStatus,
				"reservationId": reservationID,
				"teacherId":     storedContext.teacherID,
			})
			return reservationMutationResponse{}, fmt.Errorf("We could not update the reservation right now. Please try again.")
		}

		logServerRuntime("reservations", "teacher-mutation:success", map[string]any{
			"nextStatus":    nextStatus,
			"reservationId": reservationID,
			"teacherId":     storedContext.teacherID,
		})

		return reservationMutationResponse{
			Status:        "ok",
			Message:       "Reservation canceled.",
			PresetID:      strings.TrimSpace(input.PresetID),
			ReservationID: reservationID,
		}, nil
	}
	if normalizedCurrentStatus != "PENDING" {
		logServerRuntime("reservations", "teacher-mutation:reject", map[string]any{
			"currentStatus": normalizedCurrentStatus,
			"reason":        "non-pending-status",
			"reservationId": reservationID,
			"teacherId":     storedContext.teacherID,
		})
		return reservationMutationResponse{}, fmt.Errorf("Only pending reservations can be updated right now.")
	}
	if nextStatus == "CONFIRMED" && strings.TrimSpace(input.PresetID) == "" {
		logServerRuntime("reservations", "teacher-mutation:reject", map[string]any{
			"reason":        "missing-preset-id",
			"reservationId": reservationID,
			"teacherId":     storedContext.teacherID,
		})
		return reservationMutationResponse{}, fmt.Errorf("Please select a preset before approval.")
	}
	trimmedPresetID := strings.TrimSpace(input.PresetID)
	if nextStatus == "CONFIRMED" && !teacherPresetDocumentHasID(storedContext.presetBody, trimmedPresetID) {
		logServerRuntime("reservations", "teacher-mutation:reject", map[string]any{
			"presetId":      trimmedPresetID,
			"reason":        "preset-not-owned-by-teacher",
			"reservationId": reservationID,
			"teacherId":     storedContext.teacherID,
		})
		return reservationMutationResponse{}, fmt.Errorf("Please select a valid preset from your preset list.")
	}

	updateQuery := `
UPDATE MAIMEI_LESSON_RESERVATIONS
   SET STATUS_CODE = :1,
       PRESET_ID = CASE WHEN :2 IS NOT NULL THEN :3 ELSE PRESET_ID END,
       CANCELED_AT = CASE WHEN :4 = 'CANCELED' THEN SYSTIMESTAMP ELSE NULL END,
       UPDATED_BY = :5
 WHERE RESERVATION_CODE = :6`
	if _, err := s.db.ExecContext(
		ctx,
		updateQuery,
		nextStatus,
		nullIfBlank(trimmedPresetID),
		nullIfBlank(trimmedPresetID),
		nextStatus,
		actor.LoginID,
		reservationID,
	); err != nil {
		logServerRuntime("reservations", "teacher-mutation:update-error", map[string]any{
			"error":         err.Error(),
			"nextStatus":    nextStatus,
			"reservationId": reservationID,
			"teacherId":     storedContext.teacherID,
		})
		return reservationMutationResponse{}, fmt.Errorf("We could not update the reservation right now. Please try again.")
	}

	message := "Reservation approved."
	if nextStatus == "CANCELED" {
		message = "Reservation canceled."
	}

	logServerRuntime("reservations", "teacher-mutation:success", map[string]any{
		"nextStatus":    nextStatus,
		"reservationId": reservationID,
		"teacherId":     storedContext.teacherID,
	})

	return reservationMutationResponse{
		Status:        "ok",
		Message:       message,
		PresetID:      trimmedPresetID,
		ReservationID: reservationID,
	}, nil
}

func (s *oracleReservationService) resolveTeacherReservationContext(
	ctx context.Context,
	actor accountResponse,
	targetTeacherLoginID string,
) (storedTeacherReservationContext, error) {
	if strings.TrimSpace(actor.LoginID) == "" {
		return storedTeacherReservationContext{}, fmt.Errorf("No active session was found.")
	}
	if err := validateRestrictedActionActor(actor); err != nil {
		return storedTeacherReservationContext{}, err
	}

	actorRoleCode := strings.ToUpper(strings.TrimSpace(actor.RoleCode))
	trimmedTargetLoginID := strings.TrimSpace(targetTeacherLoginID)

	switch actorRoleCode {
	case "TEACHER":
		if trimmedTargetLoginID != "" && trimmedTargetLoginID != strings.TrimSpace(actor.LoginID) {
			return storedTeacherReservationContext{}, fmt.Errorf("You can review only your own reservations.")
		}
		return s.loadTeacherReservationContext(ctx, actor.LoginID)
	case "ROOT", "ADMIN":
		if trimmedTargetLoginID == "" {
			return storedTeacherReservationContext{}, fmt.Errorf("Please choose a valid teacher account first.")
		}
		return s.loadTeacherReservationContext(ctx, trimmedTargetLoginID)
	default:
		return storedTeacherReservationContext{}, fmt.Errorf("Only teacher, admin, or root accounts can access reservation review.")
	}
}

func (s *oracleReservationService) resolveStudentReservationContext(
	ctx context.Context,
	actor accountResponse,
	targetStudentLoginID string,
) (storedStudentReservationContext, error) {
	if strings.TrimSpace(actor.LoginID) == "" {
		return storedStudentReservationContext{}, fmt.Errorf("No active session was found.")
	}
	if err := validateRestrictedActionActor(actor); err != nil {
		return storedStudentReservationContext{}, err
	}

	actorRoleCode := strings.ToUpper(strings.TrimSpace(actor.RoleCode))
	trimmedTargetLoginID := strings.TrimSpace(targetStudentLoginID)

	switch actorRoleCode {
	case "STUDENT":
		if trimmedTargetLoginID != "" && trimmedTargetLoginID != strings.TrimSpace(actor.LoginID) {
			return storedStudentReservationContext{}, fmt.Errorf("You can manage only your own reservations.")
		}
		return s.loadStudentReservationContext(ctx, actor.LoginID)
	case "ROOT", "ADMIN":
		if trimmedTargetLoginID == "" {
			return storedStudentReservationContext{}, fmt.Errorf("Please choose a valid student account first.")
		}
		return s.loadStudentReservationContext(ctx, trimmedTargetLoginID)
	default:
		return storedStudentReservationContext{}, fmt.Errorf("Only student, admin, or root accounts can access reservations.")
	}
}

func (s *oracleReservationService) loadStudentReservationContext(
	ctx context.Context,
	loginID string,
) (storedStudentReservationContext, error) {
	query := `
SELECT stu.STUDENT_ID,
       stu.ACADEMY_CODE,
       stu.PRIMARY_TEACHER_ID,
       stu.PASS_REMAINING_COUNT,
       stu.STATUS_CODE,
       tch.DISPLAY_NAME,
       tch.STATUS_CODE,
       DBMS_LOB.SUBSTR(tch.PRESET, 4000, 1) AS preset_body,
       COALESCE(
           DBMS_LOB.SUBSTR(ts.SCHEDULE_BODY, 4000, 1),
           DBMS_LOB.SUBSTR(tch.AVAILABLE_SCHEDULE, 4000, 1)
       ) AS schedule_body
  FROM MAIMEI_STUDENTS stu
  LEFT JOIN MAIMEI_TEACHERS tch
    ON tch.TEACHER_ID = stu.PRIMARY_TEACHER_ID
  LEFT JOIN MAIMEI_TEACHER_AVAILABLE_SCHEDULES ts
    ON ts.TEACHER_ID = tch.TEACHER_ID
 WHERE stu.LOGIN_ID = :1`

	var storedContext storedStudentReservationContext
	var academyCode sql.NullString
	var primaryTeacherID sql.NullInt64
	var passRemainingCount sql.NullInt64
	var presetBody sql.NullString
	var teacherName sql.NullString
	var teacherStatusCode sql.NullString
	var scheduleBody sql.NullString
	if err := s.db.QueryRowContext(ctx, query, loginID).Scan(
		&storedContext.studentID,
		&academyCode,
		&primaryTeacherID,
		&passRemainingCount,
		&storedContext.studentStatusCode,
		&teacherName,
		&teacherStatusCode,
		&presetBody,
		&scheduleBody,
	); err != nil {
		if err == sql.ErrNoRows {
			return storedStudentReservationContext{}, fmt.Errorf("No active session was found.")
		}
		return storedStudentReservationContext{}, fmt.Errorf("We could not load reservation data right now. Please try again.")
	}

	storedContext.academyCode = strings.TrimSpace(nullStringValue(academyCode))
	storedContext.primaryTeacherID = primaryTeacherID.Int64
	storedContext.passRemainingCount = passRemainingCount.Int64
	storedContext.presetBody = strings.TrimSpace(nullStringValue(presetBody))
	storedContext.teacherName = strings.TrimSpace(nullStringValue(teacherName))
	storedContext.teacherStatusCode = strings.TrimSpace(nullStringValue(teacherStatusCode))
	storedContext.scheduleBody = strings.TrimSpace(nullStringValue(scheduleBody))
	storedContext.defaultPresetID = firstTeacherPresetID(storedContext.presetBody)
	return storedContext, nil
}

func validateStudentReservationBookingContext(storedContext storedStudentReservationContext) error {
	if strings.ToUpper(strings.TrimSpace(storedContext.studentStatusCode)) != "ACTIVE" {
		return fmt.Errorf("Only active students can book reservations.")
	}
	if storedContext.primaryTeacherID == 0 {
		return fmt.Errorf("No primary teacher is connected to this student.")
	}
	if strings.ToUpper(strings.TrimSpace(storedContext.teacherStatusCode)) != "ACTIVE" {
		return fmt.Errorf("The assigned teacher is not available for reservations right now.")
	}
	return nil
}

func validateRestrictedActionActor(actor accountResponse) error {
	switch strings.ToUpper(strings.TrimSpace(findProfileDetailValue(actor.Details, "statusCode"))) {
	case "", "ACTIVE":
		return nil
	case "HOLD":
		return fmt.Errorf("Your account is currently on hold.")
	case "INACTIVE":
		return fmt.Errorf("Your account is inactive.")
	default:
		return fmt.Errorf("Your account is unavailable right now.")
	}
}

func (s *oracleReservationService) loadTeacherReservationContext(
	ctx context.Context,
	loginID string,
) (storedTeacherReservationContext, error) {
	query := `
SELECT TEACHER_ID,
       ACADEMY_CODE,
       STATUS_CODE,
       DBMS_LOB.SUBSTR(PRESET, 4000, 1)
  FROM MAIMEI_TEACHERS
 WHERE LOGIN_ID = :1`

	var storedContext storedTeacherReservationContext
	var presetBody sql.NullString
	if err := s.db.QueryRowContext(ctx, query, loginID).Scan(
		&storedContext.teacherID,
		&storedContext.academyCode,
		&storedContext.teacherStatusCode,
		&presetBody,
	); err != nil {
		if err == sql.ErrNoRows {
			return storedTeacherReservationContext{}, fmt.Errorf("No active session was found.")
		}
		return storedTeacherReservationContext{}, fmt.Errorf("We could not load reservation data right now. Please try again.")
	}

	if strings.ToUpper(strings.TrimSpace(storedContext.teacherStatusCode)) != "ACTIVE" {
		return storedTeacherReservationContext{}, fmt.Errorf("Only active teachers can review reservations.")
	}
	storedContext.presetBody = strings.TrimSpace(nullStringValue(presetBody))

	return storedContext, nil
}

func (s *oracleReservationService) buildAvailabilitySlots(
	ctx context.Context,
	storedContext storedStudentReservationContext,
	selectedDate time.Time,
	displayTimezone string,
) ([]studentReservationSlot, error) {
	scheduleDocument, err := parseTeacherScheduleDocument(storedContext.scheduleBody)
	if err != nil {
		return nil, err
	}

	baseSlots, displayTimezone, err := expandTeacherScheduleSlotsForDisplayDate(
		scheduleDocument,
		selectedDate,
		displayTimezone,
	)
	if err != nil {
		return nil, err
	}
	if len(baseSlots) == 0 {
		return []studentReservationSlot{}, nil
	}

	displayStartUTC, displayEndUTC, err := resolveDisplayDateRangeUTC(
		selectedDate,
		displayTimezone,
	)
	if err != nil {
		return nil, err
	}

	storedReservations, err := s.loadTeacherReservationsForRange(
		ctx,
		storedContext.primaryTeacherID,
		selectedDate,
		displayStartUTC,
		displayEndUTC,
	)
	if err != nil {
		return nil, err
	}

	reservationsByKey := make(map[string]storedTeacherReservation, len(storedReservations))
	for _, reservation := range storedReservations {
		key := buildReservationUTCKey(reservation.startsAtUTC)
		if reservation.startsAtUTC.IsZero() {
			key = buildReservationSlotKey(reservation.startTime)
		}
		reservationsByKey[key] = reservation
	}

	result := make([]studentReservationSlot, 0, len(baseSlots))
	for _, slot := range baseSlots {
		nextSlot := studentReservationSlot{
			StartTime:   slot.startTime,
			StartsAtUTC: formatUTCText(slot.startUTC),
			Status:      "available",
		}
		matchKey := buildReservationUTCKey(slot.startUTC)
		if reservation, ok := reservationsByKey[matchKey]; ok {
			if reservation.studentID == storedContext.studentID {
				nextSlot.Status = "booked"
				nextSlot.ReservationID = reservation.reservationID
			} else {
				nextSlot.Status = "taken"
			}
		} else if reservation, ok := reservationsByKey[buildReservationSlotKey(slot.startTime)]; ok {
			if reservation.studentID == storedContext.studentID {
				nextSlot.Status = "booked"
				nextSlot.ReservationID = reservation.reservationID
			} else {
				nextSlot.Status = "taken"
			}
		}
		result = append(result, nextSlot)
	}

	return result, nil
}

func (s *oracleReservationService) loadTeacherReservationsForRange(
	ctx context.Context,
	teacherID int64,
	selectedDate time.Time,
	rangeStartUTC time.Time,
	rangeEndUTC time.Time,
) ([]storedTeacherReservation, error) {
	query := `
SELECT RESERVATION_CODE,
       STARTS_AT_UTC,
       TO_CHAR(RESERVATION_AT, 'HH24:MI'),
       STATUS_CODE,
       STUDENT_ID
  FROM MAIMEI_LESSON_RESERVATIONS
 WHERE TEACHER_ID = :1
   AND STARTS_AT_UTC >= :2
   AND STARTS_AT_UTC < :3
   AND STATUS_CODE IN ('PENDING', 'CONFIRMED')`

	rows, err := s.db.QueryContext(ctx, query, teacherID, rangeStartUTC.UTC(), rangeEndUTC.UTC())
	if err != nil {
		if isOracleInvalidIdentifierError(err) {
			return s.loadTeacherReservationsForLegacyDate(ctx, teacherID, selectedDate)
		}
		return nil, fmt.Errorf("We could not load reservation data right now. Please try again.")
	}
	defer rows.Close()

	result := make([]storedTeacherReservation, 0, 8)
	for rows.Next() {
		var reservation storedTeacherReservation
		if err := rows.Scan(
			&reservation.reservationID,
			&reservation.startsAtUTC,
			&reservation.startTime,
			&reservation.statusCode,
			&reservation.studentID,
		); err != nil {
			return nil, fmt.Errorf("We could not load reservation data right now. Please try again.")
		}
		result = append(result, reservation)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("We could not load reservation data right now. Please try again.")
	}

	return result, nil
}

func (s *oracleReservationService) loadTeacherReservationsForLegacyDate(
	ctx context.Context,
	teacherID int64,
	selectedDate time.Time,
) ([]storedTeacherReservation, error) {
	query := `
SELECT RESERVATION_CODE,
       TO_CHAR(RESERVATION_AT, 'HH24:MI'),
       STATUS_CODE,
       STUDENT_ID
  FROM MAIMEI_LESSON_RESERVATIONS
 WHERE TEACHER_ID = :1
   AND RESERVATION_AT >= :2
   AND RESERVATION_AT < :3
   AND STATUS_CODE IN ('PENDING', 'CONFIRMED')`

	rows, err := s.db.QueryContext(
		ctx,
		query,
		teacherID,
		selectedDate,
		selectedDate.Add(24*time.Hour),
	)
	if err != nil {
		return nil, fmt.Errorf("We could not load reservation data right now. Please try again.")
	}
	defer rows.Close()

	result := make([]storedTeacherReservation, 0, 8)
	for rows.Next() {
		var reservation storedTeacherReservation
		if err := rows.Scan(
			&reservation.reservationID,
			&reservation.startTime,
			&reservation.statusCode,
			&reservation.studentID,
		); err != nil {
			return nil, fmt.Errorf("We could not load reservation data right now. Please try again.")
		}
		result = append(result, reservation)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("We could not load reservation data right now. Please try again.")
	}

	return result, nil
}

func resolveRequestedReservationUTC(
	input studentReservationCreateInput,
	availableSlots []studentReservationSlot,
) (time.Time, error) {
	trimmedStartsAtUTC := strings.TrimSpace(input.StartsAtUTC)
	if trimmedStartsAtUTC == "" {
		return time.Time{}, fmt.Errorf("Please choose a valid time slot.")
	}

	startValue, err := parseUTCText(trimmedStartsAtUTC)
	if err != nil {
		return time.Time{}, fmt.Errorf("Please choose a valid time slot.")
	}

	for _, slot := range availableSlots {
		if slot.StartsAtUTC == trimmedStartsAtUTC {
			return startValue, nil
		}
	}

	return time.Time{}, fmt.Errorf("Please choose a valid time slot.")
}

func parseReservationDate(value string) (time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return time.Time{}, fmt.Errorf("Please choose a reservation date.")
	}

	parsedValue, err := time.Parse("2006-01-02", trimmed)
	if err != nil {
		return time.Time{}, fmt.Errorf("Please choose a valid reservation date.")
	}

	return parsedValue, nil
}

func normalizeReservationTimezone(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "Asia/Seoul"
	}
	return trimmed
}

func loadReservationLocation(timezone string) (*time.Location, error) {
	location, err := time.LoadLocation(normalizeReservationTimezone(timezone))
	if err != nil {
		return nil, fmt.Errorf("The selected timezone is not valid.")
	}
	return location, nil
}

func resolveDisplayDateRangeUTC(
	selectedDate time.Time,
	displayTimezone string,
) (time.Time, time.Time, error) {
	location, err := loadReservationLocation(displayTimezone)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	startLocal := time.Date(
		selectedDate.Year(),
		selectedDate.Month(),
		selectedDate.Day(),
		0,
		0,
		0,
		0,
		location,
	)
	return startLocal.UTC(), startLocal.Add(24 * time.Hour).UTC(), nil
}

func parseTeacherScheduleDocument(value string) (teacherScheduleDocument, error) {
	if strings.TrimSpace(value) == "" {
		return teacherScheduleDocument{}, nil
	}

	var document teacherScheduleDocument
	if err := json.Unmarshal([]byte(value), &document); err != nil {
		return teacherScheduleDocument{}, fmt.Errorf("The teacher schedule is not valid.")
	}

	if document.Weekly == nil {
		document.Weekly = map[string][]teacherScheduleSlot{}
	}

	return document, nil
}

func expandTeacherScheduleSlotsForDisplayDate(
	document teacherScheduleDocument,
	selectedDate time.Time,
	displayTimezone string,
) ([]scheduleTimeSlot, string, error) {
	teacherTimezone := normalizeReservationTimezone(document.Timezone)
	teacherLocation, err := loadReservationLocation(teacherTimezone)
	if err != nil {
		return nil, "", err
	}

	displayTimezone = normalizeReservationTimezone(displayTimezone)
	displayStartUTC, displayEndUTC, err := resolveDisplayDateRangeUTC(selectedDate, displayTimezone)
	if err != nil {
		return nil, "", err
	}

	candidateKeys := make(map[string]time.Time)
	startTeacherDate := displayStartUTC.In(teacherLocation)
	endTeacherDate := displayEndUTC.Add(-time.Second).In(teacherLocation)
	candidateKeys[startTeacherDate.Format("2006-01-02")] = time.Date(
		startTeacherDate.Year(),
		startTeacherDate.Month(),
		startTeacherDate.Day(),
		0, 0, 0, 0, teacherLocation,
	)
	candidateKeys[endTeacherDate.Format("2006-01-02")] = time.Date(
		endTeacherDate.Year(),
		endTeacherDate.Month(),
		endTeacherDate.Day(),
		0, 0, 0, 0, teacherLocation,
	)

	result := make([]scheduleTimeSlot, 0, 16)
	displayLocation, err := loadReservationLocation(displayTimezone)
	if err != nil {
		return nil, "", err
	}
	for _, teacherDate := range candidateKeys {
		sourceSlots := resolveTeacherScheduleSourceSlots(document, teacherDate)
		for _, slot := range sourceSlots {
			startMinutes, ok := parseClockTextToMinutes(slot.Start)
			if !ok {
				continue
			}
			endMinutes, ok := parseClockTextToMinutes(slot.End)
			if !ok || endMinutes <= startMinutes {
				continue
			}
			for cursor := startMinutes; cursor+60 <= endMinutes; cursor += 60 {
				startUTC := time.Date(
					teacherDate.Year(),
					teacherDate.Month(),
					teacherDate.Day(),
					cursor/60,
					cursor%60,
					0,
					0,
					teacherLocation,
				).UTC()
				if startUTC.Before(displayStartUTC) || !startUTC.Before(displayEndUTC) {
					continue
				}
				startDisplay := startUTC.In(displayLocation)
				result = append(result, scheduleTimeSlot{
					startTime: startDisplay.Format("15:04"),
					startUTC:  startUTC,
				})
			}
		}
	}

	return result, displayTimezone, nil
}

func expandTeacherScheduleSlots(
	document teacherScheduleDocument,
	selectedDate time.Time,
) []scheduleTimeSlot {
	sourceSlots := resolveTeacherScheduleSourceSlots(document, selectedDate)
	result := make([]scheduleTimeSlot, 0, len(sourceSlots)*2)
	for _, slot := range sourceSlots {
		startMinutes, ok := parseClockTextToMinutes(slot.Start)
		if !ok {
			continue
		}
		endMinutes, ok := parseClockTextToMinutes(slot.End)
		if !ok || endMinutes <= startMinutes {
			continue
		}
		for cursor := startMinutes; cursor+60 <= endMinutes; cursor += 60 {
			result = append(result, scheduleTimeSlot{
				startTime: formatMinutesAsClock(cursor),
			})
		}
	}

	return result
}

func resolveTeacherScheduleSourceSlots(
	document teacherScheduleDocument,
	selectedDate time.Time,
) []teacherScheduleSlot {
	selectedDateText := selectedDate.Format("2006-01-02")
	baseSlots := document.Weekly[reservationWeekdayKey(selectedDate)]

	for _, exception := range document.Exceptions {
		switch strings.TrimSpace(exception.Type) {
		case "period-block":
			startDateText := strings.TrimSpace(exception.StartDate)
			endDateText := strings.TrimSpace(exception.EndDate)
			if startDateText == "" || endDateText == "" {
				continue
			}
			if selectedDateText >= startDateText && selectedDateText <= endDateText {
				return []teacherScheduleSlot{}
			}
		case "time-block":
			if strings.TrimSpace(exception.Date) != selectedDateText {
				continue
			}
			baseSlots = subtractTeacherScheduleSlots(baseSlots, exception.Slots)
		case "custom-slots":
			if strings.TrimSpace(exception.Date) != selectedDateText {
				continue
			}
			baseSlots = subtractTeacherScheduleSlots(baseSlots, exception.Slots)
		default:
			if strings.TrimSpace(exception.Date) != selectedDateText {
				continue
			}
			if exception.Closed {
				return []teacherScheduleSlot{}
			}
			return exception.Slots
		}
	}

	return baseSlots
}

func subtractTeacherScheduleSlots(
	source []teacherScheduleSlot,
	blocked []teacherScheduleSlot,
) []teacherScheduleSlot {
	if len(source) == 0 || len(blocked) == 0 {
		return source
	}

	result := make([]teacherScheduleSlot, 0, len(source))
	for _, sourceSlot := range source {
		sourceStart, ok := parseClockTextToMinutes(sourceSlot.Start)
		if !ok {
			continue
		}
		sourceEnd, ok := parseClockTextToMinutes(sourceSlot.End)
		if !ok || sourceEnd <= sourceStart {
			continue
		}

		segments := [][2]int{{sourceStart, sourceEnd}}
		for _, blockedSlot := range blocked {
			blockStart, ok := parseClockTextToMinutes(blockedSlot.Start)
			if !ok {
				continue
			}
			blockEnd, ok := parseClockTextToMinutes(blockedSlot.End)
			if !ok || blockEnd <= blockStart {
				continue
			}

			nextSegments := make([][2]int, 0, len(segments)+1)
			for _, segment := range segments {
				if blockEnd <= segment[0] || blockStart >= segment[1] {
					nextSegments = append(nextSegments, segment)
					continue
				}
				if blockStart > segment[0] {
					nextSegments = append(nextSegments, [2]int{segment[0], blockStart})
				}
				if blockEnd < segment[1] {
					nextSegments = append(nextSegments, [2]int{blockEnd, segment[1]})
				}
			}
			segments = nextSegments
			if len(segments) == 0 {
				break
			}
		}

		for _, segment := range segments {
			if segment[1] <= segment[0] {
				continue
			}
			result = append(result, teacherScheduleSlot{
				Start: formatMinutesAsClock(segment[0]),
				End:   formatMinutesAsClock(segment[1]),
			})
		}
	}

	return result
}

func reservationWeekdayKey(selectedDate time.Time) string {
	switch selectedDate.Weekday() {
	case time.Monday:
		return "mon"
	case time.Tuesday:
		return "tue"
	case time.Wednesday:
		return "wed"
	case time.Thursday:
		return "thu"
	case time.Friday:
		return "fri"
	case time.Saturday:
		return "sat"
	default:
		return "sun"
	}
}

func parseClockTextToMinutes(value string) (int, bool) {
	if !isValidClockText(value) {
		return 0, false
	}

	hourValue := int(value[0]-'0')*10 + int(value[1]-'0')
	minuteValue := int(value[3]-'0')*10 + int(value[4]-'0')
	return hourValue*60 + minuteValue, true
}

func isValidClockText(value string) bool {
	if len(value) != 5 || value[2] != ':' {
		return false
	}
	if value[0] < '0' || value[0] > '9' || value[1] < '0' || value[1] > '9' {
		return false
	}
	if value[3] < '0' || value[3] > '9' || value[4] < '0' || value[4] > '9' {
		return false
	}
	hourValue := int(value[0]-'0')*10 + int(value[1]-'0')
	minuteValue := int(value[3]-'0')*10 + int(value[4]-'0')
	return hourValue >= 0 && hourValue <= 23 && minuteValue >= 0 && minuteValue <= 59
}

func formatMinutesAsClock(value int) string {
	hourValue := value / 60
	minuteValue := value % 60
	return fmt.Sprintf("%02d:%02d", hourValue, minuteValue)
}

func parseUTCText(value string) (time.Time, error) {
	return time.Parse("2006-01-02T15:04:05Z", strings.TrimSpace(value))
}

func formatUTCText(value time.Time) string {
	return value.UTC().Format("2006-01-02T15:04:05Z")
}

func nullIfBlank(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return trimmed
}

func isOracleInvalidIdentifierError(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(strings.ToUpper(err.Error()), "ORA-00904")
}

func buildReservationSlotKey(startTime string) string {
	return startTime
}

func buildReservationUTCKey(startUTC time.Time) string {
	return formatUTCText(startUTC)
}

func normalizeReservationStatusCode(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "CONFIRMED":
		return "confirmed"
	case "CANCELED":
		return "canceled"
	default:
		return "pending"
	}
}
