# Deployment

## Frontend — Vercel

1. Push to GitHub.
2. Import the `frontend/` directory in [Vercel](https://vercel.com).
3. Set environment variables (see `frontend/.env.local.example`).
4. Vercel auto-deploys on every push to `main`.

## Backend — Railway / Fly.io / Heroku

1. Create a new service pointing to the `backend/` directory.
2. Set all env vars from `backend/.env.example`.
3. Start command: `npm start`

## ML Service — Docker

```bash
cd backend/ml-service
docker build -t agronavis-ml .
docker run -p 8001:8001 -v $(pwd)/models:/app/models agronavis-ml
```

Ensure model weights are present in `models/` before starting.

## Full Stack — Docker Compose

```bash
cp .env.example .env  # fill in all values
docker-compose up -d --build
```

Services: frontend `:3000`, backend `:3001`, postgres `:5432`, redis `:6379`.
