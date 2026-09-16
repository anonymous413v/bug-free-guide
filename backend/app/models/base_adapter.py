"""
Base adapter interface that all model adapters must implement.

Each adapter wraps one model checkpoint and provides:
  - is_available() → bool   : fast check (no loading)
  - load()                  : load checkpoint into memory
  - unload()                : free memory
  - predict(waveform, sr)   : run inference on a float32 numpy array
  - card()                  : return ModelCard metadata
"""
from __future__ import annotations
import abc
from typing import Optional
import numpy as np

from app.schemas.model_schema import ModelCard


class BaseModelAdapter(abc.ABC):
    """Abstract base class for all VOICEGUARD model adapters."""

    name: str = "base"
    display_name: str = "Base Model"

    def __init__(self) -> None:
        self._loaded: bool = False
        self._load_error: Optional[str] = None

    # ── Required interface ─────────────────────────────────────────────────────

    @abc.abstractmethod
    def is_available(self) -> bool:
        """Return True iff the checkpoint and all required files exist.
        Must be fast — no model loading."""
        ...

    @abc.abstractmethod
    def load(self) -> None:
        """Load the model checkpoint into memory (CPU).
        Raises RuntimeError on failure."""
        ...

    @abc.abstractmethod
    def predict(self, waveform: np.ndarray, sample_rate: int) -> dict:
        """Run inference on a float32 mono waveform at `sample_rate` Hz.

        Returns a dict with keys:
          success (bool)
          label   (str)  — "BONAFIDE" | "SPOOF" | "UNCERTAIN"
          raw_score (float) — model output logit / score
          bonafide_probability (float | None)
          score_is_calibrated (bool)
          notes (str | None)
        """
        ...

    @abc.abstractmethod
    def card(self) -> ModelCard:
        """Return a ModelCard describing this model's metadata."""
        ...

    # ── Concrete helpers ───────────────────────────────────────────────────────

    def unload(self) -> None:
        """Free model from memory. Override if needed."""
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def availability_reason(self) -> Optional[str]:
        """Human-readable reason for unavailability, or None if available."""
        return self._load_error

    def ensure_loaded(self) -> None:
        """Load model if not already loaded. Raises on failure."""
        if not self._loaded:
            self.load()
