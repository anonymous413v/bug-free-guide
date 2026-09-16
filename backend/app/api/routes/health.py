"""Health check route."""
from fastapi import APIRouter
from app.models.registry import registry
from app.schemas.inference_schema import HealthResponse
from app.core.config import APP_VERSION

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Returns the backend health status and model registry summary.
    The `inference_available` flag is True if at least one model
    can be loaded and run (not blocked, checkpoint exists).
    """
    cards = registry.list_cards()
    n_total = len(cards)
    n_ready = sum(1 for c in cards if c.availability.value in ("available", "ready"))
    details = {
        card.id: {
            "status": card.availability.value,
            "name": card.name,
            "reason": card.availability_reason,
        }
        for card in cards
    }
    return HealthResponse(
        status="ok",
        version=APP_VERSION,
        inference_available=registry.inference_available,
        models_ready=n_ready,
        models_total=n_total,
        details=details,
    )
