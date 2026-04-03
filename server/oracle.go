package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	go_ora "github.com/sijms/go-ora/v2"
	_ "github.com/sijms/go-ora/v2"
)

const healthcheckTableName = "HEALTHCHECK_TEST"
const oracleConnectRetryCount = 3
const oracleConnectRetryDelay = 300 * time.Millisecond

type oracleConfig struct {
	user             string
	password         string
	connectionString string
}

type oracleHealthStore struct {
	db *sql.DB
}

func newHealthServiceFromEnv() (*healthService, error) {
	cfg, err := loadOracleConfigFromEnv()
	if err != nil {
		return nil, err
	}

	db, err := openOracleDB(cfg)
	if err != nil {
		return nil, err
	}

	return &healthService{
		store: &oracleHealthStore{db: db},
		now:   time.Now,
	}, nil
}

func loadOracleConfigFromEnv() (oracleConfig, error) {
	cfg := oracleConfig{
		user:             strings.TrimSpace(os.Getenv("DB_USER")),
		password:         os.Getenv("DB_PASSWORD"),
		connectionString: strings.TrimSpace(os.Getenv("DB_CONNECTION_STRING")),
	}

	switch {
	case cfg.user == "":
		return oracleConfig{}, errors.New("DB_USER is required")
	case cfg.password == "":
		return oracleConfig{}, errors.New("DB_PASSWORD is required")
	case cfg.connectionString == "":
		return oracleConfig{}, errors.New("DB_CONNECTION_STRING is required")
	default:
		return cfg, nil
	}
}

func openOracleDB(cfg oracleConfig) (*sql.DB, error) {
	dsn, err := buildOracleDSN(cfg)
	if err != nil {
		return nil, err
	}

	var lastErr error
	for attempt := 1; attempt <= oracleConnectRetryCount; attempt++ {
		db, err := sql.Open("oracle", dsn)
		if err != nil {
			return nil, fmt.Errorf("open oracle connection: %w", err)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		err = db.PingContext(ctx)
		cancel()
		if err == nil {
			return db, nil
		}

		_ = db.Close()
		lastErr = err
		if attempt == oracleConnectRetryCount || !shouldRetryOracleConnectError(err) {
			break
		}

		time.Sleep(oracleConnectRetryDelay)
	}

	return nil, fmt.Errorf("ping oracle connection: %w", lastErr)
}

func buildOracleDSN(cfg oracleConfig) (string, error) {
	if strings.HasPrefix(cfg.connectionString, "oracle://") {
		parsed, err := url.Parse(cfg.connectionString)
		if err != nil {
			return "", fmt.Errorf("parse DB_CONNECTION_STRING: %w", err)
		}

		parsed.User = url.UserPassword(cfg.user, cfg.password)
		return parsed.String(), nil
	}

	if strings.Contains(cfg.connectionString, "://") {
		return cfg.connectionString, nil
	}

	if strings.HasPrefix(strings.TrimSpace(cfg.connectionString), "(") {
		return go_ora.BuildJDBC(cfg.user, cfg.password, cfg.connectionString, nil), nil
	}

	return fmt.Sprintf(
		"oracle://%s:%s@%s",
		url.QueryEscape(cfg.user),
		url.QueryEscape(cfg.password),
		cfg.connectionString,
	), nil
}

func shouldRetryOracleConnectError(err error) bool {
	if err == nil {
		return false
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "use of closed network connection") ||
		strings.Contains(message, "connection reset by peer") ||
		strings.Contains(message, "broken pipe") ||
		strings.Contains(message, "eof")
}

func (s *oracleHealthStore) TableExists(ctx context.Context) (bool, error) {
	var count int
	query := "SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = :1"
	if err := s.db.QueryRowContext(ctx, query, healthcheckTableName).Scan(&count); err != nil {
		return false, fmt.Errorf("check health table existence: %w", err)
	}

	return count > 0, nil
}

func (s *oracleHealthStore) FetchStoredDate(ctx context.Context) (string, error) {
	var storedDate string
	query := "SELECT HEALTH_DATE FROM HEALTHCHECK_TEST FETCH FIRST 1 ROWS ONLY"
	err := s.db.QueryRowContext(ctx, query).Scan(&storedDate)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("fetch stored health date: %w", err)
	}

	return storedDate, nil
}

func (s *oracleHealthStore) CreateTable(ctx context.Context) error {
	query := "CREATE TABLE HEALTHCHECK_TEST (HEALTH_DATE VARCHAR2(10) NOT NULL)"
	if _, err := s.db.ExecContext(ctx, query); err != nil {
		return fmt.Errorf("create health table: %w", err)
	}

	return nil
}

func (s *oracleHealthStore) DropTable(ctx context.Context) error {
	query := "DROP TABLE HEALTHCHECK_TEST PURGE"
	if _, err := s.db.ExecContext(ctx, query); err != nil {
		return fmt.Errorf("drop health table: %w", err)
	}

	return nil
}

func (s *oracleHealthStore) InsertStoredDate(ctx context.Context, storedDate string) error {
	query := "INSERT INTO HEALTHCHECK_TEST (HEALTH_DATE) VALUES (:1)"
	if _, err := s.db.ExecContext(ctx, query, storedDate); err != nil {
		return fmt.Errorf("insert health date: %w", err)
	}

	return nil
}
