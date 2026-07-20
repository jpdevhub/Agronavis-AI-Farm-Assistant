"""
app.py — Hugging Face Spaces entry point
=========================================
HF Gradio Spaces run: python app.py
This file launches our FastAPI backend on port 7860 (HF default).
"""

import sys
import subprocess
import os
import importlib

# ── Fix 1: Ensure websockets 12.1 BEFORE any import ──────────────────────────
# HF's base Docker image installs websockets<12 as root into /usr/local/lib.
# supabase/realtime requires websockets.asyncio (added in 12.0).
# Strategy: install 12.1 to a private /tmp dir, prepend to sys.path, purge stale
# sys.modules entries, invalidate import caches, then explicitly pre-import it.
_WS_DIR = "/tmp/hf_ws_upgrade"
os.makedirs(_WS_DIR, exist_ok=True)
print("Installing websockets 12.1 to private dir...")
subprocess.check_call(
    [sys.executable, "-m", "pip", "install",
     "--target", _WS_DIR,
     "websockets==12.0", "--no-deps", "-q"],
)

# Step 2: Prepend to sys.path so our copy wins
sys.path.insert(0, _WS_DIR)

# Step 3: Purge any stale websockets entries from the module cache
for _key in list(sys.modules.keys()):
    if _key == "websockets" or _key.startswith("websockets."):
        del sys.modules[_key]

# Step 4: Invalidate the import finder cache
importlib.invalidate_caches()

# Step 5: Pre-import now so supabase/realtime finds it already loaded correctly
import websockets  # noqa: E402
print(f"websockets {websockets.__version__} loaded from {websockets.__file__}")

# Hack to bypass Hugging Face ZeroGPU strict torch version validator bugs.
# We install torchvision dynamically WITHOUT touching the pre-installed torch.
try:
    import torchvision
except ImportError:
    print("Installing torchvision dynamically...")
    import torch
    
    # Map torch version to matching torchvision version
    # Include HF's known typo'd ZeroGPU versions (e.g. 2.11.0 is actually 2.1.1 under the hood)
    tv_map = {
        "2.0.0": "0.15.1", "2.0.1": "0.15.2",
        "2.1.0": "0.16.0", "2.1.1": "0.16.1", "2.1.2": "0.16.2",
        "2.2.0": "0.17.0", "2.2.1": "0.17.1", "2.2.2": "0.17.2",
        "2.3.0": "0.18.0", "2.3.1": "0.18.1", "2.4.0": "0.19.0",
        # HF ZeroGPU custom versions
        "2.11.0": "0.16.1", # Typo for 2.1.1
        "2.10.0": "0.16.0", # Typo for 2.1.0
        "2.9.1": "0.15.2",  # Typo for 2.0.1
        "2.8.0": "0.15.1",  # Typo for 2.0.0
    }
    base_ver = torch.__version__.split("+")[0]
    tv_ver = tv_map.get(base_ver, "0.18.0")
    print(f"Detected torch={torch.__version__}, installing torchvision=={tv_ver}...")
    
    subprocess.check_call([sys.executable, "-m", "pip", "install", f"torchvision=={tv_ver}", "--no-deps"])

import uvicorn
from main import app  # noqa: F401

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=7860,
        workers=1,
        log_level="info",
    )
