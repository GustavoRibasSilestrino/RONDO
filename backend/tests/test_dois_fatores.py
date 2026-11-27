"""Verificação em duas etapas (aplicativo autenticador), avisos de segurança por e-mail e o link "Proteger minha conta"."""
import re

import pytest
from fastapi.testclient import TestClient

from app.banco import Base, engine
from app.main import app
from app.servicos import dois_fatores as d2f


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return TestClient(app)


@pytest.fixture()
def caixa(monkeypatch):
    """Os e-mails que sairiam (avisos e códigos): (para, assunto, texto, html)."""
    enviados = []
    pegar = lambda para, assunto, texto, html=None: enviados.append((para, assunto, texto, html))
    monkeypatch.setattr("app.servicos.avisos_conta.enviar", pegar)
    monkeypatch.setattr("app.rotas.auth.enviar", pegar)
    return enviados


def conta(cliente, email="ana@x.com", aparelho="aparelho-a"):
    r = cliente.post("/auth/cadastro", json={"nome": email.split("@")[0].title(), "email": email, "senha": "segredo1", "nascimento": "1995-04-10",
                                             "aceita_termos": True, "aceita_privacidade": True, "aparelho": aparelho})
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['token']}"}


def codigo_agora(segredo: str, mais: int = 0) -> str:
    return d2f._codigo(segredo, d2f.passo_atual() + mais)


def ligar(cliente, h):
    r = cliente.post("/auth/2fa/iniciar", json={"senha": "segredo1"}, headers=h)
    assert r.status_code == 200
    segredo = r.json()["segredo"]
    assert r.json()["endereco"].startswith("otpauth://totp/RONDO:") and f"secret={segredo}" in r.json()["endereco"]
    r = cliente.post("/auth/2fa/ativar", json={"codigo": codigo_agora(segredo)}, headers=h)
    assert r.status_code == 200
    return segredo, r.json()["codigos_reserva"]


def test_totp_bate_com_o_rfc_6238():
    # vetor de teste do RFC 6238 (SHA-1, segredo "12345678901234567890", T=59 s): 94287082 em 8 dígitos, 287082 em 6
    segredo = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
    assert d2f._codigo(segredo, 59 // 30) == "287082"
    assert d2f.conferir(segredo, "287082", None, agora=59) == 1
    assert d2f.conferir(segredo, "287 082", None, agora=59) == 1       # espaço no meio, como alguns aplicativos mostram
    assert d2f.conferir(segredo, "287082", 1, agora=59) is None         # o mesmo passo não vale duas vezes
    assert d2f.conferir(segredo, "000000", None, agora=59) is None


def test_segredo_fica_cifrado_no_banco(cliente):
    from app.banco import Sessao
    from app.modelos import Usuario
    h = conta(cliente)
    segredo, _ = ligar(cliente, h)
    with Sessao() as s:
        u = s.query(Usuario).one()
        assert u.totp_ativo and segredo not in (u.totp_segredo or "") and d2f.decifrar(u.totp_segredo) == segredo


def test_ligar_pede_a_senha_e_um_codigo_certo(cliente, caixa):
    h = conta(cliente)
    assert cliente.post("/auth/2fa/iniciar", json={"senha": "errada"}, headers=h).status_code == 400
    r = cliente.post("/auth/2fa/iniciar", json={"senha": "segredo1"}, headers=h)
    assert cliente.post("/auth/2fa/ativar", json={"codigo": "000000" if codigo_agora(r.json()["segredo"]) != "000000" else "111111"}, headers=h).status_code == 400
    assert cliente.get("/auth/2fa", headers=h).json() == {"ativo": False, "reservas_restantes": 0}
    assert cliente.post("/auth/2fa/ativar", json={"codigo": codigo_agora(r.json()["segredo"])}, headers=h).status_code == 200
    assert cliente.get("/auth/2fa", headers=h).json() == {"ativo": True, "reservas_restantes": 8}
    assert cliente.get("/auth/eu", headers=h).json()["dois_fatores"] is True
    assert any("ligada" in assunto for _, assunto, _, _ in caixa)   # aviso por e-mail


def test_login_com_2fa_pede_o_codigo_e_nao_aceita_repetido(cliente, caixa):
    h = conta(cliente)
    segredo, _ = ligar(cliente, h)
    corpo = {"email": "ana@x.com", "senha": "segredo1", "aparelho": "aparelho-a"}
    # senha errada continua sendo só "senha errada": não revela que a conta tem 2FA
    r = cliente.post("/auth/login", json={**corpo, "senha": "errada!"})
    assert r.status_code == 401 and r.json()["detail"] == "E-mail ou senha incorretos."
    r = cliente.post("/auth/login", json=corpo)
    assert r.status_code == 401 and r.json()["detail"]["dois_fatores"] is True and "token" not in r.json()
    assert cliente.post("/auth/login", json={**corpo, "codigo": "123"}).status_code == 401
    # o código usado para ativar já foi gasto; o do passo seguinte (dentro da janela) entra uma vez
    assert cliente.post("/auth/login", json={**corpo, "codigo": codigo_agora(segredo)}).status_code == 401
    r = cliente.post("/auth/login", json={**corpo, "codigo": codigo_agora(segredo, 1)})
    assert r.status_code == 200 and r.json()["token"] and r.json()["dois_fatores"] is True
    assert cliente.post("/auth/login", json={**corpo, "codigo": codigo_agora(segredo, 1)}).status_code == 401


def test_codigo_de_reserva_entra_uma_vez_so(cliente, caixa):
    h = conta(cliente)
    _, reservas = ligar(cliente, h)
    assert len(reservas) == 8 and all(re.fullmatch(r"[a-z2-9]{4}-[a-z2-9]{4}", c) for c in reservas)
    corpo = {"email": "ana@x.com", "senha": "segredo1"}
    assert cliente.post("/auth/login", json={**corpo, "codigo": reservas[0].upper().replace("-", " ")}).status_code == 200
    assert cliente.post("/auth/login", json={**corpo, "codigo": reservas[0]}).status_code == 401
    assert cliente.get("/auth/2fa", headers=h).json()["reservas_restantes"] == 7


def test_desligar_e_trocar_reservas_pedem_senha_e_codigo(cliente, caixa):
    h = conta(cliente)
    segredo, reservas = ligar(cliente, h)
    assert cliente.post("/auth/2fa/desativar", json={"senha": "errada", "codigo": codigo_agora(segredo, 1)}, headers=h).status_code == 400
    assert cliente.post("/auth/2fa/desativar", json={"senha": "segredo1", "codigo": "999999" if codigo_agora(segredo, 1) != "999999" else "888888"}, headers=h).status_code == 400
    novas = cliente.post("/auth/2fa/reserva", json={"senha": "segredo1", "codigo": reservas[1]}, headers=h)
    assert novas.status_code == 200 and set(novas.json()["codigos_reserva"]).isdisjoint(reservas)
    assert cliente.post("/auth/2fa/desativar", json={"senha": "segredo1", "codigo": reservas[2]}, headers=h).status_code == 400   # as antigas morreram
    assert cliente.post("/auth/2fa/desativar", json={"senha": "segredo1", "codigo": novas.json()["codigos_reserva"][0]}, headers=h).json() == {"ativo": False, "reservas_restantes": 0}
    assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo1"}).status_code == 200   # sem código de novo
    assert any("desligada" in assunto for _, assunto, _, _ in caixa)


def test_aviso_de_entrada_nova_so_para_aparelho_novo(cliente, caixa):
    conta(cliente, aparelho="aparelho-a")
    corpo = {"email": "ana@x.com", "senha": "segredo1"}
    cliente.post("/auth/login", json={**corpo, "aparelho": "aparelho-a"})
    cliente.post("/auth/login", json=corpo)   # sem identificador (app antigo): nada
    assert caixa == []
    r = cliente.post("/auth/login", json={**corpo, "aparelho": "aparelho-b"}, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36"})
    assert r.status_code == 200 and len(caixa) == 1
    para, assunto, texto, html = caixa[0]
    assert para == "ana@x.com" and "Entrada nova" in assunto and "Chrome no Windows" in texto and "/proteger-conta#t=" in html
    cliente.post("/auth/login", json={**corpo, "aparelho": "aparelho-b"})
    assert len(caixa) == 1


def test_trocar_a_senha_avisa_e_o_link_protege_a_conta(cliente, caixa):
    h = conta(cliente)
    r = cliente.post("/auth/senha", json={"atual": "segredo1", "nova": "outrasenha1"}, headers=h)
    assert r.status_code == 200
    novo = {"Authorization": f"Bearer {r.json()['token']}"}
    assert len(caixa) == 1 and "alterada" in caixa[0][1]
    token = re.search(r"/proteger-conta#t=([\w\-.]+)", caixa[0][2]).group(1)
    assert cliente.post("/auth/proteger", json={"token": "x" * 30}).status_code == 400
    assert cliente.post("/auth/proteger", json={"token": token}).json() == {"status": "ok"}
    # todos os aparelhos saíram, a senha (nova ou antiga) não entra mais e o link não serve de novo
    assert cliente.get("/auth/eu", headers=novo).status_code == 401
    assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "outrasenha1"}).status_code == 401
    assert cliente.post("/auth/proteger", json={"token": token}).status_code == 400


def test_redefinir_a_senha_por_codigo_tambem_avisa(cliente, caixa):
    conta(cliente)
    cliente.post("/auth/esqueci-senha", json={"email": "ana@x.com"})
    codigo = re.search(r"código é: (\d{6})", caixa[0][2]).group(1)
    assert cliente.post("/auth/redefinir-senha", json={"email": "ana@x.com", "codigo": codigo, "nova": "novasenha1"}).status_code == 200
    assert "alterada" in caixa[-1][1]


def test_nome_no_aviso_nao_vira_html():
    from app.servicos.email_modelos import entrada_nova
    m = entrada_nova("<img src=x>", "a@x.com", "hoje", "Chrome no Windows", "https://site/proteger-conta#t=abc")
    assert "<img src=x>" not in m.html and "&lt;img src=x&gt;" in m.html
