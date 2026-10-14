# APIer

API’er med data til elevopgaver på tværs af hovedforløb.

**Host:** [https://api-opgaver.mercantec.tech](https://api-opgaver.mercantec.tech)

## Arkitektur

```text
Browser → Cloudflare → Traefik → gateway (nginx)
                              ├─ /go/*        → go-api
                              └─ /*           → opgaver-api (.NET)
                                                 ├─ opgaver-db (Postgres)
                                                 └─ opgaver-mongo
```

| Mappe | Service | Rolle |
|-------|---------|--------|
| `gateway/` | `gateway` | Nginx API-gateway (eneste offentlige entry) |
| `go/` | `go-api` | Golang backend (`/go/...`) |
| rod (C#) | `opgaver-api` | OpgaverAPI .NET 9 |

## Endpoints

### Gateway / Go
| Endpoint | Beskrivelse |
|----------|-------------|
| `GET /go/` | Go-service info |
| `GET /go/health` | Go health |

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
| `GET /LeagueOfLegends` | Champions (Postgres) |
| `POST /LeagueOfLegends/bulk` | Seed champions (`X-Seed-Key`) |
| `/swagger` | OpenAPI UI |

## Lokal kørsel

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

- Gateway: [http://localhost:8080/swagger](http://localhost:8080/swagger)
- Go: [http://localhost:8080/go/health](http://localhost:8080/go/health)

## Fremtid

Flere backends (Node, Rust): tilføj mappe + service med unikt navn, og en `location` i [`gateway/nginx.conf`](gateway/nginx.conf). C# kan senere flyttes til `opgaver/`.
