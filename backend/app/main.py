"""
VOICEGUARD FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import APP_TITLE, APP_VERSION, CORS_ORIGINS, API_PREFIX
from app.core.logging_config import setup_logging, get_logger
from app.api.routes import health, models, inference

setup_logging("INFO")
logger = get_logger("voiceguard.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("VOICEGUARD backend starting up...")
    # Registry is initialized at import time (fast — no model loading)
    from app.models.registry import registry
    available = registry.get_available_ids()
    logger.info("Available models: %s", available)
    yield
    logger.info("VOICEGUARD backend shutting down.")


app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description="AI-Powered Voice Deepfake Detection API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=API_PREFIX, tags=["Health"])
app.include_router(models.router, prefix=API_PREFIX, tags=["Models"])
app.include_router(inference.router, prefix=API_PREFIX, tags=["Inference"])


@app.get("/")
async def root():
    return {"message": "VOICEGUARD API", "version": APP_VERSION, "docs": "/docs"}
