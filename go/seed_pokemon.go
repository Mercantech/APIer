package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const pokeCSVBase = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv"

func seedPokemon(ctx context.Context, pool *pgxpool.Pool, replace bool) (int, error) {
	if !replace {
		var n int
		if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM go_pokemon`).Scan(&n); err != nil {
			return 0, err
		}
		if n > 0 {
			return n, nil
		}
	}

	client := &http.Client{Timeout: 120 * time.Second}
	typesByID, err := loadTypeNames(ctx, client)
	if err != nil {
		return 0, err
	}
	typesByPokemon, err := loadPokemonTypes(ctx, client)
	if err != nil {
		return 0, err
	}
	species, err := loadSpecies(ctx, client)
	if err != nil {
		return 0, err
	}
	pokemonRows, err := fetchCSV(ctx, client, pokeCSVBase+"/pokemon.csv")
	if err != nil {
		return 0, err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM go_pokemon`); err != nil {
		return 0, err
	}

	inserted := 0
	for i, row := range pokemonRows {
		if i == 0 {
			continue
		}
		if len(row) < 8 {
			continue
		}
		id, _ := strconv.Atoi(row[0])
		name := row[1]
		speciesID, _ := strconv.Atoi(row[2])
		height, _ := strconv.Atoi(row[3])
		weight, _ := strconv.Atoi(row[4])
		baseExp, _ := strconv.Atoi(row[5])
		isDefault := row[7] == "1"

		typeIDs := typesByPokemon[id]
		typeNames := make([]string, 0, len(typeIDs))
		for _, tid := range typeIDs {
			if n, ok := typesByID[tid]; ok {
				typeNames = append(typeNames, n)
			}
		}

		var evolvesFrom *int
		var chainID *int
		if sp, ok := species[speciesID]; ok {
			if sp.evolvesFrom != nil {
				evolvesFrom = sp.evolvesFrom
			}
			if sp.chainID != nil {
				chainID = sp.chainID
			}
		}

		sprite := fmt.Sprintf("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/%d.png", id)

		_, err := tx.Exec(ctx, `
INSERT INTO go_pokemon (id, name, height, weight, base_experience, types, evolves_from_id, evolution_chain_id, is_default, sprite_url)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			id, name, height, weight, baseExp, typeNames, evolvesFrom, chainID, isDefault, sprite)
		if err != nil {
			return 0, fmt.Errorf("insert pokemon %d: %w", id, err)
		}
		inserted++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	log.Printf("seeded %d pokemon", inserted)
	return inserted, nil
}

type speciesInfo struct {
	evolvesFrom *int
	chainID     *int
}

func loadTypeNames(ctx context.Context, client *http.Client) (map[int]string, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/types.csv")
	if err != nil {
		return nil, err
	}
	out := map[int]string{}
	for i, row := range rows {
		if i == 0 || len(row) < 2 {
			continue
		}
		id, _ := strconv.Atoi(row[0])
		out[id] = row[1]
	}
	return out, nil
}

func loadPokemonTypes(ctx context.Context, client *http.Client) (map[int][]int, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/pokemon_types.csv")
	if err != nil {
		return nil, err
	}
	out := map[int][]int{}
	type slotPair struct {
		tid, slot int
	}
	tmp := map[int][]slotPair{}
	for i, row := range rows {
		if i == 0 || len(row) < 3 {
			continue
		}
		pid, _ := strconv.Atoi(row[0])
		tid, _ := strconv.Atoi(row[1])
		slot, _ := strconv.Atoi(row[2])
		tmp[pid] = append(tmp[pid], slotPair{tid, slot})
	}
	for pid, pairs := range tmp {
		// sort by slot
		for i := 0; i < len(pairs); i++ {
			for j := i + 1; j < len(pairs); j++ {
				if pairs[j].slot < pairs[i].slot {
					pairs[i], pairs[j] = pairs[j], pairs[i]
				}
			}
		}
		ids := make([]int, len(pairs))
		for i, p := range pairs {
			ids[i] = p.tid
		}
		out[pid] = ids
	}
	return out, nil
}

func loadSpecies(ctx context.Context, client *http.Client) (map[int]speciesInfo, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/pokemon_species.csv")
	if err != nil {
		return nil, err
	}
	out := map[int]speciesInfo{}
	for i, row := range rows {
		if i == 0 || len(row) < 5 {
			continue
		}
		id, _ := strconv.Atoi(row[0])
		info := speciesInfo{}
		if strings.TrimSpace(row[3]) != "" {
			v, _ := strconv.Atoi(row[3])
			info.evolvesFrom = &v
		}
		if strings.TrimSpace(row[4]) != "" {
			v, _ := strconv.Atoi(row[4])
			info.chainID = &v
		}
		out[id] = info
	}
	return out, nil
}

func fetchCSV(ctx context.Context, client *http.Client, url string) ([][]string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return nil, fmt.Errorf("GET %s -> %d: %s", url, res.StatusCode, string(body))
	}
	r := csv.NewReader(res.Body)
	r.FieldsPerRecord = -1
	return r.ReadAll()
}
