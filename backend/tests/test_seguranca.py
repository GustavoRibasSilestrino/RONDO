"""As proteções da API: trava por conta no login, token que morre com a senha antiga, cabeçalhos de segurança,
corpo com tamanho máximo, senha mínima e endereço do cliente que não pode ser inventado."""
import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

import jwt
import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request

from app import protecao
from app.banco import Base, engine
from app.config import config
from app.main import app

CADASTRO = {"nome": "Ana", "email": "ana@x.com", "senha": "segredo12", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True}


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    protecao._falhas.clear()
    return TestClient(app)


def _entrar(cliente) -> str:
    assert cliente.post("/auth/cadastro", json=CADASTRO).status_code == 201
    return cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo12"}).json()["token"]


def test_login_trava_a_conta_depois_de_muitas_senhas_erradas(cliente):
    _entrar(cliente)
    for _ in range(protecao.MAX_FALHAS):
        assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "errada-errada"}).status_code == 401
    # travou: nem a senha certa passa enquanto a janela não andar
    r = cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo12"})
    assert r.status_code == 429 and r.headers["retry-after"] == "900"
    # a trava é da conta, não do endereço: outra conta entra normalmente
    outro = {**CADASTRO, "nome": "Bia", "email": "bia@x.com"}
    assert cliente.post("/auth/cadastro", json=outro).status_code == 201
    assert cliente.post("/auth/login", json={"email": "bia@x.com", "senha": "segredo12"}).status_code == 200


def test_senha_certa_zera_as_falhas(cliente):
    _entrar(cliente)
    for _ in range(protecao.MAX_FALHAS - 1):
        cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "errada-errada"})
    assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo12"}).status_code == 200
    assert not protecao.conta_travada("ana@x.com")


def test_trocar_a_senha_derruba_os_tokens_antigos_e_devolve_um_novo(cliente):
    antigo = _entrar(cliente)
    r = cliente.post("/auth/senha", json={"atual": "segredo12", "nova": "outra-senha-9"}, headers={"Authorization": f"Bearer {antigo}"})
    assert r.status_code == 200
    novo = r.json()["token"]
    assert cliente.get("/auth/eu", headers={"Authorization": f"Bearer {antigo}"}).status_code == 401
    assert cliente.get("/auth/eu", headers={"Authorization": f"Bearer {novo}"}).status_code == 200


def test_token_do_login_social_nao_serve_para_entrar(cliente):
    _entrar(cliente)
    falso = jwt.encode({"typ": "social", "sub": "1", "email": "ana@x.com", "exp": 9999999999}, config().jwt_segredo, algorithm="HS256")
    assert cliente.get("/auth/eu", headers={"Authorization": f"Bearer {falso}"}).status_code == 401


def test_token_assinado_com_outro_segredo_ou_sem_assinatura_e_recusado(cliente):
    _entrar(cliente)
    outro = jwt.encode({"sub": "1", "exp": 9999999999}, "segredo-de-outra-pessoa-0123456789", algorithm="HS256")
    sem = jwt.encode({"sub": "1", "exp": 9999999999}, "", algorithm="none")
    for t in (outro, sem):
        assert cliente.get("/auth/eu", headers={"Authorization": f"Bearer {t}"}).status_code == 401


def test_senha_nova_precisa_de_pelo_menos_8(cliente):
    assert cliente.post("/auth/cadastro", json={**CADASTRO, "senha": "curta12"}).status_code == 422


def test_cabecalhos_de_seguranca_em_toda_resposta(cliente):
    for r in (cliente.get("/saude"), cliente.get("/rota-que-nao-existe"), cliente.post("/auth/login", json={"email": "x@x.com", "senha": "qualquer-coisa"})):
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["x-frame-options"] == "DENY"
        assert "max-age" in r.headers["strict-transport-security"]
        assert r.headers["cache-control"] == "no-store"
        assert "frame-ancestors 'none'" in r.headers["content-security-policy"]


def test_corpo_grande_demais_e_recusado_antes_de_ler(cliente):
    r = cliente.post("/auth/login", content=b"x" * (config().max_corpo_bytes + 1), headers={"Content-Type": "application/json"})
    assert r.status_code == 413


def test_cors_so_para_as_origens_do_rondo(cliente):
    de_fora = cliente.options("/auth/login", headers={"Origin": "https://site-de-fora.com", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in de_fora.headers
    de_casa = cliente.options("/auth/login", headers={"Origin": "http://localhost:8081", "Access-Control-Request-Method": "POST"})
    assert de_casa.headers["access-control-allow-origin"] == "http://localhost:8081"
    assert "access-control-allow-credentials" not in de_casa.headers


def _pedido(cabecalhos: dict[str, str]) -> Request:
    return Request({"type": "http", "headers": [(k.lower().encode(), v.encode()) for k, v in cabecalhos.items()], "client": ("10.0.0.9", 1234)})


def test_endereco_do_cliente_nao_pode_ser_inventado():
    # o X-Forwarded-For vem do visitante: não vale
    assert protecao.ip_do_cliente(_pedido({"X-Forwarded-For": "1.2.3.4"})) == "10.0.0.9"
    # o cabeçalho do proxy vale, se for um endereço de verdade
    assert protecao.ip_do_cliente(_pedido({"CF-Connecting-IP": "203.0.113.7", "X-Forwarded-For": "1.2.3.4"})) == "203.0.113.7"
    assert protecao.ip_do_cliente(_pedido({"CF-Connecting-IP": "não é endereço"})) == "10.0.0.9"


def test_codigo_de_convite_trava_depois_de_muitos_erros(cliente):
    token = _entrar(cliente)
    h = {"Authorization": f"Bearer {token}"}
    for _ in range(protecao.MAX_FALHAS):
        assert cliente.post("/clubes/entrar", json={"codigo": "ZZZZZZ"}, headers=h).status_code == 404
    # travou: nem um código certo passa por 15 minutos (não dá para sair testando códigos)
    codigo = cliente.post("/clubes", json={"nome": "Meu", "privado": True}, headers=h).json()["codigo"]
    assert cliente.post("/clubes/entrar", json={"codigo": codigo}, headers=h).status_code == 429


def test_esqueci_a_senha_responde_igual_e_manda_o_email_depois(cliente, monkeypatch):
    from app.rotas import auth
    enviados = []
    monkeypatch.setattr(auth, "enviar", lambda para, assunto, texto: enviados.append(para))
    _entrar(cliente)
    r1 = cliente.post("/auth/esqueci-senha", json={"email": "ana@x.com"})
    r2 = cliente.post("/auth/esqueci-senha", json={"email": "ninguem@x.com"})
    assert r1.status_code == r2.status_code == 200 and r1.json() == r2.json() == {"status": "ok"}
    assert enviados == ["ana@x.com"]   # saiu em segundo plano, só para quem tem conta
