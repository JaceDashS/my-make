package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
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

const (
	ansiReset  = "\x1b[0m"
	ansiGreen  = "\x1b[32m"
	ansiBlue   = "\x1b[34m"
	ansiCyan   = "\x1b[36m"
	ansiYellow = "\x1b[33m"
	ansiRed    = "\x1b[31m"
)

func logServerRuntime(channel, event string, payload map[string]any) {
	entry := serverRuntimeLogEntry{
		Channel:   channel,
		Event:     event,
		Payload:   payload,
		Timestamp: time.Now().Format(time.RFC3339Nano),
	}

	logRuntimeEntry("server", channel, event, payload)

	if err := appendServerRuntimeLog(entry); err != nil {
		log.Printf("%s[server/runtime]%s write-failed %v", ansiRed, ansiReset, err)
	}
}

func logClientRuntime(entry clientLogEntry) {
	logRuntimeEntry("client", fmt.Sprintf("%s/%s", entry.Platform, entry.Channel), entry.Event, entry.Payload)
}

func logRuntimeEntry(kind, channel, event string, payload map[string]any) {
	label := fmt.Sprintf("[%s/%s]", kind, channel)
	log.Printf("%s%s%s %s %s", runtimeColor(kind, channel), label, ansiReset, event, formatRuntimePayload(payload))
}

func runtimeColor(kind, channel string) string {
	switch {
	case kind == "client" && strings.HasPrefix(channel, "windows/"):
		return ansiBlue
	case kind == "client" && strings.HasPrefix(channel, "android/"):
		return ansiCyan
	case kind == "client":
		return ansiYellow
	case strings.Contains(channel, "error") || strings.Contains(channel, "failed"):
		return ansiRed
	default:
		return ansiGreen
	}
}

func formatRuntimePayload(payload map[string]any) string {
	if len(payload) == 0 {
		return "{}"
	}

	keys := make([]string, 0, len(payload))
	for key := range payload {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%v", key, payload[key]))
	}

	return strings.Join(parts, " ")
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
