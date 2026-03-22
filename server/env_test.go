package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveEnvFilePathDefaultsToDevelopment(t *testing.T) {
	t.Setenv(appEnvKey, "")
	t.Setenv(goEnvKey, "")

	got, err := resolveEnvFilePath()
	if err != nil {
		t.Fatalf("resolve env path: %v", err)
	}
	if got == "" {
		t.Fatal("expected a discovered env path, got empty string")
	}
}

func TestResolveEnvFilePathUsesProductionEnv(t *testing.T) {
	t.Setenv(appEnvKey, envProduction)
	t.Setenv(goEnvKey, "")

	got, err := resolveEnvFilePath()
	if err != nil {
		t.Fatalf("resolve env path: %v", err)
	}
	if got == "" {
		t.Fatal("expected a discovered env path, got empty string")
	}
	if filepath.Base(got) != productionEnvFile {
		t.Fatalf("expected base path %q, got %q", productionEnvFile, got)
	}
}

func TestLoadEnvFileSetsMissingValuesOnly(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env.test")

	content := "# comment\nDB_USER=from-file\nDB_PASSWORD=secret\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	t.Setenv("DB_USER", "existing")
	t.Setenv("DB_PASSWORD", "")

	if err := loadEnvFile(path); err != nil {
		t.Fatalf("load env file: %v", err)
	}

	if got := os.Getenv("DB_USER"); got != "existing" {
		t.Fatalf("expected existing DB_USER to win, got %q", got)
	}

	if got := os.Getenv("DB_PASSWORD"); got != "" {
		t.Fatalf("expected existing empty DB_PASSWORD to remain untouched, got %q", got)
	}
}

func TestLoadEnvFileLoadsValuesWhenUnset(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env.test")

	content := "DB_USER=from-file\nDB_PASSWORD=secret\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	os.Unsetenv("DB_USER")
	t.Cleanup(func() { os.Unsetenv("DB_USER") })
	os.Unsetenv("DB_PASSWORD")
	t.Cleanup(func() { os.Unsetenv("DB_PASSWORD") })

	if err := loadEnvFile(path); err != nil {
		t.Fatalf("load env file: %v", err)
	}

	if got := os.Getenv("DB_USER"); got != "from-file" {
		t.Fatalf("expected DB_USER from file, got %q", got)
	}

	if got := os.Getenv("DB_PASSWORD"); got != "secret" {
		t.Fatalf("expected DB_PASSWORD from file, got %q", got)
	}
}
