package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const (
	appEnvKey         = "APP_ENV"
	goEnvKey          = "GO_ENV"
	envDevelopment    = "development"
	envProduction     = "production"
	defaultEnvFile    = ".env.development"
	productionEnvFile = ".env.production"
)

func loadRuntimeEnv() error {
	path, err := resolveEnvFilePath()
	if err != nil {
		return err
	}
	if path == "" {
		return nil
	}

	return loadEnvFile(path)
}

func resolveEnvFilePath() (string, error) {
	fileName := defaultEnvFile
	switch strings.ToLower(strings.TrimSpace(firstNonEmptyEnv(appEnvKey, goEnvKey))) {
	case envProduction:
		fileName = productionEnvFile
	}

	for _, path := range envFileCandidates(fileName) {
		if _, err := os.Stat(path); err == nil {
			return path, nil
		} else if !os.IsNotExist(err) {
			return "", fmt.Errorf("stat env file: %w", err)
		}
	}

	return "", nil
}

func loadEnvFile(path string) error {
	file, err := os.Open(filepath.Clean(path))
	if err != nil {
		return fmt.Errorf("open env file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lineNo := 0

	for scanner.Scan() {
		lineNo++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			return fmt.Errorf("invalid env line %d", lineNo)
		}

		key = strings.TrimSpace(key)
		if key == "" {
			return fmt.Errorf("empty env key on line %d", lineNo)
		}

		if _, exists := os.LookupEnv(key); exists {
			continue
		}

		if err := os.Setenv(key, strings.TrimSpace(value)); err != nil {
			return fmt.Errorf("set env %s: %w", key, err)
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read env file: %w", err)
	}

	return nil
}

func firstNonEmptyEnv(keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}

	return ""
}

func envFileCandidates(fileName string) []string {
	candidates := []string{
		fileName,
		filepath.Join("server", fileName),
	}

	if _, currentFile, _, ok := runtime.Caller(0); ok {
		baseDir := filepath.Dir(currentFile)
		candidates = append(candidates, filepath.Join(baseDir, fileName))
	}

	seen := make(map[string]struct{}, len(candidates))
	unique := make([]string, 0, len(candidates))

	for _, candidate := range candidates {
		cleaned := filepath.Clean(candidate)
		if _, ok := seen[cleaned]; ok {
			continue
		}
		seen[cleaned] = struct{}{}
		unique = append(unique, cleaned)
	}

	return unique
}
