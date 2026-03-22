package main

import (
	"strings"
	"testing"
)

func TestBuildOracleDSNWithDescriptorUsesJDBCMode(t *testing.T) {
	cfg := oracleConfig{
		user:             "ADMIN",
		password:         "secret",
		connectionString: "(description=(address=(protocol=tcps)(host=example.com)(port=1522))(connect_data=(service_name=test_high)))",
	}

	dsn, err := buildOracleDSN(cfg)
	if err != nil {
		t.Fatalf("buildOracleDSN returned error: %v", err)
	}

	if !strings.Contains(dsn, "connStr=") {
		t.Fatalf("expected JDBC-style connStr option in DSN, got %q", dsn)
	}

	if strings.Contains(dsn, "@(") {
		t.Fatalf("expected descriptor not to be appended as raw host, got %q", dsn)
	}
}
