"""
Inference route.
POST /api/inference — unified endpoint supporting both "selected" and "auto" modes.

Form fields:
  - audio_file : UploadFile — the audio file to analyze
  - model_ids  : str (JSON array) — e.g. '["aasist","rawnet2"]' for selected mode
  - mode       : str — "selected" | "auto"
"""
import json
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from app.schemas.inference_schema import EvaluationMode, InferenceResponse
from app.services.audio_service import decode_audio, AudioValidationError
from app.services.inference_service import run_inference

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/inference", response_model=InferenceResponse)
async def run_inference_endpoint(
    audio_file: UploadFile = File(..., description="Audio file to analyze"),
    model_ids: str = Form(default="[]", description='JSON array of model IDs, e.g. ["aasist"]'),
    mode: str = Form(default="selected", description='"selected" or "auto"'),
) -> InferenceResponse:
    """
    Run deepfake detection on the uploaded audio file.

    - **selected** mode: runs only the model IDs listed in `model_ids`.
    - **auto** mode: runs all available models; `model_ids` is ignored.

    Returns per-model results and an aggregated risk assessment.
    """
    # ── Parse & validate inputs ────────────────────────────────────────────────
    try:
        eval_mode = EvaluationMode(mode)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid mode '{mode}'. Use 'selected' or 'auto'.")

    try:
        ids: list = json.loads(model_ids)
        if not isinstance(ids, list):
            raise ValueError("model_ids must be a JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid model_ids: {e}")

    if eval_mode == EvaluationMode.SELECTED and not ids:
        raise HTTPException(status_code=400, detail="No model_ids provided for 'selected' mode.")

    # ── Read upload ────────────────────────────────────────────────────────────
    audio_bytes = await audio_file.read()
    filename = audio_file.filename or "unknown.wav"
    file_size = len(audio_bytes)
    logger.info("Inference request: file=%s size=%d mode=%s models=%s",
                filename, file_size, mode, ids)

    # ── Decode audio ───────────────────────────────────────────────────────────
    try:
        waveform, sample_rate, duration_s = decode_audio(audio_bytes, filename)
    except AudioValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Audio decoding error: {e}")

    # ── Run inference (in threadpool to prevent blocking the async event loop) ───
    try:
        from starlette.concurrency import run_in_threadpool
        response = await run_in_threadpool(
            run_inference,
            waveform=waveform,
            sample_rate=sample_rate,
            duration_s=duration_s,
            filename=filename,
            file_size_bytes=file_size,
            model_ids=ids,
            mode=eval_mode,
        )
    except Exception as e:
        logger.exception("Unhandled inference error")
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")

    return response
