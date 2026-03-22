package main

import (
	"context"
	"fmt"
	"time"
)

const healthDateLayout = "2006-01-02"

type healthStore interface {
	TableExists(ctx context.Context) (bool, error)
	FetchStoredDate(ctx context.Context) (string, error)
	CreateTable(ctx context.Context) error
	DropTable(ctx context.Context) error
	InsertStoredDate(ctx context.Context, storedDate string) error
}

type healthService struct {
	store healthStore
	now   func() time.Time
}

type healthResponse struct {
	Status           string `json:"status"`
	Database         string `json:"database"`
	StoredDate       string `json:"storedDate"`
	Today            string `json:"today"`
	CurrentTimestamp string `json:"currentTimestamp"`
}

func (s *healthService) Check(ctx context.Context) (healthResponse, error) {
	if s == nil || s.store == nil {
		return healthResponse{}, fmt.Errorf("oracle health store is not configured")
	}

	now := s.now
	if now == nil {
		now = time.Now
	}

	currentTime := now()
	today := currentTime.Format(healthDateLayout)

	exists, err := s.store.TableExists(ctx)
	if err != nil {
		return healthResponse{}, err
	}

	if !exists {
		if err := s.store.CreateTable(ctx); err != nil {
			return healthResponse{}, err
		}
		if err := s.store.InsertStoredDate(ctx, today); err != nil {
			return healthResponse{}, err
		}

		return newHealthResponse(today, today, currentTime), nil
	}

	storedDate, err := s.store.FetchStoredDate(ctx)
	if err != nil {
		return healthResponse{}, err
	}

	if storedDate == "" {
		if err := s.store.InsertStoredDate(ctx, today); err != nil {
			return healthResponse{}, err
		}
		return newHealthResponse(today, today, currentTime), nil
	}

	if storedDate != today {
		if err := s.store.DropTable(ctx); err != nil {
			return healthResponse{}, err
		}
		if err := s.store.CreateTable(ctx); err != nil {
			return healthResponse{}, err
		}
		if err := s.store.InsertStoredDate(ctx, today); err != nil {
			return healthResponse{}, err
		}
		storedDate = today
	}

	return newHealthResponse(storedDate, today, currentTime), nil
}

func newHealthResponse(storedDate, today string, currentTime time.Time) healthResponse {
	return healthResponse{
		Status:           "ok",
		Database:         "connected",
		StoredDate:       storedDate,
		Today:            today,
		CurrentTimestamp: currentTime.UTC().Format(time.RFC3339),
	}
}
