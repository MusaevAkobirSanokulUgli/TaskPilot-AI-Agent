"""Configuration for the TaskPilot Agent Core."""

import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class Settings:
    """Application settings loaded from environment variables."""

    DOTNET_API_URL: str = os.getenv("DOTNET_API_URL", "http://localhost:5002")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "deepseek-chat")
    AGENT_PORT: int = int(os.getenv("AGENT_PORT", "8001"))
    MAX_ITERATIONS: int = int(os.getenv("MAX_ITERATIONS", "10"))
    MEMORY_CAPACITY_SHORT_TERM: int = 20
    MEMORY_CAPACITY_LONG_TERM: int = 500
    USE_MOCK_LLM: bool = os.getenv("OPENAI_API_KEY", "") == ""


settings = Settings()

if settings.USE_MOCK_LLM:
    logger.warning("OPENAI_API_KEY not set — running in mock LLM mode (rule-based fallback)")
else:
    logger.info("LLM configured: %s via %s", settings.OPENAI_MODEL, settings.OPENAI_BASE_URL)
