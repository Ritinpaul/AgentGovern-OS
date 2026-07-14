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

    # API Key Auth (Phase 5)
    # admin_api_key is the master bootstrap key (maps to ROLE_ADMIN)
    admin_api_key: str = ""
    # api_keys is a comma-separated list of KEY:ROLE pairs, e.g. "mykey1:operator,mykey2:auditor"
    api_keys: str = ""

    # Request Signing (Phase 5)
    # Falls back to jwt_secret_key when not set
    request_signing_secret: str = ""

    # Rate Limiting (Phase 5)
    rate_limit_enabled: bool = False   # Set True in production; False allows dev bypass
    rate_limit_default: int = 100       # Requests per window
    rate_limit_window_s: int = 60       # Window size in seconds

    # QICACHE
    qicache_ttl_days: int = 3
    qicache_enabled: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

@lru_cache()
def get_settings() -> Settings:
    return Settings()
