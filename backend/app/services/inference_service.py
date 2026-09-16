"""
Inference Service
=================
Orchestrates running one or more models against a decoded audio waveform.
Handles per-model failures gracefully: a model failure is recorded and
the service continues with remaining models.
"""
from __future__ import annotations
import logging
import uuid
import time
from typing import List

import numpy as np

from app.models.registry import registry
from app.schemas.inference_schema import (
    EvaluationMode,
    InferenceResponse,
    ModelResult,
)
from app.services.risk_service import compute_risk

logger = logging.getLogger(__name__)


def run_inference(
    waveform: np.ndarray,
    sample_rate: int,
    duration_s: float,
    filename: str,
    file_size_bytes: int,
    model_ids: List[str],
    mode: EvaluationMode,
) -> InferenceResponse:
    """
    Run inference with the specified models against the provided waveform.

    Args:
        waveform:         float32 mono numpy array at 16 kHz
        sample_rate:      should always be 16000 after preprocessing
        duration_s:       duration in seconds
        filename:         original uploaded filename (for response metadata)
        file_size_bytes:  original file size in bytes
        model_ids:        list of model IDs to run (may be empty for auto mode)
        mode:             EvaluationMode.SELECTED or EvaluationMode.AUTO

    Returns:
        InferenceResponse with per-model results and aggregated risk.
    """
    request_id = str(uuid.uuid4())
    t_start = time.perf_counter()
    warnings: List[str] = []

    # ── Auto mode: use all available models ────────────────────────────────────
    if mode == EvaluationMode.AUTO:
        available_ids = registry.get_available_ids()
        if not available_ids:
            warnings.append("No models are currently available for auto mode.")
        model_ids = available_ids

    # ── Deduplicate & validate model IDs ──────────────────────────────────────
    seen = set()
    clean_ids: List[str] = []
    for mid in model_ids:
        adapter = registry.get_adapter(mid)
        if adapter is None:
            warnings.append(f"Unknown model ID '{mid}' — skipped.")
            continue
        if mid in seen:
            continue
        seen.add(mid)
        if not adapter.is_available():
            warnings.append(
                f"Model '{adapter.display_name}' is not available and will not run: "
                f"{adapter.availability_reason()}"
            )
            # Still include it in results as a failure so UI shows the reason
        clean_ids.append(mid)

    # ── Run each model ─────────────────────────────────────────────────────────
    model_results: List[ModelResult] = []
    for mid in clean_ids:
        adapter = registry.get_adapter(mid)
        if adapter is None:
            continue

        if not adapter.is_available():
            # Blocked / missing — record failure without attempting load
            model_results.append(ModelResult(
                model_id=mid,
                model_name=adapter.display_name,
                success=False,
                error=adapter.availability_reason(),
                notes="Model is not available — see error for details.",
            ))
            continue

        # Load (lazy) then predict
        try:
            adapter.ensure_loaded()
        except Exception as load_err:
            logger.error("Failed to load %s: %s", mid, load_err)
            model_results.append(ModelResult(
                model_id=mid,
                model_name=adapter.display_name,
                success=False,
                error=f"Load failed: {load_err}",
            ))
            continue

        try:
            result = adapter.predict(waveform, sample_rate)
            model_results.append(ModelResult(
                model_id=mid,
                model_name=adapter.display_name,
                success=result["success"],
                label=result.get("label"),
                raw_score=result.get("raw_score"),
                bonafide_probability=result.get("bonafide_probability"),
                score_is_calibrated=result.get("score_is_calibrated", False),
                execution_time_s=result.get("execution_time_s"),
                error=result.get("error"),
                notes=result.get("notes"),
            ))
        except Exception as pred_err:
            logger.error("Inference failed for %s: %s", mid, pred_err)
            model_results.append(ModelResult(
                model_id=mid,
                model_name=adapter.display_name,
                success=False,
                error=f"Inference failed: {pred_err}",
            ))

    # ── Risk aggregation ───────────────────────────────────────────────────────
    risk = compute_risk(model_results)

    total_time = time.perf_counter() - t_start
    return InferenceResponse(
        request_id=request_id,
        filename=filename,
        file_size_bytes=file_size_bytes,
        duration_s=round(duration_s, 3),
        evaluation_mode=mode,
        selected_models=clean_ids,
        model_results=model_results,
        risk=risk,
        processing_time_s=round(total_time, 3),
        warnings=warnings,
    )
