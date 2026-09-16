"""
VOICEGUARD Backend Configuration
Central configuration for model paths, CORS, and app settings.
"""
from pathlib import Path

# ── Root paths ────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[3]   # d:/VOICEGUARD-REBUILD
MODELS_DIR = REPO_ROOT / "models"
ML_DIR = REPO_ROOT / "ml"

# ── Model checkpoint paths ─────────────────────────────────────────────────────
AASIST_CHECKPOINT = MODELS_DIR / "AASIST_HF" / "AASIST.pth"
AASIST_ARCH_DIR = ML_DIR / "aasist" / "models"

RAWNET2_CHECKPOINT = MODELS_DIR / "RawNet2" / "best.pt"
RAWNET2_ARCH_DIR = ML_DIR / "aasist" / "models"

HUBERT_MODEL_DIR = MODELS_DIR / "HuBERT_XL"
HUBERT_SAFETENSORS = MODELS_DIR / "HuBERT_XL" / "model.safetensors"

W2V2_AASIST_CHECKPOINT = MODELS_DIR / "W2V2_AASIST" / "LA_model.pth"
W2V2_XLSR_BASE = MODELS_DIR / "xlsr2_300m.pt"

DF_ARENA_MODEL_DIR = MODELS_DIR / "DF_Arena"
DF_ARENA_CHECKPOINT = MODELS_DIR / "DF_Arena" / "pytorch_model.bin"

# ── Audio preprocessing constants ─────────────────────────────────────────────
TARGET_SAMPLE_RATE = 16000
FIXED_WINDOW_SAMPLES = 64600          # ~4.04 s at 16 kHz, used by AASIST / W2V2
RAWNET2_WINDOW_SAMPLES = 64000        # 4 s at 16 kHz, used by RawNet2
MAX_FILE_SIZE_MB = 50
MIN_DURATION_S = 0.5
MAX_DURATION_S = 120.0
SUPPORTED_FORMATS = {".wav", ".mp3", ".flac", ".m4a", ".ogg"}

# ── Server / CORS ──────────────────────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:5173",   # Vite default
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
API_PREFIX = "/api"
APP_TITLE = "VOICEGUARD API"
APP_VERSION = "1.0.0"
