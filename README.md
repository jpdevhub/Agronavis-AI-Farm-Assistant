# AgroNavis

AI-powered smart farm monitoring platform — crop disease detection, farm management, and weather intelligence as a Progressive Web App.

[![CI](https://github.com/YOUR_ORG/agronavis/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/agronavis/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

AgroNavis is an open-source PWA that helps farmers monitor crops, detect plant diseases via YOLOv8 AI, manage multiple farms with GPS precision, and receive hyper-local weather-based irrigation recommendations. It supports English, Hindi, and Bengali and works offline.

**Services**
| Service | Stack | Port |
|---|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS | 3000 |
| Backend API | Express.js, TypeScript | 3001 |
| ML Service | FastAPI, YOLOv8, PyTorch | 8001 |
| Database | Supabase (PostgreSQL + RLS) | — |

---

## Prerequisites

- Node.js 18+
- Python 3.9+
- Docker & Docker Compose (for Docker setup)
- [Supabase](https://supabase.com) account
- [OpenWeatherMap](https://openweathermap.org/api) API key

---

## Quick Start

### Option A — Docker (recommended)

```bash
git clone https://github.com/YOUR_ORG/agronavis.git
cd agronavis

cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env
# Fill in your credentials in each file

docker-compose up -d --build
```

Access: Frontend `http://localhost:3000` | API `http://localhost:3001` | ML `http://localhost:8001`

### Option B — Local development

```bash
git clone https://github.com/YOUR_ORG/agronavis.git
cd agronavis

# Install all dependencies
npm run install:all

# Copy and fill env files
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env

# Terminal 1 — frontend + backend
npm run dev

# Terminal 2 — ML service
cd backend/ml-service
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

---

## Environment Variables

### Root / Backend (`backend/.env`)

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
DATABASE_URL=postgresql://postgres:password@localhost:5432/agronavis
JWT_SECRET=
CORS_ORIGIN=http://localhost:3000
PORT=3001
NODE_ENV=development
WEATHER_API_KEY=
ML_SERVICE_URL=http://localhost:8001
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WEATHER_API_KEY=
```

---

## Database Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy your Project URL and anon/service keys into the env files.
3. Run migrations:

```bash
cd backend
npm run db:link   # link to your Supabase project
npm run db:push   # apply all migrations
```

---

## Project Structure

```
agronavis/
├── frontend/               # Next.js PWA
│   └── src/
│       ├── components/     # UI components
│       ├── pages/          # Routes
│       ├── hooks/          # Custom React hooks
│       ├── auth/           # Auth logic
│       ├── utils/          # API helpers
│       └── styles/
├── backend/                # Express API
│   ├── src/
│   │   ├── routes/         # REST endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, CORS
│   │   └── lib/            # DB client
│   ├── ml-service/         # FastAPI + YOLOv8
│   │   ├── main.py
│   │   ├── src/
│   │   └── models/         # Trained model weights (not committed)
│   └── supabase/
│       └── migrations/     # SQL migrations
├── .env.example
├── docker-compose.yml
└── package.json            # Monorepo scripts
```

---

## API Reference

All protected endpoints require `Authorization: Bearer <token>`.

**Auth**
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

**Farms**
```
GET    /api/farms
POST   /api/farms
GET    /api/farms/:id
PUT    /api/farms/:id
DELETE /api/farms/:id
GET    /api/farms/:id/details
```

**Crops**
```
GET    /api/crops
POST   /api/crops
GET    /api/crops/:id
PUT    /api/crops/:id
DELETE /api/crops/:id
```

**AI Analysis**
```
POST /api/ml/analyze-image         # base64 image
POST /api/ml/analyze-image-upload  # multipart file
GET  /api/ml/models/info
```

**Other**
```
GET /api/farmers, POST, PUT
GET /api/soil-health, POST
GET /api/resources, POST
GET /api/yields, POST
```

Error responses follow a consistent shape:
```json
{ "success": false, "error": "message", "code": "ERROR_CODE" }
```

---

## Running Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

---

## Deployment

**Frontend** — Vercel: push to `main`, import repo in Vercel, set env vars.

**Backend** — any Node.js host (Railway, Fly.io, Heroku). Set all backend env vars.

**ML Service** — any Python host or Docker container. Ensure model weights are present at `backend/ml-service/models/`.

Note: Model weight files (`.pt`, `.onnx`) are excluded from the repo via `.gitignore`. Download or train your own and place them in `backend/ml-service/models/`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)