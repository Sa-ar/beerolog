# Beerolog API

Python FastAPI backend. Handles recommendations, user profiles, venues, group sessions, and social features.

## Requirements

- Python 3.12+

## Setup

```bash
python3.12 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
# Fill in .env — see env var table below
```

## Running

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
# API at http://localhost:8000
# OpenAPI docs at http://localhost:8000/docs
```

## Tests

```bash
source .venv/bin/activate
pytest
```

Tests never hit a real database — every service has an `InMemory*Repo` used via FastAPI `dependency_overrides`. Safe to run without any services configured.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Neon PostgreSQL connection string |
| `OPENAI_API_KEY` | yes | — | OpenAI secret key |
| `COGNITO_USER_POOL_ID` | yes | — | e.g. `us-east-1_abc123` |
| `COGNITO_CLIENT_ID` | yes | — | App client ID (not the secret) |
| `COGNITO_REGION` | no | `us-east-1` | Region where user pool was created |
| `API_SECRET` | no | `dev-secret` | HS256 secret for QR and challenge tokens |

> **Production**: `API_SECRET` defaults to `dev-secret`. This **must** be set to a random secret in Railway before going live. See [docs/services/railway.md](../../docs/services/railway.md).

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/recommendations` | Get beer recommendations for a flavor vector |
| `PUT` | `/venues/{id}/tap-list` | Set venue tap list |
| `GET` | `/venues/{id}/tap-list` | Get venue tap list |
| `POST` | `/venues/{id}/scan` | Scan menu image for beers |
| `GET` | `/scan/{token}` | Resolve QR token to tap list |
| `GET` | `/venues/{id}/leaderboard` | Venue recommendation leaderboard |
| `POST` | `/sessions` | Create group session |
| `POST` | `/sessions/{id}/join` | Join group session |
| `POST` | `/sessions/{id}/submit` | Submit flavor vector |
| `GET` | `/sessions/{id}/status` | Session status |
| `GET` | `/sessions/{id}/recommend` | Group recommendation |
| `GET` | `/users/me/profile` | Get flavor vector profile |
| `PUT` | `/users/me/profile` | Save flavor vector profile |
| `GET` | `/users/me/history` | Beer history |
| `POST` | `/users/me/history` | Add to history |
| `GET` | `/users/me/persona` | Get persona classification |
| `POST` | `/users/me/rate` | Rate a beer (loved / fine / disliked) |
| `POST` | `/challenges` | Create friend challenge token |
| `POST` | `/challenges/{token}/compare` | Compare flavor vectors |
