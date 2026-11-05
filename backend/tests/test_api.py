import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

import pytest
from fastapi.testclient import TestClient

from app.banco import Base, engine
from app.main import app


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return TestClient(app)


def test_saude(cliente):
    assert cliente.get("/saude").json() == {"status": "ok"}


def test_cadastro_login_e_eu(cliente):
    r = cliente.post("/auth/cadastro", json={"nome": "Ana", "email": "Ana@x.com", "senha": "segredo1"})
    assert r.status_code == 201
    assert cliente.post("/auth/cadastro", json={"nome": "Ana", "email": "ana@x.com", "senha": "segredo1"}).status_code == 409

    assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "errada!"}).status_code == 401
    r = cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo1"})
    assert r.status_code == 200
    token = r.json()["token"]
    eu = cliente.get("/auth/eu", headers={"Authorization": f"Bearer {token}"})
    assert eu.json() == {"email": "ana@x.com", "nome": "Ana", "papel": "usuario", "verificado": False, "pro": False}
    assert cliente.get("/auth/eu").status_code == 401


def test_papel_do_dono_vem_do_banco_e_nao_do_cadastro(cliente):
    from sqlalchemy import select

    from app.banco import Sessao
    from app.modelos import Usuario

    corpo = {"nome": "Dono", "email": "dono@x.com", "senha": "segredo1", "papel": "dono", "verificado": True, "pro": True}
    r = cliente.post("/auth/cadastro", json=corpo).json()
    assert (r["papel"], r["verificado"], r["pro"]) == ("usuario", False, False)   # o cadastro ignora esses campos

    with Sessao() as s:
        u = s.scalar(select(Usuario).where(Usuario.email == "dono@x.com"))
        u.papel, u.verificado, u.pro = "dono", True, True
        s.commit()
    r = cliente.post("/auth/login", json={"email": "dono@x.com", "senha": "segredo1"}).json()
    assert (r["papel"], r["verificado"], r["pro"]) == ("dono", True, True)


def test_profissional(cliente):
    corpo = {"nome": "Bia", "email": "bia@x.com", "tipo": "CRN", "registro": "1234", "uf": "sp"}
    assert cliente.post("/profissionais", json=corpo).json() == {"status": "pendente"}
    assert cliente.post("/profissionais", json=corpo).status_code == 409
    assert cliente.post("/profissionais", json={**corpo, "tipo": "XYZ"}).status_code == 422


def test_assinatura(cliente):
    assert cliente.post("/assinaturas", json={"plano_id": "pro-mensal", "token": "t"}).json() == {"status": "pendente"}
    assert cliente.post("/assinaturas", json={"plano_id": "nada", "token": "t"}).status_code == 422
