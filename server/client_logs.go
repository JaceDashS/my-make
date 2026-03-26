package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type clientLogEntry struct {
	Channel   string         `json:"channel"`
	Event     string         `json:"event"`
	Payload   map[string]any `json:"payload,omitempty"`
	Platform  string         `json:"platform,omitempty"`
	Timestamp string         `json:"timestamp,omitempty"`
}

var clientLogWriteMu sync.Mutex

func appendClientLog(entry clientLogEntry) error {
	logPath, err := resolveClientLogPath()
	if err != nil {
		return err
	}

	if entry.Timestamp == "" {
		entry.Timestamp = time.Now().Format(time.RFC3339Nano)
	}

	data, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("marshal client log entry: %w", err)
	}

	clientLogWriteMu.Lock()
	defer clientLogWriteMu.Unlock()

	if err := os.MkdirAll(filepath.Dir(logPath), 0o755); err != nil {
		return fmt.Errorf("create client log directory: %w", err)
	}

	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return fmt.Errorf("open client log file: %w", err)
	}
	defer file.Close()

	if _, err := file.Write(append(data, '\n')); err != nil {
		return fmt.Errorf("write client log entry: %w", err)
	}

	return nil
}

func resolveClientLogPath() (string, error) {
	rootDir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("resolve working directory: %w", err)
	}

	return filepath.Join(rootDir, "logs", "dev", "windows", "client-runtime.log"), nil
}
