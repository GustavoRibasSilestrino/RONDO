import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.banco import Base, engine
from app.main import app
from app.rotas.desafios import hoje


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return TestClient(app)


def conta(cliente, email, nome):
    r = cliente.post("/auth/cadastro", json={"nome": nome, "email": email, "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True}).json()
    return {"Authorization": f"Bearer {r['token']}"}


def dia(n: int) -> str:
    return (hoje() + timedelta(days=n)).isoformat()


def test_comeca_vazio_e_exige_login(cliente):
    assert cliente.get("/desafios").status_code == 401
    a = conta(cliente, "ana@x.com", "Ana")
    assert cliente.get("/desafios", headers=a).json()["itens"] == []   # nenhum desafio pronto


def test_criar_entrar_sair_apagar(cliente):
    a = conta(cliente, "ana@x.com", "Ana")
    b = conta(cliente, "bia@x.com", "Bia")
    r = cliente.post("/desafios", json={"titulo": "30 dias de foco", "descricao": "Treinar todo dia", "inicio": dia(2), "fim": dia(32), "cor": 3}, headers=a)
    assert r.status_code == 201
    d = r.json()
    assert d["situacao"] == "em_breve" and d["participantes"] == 1 and d["meu"] and d["proprio"] and d["dono"]["nome"] == "Ana"

    vistos = cliente.get("/desafios", headers=b).json()["itens"]
    assert [x["titulo"] for x in vistos] == ["30 dias de foco"] and not vistos[0]["meu"]
    assert cliente.get("/desafios", params={"situacao": "em_breve"}, headers=b).json()["itens"][0]["id"] == d["id"]
    assert cliente.get("/desafios", params={"situacao": "em_andamento"}, headers=b).json()["itens"] == []

    assert cliente.post(f"/desafios/{d['id']}/entrar", headers=b).json()["participantes"] == 2
    assert cliente.post(f"/desafios/{d['id']}/entrar", headers=b).json()["participantes"] == 2   # repetir não duplica
    assert [x["id"] for x in cliente.get("/desafios", params={"situacao": "meus"}, headers=b).json()["itens"]] == [d["id"]]
    assert [p["nome"] for p in cliente.get(f"/desafios/{d['id']}/participantes", headers=b).json()["itens"]] == ["Ana", "Bia"]

    assert cliente.post(f"/desafios/{d['id']}/sair", headers=a).status_code == 409   # quem criou não sai, apaga
    assert cliente.post(f"/desafios/{d['id']}/sair", headers=b).json()["participantes"] == 1
    assert cliente.delete(f"/desafios/{d['id']}", headers=b).status_code == 403
    assert cliente.delete(f"/desafios/{d['id']}", headers=a).status_code == 200
    assert cliente.get(f"/desafios/{d['id']}", headers=b).status_code == 404


def test_comecando_hoje_esta_em_andamento(cliente):
    a = conta(cliente, "ana@x.com", "Ana")
    d = cliente.post("/desafios", json={"titulo": "Semana sem falta", "inicio": dia(0), "fim": dia(6)}, headers=a).json()
    assert d["situacao"] == "em_andamento"


def test_periodo_invalido(cliente):
    a = conta(cliente, "ana@x.com", "Ana")
    assert cliente.post("/desafios", json={"titulo": "Ontem", "inicio": dia(-1), "fim": dia(5)}, headers=a).status_code == 422
    assert cliente.post("/desafios", json={"titulo": "Ao contrário", "inicio": dia(5), "fim": dia(1)}, headers=a).status_code == 422
    assert cliente.post("/desafios", json={"titulo": "Longo demais", "inicio": dia(1), "fim": dia(400)}, headers=a).status_code == 422
    assert cliente.post("/desafios", json={"titulo": "ab", "inicio": dia(1), "fim": dia(2)}, headers=a).status_code == 422


def test_apagar_conta_leva_os_desafios(cliente):
    a = conta(cliente, "ana@x.com", "Ana")
    b = conta(cliente, "bia@x.com", "Bia")
    d = cliente.post("/desafios", json={"titulo": "Correr 5k", "inicio": dia(1), "fim": dia(10)}, headers=a).json()
    cliente.post(f"/desafios/{d['id']}/entrar", headers=b)
    assert cliente.get("/me/exportar", headers=a).json()["desafios_criados"][0]["titulo"] == "Correr 5k"
    assert cliente.request("DELETE", "/me", headers=a, json={"senha": "segredo1"}).status_code == 200
    assert cliente.get("/desafios", headers=b).json()["itens"] == []


def test_clubes_populares(cliente):
    a = conta(cliente, "ana@x.com", "Ana")
    b = conta(cliente, "bia@x.com", "Bia")
    c1 = cliente.post("/clubes", json={"nome": "Pequeno"}, headers=a).json()
    c2 = cliente.post("/clubes", json={"nome": "Grande"}, headers=a).json()
    cliente.post("/clubes", json={"nome": "Secreto", "privado": True}, headers=a)
    cliente.post(f"/clubes/{c2['id']}/entrar", headers=b)
    nomes = [x["nome"] for x in cliente.get("/clubes", params={"populares": True}, headers=b).json()["itens"]]
    assert nomes == ["Grande", "Pequeno"] and c1["id"]
