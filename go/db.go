package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func connectDB(ctx context.Context) (*pgxpool.Pool, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL mangler")
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 8
	cfg.MinConns = 1
	cfg.MaxConnLifetime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

func migrate(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS go_pokemon (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  height INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 0,
  base_experience INTEGER NOT NULL DEFAULT 0,
  types TEXT[] NOT NULL DEFAULT '{}',
  evolves_from_id INTEGER NULL,
  evolution_chain_id INTEGER NULL,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  sprite_url TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ix_go_pokemon_name ON go_pokemon (name);
CREATE INDEX IF NOT EXISTS ix_go_pokemon_types ON go_pokemon USING GIN (types);

CREATE TABLE IF NOT EXISTS go_mc_items (
  id INTEGER NOT NULL,
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  stack_size INTEGER NOT NULL DEFAULT 64,
  raw JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS go_mc_blocks (
  id INTEGER NOT NULL,
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  hardness DOUBLE PRECISION NULL,
  stack_size INTEGER NOT NULL DEFAULT 64,
  diggable BOOLEAN NOT NULL DEFAULT TRUE,
  raw JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS go_mc_mobs (
  id INTEGER NOT NULL,
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  width DOUBLE PRECISION NULL,
  height DOUBLE PRECISION NULL,
  category TEXT NOT NULL DEFAULT '',
  raw JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS go_mc_biomes (
  id INTEGER NOT NULL,
  name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  temperature DOUBLE PRECISION NULL,
  rainfall DOUBLE PRECISION NULL,
  raw JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS go_mc_recipes (
  id TEXT PRIMARY KEY,
  result_name TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 1,
  ingredients JSONB NOT NULL DEFAULT '[]',
  raw JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS ix_go_mc_recipes_result ON go_mc_recipes (result_name);
`)
	return err
}
