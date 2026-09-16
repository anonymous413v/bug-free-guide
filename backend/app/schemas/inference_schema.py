"""
Pydantic schemas for inference requests and responses.
"""
from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class EvaluationMode(str, Enum):
    SELECTED = "selected"
    AUTO = "auto"


class ModelResult(BaseModel):
    model_id: str
    model_name: str
    success: bool
    label: Optional[str] = None          # "BONAFIDE", "SPOOF", "UNCERTAIN"
    raw_score: Optional[float] = None    # raw logit or score from model
    bonafide_probability: Optional[float] = None  # only if calibrated
    score_is_calibrated: bool = False    # whether bonafide_probability is meaningful
    execution_time_s: Optional[float] = None
    error: Optional[str] = None
    notes: Optional[str] = None


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    UNKNOWN = "unknown"


class RiskResult(BaseModel):
    risk_level: RiskLevel
    risk_score: Optional[float] = None   # 0.0=bonafide, 1.0=definite spoof
    confidence: Optional[float] = None
    models_succeeded: int
    models_failed: int
    models_total: int
    model_agreement: Optional[str] = None   # "consensus", "disagreement", "insufficient"
    calculation_method: str = "weighted_average"
    explanation: str
    disclaimer: str = (
        "This result is an automated screening signal. It is NOT definitive proof "
        "of audio authenticity or manipulation. Always apply human judgment."
    )


class InferenceResponse(BaseModel):
    request_id: str
    filename: str
    file_size_bytes: int
    duration_s: Optional[float] = None
    evaluation_mode: EvaluationMode
    selected_models: List[str]
    model_results: List[ModelResult]
    risk: RiskResult
    processing_time_s: float
    warnings: List[str] = []


class HealthResponse(BaseModel):
    status: str
    version: str
    inference_available: bool
    models_ready: int
    models_total: int
    details: Dict[str, Any] = {}
