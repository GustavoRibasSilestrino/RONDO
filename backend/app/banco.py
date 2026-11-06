from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import config


def argumentos_do_engine(url: str, cfg) -> tuple[dict, dict]:
    """Devolve (connect_args, opções do engine) para a URL do banco: pool com limite e reciclagem no Postgres."""
    if url.startswith("sqlite"):
        if url in ("sqlite://", "sqlite:///:memory:"):
            return {"check_same_thread": False}, {"poolclass": StaticPool}
        return {"check_same_thread": False}, {"pool_size": cfg.db_pool_tamanho, "max_overflow": cfg.db_pool_extra, "pool_timeout": cfg.db_pool_espera}
    # Pool de conexões: poucas conexões abertas e reutilizadas, com limite e tempo de espera. Sem isso, cada pico de
    # acessos abriria conexões novas até o banco travar por excesso.
    extra = {
        "pool_size": cfg.db_pool_tamanho,
        "max_overflow": cfg.db_pool_extra,
        "pool_timeout": cfg.db_pool_espera,
        "pool_recycle": cfg.db_pool_reciclar,   # encerra conexões velhas ou ociosas antes de o banco derrubá-las
        "pool_use_lifo": True,                    # reaproveita sempre as mais recentes: as ociosas envelhecem e são trocadas
        "pool_pre_ping": True,
    }
    conectar: dict = {"connect_timeout": cfg.db_conexao_timeout}
    # pooler do Supabase em modo transação (porta 6543): ele reparte as conexões entre várias pessoas a cada transação,
    # então comandos preparados no servidor (o padrão do psycopg) quebrariam; desligamos eles
    if make_url(url).port == 6543:
        conectar["prepare_threshold"] = None
    return conectar, extra


_url = config().database_url
_conectar, _opcoes = argumentos_do_engine(_url, config())
engine = create_engine(_url, connect_args=_conectar, **_opcoes)
Sessao = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def obter_sessao():
    # a conexão volta ao pool assim que a resposta sai (o `with` fecha a sessão mesmo se a rota der erro)
    with Sessao() as sessao:
        yield sessao
