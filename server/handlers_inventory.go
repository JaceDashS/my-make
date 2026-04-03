package main

import "net/http"

func (a *app) handlePresetInventorySearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}

	if a.inventory == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "preset-inventory-search", "oracle inventory service is not configured")
		return
	}

	account, ok := a.readAuthenticatedAccount(w, r, "preset-inventory-search")
	if !ok {
		return
	}

	input, err := decodeJSONBody[presetInventorySearchInput](r)
	if err != nil {
		logServerRuntime("preset", "inventory-search:decode-error", map[string]any{
			"error":   err.Error(),
			"loginId": account.LoginID,
		})
		writeAPIError(w, http.StatusBadRequest, "preset-inventory-search", err.Error())
		return
	}

	logServerRuntime("preset", "inventory-search:start", map[string]any{
		"academyCode": account.AcademyCode,
		"category":    normalizePresetInventoryCategory(input.Category),
		"loginId":     account.LoginID,
		"query":       input.Query,
		"roleCode":    account.RoleCode,
	})

	result, err := a.inventory.SearchPresetInventory(r.Context(), account, input)
	if err != nil {
		logServerRuntime("preset", "inventory-search:error", map[string]any{
			"academyCode": account.AcademyCode,
			"category":    normalizePresetInventoryCategory(input.Category),
			"error":       err.Error(),
			"loginId":     account.LoginID,
			"query":       input.Query,
			"roleCode":    account.RoleCode,
		})
		writeAPIError(w, http.StatusBadRequest, "preset-inventory-search", err.Error())
		return
	}

	logServerRuntime("preset", "inventory-search:success", map[string]any{
		"academyCode": account.AcademyCode,
		"category":    normalizePresetInventoryCategory(input.Category),
		"count":       len(result.Items),
		"loginId":     account.LoginID,
		"query":       input.Query,
		"roleCode":    account.RoleCode,
	})

	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleAcademyInventoryList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowedError(w, r.Method)
		return
	}
	if a.inventory == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "academy-inventory-list", "oracle inventory service is not configured")
		return
	}
	account, ok := a.readAuthenticatedAccount(w, r, "academy-inventory-list")
	if !ok {
		return
	}

	logServerRuntime("inventory", "list:start", map[string]any{
		"academyCode": account.AcademyCode,
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
	})
	result, err := a.inventory.ListAcademyInventory(r.Context(), account)
	if err != nil {
		logServerRuntime("inventory", "list:error", map[string]any{
			"academyCode": account.AcademyCode,
			"error":       err.Error(),
			"loginId":     account.LoginID,
			"roleCode":    account.RoleCode,
		})
		writeAPIError(w, http.StatusBadRequest, "academy-inventory-list", err.Error())
		return
	}
	logServerRuntime("inventory", "list:success", map[string]any{
		"academyCode": account.AcademyCode,
		"count":       len(result.Items),
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
	})
	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleAcademyInventoryCreate(w http.ResponseWriter, r *http.Request) {
	a.handleAcademyInventoryMutation(w, r, "academy-inventory-create")
}

func (a *app) handleAcademyInventoryUpdate(w http.ResponseWriter, r *http.Request) {
	a.handleAcademyInventoryMutation(w, r, "academy-inventory-update")
}

func (a *app) handleAcademyInventoryDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}
	if a.inventory == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "academy-inventory-delete", "oracle inventory service is not configured")
		return
	}
	account, ok := a.readAuthenticatedAccount(w, r, "academy-inventory-delete")
	if !ok {
		return
	}
	input, err := decodeJSONBody[academyInventoryDeleteInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "academy-inventory-delete", err.Error())
		return
	}
	logServerRuntime("inventory", "delete:start", map[string]any{
		"academyCode": account.AcademyCode,
		"itemCode":    input.ItemCode,
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
	})
	result, err := a.inventory.DeleteAcademyInventory(r.Context(), account, input)
	if err != nil {
		logServerRuntime("inventory", "delete:error", map[string]any{
			"academyCode": account.AcademyCode,
			"error":       err.Error(),
			"itemCode":    input.ItemCode,
			"loginId":     account.LoginID,
			"roleCode":    account.RoleCode,
		})
		writeAPIError(w, http.StatusBadRequest, "academy-inventory-delete", err.Error())
		return
	}
	logServerRuntime("inventory", "delete:success", map[string]any{
		"academyCode": account.AcademyCode,
		"itemCode":    result.ItemCode,
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
	})
	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleAcademyInventorySell(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}
	if a.inventory == nil {
		writeAPIError(w, http.StatusServiceUnavailable, "academy-inventory-sell", "oracle inventory service is not configured")
		return
	}
	account, ok := a.readAuthenticatedAccount(w, r, "academy-inventory-sell")
	if !ok {
		return
	}
	input, err := decodeJSONBody[academyInventorySellInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, "academy-inventory-sell", err.Error())
		return
	}
	logServerRuntime("inventory", "sell:start", map[string]any{
		"academyCode": account.AcademyCode,
		"itemCode":    input.ItemCode,
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
	})
	result, err := a.inventory.SellAcademyInventory(r.Context(), account, input)
	if err != nil {
		logServerRuntime("inventory", "sell:error", map[string]any{
			"academyCode": account.AcademyCode,
			"error":       err.Error(),
			"itemCode":    input.ItemCode,
			"loginId":     account.LoginID,
			"roleCode":    account.RoleCode,
		})
		writeAPIError(w, http.StatusBadRequest, "academy-inventory-sell", err.Error())
		return
	}
	logServerRuntime("inventory", "sell:success", map[string]any{
		"academyCode": account.AcademyCode,
		"itemCode":    result.ItemCode,
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
	})
	writeJSON(w, http.StatusOK, result)
}

func (a *app) handleAcademyInventoryMutation(w http.ResponseWriter, r *http.Request, operation string) {
	if r.Method != http.MethodPost {
		writeMethodNotAllowedError(w, r.Method)
		return
	}
	if a.inventory == nil {
		writeAPIError(w, http.StatusServiceUnavailable, operation, "oracle inventory service is not configured")
		return
	}
	account, ok := a.readAuthenticatedAccount(w, r, operation)
	if !ok {
		return
	}
	input, err := decodeJSONBody[academyInventoryUpsertInput](r)
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, operation, err.Error())
		return
	}

	eventPrefix := "create"
	invoke := a.inventory.CreateAcademyInventory
	if operation == "academy-inventory-update" {
		eventPrefix = "update"
		invoke = a.inventory.UpdateAcademyInventory
	}

	logServerRuntime("inventory", eventPrefix+":start", map[string]any{
		"academyCode": account.AcademyCode,
		"itemCode":    input.ItemCode,
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
		"sku":         input.SKU,
	})
	result, err := invoke(r.Context(), account, input)
	if err != nil {
		logServerRuntime("inventory", eventPrefix+":error", map[string]any{
			"academyCode": account.AcademyCode,
			"error":       err.Error(),
			"itemCode":    input.ItemCode,
			"loginId":     account.LoginID,
			"roleCode":    account.RoleCode,
			"sku":         input.SKU,
		})
		writeAPIError(w, http.StatusBadRequest, operation, err.Error())
		return
	}
	logServerRuntime("inventory", eventPrefix+":success", map[string]any{
		"academyCode": account.AcademyCode,
		"itemCode":    result.ItemCode,
		"loginId":     account.LoginID,
		"roleCode":    account.RoleCode,
		"sku":         input.SKU,
	})
	writeJSON(w, http.StatusOK, result)
}
