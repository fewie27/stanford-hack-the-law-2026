from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="EVIDENCE_", env_file=".env", extra="ignore")

    data_dir: Path = Path("data/vaults")
    """Directory for encrypted vault files (one file per record id)."""

    app_pepper: str = "dev-only-change-with-evidence-app-pepper"
    """Server secret mixed into key derivation; set via environment in production."""

    screenshot_timeout_ms: int = 45_000
    navigation_timeout_ms: int = 60_000
    viewport_width: int = 1280
    viewport_height: int = 720


settings = Settings()
