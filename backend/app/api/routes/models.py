"""Models listing route."""
from typing import List
from fastapi import APIRouter
from app.models.registry import registry
from app.schemas.model_schema import ModelCard

router = APIRouter()


@router.get("/models", response_model=List[ModelCard])
async def list_models() -> List[ModelCard]:
    """
    Returns metadata cards for all registered models.
    Includes availability status, checkpoint path, and any blocking reasons.
    """
    return registry.list_cards()
