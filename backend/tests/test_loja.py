"""A loja de pacotinhos do site: comprar pede conta e o mascote vai direto para a coleção; um código de resgate põe um
mascote na conta de quem o resgata, uma vez só. O sorteio é do servidor e as chances são as mesmas que o site mostra."""
import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

import re
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.banco import Base, Sessao, engine
from app.main import app
from app.modelos import Bloqueio, Mascote, Notificacao, Resgate, Troca, Usuario
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
    assert cliente.get("/loja/colecao", headers=ana).json() == {"total": 66, "mascotes": [], "pode_comprar": False, "escolhido": None, "lapis": 0}
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
        assert 0 <= m["linha"] < 5 and m["coluna"] in loja.COLUNAS[m["linha"]]
        assert m["raridade"] == loja.RARIDADES[m["linha"]][0]
    col = cliente.get("/loja/colecao", headers=h).json()
    assert col["total"] == 66
    assert sum(m["quantidade"] for m in col["mascotes"]) == 15
    assert {(m["linha"], m["coluna"]) for m in col["mascotes"]} == {(m["linha"], m["coluna"]) for m in comprados}


def test_mascote_repetido_soma_na_mesma_linha(cliente, monkeypatch):
    monkeypatch.setattr(loja, "sortear", lambda pacote: (4, 3))
    h = _conta(cliente)
    assert _comprar(cliente, h)["quantidade"] == 1
    assert _comprar(cliente, h) == {"linha": 4, "coluna": 3, "raridade": "lendaria", "quantidade": 2, "nome": None, "desde": None, "missoes": 0}
    col = cliente.get("/loja/colecao", headers=h).json()["mascotes"]
    assert [{k: v for k, v in m.items() if k != "desde"} for m in col] == [{"linha": 4, "coluna": 3, "raridade": "lendaria", "quantidade": 2, "nome": None, "missoes": 0}]
    assert isinstance(col[0]["desde"], int)   # a hora em que ele entrou na coleção (para o nível do mascote)
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
    assert r.status_code == 200 and r.json() == {"linha": 2, "coluna": 5, "raridade": "rara", "quantidade": 1, "nome": None, "desde": None, "missoes": 0}
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
    assert loja.TOTAL == 66
    assert loja.RARIDADES[1] == ("incomum", 13)
    assert loja.RARIDADES[3] == ("epica", 13)
    assert loja.RARIDADES[4] == ("lendaria", 13)
    for pacote, chances in loja.CHANCES.items():
        assert sum(chances) == 1000, pacote
        assert len(chances) == len(loja.RARIDADES)
    n = 20_000
    roxo = Counter(loja.sortear("roxo")[0] for _ in range(n))
    ouro = Counter(loja.sortear("ouro")[0] for _ in range(n))
    assert roxo[4] < 70                 # 0,1%: uns 20 em 20 mil
    assert 800 < ouro[4] < 1200         # 5%: uns 1000 em 20 mil
    assert 13_400 < roxo[0] < 14_600    # 70% de comuns no roxo


def test_mascote_tirado_nao_sai_nem_aparece(cliente, monkeypatch):
    """O Browdiabinho (1-6), o Browinferno (3-5) e o Browdemônio (4-10) foram tirados: o sorteio nunca dá eles, a coleção não mostra e ninguém
    escolhe eles."""
    assert all(loja.sortear("ouro") not in ((1, 6), (3, 5), (4, 10)) for _ in range(3000))
    assert 6 not in loja.COLUNAS[1] and 13 in loja.COLUNAS[1]
    assert 5 not in loja.COLUNAS[3] and 13 in loja.COLUNAS[3]
    assert 10 not in loja.COLUNAS[4] and 13 in loja.COLUNAS[4]
    h = _conta(cliente)
    with Sessao() as s:   # uma conta que já tinha ganhado ele antes de ser tirado
        uid = s.query(Usuario).one().id
        agora = datetime.now(timezone.utc)
        s.add(Mascote(usuario_id=uid, linha=1, coluna=6, quantidade=1, primeiro_em=agora, ultimo_em=agora))
        s.add(Mascote(usuario_id=uid, linha=3, coluna=5, quantidade=1, primeiro_em=agora, ultimo_em=agora))
        s.add(Mascote(usuario_id=uid, linha=4, coluna=10, quantidade=1, primeiro_em=agora, ultimo_em=agora))
        s.commit()
    assert cliente.get("/loja/colecao", headers=h).json()["mascotes"] == []
    with Sessao() as s:
        assert loja.escolher_mascote(s, s.query(Usuario).one(), 1, 6) is False
        assert loja.escolher_mascote(s, s.query(Usuario).one(), 3, 5) is False
        assert loja.escolher_mascote(s, s.query(Usuario).one(), 4, 10) is False


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


# ---------- o nível dos mascotes (2026-11-23): desde quando ele é da conta e as missões cumpridas depois ----------
def test_colecao_diz_desde_quando_e_as_missoes_de_cada_mascote(cliente):
    h = _conta(cliente)
    antes = datetime.now(timezone.utc).timestamp() * 1000
    m = cliente.post("/loja/recompensa", json={"chave": "missao:t1"}, headers=h).json()["mascote"]
    assert m["desde"] is None and m["missoes"] == 0   # só a coleção preenche

    def o_primeiro():
        col = cliente.get("/loja/colecao", headers=h).json()["mascotes"]
        return next(x for x in col if (x["linha"], x["coluna"]) == (m["linha"], m["coluna"]))

    p = o_primeiro()
    assert abs(p["desde"] - antes) < 60_000
    assert p["missoes"] == 0   # a missão que deu o próprio mascote não conta para ele
    time.sleep(0.05)
    outro = cliente.post("/loja/recompensa", json={"chave": "missao:t10"}, headers=h).json()["mascote"]
    time.sleep(0.05)
    cliente.post("/loja/recompensa", json={"chave": "nivel:2"}, headers=h)   # brownie de nível: não é missão
    depois = o_primeiro()
    assert depois["missoes"] == 1 and depois["desde"] == p["desde"]
    # pedir de novo a mesma missão não soma outra vez
    cliente.post("/loja/recompensa", json={"chave": "missao:t10"}, headers=h)
    assert o_primeiro()["missoes"] == 1
    if (outro["linha"], outro["coluna"]) != (m["linha"], m["coluna"]):   # o mascote que veio depois começa do zero
        col = cliente.get("/loja/colecao", headers=h).json()["mascotes"]
        novo = next(x for x in col if (x["linha"], x["coluna"]) == (outro["linha"], outro["coluna"]))
        assert novo["missoes"] == 0 and novo["desde"] > p["desde"]


# ---------- o lápis e o nome próprio do mascote (2026-11-19) ----------
def _id(email: str) -> int:
    with Sessao() as s:
        return s.query(Usuario).filter_by(email=email).one().id


def _dar(email: str, linha: int, coluna: int, quantidade: int = 1) -> None:
    """põe um mascote direto na coleção da conta (para os testes não dependerem do sorteio)"""
    agora = datetime.now(timezone.utc)
    with Sessao() as s:
        s.add(Mascote(usuario_id=s.query(Usuario).filter_by(email=email).one().id, linha=linha, coluna=coluna, quantidade=quantidade, primeiro_em=agora, ultimo_em=agora))
        s.commit()


def test_lapis_pede_conta_e_loja_aberta(cliente, monkeypatch):
    assert cliente.post("/loja/lapis").status_code == 401
    h = _conta(cliente)
    assert cliente.post("/loja/lapis", headers=h).json() == {"lapis": 1}
    assert cliente.post("/loja/lapis", headers=h).json() == {"lapis": 2}
    assert cliente.get("/loja/colecao", headers=h).json()["lapis"] == 2
    monkeypatch.setattr(loja, "ABERTA", False)   # loja fechada: quem não é o dono não compra o lápis
    assert cliente.post("/loja/lapis", headers=h).status_code == 403
    assert cliente.get("/loja/colecao", headers=h).json()["lapis"] == 2


def test_dar_nome_gasta_um_lapis(cliente):
    h = _conta(cliente)
    _dar("ana@x.com", 2, 13)
    # sem lápis não dá nome
    assert cliente.put("/loja/nome", json={"linha": 2, "coluna": 13, "nome": "Bolota"}, headers=h).status_code == 409
    cliente.post("/loja/lapis", headers=h)
    r = cliente.put("/loja/nome", json={"linha": 2, "coluna": 13, "nome": "  Bolota   do  Mato "}, headers=h)
    assert r.status_code == 200 and r.json() == {"linha": 2, "coluna": 13, "nome": "Bolota do Mato", "lapis": 0}
    m = cliente.get("/loja/colecao", headers=h).json()["mascotes"][0]
    assert m["nome"] == "Bolota do Mato"
    # o lápis acabou: outro nome pede outro lápis
    assert cliente.put("/loja/nome", json={"linha": 2, "coluna": 13, "nome": "Outro"}, headers=h).status_code == 409


def test_nome_recusado_nao_gasta_o_lapis(cliente):
    h = _conta(cliente)
    _dar("ana@x.com", 0, 2)
    cliente.post("/loja/lapis", headers=h)
    for ruim in ("A", "x" * 21, "<b>oi</b>", "-começa errado"):
        assert cliente.put("/loja/nome", json={"linha": 0, "coluna": 2, "nome": ruim}, headers=h).status_code == 422, ruim
    # mascote que a conta não tem, e um mascote tirado
    assert cliente.put("/loja/nome", json={"linha": 4, "coluna": 0, "nome": "Rei"}, headers=h).status_code == 404
    assert cliente.put("/loja/nome", json={"linha": 1, "coluna": 6, "nome": "Rei"}, headers=h).status_code == 404
    assert cliente.get("/loja/colecao", headers=h).json()["lapis"] == 1


def test_nome_ofensivo_e_recusado(cliente):
    from app.servicos.palavras_bloqueadas import TODAS
    h = _conta(cliente)
    _dar("ana@x.com", 0, 2)
    cliente.post("/loja/lapis", headers=h)
    palavra = sorted(p for p in TODAS if p.isalpha() and 3 <= len(p) <= 12)[0]
    assert cliente.put("/loja/nome", json={"linha": 0, "coluna": 2, "nome": palavra}, headers=h).status_code == 422
    assert cliente.get("/loja/colecao", headers=h).json()["lapis"] == 1


def test_nome_do_mascote_escolhido_vai_com_a_pessoa(cliente):
    h = _conta(cliente)
    _dar("ana@x.com", 0, 2)
    _dar("ana@x.com", 3, 0)
    cliente.post("/loja/lapis", headers=h)
    assert cliente.put("/loja/mascote", json={"linha": 0, "coluna": 2}, headers=h).status_code == 204
    assert cliente.get("/auth/eu", headers=h).json()["mascote_nome"] is None
    cliente.put("/loja/nome", json={"linha": 0, "coluna": 2, "nome": "Tempero"}, headers=h)
    assert cliente.get("/auth/eu", headers=h).json()["mascote_nome"] == "Tempero"
    # trocar para um mascote sem nome próprio limpa o nome; voltar traz de volta
    cliente.put("/loja/mascote", json={"linha": 3, "coluna": 0}, headers=h)
    assert cliente.get("/auth/eu", headers=h).json()["mascote_nome"] is None
    cliente.put("/loja/mascote", json={"linha": 0, "coluna": 2}, headers=h)
    assert cliente.get("/auth/eu", headers=h).json()["mascote_nome"] == "Tempero"
    cliente.put("/loja/mascote", json={"linha": None, "coluna": None}, headers=h)
    assert cliente.get("/auth/eu", headers=h).json()["mascote_nome"] is None


# ---------- troca de repetidos (2026-11-19) ----------
def _dupla(cliente):
    """Ana tem o (0, 2) repetido e a Bia tem o (2, 5) repetido."""
    ha, hb = _conta(cliente, "ana@x.com"), _conta(cliente, "bia@x.com")
    _dar("ana@x.com", 0, 2, 2)
    _dar("bia@x.com", 2, 5, 3)
    return ha, hb, _id("ana@x.com"), _id("bia@x.com")


def _propor(cliente, h, para_id, ofereco=(0, 2), peco=(2, 5)):
    return cliente.post("/loja/trocas", json={"para_id": para_id, "ofereco": {"linha": ofereco[0], "coluna": ofereco[1]}, "peco": {"linha": peco[0], "coluna": peco[1]}}, headers=h)


def _tem(cliente, h) -> dict:
    return {(m["linha"], m["coluna"]): m["quantidade"] for m in cliente.get("/loja/colecao", headers=h).json()["mascotes"]}


def test_repetidos_so_mostra_quem_tem_dois_ou_mais(cliente):
    ha, hb, a, b = _dupla(cliente)
    _dar("bia@x.com", 4, 0, 1)
    r = cliente.get(f"/loja/repetidos/{b}", headers=ha)
    assert r.status_code == 200 and [(m["linha"], m["coluna"], m["quantidade"]) for m in r.json()["mascotes"]] == [(2, 5, 3)]
    assert r.json()["pessoa"]["nome"] == "Bia"
    assert cliente.get(f"/loja/repetidos/{b}").status_code == 401
    assert cliente.get("/loja/repetidos/999999", headers=ha).status_code == 404


def test_troca_aceita_muda_os_dois_mascotes_de_conta(cliente):
    ha, hb, a, b = _dupla(cliente)
    r = _propor(cliente, ha, b)
    assert r.status_code == 201, r.text
    t = r.json()
    assert t["estado"] == "pendente" and t["recebida"] is False and t["dou"] == {"linha": 0, "coluna": 2} and t["recebo"] == {"linha": 2, "coluna": 5}
    # a Bia vê a proposta do lado dela, com o aviso nas notificações
    lista = cliente.get("/loja/trocas", headers=hb).json()
    assert lista["pendentes_recebidas"] == 1
    vista = lista["trocas"][0]
    assert vista["recebida"] is True and vista["pessoa"]["nome"] == "Ana" and vista["dou"] == {"linha": 2, "coluna": 5} and vista["recebo"] == {"linha": 0, "coluna": 2}
    with Sessao() as s:
        assert s.query(Notificacao).filter_by(usuario_id=b, tipo="troca").count() == 1
    # só quem recebeu aceita
    assert cliente.post(f"/loja/trocas/{t['id']}/aceitar", headers=ha).status_code == 404
    ok = cliente.post(f"/loja/trocas/{t['id']}/aceitar", headers=hb)
    assert ok.status_code == 200 and ok.json()["estado"] == "aceita"
    assert _tem(cliente, ha) == {(0, 2): 1, (2, 5): 1}
    assert _tem(cliente, hb) == {(0, 2): 1, (2, 5): 2}
    # não dá para responder duas vezes
    assert cliente.post(f"/loja/trocas/{t['id']}/aceitar", headers=hb).status_code == 404
    assert cliente.post(f"/loja/trocas/{t['id']}/recusar", headers=hb).status_code == 404
    with Sessao() as s:
        assert s.query(Notificacao).filter_by(usuario_id=a, tipo="troca_ok").count() == 1
    assert cliente.get("/loja/trocas", headers=hb).json()["pendentes_recebidas"] == 0


def test_troca_so_com_repetidos_dos_dois_lados(cliente):
    ha, hb, a, b = _dupla(cliente)
    _dar("ana@x.com", 1, 0, 1)   # a Ana tem só um deste
    _dar("bia@x.com", 3, 0, 1)   # e a Bia só um deste
    assert _propor(cliente, ha, b, ofereco=(1, 0)).status_code == 409        # oferecer o que não é repetido
    assert _propor(cliente, ha, b, peco=(3, 0)).status_code == 409           # pedir o único da outra pessoa
    assert _propor(cliente, ha, b, ofereco=(4, 4)).status_code == 409        # oferecer o que nem tem
    assert _propor(cliente, ha, a).status_code == 409                        # trocar consigo mesma
    assert _propor(cliente, ha, b, ofereco=(0, 2), peco=(0, 2)).status_code == 409   # o mesmo mascote dos dois lados
    assert _propor(cliente, ha, 999999).status_code == 404
    assert _propor(cliente, ha, b).status_code == 201
    assert _propor(cliente, ha, b).status_code == 409                        # a mesma proposta de novo
    with Sessao() as s:
        assert s.query(Troca).count() == 1


def test_recusar_e_cancelar_nao_mexem_na_colecao(cliente):
    ha, hb, a, b = _dupla(cliente)
    t1 = _propor(cliente, ha, b).json()
    assert cliente.post(f"/loja/trocas/{t1['id']}/recusar", headers=hb).json()["estado"] == "recusada"
    t2 = _propor(cliente, ha, b).json()
    assert cliente.post(f"/loja/trocas/{t2['id']}/cancelar", headers=hb).status_code == 404   # só quem propôs cancela
    assert cliente.post(f"/loja/trocas/{t2['id']}/cancelar", headers=ha).json()["estado"] == "cancelada"
    assert cliente.post(f"/loja/trocas/{t2['id']}/aceitar", headers=hb).status_code == 404
    assert _tem(cliente, ha) == {(0, 2): 2} and _tem(cliente, hb) == {(2, 5): 3}


def test_aceitar_quando_o_repetido_ja_foi_embora_cancela_a_proposta(cliente):
    ha, hb, a, b = _dupla(cliente)
    hc = _conta(cliente, "caio@x.com")
    _dar("caio@x.com", 2, 5, 2)
    c = _id("caio@x.com")
    # a Ana propõe a mesma oferta para a Bia e para o Caio; o Caio aceita primeiro e a Ana fica só com um
    para_bia = _propor(cliente, ha, b).json()
    para_caio = _propor(cliente, ha, c).json()
    assert cliente.post(f"/loja/trocas/{para_caio['id']}/aceitar", headers=hc).status_code == 200
    r = cliente.post(f"/loja/trocas/{para_bia['id']}/aceitar", headers=hb)
    assert r.status_code == 409
    assert _tem(cliente, hb) == {(2, 5): 3}          # nada mudou para a Bia
    assert _tem(cliente, ha) == {(0, 2): 1, (2, 5): 1}
    estados = {t["id"]: t["estado"] for t in cliente.get("/loja/trocas", headers=ha).json()["trocas"]}
    assert estados == {para_bia["id"]: "cancelada", para_caio["id"]: "aceita"}


def test_bloqueio_impede_a_troca(cliente):
    ha, hb, a, b = _dupla(cliente)
    with Sessao() as s:
        s.add(Bloqueio(quem_id=b, bloqueado_id=a))
        s.commit()
    assert cliente.get(f"/loja/repetidos/{b}", headers=ha).status_code == 404
    assert _propor(cliente, ha, b).status_code == 404


def test_exportar_e_apagar_levam_nome_lapis_e_trocas(cliente):
    ha, hb, a, b = _dupla(cliente)
    cliente.post("/loja/lapis", headers=ha)
    cliente.post("/loja/lapis", headers=ha)
    cliente.put("/loja/nome", json={"linha": 0, "coluna": 2, "nome": "Tempero"}, headers=ha)
    _propor(cliente, ha, b)
    exportado = cliente.get("/me/exportar", headers=ha).json()
    assert exportado["lapis_da_loja"] == 1
    assert exportado["mascotes_da_loja"][0]["nome"] == "Tempero"
    assert [(t["sentido"], t["estado"]) for t in exportado["trocas_de_mascotes"]] == [("enviada", "pendente")]
    assert cliente.get("/me/exportar", headers=hb).json()["trocas_de_mascotes"][0]["sentido"] == "recebida"
    assert cliente.request("DELETE", "/me", json={"senha": "segredo1"}, headers=ha).status_code == 200
    with Sessao() as s:
        assert s.query(Troca).count() == 0
    assert cliente.get("/loja/trocas", headers=hb).json() == {"trocas": [], "pendentes_recebidas": 0}

