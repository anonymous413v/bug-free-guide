"""
W2V2-AASIST Model Adapter — BLOCKED
=====================================
Status: BLOCKED — Missing required source files.

The W2V2-AASIST model requires:
1. _net.py       — defines the Model class (XLS-R + AASIST backend)
2. w2v2_aasist.py — defines the W2V2AASIST wrapper class

These files are referenced in models/W2V2_AASIST/README.md and
models/W2V2_AASIST/trt_w2v2_aasist.py (which imports `from w2v2_aasist import W2V2AASIST`)
but are NOT present in the repository.

Additionally, the architecture uses fairseq's Wav2Vec2Model (not HuggingFace transformers),
which is a large separate dependency not present in the venv.

The checkpoint (LA_model.pth, 1.27 GB) cannot be loaded without the correct
architecture definition. A transformers-based XLS-R substitute would require
verifying weight shape compatibility, which cannot be done without the _net.py source.

Decision: Mark as BLOCKED with the exact reason. Do not fake output.
"""
from __future__ import annotations
from app.core.config import W2V2_AASIST_CHECKPOINT
from app.models.base_adapter import BaseModelAdapter
from app.schemas.model_schema import ModelAvailability, ModelCard


_BLOCK_REASON = (
    "BLOCKED: Required source files _net.py and w2v2_aasist.py are missing from "
    "the repository. These define the fairseq-based XLS-R + AASIST architecture "
    "needed to load LA_model.pth. Without them, the checkpoint cannot be used."
)


class W2V2AASISTAdapter(BaseModelAdapter):
    name = "w2v2_aasist"
    display_name = "W2V2-AASIST"

    def __init__(self) -> None:
        super().__init__()
        self._load_error = _BLOCK_REASON

    def is_available(self) -> bool:
        return False  # Always blocked — missing source files

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
        ckpt = W2V2_AASIST_CHECKPOINT
        return ModelCard(
            id=self.name,
            name="W2V2-AASIST",
            description=(
                "wav2vec 2.0 XLS-R 300M + AASIST graph attention backend. "
                "Fine-tuned end-to-end on ASVspoof 2019 LA with RawBoost augmentation. "
                "317.84 M parameters. EER 0.22% in-domain, 11.22% InTheWild."
            ),
            params="317.84 M",
            sample_rate=16000,
            window_samples=64600,
            score_direction="higher_is_bonafide",
            availability=ModelAvailability.BLOCKED,
            availability_reason=_BLOCK_REASON,
            checkpoint_path=str(ckpt) if ckpt.exists() else None,
            checkpoint_size_mb=round(ckpt.stat().st_size / 1e6, 1) if ckpt.exists() else None,
            notes="Paper: arXiv:2202.12233. Requires fairseq + missing _net.py / w2v2_aasist.py files.",
        )
