"""
RawNet2 Model Adapter
======================
Checkpoint: models/RawNet2/best.pt  (154 MB)
Architecture: Implemented inline matching the checkpoint's state_dict structure.

The checkpoint was trained by caa-speech-detection-asvspoof2019/rawnet2 (HuggingFace).
Input: raw 16kHz mono, padded/truncated to 64000 samples (4s).
Output: logits[B, 2] — class 0=spoof, class 1=bonafide.
Score: softmax(logits)[:,1] = P(bonafide). Higher = more bonafide.
The softmax output IS a probability but is NOT calibrated (trained with class weights).
We report it as an uncalibrated score.
"""
from __future__ import annotations
import sys
import time
import math
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from app.core.config import RAWNET2_CHECKPOINT, RAWNET2_WINDOW_SAMPLES
from app.models.base_adapter import BaseModelAdapter
from app.schemas.model_schema import ModelAvailability, ModelCard
from app.utils.audio_utils import pad_fixed

logger = logging.getLogger(__name__)

# ── RawNet2 Architecture ────────────────────────────────────────────────────────
# Implemented to match the state_dict from caa-speech-detection-asvspoof2019/rawnet2

class SincConv(nn.Module):
    """Sinc-convolution filterbank matching the RawNet2 checkpoint.

    The checkpoint stores:
      - sinc.low_hz_   : (128, 1)
      - sinc.band_hz_  : (128, 1)
      - sinc.n_axis    : (1, 64)   — n values for half-kernel
      - sinc.window    : (64,)     — Hamming half-window

    The full 129-point kernel is assembled as:
      half_kernel = (f_high - f_low) * window   [(128, 64)]
      kernel = [flip(half), 0, half]             [(128, 129)]
    """
    def __init__(self, out_channels: int = 128, kernel_size: int = 129,
                 sample_rate: int = 16000, learnable: bool = False):
        super().__init__()
        assert kernel_size % 2 == 1, "kernel_size must be odd"
        self.out_channels = out_channels
        self.kernel_size = kernel_size
        self.sample_rate = sample_rate
        half = kernel_size // 2  # 64

        low_hz = torch.linspace(0, sample_rate / 2 - (sample_rate / out_channels),
                                out_channels).unsqueeze(1)         # (128, 1)
        band_hz = torch.full((out_channels, 1), sample_rate / out_channels)
        self.low_hz_ = nn.Parameter(low_hz, requires_grad=learnable)
        self.band_hz_ = nn.Parameter(band_hz, requires_grad=learnable)

        # n_axis: (1, 64) — 2π*n/sr for n=1..64
        n = torch.arange(1, half + 1).float()
        n_axis = 2 * math.pi * n / sample_rate
        self.register_buffer("n_axis", n_axis.unsqueeze(0))        # (1, 64)

        # Half-Hamming window: (64,)
        # Hamming window over indices [0..63] within the half-kernel
        window = 0.54 - 0.46 * torch.cos(
            2 * math.pi * torch.arange(half).float() / (kernel_size - 1)
        )
        self.register_buffer("window", window)                      # (64,)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, 1, T)
        low = torch.abs(self.low_hz_) / self.sample_rate            # (128, 1)
        high = (low + torch.abs(self.band_hz_) / self.sample_rate)  # (128, 1)
        # Sinc half-kernels
        f_low = 2 * low * torch.sinc(2 * low * self.n_axis)         # (128, 64)
        f_high = 2 * high * torch.sinc(2 * high * self.n_axis)      # (128, 64)
        band = (f_high - f_low) * self.window                       # (128, 64)
        # Symmetric full kernel
        center = torch.zeros(self.out_channels, 1, device=x.device)
        kernel = torch.cat([band.flip(1), center, band], dim=1)     # (128, 129)
        kernel = kernel.unsqueeze(1)                                 # (128, 1, 129)
        return F.conv1d(x, kernel, padding=self.kernel_size // 2)


class FMS(nn.Module):
    """Filter-wise feature map scaling."""
    def __init__(self, channels: int):
        super().__init__()
        self.fc = nn.Linear(channels, channels)
        self.sig = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, C, T)
        scale = self.sig(self.fc(x.mean(-1)))  # (B, C)
        return x * scale.unsqueeze(-1) + scale.unsqueeze(-1)


class ResBlock(nn.Module):
    """Pre-activation residual block with optional shortcut."""
    def __init__(self, in_ch: int, out_ch: int, first: bool = False):
        super().__init__()
        self.first = first
        self.bn1 = nn.BatchNorm1d(in_ch)
        self.lrelu = nn.LeakyReLU(0.3)
        self.conv1 = nn.Conv1d(in_ch, out_ch, 3, padding=1, bias=True)
        self.bn2 = nn.BatchNorm1d(out_ch)
        self.conv2 = nn.Conv1d(out_ch, out_ch, 3, padding=1, bias=True)
        self.fms = FMS(out_ch)
        if in_ch != out_ch:
            self.shortcut = nn.Conv1d(in_ch, out_ch, 1, bias=True)
        else:
            self.shortcut = None
        self.mp = nn.MaxPool1d(3)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        identity = x
        if not self.first:
            out = self.lrelu(self.bn1(x))
        else:
            out = x
        out = self.conv1(out)
        out = self.lrelu(self.bn2(out))
        out = self.conv2(out)
        if self.shortcut is not None:
            identity = self.shortcut(identity)
        out = out + identity
        out = self.fms(out)
        out = self.mp(out)
        return out


class RawNet2(nn.Module):
    """RawNet2 anti-spoofing model matching caa-speech-detection-asvspoof2019/rawnet2 checkpoint."""

    def __init__(self):
        super().__init__()
        # class_weights is a buffer in the checkpoint
        self.register_buffer("class_weights", torch.tensor([8.837, 1.0]))

        self.sinc = SincConv(out_channels=128, kernel_size=129, sample_rate=16000, learnable=False)
        self.front_bn = nn.BatchNorm1d(128)
        self.lrelu = nn.LeakyReLU(0.3)

        # 6 residual blocks: 2 × (128→128), 4 × (128→512 for first, 512→512 rest)
        self.blocks = nn.ModuleList([
            ResBlock(128, 128, first=True),    # blocks.0
            ResBlock(128, 128, first=False),   # blocks.1
            ResBlock(128, 512, first=False),   # blocks.2 (has shortcut)
            ResBlock(512, 512, first=False),   # blocks.3
            ResBlock(512, 512, first=False),   # blocks.4
            ResBlock(512, 512, first=False),   # blocks.5
        ])

        self.pre_gru_bn = nn.BatchNorm1d(512)
        self.gru = nn.GRU(input_size=512, hidden_size=1024, batch_first=True)
        self.fc = nn.Linear(1024, 1024)
        self.classifier = nn.Linear(1024, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, T) raw waveform
        x = x.unsqueeze(1)                        # (B, 1, T)
        x = self.sinc(x)                          # (B, 128, T')
        x = self.lrelu(self.front_bn(x))
        for blk in self.blocks:
            x = blk(x)
        x = self.lrelu(self.pre_gru_bn(x))
        x = x.permute(0, 2, 1)                    # (B, T'', 512)
        self.gru.flatten_parameters()
        x, _ = self.gru(x)
        x = x[:, -1, :]                           # last timestep (B, 1024)
        x = F.leaky_relu(self.fc(x), 0.3)
        return self.classifier(x)                 # (B, 2)


# ── Adapter ─────────────────────────────────────────────────────────────────────

class RawNet2Adapter(BaseModelAdapter):
    name = "rawnet2"
    display_name = "RawNet2"

    def __init__(self) -> None:
        super().__init__()
        self._model: Optional[RawNet2] = None

    def is_available(self) -> bool:
        return RAWNET2_CHECKPOINT.exists()

    def load(self) -> None:
        if self._loaded:
            return
        logger.info("Loading RawNet2 from %s", RAWNET2_CHECKPOINT)
        try:
            ck = torch.load(RAWNET2_CHECKPOINT, map_location="cpu", weights_only=False)
            state_dict = ck["model_state_dict"]
            model = RawNet2()
            model.load_state_dict(state_dict, strict=True)
            model.eval()
            self._model = model
            self._loaded = True
            logger.info("RawNet2 loaded successfully (%.1f MB)", RAWNET2_CHECKPOINT.stat().st_size / 1e6)
        except Exception as e:
            self._load_error = str(e)
            logger.error("RawNet2 load failed: %s", e)
            raise RuntimeError(f"RawNet2 load failed: {e}") from e

    def unload(self) -> None:
        self._model = None
        self._loaded = False

    def predict(self, waveform: np.ndarray, sample_rate: int) -> dict:
        if not self._loaded or self._model is None:
            raise RuntimeError("RawNet2 model is not loaded")
        t0 = time.perf_counter()
        try:
            windowed = pad_fixed(waveform, RAWNET2_WINDOW_SAMPLES)   # 64000 samples
            x = torch.from_numpy(windowed).unsqueeze(0)               # (1, 64000)
            with torch.inference_mode():
                logits = self._model(x)            # (1, 2)
            probs = torch.softmax(logits, dim=-1)
            bonafide_prob = float(probs[0, 1])
            spoof_prob = float(probs[0, 0])
            label = "BONAFIDE" if bonafide_prob > 0.5 else "SPOOF"
            exec_time = time.perf_counter() - t0
            return {
                "success": True,
                "label": label,
                "raw_score": float(logits[0, 1]),   # bonafide logit
                "bonafide_probability": bonafide_prob,
                "score_is_calibrated": False,
                "notes": (
                    f"Softmax P(bonafide)={bonafide_prob:.4f}. "
                    "Note: trained with class weighting [8.837, 1.0]; score is NOT calibrated."
                ),
                "execution_time_s": exec_time,
            }
        except Exception as e:
            logger.error("RawNet2 predict failed: %s", e)
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
        ckpt = RAWNET2_CHECKPOINT
        availability = ModelAvailability.AVAILABLE if self.is_available() else ModelAvailability.MISSING
        if self._loaded:
            availability = ModelAvailability.READY
        elif self._load_error:
            availability = ModelAvailability.ERROR
        return ModelCard(
            id=self.name,
            name="RawNet2",
            description=(
                "End-to-End anti-spoofing with RawNet2 (Tak et al., ICASSP 2021). "
                "Sinc-conv filterbank front-end + residual blocks + GRU. "
                "Trained on ASVspoof 2019 LA. Eval EER 15.09% on unseen attacks."
            ),
            params="~1.1 M",
            sample_rate=16000,
            window_samples=RAWNET2_WINDOW_SAMPLES,
            score_direction="higher_is_bonafide",
            availability=availability,
            availability_reason=self._load_error,
            checkpoint_path=str(ckpt) if ckpt.exists() else None,
            checkpoint_size_mb=round(ckpt.stat().st_size / 1e6, 1) if ckpt.exists() else None,
            notes="Score is softmax(logits)[bonafide]. NOT calibrated (trained with 8.8:1 class weighting).",
        )
