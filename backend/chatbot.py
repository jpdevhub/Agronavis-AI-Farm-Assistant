# Agronomy Chatbot — LLM Integration (Issue #55)
from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/chatbot", tags=["chatbot"])


class ChatRequest(BaseModel):
    message: str
    crop: Optional[str] = None
    soil_type: Optional[str] = None
    location: Optional[str] = None
    history: Optional[list[dict]] = []


class ChatResponse(BaseModel):
    reply: str
    success: bool


def _build_system_prompt(crop: str, soil_type: str, location: str) -> str:
    context_parts = []
    if crop:
        context_parts.append(f"Current crop: {crop}")
    if soil_type:
        context_parts.append(f"Soil type: {soil_type}")
    if location:
        context_parts.append(f"Farm location: {location}")

    context = "\n".join(context_parts) if context_parts else "No farm context provided."

    return f"""You are AgroBot, an expert agricultural assistant for farmers.
You provide practical, science-based advice on:
- Crop diseases and pest management
- Fertilizer recommendations
- Irrigation scheduling
- Weather impact on crops
- Soil health improvement
- Harvest timing

Farmer's current context:
{context}

Always give concise, actionable advice. Use simple language suitable for farmers.
If asked about something outside agriculture, politely redirect to farming topics."""


async def _call_gemini(system_prompt: str, history: list, message: str) -> str:
    import httpx

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return _fallback_response(message)

    messages = []
    for h in (history or []):
        if h.get("role") in ("user", "model"):
            messages.append({
                "role": h["role"],
                "parts": [{"text": h["content"]}]
            })
    messages.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": messages,
        "generationConfig": {"maxOutputTokens": 2048, "temperature": 0.7},
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    import asyncio as _asyncio
    for attempt in range(3):
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
        print(f"[chatbot] Gemini status={resp.status_code} (attempt {attempt + 1})")
        if resp.status_code == 200:
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        if resp.status_code == 503 and attempt < 2:
            await _asyncio.sleep(2 ** attempt)   # 1s, then 2s
            continue
        print(f"[chatbot] Gemini error body: {resp.text}")
        return _fallback_response(message)


def _fallback_response(message: str) -> str:
    """Simple rule-based fallback when no LLM key is configured."""
    msg = message.lower()
    if any(w in msg for w in ["disease", "pest", "blight", "rot", "fungus"]):
        return ("For crop diseases, inspect affected areas carefully. "
                "Remove infected plant parts, ensure good air circulation, "
                "and consider copper-based fungicides for fungal issues. "
                "Consult your local agricultural extension for specific treatments.")
    if any(w in msg for w in ["fertilizer", "nutrient", "nitrogen", "phosphorus"]):
        return ("A balanced NPK fertilizer works for most crops. "
                "For leafy crops, higher nitrogen helps. For root crops, more phosphorus. "
                "Always test your soil before applying fertilizers.")
    if any(w in msg for w in ["water", "irrigation", "drought"]):
        return ("Water crops early morning to reduce evaporation. "
                "Most crops need 1-2 inches of water per week. "
                "Check soil moisture 2 inches deep before irrigating.")
    if any(w in msg for w in ["harvest", "ready", "when to"]):
        return ("Harvest timing depends on your crop variety. "
                "Check seed packet guidelines and look for visual cues like "
                "color change, firmness, and size.")
    return ("I'm AgroBot, your farming assistant! "
            "I can help with crop diseases, fertilizers, irrigation, "
            "and harvest planning. What specific farming question do you have?")


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        system_prompt = _build_system_prompt(
            req.crop or "",
            req.soil_type or "",
            req.location or "",
        )
        reply = await _call_gemini(system_prompt, req.history or [], req.message)
        return ChatResponse(reply=reply, success=True)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))