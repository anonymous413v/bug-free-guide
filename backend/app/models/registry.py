"""
Model Registry
==============
Maintains the catalog of all model adapters, handles lazy loading,
and provides a unified interface for the inference service.
"""
from __future__ import annotations
import logging
from typing import Dict, List, Optional

from app.models.base_adapter import BaseModelAdapter
from app.models.aasist_adapter import AASISTAdapter
from app.models.rawnet2_adapter import RawNet2Adapter
from app.models.hubert_adapter import HuBERTAdapter
from app.models.w2v2_aasist_adapter import W2V2AASISTAdapter
from app.models.df_arena_adapter import DFArenaAdapter
from app.schemas.model_schema import ModelCard, ModelAvailability

logger = logging.getLogger(__name__)


class ModelRegistry:
    """
    Singleton-style registry of all model adapters.

    Adapters are lazy-loaded: the checkpoint is only brought into memory
    when an inference request needs that specific model. This avoids loading
    all (potentially multiple GB) models at startup.
    """

    def __init__(self) -> None:
        # Ordered dict preserves display order in the UI
        self._adapters: Dict[str, BaseModelAdapter] = {}
        self._register_all()

    def _register_all(self) -> None:
        """Instantiate (but do NOT load) all adapters."""
        adapters: List[BaseModelAdapter] = [
            AASISTAdapter(),
            RawNet2Adapter(),
            HuBERTAdapter(),
            W2V2AASISTAdapter(),
            DFArenaAdapter(),
        ]
        for adapter in adapters:
            self._adapters[adapter.name] = adapter
            status = "available" if adapter.is_available() else "blocked/missing"
            logger.info("Registered %s [%s]", adapter.display_name, status)

    def get_adapter(self, model_id: str) -> Optional[BaseModelAdapter]:
        return self._adapters.get(model_id)

    def list_adapters(self) -> List[BaseModelAdapter]:
        return list(self._adapters.values())

    def list_cards(self) -> List[ModelCard]:
        return [a.card() for a in self._adapters.values()]

    def get_available_ids(self) -> List[str]:
        """Return IDs of models that are available (checkpoint exists, not blocked)."""
        return [
            a.name for a in self._adapters.values()
            if a.is_available()
        ]

    def ensure_loaded(self, model_id: str) -> BaseModelAdapter:
        """Load a model if not already loaded. Returns the adapter."""
        adapter = self._adapters.get(model_id)
        if adapter is None:
            raise ValueError(f"Unknown model ID: {model_id!r}")
        if not adapter.is_available():
            raise RuntimeError(
                f"Model {model_id!r} is not available: {adapter.availability_reason()}"
            )
        if not adapter.is_loaded:
            adapter.load()
        return adapter

    @property
    def inference_available(self) -> bool:
        """True if at least one model is available (can be loaded)."""
        return bool(self.get_available_ids())


# Module-level singleton — created once at import time
registry = ModelRegistry()
