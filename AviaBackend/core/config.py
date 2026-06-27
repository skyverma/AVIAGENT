from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AviaBackend"
    environment: str = "development"
    cors_origins: str = "http://localhost:8090"
    database_url: str = "postgresql://avia_user:avia_pass@postgres:5432/avia_db"
    mongo_uri: str = "mongodb://root:aviaroot@mongo:27017/avia_dev?authSource=admin"
    redis_url: str = "redis://redis:6379/0"
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "aviadmin"
    minio_secret_key: str = "aviadmin123"
    minio_bucket: str = "avia-data"
    minio_secure: bool = False
    auth_service_url: str = "http://auth:8002"
    ai_service_url: str = "http://ai:8012"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_execution_queue: str = "avia.execution"
    gemini_api_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
