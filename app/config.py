from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    api_secret_key: str = "OPS-COPILOT-2026"
    gemini_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
