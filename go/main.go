package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	ctx := context.Background()
	pool, err := connectDB(ctx)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	if err := migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	api := &api{db: pool}
	stats := newGoStatsTracker(pool)

	// Baggrunds-seed hvis tom (første start)
	go func() {
		bg, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		if n, err := seedPokemon(bg, pool, false); err != nil {
			log.Printf("auto-seed pokemon: %v", err)
		} else {
			log.Printf("pokemon klar (%d)", n)
		}
		if m, err := seedMinecraft(bg, pool, false); err != nil {
			log.Printf("auto-seed minecraft: %v", err)
		} else {
			log.Printf("minecraft klar (%v)", m)
		}
	}()

	mux := http.NewServeMux()

	mux.HandleFunc("/go/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"status":  "ok",
			"service": "go-api",
			"time":    time.Now().UTC(),
		})
	})

	mux.HandleFunc("/go/seed", api.handleSeed)

	mux.HandleFunc("/go/pokemon/types", api.handlePokemonTypes)
	mux.HandleFunc("/go/pokemon/generations", api.handlePokemonGenerations)
	mux.HandleFunc("/go/pokemon/legendary", api.handlePokemonLegendary)
	mux.HandleFunc("/go/pokemon/type/", func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/go/pokemon/type/")
		name = strings.Trim(name, "/")
		if name == "" {
			http.NotFound(w, r)
			return
		}
		api.handlePokemonByType(w, r, name)
	})
	mux.HandleFunc("/go/pokemon/generation/", func(w http.ResponseWriter, r *http.Request) {
		gen := strings.TrimPrefix(r.URL.Path, "/go/pokemon/generation/")
		gen = strings.Trim(gen, "/")
		if gen == "" {
			http.NotFound(w, r)
			return
		}
		api.handlePokemonByGeneration(w, r, gen)
	})
	mux.HandleFunc("/go/pokemon/", func(w http.ResponseWriter, r *http.Request) {
		rest := strings.TrimPrefix(r.URL.Path, "/go/pokemon/")
		rest = strings.Trim(rest, "/")
		if rest == "" {
			api.handlePokemonList(w, r)
			return
		}
		parts := strings.Split(rest, "/")
		if len(parts) == 2 && parts[1] == "evolutions" {
			api.handlePokemonEvolutions(w, r, parts[0])
			return
		}
		if len(parts) == 1 {
			api.handlePokemonOne(w, r, parts[0])
			return
		}
		http.NotFound(w, r)
	})
	mux.HandleFunc("/go/pokemon", api.handlePokemonList)

	mux.HandleFunc("/go/minecraft/items", func(w http.ResponseWriter, r *http.Request) {
		api.handleMCList(w, r, "go_mc_items")
	})
	mux.HandleFunc("/go/minecraft/blocks", func(w http.ResponseWriter, r *http.Request) {
		api.handleMCList(w, r, "go_mc_blocks")
	})
	mux.HandleFunc("/go/minecraft/mobs", func(w http.ResponseWriter, r *http.Request) {
		api.handleMCList(w, r, "go_mc_mobs")
	})
	mux.HandleFunc("/go/minecraft/biomes", func(w http.ResponseWriter, r *http.Request) {
		api.handleMCList(w, r, "go_mc_biomes")
	})
	mux.HandleFunc("/go/minecraft/recipes/", func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/go/minecraft/recipes/")
		name = strings.Trim(name, "/")
		if name == "" {
			api.handleMCRecipes(w, r)
			return
		}
		api.handleMCRecipeOne(w, r, name)
	})
	mux.HandleFunc("/go/minecraft/recipes", api.handleMCRecipes)

	mux.HandleFunc("/go/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/go/" && r.URL.Path != "/go" {
			http.NotFound(w, r)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"service": "go-api",
			"message": "Golang backend — Pokémon + Minecraft i Postgres",
			"routes": []string{
				"/go/health",
				"/go/seed",
				"/go/pokemon",
				"/go/pokemon?generation=1&type=fire&q=chu",
				"/go/pokemon/{id}",
				"/go/pokemon/types",
				"/go/pokemon/generations",
				"/go/pokemon/generation/{n}",
				"/go/pokemon/legendary",
				"/go/pokemon/type/{type}",
				"/go/pokemon/{id}/evolutions",
				"/go/minecraft/items",
				"/go/minecraft/blocks",
				"/go/minecraft/mobs",
				"/go/minecraft/biomes",
				"/go/minecraft/recipes",
				"/go/minecraft/recipes/{name}",
			},
		})
	})

	addr := ":8080"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}
	log.Printf("go-api listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, stats.middleware(mux)))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
