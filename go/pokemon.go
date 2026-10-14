package main

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// Fælles SELECT til Pokémon-rækker (udvidet datasæt).
const pokeSelectCols = `
id, name, height, weight, base_experience, types, evolves_from_id, evolution_chain_id,
sprite_url, species_id, hp, attack, defense, special_attack, special_defense, speed,
abilities, hidden_ability, generation, color, habitat, shape, genus, flavor_text,
egg_groups, capture_rate, base_happiness, gender_rate, hatch_counter,
is_baby, is_legendary, is_mythical, artwork_url, shiny_sprite_url, is_default`

type pokeRow struct {
	ID, Height, Weight, BaseExp, SpeciesID     int
	HP, Attack, Defense, SpAtk, SpDef, Speed   int
	Generation, CaptureRate, BaseHappiness     int
	GenderRate, HatchCounter                   int
	Name, Sprite, HiddenAbility                string
	Color, Habitat, Shape, Genus, Flavor       string
	Artwork, Shiny                             string
	Types, Abilities, EggGroups                []string
	EvolvesFrom, Chain                         *int
	IsBaby, IsLegendary, IsMythical, IsDefault bool
}

type pokeScanner interface {
	Scan(dest ...any) error
}

func scanPoke(sc pokeScanner) (pokeRow, error) {
	var p pokeRow
	err := sc.Scan(
		&p.ID, &p.Name, &p.Height, &p.Weight, &p.BaseExp, &p.Types, &p.EvolvesFrom, &p.Chain,
		&p.Sprite, &p.SpeciesID, &p.HP, &p.Attack, &p.Defense, &p.SpAtk, &p.SpDef, &p.Speed,
		&p.Abilities, &p.HiddenAbility, &p.Generation, &p.Color, &p.Habitat, &p.Shape,
		&p.Genus, &p.Flavor, &p.EggGroups, &p.CaptureRate, &p.BaseHappiness, &p.GenderRate,
		&p.HatchCounter, &p.IsBaby, &p.IsLegendary, &p.IsMythical, &p.Artwork, &p.Shiny,
		&p.IsDefault,
	)
	return p, err
}

func (p pokeRow) toMap(full bool) map[string]any {
	m := map[string]any{
		"id": p.ID, "name": p.Name, "height": p.Height, "weight": p.Weight,
		"baseExperience": p.BaseExp, "types": p.Types, "evolvesFromId": p.EvolvesFrom,
		"evolutionChainId": p.Chain, "spriteUrl": p.Sprite,
		"generation": p.Generation,
		"stats": map[string]int{
			"hp": p.HP, "attack": p.Attack, "defense": p.Defense,
			"specialAttack": p.SpAtk, "specialDefense": p.SpDef, "speed": p.Speed,
		},
		"abilities":     p.Abilities,
		"hiddenAbility": nullIfEmpty(p.HiddenAbility),
		"isLegendary":   p.IsLegendary,
		"isMythical":    p.IsMythical,
		"artworkUrl":    p.Artwork,
	}
	if full {
		m["speciesId"] = p.SpeciesID
		m["color"] = p.Color
		m["habitat"] = nullIfEmpty(p.Habitat)
		m["shape"] = p.Shape
		m["genus"] = p.Genus
		m["flavorText"] = p.Flavor
		m["eggGroups"] = p.EggGroups
		m["captureRate"] = p.CaptureRate
		m["baseHappiness"] = p.BaseHappiness
		m["genderRate"] = p.GenderRate
		m["hatchCounter"] = p.HatchCounter
		m["isBaby"] = p.IsBaby
		m["shinySpriteUrl"] = p.Shiny
		m["isDefault"] = p.IsDefault
	}
	return m
}
