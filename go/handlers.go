package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type api struct {
	db *pgxpool.Pool
}

func (a *api) requireSeedKey(w http.ResponseWriter, r *http.Request) bool {
	expected := getenv("SEED_API_KEY", "")
	if expected == "" {
		http.Error(w, "SEED_API_KEY er ikke konfigureret", http.StatusServiceUnavailable)
		return false
	}
	if r.Header.Get("X-Seed-Key") != expected {
		http.Error(w, "Header X-Seed-Key mangler eller er ugyldig", http.StatusUnauthorized)
		return false
	}
	return true
}

func (a *api) handleSeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}
	if !a.requireSeedKey(w, r) {
		return
	}
	replace := r.URL.Query().Get("replace") == "true"
	ctx := r.Context()

	pokeN, err := seedPokemon(ctx, a.db, replace)
	if err != nil {
		http.Error(w, "pokemon seed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	mc, err := seedMinecraft(ctx, a.db, replace)
	if err != nil {
		http.Error(w, "minecraft seed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"pokemon":   pokeN,
		"minecraft": mc,
		"replace":   replace,
	})
}

func (a *api) handlePokemonList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit := queryInt(r, "limit", 151)
	if limit > 2000 {
		limit = 2000
	}
	offset := queryInt(r, "offset", 0)
	rows, err := a.db.Query(ctx, `
SELECT id, name, height, weight, base_experience, types, evolves_from_id, evolution_chain_id, sprite_url
FROM go_pokemon
WHERE is_default = TRUE
ORDER BY id
LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	list := []map[string]any{}
	for rows.Next() {
		var id, height, weight, baseExp int
		var name, sprite string
		var types []string
		var evolvesFrom, chain *int
		if err := rows.Scan(&id, &name, &height, &weight, &baseExp, &types, &evolvesFrom, &chain, &sprite); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		list = append(list, map[string]any{
			"id": id, "name": name, "height": height, "weight": weight,
			"baseExperience": baseExp, "types": types, "evolvesFromId": evolvesFrom,
			"evolutionChainId": chain, "spriteUrl": sprite,
		})
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *api) handlePokemonOne(w http.ResponseWriter, r *http.Request, idOrName string) {
	ctx := r.Context()
	var id int
	var name, sprite string
	var height, weight, baseExp int
	var types []string
	var evolvesFrom, chain *int

	if n, err := strconv.Atoi(idOrName); err == nil {
		err = a.db.QueryRow(ctx, `
SELECT id, name, height, weight, base_experience, types, evolves_from_id, evolution_chain_id, sprite_url
FROM go_pokemon WHERE id=$1`, n).
			Scan(&id, &name, &height, &weight, &baseExp, &types, &evolvesFrom, &chain, &sprite)
		if err != nil {
			http.NotFound(w, r)
			return
		}
	} else {
		err = a.db.QueryRow(ctx, `
SELECT id, name, height, weight, base_experience, types, evolves_from_id, evolution_chain_id, sprite_url
FROM go_pokemon WHERE lower(name)=lower($1) ORDER BY id LIMIT 1`, idOrName).
			Scan(&id, &name, &height, &weight, &baseExp, &types, &evolvesFrom, &chain, &sprite)
		if err != nil {
			http.NotFound(w, r)
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id": id, "name": name, "height": height, "weight": weight,
		"baseExperience": baseExp, "types": types, "evolvesFromId": evolvesFrom,
		"evolutionChainId": chain, "spriteUrl": sprite,
	})
}

func (a *api) handlePokemonTypes(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query(r.Context(), `
SELECT DISTINCT unnest(types) AS t FROM go_pokemon WHERE is_default ORDER BY t`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, t)
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *api) handlePokemonByType(w http.ResponseWriter, r *http.Request, typeName string) {
	rows, err := a.db.Query(r.Context(), `
SELECT id, name, types, sprite_url
FROM go_pokemon
WHERE is_default AND $1 = ANY(types)
ORDER BY id`, strings.ToLower(typeName))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var id int
		var name, sprite string
		var types []string
		if err := rows.Scan(&id, &name, &types, &sprite); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		list = append(list, map[string]any{"id": id, "name": name, "types": types, "spriteUrl": sprite})
	}
	if len(list) == 0 {
		http.NotFound(w, r)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *api) handlePokemonEvolutions(w http.ResponseWriter, r *http.Request, idOrName string) {
	ctx := r.Context()
	var id int
	var chain *int
	if n, err := strconv.Atoi(idOrName); err == nil {
		err = a.db.QueryRow(ctx, `SELECT id, evolution_chain_id FROM go_pokemon WHERE id=$1`, n).Scan(&id, &chain)
		if err != nil {
			http.NotFound(w, r)
			return
		}
	} else {
		err = a.db.QueryRow(ctx, `SELECT id, evolution_chain_id FROM go_pokemon WHERE lower(name)=lower($1) ORDER BY id LIMIT 1`, idOrName).
			Scan(&id, &chain)
		if err != nil {
			http.NotFound(w, r)
			return
		}
	}
	if chain == nil {
		writeJSON(w, http.StatusOK, map[string]any{"pokemonId": id, "chain": []any{}})
		return
	}

	rows, err := a.db.Query(ctx, `
SELECT id, name, evolves_from_id, sprite_url
FROM go_pokemon
WHERE evolution_chain_id=$1 AND is_default
ORDER BY id`, *chain)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	chainList := []map[string]any{}
	for rows.Next() {
		var pid int
		var name, sprite string
		var from *int
		if err := rows.Scan(&pid, &name, &from, &sprite); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		chainList = append(chainList, map[string]any{
			"id": pid, "name": name, "evolvesFromId": from, "spriteUrl": sprite,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"pokemonId":        id,
		"evolutionChainId": *chain,
		"chain":            chainList,
	})
}

func (a *api) handleMCList(w http.ResponseWriter, r *http.Request, table string) {
	limit := queryInt(r, "limit", 100)
	if limit > 5000 {
		limit = 5000
	}
	offset := queryInt(r, "offset", 0)
	q := r.URL.Query().Get("q")

	sql := `SELECT raw FROM ` + table
	args := []any{}
	where := []string{}
	if q != "" {
		where = append(where, `(name ILIKE $1 OR display_name ILIKE $1)`)
		args = append(args, "%"+q+"%")
	}
	if len(where) > 0 {
		sql += ` WHERE ` + strings.Join(where, " AND ")
	}
	sql += ` ORDER BY id LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2)
	args = append(args, limit, offset)

	rows, err := a.db.Query(r.Context(), sql, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := []json.RawMessage{}
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		out = append(out, json.RawMessage(raw))
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *api) handleMCRecipes(w http.ResponseWriter, r *http.Request) {
	limit := queryInt(r, "limit", 100)
	if limit > 5000 {
		limit = 5000
	}
	offset := queryInt(r, "offset", 0)
	rows, err := a.db.Query(r.Context(), `
SELECT id, result_name, result_count, ingredients, raw
FROM go_mc_recipes
ORDER BY result_name, id
LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var id, result string
		var count int
		var ings, raw []byte
		if err := rows.Scan(&id, &result, &count, &ings, &raw); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		list = append(list, map[string]any{
			"id": id, "resultName": result, "resultCount": count,
			"ingredients": json.RawMessage(ings), "raw": json.RawMessage(raw),
		})
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *api) handleMCRecipeOne(w http.ResponseWriter, r *http.Request, name string) {
	rows, err := a.db.Query(r.Context(), `
SELECT id, result_name, result_count, ingredients, raw
FROM go_mc_recipes
WHERE result_name = $1 OR id = $1
ORDER BY id`, name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var id, result string
		var count int
		var ings, raw []byte
		if err := rows.Scan(&id, &result, &count, &ings, &raw); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		list = append(list, map[string]any{
			"id": id, "resultName": result, "resultCount": count,
			"ingredients": json.RawMessage(ings), "raw": json.RawMessage(raw),
		})
	}
	if len(list) == 0 {
		http.NotFound(w, r)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func queryInt(r *http.Request, key string, def int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}
