"""
DF Arena 500M Model Adapter
===========================
Architecture: RAPTOR (wav2vec 2.0 XLS-R 300M + 4-block Conformer head)
Source files: models/DF_Arena/backbone.py & models/DF_Arena/conformer.py
Checkpoint: models/DF_Arena/pytorch_model.bin (1.75 GB)

Note: Loading and initializing the 436M parameter RAPTOR architecture
requires >= 6 GB virtual memory for PyTorch CPU allocation. On systems
with constrained pagefile commit limits, PyTorch memory allocation fails
with DefaultCPUAllocator: not enough memory.
"""
from __future__ import annotations
import time
import logging
from typing import Optional
import numpy as np
import torch

from app.core.config import DF_ARENA_CHECKPOINT
from app.models.base_adapter import BaseModelAdapter
from app.schemas.model_schema import ModelAvailability, ModelCard
from app.utils.audio_utils import pad_fixed

logger = logging.getLogger(__name__)


def _check_system_memory_for_df_arena() -> tuple[bool, Optional[str]]:
    """Check if required source files exist and system virtual memory is sufficient for DF Arena 500M."""
    from pathlib import Path
    conformer_path = Path("models/DF_Arena/conformer.py")
    backbone_path = Path("models/DF_Arena/backbone.py")
    if not (conformer_path.exists() and backbone_path.exists() and DF_ARENA_CHECKPOINT.exists()):
        return False, "Required source files (backbone.py, conformer.py) or checkpoint pytorch_model.bin missing."

    if torch.cuda.is_available():
        return True, None

    # On Windows CPU check commit limit
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
            if avail_gb < 5.0:
                return False, (
                    f"BLOCKED: DF Arena 500M (436M params / 1.75 GB) requires >= 6 GB virtual memory "
                    f"for CPU execution. Host commit limit available: {avail_gb:.1f} GB "
                    f"(triggers PyTorch DefaultCPUAllocator out-of-memory). Requires GPU or larger pagefile."
                )
    except Exception:
        pass

    return True, None


class DFArenaAdapter(BaseModelAdapter):
    name = "df_arena"
    display_name = "DF Arena 500M"

    def __init__(self) -> None:
        super().__init__()
        self._model: Optional[torch.nn.Module] = None

    def is_available(self) -> bool:
        ok, reason = _check_system_memory_for_df_arena()
        if not ok and reason:
            self._load_error = reason
        return ok

    def availability_reason(self) -> Optional[str]:
        ok, reason = _check_system_memory_for_df_arena()
        return reason or self._load_error

    def load(self) -> None:
        if self._loaded:
            return
        ok, reason = _check_system_memory_for_df_arena()
        if not ok:
            self._load_error = reason
            raise RuntimeError(reason)

        logger.info("Loading DF Arena 500M (RAPTOR) from %s", DF_ARENA_CHECKPOINT)
        try:
            import sys
            sys.path.insert(0, ".")
            import models.DF_Arena.backbone as bb
            model = bb.DF_Arena_500M()
            state = torch.load(DF_ARENA_CHECKPOINT, map_location="cpu")
            model.load_state_dict(state)
            model.eval()
            self._model = model
            self._loaded = True
            logger.info("DF Arena 500M loaded successfully.")
        except Exception as e:
            self._load_error = str(e)
            logger.error("DF Arena 500M load failed: %s", e)
            raise RuntimeError(f"DF Arena 500M load failed: {e}") from e

    def unload(self) -> None:
        self._model = None
        self._loaded = False

    def predict(self, waveform: np.ndarray, sample_rate: int) -> dict:
        if not self._loaded or self._model is None:
            raise RuntimeError("DF Arena 500M model is not loaded")
        t0 = time.perf_counter()
        try:
            windowed = pad_fixed(waveform, 64600)
            x = torch.from_numpy(windowed).unsqueeze(0)  # (1, 64600)
            with torch.inference_mode():
                logits, _ = self._model(x)  # (1, 2)
            probs = torch.softmax(logits, dim=-1)
            bonafide_prob = float(probs[0, 1])
            label = "BONAFIDE" if bonafide_prob > 0.5 else "SPOOF"
            exec_time = time.perf_counter() - t0
            return {
                "success": True,
                "label": label,
                "raw_score": float(logits[0, 1]),
                "bonafide_probability": bonafide_prob,
                "score_is_calibrated": False,
                "notes": f"RAPTOR softmax P(bonafide)={bonafide_prob:.4f}.",
                "execution_time_s": exec_time,
            }
        except Exception as e:
            logger.error("DF Arena 500M predict failed: %s", e)
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
        ckpt = DF_ARENA_CHECKPOINT
        ok, reason = _check_system_memory_for_df_arena()
        if self._loaded:
            availability = ModelAvailability.READY
        elif not ok:
            availability = ModelAvailability.BLOCKED
        else:
            availability = ModelAvailability.AVAILABLE

        return ModelCard(
            id=self.name,
            name="DF Arena 500M",
            description=(
                "RAPTOR: wav2vec 2.0 XLS-R 300M with learnable layer attention + 4-block Conformer head. "
                "436 M parameters. Mean EER 5.09% across 24 datasets. "
                "State-of-the-art on most benchmarks."
            ),
            params="436 M",
            sample_rate=16000,
            window_samples=64600,
            score_direction="higher_is_bonafide",
            availability=availability,
            availability_reason=reason or self._load_error,
            checkpoint_path=str(ckpt) if ckpt.exists() else None,
            checkpoint_size_mb=round(ckpt.stat().st_size / 1e6, 1) if ckpt.exists() else None,
            notes="Paper: arXiv:2603.06164. Conformer head present. Requires >= 6 GB virtual memory.",
        )
