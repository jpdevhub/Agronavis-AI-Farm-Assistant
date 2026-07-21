import os
from huggingface_hub import hf_hub_download

def download_model():
    print("Downloading model weights from Hugging Face...")
    token = os.environ.get("HF_TOKEN")
    
    try:
        path = hf_hub_download(
            repo_id="karansingh12/agronavis-backend",
            repo_type="space",
            filename="model/plant_disease_resnet18.pth",
            token=token,
            local_dir=".", # Will download into ./model/plant_disease_resnet18.pth
        )
        print(f"✅ Successfully downloaded weights to: {path}")
    except Exception as e:
        print(f"❌ Failed to download model: {e}")
        print("Make sure HF_TOKEN environment variable is set if the Space is private.")
        exit(1)

if __name__ == "__main__":
    download_model()
