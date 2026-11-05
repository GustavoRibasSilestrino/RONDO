from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import config

_url = config().database_url
_sqlite = _url.startswith("sqlite")
_extra = {"poolclass": StaticPool} if _url in ("sqlite://", "sqlite:///:memory:") else {}
engine = create_engine(
    _url,
    connect_args={"check_same_thread": False} if _sqlite else {},
    pool_pre_ping=not _sqlite,
    **_extra,
)
Sessao = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def obter_sessao():
    with Sessao() as sessao:
        yield sessao
