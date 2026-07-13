from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr, Field
from typing import Optional

class Settings(BaseSettings):
    # App Config
    ENV: str = Field(default="production", validation_alias="ENV")
    LOG_LEVEL: str = "INFO"
    
    # Critical AI & Cloud Infills
    GEMINI_API_KEY: SecretStr | None = Field(default=None, validation_alias="GEMINI_API_KEY")
    GCP_PROJECT_ID: str | None = Field(default=None, validation_alias="GCP_PROJECT_ID")
    API_SECRET_KEY: SecretStr | None = Field(default=None, validation_alias="API_SECRET_KEY")
    
    # Optional settings from before
    REDIS_URL: Optional[str] = Field(default=None, validation_alias="REDIS_URL")
    ALLOWED_ORIGINS: str = Field(default="http://localhost,http://localhost:8000,http://127.0.0.1,http://127.0.0.1:8000")
    SCRAM_OVERRIDE_CODE: str = Field(default="DEFAULT-CODE")

    # Thresholds requested by Operations Director
    ANOMALY_CONFIDENCE_THRESHOLD: float = 0.40

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Instantiate a global singleton
settings = Settings()
