package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const mcDataBase = "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data"

func seedMinecraft(ctx context.Context, pool *pgxpool.Pool, replace bool) (map[string]int, error) {
	if !replace {
		var n int
		if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM go_mc_items`).Scan(&n); err != nil {
			return nil, err
		}
		if n > 0 {
			return map[string]int{"items": n, "skipped": 1}, nil
		}
	}

	version := os.Getenv("MINECRAFT_VERSION")
	if version == "" {
		version = "1.20.4"
	}

	client := &http.Client{Timeout: 120 * time.Second}
	paths, err := loadMCDataPaths(ctx, client, version)
	if err != nil {
		return nil, err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	for _, t := range []string{"go_mc_items", "go_mc_blocks", "go_mc_mobs", "go_mc_biomes", "go_mc_recipes"} {
		if _, err := tx.Exec(ctx, `DELETE FROM `+t); err != nil {
			return nil, err
		}
	}

	counts := map[string]int{}

	var items []struct {
		ID          int    `json:"id"`
		Name        string `json:"name"`
		DisplayName string `json:"displayName"`
		StackSize   int    `json:"stackSize"`
	}
	if err := fetchJSON(ctx, client, mcURL(paths["items"], "items.json"), &items); err != nil {
		return nil, err
	}
	for _, it := range items {
		raw, _ := json.Marshal(it)
		if _, err := tx.Exec(ctx, `
INSERT INTO go_mc_items (id, name, display_name, stack_size, raw)
VALUES ($1,$2,$3,$4,$5)`,
			it.ID, it.Name, it.DisplayName, it.StackSize, raw); err != nil {
			return nil, err
		}
		counts["items"]++
	}

	var blocks []struct {
		ID          int      `json:"id"`
		Name        string   `json:"name"`
		DisplayName string   `json:"displayName"`
		Hardness    *float64 `json:"hardness"`
		StackSize   int      `json:"stackSize"`
		Diggable    bool     `json:"diggable"`
	}
	if err := fetchJSON(ctx, client, mcURL(paths["blocks"], "blocks.json"), &blocks); err != nil {
		return nil, err
	}
	for _, b := range blocks {
		raw, _ := json.Marshal(b)
		if _, err := tx.Exec(ctx, `
INSERT INTO go_mc_blocks (id, name, display_name, hardness, stack_size, diggable, raw)
VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			b.ID, b.Name, b.DisplayName, b.Hardness, b.StackSize, b.Diggable, raw); err != nil {
			return nil, err
		}
		counts["blocks"]++
	}

	var entities []struct {
		ID          int      `json:"id"`
		Name        string   `json:"name"`
		DisplayName string   `json:"displayName"`
		Width       *float64 `json:"width"`
		Height      *float64 `json:"height"`
		Type        string   `json:"type"`
		Category    string   `json:"category"`
	}
	if err := fetchJSON(ctx, client, mcURL(paths["entities"], "entities.json"), &entities); err != nil {
		return nil, err
	}
	for _, e := range entities {
		cat := e.Category
		if cat == "" {
			cat = e.Type
		}
		if !isMobCategory(cat, e.Type) {
			continue
		}
		raw, _ := json.Marshal(e)
		if _, err := tx.Exec(ctx, `
INSERT INTO go_mc_mobs (id, name, display_name, width, height, category, raw)
VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			e.ID, e.Name, e.DisplayName, e.Width, e.Height, cat, raw); err != nil {
			return nil, err
		}
		counts["mobs"]++
	}

	var biomes []struct {
		ID          int      `json:"id"`
		Name        string   `json:"name"`
		DisplayName string   `json:"displayName"`
		Temperature *float64 `json:"temperature"`
		Rainfall    *float64 `json:"rainfall"`
	}
	if err := fetchJSON(ctx, client, mcURL(paths["biomes"], "biomes.json"), &biomes); err != nil {
		return nil, err
	}
	for _, b := range biomes {
		raw, _ := json.Marshal(b)
		if _, err := tx.Exec(ctx, `
INSERT INTO go_mc_biomes (id, name, display_name, temperature, rainfall, raw)
VALUES ($1,$2,$3,$4,$5,$6)`,
			b.ID, b.Name, b.DisplayName, b.Temperature, b.Rainfall, raw); err != nil {
			return nil, err
		}
		counts["biomes"]++
	}

	idToName := map[int]string{}
	for _, it := range items {
		idToName[it.ID] = it.Name
	}
	n, err := insertRecipes(ctx, tx, client, mcURL(paths["recipes"], "recipes.json"), idToName)
	if err != nil {
		return nil, err
	}
	counts["recipes"] = n

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	log.Printf("seeded minecraft %s: %+v", version, counts)
	return counts, nil
}

func insertRecipes(ctx context.Context, tx pgx.Tx, client *http.Client, url string, idToName map[int]string) (int, error) {
	raw, err := fetchRaw(ctx, client, url)
	if err != nil {
		return 0, err
	}

	var asMap map[string]json.RawMessage
	if err := json.Unmarshal(raw, &asMap); err != nil {
		return 0, fmt.Errorf("recipes.json: %w", err)
	}

	count := 0
	for resultKey, payload := range asMap {
		resultName := resultKey
		if id, err := parseInt(resultKey); err == nil {
			if n, ok := idToName[id]; ok {
				resultName = n
			}
		}

		recipes := []json.RawMessage{}
		if err := json.Unmarshal(payload, &recipes); err != nil {
			// single recipe object
			recipes = []json.RawMessage{payload}
		}

		for i, rraw := range recipes {
			var parsed map[string]any
			_ = json.Unmarshal(rraw, &parsed)
			resultCount := 1
			if rc, ok := parsed["resultCount"].(float64); ok {
				resultCount = int(rc)
			}
			ings, _ := json.Marshal(parsed["ingredients"])
			if string(ings) == "null" {
				ings = []byte("[]")
			}
			id := fmt.Sprintf("%s#%d", resultName, i)
			if _, err := tx.Exec(ctx, `
INSERT INTO go_mc_recipes (id, result_name, result_count, ingredients, raw)
VALUES ($1,$2,$3,$4,$5)`,
				id, resultName, resultCount, ings, rraw); err != nil {
				return 0, err
			}
			count++
		}
	}
	return count, nil
}

func parseInt(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}

func isMobCategory(cat, typ string) bool {
	c := strings.ToLower(cat + " " + typ)
	for _, k := range []string{"mob", "animal", "hostile", "ambient", "water_creature", "water_ambient", "monster", "creature"} {
		if strings.Contains(c, k) {
			return true
		}
	}
	for _, bad := range []string{"projectile", "misc", "orb", "painting", "falling", "experience", "lightning", "area_effect"} {
		if strings.Contains(c, bad) {
			return false
		}
	}
	return strings.EqualFold(typ, "player") || strings.EqualFold(cat, "player")
}

func loadMCDataPaths(ctx context.Context, client *http.Client, version string) (map[string]string, error) {
	var root map[string]map[string]map[string]string
	if err := fetchJSON(ctx, client, mcDataBase+"/dataPaths.json", &root); err != nil {
		return nil, err
	}
	pc, ok := root["pc"]
	if !ok {
		return nil, fmt.Errorf("dataPaths mangler pc")
	}
	paths, ok := pc[version]
	if !ok {
		return nil, fmt.Errorf("ukendt minecraft-version %q", version)
	}
	return paths, nil
}

func mcURL(folder, file string) string {
	return mcDataBase + "/" + strings.Trim(folder, "/") + "/" + file
}

func fetchJSON(ctx context.Context, client *http.Client, url string, dest any) error {
	raw, err := fetchRaw(ctx, client, url)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, dest)
}

func fetchRaw(ctx context.Context, client *http.Client, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode != http.StatusOK {
		snip := body
		if len(snip) > 200 {
			snip = snip[:200]
		}
		return nil, fmt.Errorf("GET %s -> %d: %s", url, res.StatusCode, string(snip))
	}
	return body, nil
}
