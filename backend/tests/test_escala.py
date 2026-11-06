import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import event

from app.banco import Base, argumentos_do_engine, engine
from app.config import Config
from app.limite import LimiteDeRequisicoes
from app.main import app

CADASTRO = {"nascimento": "1990-01-01", "aceita_termos": True, "aceita_privacidade": True, "senha": "segredo1"}


def test_pool_do_postgres_tem_limite_e_reciclagem():
    cfg = Config(database_url="postgresql+psycopg://u:s@h:5432/db")
    conectar, opcoes = argumentos_do_engine(cfg.database_url, cfg)
    assert opcoes["pool_size"] == 8 and opcoes["max_overflow"] == 6
    assert opcoes["pool_timeout"] == 10 and opcoes["pool_recycle"] == 280 and opcoes["pool_pre_ping"] is True
    assert conectar == {"connect_timeout": 10}   # porta 5432: comandos preparados continuam ligados


def test_pooler_em_modo_transacao_desliga_comandos_preparados():
    cfg = Config(database_url="postgresql+psycopg://u:s@h:6543/db")
    conectar, _ = argumentos_do_engine(cfg.database_url, cfg)
    assert conectar["prepare_threshold"] is None


def test_sqlite_nao_usa_pool_de_postgres():
    cfg = Config(database_url="sqlite://")
    conectar, opcoes = argumentos_do_engine(cfg.database_url, cfg)
    assert conectar == {"check_same_thread": False} and "pool_size" not in opcoes


def _app_com_limite(geral, auth):
    a = FastAPI()
    a.add_middleware(LimiteDeRequisicoes, por_minuto=geral, auth_por_minuto=auth)

    @a.get("/x")
    def x():
        return {"ok": True}

    @a.post("/auth/login")
    def login():
        return {"ok": True}

    @a.get("/saude")
    def saude():
        return {"status": "ok"}

    return TestClient(a)


def test_limite_geral_responde_429_depois_do_teto():
    c = _app_com_limite(5, 0)
    assert [c.get("/x").status_code for _ in range(5)] == [200] * 5
    r = c.get("/x")
    assert r.status_code == 429 and r.headers["retry-after"] == "60"
    assert c.get("/saude").status_code == 200   # o health check do Render nunca é barrado


def test_entrar_tem_limite_proprio_menor():
    c = _app_com_limite(100, 3)
    assert [c.post("/auth/login").status_code for _ in range(3)] == [200] * 3
    assert c.post("/auth/login").status_code == 429
    assert c.get("/x").status_code == 200   # o resto da API continua livre


def _entrar(c, email):
    r = c.post("/auth/cadastro", json={**CADASTRO, "nome": "Ana", "email": email})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}", "Accept-Encoding": "gzip"}


def test_respostas_grandes_saem_comprimidas():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    c = TestClient(app)
    h = _entrar(c, "ana@x.com")
    for i in range(30):
        c.post("/social/posts", json={"texto": f"post {i} " + "x" * 80}, headers=h)
    resp = c.get("/social/feed", params={"limite": 30}, headers=h)
    assert resp.status_code == 200 and resp.headers.get("content-encoding") == "gzip"
    assert len(resp.json()["itens"]) == 30


def test_resumo_usa_poucas_consultas():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    c = TestClient(app)
    h = _entrar(c, "ana2@x.com")
    consultas: list[str] = []

    def contar(conexao, cursor, sql, *resto):
        consultas.append(sql)

    event.listen(engine, "before_cursor_execute", contar)
    try:
        assert c.get("/social/resumo", headers=h).status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", contar)
    # a pessoa logada (1) + as contagens juntas (1) + a lista de clubes (1)
    assert len(consultas) <= 4, consultas


def test_fila_de_concorrencia_responde_503_se_a_espera_estoura():
    import asyncio

    import httpx

    from app.concorrencia import LimiteDeConcorrencia

    a = FastAPI()

    @a.get("/lenta")
    async def lenta():
        await asyncio.sleep(0.6)
        return {"ok": True}

    @a.get("/saude")
    async def saude():
        return {"status": "ok"}

    a.add_middleware(LimiteDeConcorrencia, maximo=1, espera=0.2)

    async def rodar():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=a), base_url="http://t") as c:
            lentas = await asyncio.gather(*[c.get("/lenta") for _ in range(3)])
            saude = await c.get("/saude")
            return sorted(r.status_code for r in lentas), saude.status_code

    codigos, saude = asyncio.run(rodar())
    assert codigos == [200, 503, 503]   # um passa; os outros esperam 0,2 s e recebem 503
    assert saude == 200                  # o health check nunca entra na fila


def test_a_fila_deixa_todos_passarem_quando_ha_vaga():
    from app.concorrencia import LimiteDeConcorrencia

    a = FastAPI()

    @a.get("/x")
    def x():
        return {"ok": True}

    a.add_middleware(LimiteDeConcorrencia, maximo=4, espera=1)
    c = TestClient(a)
    assert [c.get("/x").status_code for _ in range(20)] == [200] * 20
