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
		var n, rich int
		if err := pool.QueryRow(ctx, `
SELECT COUNT(*), COUNT(*) FILTER (WHERE hp > 0)
FROM go_pokemon`).Scan(&n, &rich); err != nil {
			return 0, err
		}
		if n > 0 && rich == n {
			return n, nil
		}
		if n > 0 && rich < n {
			log.Printf("pokemon-data mangler stats (%d/%d) — re-seeder", rich, n)
		}
	}

	client := &http.Client{Timeout: 180 * time.Second}

	typesByID, err := loadTypeNames(ctx, client)
	if err != nil {
		return 0, err
	}
	typesByPokemon, err := loadPokemonTypes(ctx, client)
	if err != nil {
		return 0, err
	}
	species, err := loadSpeciesRich(ctx, client)
	if err != nil {
		return 0, err
	}
	statsByPokemon, err := loadPokemonStats(ctx, client)
	if err != nil {
		return 0, err
	}
	abilityNames, err := loadAbilityNames(ctx, client)
	if err != nil {
		return 0, err
	}
	abilitiesByPokemon, err := loadPokemonAbilities(ctx, client)
	if err != nil {
		return 0, err
	}
	genusBySpecies, err := loadGenusEN(ctx, client)
	if err != nil {
		return 0, err
	}
	flavorBySpecies, err := loadFlavorEN(ctx, client)
	if err != nil {
		return 0, err
	}
	colorNames, err := loadNamedEN(ctx, client, "pokemon_color_names.csv", 0, 1, 2)
	if err != nil {
		return 0, err
	}
	// Fallback til identifier hvis oversættelse mangler
	colorIDs, err := loadIDIdentifier(ctx, client, "pokemon_colors.csv")
	if err != nil {
		return 0, err
	}
	for id, ident := range colorIDs {
		if colorNames[id] == "" {
			colorNames[id] = ident
		}
	}
	habitatNames, err := loadNamedEN(ctx, client, "pokemon_habitat_names.csv", 0, 1, 2)
	if err != nil {
		return 0, err
	}
	shapeNames, err := loadIDIdentifier(ctx, client, "pokemon_shapes.csv")
	if err != nil {
		return 0, err
	}
	eggGroupNames, err := loadEggGroupNames(ctx, client)
	if err != nil {
		return 0, err
	}
	eggGroupsBySpecies, err := loadSpeciesEggGroups(ctx, client)
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
		if i == 0 || len(row) < 8 {
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

		st := statsByPokemon[id]
		abs := abilitiesByPokemon[id]
		abilityNamesList := make([]string, 0, len(abs))
		hidden := ""
		for _, a := range abs {
			an := abilityNames[a.id]
			if a.hidden {
				hidden = an
				continue
			}
			abilityNamesList = append(abilityNamesList, an)
		}

		sp := species[speciesID]
		var evolvesFrom *int
		var chainID *int
		if sp.evolvesFrom != nil {
			evolvesFrom = sp.evolvesFrom
		}
		if sp.chainID != nil {
			chainID = sp.chainID
		}

		eggIDs := eggGroupsBySpecies[speciesID]
		eggs := make([]string, 0, len(eggIDs))
		for _, eid := range eggIDs {
			if n, ok := eggGroupNames[eid]; ok {
				eggs = append(eggs, n)
			}
		}

		sprite := fmt.Sprintf("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/%d.png", id)
		shiny := fmt.Sprintf("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/%d.png", id)
		artwork := fmt.Sprintf("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/%d.png", id)

		_, err := tx.Exec(ctx, `
INSERT INTO go_pokemon (
  id, name, height, weight, base_experience, types, evolves_from_id, evolution_chain_id,
  is_default, sprite_url, species_id, hp, attack, defense, special_attack, special_defense, speed,
  abilities, hidden_ability, generation, color, habitat, shape, genus, flavor_text, egg_groups,
  capture_rate, base_happiness, gender_rate, hatch_counter, is_baby, is_legendary, is_mythical,
  artwork_url, shiny_sprite_url
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,
  $9,$10,$11,$12,$13,$14,$15,$16,$17,
  $18,$19,$20,$21,$22,$23,$24,$25,$26,
  $27,$28,$29,$30,$31,$32,$33,
  $34,$35
)`,
			id, name, height, weight, baseExp, typeNames, evolvesFrom, chainID,
			isDefault, sprite, speciesID, st.hp, st.attack, st.defense, st.spAtk, st.spDef, st.speed,
			abilityNamesList, hidden, sp.generation, colorNames[sp.colorID], habitatNames[sp.habitatID],
			shapeNames[sp.shapeID], genusBySpecies[speciesID], flavorBySpecies[speciesID], eggs,
			sp.captureRate, sp.baseHappiness, sp.genderRate, sp.hatchCounter,
			sp.isBaby, sp.isLegendary, sp.isMythical, artwork, shiny,
		)
		if err != nil {
			return 0, fmt.Errorf("insert pokemon %d: %w", id, err)
		}
		inserted++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	log.Printf("seeded %d pokemon (udvidet stats/abilities/species)", inserted)
	return inserted, nil
}

type speciesRich struct {
	evolvesFrom                            *int
	chainID                                *int
	generation, colorID, shapeID           int
	habitatID, genderRate, captureRate     int
	baseHappiness, hatchCounter            int
	isBaby, isLegendary, isMythical        bool
}

type pokeStats struct {
	hp, attack, defense, spAtk, spDef, speed int
}

type abilityRef struct {
	id     int
	hidden bool
	slot   int
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
	type slotPair struct{ tid, slot int }
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
	out := map[int][]int{}
	for pid, pairs := range tmp {
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

func loadSpeciesRich(ctx context.Context, client *http.Client) (map[int]speciesRich, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/pokemon_species.csv")
	if err != nil {
		return nil, err
	}
	out := map[int]speciesRich{}
	for i, row := range rows {
		if i == 0 || len(row) < 18 {
			continue
		}
		id, _ := strconv.Atoi(row[0])
		info := speciesRich{}
		info.generation, _ = strconv.Atoi(row[2])
		if strings.TrimSpace(row[3]) != "" {
			v, _ := strconv.Atoi(row[3])
			info.evolvesFrom = &v
		}
		if strings.TrimSpace(row[4]) != "" {
			v, _ := strconv.Atoi(row[4])
			info.chainID = &v
		}
		info.colorID, _ = strconv.Atoi(row[5])
		info.shapeID, _ = strconv.Atoi(row[6])
		if strings.TrimSpace(row[7]) != "" {
			info.habitatID, _ = strconv.Atoi(row[7])
		}
		info.genderRate, _ = strconv.Atoi(row[8])
		info.captureRate, _ = strconv.Atoi(row[9])
		info.baseHappiness, _ = strconv.Atoi(row[10])
		info.isBaby = row[11] == "1"
		info.hatchCounter, _ = strconv.Atoi(row[12])
		info.isLegendary = row[16] == "1"
		info.isMythical = row[17] == "1"
		out[id] = info
	}
	return out, nil
}

func loadPokemonStats(ctx context.Context, client *http.Client) (map[int]pokeStats, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/pokemon_stats.csv")
	if err != nil {
		return nil, err
	}
	out := map[int]pokeStats{}
	for i, row := range rows {
		if i == 0 || len(row) < 3 {
			continue
		}
		pid, _ := strconv.Atoi(row[0])
		sid, _ := strconv.Atoi(row[1])
		val, _ := strconv.Atoi(row[2])
		st := out[pid]
		switch sid {
		case 1:
			st.hp = val
		case 2:
			st.attack = val
		case 3:
			st.defense = val
		case 4:
			st.spAtk = val
		case 5:
			st.spDef = val
		case 6:
			st.speed = val
		}
		out[pid] = st
	}
	return out, nil
}

func loadAbilityNames(ctx context.Context, client *http.Client) (map[int]string, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/abilities.csv")
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

func loadPokemonAbilities(ctx context.Context, client *http.Client) (map[int][]abilityRef, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/pokemon_abilities.csv")
	if err != nil {
		return nil, err
	}
	out := map[int][]abilityRef{}
	for i, row := range rows {
		if i == 0 || len(row) < 4 {
			continue
		}
		pid, _ := strconv.Atoi(row[0])
		aid, _ := strconv.Atoi(row[1])
		hidden := row[2] == "1"
		slot, _ := strconv.Atoi(row[3])
		out[pid] = append(out[pid], abilityRef{id: aid, hidden: hidden, slot: slot})
	}
	for pid, list := range out {
		for i := 0; i < len(list); i++ {
			for j := i + 1; j < len(list); j++ {
				if list[j].slot < list[i].slot {
					list[i], list[j] = list[j], list[i]
				}
			}
		}
		out[pid] = list
	}
	return out, nil
}

func loadGenusEN(ctx context.Context, client *http.Client) (map[int]string, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/pokemon_species_names.csv")
	if err != nil {
		return nil, err
	}
	out := map[int]string{}
	for i, row := range rows {
		if i == 0 || len(row) < 4 {
			continue
		}
		if row[1] != "9" { // English
			continue
		}
		sid, _ := strconv.Atoi(row[0])
		out[sid] = row[3]
	}
	return out, nil
}

func loadFlavorEN(ctx context.Context, client *http.Client) (map[int]string, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/pokemon_species_flavor_text.csv")
	if err != nil {
		return nil, err
	}
	out := map[int]string{}
	for i, row := range rows {
		if i == 0 || len(row) < 4 {
			continue
		}
		if row[2] != "9" {
			continue
		}
		sid, _ := strconv.Atoi(row[0])
		if _, ok := out[sid]; ok {
			continue
		}
		text := strings.ReplaceAll(row[3], "\n", " ")
		text = strings.ReplaceAll(text, "\f", " ")
		text = strings.Join(strings.Fields(text), " ")
		out[sid] = text
	}
	return out, nil
}

// loadNamedEN: idCol, langCol, nameCol for *_names.csv with English (9).
func loadNamedEN(ctx context.Context, client *http.Client, file string, idCol, langCol, nameCol int) (map[int]string, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/"+file)
	if err != nil {
		return nil, err
	}
	out := map[int]string{}
	for i, row := range rows {
		if i == 0 || len(row) <= nameCol {
			continue
		}
		if row[langCol] != "9" {
			continue
		}
		id, _ := strconv.Atoi(row[idCol])
		out[id] = row[nameCol]
	}
	return out, nil
}

func loadIDIdentifier(ctx context.Context, client *http.Client, file string) (map[int]string, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/"+file)
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

func loadEggGroupNames(ctx context.Context, client *http.Client) (map[int]string, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/egg_groups.csv")
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

func loadSpeciesEggGroups(ctx context.Context, client *http.Client) (map[int][]int, error) {
	rows, err := fetchCSV(ctx, client, pokeCSVBase+"/pokemon_egg_groups.csv")
	if err != nil {
		return nil, err
	}
	out := map[int][]int{}
	for i, row := range rows {
		if i == 0 || len(row) < 2 {
			continue
		}
		sid, _ := strconv.Atoi(row[0])
		eid, _ := strconv.Atoi(row[1])
		out[sid] = append(out[sid], eid)
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
