"""
Audio utilities: padding/windowing waveforms to fixed-length windows
used by AASIST, W2V2-AASIST, and RawNet2.
"""
from __future__ import annotations
import numpy as np


def pad_fixed(waveform: np.ndarray, target_samples: int) -> np.ndarray:
    """
    Take the first `target_samples` of `waveform`.
    If shorter, tile-repeat the waveform until it reaches `target_samples`.

    This exactly matches the clovaai/aasist `data_utils.pad()` logic used
    by the Arena benchmark for deterministic evaluation.

    Args:
        waveform: 1-D float32 numpy array (mono, any length)
        target_samples: number of samples in the output window

    Returns:
        1-D float32 numpy array of exactly `target_samples` samples
    """
    waveform = np.asarray(waveform, dtype=np.float32)
    n = len(waveform)
    if n == 0:
        return np.zeros(target_samples, dtype=np.float32)
    if n >= target_samples:
        return waveform[:target_samples]
    # Tile-repeat
    repeats = (target_samples + n - 1) // n
    padded = np.tile(waveform, repeats)[:target_samples]
    return padded.astype(np.float32)
