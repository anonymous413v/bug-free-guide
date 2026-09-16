"""
DF Arena 500M Model Adapter — BLOCKED
=======================================
Status: BLOCKED — Missing conformer.py source file.

The DF Arena 500M model (RAPTOR architecture) requires:
  - backbone.py (present) — imports `from .conformer import FinalConformer`
  - conformer.py (MISSING) — defines the FinalConformer class

Without conformer.py, DF_Arena_500M cannot be instantiated and the
pytorch_model.bin checkpoint cannot be loaded.

The README also references a Hugging Face pipeline
(`pipeline("antispoofing", model="...", trust_remote_code=True)`)
which requires the full model code to be present locally, including
configuration_antispoofing.py, modeling_antispoofing.py, etc.

Decision: Mark as BLOCKED with the exact reason. Do not fake output.
"""
from __future__ import annotations
from app.core.config import DF_ARENA_CHECKPOINT, DF_ARENA_MODEL_DIR
from app.models.base_adapter import BaseModelAdapter
from app.schemas.model_schema import ModelAvailability, ModelCard


_BLOCK_REASON = (
    "BLOCKED: Required source file conformer.py is missing from models/DF_Arena/. "
    "backbone.py imports FinalConformer from it, but the file is absent. "
    "Without conformer.py, the 1.75 GB checkpoint cannot be loaded."
)


class DFArenaAdapter(BaseModelAdapter):
    name = "df_arena"
    display_name = "DF Arena 500M"

    def __init__(self) -> None:
        super().__init__()
        self._load_error = _BLOCK_REASON

    def is_available(self) -> bool:
        return False  # Always blocked — missing conformer.py

    def load(self) -> None:
        raise RuntimeError(_BLOCK_REASON)

    def predict(self, waveform, sample_rate: int) -> dict:
        return {
            "success": False,
            "label": None,
            "raw_score": None,
            "bonafide_probability": None,
            "score_is_calibrated": False,
            "notes": None,
            "execution_time_s": 0.0,
            "error": _BLOCK_REASON,
        }

    def card(self) -> ModelCard:
        ckpt = DF_ARENA_CHECKPOINT
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
            availability=ModelAvailability.BLOCKED,
            availability_reason=_BLOCK_REASON,
            checkpoint_path=str(ckpt) if ckpt.exists() else None,
            checkpoint_size_mb=round(ckpt.stat().st_size / 1e6, 1) if ckpt.exists() else None,
            notes="Paper: arXiv:2603.06164. Missing conformer.py prevents loading.",
        )
