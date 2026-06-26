"""
AgroNavis — Python/FastAPI Backend
====================================
Single-process server handling:
  • All farm/crop/resource/soil/yield/profile CRUD (replaces Node.js/Express)
  • ML inference: ResNet18 plant disease detection + CLIP OOD guard
  • Disease wiki (Supabase crop_diseases table)
  • DuckDuckGo wiki search

Architecture:
  Frontend (Next.js) → FastAPI (:8000) → Supabase DB
  Frontend uses Supabase JS SDK *only* for auth session management.

Deployment targets:
  Frontend  → Vercel
  Backend   → Hugging Face Spaces (Dockerfile) or Railway
  Database  → Supabase (cloud)
"""

import os
import io
import json
import uuid
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from typing import List, Optional, Any, Dict
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from chatbot import router as chatbot_router
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Try to load root .env first, fallback to current dir
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

# ── Supabase client ──────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is required in .env")

# Service-role client — used for DB operations after JWT is verified
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)

# ── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="AgroNavis API",
    description="Farm intelligence + crop disease detection backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Tighten to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ── Auth helper ──────────────────────────────────────────────────────────────

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Validates the Supabase JWT supplied by the frontend.
    Returns the authenticated user object (so RLS-equivalent logic can use user.id).
    """
    token = credentials.credentials
    print("Token received:", token[:10])
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            print("verify_token failed: No user returned")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user_response.user
    except HTTPException:
        raise
    except Exception as e:
        print("verify_token exception:", str(e))
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)}")


# ── ML Setup ─────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(__file__)

# Image normalisation (ImageNet statistics)
_mean = [0.485, 0.456, 0.406]
_std  = [0.229, 0.224, 0.225]
inference_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(_mean, _std),
])

# Load class names
CLASS_NAMES_PATH = os.path.join(BASE_DIR, "model", "class_names.json")
with open(CLASS_NAMES_PATH, "r") as f:
    CLASS_NAMES: List[str] = json.load(f)
NUM_CLASSES = len(CLASS_NAMES)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ResNet18 model
resnet_model = models.resnet18(weights=None)
resnet_model.fc = nn.Linear(resnet_model.fc.in_features, NUM_CLASSES)
MODEL_PATH = os.path.join(BASE_DIR, "model", "plant_disease_resnet18.pth")

if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 0:
    try:
        resnet_model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        resnet_model = resnet_model.to(device)
        resnet_model.eval()
        print(f"[OK] ResNet18 loaded -- {NUM_CLASSES} classes on {device}")
    except Exception as e:
        print(f"[WARN] Failed to load model weights: {e}. Inference will fail.")
else:
    print(f"[WARN] Model weights not found or empty at {MODEL_PATH}. Inference will fail.")

# CLIP model (OOD guard) — lazy load to keep startup fast
clip_model = None
clip_processor = None

def load_clip():
    global clip_model, clip_processor
    if clip_model is not None:
        return
    try:
        from transformers import CLIPModel, CLIPProcessor
        print("Loading CLIP (OOD guard)...")
        clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
        clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        print("[OK] CLIP loaded")
    except Exception as e:
        print(f"[WARN] CLIP unavailable: {e}")


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    predicted_disease_name: str
    confidence_score: float
    is_healthy: bool
    crop_type: Optional[str] = None
    symptoms: List[str]
    recommended_action: List[str]

class FarmCreate(BaseModel):
    name: str
    total_area: float = 0.0
    address: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    ownership_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class FarmUpdate(BaseModel):
    name: Optional[str] = None
    total_area: Optional[float] = None
    address: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    ownership_type: Optional[str] = None

class CropCreate(BaseModel):
    farm_id: str
    crop_type: str
    variety: Optional[str] = None
    area_allocated: float
    sowing_date: Optional[str] = None
    expected_harvest_date: Optional[str] = None
    season: Optional[str] = None
    current_growth_stage: Optional[str] = None
    yield_expectation: Optional[float] = None

class CropUpdate(BaseModel):
    crop_type: Optional[str] = None
    variety: Optional[str] = None
    area_allocated: Optional[float] = None
    sowing_date: Optional[str] = None
    expected_harvest_date: Optional[str] = None
    season: Optional[str] = None
    current_growth_stage: Optional[str] = None
    yield_expectation: Optional[float] = None

class ProfileCreate(BaseModel):
    full_name: str
    phone_number: str
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    years_of_experience: Optional[int] = None
    education_level: Optional[str] = None

class ResourceCreate(BaseModel):
    farm_id: str
    resource_type: str
    quantity: int = 1
    condition: Optional[str] = None

class YieldCreate(BaseModel):
    farm_id: str
    crop_type: str
    variety: Optional[str] = None
    season: Optional[str] = None
    year: int
    quantity: float
    unit: str = "kg"
    quality_notes: Optional[str] = None

class FieldCreate(BaseModel):
    name: str
    area_acres: float
    polygon: List[Dict[str, float]]
    center_latitude: Optional[float] = None
    center_longitude: Optional[float] = None


class FieldResponse(BaseModel):
    id: str
    farm_id: str
    name: str
    area_acres: float
    area_hectares: Optional[float] = None
    polygon: List[Dict[str, float]]
    center_latitude: Optional[float] = None
    center_longitude: Optional[float] = None
    created_at: Optional[str] = None

class SoilEstimationRequest(BaseModel):
    farm_id: str
    state: str
    district: str

class SoilHealthInput(BaseModel):
    ph: float
    nitrogen: float
    phosphorus: float
    potassium: float
    organic_matter: Optional[float] = None

class YieldPredictionRequest(BaseModel):
    crop_type: str
    soil_health: SoilHealthInput

class YieldPredictionResponse(BaseModel):
    farm_id: str
    crop_type: str
    area_hectares: float
    predicted_yield_tons: float
    confidence: str


# ── Utility ──────────────────────────────────────────────────────────────────

def _format_class_name(raw: str) -> str:
    """Convert 'tomato_early_blight' → 'Tomato Early Blight'"""
    return raw.replace("_", " ").title()

def _extract_crop_type(class_name: str) -> str:
    """Extract crop from class name prefix, e.g. 'tomato_early_blight' → 'Tomato'"""
    parts = class_name.split("_")
    if parts[0] == "healthy":
        return parts[1].title() if len(parts) > 1 else "Unknown"
    return parts[0].title()


def _get_disease_data(class_name: str) -> dict:
    """Fetch disease info from Supabase crop_diseases table by class_key."""
    try:
        res = supabase.table("crop_diseases").select("symptoms, treatment") \
            .eq("class_key", class_name).limit(1).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        print(f"[WARN] DB lookup failed for {class_name}: {e}")
    return {}

def _get_symptoms(class_name: str) -> List[str]:
    data = _get_disease_data(class_name)
    return data.get("symptoms") or ["No disease symptoms detected" if class_name.startswith("healthy_") else f"Consult an agronomist for {_format_class_name(class_name)} symptoms"]

def _get_treatments(class_name: str) -> List[str]:
    data = _get_disease_data(class_name)
    return data.get("treatment") or ["Continue current management practices" if class_name.startswith("healthy_") else f"Consult an agronomist for {_format_class_name(class_name)} treatment"]


# ── ML Inference ─────────────────────────────────────────────────────────────

def run_inference(image_bytes: bytes) -> PredictionResponse:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # OOD check with CLIP
    load_clip()
    if clip_model is not None and clip_processor is not None:
        candidate_labels = [
            "a photo of a plant leaf or crop",
            "a photo of a person or face",
            "a photo of an animal",
            "a photo of a random object or background scene",
        ]
        inputs = clip_processor(text=candidate_labels, images=image, return_tensors="pt", padding=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            clip_out = clip_model(**inputs)
            probs = clip_out.logits_per_image.softmax(dim=1)
        top_prob, top_idx = probs[0].max(dim=0)
        if top_idx.item() != 0 and top_prob.item() > 0.85:
            return PredictionResponse(
                predicted_disease_name="No Crop Found",
                confidence_score=round(top_prob.item() * 100, 2),
                is_healthy=False,
                symptoms=["Image does not appear to be a plant leaf or crop."],
                recommended_action=["Please upload a clear close-up photo of a plant leaf or crop."],
            )

    # ResNet18 inference
    tensor = inference_transforms(image).unsqueeze(0).to(device)
    with torch.no_grad():
        out = resnet_model(tensor)
        probs = torch.nn.functional.softmax(out[0], dim=0)
        conf, idx = torch.max(probs, 0)

    class_name = CLASS_NAMES[idx.item()]
    is_healthy = class_name.startswith("healthy_")

    return PredictionResponse(
        predicted_disease_name=_format_class_name(class_name),
        confidence_score=round(conf.item() * 100, 2),
        is_healthy=is_healthy,
        crop_type=_extract_crop_type(class_name),
        symptoms=_get_symptoms(class_name),
        recommended_action=_get_treatments(class_name),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "agronavis-api",
        "version": "2.0.0",
        "model_classes": NUM_CLASSES,
    }


# ── Debug ─────────────────────────────────────────────────────────────────────

@app.get("/api/debug/classes")
async def debug_classes():
    return {
        "total_classes": NUM_CLASSES,
        "classes": {str(i): name for i, name in enumerate(CLASS_NAMES)},
    }


# ── ML Inference ─────────────────────────────────────────────────────────────

@app.post("/api/diagnose", response_model=PredictionResponse)
async def diagnose(
    file: UploadFile = File(...),
    farm_id: Optional[str] = Query(None),
    crop_id: Optional[str] = Query(None),
    user=Depends(verify_token),
):
    """
    Upload a plant image → ResNet18 classification + CLIP OOD guard.
    Optionally saves result to crop_scans table if farm_id provided.
    """
    ext = (file.filename or "").lower().split(".")[-1]
    if ext not in {"png", "jpg", "jpeg", "webp"}:
        raise HTTPException(status_code=400, detail="Only PNG/JPG/JPEG/WEBP images are accepted")

    # Validate file size (10MB limit)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    if hasattr(file, "size") and file.size is not None:
        if file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Payload Too Large: Maximum allowed image size is 10MB."
            )
    else:
        # Fallback check by seeking
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Payload Too Large: Maximum allowed image size is 10MB."
            )

    contents = await file.read()
    result = run_inference(contents)

    # Save scan to DB if farm_id is provided
    if farm_id:
        try:
            supabase.table("crop_scans").insert({
                "farm_id": farm_id,
                "crop_id": crop_id,
                "image_url": "",   # Can be updated if you upload to Storage
                "detected_disease": result.predicted_disease_name,
                "confidence_score": result.confidence_score,
                "recommendation": " | ".join(result.recommended_action),
            }).execute()
        except Exception as e:
            print(f"Warning: could not save scan to DB: {e}")

    return result


# ── Scan history ──────────────────────────────────────────────────────────────

@app.get("/api/crop-scans")
async def get_scans(farm_id: Optional[str] = Query(None), user=Depends(verify_token)):
    """Get scan history for the authenticated user's farms."""
    try:
        q = supabase.table("crop_scans").select(
            "*, farms!inner(farmer_id, name)"
        )
        if farm_id:
            q = q.eq("farm_id", farm_id)
        else:
            q = q.eq("farms.farmer_id", user.id)
        res = q.order("scan_date", desc=True).limit(50).execute()
        return {"success": True, "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profile ───────────────────────────────────────────────────────────────────

@app.get("/api/profile")
async def get_profile(user=Depends(verify_token)):
    res = supabase.table("farmers").select("*").eq("id", user.id).limit(1).execute()
    return {"success": True, "data": (res.data[0] if res.data else None)}

@app.post("/api/profile")
async def upsert_profile(body: ProfileCreate, user=Depends(verify_token)):
    payload = {**body.model_dump(exclude_none=True), "id": user.id}
    res = supabase.table("farmers").upsert(payload).execute()
    return {"success": True, "data": (res.data[0] if res.data else None)}


# ── Farms ─────────────────────────────────────────────────────────────────────

@app.get("/api/farms")
async def get_farms(user=Depends(verify_token)):
    res = supabase.table("farms").select("*").eq("farmer_id", user.id).execute()
    return {"success": True, "data": res.data}

@app.get("/api/farms/summary")
async def get_farms_summary(user=Depends(verify_token)):
    res = supabase.table("farms").select(
        "id, name, total_area, soil_type, irrigation_type, location, crops(id, crop_type, current_growth_stage)"
    ).eq("farmer_id", user.id).execute()
    return {"success": True, "data": res.data}

@app.get("/api/farms/{farm_id}")
async def get_farm(farm_id: str, user=Depends(verify_token)):
    res = supabase.table("farms").select("*").eq("id", farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Farm not found")
    return {"success": True, "data": (res.data[0] if res.data else None)}

@app.get("/api/farms/{farm_id}/details")
async def get_farm_details(farm_id: str, user=Depends(verify_token)):
    res = supabase.table("farms").select(
        "*, crops(*), soil_health_history(*), yield_history(*)"
    ).eq("id", farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Farm not found")
    return {"success": True, "data": (res.data[0] if res.data else None)}

@app.post("/api/farms", status_code=201)
async def create_farm(body: FarmCreate, user=Depends(verify_token)):
    location = body.location or {}
    if body.latitude is not None:
        location["latitude"] = body.latitude
    if body.longitude is not None:
        location["longitude"] = body.longitude

    payload = {
        "farmer_id": user.id,
        "name": body.name,
        "total_area": body.total_area,
        "address": body.address,
        "location": location,
        "soil_type": body.soil_type,
        "irrigation_type": body.irrigation_type,
        "ownership_type": body.ownership_type,
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    res = supabase.table("farms").insert(payload).execute()
    return {"success": True, "data": (res.data[0] if res.data else None)}

@app.put("/api/farms/{farm_id}")
async def update_farm(farm_id: str, body: FarmUpdate, user=Depends(verify_token)):
    # Verify ownership
    owned = supabase.table("farms").select("id").eq("id", farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")

    # Merge location with existing
    updates = body.model_dump(exclude_none=True)
    if "location" in updates:
        existing = supabase.table("farms").select("location").eq("id", farm_id).limit(1).execute()
        current_loc = existing.data[0].get("location") or {}
        updates["location"] = {**current_loc, **updates["location"]}

    res = supabase.table("farms").update(updates).eq("id", farm_id).execute()
    return {"success": True, "data": (res.data[0] if res.data else None)}

@app.delete("/api/farms/{farm_id}")
async def delete_farm(farm_id: str, user=Depends(verify_token)):
    owned = supabase.table("farms").select("id").eq("id", farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    supabase.table("farms").delete().eq("id", farm_id).execute()
    return {"success": True, "message": "Farm deleted"}


# ── Farm Fields (Polygon) ─────────────────────────────────────────────────────

@app.get("/api/farms/{farm_id}/fields")
async def get_fields(
    farm_id: str,
    user: dict = Depends(verify_token),
) -> dict:
    # Verify farm ownership before returning fields
    owned = (
        supabase.table("farms")
        .select("id")
        .eq("id", farm_id)
        .eq("farmer_id", user.id)
        .limit(1)
        .execute()
    )
    if not owned.data:
        raise HTTPException(status_code=404, detail="Farm not found")

    res = (
        supabase.table("farm_fields")
        .select("*")
        .eq("farm_id", farm_id)
        .order("created_at")
        .execute()
    )
    return {"success": True, "data": res.data or []}


@app.post("/api/farms/{farm_id}/fields", status_code=201)
async def add_field(
    farm_id: str,
    body: FieldCreate,
    user: dict = Depends(verify_token),
) -> dict:
    # Verify farm ownership
    owned = (
        supabase.table("farms")
        .select("id")
        .eq("id", farm_id)
        .eq("farmer_id", user.id)
        .limit(1)
        .execute()
    )
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")

    payload: dict = {
        "farm_id": farm_id,
        "name": body.name,
        "area_acres": body.area_acres,
        "polygon": body.polygon,
        "center_latitude": body.center_latitude,
        "center_longitude": body.center_longitude,
    }
    # Strip None values so DB defaults apply
    payload = {k: v for k, v in payload.items() if v is not None}

    res = supabase.table("farm_fields").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save field")

    return {"success": True, "data": res.data[0]}


@app.delete("/api/farms/{farm_id}/fields/{field_id}")
async def delete_field(
    farm_id: str,
    field_id: str,
    user: dict = Depends(verify_token),
) -> dict:
    # Verify farm ownership
    owned = (
        supabase.table("farms")
        .select("id")
        .eq("id", farm_id)
        .eq("farmer_id", user.id)
        .limit(1)
        .execute()
    )
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase.table("farm_fields").delete().eq("id", field_id).eq("farm_id", farm_id).execute()
    return {"success": True, "message": "Field deleted"}


# ── Crops ─────────────────────────────────────────────────────────────────────

@app.get("/api/crops/farm/{farm_id}")
async def get_farm_crops(farm_id: str, user=Depends(verify_token)):
    owned = supabase.table("farms").select("id").eq("id", farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    res = supabase.table("crops").select("*").eq("farm_id", farm_id).order("created_at", desc=True).execute()
    return res.data or []

@app.post("/api/crops", status_code=201)
async def create_crop(body: CropCreate, user=Depends(verify_token)):
    owned = supabase.table("farms").select("id").eq("id", body.farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    res = supabase.table("crops").insert(body.model_dump(exclude_none=True)).execute()
    return {"success": True, "data": (res.data[0] if res.data else None)}

@app.put("/api/crops/{crop_id}")
async def update_crop(crop_id: str, body: CropUpdate, user=Depends(verify_token)):
    # Verify through farm ownership
    crop = supabase.table("crops").select("farm_id").eq("id", crop_id).limit(1).execute()
    if not crop.data:
        raise HTTPException(status_code=404, detail="Crop not found")
    owned = supabase.table("farms").select("id").eq("id", crop.data[0]["farm_id"]).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    res = supabase.table("crops").update(body.model_dump(exclude_none=True)).eq("id", crop_id).execute()
    return {"success": True, "data": (res.data[0] if res.data else None)}

@app.delete("/api/crops/{crop_id}")
async def delete_crop(crop_id: str, user=Depends(verify_token)):
    crop = supabase.table("crops").select("farm_id").eq("id", crop_id).limit(1).execute()
    if not crop.data:
        raise HTTPException(status_code=404, detail="Crop not found")
    owned = supabase.table("farms").select("id").eq("id", crop.data[0]["farm_id"]).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    supabase.table("crops").delete().eq("id", crop_id).execute()
    return {"success": True, "message": "Crop deleted"}


# ── Resources ─────────────────────────────────────────────────────────────────

@app.get("/api/resources")
async def get_resources(farm_id: Optional[str] = Query(None), user=Depends(verify_token)):
    if farm_id:
        owned = supabase.table("farms").select("id").eq("id", farm_id).eq("farmer_id", user.id).limit(1).execute()
        if not owned.data:
            raise HTTPException(status_code=403, detail="Access denied")
        res = supabase.table("farm_resources").select("*").eq("farm_id", farm_id).execute()
    else:
        res = supabase.table("farm_resources").select(
            "*, farms!inner(farmer_id)"
        ).eq("farms.farmer_id", user.id).execute()
    return {"success": True, "data": res.data}

@app.post("/api/resources", status_code=201)
async def create_resource(body: ResourceCreate, user=Depends(verify_token)):
    owned = supabase.table("farms").select("id").eq("id", body.farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    res = supabase.table("farm_resources").insert(body.model_dump(exclude_none=True)).execute()
    return {"success": True, "data": (res.data[0] if res.data else None)}

@app.delete("/api/resources/{resource_id}")
async def delete_resource(resource_id: str, user=Depends(verify_token)):
    resource = supabase.table("farm_resources").select("farm_id").eq("id", resource_id).limit(1).execute()
    if not resource.data:
        raise HTTPException(status_code=404, detail="Resource not found")
    owned = supabase.table("farms").select("id").eq("id", resource.data[0]["farm_id"]).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    supabase.table("farm_resources").delete().eq("id", resource_id).execute()
    return {"success": True, "message": "Resource deleted"}


# ── Soil Health ───────────────────────────────────────────────────────────────

@app.get("/api/soil-health/farm/{farm_id}")
async def get_soil_health(farm_id: str, user=Depends(verify_token)):
    owned = supabase.table("farms").select("id").eq("id", farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    res = supabase.table("soil_health_history").select("*").eq("farm_id", farm_id).order("created_at", desc=True).execute()
    return {"success": True, "data": res.data}

@app.post("/api/soil-estimation")
async def estimate_soil(body: SoilEstimationRequest, user=Depends(verify_token)):
    """Calls the Supabase SQL function insert_estimated_soil_history."""
    owned = supabase.table("farms").select("id").eq("id", body.farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        res = supabase.rpc("insert_estimated_soil_history", {
            "p_farm_id": body.farm_id,
            "p_state": body.state,
            "p_district": body.district,
        }).execute()
        return {"success": True, "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Yield Prediction 

BASE_YIELD_TONS_PER_HA: Dict[str, float] = {
    "wheat":       3.5,
    "rice":        4.0,
    "maize":       3.0,
    "corn":        3.0,
    "sugarcane":  70.0,
    "cotton":      1.8,
    "tomato":     25.0,
    "potato":     20.0,
    "soybean":     1.5,
    "groundnut":   1.8,
    "barley":      2.8,
    "sorghum":     1.5,
    "millet":      1.2,
    "chickpea":    1.0,
    "lentil":      1.0,
}

def _compute_polygon_area_hectares(polygon: list[dict]) -> float:
    """
    Replicates geoUtils.calculatePolygonArea using the Shoelace formula.
    Expects polygon as list of {lat, lng} dicts — same shape stored by FieldCreate.
    Returns area in hectares.
    """
    if len(polygon) < 3:
        return 0.0

    
    avg_lat = sum(p["lat"] for p in polygon) / len(polygon)
    lat_to_m = 111320.0
    lng_to_m = 111320.0 * abs(__import__("math").cos(__import__("math").radians(avg_lat)))

    coords = [(p["lng"] * lng_to_m, p["lat"] * lat_to_m) for p in polygon]
    n = len(coords)
    area_sq_m = abs(
        sum(
            coords[i][0] * coords[(i + 1) % n][1] -
            coords[(i + 1) % n][0] * coords[i][1]
            for i in range(n)
        )
    ) / 2.0

    return area_sq_m / 10_000.0


def _soil_modifier(soil: SoilHealthInput) -> float:
    """
    Returns a multiplier (0.5 – 1.2) based on soil health inputs.
    pH sweet-spot: 6.0–7.5. N/P/K scored against ideal ranges.
    """
    import math

    
    ph_score = max(0.0, 1.0 - abs(soil.ph - 6.75) / 3.0)

    
    n_score = min(soil.nitrogen / 140.0, 1.0)
    p_score = min(soil.phosphorus / 30.0,  1.0)
    k_score = min(soil.potassium / 200.0,  1.0)

    
    om_score = min((soil.organic_matter or 1.5) / 3.0, 1.0)

    raw = (ph_score * 0.25 + n_score * 0.25 + p_score * 0.20 + k_score * 0.20 + om_score * 0.10)

    
    return round(0.5 + raw * 0.7, 4)


@app.post("/api/farms/{farm_id}/yield-prediction", response_model=YieldPredictionResponse)
async def predict_yield(
    farm_id: str,
    body: YieldPredictionRequest,
    user=Depends(verify_token),
):
    
    farm_res = supabase.table("farms").select(
        "id, location, total_area"
    ).eq("id", farm_id).eq("farmer_id", user.id).limit(1).execute()

    if not farm_res.data:
        raise HTTPException(status_code=404, detail="Farm not found")

    farm = farm_res.data[0]
    location = farm.get("location") or {}
    fields: list = location.get("fields", [])

    if fields:
        area_ha = sum(
            _compute_polygon_area_hectares(f.get("polygon", []))
            for f in fields
        )
    else:
        area_acres = farm.get("total_area") or 0.0
        area_ha = area_acres / 2.471

    if area_ha <= 0:
        raise HTTPException(
            status_code=400,
            detail="Farm has no area data. Draw a field polygon first or set total_area."
        )

    crop_key = body.crop_type.lower().strip()
    base_yield = BASE_YIELD_TONS_PER_HA.get(crop_key)
    if base_yield is None:
        raise HTTPException(
            status_code=400,
            detail=f"Crop type '{body.crop_type}' not supported. Supported: {list(BASE_YIELD_TONS_PER_HA.keys())}"
        )

    modifier = _soil_modifier(body.soil_health)
    predicted_tons = round(area_ha * base_yield * modifier, 2)

    confidence = "high" if modifier >= 0.85 else "medium" if modifier >= 0.65 else "low"

    return YieldPredictionResponse(
        farm_id=farm_id,
        crop_type=body.crop_type,
        area_hectares=round(area_ha, 4),
        predicted_yield_tons=predicted_tons,
        confidence=confidence,
    )


# ── Yields ────────────────────────────────────────────────────────────────────

@app.get("/api/yields/farm/{farm_id}")
async def get_yields(farm_id: str, user=Depends(verify_token)):
    owned = supabase.table("farms").select("id").eq("id", farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    res = supabase.table("yield_history").select("*").eq("farm_id", farm_id).order("year", desc=True).execute()
    return {"success": True, "data": res.data}

@app.post("/api/yields", status_code=201)
async def create_yield(body: YieldCreate, user=Depends(verify_token)):
    owned = supabase.table("farms").select("id").eq("id", body.farm_id).eq("farmer_id", user.id).limit(1).execute()
    if not owned.data:
        raise HTTPException(status_code=403, detail="Access denied")
    res = supabase.table("yield_history").insert(body.model_dump(exclude_none=True)).execute()
    return {"success": True, "data": (res.data[0] if res.data else None)}


# ── Crop Varieties (public) ───────────────────────────────────────────────────

@app.get("/api/crop-varieties")
async def get_crop_varieties():
    res = supabase.table("crop_varieties").select("*").execute()
    return {"success": True, "data": res.data}


# ── Disease Wiki ──────────────────────────────────────────────────────────────

@app.get("/api/wiki/diseases")
async def get_all_diseases(user=Depends(verify_token)):
    res = supabase.table("crop_diseases").select("*").order("crop_type").execute()
    return res.data

@app.get("/api/wiki/diseases/{disease_id}")
async def get_disease(disease_id: str, user=Depends(verify_token)):
    # disease_id can be either a UUID or a class_key like "tomato_early_blight"
    res = supabase.table("crop_diseases").select("*").eq("class_key", disease_id).limit(1).execute()
    if not res.data:
        # fallback: try by UUID id
        res = supabase.table("crop_diseases").select("*").eq("id", disease_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Disease not found")
    return res.data[0]

@app.get("/api/wiki/search")
async def search_wiki(q: str, category: str = "All Topics", user=Depends(verify_token)):
    try:
        from duckduckgo_search import DDGS
        query = f"{q} {category}" if category and category != "All Topics" else q
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=10):
                results.append({"title": r.get("title"), "href": r.get("href"), "body": r.get("body")})
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Chatbot ───────────────────────────────────────────────────────────────────
from fastapi import Depends
app.include_router(chatbot_router, dependencies=[Depends(verify_token)])


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
