---
title: EstateIQ API
emoji: 🏠
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# EstateIQ API

FastAPI backend for EstateIQ: NER, sentiment, intent and lead scoring for
real-estate call transcripts, with lead storage in Postgres (Supabase).

## Endpoints

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | public |
| POST | `/webhook/vapi` | public (Vapi end-of-call reports) |
| POST | `/analyze` | public |
| GET | `/leads`, `/leads/{id}`, `/analytics` | Supabase login token |
| PATCH | `/leads/{id}/status` | Supabase login token |

## Configuration (environment / Space secrets)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Supabase Session pooler) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Verify admin login tokens |
| `HF_TOKEN`, `HF_REPO_ID` | Download the model weights from the private model repo on first start |
| `PORT` | Defaults to `7860` in the Docker image |

The model weights (~2 GB) are not stored in git or in the image; the first
start downloads them, so it takes a few minutes before `/health` responds.

## Run locally

```bash
python -m api.run                                   # http://localhost:8000
docker build -t estateiq-api .
docker run -p 7860:7860 --env-file .env estateiq-api   # http://localhost:7860
```
