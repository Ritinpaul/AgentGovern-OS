"""AgentGovern OS — Configuration via environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # App
    app_name: str = "AgentGovern OS"
    app_env: str = "development"
    app_debug: bool = True
    log_level: str = "INFO"

    # Database
    database_url: str = "postgresql+asyncpg://agentgovern:secret@localhost:5432/agentgovern"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8001

    # Ollama
    ollama_base_url: str = "http://localhost:11434"

    # LLM Fallbacks
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # JWT Auth
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # QICACHE
    qicache_ttl_days: int = 3
    qicache_enabled: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
