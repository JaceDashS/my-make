package main

import (
	"fmt"
	"net/http"
	"strings"
)

type apiErrorDetails struct {
	Action    string `json:"action,omitempty"`
	Cause     string `json:"cause"`
	Code      string `json:"code"`
	Detail    string `json:"detail,omitempty"`
	Retryable bool   `json:"retryable"`
	Status    int    `json:"status"`
	Title     string `json:"title"`
}

type apiErrorResponse struct {
	Details apiErrorDetails `json:"details"`
	Error   string          `json:"error"`
	Message string          `json:"message"`
	Status  string          `json:"status"`
}

func writeAPIError(w http.ResponseWriter, status int, operation, raw string) {
	details := describeAPIError(status, operation, raw)
	writeJSON(w, status, apiErrorResponse{
		Status:  "error",
		Message: details.Title,
		Error:   raw,
		Details: details,
	})
}

func writeMethodNotAllowedError(w http.ResponseWriter, method string) {
	writeAPIError(
		w,
		http.StatusMethodNotAllowed,
		"request",
		fmt.Sprintf("Method %s is not allowed for this endpoint.", method),
	)
}

func describeAPIError(status int, operation, raw string) apiErrorDetails {
	lowerRaw := strings.ToLower(strings.TrimSpace(raw))
	lowerOperation := strings.ToLower(strings.TrimSpace(operation))

	details := apiErrorDetails{
		Action:    defaultActionForOperation(lowerOperation),
		Cause:     raw,
		Code:      "server/error",
		Retryable: status >= http.StatusInternalServerError || status == http.StatusServiceUnavailable,
		Status:    status,
		Title:     defaultTitleForOperation(lowerOperation, status),
	}

	switch {
	case strings.Contains(lowerRaw, "not allowed for this endpoint"):
		details.Code = "request/method-not-allowed"
		details.Title = "This endpoint does not accept the current HTTP method."
		details.Detail = "The client called the endpoint with a method that the server does not handle."
		details.Action = "Call the endpoint again with the documented HTTP method."
		details.Retryable = false
	case strings.HasPrefix(lowerRaw, "decode request body:"):
		details.Code = "request/invalid-json"
		details.Title = "The request body could not be parsed."
		details.Detail = raw
		details.Action = "Check the JSON field names and value types, then send the request again."
		details.Retryable = false
	case strings.Contains(lowerRaw, "is not configured"):
		details.Code = "server/not-configured"
		details.Title = "A required server dependency is not configured."
		details.Detail = "The endpoint is available, but its backing service was not initialized."
		details.Action = "Verify the server environment and database settings before retrying."
		details.Retryable = false
	case lowerRaw == "please enter your login id and password.":
		details.Code = "account/login/missing-credentials"
		details.Title = "Login ID and password are required."
		details.Detail = "The login request reached the server without both required fields."
		details.Action = "Fill in both fields and submit the login form again."
		details.Retryable = false
	case lowerRaw == "the login id or password is incorrect.":
		details.Code = "account/login/invalid-credentials"
		details.Title = "The login credentials do not match an account."
		details.Detail = "The login ID was not found, or the password hash comparison failed."
		details.Action = "Check the login ID and password, then try again."
		details.Retryable = false
	case lowerRaw == "your account is waiting for approval.":
		details.Code = "account/login/pending-approval"
		details.Title = "The account exists but is still pending approval."
		details.Detail = "Pending accounts cannot sign in until an authorized approver activates them."
		details.Action = "Wait for approval or contact the academy administrator."
		details.Retryable = false
	case lowerRaw == "your account is currently on hold.":
		details.Code = "account/login/on-hold"
		details.Title = "The account is on hold."
		details.Detail = "Held accounts are blocked from authenticating."
		details.Action = "Contact the administrator to review the account status."
		details.Retryable = false
	case lowerRaw == "your account is inactive.":
		details.Code = "account/login/inactive"
		details.Title = "The account is inactive."
		details.Detail = "Inactive accounts cannot sign in until they are reactivated."
		details.Action = "Contact the administrator to reactivate the account."
		details.Retryable = false
	case lowerRaw == "your academy is currently inactive.":
		details.Code = "account/login/academy-inactive"
		details.Title = "The academy linked to this account is inactive."
		details.Detail = "Academy status is checked after the account itself passes authentication."
		details.Action = "Reactivate the academy before attempting another sign-in."
		details.Retryable = false
	case lowerRaw == "that login id is already in use. please choose another one.":
		details.Code = "account/register/duplicate-login-id"
		details.Title = "The login ID is already in use."
		details.Detail = "The database unique constraint rejected the requested login ID."
		details.Action = "Choose another login ID and submit the form again."
		details.Retryable = false
	case lowerRaw == "this academy already has a root account.":
		details.Code = "account/root-register/root-exists"
		details.Title = "A root account already exists for this academy."
		details.Detail = "The academy-level root account constraint blocked the registration."
		details.Action = "Use the existing root account or register a member account instead."
		details.Retryable = false
	case lowerRaw == "this license has already been assigned to an academy.":
		details.Code = "license/assigned"
		details.Title = "The license is already assigned."
		details.Detail = "The selected license code is linked to another academy."
		details.Action = "Provide an unassigned license code and try again."
		details.Retryable = false
	case lowerRaw == "this license is not available for registration.":
		details.Code = "license/unavailable"
		details.Title = "The license cannot be used for registration."
		details.Detail = "Its status is not UNASSIGNED."
		details.Action = "Use a valid unassigned license code."
		details.Retryable = false
	case lowerRaw == "this license has expired.":
		details.Code = "license/expired"
		details.Title = "The license has expired."
		details.Detail = "Expired licenses are blocked during root registration."
		details.Action = "Renew the license or use another active code."
		details.Retryable = false
	case lowerRaw == "that license code could not be found.":
		details.Code = "license/not-found"
		details.Title = "The license code was not found."
		details.Detail = "The database lookup returned no matching row."
		details.Action = "Check the code for typos and try again."
		details.Retryable = false
	case lowerRaw == "this license can only be renewed before it expires.":
		details.Code = "license/renew/expired"
		details.Title = "The license can no longer be renewed."
		details.Detail = "Renewal is restricted to licenses that have not yet expired."
		details.Action = "Use a valid active license code or issue a new license."
		details.Retryable = false
	case strings.HasPrefix(lowerRaw, "please enter "):
		details.Code = "request/validation-missing-field"
		details.Title = "A required field is missing."
		details.Detail = raw
		details.Action = "Fill in every required field and try again."
		details.Retryable = false
	case strings.HasPrefix(lowerRaw, "please choose "):
		details.Code = "request/validation-invalid-choice"
		details.Title = "A required selection is missing or invalid."
		details.Detail = raw
		details.Action = "Choose a valid option and send the request again."
		details.Retryable = false
	case lowerRaw == "only root or admin accounts can manage pending members.":
		details.Code = "members/forbidden-role"
		details.Title = "The current role cannot manage pending members."
		details.Detail = "Only ROOT and ADMIN accounts pass the moderation access check."
		details.Action = "Sign in with a ROOT or ADMIN account."
		details.Retryable = false
	case lowerRaw == "that pending member could not be found.":
		details.Code = "members/pending/not-found"
		details.Title = "The pending member could not be found."
		details.Detail = "The approval update did not affect any pending member row."
		details.Action = "Refresh the pending member list and try again."
		details.Retryable = false
	case strings.HasPrefix(lowerRaw, "no pending members matched"):
		details.Code = "members/pending/no-match"
		details.Title = "No pending members matched the search."
		details.Detail = raw
		details.Action = "Adjust the search value and try again."
		details.Retryable = false
	case lowerRaw == "no active session was found.":
		details.Code = "account/session/not-found"
		details.Title = "No active session is available."
		details.Detail = "The session cookie was missing or the server did not recognize it."
		details.Action = "Sign in again to create a fresh session."
		details.Retryable = false
	case strings.Contains(lowerRaw, "couldn't") || strings.Contains(lowerRaw, "could not"):
		details.Code = lowerOperation + "/transient-failure"
		details.Title = defaultTitleForOperation(lowerOperation, status)
		details.Detail = raw
	case status == http.StatusUnauthorized:
		details.Code = lowerOperation + "/unauthorized"
		details.Title = "The request is not authorized."
		details.Detail = raw
		details.Action = "Authenticate again, then retry the request."
		details.Retryable = false
	case status == http.StatusBadRequest:
		details.Code = lowerOperation + "/bad-request"
		details.Title = "The server rejected the request."
		details.Detail = raw
		details.Retryable = false
	case status == http.StatusServiceUnavailable:
		details.Code = lowerOperation + "/unavailable"
		details.Title = "The server dependency required by this request is unavailable."
		details.Detail = raw
	case status >= http.StatusInternalServerError:
		details.Code = lowerOperation + "/internal"
		details.Title = "The server failed while processing the request."
		details.Detail = raw
	}

	return details
}

func defaultTitleForOperation(operation string, status int) string {
	switch operation {
	case "login":
		return "Login could not be completed."
	case "session":
		return "The session request could not be completed."
	case "member-register":
		return "Member registration could not be completed."
	case "root-register":
		return "Root registration could not be completed."
	case "renew-license":
		return "License renewal could not be completed."
	case "search-pending-members":
		return "Pending member search could not be completed."
	case "approve-pending-member":
		return "Pending member approval could not be completed."
	case "health":
		return "Health check could not be completed."
	case "initialize-tables":
		return "Table initialization could not be completed."
	case "create-license":
		return "License creation could not be completed."
	default:
		if status == http.StatusMethodNotAllowed {
			return "The request method is not allowed."
		}

		return "The request could not be completed."
	}
}

func defaultActionForOperation(operation string) string {
	switch operation {
	case "login":
		return "Review the credentials and account state, then try signing in again."
	case "member-register", "root-register":
		return "Review the registration form and retry after correcting the failing field or dependency."
	case "renew-license":
		return "Check the license state and try the renewal again."
	case "search-pending-members", "approve-pending-member":
		return "Verify the academy code, actor role, and target member before retrying."
	case "health", "initialize-tables", "create-license":
		return "Verify the server and database dependencies, then run the action again."
	default:
		return "Review the failing request and try again after correcting the cause."
	}
}
