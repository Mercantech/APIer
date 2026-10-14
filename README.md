# APIer

API’er med data til elevopgaver på tværs af hovedforløb.

**V1 host:** [https://api-opgaver.mercantec.tech](https://api-opgaver.mercantec.tech) (Swagger: `/swagger`)

## V1 — OpgaverAPI (.NET 9)

C# API importeret fra [Mercantech/OpgaverAPI](https://github.com/Mercantech/OpgaverAPI).

### Nyttige endpoints

| Endpoint | Beskrivelse |
|----------|-------------|
| `GET /Opgaver/Diesel` | Dieselpriser (JSON) |
| `GET /Opgaver/Miles95` | Miles95-priser |
| `GET /Opgaver/Bilbasen` | Bilbasen-data |
| `GET /Opgaver/Wordle` | Wordle-ord |
| `GET /Opgaver/CountriesRAW` | Rå lande-data |
| `GET /Opgaver/Stats` | Kaldestatistik |
| `GET /api/Countries` | Lande via controller |
| `GET /api/Users` | Brugere (JWT, rolle) |
| `/swagger` | OpenAPI UI |

### Lokal kørsel

```bash
cp .env.example .env
# redigér passwords og JWT_KEY i .env
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Åbn [http://localhost:5104/swagger](http://localhost:5104/swagger).

### Compose-services

- `opgaver-api` — ASP.NET Core (unik alias, klar til senere gateway)
- `db` — Postgres (internt net)
- `mongo` — MongoDB (internt net)

På Dokploy hænger kun `opgaver-api` på `dokploy-network` (Traefik).

## Fremtid (ikke V1)

Når flere backends kommer (Node, Go, Rust):

1. Flyt denne C#-app til `opgaver/`
2. Tilføj `gateway/` foran
3. Hold unik service-alias pr. backend (undgå generisk `api` på det delte Dokploy-net)
