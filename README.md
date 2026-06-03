# AgroNavis

AI-powered smart farm monitoring platform — crop disease detection, farm management, and weather intelligence as a Progressive Web App.

[![CI](https://github.com/YOUR_ORG/agronavis/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/agronavis/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

AgroNavis is an open-source PWA that helps farmers monitor crops, detect plant diseases via AI (ResNet18), manage multiple farms with GPS precision, and receive hyper-local weather-based irrigation recommendations. It supports multiple languages and works offline.

**Services**

| Service | Stack | Port |
|---|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS | 3000 |
| Backend API | Python FastAPI, PyTorch (ResNet18) | 8000 |
| Database | Supabase (PostgreSQL + RLS) | — |

*(Note: The legacy Node.js Express server and separate YOLO ML service have been deprecated and consolidated into a single highly-efficient Python FastAPI backend).*

---

## Prerequisites

- Node.js 18+
- Python 3.9+
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (for local database)
- [OpenWeatherMap](https://openweathermap.org/api) API key (optional, for weather features)

---

## Local Development (Quick Start)

We use a unified environment approach to make contributing as easy as possible.

### 1. Setup Environment

```bash
git clone https://github.com/YOUR_ORG/agronavis.git
cd agronavis

# Create the single root .env file from the template
cp .env.example .env
```

*Note: The `.env.example` comes pre-configured with the default local Supabase credentials. You only need to add external API keys if you want to test those specific features.*

### 2. Setup Local Database

```bash
cd backend
supabase start
supabase db push
cd ..
```

*This spins up a local Supabase instance (Postgres, Auth, Storage) and applies all schema migrations.*

### 3. Install Dependencies

```bash
# Frontend
npm install --prefix frontend

# Backend (Using pip or uv)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 4. Run the App

From the **root directory** of the project, run:

```bash
npm run dev
```

This command uses `concurrently` to start both the Next.js frontend (on port 3000) and the FastAPI backend (on port 8000).

---

## Project Structure

```
agronavis/
├── frontend/               # Next.js 14 PWA
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Next.js Routes
│   │   ├── hooks/          # Custom React hooks
│   │   ├── auth/           # Supabase Auth logic
│   │   └── utils/          # API helpers
├── backend/                # Python FastAPI Backend
│   ├── main.py             # Single-file API server (CRUD + ML)
│   ├── requirements.txt    # Python dependencies
│   ├── model/              # PyTorch model weights & class names
│   └── supabase/
│       └── migrations/     # SQL schema migrations
├── .env.example            # Master environment template
└── package.json            # Monorepo scripts
```

---

## Model Weights

The CropScan AI uses a fine-tuned ResNet18 model for plant disease detection.
If the `plant_disease_resnet18.pth` weights are not present in `backend/model/`, the backend will fallback to a dummy model or fail to start. Contact the maintainers for the weights or train your own and place them in the `backend/model/` directory.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.
We welcome issues, feature requests, and pull requests!

## Security

See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
