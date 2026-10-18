package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	uuidRe = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	numRe  = regexp.MustCompile(`^\d+$`)
)

type goStatKey struct {
	Method string
	Path   string
}

type goStatEntry struct {
	pending int64
	last    time.Time
}

type goStatsTracker struct {
	db      *pgxpool.Pool
	mu      sync.Mutex
	pending map[goStatKey]*goStatEntry
}

func newGoStatsTracker(db *pgxpool.Pool) *goStatsTracker {
	t := &goStatsTracker{
		db:      db,
		pending: make(map[goStatKey]*goStatEntry),
	}
	go t.loop()
	return t
}

func (t *goStatsTracker) track(method, path string) {
	key := goStatKey{Method: strings.ToUpper(method), Path: normalizeGoPath(path)}
	t.mu.Lock()
	e := t.pending[key]
	if e == nil {
		e = &goStatEntry{}
		t.pending[key] = e
	}
	e.pending++
	e.last = time.Now().UTC()
	t.mu.Unlock()
}

func (t *goStatsTracker) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
		if r.URL.Path == "/go/health" {
			return
		}
		t.track(r.Method, templateGoPath(r.URL.Path))
	})
}

func (t *goStatsTracker) loop() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		t.flush()
	}
}

func (t *goStatsTracker) flush() {
	t.mu.Lock()
	batch := t.pending
	t.pending = make(map[goStatKey]*goStatEntry)
	t.mu.Unlock()
	if len(batch) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	for key, e := range batch {
		if e.pending <= 0 {
			continue
		}
		_, err := t.db.Exec(ctx, `
INSERT INTO "EndpointCallStats" ("Id", "Method", "Path", "CallCount", "LastCalledAt", "UpdatedAt")
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT ("Method", "Path") DO UPDATE SET
  "CallCount" = "EndpointCallStats"."CallCount" + EXCLUDED."CallCount",
  "LastCalledAt" = GREATEST("EndpointCallStats"."LastCalledAt", EXCLUDED."LastCalledAt"),
  "UpdatedAt" = EXCLUDED."UpdatedAt"
`, newStatID(), key.Method, key.Path, e.pending, e.last, time.Now().UTC())
		if err != nil {
			// Genindlæg ved fejl
			t.mu.Lock()
			cur := t.pending[key]
			if cur == nil {
				t.pending[key] = e
			} else {
				cur.pending += e.pending
				if e.last.After(cur.last) {
					cur.last = e.last
				}
			}
			t.mu.Unlock()
			log.Printf("go stats flush: %v", err)
		}
	}
}

func newStatID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return hex.EncodeToString([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
	}
	return hex.EncodeToString(b)
}

func normalizeGoPath(path string) string {
	if path == "" {
		return "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	if len(path) > 1 {
		path = strings.TrimRight(path, "/")
	}
	return path
}

func templateGoPath(path string) string {
	path = normalizeGoPath(path)
	parts := strings.Split(path, "/")
	for i, p := range parts {
		if p == "" {
			continue
		}
		if numRe.MatchString(p) || uuidRe.MatchString(p) {
			parts[i] = "{id}"
		}
	}
	// Kendte Go-mønstre
	out := strings.Join(parts, "/")
	out = strings.Replace(out, "/go/pokemon/type/{id}", "/go/pokemon/type/{type}", 1)
	out = strings.Replace(out, "/go/pokemon/generation/{id}", "/go/pokemon/generation/{n}", 1)
	out = strings.Replace(out, "/go/minecraft/recipes/{id}", "/go/minecraft/recipes/{name}", 1)
	if strings.HasSuffix(out, "/evolutions") {
		out = strings.Replace(out, "/{id}/evolutions", "/{id}/evolutions", 1)
	}
	return out
}
