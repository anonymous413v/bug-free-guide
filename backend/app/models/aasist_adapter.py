"""
AASIST Model Adapter
=====================
Checkpoint: models/AASIST_HF/AASIST.pth  (1.3 MB)
Architecture: ml/aasist/models/AASIST.py (clovaai/aasist)
Score direction: higher raw score = more bona fide

AASIST takes raw 16 kHz mono waveforms padded to 64 600 samples and outputs
2-class logits [spoof_logit, bonafide_logit]. The bona-fide logit is the score.

Score is NOT a calibrated probability. It is a logit and should be treated as
a ranking score only.
"""
from __future__ import annotations
import sys
import time
import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import torch

from app.core.config import AASIST_CHECKPOINT, AASIST_ARCH_DIR, FIXED_WINDOW_SAMPLES
from app.models.base_adapter import BaseModelAdapter
from app.schemas.model_schema import ModelAvailability, ModelCard
from app.utils.audio_utils import pad_fixed

logger = logging.getLogger(__name__)


def _build_model(arch_dir: Path, config_path: Path) -> torch.nn.Module:
    """Build an AASIST model from the clovaai/aasist AASIST.py source."""
    # Temporarily add arch dir to sys.path so we can import the architecture
    arch_str = str(arch_dir)
    if arch_str not in sys.path:
        sys.path.insert(0, arch_str)
    # Read model config
    with open(config_path, "r") as f:
        cfg = json.load(f)
    model_cfg = cfg["model_config"]
    # Import AASIST architecture
    from AASIST import Model  # type: ignore[import]
    model = Model(model_cfg)
    return model


class AASISTAdapter(BaseModelAdapter):
    name = "aasist"
    display_name = "AASIST"

    def __init__(self) -> None:
        super().__init__()
        self._model: Optional[torch.nn.Module] = None
        self._config_path = AASIST_ARCH_DIR.parent / "config" / "AASIST.conf"

    def is_available(self) -> bool:
        return (
            AASIST_CHECKPOINT.exists()
            and AASIST_ARCH_DIR.exists()
            and (AASIST_ARCH_DIR / "AASIST.py").exists()
            and self._config_path.exists()
        )

    def load(self) -> None:
        if self._loaded:
            return
        logger.info("Loading AASIST model from %s", AASIST_CHECKPOINT)
        try:
            model = _build_model(AASIST_ARCH_DIR, self._config_path)
            state = torch.load(AASIST_CHECKPOINT, map_location="cpu", weights_only=True)
            model.load_state_dict(state)
            model.eval()
            self._model = model
            self._loaded = True
            logger.info("AASIST loaded successfully (%.2f MB)", AASIST_CHECKPOINT.stat().st_size / 1e6)
        except Exception as e:
            self._load_error = str(e)
            logger.error("AASIST load failed: %s", e)
            raise RuntimeError(f"AASIST load failed: {e}") from e

    def unload(self) -> None:
        self._model = None
        self._loaded = False

    def predict(self, waveform: np.ndarray, sample_rate: int) -> dict:
        if not self._loaded or self._model is None:
            raise RuntimeError("AASIST model is not loaded")
        t0 = time.perf_counter()
        try:
            # Pad/crop to fixed 64600 samples
            windowed = pad_fixed(waveform, FIXED_WINDOW_SAMPLES)
            # Shape: (1, T)
            x = torch.from_numpy(windowed).unsqueeze(0)  # (1, 64600)
            with torch.inference_mode():
                _, output = self._model(x)   # returns (hidden, logits) — shape (1, 2)
            logits = output[0]  # (2,)
            spoof_logit = float(logits[0])
            bonafide_logit = float(logits[1])
            # Higher bonafide_logit → more bona fide. Use bonafide as the score.
            raw_score = bonafide_logit
            label = "BONAFIDE" if raw_score > 0.0 else "SPOOF"
            exec_time = time.perf_counter() - t0
            return {
                "success": True,
                "label": label,
                "raw_score": raw_score,
                "bonafide_probability": None,
                "score_is_calibrated": False,
                "notes": f"Raw bona-fide logit: {raw_score:.4f}. Higher = more bona fide.",
                "execution_time_s": exec_time,
            }
        except Exception as e:
            logger.error("AASIST predict failed: %s", e)
            return {
                "success": False,
                "label": None,
                "raw_score": None,
                "bonafide_probability": None,
                "score_is_calibrated": False,
                "notes": None,
                "execution_time_s": time.perf_counter() - t0,
                "error": str(e),
            }

    def card(self) -> ModelCard:
        ckpt = AASIST_CHECKPOINT
        availability = ModelAvailability.AVAILABLE if self.is_available() else ModelAvailability.MISSING
        if self._loaded:
            availability = ModelAvailability.READY
        elif self._load_error:
            availability = ModelAvailability.ERROR
        return ModelCard(
            id=self.name,
            name="AASIST",
            description=(
                "Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks. "
                "Sinc-conv front-end + RawNet2 residual encoder + spectro-temporal graph attention. "
                "Trained on ASVspoof 2019 LA. EER 0.83% in-domain."
            ),
            params="0.30 M",
            sample_rate=16000,
            window_samples=FIXED_WINDOW_SAMPLES,
            score_direction="higher_is_bonafide",
            availability=availability,
            availability_reason=self._load_error,
            checkpoint_path=str(ckpt) if ckpt.exists() else None,
            checkpoint_size_mb=round(ckpt.stat().st_size / 1e6, 2) if ckpt.exists() else None,
            notes="Score is a raw logit — not a calibrated probability. AASIST paper: arXiv:2110.01200",
        )
