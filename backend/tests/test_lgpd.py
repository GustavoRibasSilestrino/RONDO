import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.banco import Base, Sessao, engine
from app.main import app
from app.modelos import Consentimento, Notificacao, Post, Seguidor, Story, Usuario
from app.servicos.conta import limpar_vencidos


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return TestClient(app)


def _corpo(email="ana@x.com", nascimento="1995-04-10", **extra):
    return {"nome": "Ana", "email": email, "senha": "segredo1", "nascimento": nascimento,
            "aceita_termos": True, "aceita_privacidade": True, **extra}


def _anos_atras(n: int) -> str:
    hoje = date.today()
    return hoje.replace(year=hoje.year - n).isoformat()


def _conta(cliente, email="ana@x.com"):
    r = cliente.post("/auth/cadastro", json=_corpo(email))
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_cadastro_exige_aceite_dos_termos_e_da_privacidade(cliente):
    assert cliente.post("/auth/cadastro", json=_corpo(aceita_termos=False)).status_code == 422
    assert cliente.post("/auth/cadastro", json=_corpo(aceita_privacidade=False)).status_code == 422
    sem_nascimento = _corpo()
    del sem_nascimento["nascimento"]
    assert cliente.post("/auth/cadastro", json=sem_nascimento).status_code == 422


def test_aceite_fica_registrado_com_versao_e_marketing_desligado(cliente):
    r = cliente.post("/auth/cadastro", json=_corpo())
    assert r.status_code == 201 and r.json()["marketing"] is False
    with Sessao() as s:
        tipos = {(c.tipo, c.aceito) for c in s.query(Consentimento).all()}
        versoes = {c.versao for c in s.query(Consentimento).all()}
    assert tipos == {("termos", True), ("privacidade", True), ("marketing", False)}
    assert None not in versoes


def test_menor_precisa_de_responsavel(cliente):
    menor = _anos_atras(15)
    assert cliente.post("/auth/cadastro", json=_corpo(nascimento=menor)).status_code == 422
    resp = {"nome": "Mae da Ana", "email": "mae@x.com", "autoriza": False}
    assert cliente.post("/auth/cadastro", json=_corpo(nascimento=menor, responsavel=resp)).status_code == 422
    resp_mesmo_email = {"nome": "Mae", "email": "ana@x.com", "autoriza": True}
    assert cliente.post("/auth/cadastro", json=_corpo(nascimento=menor, responsavel=resp_mesmo_email)).status_code == 422
    resp["autoriza"] = True
    assert cliente.post("/auth/cadastro", json=_corpo(nascimento=menor, responsavel=resp)).status_code == 201
    with Sessao() as s:
        c = s.query(Consentimento).filter_by(tipo="responsavel").one()
    assert c.aceito and c.detalhe == {"nome": "Mae da Ana", "email": "mae@x.com"}


def test_adulto_nao_guarda_dados_de_responsavel(cliente):
    resp = {"nome": "Alguem", "email": "alguem@x.com", "autoriza": True}
    assert cliente.post("/auth/cadastro", json=_corpo(responsavel=resp)).status_code == 201
    with Sessao() as s:
        assert s.query(Consentimento).filter_by(tipo="responsavel").count() == 0


def test_marketing_liga_desliga_e_registra(cliente):
    ana = _conta(cliente)
    assert cliente.patch("/me/marketing", json={"marketing": True}, headers=ana).json()["marketing"] is True
    assert cliente.patch("/me/marketing", json={"marketing": False}, headers=ana).json()["marketing"] is False
    with Sessao() as s:
        historico = [c.aceito for c in s.query(Consentimento).filter_by(tipo="marketing").order_by(Consentimento.id)]
    assert historico == [False, True, False]


def test_exportar_traz_os_dados_da_pessoa(cliente):
    ana = _conta(cliente)
    cliente.put("/me/dados", json={"itens": {"agua": {"2026-11-05": 6}}}, headers=ana)
    cliente.post("/social/posts", json={"texto": "Primeiro treino"}, headers=ana)
    d = cliente.get("/me/exportar", headers=ana).json()
    assert d["conta"]["email"] == "ana@x.com" and d["conta"]["nascimento"] == "1995-04-10"
    assert d["dados_do_app"] == {"agua": {"2026-11-05": 6}}
    assert [p["texto"] for p in d["publicacoes"]] == ["Primeiro treino"]
    assert {c["tipo"] for c in d["consentimentos"]} == {"termos", "privacidade", "marketing"}
    assert "senha_hash" not in str(d)
    assert cliente.get("/me/exportar").status_code == 401


def test_apagar_conta_pede_senha_e_apaga_tudo(cliente):
    ana, bia = _conta(cliente), _conta(cliente, "bia@x.com")
    post = cliente.post("/social/posts", json={"texto": "oi"}, headers=ana).json()
    cliente.put(f"/social/posts/{post['id']}/curtida", headers=bia)
    cliente.put("/pessoas/1/seguir", headers=bia)
    cliente.post("/social/stories", json={"texto": "story"}, headers=ana)

    assert cliente.request("DELETE", "/me", json={"senha": "errada"}, headers=ana).status_code == 401
    assert cliente.request("DELETE", "/me", json={"senha": "segredo1"}, headers=ana).status_code == 200
    with Sessao() as s:
        assert s.query(Usuario).filter_by(email="ana@x.com").count() == 0
        assert s.query(Post).count() == 0 and s.query(Story).count() == 0
        assert s.query(Seguidor).count() == 0 and s.query(Notificacao).count() == 0
        assert s.query(Consentimento).filter_by(usuario_id=1).count() == 0
    assert cliente.get("/me/dados", headers=ana).status_code == 401   # o token da conta apagada não vale mais
    assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo1"}).status_code == 401
    assert cliente.get("/me/dados", headers=bia).status_code == 200   # a outra conta segue normal


def test_retencao_apaga_stories_e_avisos_vencidos(cliente):
    _conta(cliente)
    agora = datetime.now(timezone.utc)
    with Sessao() as s:
        s.add_all([
            Story(autor_id=1, texto="velho", criado_em=agora - timedelta(hours=25)),
            Story(autor_id=1, texto="novo", criado_em=agora - timedelta(hours=1)),
            Notificacao(usuario_id=1, ator_id=1, tipo="seguidor", criado_em=agora - timedelta(days=181)),
            Notificacao(usuario_id=1, ator_id=1, tipo="seguidor", criado_em=agora - timedelta(days=2)),
        ])
        s.commit()
        limpar_vencidos(s, forcar=True)
        assert [x.texto for x in s.query(Story).all()] == ["novo"]
        assert s.query(Notificacao).count() == 1


def test_erro_de_validacao_nao_devolve_a_senha(cliente):
    r = cliente.post("/auth/cadastro", json=_corpo(aceita_termos=False))
    assert r.status_code == 422
    assert "segredo1" not in r.text and "ana@x.com" not in r.text and "1995-04-10" not in r.text
    assert "aceite os Termos de Uso" in r.json()["detail"][0]["msg"]
