---
title: AgroNavis Backend
emoji: 🌱
colorFrom: green
colorTo: blue
sdk: gradio
sdk_version: 4.44.1
app_file: app.py
pinned: false
---

# AgroNavis Backend API

FastAPI backend for the AgroNavis AI Farm Assistant platform.

## Endpoints

- `GET /health` — Health check
- `GET /docs` — Swagger UI
- `POST /api/diagnose` — Plant disease detection (ResNet18 + CLIP)
- `POST /api/v1/chatbot/chat` — AgroBot chatbot
- Full CRUD for farms, crops, yields, soil health

## Model

ResNet18 fine-tuned on 86 plant disease classes (PlantVillage dataset).
CLIP used as OOD guard to reject non-plant images.
