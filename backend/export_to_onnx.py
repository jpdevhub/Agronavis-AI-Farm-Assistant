import os
import json
import torch
import torch.nn as nn
from torchvision import models

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
CLASS_NAMES_PATH = os.path.join(MODEL_DIR, "class_names.json")
MODEL_PATH = os.path.join(MODEL_DIR, "plant_disease_resnet18.pth")

# Output paths
FRONTEND_PUBLIC_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "public")
ONNX_MODEL_DIR = os.path.join(FRONTEND_PUBLIC_DIR, "model")
os.makedirs(ONNX_MODEL_DIR, exist_ok=True)
ONNX_PATH = os.path.join(ONNX_MODEL_DIR, "plant_disease_resnet18.onnx")

def export_model():
    # Load class names
    with open(CLASS_NAMES_PATH, "r") as f:
        class_names = json.load(f)
    num_classes = len(class_names)

    print(f"[INFO] Loaded {num_classes} class names from {CLASS_NAMES_PATH}")

    # Instantiate the ResNet18 model
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)

    # Load local fine-tuned weights if available
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 0:
        print(f"[INFO] Loading fine-tuned weights from {MODEL_PATH}...")
        try:
            model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
            print("[INFO] Weights loaded successfully.")
        except Exception as e:
            print(f"[ERROR] Failed to load model weights: {e}")
            raise
    else:
        raise FileNotFoundError(
            f"Fine-tuned model weights not found at {MODEL_PATH}. "
            "Please ensure you have placed the trained ResNet18 model (.pth file) in the backend/model/ directory before exporting."
        )

    model.eval()

    # Preprocessing dummy input matching ImageNet requirements: 1 image, 3 channels, 224x224 shape
    dummy_input = torch.randn(1, 3, 224, 224, requires_grad=False)

    print(f"[INFO] Exporting PyTorch model to ONNX format at {ONNX_PATH}...")
    torch.onnx.export(
        model,
        dummy_input,
        ONNX_PATH,
        export_params=True,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
    )
    print(f"[SUCCESS] ONNX model exported to {ONNX_PATH}")

    # Apply 8-bit dynamic quantization if onnxruntime is available
    try:
        import onnxruntime
        from onnxruntime.quantization import quantize_dynamic, QuantType
        
        QUANT_ONNX_PATH = os.path.join(ONNX_MODEL_DIR, "plant_disease_resnet18_quant.onnx")
        print(f"[INFO] onnxruntime is installed. Performing 8-bit dynamic quantization to {QUANT_ONNX_PATH}...")
        
        quantize_dynamic(
            model_input=ONNX_PATH,
            model_output=QUANT_ONNX_PATH,
            weight_type=QuantType.QUInt8
        )
        print("[SUCCESS] Quantization complete.")
        
        # Replace the larger float32 file with the quantized version to save space (46MB -> 11MB)
        if os.path.exists(QUANT_ONNX_PATH) and os.path.getsize(QUANT_ONNX_PATH) > 0:
            os.replace(QUANT_ONNX_PATH, ONNX_PATH)
            print(f"[INFO] Replaced {ONNX_PATH} with the quantized model (~11.6MB).")
    except ImportError:
        print("[WARN] onnxruntime is not installed. Skipping dynamic quantization. The output model will be standard float32 (~46.8MB).")
    except Exception as e:
        print(f"[ERROR] Quantization failed: {e}")

if __name__ == "__main__":
    export_model()
