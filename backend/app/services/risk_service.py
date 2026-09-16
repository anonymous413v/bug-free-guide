"""
Risk Service
============
Aggregates per-model results into a single overall risk assessment.

Risk Calculation Method
-----------------------
Each model outputs a raw score where higher means more bona fide.
We convert each score to a "spoof score" ∈ [0, 1] via min-max normalization
across the known score range per model, then average the spoof scores.

Score normalization per model:
  - AASIST:   raw logit, typical range [-15, +15]. spoof_score = sigmoid(-raw_score)
  - RawNet2:  softmax P(bonafide), spoof_score = 1 - P(bonafide)
  - HuBERT-XL: raw logit. spoof_score = sigmoid(-raw_score)

The combined spoof score is the unweighted average across successful models.

Risk level thresholds:
  - risk_score < 0.35  → LOW    (likely bonafide)
  - 0.35 ≤ risk_score < 0.65 → MEDIUM (uncertain)
  - risk_score ≥ 0.65  → HIGH   (likely spoof)

If fewer than 1 model succeeded → UNKNOWN / Insufficient Evidence.
"""
from __future__ import annotations
import math
import logging
from typing import List

from app.schemas.inference_schema import ModelResult, RiskResult, RiskLevel

logger = logging.getLogger(__name__)


# Per-model sigmoid-normalization: converts raw_score to P(spoof)
def _raw_to_spoof_prob(model_id: str, raw_score: float,
                       bonafide_prob: float | None) -> float:
    """
    Convert a model's output to a spoof probability in [0, 1].
    Higher return value = higher spoof risk.
    """
    # If the model provides a bonafide probability (RawNet2), use 1 - P(bonafide)
    if bonafide_prob is not None:
        return 1.0 - bonafide_prob

    # For logit-based models: apply sigmoid to the spoof direction
    # raw_score is the bona-fide logit. P(spoof) ≈ sigmoid(-raw_score)
    spoof_p = 1.0 / (1.0 + math.exp(raw_score))   # sigmoid(-raw_score) = 1/(1+e^raw)
    return max(0.0, min(1.0, spoof_p))


def compute_risk(model_results: List[ModelResult]) -> RiskResult:
    """
    Compute the overall risk assessment from a list of model results.

    Args:
        model_results: Per-model inference results (may include failures).

    Returns:
        RiskResult with risk_level, risk_score, explanation, etc.
    """
    succeeded = [r for r in model_results if r.success and r.raw_score is not None]
    failed = [r for r in model_results if not r.success]
    n_total = len(model_results)
    n_ok = len(succeeded)
    n_fail = len(failed)

    # ── Insufficient evidence ──────────────────────────────────────────────────
    if n_ok == 0:
        return RiskResult(
            risk_level=RiskLevel.UNKNOWN,
            risk_score=None,
            confidence=None,
            models_succeeded=0,
            models_failed=n_fail,
            models_total=n_total,
            model_agreement="insufficient",
            calculation_method="none",
            explanation=(
                "No models produced a valid output. This can occur when all selected "
                "models are blocked, failed to load, or encountered inference errors. "
                "Cannot assess risk without at least one successful model result."
            ),
        )

    # ── Convert each successful result to spoof probability ───────────────────
    spoof_probs = []
    labels = []
    for result in succeeded:
        sp = _raw_to_spoof_prob(result.model_id, result.raw_score, result.bonafide_probability)
        spoof_probs.append(sp)
        labels.append(result.label)

    combined_spoof = sum(spoof_probs) / len(spoof_probs)

    # ── Risk level ─────────────────────────────────────────────────────────────
    if combined_spoof < 0.35:
        risk_level = RiskLevel.LOW
    elif combined_spoof < 0.65:
        risk_level = RiskLevel.MEDIUM
    else:
        risk_level = RiskLevel.HIGH

    # ── Model agreement ────────────────────────────────────────────────────────
    unique_labels = set(labels) - {"UNCERTAIN"}
    if len(unique_labels) <= 1:
        agreement = "consensus"
    else:
        agreement = "disagreement"

    # ── Confidence (how far from the 0.5 decision boundary) ───────────────────
    confidence = abs(combined_spoof - 0.5) * 2.0  # 0=random, 1=certain

    # ── Explanation ────────────────────────────────────────────────────────────
    model_names = [r.model_name for r in succeeded]
    spoof_pct = f"{combined_spoof * 100:.1f}%"
    explanation = (
        f"Combined spoof score: {spoof_pct} (average across {n_ok} successful model(s): "
        f"{', '.join(model_names)}). "
        f"Model agreement: {agreement}. "
    )
    if failed:
        fail_names = [r.model_name for r in failed]
        explanation += f"{n_fail} model(s) failed: {', '.join(fail_names)}. "
    explanation += (
        "Method: each model's bona-fide logit/score is sigmoid-normalized to a "
        "spoof probability [0-1]; the unweighted mean is the final risk score. "
        "Thresholds: <35% = LOW, 35-65% = MEDIUM, ≥65% = HIGH."
    )

    return RiskResult(
        risk_level=risk_level,
        risk_score=round(combined_spoof, 4),
        confidence=round(confidence, 4),
        models_succeeded=n_ok,
        models_failed=n_fail,
        models_total=n_total,
        model_agreement=agreement,
        calculation_method="sigmoid_normalized_mean",
        explanation=explanation,
    )
