import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

import httpx
import pytest
from fastapi.testclient import TestClient

from app.banco import Base, engine
from app.config import config
from app.main import app
from app.servicos import midia as servico

STORAGE = "https://x.supabase.co"


@pytest.fixture()
def cliente(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(config(), "supabase_url", STORAGE)
    monkeypatch.setattr(config(), "supabase_service_key", "chave")
    chamadas = []

    def falso_post(url, headers=None, timeout=None):
        chamadas.append(("POST", url, headers))
        return httpx.Response(200, json={"url": "/object/upload/sign/midia/" + url.split("/midia/")[1] + "?token=abc"}, request=httpx.Request("POST", url))

    def falso_request(metodo, url, headers=None, json=None, timeout=None):
        chamadas.append((metodo, url, json))
        return httpx.Response(200, json=[], request=httpx.Request(metodo, url))

    monkeypatch.setattr(servico.httpx, "post", falso_post)
    monkeypatch.setattr(servico.httpx, "request", falso_request)
    c = TestClient(app)
    c.chamadas = chamadas
    return c


def conta(c, email, nome):
    r = c.post("/auth/cadastro", json={"nome": nome, "email": email, "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True}).json()
    return {"Authorization": f"Bearer {r['token']}"}


def test_upload_exige_login_e_devolve_endereco_assinado(cliente):
    assert cliente.post("/midia/upload", json={"tipo": "imagem", "ext": "jpg"}).status_code == 401
    a = conta(cliente, "ana@x.com", "Ana")
    r = cliente.post("/midia/upload", json={"tipo": "imagem", "ext": "JPG"}, headers=a)
    assert r.status_code == 200
    j = r.json()
    assert j["url_envio"].startswith(f"{STORAGE}/storage/v1/object/upload/sign/midia/1/") and "token=abc" in j["url_envio"]
    assert j["url"].startswith(f"{STORAGE}/storage/v1/object/public/midia/1/") and j["url"].endswith(".jpg")
    assert cliente.post("/midia/upload", json={"tipo": "imagem", "ext": "exe"}, headers=a).status_code == 422


def test_sem_storage_configurado(cliente, monkeypatch):
    monkeypatch.setattr(config(), "supabase_url", "")
    a = conta(cliente, "ana@x.com", "Ana")
    assert cliente.post("/midia/upload", json={"tipo": "imagem", "ext": "jpg"}, headers=a).status_code == 503


def test_foto_aparece_para_outra_pessoa_e_so_aceita_url_propria(cliente):
    a, b = conta(cliente, "ana@x.com", "Ana"), conta(cliente, "bia@x.com", "Bia")
    url = cliente.post("/midia/upload", json={"tipo": "imagem", "ext": "jpg"}, headers=a).json()["url"]
    m = {"id": "m1", "tipo": "imagem", "largura": 800, "altura": 600, "url": url, "extra": "lixo"}
    p = cliente.post("/social/posts", json={"texto": "foto", "midia": [m]}, headers=a)
    assert p.status_code == 201
    visto = cliente.get("/social/feed", headers=b).json()["itens"][0]
    assert visto["midia"] == [{"id": "m1", "tipo": "imagem", "largura": 800, "altura": 600, "url": url}]   # campo extra descartado

    # link externo, ou arquivo de outra pessoa, não vale
    assert cliente.post("/social/posts", json={"texto": "x", "midia": [{**m, "url": "https://evil.com/a.jpg"}]}, headers=a).status_code == 422
    assert cliente.post("/social/posts", json={"texto": "x", "midia": [m]}, headers=b).status_code == 422
    assert cliente.post("/social/posts", json={"texto": "x", "midia": [{"id": "m", "tipo": "pdf"}]}, headers=a).status_code == 422

    # apagar o post apaga o arquivo no Storage
    assert cliente.delete(f"/social/posts/{visto['id']}", headers=a).status_code == 200
    apagou = [c for c in cliente.chamadas if c[0] == "DELETE"]
    assert apagou and apagou[0][2] == {"prefixes": [url.split("/public/midia/")[1]]}
