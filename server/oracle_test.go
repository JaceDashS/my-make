package main

import (
	"errors"
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

func TestShouldRetryOracleConnectError(t *testing.T) {
	testCases := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "closed network connection",
			err:  errors.New("ping oracle connection: read tcp 1.1.1.1:1->2.2.2.2:2: use of closed network connection"),
			want: true,
		},
		{
			name: "eof",
			err:  errors.New("EOF"),
			want: true,
		},
		{
			name: "non transient auth error",
			err:  errors.New("ORA-01017: invalid username/password; logon denied"),
			want: false,
		},
		{
			name: "nil",
			err:  nil,
			want: false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got := shouldRetryOracleConnectError(testCase.err)
			if got != testCase.want {
				t.Fatalf("shouldRetryOracleConnectError() = %v, want %v", got, testCase.want)
			}
		})
	}
}
