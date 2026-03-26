package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type serverRuntimeLogEntry struct {
	Channel   string         `json:"channel"`
	Event     string         `json:"event"`
	Payload   map[string]any `json:"payload,omitempty"`
	Timestamp string         `json:"timestamp"`
}

var serverRuntimeLogWriteMu sync.Mutex

func logServerRuntime(channel, event string, payload map[string]any) {
	entry := serverRuntimeLogEntry{
		Channel:   channel,
		Event:     event,
		Payload:   payload,
		Timestamp: time.Now().Format(time.RFC3339Nano),
	}

	log.Printf("[server-runtime] %s %s %v", channel, event, payload)

	if err := appendServerRuntimeLog(entry); err != nil {
		log.Printf("[server-runtime] write-failed %v", err)
	}
}

func appendServerRuntimeLog(entry serverRuntimeLogEntry) error {
	logPath, err := resolveServerRuntimeLogPath()
	if err != nil {
		return err
	}

	data, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("marshal server runtime log entry: %w", err)
	}

	serverRuntimeLogWriteMu.Lock()
	defer serverRuntimeLogWriteMu.Unlock()

	if err := os.MkdirAll(filepath.Dir(logPath), 0o755); err != nil {
		return fmt.Errorf("create server runtime log directory: %w", err)
	}

	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return fmt.Errorf("open server runtime log file: %w", err)
	}
	defer file.Close()

	if _, err := file.Write(append(data, '\n')); err != nil {
		return fmt.Errorf("write server runtime log entry: %w", err)
	}

	return nil
}

func resolveServerRuntimeLogPath() (string, error) {
	rootDir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("resolve working directory: %w", err)
	}

	return filepath.Join(rootDir, "logs", "dev", "windows", "server-runtime.log"), nil
}
