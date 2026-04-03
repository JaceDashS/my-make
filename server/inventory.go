package main

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
)

type inventoryService interface {
	SearchPresetInventory(ctx context.Context, actor accountResponse, input presetInventorySearchInput) (presetInventorySearchResponse, error)
	ListAcademyInventory(ctx context.Context, actor accountResponse) (academyInventoryListResponse, error)
	CreateAcademyInventory(ctx context.Context, actor accountResponse, input academyInventoryUpsertInput) (inventoryMutationResponse, error)
	UpdateAcademyInventory(ctx context.Context, actor accountResponse, input academyInventoryUpsertInput) (inventoryMutationResponse, error)
	DeleteAcademyInventory(ctx context.Context, actor accountResponse, input academyInventoryDeleteInput) (inventoryMutationResponse, error)
	SellAcademyInventory(ctx context.Context, actor accountResponse, input academyInventorySellInput) (inventoryMutationResponse, error)
}

type oracleInventoryService struct {
	db *sql.DB
}

type presetInventorySearchInput struct {
	Category string `json:"category"`
	Query    string `json:"query"`
}

type presetInventoryItem struct {
	SKU      string  `json:"sku"`
	ItemName string  `json:"itemName"`
	ImageURL string  `json:"imageUrl,omitempty"`
	Category string  `json:"category"`
	LValue   float64 `json:"lValue"`
	CValue   float64 `json:"cValue"`
	HValue   float64 `json:"hValue"`
	Cost     int64   `json:"cost"`
	Price    int64   `json:"price"`
}

type presetInventorySearchResponse struct {
	Status  string                `json:"status"`
	Message string                `json:"message"`
	Items   []presetInventoryItem `json:"items"`
}

type academyInventoryItem struct {
	ID           string  `json:"id"`
	ItemCode     string  `json:"itemCode"`
	SKU          string  `json:"sku"`
	Barcode      string  `json:"barcode"`
	ItemName     string  `json:"itemName"`
	CategoryCode string  `json:"categoryCode"`
	Cost         float64 `json:"cost"`
	Price        float64 `json:"price"`
	LValue       float64 `json:"lValue"`
	CValue       float64 `json:"cValue"`
	HValue       float64 `json:"hValue"`
	ImageURL     string  `json:"imageUrl"`
	StockCount   int64   `json:"stockCount"`
	ReorderLevel int64   `json:"reorderLevel"`
	Supplier     string  `json:"supplier"`
	Location     string  `json:"location"`
	Note         string  `json:"note"`
	StatusCode   string  `json:"statusCode"`
}

type academyInventoryListResponse struct {
	Status  string                 `json:"status"`
	Message string                 `json:"message"`
	Items   []academyInventoryItem `json:"items"`
}

type academyInventoryUpsertInput struct {
	ItemCode     string `json:"itemCode"`
	SKU          string `json:"sku"`
	Barcode      string `json:"barcode"`
	ItemName     string `json:"itemName"`
	CategoryCode string `json:"categoryCode"`
	Cost         string `json:"cost"`
	Price        string `json:"price"`
	LValue       string `json:"lValue"`
	CValue       string `json:"cValue"`
	HValue       string `json:"hValue"`
	ImageURL     string `json:"imageUrl"`
	StockCount   string `json:"stockCount"`
	ReorderLevel string `json:"reorderLevel"`
	Supplier     string `json:"supplier"`
	Location     string `json:"location"`
	Note         string `json:"note"`
	StatusCode   string `json:"statusCode"`
}

type academyInventoryDeleteInput struct {
	ItemCode string `json:"itemCode"`
}

type academyInventorySellInput struct {
	ItemCode string `json:"itemCode"`
}

type inventoryMutationResponse struct {
	Status   string `json:"status"`
	Message  string `json:"message"`
	ItemCode string `json:"itemCode,omitempty"`
}

type validatedInventoryUpsertInput struct {
	itemCode     string
	sku          string
	barcode      string
	itemName     string
	categoryCode string
	cost         float64
	price        float64
	lValue       float64
	cValue       float64
	hValue       float64
	imageURL     string
	stockCount   int64
	reorderLevel int64
	supplier     string
	location     string
	note         string
	statusCode   string
}

func newInventoryServiceFromEnv() (*oracleInventoryService, error) {
	cfg, err := loadOracleConfigFromEnv()
	if err != nil {
		return nil, err
	}

	db, err := openOracleDB(cfg)
	if err != nil {
		return nil, err
	}

	return &oracleInventoryService{db: db}, nil
}

func (s *oracleInventoryService) SearchPresetInventory(
	ctx context.Context,
	actor accountResponse,
	input presetInventorySearchInput,
) (presetInventorySearchResponse, error) {
	loginID := strings.TrimSpace(actor.LoginID)
	academyCode := strings.TrimSpace(actor.AcademyCode)
	if loginID == "" {
		return presetInventorySearchResponse{}, fmt.Errorf("No active session was found.")
	}
	if academyCode == "" {
		return presetInventorySearchResponse{}, fmt.Errorf("Your academy is unavailable right now.")
	}

	category := normalizePresetInventoryCategory(input.Category)
	queryText := strings.ToLower(strings.TrimSpace(input.Query))

	args := []any{academyCode}
	conditions := []string{
		"ACADEMY_CODE = :1",
		"STATUS_CODE = 'ACTIVE'",
		"DELETED_AT IS NULL",
	}
	nextArg := 2

	if category != "" {
		conditions = append(conditions, fmt.Sprintf("CATEGORY_CODE = :%d", nextArg))
		args = append(args, category)
		nextArg++
	}

	if queryText != "" {
		conditions = append(
			conditions,
			fmt.Sprintf("(LOWER(SKU) LIKE :%d OR LOWER(ITEM_NAME) LIKE :%d)", nextArg, nextArg),
		)
		args = append(args, "%"+queryText+"%")
		nextArg++
	}

	query := fmt.Sprintf(`
SELECT SKU,
       ITEM_NAME,
       IMAGE_URL,
       CATEGORY_CODE,
       COST,
       PRICE,
       L_VALUE,
       C_VALUE,
       H_VALUE
  FROM MAIMEI_INVENTORIES
 WHERE %s
 ORDER BY CATEGORY_CODE, ITEM_NAME, SKU
 FETCH FIRST 100 ROWS ONLY`, strings.Join(conditions, "\n   AND "))

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		logInventoryDBError("preset-search:query", err, map[string]any{
			"academyCode": academyCode,
			"category":    category,
			"loginId":     actor.LoginID,
			"query":       input.Query,
		})
		return presetInventorySearchResponse{}, fmt.Errorf("We could not load preset inventory right now. Please try again.")
	}
	defer rows.Close()

	items := make([]presetInventoryItem, 0, 32)
	for rows.Next() {
		var item presetInventoryItem
		var imageURL sql.NullString
		if err := rows.Scan(
			&item.SKU,
			&item.ItemName,
			&imageURL,
			&item.Category,
			&item.Cost,
			&item.Price,
			&item.LValue,
			&item.CValue,
			&item.HValue,
		); err != nil {
			logInventoryDBError("preset-search:scan", err, map[string]any{
				"academyCode": academyCode,
				"category":    category,
				"loginId":     actor.LoginID,
				"query":       input.Query,
			})
			return presetInventorySearchResponse{}, fmt.Errorf("We could not load preset inventory right now. Please try again.")
		}
		item.ImageURL = strings.TrimSpace(nullStringValue(imageURL))
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		logInventoryDBError("preset-search:rows", err, map[string]any{
			"academyCode": academyCode,
			"category":    category,
			"loginId":     actor.LoginID,
			"query":       input.Query,
		})
		return presetInventorySearchResponse{}, fmt.Errorf("We could not load preset inventory right now. Please try again.")
	}

	return presetInventorySearchResponse{
		Status:  "ok",
		Message: "Preset inventory loaded.",
		Items:   items,
	}, nil
}

func (s *oracleInventoryService) ListAcademyInventory(
	ctx context.Context,
	actor accountResponse,
) (academyInventoryListResponse, error) {
	academyCode, err := validateInventoryActor(actor)
	if err != nil {
		return academyInventoryListResponse{}, err
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT ITEM_CODE,
       SKU,
       BARCODE,
       ITEM_NAME,
       CATEGORY_CODE,
       COST,
       PRICE,
       L_VALUE,
       C_VALUE,
       H_VALUE,
       IMAGE_URL,
       STOCK_COUNT,
       REORDER_LEVEL,
       SUPPLIER,
       LOCATION,
       NOTE_BODY,
       STATUS_CODE
  FROM MAIMEI_INVENTORIES
 WHERE ACADEMY_CODE = :1
   AND DELETED_AT IS NULL
 ORDER BY ITEM_NAME, ITEM_CODE`, academyCode)
	if err != nil {
		logInventoryDBError("academy-list:query", err, map[string]any{
			"academyCode": academyCode,
			"loginId":     actor.LoginID,
			"roleCode":    actor.RoleCode,
		})
		return academyInventoryListResponse{}, fmt.Errorf("We could not load inventory right now. Please try again.")
	}
	defer rows.Close()

	items := make([]academyInventoryItem, 0, 32)
	for rows.Next() {
		var item academyInventoryItem
		var barcode sql.NullString
		var imageURL sql.NullString
		var supplier sql.NullString
		var location sql.NullString
		var note sql.NullString
		if err := rows.Scan(
			&item.ItemCode,
			&item.SKU,
			&barcode,
			&item.ItemName,
			&item.CategoryCode,
			&item.Cost,
			&item.Price,
			&item.LValue,
			&item.CValue,
			&item.HValue,
			&imageURL,
			&item.StockCount,
			&item.ReorderLevel,
			&supplier,
			&location,
			&note,
			&item.StatusCode,
		); err != nil {
			logInventoryDBError("academy-list:scan", err, map[string]any{
				"academyCode": academyCode,
				"loginId":     actor.LoginID,
				"roleCode":    actor.RoleCode,
			})
			return academyInventoryListResponse{}, fmt.Errorf("We could not load inventory right now. Please try again.")
		}
		item.ID = item.ItemCode
		item.Barcode = nullStringValue(barcode)
		item.ImageURL = nullStringValue(imageURL)
		item.Supplier = nullStringValue(supplier)
		item.Location = nullStringValue(location)
		item.Note = nullStringValue(note)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		logInventoryDBError("academy-list:rows", err, map[string]any{
			"academyCode": academyCode,
			"loginId":     actor.LoginID,
			"roleCode":    actor.RoleCode,
		})
		return academyInventoryListResponse{}, fmt.Errorf("We could not load inventory right now. Please try again.")
	}

	return academyInventoryListResponse{
		Status:  "ok",
		Message: "Inventory loaded.",
		Items:   items,
	}, nil
}

func (s *oracleInventoryService) CreateAcademyInventory(
	ctx context.Context,
	actor accountResponse,
	input academyInventoryUpsertInput,
) (inventoryMutationResponse, error) {
	academyCode, err := validateInventoryActor(actor)
	if err != nil {
		return inventoryMutationResponse{}, err
	}
	validated, err := validateInventoryUpsertInput(input, false)
	if err != nil {
		return inventoryMutationResponse{}, err
	}

	if _, err := s.db.ExecContext(ctx, `
INSERT INTO MAIMEI_INVENTORIES (
    ITEM_CODE,
    ACADEMY_CODE,
    SKU,
    BARCODE,
    ITEM_NAME,
    CATEGORY_CODE,
    COST,
    PRICE,
    L_VALUE,
    C_VALUE,
    H_VALUE,
    IMAGE_URL,
    STOCK_COUNT,
    REORDER_LEVEL,
    SUPPLIER,
    LOCATION,
    NOTE_BODY,
    STATUS_CODE,
    CREATED_BY,
    UPDATED_BY
) VALUES (
    NULL,
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
    :13,
    :14,
    :15,
    :16,
    :17,
    :18,
    :18
)`,
		academyCode,
		validated.sku,
		nullIfEmpty(validated.barcode),
		validated.itemName,
		validated.categoryCode,
		validated.cost,
		validated.price,
		validated.lValue,
		validated.cValue,
		validated.hValue,
		nullIfEmpty(validated.imageURL),
		validated.stockCount,
		validated.reorderLevel,
		nullIfEmpty(validated.supplier),
		nullIfEmpty(validated.location),
		nullIfEmpty(validated.note),
		validated.statusCode,
		actor.LoginID,
	); err != nil {
		logInventoryDBError("academy-create:exec", err, map[string]any{
			"academyCode": academyCode,
			"itemName":    validated.itemName,
			"loginId":     actor.LoginID,
			"roleCode":    actor.RoleCode,
			"sku":         validated.sku,
		})
		return inventoryMutationResponse{}, fmt.Errorf("We could not save this inventory item right now. Please try again.")
	}

	return inventoryMutationResponse{
		Status:  "ok",
		Message: "Inventory item created.",
	}, nil
}

func (s *oracleInventoryService) UpdateAcademyInventory(
	ctx context.Context,
	actor accountResponse,
	input academyInventoryUpsertInput,
) (inventoryMutationResponse, error) {
	academyCode, err := validateInventoryActor(actor)
	if err != nil {
		return inventoryMutationResponse{}, err
	}
	validated, err := validateInventoryUpsertInput(input, true)
	if err != nil {
		return inventoryMutationResponse{}, err
	}

	result, err := s.db.ExecContext(ctx, `
UPDATE MAIMEI_INVENTORIES
   SET SKU = :1,
       BARCODE = :2,
       ITEM_NAME = :3,
       CATEGORY_CODE = :4,
       COST = :5,
       PRICE = :6,
       L_VALUE = :7,
       C_VALUE = :8,
       H_VALUE = :9,
       IMAGE_URL = :10,
       STOCK_COUNT = :11,
       REORDER_LEVEL = :12,
       SUPPLIER = :13,
       LOCATION = :14,
       NOTE_BODY = :15,
       STATUS_CODE = :16,
       UPDATED_BY = :17
 WHERE ACADEMY_CODE = :18
   AND ITEM_CODE = :19
   AND DELETED_AT IS NULL`,
		validated.sku,
		nullIfEmpty(validated.barcode),
		validated.itemName,
		validated.categoryCode,
		validated.cost,
		validated.price,
		validated.lValue,
		validated.cValue,
		validated.hValue,
		nullIfEmpty(validated.imageURL),
		validated.stockCount,
		validated.reorderLevel,
		nullIfEmpty(validated.supplier),
		nullIfEmpty(validated.location),
		nullIfEmpty(validated.note),
		validated.statusCode,
		actor.LoginID,
		academyCode,
		validated.itemCode,
	)
	if err != nil {
		logInventoryDBError("academy-update:exec", err, map[string]any{
			"academyCode": academyCode,
			"itemCode":    validated.itemCode,
			"itemName":    validated.itemName,
			"loginId":     actor.LoginID,
			"roleCode":    actor.RoleCode,
			"sku":         validated.sku,
		})
		return inventoryMutationResponse{}, fmt.Errorf("We could not save this inventory item right now. Please try again.")
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return inventoryMutationResponse{}, fmt.Errorf("That inventory item could not be found.")
	}

	return inventoryMutationResponse{
		Status:   "ok",
		Message:  "Inventory item updated.",
		ItemCode: validated.itemCode,
	}, nil
}

func (s *oracleInventoryService) DeleteAcademyInventory(
	ctx context.Context,
	actor accountResponse,
	input academyInventoryDeleteInput,
) (inventoryMutationResponse, error) {
	academyCode, err := validateInventoryActor(actor)
	if err != nil {
		return inventoryMutationResponse{}, err
	}
	itemCode := strings.TrimSpace(input.ItemCode)
	if itemCode == "" {
		return inventoryMutationResponse{}, fmt.Errorf("Please choose an inventory item.")
	}

	result, err := s.db.ExecContext(ctx, `
UPDATE MAIMEI_INVENTORIES
   SET DELETED_AT = SYSTIMESTAMP,
       STATUS_CODE = 'INACTIVE',
       UPDATED_BY = :1
 WHERE ACADEMY_CODE = :2
   AND ITEM_CODE = :3
   AND DELETED_AT IS NULL`,
		actor.LoginID,
		academyCode,
		itemCode,
	)
	if err != nil {
		logInventoryDBError("academy-delete:exec", err, map[string]any{
			"academyCode": academyCode,
			"itemCode":    itemCode,
			"loginId":     actor.LoginID,
			"roleCode":    actor.RoleCode,
		})
		return inventoryMutationResponse{}, fmt.Errorf("We could not delete this inventory item right now. Please try again.")
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return inventoryMutationResponse{}, fmt.Errorf("That inventory item could not be found.")
	}

	return inventoryMutationResponse{
		Status:   "ok",
		Message:  "Inventory item deleted.",
		ItemCode: itemCode,
	}, nil
}

func (s *oracleInventoryService) SellAcademyInventory(
	ctx context.Context,
	actor accountResponse,
	input academyInventorySellInput,
) (inventoryMutationResponse, error) {
	academyCode, err := validateInventoryActor(actor)
	if err != nil {
		return inventoryMutationResponse{}, err
	}
	itemCode := strings.TrimSpace(input.ItemCode)
	if itemCode == "" {
		return inventoryMutationResponse{}, fmt.Errorf("Please choose an inventory item.")
	}

	result, err := s.db.ExecContext(ctx, `
UPDATE MAIMEI_INVENTORIES
   SET STOCK_COUNT = STOCK_COUNT - 1,
       UPDATED_BY = :1
 WHERE ACADEMY_CODE = :2
   AND ITEM_CODE = :3
   AND DELETED_AT IS NULL
   AND STOCK_COUNT > 0`,
		actor.LoginID,
		academyCode,
		itemCode,
	)
	if err != nil {
		logInventoryDBError("academy-sell:exec", err, map[string]any{
			"academyCode": academyCode,
			"itemCode":    itemCode,
			"loginId":     actor.LoginID,
			"roleCode":    actor.RoleCode,
		})
		return inventoryMutationResponse{}, fmt.Errorf("We could not update inventory stock right now. Please try again.")
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return inventoryMutationResponse{}, fmt.Errorf("This item is out of stock or could not be found.")
	}

	return inventoryMutationResponse{
		Status:   "ok",
		Message:  "Inventory stock updated.",
		ItemCode: itemCode,
	}, nil
}

func validateInventoryActor(actor accountResponse) (string, error) {
	loginID := strings.TrimSpace(actor.LoginID)
	if loginID == "" {
		return "", fmt.Errorf("No active session was found.")
	}
	roleCode := strings.ToUpper(strings.TrimSpace(actor.RoleCode))
	if roleCode != "ROOT" && roleCode != "ADMIN" {
		return "", fmt.Errorf("Only root or admin accounts can manage inventory.")
	}
	if err := validateRestrictedActionActor(actor); err != nil {
		return "", err
	}
	academyCode := strings.TrimSpace(actor.AcademyCode)
	if academyCode == "" {
		return "", fmt.Errorf("Your academy is unavailable right now.")
	}
	return academyCode, nil
}

func validateInventoryUpsertInput(input academyInventoryUpsertInput, requireItemCode bool) (validatedInventoryUpsertInput, error) {
	validated := validatedInventoryUpsertInput{
		itemCode:     strings.TrimSpace(input.ItemCode),
		sku:          strings.TrimSpace(input.SKU),
		barcode:      strings.TrimSpace(input.Barcode),
		itemName:     strings.TrimSpace(input.ItemName),
		categoryCode: normalizePresetInventoryCategory(input.CategoryCode),
		imageURL:     strings.TrimSpace(input.ImageURL),
		supplier:     strings.TrimSpace(input.Supplier),
		location:     strings.TrimSpace(input.Location),
		note:         strings.TrimSpace(input.Note),
		statusCode:   normalizeInventoryStatusCode(input.StatusCode),
	}
	if requireItemCode && validated.itemCode == "" {
		return validatedInventoryUpsertInput{}, fmt.Errorf("Please choose an inventory item.")
	}
	if validated.itemName == "" {
		return validatedInventoryUpsertInput{}, fmt.Errorf("Please enter an item name.")
	}
	if validated.sku == "" {
		return validatedInventoryUpsertInput{}, fmt.Errorf("Please enter a SKU.")
	}
	if validated.categoryCode == "" {
		return validatedInventoryUpsertInput{}, fmt.Errorf("Please choose a valid inventory category.")
	}
	if validated.statusCode == "" {
		return validatedInventoryUpsertInput{}, fmt.Errorf("Please choose a valid status.")
	}

	var err error
	if validated.cost, err = parseInventoryFloat(input.Cost, "cost"); err != nil {
		return validatedInventoryUpsertInput{}, err
	}
	if validated.price, err = parseInventoryFloat(input.Price, "price"); err != nil {
		return validatedInventoryUpsertInput{}, err
	}
	if validated.lValue, err = parseInventoryFloat(input.LValue, "L value"); err != nil {
		return validatedInventoryUpsertInput{}, err
	}
	if validated.cValue, err = parseInventoryFloat(input.CValue, "C value"); err != nil {
		return validatedInventoryUpsertInput{}, err
	}
	if validated.hValue, err = parseInventoryFloat(input.HValue, "H value"); err != nil {
		return validatedInventoryUpsertInput{}, err
	}
	if validated.stockCount, err = parseInventoryInt(input.StockCount, "stock count"); err != nil {
		return validatedInventoryUpsertInput{}, err
	}
	if validated.reorderLevel, err = parseInventoryInt(input.ReorderLevel, "reorder level"); err != nil {
		return validatedInventoryUpsertInput{}, err
	}
	if validated.lValue < 0 || validated.lValue > 100 {
		return validatedInventoryUpsertInput{}, fmt.Errorf("Please enter an L value between 0 and 100.")
	}
	if validated.cValue < 0 {
		return validatedInventoryUpsertInput{}, fmt.Errorf("Please enter a valid C value.")
	}
	if validated.hValue < 0 || validated.hValue >= 360 {
		return validatedInventoryUpsertInput{}, fmt.Errorf("Please enter an H value between 0 and 359.9999.")
	}
	return validated, nil
}

func normalizePresetInventoryCategory(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "":
		return ""
	case "base_foundation":
		return "base_foundation"
	case "blush":
		return "blush"
	case "lip_color":
		return "lip_color"
	case "eyeshadow":
		return "eyeshadow"
	case "contour":
		return "contour"
	case "highlighter":
		return "highlighter"
	case "etc":
		return "etc"
	default:
		return ""
	}
}

func normalizeInventoryStatusCode(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "ACTIVE":
		return "ACTIVE"
	case "INACTIVE":
		return "INACTIVE"
	default:
		return ""
	}
}

func parseInventoryFloat(value, fieldName string) (float64, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return 0, nil
	}
	parsed, err := strconv.ParseFloat(trimmed, 64)
	if err != nil || parsed < 0 {
		return 0, fmt.Errorf("Please enter a valid %s.", fieldName)
	}
	return parsed, nil
}

func parseInventoryInt(value, fieldName string) (int64, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return 0, nil
	}
	parsed, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil || parsed < 0 {
		return 0, fmt.Errorf("Please enter a valid %s.", fieldName)
	}
	return parsed, nil
}

func logInventoryDBError(stage string, err error, payload map[string]any) {
	nextPayload := map[string]any{
		"error": err.Error(),
		"stage": stage,
	}
	for key, value := range payload {
		nextPayload[key] = value
	}
	logServerRuntime("inventory-db", "error", nextPayload)
}
