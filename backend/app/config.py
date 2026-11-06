from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres em produção (ex.: postgresql+psycopg://usuario:senha@host:5432/postgres).
    # Sem a variável, usa um SQLite local só para desenvolvimento.
    database_url: str = "sqlite:///./yesteryou.db"
    # conexões com o banco: poucas por processo, devolvidas logo e trocadas antes de o servidor do banco derrubá-las.
    # Com o pooler do Supabase em modo transação (porta 6543) milhares de pessoas dividem essas conexões.
    db_pool_tamanho: int = 8
    db_pool_extra: int = 6            # conexões além do tamanho, só nos picos (8 + 6 = 14, abaixo das 15 do pooler do Supabase em modo sessão)
    db_pool_espera: int = 10          # segundos esperando uma conexão livre antes de responder 503
    db_pool_reciclar: int = 280       # segundos: conexão mais velha que isso é trocada
    max_pedidos_simultaneos: int = 32  # pedidos em andamento ao mesmo tempo (tem de ser menor que as 40 threads das rotas)
    espera_fila: float = 10.0          # segundos na fila antes de responder 503
    db_conexao_timeout: int = 10      # segundos para abrir a conexão com o banco
    # limite de requisições por endereço, por minuto (0 desliga); entrar e criar conta têm um limite menor
    limite_req_minuto: int = 600
    limite_auth_minuto: int = 20
    jwt_segredo: str = "troque-em-producao"
    jwt_expira_minutos: int = 60 * 24 * 7
    origens_permitidas: str = "http://localhost:5173,http://localhost:5180,http://localhost:8081"
    # fotos e vídeos dos posts: bucket público do Supabase Storage; a chave de serviço só existe no servidor
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_bucket: str = "midia"
    # voz do RONDIN para nomes e números (Azure Speech); sem as duas, o app usa a voz do aparelho nesses trechos
    azure_speech_key: str = ""
    azure_speech_region: str = ""


@lru_cache
def config() -> Config:
    return Config()
