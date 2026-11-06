from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres em produção (ex.: postgresql+psycopg://usuario:senha@host:5432/postgres).
    # Sem a variável, usa um SQLite local só para desenvolvimento.
    database_url: str = "sqlite:///./yesteryou.db"
    jwt_segredo: str = "troque-em-producao"
    jwt_expira_minutos: int = 60 * 24 * 7
    origens_permitidas: str = "http://localhost:5173,http://localhost:5180,http://localhost:8081"
    # fotos e vídeos dos posts: bucket público do Supabase Storage; a chave de serviço só existe no servidor
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_bucket: str = "midia"
    # voz do RONDIN para nomes e números (ElevenLabs); sem a chave, o app usa a voz do aparelho nesses trechos
    elevenlabs_api_key: str = ""


@lru_cache
def config() -> Config:
    return Config()
