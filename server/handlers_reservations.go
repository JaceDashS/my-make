package main

import "net/http"

func (a *app) handleStudentReservationAvailability(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.reservations == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "student-reservation-availability", "oracle reservation service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "student-reservation-availability")
	if !ok {
		return
	}

	input, err := decodeJSONBody[studentReservationAvailabilityInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "student-reservation-availability", err.Error())
		return
	}

	result, err := a.reservations.GetStudentAvailability(r.Context(), account, input)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "student-reservation-availability", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleStudentReservationList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.reservations == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "student-reservation-list", "oracle reservation service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "student-reservation-list")
	if !ok {
		return
	}

	result, err := a.reservations.ListStudentReservations(r.Context(), account, studentReservationListInput{
		StudentLoginID: r.URL.Query().Get("studentLoginId"),
	})
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "student-reservation-list", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleStudentReservationCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.reservations == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "student-reservation-create", "oracle reservation service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "student-reservation-create")
	if !ok {
		return
	}

	input, err := decodeJSONBody[studentReservationCreateInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "student-reservation-create", err.Error())
		return
	}

	result, err := a.reservations.CreateStudentReservation(r.Context(), account, input)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "student-reservation-create", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleStudentReservationCancel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.reservations == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "student-reservation-cancel", "oracle reservation service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "student-reservation-cancel")
	if !ok {
		return
	}

	input, err := decodeJSONBody[studentReservationCancelInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "student-reservation-cancel", err.Error())
		return
	}

	result, err := a.reservations.CancelStudentReservation(r.Context(), account, input)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "student-reservation-cancel", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleTeacherReservationList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.reservations == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "teacher-reservation-list", "oracle reservation service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "teacher-reservation-list")
	if !ok {
		return
	}

	result, err := a.reservations.ListTeacherReservations(r.Context(), account, teacherReservationListInput{
		TeacherLoginID: r.URL.Query().Get("teacherLoginId"),
	})
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "teacher-reservation-list", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleTeacherReservationApprove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.reservations == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "teacher-reservation-approve", "oracle reservation service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "teacher-reservation-approve")
	if !ok {
		return
	}

	input, err := decodeJSONBody[teacherReservationMutationInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "teacher-reservation-approve", err.Error())
		return
	}

	result, err := a.reservations.ApproveTeacherReservation(r.Context(), account, input)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "teacher-reservation-approve", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleTeacherReservationCancel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.reservations == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "teacher-reservation-cancel", "oracle reservation service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "teacher-reservation-cancel")
	if !ok {
		return
	}

	input, err := decodeJSONBody[teacherReservationMutationInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "teacher-reservation-cancel", err.Error())
		return
	}

	result, err := a.reservations.CancelTeacherReservation(r.Context(), account, input)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "teacher-reservation-cancel", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (a *app) readAuthenticatedAccount(
	w http.ResponseWriter,
	r *http.Request,
	operation string,
) (accountResponse, bool) {
	token, ok := readSessionCookie(r)
	if !ok {
		writeAPIError(w, http.StatusUnauthorized, operation, "No active session was found.")
		return accountResponse{}, false
	}

	account, ok := a.ensureSessionManager().Get(token)
	if !ok {
		clearSessionCookie(w)
		writeAPIError(w, http.StatusUnauthorized, operation, "No active session was found.")
		return accountResponse{}, false
	}

	return account, true
}
