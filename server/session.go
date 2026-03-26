package main

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"sync"
	"time"
)

const (
	sessionCookieName = "my_make_session"
	sessionTTL        = 12 * time.Hour
)

type sessionRecord struct {
	account   accountResponse
	expiresAt time.Time
}

type sessionManager struct {
	mu       sync.Mutex
	sessions map[string]sessionRecord
	now      func() time.Time
}

func newSessionManager() *sessionManager {
	return &sessionManager{
		sessions: make(map[string]sessionRecord),
		now:      time.Now,
	}
}

func (m *sessionManager) Create(account accountResponse) (string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}

	token := hex.EncodeToString(tokenBytes)
	now := time.Now()
	if m.now != nil {
		now = m.now()
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[token] = sessionRecord{
		account:   account,
		expiresAt: now.Add(sessionTTL),
	}

	return token, nil
}

func (m *sessionManager) Get(token string) (accountResponse, bool) {
	now := time.Now()
	if m.now != nil {
		now = m.now()
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	record, ok := m.sessions[token]
	if !ok {
		return accountResponse{}, false
	}

	if !record.expiresAt.After(now) {
		delete(m.sessions, token)
		return accountResponse{}, false
	}

	return record.account, true
}

func (m *sessionManager) Delete(token string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, token)
}

func setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})
}

func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		HttpOnly: true,
		MaxAge:   -1,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})
}

func readSessionCookie(r *http.Request) (string, bool) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return "", false
	}

	return cookie.Value, true
}
