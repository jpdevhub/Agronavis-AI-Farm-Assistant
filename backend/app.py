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
    subprocess.check_call([sys.executable, "-m", "pip", "install", "torchvision", "--no-deps"])

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
