"""A loja de pacotinhos do site: comprar pede conta e o mascote vai direto para a coleção; um código de resgate põe um
mascote na conta de quem o resgata, uma vez só. O sorteio é do servidor e as chances são as mesmas que o site mostra."""
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
from app.modelos import Mascote, Resgate, Usuario
from app.servicos import loja
from app.servicos.conta import limpar_vencidos


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return TestClient(app)


@pytest.fixture(autouse=True)
def loja_aberta(monkeypatch):
    """Os testes da compra rodam com a loja aberta; os da loja fechada desligam isto no próprio teste."""
    monkeypatch.setattr(loja, "ABERTA", True)


def _conta(cliente, email="ana@x.com"):
    corpo = {"nome": email.split("@")[0].title(), "email": email, "senha": "segredo1", "nascimento": "1995-04-10",
             "aceita_termos": True, "aceita_privacidade": True}
    r = cliente.post("/auth/cadastro", json=corpo)
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _comprar(cliente, h, pacote="ouro"):
    r = cliente.post("/loja/abrir", json={"pacote": pacote}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def _codigo(linha=2, coluna=5, dias=0) -> str:
    """um código de resgate guardado no banco (hoje só os testes criam; serve para vales-presente no futuro)"""
    c = loja.novo_codigo()
    with Sessao() as s:
        s.add(Resgate(codigo=c, pacote="ouro", linha=linha, coluna=coluna, criado_em=datetime.now(timezone.utc) - timedelta(days=dias)))
        s.commit()
    return f"{c[:5]}-{c[5:]}"


def test_comprar_pede_conta(cliente):
    assert cliente.post("/loja/abrir", json={"pacote": "roxo"}).status_code == 401
    assert cliente.post("/loja/resgatar", json={"codigo": "ABCDE-FGHJK"}).status_code == 401
    assert cliente.get("/loja/colecao").status_code == 401


def test_loja_fechada_so_o_dono_compra(cliente, monkeypatch):
    """Sem pagamento, ninguém pode ganhar mascote de graça: a loja fechada recusa a compra e avisa o site; o dono testa."""
    monkeypatch.setattr(loja, "ABERTA", False)
    ana, dono = _conta(cliente), _conta(cliente, "dono@x.com")
    with Sessao() as s:
        s.query(Usuario).filter(Usuario.email == "dono@x.com").update({"papel": "dono"})
        s.commit()
    r = cliente.post("/loja/abrir", json={"pacote": "ouro"}, headers=ana)
    assert r.status_code == 403 and "em breve" in r.json()["detail"]
    assert cliente.get("/loja/colecao", headers=ana).json() == {"total": 69, "mascotes": [], "pode_comprar": False, "escolhido": None}
    assert cliente.get("/loja/colecao", headers=dono).json()["pode_comprar"] is True
    assert _comprar(cliente, dono)["quantidade"] == 1
    with Sessao() as s:
        assert s.query(Mascote).count() == 1   # só a do dono


def test_pacote_que_nao_existe(cliente):
    h = _conta(cliente)
    assert cliente.post("/loja/abrir", json={"pacote": "diamante"}, headers=h).status_code == 422
    assert cliente.post("/loja/abrir", json={}, headers=h).status_code == 422


def test_a_compra_vai_direto_para_a_conta(cliente):
    h = _conta(cliente)
    comprados = [_comprar(cliente, h, p) for p in ("roxo", "prata", "ouro") * 5]
    for m in comprados:
        assert 0 <= m["linha"] < 5 and 0 <= m["coluna"] < loja.RARIDADES[m["linha"]][1]
        assert m["raridade"] == loja.RARIDADES[m["linha"]][0]
    col = cliente.get("/loja/colecao", headers=h).json()
    assert col["total"] == 69
    assert sum(m["quantidade"] for m in col["mascotes"]) == 15
    assert {(m["linha"], m["coluna"]) for m in col["mascotes"]} == {(m["linha"], m["coluna"]) for m in comprados}


def test_mascote_repetido_soma_na_mesma_linha(cliente, monkeypatch):
    monkeypatch.setattr(loja, "sortear", lambda pacote: (4, 3))
    h = _conta(cliente)
    assert _comprar(cliente, h)["quantidade"] == 1
    assert _comprar(cliente, h) == {"linha": 4, "coluna": 3, "raridade": "lendaria", "quantidade": 2}
    assert cliente.get("/loja/colecao", headers=h).json()["mascotes"] == [{"linha": 4, "coluna": 3, "raridade": "lendaria", "quantidade": 2}]
    with Sessao() as s:
        assert s.query(Mascote).count() == 1


def test_a_colecao_e_de_cada_conta(cliente):
    ana, bia = _conta(cliente), _conta(cliente, "bia@x.com")
    _comprar(cliente, ana)
    assert cliente.get("/loja/colecao", headers=bia).json()["mascotes"] == []
    assert len(cliente.get("/loja/colecao", headers=ana).json()["mascotes"]) == 1


def test_codigo_vale_uma_vez_e_vai_para_quem_resgata(cliente):
    ana, bia = _conta(cliente), _conta(cliente, "bia@x.com")
    codigo = _codigo(linha=2, coluna=5)
    bagunçado = "  " + codigo.lower().replace("-", " ") + " "   # digitado de qualquer jeito
    r = cliente.post("/loja/resgatar", json={"codigo": bagunçado}, headers=ana)
    assert r.status_code == 200 and r.json() == {"linha": 2, "coluna": 5, "raridade": "rara", "quantidade": 1}
    # a mesma conta de novo: não soma outra vez
    assert cliente.post("/loja/resgatar", json={"codigo": codigo}, headers=ana).json()["quantidade"] == 1
    # outra conta: recusado
    assert cliente.post("/loja/resgatar", json={"codigo": codigo}, headers=bia).status_code == 409
    assert cliente.get("/loja/colecao", headers=bia).json()["mascotes"] == []


def test_codigo_que_nao_existe_ou_venceu(cliente):
    h = _conta(cliente)
    assert cliente.post("/loja/resgatar", json={"codigo": "ABCDE-FGHJK"}, headers=h).status_code == 404
    velho = _codigo(dias=8)
    assert cliente.post("/loja/resgatar", json={"codigo": velho}, headers=h).status_code == 404
    with Sessao() as s:   # e a limpeza apaga o código vencido do banco
        limpar_vencidos(s, forcar=True)
        assert s.get(Resgate, velho.replace("-", "")) is None


def test_exportar_e_apagar_a_conta_levam_os_mascotes(cliente):
    h = _conta(cliente)
    m = _comprar(cliente, h)
    codigo = _codigo()
    cliente.post("/loja/resgatar", json={"codigo": codigo}, headers=h)
    exportado = cliente.get("/me/exportar", headers=h).json()
    assert (m["linha"], m["coluna"]) in {(x["linha"], x["coluna"]) for x in exportado["mascotes_da_loja"]}
    assert [x["codigo"] for x in exportado["codigos_resgatados_na_loja"]] == [codigo.replace("-", "")]
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


# ---------- brownies de recompensa (no lugar das medalhas, desde 2026-11-19) ----------
def test_recompensa_da_um_brownie_por_chave(cliente):
    h = _conta(cliente)
    r = cliente.post("/loja/recompensa", json={"chave": "missao:treinos-10"}, headers=h)
    assert r.status_code == 200 and r.json()["nova"] is True
    m = r.json()["mascote"]
    de_novo = cliente.post("/loja/recompensa", json={"chave": "missao:treinos-10"}, headers=h).json()
    assert de_novo["nova"] is False and (de_novo["mascote"]["linha"], de_novo["mascote"]["coluna"]) == (m["linha"], m["coluna"])
    col = cliente.get("/loja/colecao", headers=h).json()
    assert sum(x["quantidade"] for x in col["mascotes"]) == 1
    # o primeiro mascote vira o que a conta mostra
    assert col["escolhido"] == f"{m['linha']}-{m['coluna']}"


def test_recompensa_recusa_chave_estranha(cliente):
    h = _conta(cliente)
    for chave in ["qualquer", "missao:", "nivel:abc", "missao:" + "a" * 40, "missao:Treinos"]:
        assert cliente.post("/loja/recompensa", json={"chave": chave}, headers=h).status_code == 422
    assert cliente.post("/loja/recompensa", json={"chave": "nivel:3"}).status_code == 401


def test_raridade_sobe_com_os_brownies():
    comeco, meio, fim = loja.chances_recompensa(0), loja.chances_recompensa(12), loja.chances_recompensa(40)
    for c in (comeco, meio, fim):
        assert sum(c) == 1000 and min(c) >= 4
    media = lambda c: sum(i * p for i, p in enumerate(c)) / 1000
    assert media(comeco) < media(meio) < media(fim)
    assert comeco[0] > 500 and fim[4] > 500


def test_escolher_mascote_so_da_colecao(cliente):
    h = _conta(cliente)
    m = cliente.post("/loja/recompensa", json={"chave": "nivel:2"}, headers=h).json()["mascote"]
    outro = (m["linha"], (m["coluna"] + 1) % 13)
    assert cliente.put("/loja/mascote", json={"linha": outro[0], "coluna": outro[1]}, headers=h).status_code == 404
    assert cliente.put("/loja/mascote", json={"linha": None, "coluna": None}, headers=h).status_code == 204
    assert cliente.get("/loja/colecao", headers=h).json()["escolhido"] is None
    assert cliente.put("/loja/mascote", json={"linha": m["linha"], "coluna": m["coluna"]}, headers=h).status_code == 204
    assert cliente.get("/auth/eu", headers=h).json()["mascote"] == f"{m['linha']}-{m['coluna']}"
