"""A loja de pacotinhos do site: qualquer pessoa abre um pacote e recebe um código; o mascote só vai para uma conta quando
ela resgata o código. O sorteio é do servidor e as chances são as mesmas que o site mostra."""
import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.banco import Base, Sessao, engine
from app.main import app
from app.modelos import Mascote, Resgate
from app.servicos import loja
from app.servicos.conta import limpar_vencidos


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return TestClient(app)


def _conta(cliente, email="ana@x.com"):
    corpo = {"nome": email.split("@")[0].title(), "email": email, "senha": "segredo1", "nascimento": "1995-04-10",
             "aceita_termos": True, "aceita_privacidade": True}
    r = cliente.post("/auth/cadastro", json=corpo)
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _abrir(cliente, pacote="ouro", **extra):
    r = cliente.post("/loja/abrir", json={"pacote": pacote}, **extra)
    assert r.status_code == 201, r.text
    return r.json()


def _resgatar(cliente, h, codigo):
    return cliente.post("/loja/resgatar", json={"codigo": codigo}, headers=h)


def test_abrir_nao_pede_conta_e_devolve_um_codigo(cliente):
    p = _abrir(cliente, "roxo")
    assert re.fullmatch(r"[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}", p["codigo"])
    assert 0 <= p["linha"] < 5 and 0 <= p["coluna"] < loja.RARIDADES[p["linha"]][1]
    assert p["raridade"] == loja.RARIDADES[p["linha"]][0]
    vence = datetime.fromisoformat(p["expira_em"])
    assert timedelta(days=6, hours=23) < vence - datetime.now(timezone.utc) <= timedelta(days=7)
    with Sessao() as s:   # sem conta, nada da pessoa fica guardado: só o código e o mascote
        r = s.get(Resgate, p["codigo"].replace("-", ""))
        assert r.usuario_id is None and r.resgatado_em is None


def test_pacote_que_nao_existe(cliente):
    assert cliente.post("/loja/abrir", json={"pacote": "diamante"}).status_code == 422
    assert cliente.post("/loja/abrir", json={}).status_code == 422


def test_resgatar_pede_conta(cliente):
    p = _abrir(cliente)
    assert cliente.post("/loja/resgatar", json={"codigo": p["codigo"]}).status_code == 401
    assert cliente.get("/loja/colecao").status_code == 401


def test_resgatar_poe_o_mascote_na_conta(cliente):
    h = _conta(cliente)
    abertos = [_abrir(cliente, p) for p in ("roxo", "prata", "ouro") * 5]
    assert cliente.get("/loja/colecao", headers=h).json()["mascotes"] == []   # abrir não guarda nada: só o resgate
    for p in abertos:
        r = _resgatar(cliente, h, p["codigo"])
        assert r.status_code == 200, r.text
        assert (r.json()["linha"], r.json()["coluna"]) == (p["linha"], p["coluna"])
    col = cliente.get("/loja/colecao", headers=h).json()
    assert col["total"] == 69
    assert sum(m["quantidade"] for m in col["mascotes"]) == 15
    assert {(m["linha"], m["coluna"]) for m in col["mascotes"]} == {(p["linha"], p["coluna"]) for p in abertos}


def test_codigo_digitado_de_qualquer_jeito(cliente):
    h = _conta(cliente)
    p = _abrir(cliente)
    bagunçado = "  " + p["codigo"].lower().replace("-", " ") + " "
    assert _resgatar(cliente, h, bagunçado).status_code == 200


def test_o_mesmo_codigo_vale_uma_vez(cliente):
    ana, bia = _conta(cliente), _conta(cliente, "bia@x.com")
    p = _abrir(cliente)
    assert _resgatar(cliente, ana, p["codigo"]).json()["quantidade"] == 1
    # a mesma conta de novo: não soma outra vez
    assert _resgatar(cliente, ana, p["codigo"]).json()["quantidade"] == 1
    # outra conta: recusado
    r = _resgatar(cliente, bia, p["codigo"])
    assert r.status_code == 409
    assert cliente.get("/loja/colecao", headers=bia).json()["mascotes"] == []


def test_mascote_repetido_soma_na_mesma_linha(cliente, monkeypatch):
    monkeypatch.setattr(loja, "sortear", lambda pacote: (4, 3))
    h = _conta(cliente)
    primeiro, segundo = _abrir(cliente), _abrir(cliente)
    assert _resgatar(cliente, h, primeiro["codigo"]).json()["quantidade"] == 1
    assert _resgatar(cliente, h, segundo["codigo"]).json() == {"linha": 4, "coluna": 3, "raridade": "lendaria", "quantidade": 2}
    assert cliente.get("/loja/colecao", headers=h).json()["mascotes"] == [{"linha": 4, "coluna": 3, "raridade": "lendaria", "quantidade": 2}]
    with Sessao() as s:
        assert s.query(Mascote).count() == 1


def test_codigo_que_nao_existe_ou_venceu(cliente):
    h = _conta(cliente)
    assert _resgatar(cliente, h, "ABCDE-FGHJK").status_code == 404
    p = _abrir(cliente)
    with Sessao() as s:   # oito dias atrás
        r = s.get(Resgate, p["codigo"].replace("-", ""))
        r.criado_em = datetime.now(timezone.utc) - timedelta(days=8)
        s.commit()
    assert _resgatar(cliente, h, p["codigo"]).status_code == 404
    with Sessao() as s:   # e a limpeza apaga o código vencido do banco
        limpar_vencidos(s, forcar=True)
        assert s.get(Resgate, p["codigo"].replace("-", "")) is None


def test_exportar_e_apagar_a_conta_levam_os_mascotes(cliente):
    h = _conta(cliente)
    p = _abrir(cliente)
    _resgatar(cliente, h, p["codigo"])
    exportado = cliente.get("/me/exportar", headers=h).json()
    assert [(x["linha"], x["coluna"], x["quantidade"]) for x in exportado["mascotes_da_loja"]] == [(p["linha"], p["coluna"], 1)]
    assert [x["codigo"] for x in exportado["codigos_resgatados_na_loja"]] == [p["codigo"].replace("-", "")]
    assert cliente.request("DELETE", "/me", json={"senha": "segredo1"}, headers=h).status_code == 200
    with Sessao() as s:
        assert s.query(Mascote).count() == 0
        assert s.query(Resgate).count() == 0


def test_chances_do_sorteio():
    assert loja.TOTAL == 69
    for pacote, chances in loja.CHANCES.items():
        assert sum(chances) == 1000, pacote
        assert len(chances) == len(loja.RARIDADES)
    n = 20_000
    roxo = Counter(loja.sortear("roxo")[0] for _ in range(n))
    ouro = Counter(loja.sortear("ouro")[0] for _ in range(n))
    assert roxo[4] < 70                 # 0,1%: uns 20 em 20 mil
    assert 800 < ouro[4] < 1200         # 5%: uns 1000 em 20 mil
    assert 13_400 < roxo[0] < 14_600    # 70% de comuns no roxo


def test_chances_iguais_as_do_site():
    """O site mostra as chances ao lado de cada pacote: elas têm de ser as mesmas que o servidor usa no sorteio."""
    site = Path(__file__).resolve().parents[2] / "vitrine" / "src" / "data" / "loja.ts"
    if not site.exists():
        pytest.skip("sem a pasta do site ao lado")
    texto = site.read_text(encoding="utf-8")
    ordem = [r for r, _ in loja.RARIDADES]
    for pacote, chances in loja.CHANCES.items():
        bloco = re.search(rf'id:\s*"{pacote}".*?chances:\s*\{{([^}}]*)\}}', texto, re.S)
        assert bloco, pacote
        lido = {k: int(v) for k, v in re.findall(r"(\w+):\s*(\d+)", bloco.group(1))}
        assert tuple(lido[r] for r in ordem) == chances, pacote
    quantos = [int(q) for q in re.findall(r"quantos:\s*(\d+)", texto)]
    assert quantos == [q for _, q in loja.RARIDADES]
