"""
Pydantic schemas for model metadata and status.
"""
from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class ModelAvailability(str, Enum):
    AVAILABLE = "available"       # checkpoint exists, ready to load
    LOADING = "loading"           # currently being loaded
    READY = "ready"               # loaded and ready for inference
    MISSING = "missing"           # checkpoint file not found
    BLOCKED = "blocked"           # architecture/dependency unavailable
    ERROR = "error"               # loaded with an error


class ModelCard(BaseModel):
    id: str
    name: str
    description: str
    params: Optional[str] = None
    sample_rate: int = 16000
    window_samples: int = 64600
    score_direction: str = "higher_is_bonafide"
    availability: ModelAvailability
    availability_reason: Optional[str] = None
    checkpoint_path: Optional[str] = None
    checkpoint_size_mb: Optional[float] = None
    notes: Optional[str] = None
