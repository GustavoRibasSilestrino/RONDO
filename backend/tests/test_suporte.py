"""O suporte do site: a mensagem fica guardada e é encaminhada por e-mail para a equipe; quem não está na conta informa um
e-mail para a resposta; a mensagem entra na cópia dos dados e sai ao apagar a conta."""
import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.banco import Base, Sessao, engine
from app.main import app
from app.modelos import MensagemSuporte, Usuario
from app.servicos import email as servico_email
from app.servicos.conta import limpar_vencidos


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return TestClient(app)


@pytest.fixture()
def enviados(monkeypatch):
    caixa: list[tuple[str, str, str]] = []
    monkeypatch.setattr(servico_email, "enviar", lambda para, assunto, texto: caixa.append((para, assunto, texto)))
    return caixa


def _conta(cliente, email="ana@x.com"):
    corpo = {"nome": email.split("@")[0].title(), "email": email, "senha": "segredo1", "nascimento": "1995-04-10",
             "aceita_termos": True, "aceita_privacidade": True}
    r = cliente.post("/auth/cadastro", json=corpo)
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_sem_conta_precisa_de_email(cliente, enviados):
    r = cliente.post("/suporte", json={"assunto": "sugestao", "mensagem": "Queria um modo escuro mais escuro."})
    assert r.status_code == 422 and "e-mail" in r.json()["detail"]
    assert enviados == []


def test_sem_conta_com_email_guarda_e_encaminha(cliente, enviados):
    r = cliente.post("/suporte", json={"assunto": "reclamacao", "mensagem": "O botão de entrar demorou muito.", "email": "Bia@X.com", "nome": "Bia"})
    assert r.status_code == 201
    with Sessao() as s:
        m = s.query(MensagemSuporte).one()
        assert (m.assunto, m.email, m.nome, m.usuario_id) == ("reclamacao", "bia@x.com", "Bia", None)
    assert [p for p, *_ in enviados] == ["rondooficial.dev@gmail.com"]
    assert "Reclamação" in enviados[0][1] and "bia@x.com" in enviados[0][2] and "demorou muito" in enviados[0][2]


def test_na_conta_usa_o_email_da_conta_e_avisa_o_dono(cliente, enviados):
    _conta(cliente, "dono@x.com")
    with Sessao() as s:
        s.query(Usuario).filter(Usuario.email == "dono@x.com").update({"papel": "dono"})
        s.commit()
    ana = _conta(cliente)
    r = cliente.post("/suporte", json={"assunto": "loja", "mensagem": "Quando a loja vai abrir?", "email": "outro@x.com"}, headers=ana)
    assert r.status_code == 201
    with Sessao() as s:
        m = s.query(MensagemSuporte).one()
        assert m.email == "ana@x.com" and m.usuario_id is not None   # o e-mail da conta, não o digitado
    assert sorted(p for p, *_ in enviados) == ["dono@x.com", "rondooficial.dev@gmail.com"]


def test_mensagem_curta_ou_assunto_invalido(cliente, enviados):
    assert cliente.post("/suporte", json={"assunto": "outro", "mensagem": "oi", "email": "a@x.com"}).status_code == 422
    assert cliente.post("/suporte", json={"assunto": "outro", "mensagem": "          oi          ", "email": "a@x.com"}).status_code == 422
    assert cliente.post("/suporte", json={"assunto": "fofoca", "mensagem": "Uma mensagem qualquer aqui.", "email": "a@x.com"}).status_code == 422
    assert cliente.post("/suporte", json={"assunto": "outro", "mensagem": "x" * 2001, "email": "a@x.com"}).status_code == 422


def test_sem_email_configurado_a_mensagem_fica_guardada(cliente, monkeypatch):
    def falha(*_):
        raise servico_email.EmailIndisponivel("E-mail não configurado.")
    monkeypatch.setattr(servico_email, "enviar", falha)
    r = cliente.post("/suporte", json={"assunto": "problema", "mensagem": "A tela travou na loja.", "email": "c@x.com"})
    assert r.status_code == 201
    with Sessao() as s:
        assert s.query(MensagemSuporte).count() == 1


def test_exportar_apagar_e_reter_um_ano(cliente, enviados):
    h = _conta(cliente)
    cliente.post("/suporte", json={"assunto": "dados", "mensagem": "Quero saber o que vocês guardam.", "email": None}, headers=h)
    exportado = cliente.get("/me/exportar", headers=h).json()["mensagens_de_suporte"]
    assert [x["assunto"] for x in exportado] == ["dados"]
    assert cliente.request("DELETE", "/me", json={"senha": "segredo1"}, headers=h).status_code == 200
    with Sessao() as s:
        assert s.query(MensagemSuporte).count() == 0
    # sem conta: some depois de um ano
    cliente.post("/suporte", json={"assunto": "outro", "mensagem": "Uma mensagem antiga demais.", "email": "d@x.com"})
    with Sessao() as s:
        s.query(MensagemSuporte).update({"criado_em": datetime.now(timezone.utc) - timedelta(days=366)})
        s.commit()
        limpar_vencidos(s, forcar=True)
        assert s.query(MensagemSuporte).count() == 0
