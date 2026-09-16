"""
HuBERT-XL AntiDeepfake Model Adapter
=======================================
Checkpoint: models/HuBERT_XL/model.safetensors (3.86 GB)
Architecture: HuBERT extra-large backbone (48 layers, hidden=1280)
              + AdaptiveAvgPool1d + Linear(1280, 2)

Based on nii-yamagishilab/hubert-xlarge-anti-deepfake (AntiDeepfake collection).
Post-trained with RawBoost data augmentation.

Score: logit at index 1 (bona fide class). Higher = more bona fide.
Score is a RAW LOGIT, not a calibrated probability.

⚠️ WARNING: This model is 3.86 GB. Loading on CPU takes ~30-90 seconds.
   Inference on CPU on a 4-second clip takes ~60-120 seconds.
   The adapter lazy-loads on first use.

⚠️ LICENSE: CC BY-NC-SA 4.0 — Non-commercial use only.
"""
from __future__ import annotations
import time
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn as nn

from app.core.config import HUBERT_MODEL_DIR, HUBERT_SAFETENSORS, FIXED_WINDOW_SAMPLES
from app.models.base_adapter import BaseModelAdapter
from app.schemas.model_schema import ModelAvailability, ModelCard
from app.utils.audio_utils import pad_fixed

logger = logging.getLogger(__name__)

_LARGE_MODEL_WARNING = (
    "HuBERT-XL is 3.86 GB. CPU inference takes 60-120 s per clip. "
    "Loading takes ~30-60 s."
)


class HuBERTAntiDeepfakeModel(nn.Module):
    """HuBERT-XL + AdaptiveAvgPool1d + Linear(D, 2) head."""

    def __init__(self, hubert_model: nn.Module, hidden_size: int = 1280):
        super().__init__()
        self.hubert = hubert_model
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.classifier = nn.Linear(hidden_size, 2)

    def forward(self, input_values: torch.Tensor) -> torch.Tensor:
        # Disable spec augment at inference
        outputs = self.hubert(input_values, attention_mask=None)
        # last_hidden_state: (B, T, D)
        hidden = outputs.last_hidden_state
        # Pool over time: (B, D, T) → pool → (B, D, 1) → squeeze → (B, D)
        pooled = self.pool(hidden.permute(0, 2, 1)).squeeze(-1)  # (B, D)
        return self.classifier(pooled)  # (B, 2)


def _check_system_memory_for_hubert() -> tuple[bool, Optional[str]]:
    """Check if the host system has sufficient virtual memory/commit space for HuBERT-XL (3.86 GB)."""
    if not (HUBERT_SAFETENSORS.exists() and HUBERT_MODEL_DIR.exists()):
        return False, "Checkpoint file model.safetensors or config directory not found."

    if torch.cuda.is_available():
        try:
            vram_bytes = torch.cuda.get_device_properties(0).total_memory
            if vram_bytes >= 6 * (1024 ** 3):
                return True, None
        except Exception:
            pass

    # On Windows CPU, check commit limit via ctypes
    try:
        import ctypes
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong),
                ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong),
                ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong),
                ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong),
                ("ullAvailVirtual", ctypes.c_ulonglong),
                ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            avail_gb = stat.ullAvailPageFile / (1024 ** 3)
            if avail_gb < 7.5:
                return False, (
                    f"BLOCKED: HuBERT-XL (3.86 GB / 1B params) requires >= 8 GB virtual memory "
                    f"for CPU execution. Host commit limit available: {avail_gb:.1f} GB "
                    f"(triggers Windows OS error 1455: paging file too small). Requires GPU or larger pagefile."
                )
    except Exception:
        pass
    return True, None


class HuBERTAdapter(BaseModelAdapter):
    name = "hubert_xl"
    display_name = "HuBERT-XL AntiDeepfake"

    def __init__(self) -> None:
        super().__init__()
        self._model: Optional[HuBERTAntiDeepfakeModel] = None

    def is_available(self) -> bool:
        ok, reason = _check_system_memory_for_hubert()
        if not ok and reason:
            self._load_error = reason
        return ok

    def availability_reason(self) -> Optional[str]:
        ok, reason = _check_system_memory_for_hubert()
        return reason or self._load_error

    def load(self) -> None:
        if self._loaded:
            return
        ok, reason = _check_system_memory_for_hubert()
        if not ok:
            self._load_error = reason
            raise RuntimeError(reason)

        logger.info("Loading HuBERT-XL AntiDeepfake from %s (3.86 GB — this will take time)",
                    HUBERT_MODEL_DIR)
        try:
            from transformers import HubertModel, HubertConfig  # type: ignore
            from safetensors.torch import load_file           # type: ignore

            config = HubertConfig.from_pretrained(str(HUBERT_MODEL_DIR))
            # Disable spec augmentation for inference
            config.apply_spec_augment = False
            config.mask_time_prob = 0.0
            config.mask_feature_prob = 0.0

            logger.info("Initializing HuBERT-XL architecture...")
            hubert = HubertModel(config)
            model = HuBERTAntiDeepfakeModel(hubert, hidden_size=config.hidden_size)

            logger.info("Loading safetensors weights (3.86 GB)...")
            state = load_file(str(HUBERT_SAFETENSORS), device="cpu")

            hubert_state = {}
            classifier_state = {}
            for k, v in state.items():
                if k.startswith("net.m_ssl.model."):
                    new_key = k[len("net.m_ssl.model."):]
                    hubert_state[new_key] = v
                elif k.startswith("net.proj_fc."):
                    new_key = k[len("net.proj_fc."):]
                    classifier_state[new_key] = v

            missing_hubert, unexpected_hubert = model.hubert.load_state_dict(hubert_state, strict=False)
            logger.info("HuBERT state: %d missing, %d unexpected keys",
                        len(missing_hubert), len(unexpected_hubert))
            if classifier_state:
                missing_cls, unexpected_cls = model.classifier.load_state_dict(classifier_state, strict=False)
                logger.info("Classifier state: %d missing, %d unexpected", len(missing_cls), len(unexpected_cls))

            model.eval()
            self._model = model
            self._loaded = True
            logger.info("HuBERT-XL loaded successfully.")
        except Exception as e:
            self._load_error = str(e)
            logger.error("HuBERT-XL load failed: %s", e)
            raise RuntimeError(f"HuBERT-XL load failed: {e}") from e

    def unload(self) -> None:
        self._model = None
        self._loaded = False

    def predict(self, waveform: np.ndarray, sample_rate: int) -> dict:
        if not self._loaded or self._model is None:
            raise RuntimeError("HuBERT-XL model is not loaded")
        t0 = time.perf_counter()
        try:
            windowed = pad_fixed(waveform, FIXED_WINDOW_SAMPLES)
            x = torch.from_numpy(windowed).unsqueeze(0)  # (1, 64600)
            with torch.inference_mode():
                logits = self._model(x)     # (1, 2)
            bonafide_logit = float(logits[0, 1])
            spoof_logit = float(logits[0, 0])
            raw_score = bonafide_logit       # higher = more bonafide
            label = "BONAFIDE" if raw_score > spoof_logit else "SPOOF"
            exec_time = time.perf_counter() - t0
            return {
                "success": True,
                "label": label,
                "raw_score": raw_score,
                "bonafide_probability": None,
                "score_is_calibrated": False,
                "notes": (
                    f"Raw bona-fide logit: {raw_score:.4f}. "
                    "Score is a raw logit, NOT a probability. "
                    "Non-commercial license (CC BY-NC-SA 4.0)."
                ),
                "execution_time_s": exec_time,
            }
        except Exception as e:
            logger.error("HuBERT-XL predict failed: %s", e)
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
        ckpt = HUBERT_SAFETENSORS
        ok, reason = _check_system_memory_for_hubert()
        if self._loaded:
            availability = ModelAvailability.READY
        elif not ok:
            availability = ModelAvailability.BLOCKED
        else:
            availability = ModelAvailability.AVAILABLE

        return ModelCard(
            id=self.name,
            name="HuBERT-XL AntiDeepfake",
            description=(
                "HuBERT extra-large post-trained for deepfake detection (NII AntiDeepfake). "
                "48-layer transformer backbone + AdaptiveAvgPool + Linear head. "
                "Trained with RawBoost augmentation. EER 3.46% InTheWild."
            ),
            params="~1B",
            sample_rate=16000,
            window_samples=FIXED_WINDOW_SAMPLES,
            score_direction="higher_is_bonafide",
            availability=availability,
            availability_reason=reason or self._load_error,
            checkpoint_path=str(ckpt) if ckpt.exists() else None,
            checkpoint_size_mb=round(ckpt.stat().st_size / 1e6, 1) if ckpt.exists() else None,
            notes="License: CC BY-NC-SA 4.0 (non-commercial). Score is raw logit — not calibrated. Requires >= 8 GB virtual memory.",
        )

