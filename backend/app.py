"""
app.py — Hugging Face Spaces entry point
=========================================
HF Gradio Spaces run: python app.py
This file launches our FastAPI backend on port 7860 (HF default).
"""

import sys
import subprocess

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
