"""
Audio Service
=============
Handles audio file decoding, validation, mono conversion, and resampling.
Does NOT modify the original file; returns a numpy float32 array.
"""
from __future__ import annotations
import io
import logging
import tempfile
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import soundfile as sf
import torchaudio
import torch

from app.core.config import (
    TARGET_SAMPLE_RATE,
    MAX_FILE_SIZE_MB,
    MIN_DURATION_S,
    MAX_DURATION_S,
    SUPPORTED_FORMATS,
)

logger = logging.getLogger(__name__)


class AudioValidationError(Exception):
    pass


def decode_audio(
    audio_bytes: bytes,
    filename: str,
) -> Tuple[np.ndarray, int, float]:
    """
    Decode audio bytes into a float32 mono numpy array at 16 kHz.

    Steps:
      1. Validate file size
      2. Validate file extension
      3. Decode with soundfile (WAV/FLAC/OGG) or torchaudio (MP3/M4A)
      4. Convert to mono (average channels)
      5. Resample to 16 kHz
      6. Validate duration

    Returns:
        (waveform: float32 ndarray, sample_rate: int, duration_s: float)

    Raises:
        AudioValidationError on any validation failure
        RuntimeError on decoding failure
    """
    # ── 1. File size ────────────────────────────────────────────────────────────
    size_mb = len(audio_bytes) / 1e6
    if size_mb > MAX_FILE_SIZE_MB:
        raise AudioValidationError(
            f"File size {size_mb:.1f} MB exceeds maximum {MAX_FILE_SIZE_MB} MB."
        )

    # ── 2. Format ───────────────────────────────────────────────────────────────
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_FORMATS:
        raise AudioValidationError(
            f"Unsupported format '{suffix}'. Supported: {', '.join(sorted(SUPPORTED_FORMATS))}"
        )

    # ── 3. Decode ───────────────────────────────────────────────────────────────
    waveform, sr = _decode(audio_bytes, suffix)

    # ── 4. Mono ─────────────────────────────────────────────────────────────────
    if waveform.ndim == 2:
        waveform = waveform.mean(axis=0 if waveform.shape[0] <= 8 else 1)
    waveform = waveform.astype(np.float32)

    # ── 5. Resample ─────────────────────────────────────────────────────────────
    if sr != TARGET_SAMPLE_RATE:
        waveform = _resample(waveform, sr, TARGET_SAMPLE_RATE)
        sr = TARGET_SAMPLE_RATE

    # ── 6. Duration ─────────────────────────────────────────────────────────────
    duration_s = len(waveform) / sr
    if duration_s < MIN_DURATION_S:
        raise AudioValidationError(
            f"Audio too short: {duration_s:.2f}s. Minimum is {MIN_DURATION_S}s."
        )
    if duration_s > MAX_DURATION_S:
        raise AudioValidationError(
            f"Audio too long: {duration_s:.1f}s. Maximum is {MAX_DURATION_S}s."
        )

    logger.debug("Decoded audio: %.2fs, %d Hz, %d samples", duration_s, sr, len(waveform))
    return waveform, sr, duration_s


def _decode(audio_bytes: bytes, suffix: str) -> Tuple[np.ndarray, int]:
    """Decode audio bytes → (waveform numpy, sample_rate)."""
    # Try soundfile first (works for WAV, FLAC, OGG, some MP3)
    try:
        wav, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
        return wav, sr
    except Exception as sf_err:
        logger.debug("soundfile failed (%s), trying torchaudio", sf_err)

    # Fallback: torchaudio (handles MP3, M4A via ffmpeg/sox if available)
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        tensor, sr = torchaudio.load(tmp_path)
        Path(tmp_path).unlink(missing_ok=True)
        wav = tensor.numpy()
        if wav.ndim == 2 and wav.shape[0] == 1:
            wav = wav[0]
        return wav, sr
    except Exception as ta_err:
        raise RuntimeError(
            f"Could not decode audio. soundfile error: {sf_err}. "
            f"torchaudio error: {ta_err}"
        ) from ta_err


def _resample(waveform: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    """Resample using torchaudio's high-quality resampler."""
    tensor = torch.from_numpy(waveform.astype(np.float32))
    if tensor.ndim == 1:
        tensor = tensor.unsqueeze(0)
    resampled = torchaudio.functional.resample(tensor, orig_sr, target_sr)
    return resampled.squeeze(0).numpy().astype(np.float32)
