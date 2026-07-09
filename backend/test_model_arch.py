"""
test_model_arch.py — Model Architecture Self-Test
===================================================
Runs before every HF Space deployment in CI.
Validates that:
  1. class_names.json loads correctly
  2. ResNet18 instantiates with the correct head (512 -> NUM_CLASSES)
  3. The .pth weights load without key mismatch errors
  4. A dummy forward pass produces output of shape [1, NUM_CLASSES]

Exit code 1 on any failure — blocks the push to HF Space.
"""

import sys
import json
import os

def main():
    print("=" * 55)
    print("AgroNavis Model Architecture Self-Test")
    print("=" * 55)

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODEL_DIR = os.path.join(BASE_DIR, "model")
    CLASS_NAMES_PATH = os.path.join(MODEL_DIR, "class_names.json")
    MODEL_PATH = os.path.join(MODEL_DIR, "plant_disease_resnet18.pth")

    # ── 1. Load class names ──────────────────────────────────────
    print("\n[1/4] Loading class names...")
    if not os.path.exists(CLASS_NAMES_PATH):
        print(f"FAIL: class_names.json not found at {CLASS_NAMES_PATH}")
        sys.exit(1)

    with open(CLASS_NAMES_PATH) as f:
        class_names = json.load(f)

    num_classes = len(class_names)
    print(f"  OK — {num_classes} classes loaded")
    print(f"  First 3: {class_names[:3]}")

    # ── 2. Instantiate model ─────────────────────────────────────
    print("\n[2/4] Instantiating ResNet18 model...")
    try:
        import torch
        import torch.nn as nn
        from torchvision import models

        model = models.resnet18(weights=None)
        in_features = model.fc.in_features  # should be 512
        model.fc = nn.Linear(in_features, num_classes)
        print(f"  OK — ResNet18 with fc=Linear({in_features} → {num_classes})")
    except Exception as e:
        print(f"FAIL: Could not instantiate model: {e}")
        sys.exit(1)

    # ── 3. Load weights ──────────────────────────────────────────
    print("\n[3/4] Loading .pth weights...")
    if not os.path.exists(MODEL_PATH):
        print(f"FAIL: Weights not found at {MODEL_PATH}")
        print("  The .pth file must be present in backend/model/ before deploying.")
        sys.exit(1)

    file_size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
    print(f"  Found weights file: {file_size_mb:.1f} MB")

    try:
        state_dict = torch.load(MODEL_PATH, map_location="cpu")
        model.load_state_dict(state_dict)
        model.eval()
        print("  OK — weights loaded, no key mismatch")
    except RuntimeError as e:
        print(f"FAIL: Weight loading error — likely architecture mismatch:")
        print(f"  {e}")
        sys.exit(1)
    except Exception as e:
        print(f"FAIL: Unexpected error loading weights: {e}")
        sys.exit(1)

    # ── 4. Dummy forward pass ────────────────────────────────────
    print("\n[4/4] Running dummy inference (224x224 RGB)...")
    try:
        dummy = torch.randn(1, 3, 224, 224)
        with torch.no_grad():
            output = model(dummy)

        assert output.shape == (1, num_classes), (
            f"Expected output shape (1, {num_classes}), got {output.shape}"
        )
        print(f"  OK — output shape: {list(output.shape)}")
        probs = torch.nn.functional.softmax(output[0], dim=0)
        top_conf, top_idx = torch.max(probs, 0)
        print(f"  Top prediction on dummy: class {top_idx.item()} "
              f"({class_names[top_idx.item()]}) "
              f"conf={top_conf.item()*100:.2f}%")
    except AssertionError as e:
        print(f"FAIL: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"FAIL: Inference failed: {e}")
        sys.exit(1)

    print("\n" + "=" * 55)
    print("ALL CHECKS PASSED — safe to deploy to HF Space")
    print("=" * 55)

if __name__ == "__main__":
    main()
