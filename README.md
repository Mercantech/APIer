# APIer

API’er med data til elevopgaver på tværs af hovedforløb.

**Host:** [https://api-opgaver.mercantec.tech](https://api-opgaver.mercantec.tech)

## Arkitektur

```text
Browser → Cloudflare → Traefik → gateway (nginx)
                              ├─ /            → apier-web (katalog)
                              ├─ /go/*        → go-api
                              └─ /api|/Opgaver|/LeagueOfLegends|/swagger
                                              → opgaver-api (.NET)
                                                 ├─ opgaver-db (Postgres)
                                                 └─ opgaver-mongo
```

| Mappe | Service | Rolle |
|-------|---------|--------|
| `gateway/` | `gateway` | Nginx API-gateway (eneste offentlige entry) |
| `web/` | `apier-web` | Endpoint-katalog (datakilde + sprog + server) |
| `go/` | `go-api` | Golang backend (`/go/...`) |
| rod (C#) | `opgaver-api` | OpgaverAPI .NET 9 |

## Endpoints

### Web / Go
| Endpoint | Beskrivelse |
|----------|-------------|
| `GET /` | Katalogside (datakilde, sprog, server) |
| `GET /demo` | Demo-oversigt (Pokémon, Minecraft, LoL, Countries, Spil) |
| `GET /demo/pokemon` | Live Pokémon-demo (Go API) |
| `GET /demo/minecraft` | Live Minecraft-demo (Go API) |
| `GET /demo/lol` | Live LoL-demo (.NET, kræver X-Api-Key) |
| `GET /demo/countries` | Live Countries-demo (.NET / Mongo) |
| `GET /demo/spil` | Mini-spil oven på API-data (craft, champ, flag, alfabet, …) |
| `GET /go/` | Go-service info |
| `GET /go/health` | Go health |
| `GET /go/pokemon` | Pokémon (Postgres, PokeAPI CSV) |
| `GET /go/pokemon/{id}` | Én Pokémon |
| `GET /go/pokemon/types` | Typer |
| `GET /go/pokemon/type/{type}` | Efter type |
| `GET /go/pokemon/{id}/evolutions` | Evolution chain |
| `GET /go/minecraft/items` | Minecraft items (PrismarineJS) |
| `GET /go/minecraft/blocks` | Blocks |
| `GET /go/minecraft/mobs` | Mobs |
| `GET /go/minecraft/biomes` | Biomes |
| `GET /go/minecraft/recipes` | Recipes |
| `GET /go/minecraft/recipes/{name}` | Recipe for item |
| `POST /go/seed` | Force re-seed (`X-Seed-Key`) |

### .NET OpgaverAPI
| Endpoint | Beskrivelse |
|----------|-------------|
| `GET /Opgaver/Diesel` | Dieselpriser (JSON) |
| `GET /Opgaver/Miles95` | Miles95-priser |
| `GET /Opgaver/Bilbasen` | Bilbasen-data |
| `GET /Opgaver/Wordle` | Wordle-ord |
| `GET /Opgaver/CountriesRAW` | Rå lande-data |
| `GET /Opgaver/Stats` | Kaldestatistik |
| `GET /api/Countries` | Lande (Mongo) |
| `POST /api/Countries/bulk` | Seed lande (`X-Seed-Key`) |
| `GET /LeagueOfLegends*` | Champions (Postgres) — kræver `X-Api-Key` |
| `POST /LeagueOfLegends/bulk` | Seed champions (`X-Seed-Key`) |
| `POST /LeagueOfLegends/sync-images` | Spejl champion-billeder fra Data Dragon → MinIO (`X-Seed-Key`) |
| `GET /assets/lol/champions/{id}.png` | Lokale champion-ikoner (MinIO via gateway) |
| `GET/POST/DELETE /api/ApiKeys` | Elev-API-nøgler (Mercantec Bearer) |
| `/swagger` | OpenAPI UI |

## Auth og API-nøgler

1. Log ind på kataloget via **Mercantec Auth** (OAuth PKCE, klient `apier-web`).
2. Under **API-nøgler** opret en nøgle — plaintext vises **én gang**. Hold den hemmelig.
3. Kald beskyttede endpoints med header `X-Api-Key: apier_…`.
4. League of Legends GET er bag API-nøgle; `/Opgaver/*` m.m. er stadig offentlige.

## Lokal kørsel

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

- Katalog: [http://localhost:8080/](http://localhost:8080/)
- Swagger: [http://localhost:8080/swagger](http://localhost:8080/swagger)
- Go: [http://localhost:8080/go/health](http://localhost:8080/go/health)

## Fremtid

Flere backends (Node, Rust): tilføj mappe + service med unikt navn, og en `location` i [`gateway/nginx.conf`](gateway/nginx.conf). C# kan senere flyttes til `opgaver/`.
