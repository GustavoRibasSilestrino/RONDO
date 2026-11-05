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


def conta(cliente, email, nome):
    r = cliente.post("/auth/cadastro", json={"nome": nome, "email": email, "senha": "segredo1"}).json()
    h = {"Authorization": f"Bearer {r['token']}"}
    return h, cliente.get("/auth/eu", headers=h).json()["email"]


def duas(cliente):
    a, _ = conta(cliente, "ana@x.com", "Ana")
    b, _ = conta(cliente, "bia@x.com", "Bia")
    ids = {}
    for nome, h in (("a", a), ("b", b)):
        ids[nome] = cliente.get("/social/resumo", headers=h).status_code
    return a, b


def id_de(cliente, h, nome):
    """O id da pessoa, achado pela busca vista por outra conta."""
    r = cliente.get("/pessoas", params={"q": nome}, headers=h).json()["itens"]
    return r[0]["id"]


def test_exige_login(cliente):
    for rota in ("/social/feed", "/social/resumo", "/social/notificacoes", "/clubes", "/pessoas"):
        assert cliente.get(rota).status_code == 401
    assert cliente.post("/social/posts", json={"texto": "oi"}).status_code == 401


def test_post_aparece_para_outra_pessoa_e_conta_vem_do_banco(cliente):
    a, b = duas(cliente)
    r = cliente.post("/social/posts", json={"texto": "  Treino de pernas  ", "destaque": "Recorde: 100 kg"}, headers=a)
    assert r.status_code == 201
    p = r.json()
    assert p["texto"] == "Treino de pernas" and p["meu"] is True and p["cheers"] == 0 and p["autor"]["nome"] == "Ana"
    assert "email" not in p["autor"]

    feed = cliente.get("/social/feed", headers=b).json()
    assert [x["id"] for x in feed["itens"]] == [p["id"]] and feed["itens"][0]["meu"] is False

    # curtir é idempotente e a contagem vem do banco
    assert cliente.put(f"/social/posts/{p['id']}/curtida", headers=b).json()["cheers"] == 1
    assert cliente.put(f"/social/posts/{p['id']}/curtida", headers=b).json()["cheers"] == 1
    assert cliente.get("/social/feed", headers=a).json()["itens"][0]["cheers"] == 1
    assert cliente.get("/social/feed", headers=a).json()["itens"][0]["curtiu"] is False
    assert cliente.delete(f"/social/posts/{p['id']}/curtida", headers=b).json()["cheers"] == 0

    c = cliente.post(f"/social/posts/{p['id']}/comentarios", json={"texto": "Boa!"}, headers=b)
    assert c.status_code == 201 and c.json()["autor"]["nome"] == "Bia"
    assert cliente.get("/social/feed", headers=a).json()["itens"][0]["comentarios"] == 1
    assert [x["texto"] for x in cliente.get(f"/social/posts/{p['id']}/comentarios", headers=a).json()["itens"]] == ["Boa!"]
    assert cliente.post(f"/social/posts/{p['id']}/comentarios", json={"texto": "   "}, headers=b).status_code == 422


def test_so_o_autor_apaga(cliente):
    a, b = duas(cliente)
    p = cliente.post("/social/posts", json={"texto": "meu"}, headers=a).json()
    c = cliente.post(f"/social/posts/{p['id']}/comentarios", json={"texto": "oi"}, headers=b).json()
    assert cliente.delete(f"/social/posts/{p['id']}", headers=b).status_code == 403
    assert cliente.delete(f"/social/comentarios/{c['id']}", headers=a).status_code == 403   # nem o dono do post apaga comentário alheio
    assert cliente.delete(f"/social/comentarios/{c['id']}", headers=b).status_code == 200
    cliente.put(f"/social/posts/{p['id']}/curtida", headers=b)
    assert cliente.delete(f"/social/posts/{p['id']}", headers=a).status_code == 200
    assert cliente.get("/social/feed", headers=b).json()["itens"] == []
    assert cliente.get("/social/notificacoes", headers=a).json()["itens"] == []   # as notificações do post somem junto
    assert cliente.delete(f"/social/posts/{p['id']}", headers=a).status_code == 404


def test_validacao_de_post(cliente):
    a, _ = duas(cliente)
    assert cliente.post("/social/posts", json={"texto": "   "}, headers=a).status_code == 422
    assert cliente.post("/social/posts", json={"texto": "x" * 601}, headers=a).status_code == 422
    assert cliente.post("/social/posts", json={"texto": "oi", "clube_id": 999}, headers=a).status_code == 404


def test_paginacao_do_feed(cliente):
    a, b = duas(cliente)
    for i in range(5):
        cliente.post("/social/posts", json={"texto": f"p{i}"}, headers=a)
    p1 = cliente.get("/social/feed", params={"limite": 2}, headers=b).json()
    assert [x["texto"] for x in p1["itens"]] == ["p4", "p3"] and p1["proximo"]
    p2 = cliente.get("/social/feed", params={"limite": 2, "antes": p1["proximo"]}, headers=b).json()
    assert [x["texto"] for x in p2["itens"]] == ["p2", "p1"]
    p3 = cliente.get("/social/feed", params={"limite": 2, "antes": p2["proximo"]}, headers=b).json()
    assert [x["texto"] for x in p3["itens"]] == ["p0"] and p3["proximo"] is None


def test_seguir_filtro_e_notificacao(cliente):
    a, b = duas(cliente)
    ana = id_de(cliente, b, "Ana")
    bia = id_de(cliente, a, "Bia")
    cliente.post("/social/posts", json={"texto": "da Ana"}, headers=a)
    assert cliente.get("/social/feed", params={"filtro": "seguindo"}, headers=b).json()["itens"] == []
    assert cliente.put(f"/pessoas/{ana}/seguir", headers=b).status_code == 200
    assert cliente.put(f"/pessoas/{ana}/seguir", headers=b).status_code == 200   # repetir não duplica
    assert [x["texto"] for x in cliente.get("/social/feed", params={"filtro": "seguindo"}, headers=b).json()["itens"]] == ["da Ana"]
    assert cliente.put(f"/pessoas/{bia}/seguir", headers=b).status_code == 422   # a si mesma não

    perfil = cliente.get(f"/pessoas/{ana}", headers=b).json()
    assert (perfil["seguidores"], perfil["seguindo"], perfil["posts"]) == (1, True, 1)
    assert [x["nome"] for x in cliente.get(f"/pessoas/{ana}/seguidores", headers=a).json()["itens"]] == ["Bia"]
    assert [x["nome"] for x in cliente.get(f"/pessoas/{bia}/seguindo", headers=a).json()["itens"]] == ["Ana"]
    assert cliente.get(f"/pessoas/{ana}/posts", headers=b).json()["itens"][0]["texto"] == "da Ana"

    n = cliente.get("/social/notificacoes", headers=a).json()["itens"]
    assert [(x["tipo"], x["texto"]) for x in n] == [("seguidor", "Bia começou a seguir você.")]
    assert cliente.delete(f"/pessoas/{ana}/seguir", headers=b).status_code == 200
    assert cliente.get(f"/pessoas/{ana}", headers=b).json()["seguidores"] == 0
    assert cliente.get("/pessoas/9999", headers=b).status_code == 404


def test_busca_de_pessoas_sem_vazar_email(cliente):
    a, b = duas(cliente)
    cliente.patch("/me/perfil", json={"arroba": "ana.run"}, headers=a)
    r = cliente.get("/pessoas", params={"q": "@ana.r"}, headers=b).json()["itens"]
    assert [x["nome"] for x in r] == ["Ana"] and "email" not in r[0]
    assert cliente.get("/pessoas", params={"q": "ana%"}, headers=b).json()["itens"] == []   # % não vira curinga
    sug = cliente.get("/pessoas", headers=b).json()["itens"]
    assert [x["nome"] for x in sug] == ["Ana"]   # sugestão: quem ainda não segue, nunca a própria pessoa


def test_notificacoes_de_cheers_e_comentario(cliente):
    a, b = duas(cliente)
    p = cliente.post("/social/posts", json={"texto": "oi"}, headers=a).json()
    cliente.put(f"/social/posts/{p['id']}/curtida", headers=b)
    cliente.post(f"/social/posts/{p['id']}/comentarios", json={"texto": "legal"}, headers=b)
    cliente.put(f"/social/posts/{p['id']}/curtida", headers=a)   # a própria pessoa não notifica a si
    cliente.post(f"/social/posts/{p['id']}/comentarios", json={"texto": "valeu"}, headers=a)

    assert cliente.get("/social/resumo", headers=a).json()["nao_lidas"] == 2
    n = cliente.get("/social/notificacoes", headers=a).json()["itens"]
    assert [x["tipo"] for x in n] == ["comentario", "cheers"] and n[0]["post_id"] == p["id"]
    assert cliente.get("/social/notificacoes", headers=b).json()["itens"] == []   # só recebe quem é o alvo

    cliente.post("/social/notificacoes/lidas", headers=a)
    assert cliente.get("/social/resumo", headers=a).json()["nao_lidas"] == 0
    cliente.delete(f"/social/posts/{p['id']}/curtida", headers=b)   # tirar o cheers retira o aviso
    assert [x["tipo"] for x in cliente.get("/social/notificacoes", headers=a).json()["itens"]] == ["comentario"]
    cliente.delete("/social/notificacoes", headers=a)
    assert cliente.get("/social/notificacoes", headers=a).json()["itens"] == []


def test_clube_publico_entrar_sair_e_feed(cliente):
    a, b = duas(cliente)
    c = cliente.post("/clubes", json={"nome": "Corrida 5k", "categoria": "corrida", "descricao": "Toda manhã"}, headers=a)
    assert c.status_code == 201
    clube = c.json()
    assert clube["membros"] == 1 and clube["meu"] and clube["proprio"] and len(clube["codigo"]) == 6

    vistos = cliente.get("/clubes", headers=b).json()["itens"]
    assert [x["nome"] for x in vistos] == ["Corrida 5k"] and vistos[0]["meu"] is False and vistos[0]["codigo"] is None
    assert cliente.post(f"/clubes/{clube['id']}/entrar", headers=b).json()["membros"] == 2
    assert cliente.post(f"/clubes/{clube['id']}/entrar", headers=b).json()["membros"] == 2   # repetir não duplica

    cliente.post("/social/posts", json={"texto": "no clube", "clube_id": clube["id"]}, headers=b)
    cliente.post("/social/posts", json={"texto": "geral"}, headers=b)
    assert [x["texto"] for x in cliente.get("/social/feed", params={"filtro": "clubes"}, headers=a).json()["itens"]] == ["no clube"]
    assert [x["texto"] for x in cliente.get("/social/feed", params={"filtro": "geral"}, headers=a).json()["itens"]] == ["geral"]
    assert [x["texto"] for x in cliente.get("/social/feed", params={"clube_id": clube["id"]}, headers=a).json()["itens"]] == ["no clube"]
    assert cliente.get("/social/feed", params={"filtro": "clubes"}, headers=a).json()["itens"][0]["clube"]["nome"] == "Corrida 5k"

    assert cliente.post(f"/clubes/{clube['id']}/sair", headers=a).status_code == 409   # o dono não sai, apaga
    assert cliente.post(f"/clubes/{clube['id']}/sair", headers=b).status_code == 200
    assert cliente.get(f"/clubes/{clube['id']}", headers=b).json()["membros"] == 1
    # quem saiu não publica mais no clube
    assert cliente.post("/social/posts", json={"texto": "x", "clube_id": clube["id"]}, headers=b).status_code == 403
    assert [x["nome"] for x in cliente.get(f"/clubes/{clube['id']}/membros", headers=b).json()["itens"]] == ["Ana"]


def test_clube_privado_so_por_codigo(cliente):
    a, b = duas(cliente)
    clube = cliente.post("/clubes", json={"nome": "Segredo", "privado": True}, headers=a).json()
    cliente.post("/social/posts", json={"texto": "só do clube", "clube_id": clube["id"]}, headers=a)
    p = cliente.get("/social/feed", params={"clube_id": clube["id"]}, headers=a).json()["itens"][0]

    # quem está fora não vê o clube, o post, as pessoas, os comentários nem o perfil com esses posts
    assert cliente.get("/clubes", headers=b).json()["itens"] == []
    assert cliente.get(f"/clubes/{clube['id']}", headers=b).status_code == 404
    assert cliente.get(f"/clubes/{clube['id']}/membros", headers=b).status_code == 404
    assert cliente.post(f"/clubes/{clube['id']}/entrar", headers=b).status_code == 403
    assert cliente.get("/social/feed", headers=b).json()["itens"] == []
    assert cliente.get("/social/feed", params={"clube_id": clube["id"]}, headers=b).status_code == 404
    assert cliente.put(f"/social/posts/{p['id']}/curtida", headers=b).status_code == 404
    assert cliente.post(f"/social/posts/{p['id']}/comentarios", json={"texto": "oi"}, headers=b).status_code == 404
    assert cliente.get(f"/social/posts/{p['id']}/comentarios", headers=b).status_code == 404
    assert cliente.post("/social/posts", json={"texto": "x", "clube_id": clube["id"]}, headers=b).status_code == 404
    ana = id_de(cliente, b, "Ana")
    assert cliente.get(f"/pessoas/{ana}/posts", headers=b).json()["itens"] == []
    assert cliente.get(f"/pessoas/{ana}", headers=b).json()["posts"] == 0

    # código errado, depois o certo
    assert cliente.post("/clubes/entrar", json={"codigo": "ZZZZZZ"}, headers=b).status_code == 404
    assert cliente.post("/clubes/entrar", json={"codigo": clube["codigo"].lower()}, headers=b).json()["meu"] is True
    assert [x["texto"] for x in cliente.get("/social/feed", headers=b).json()["itens"]] == ["só do clube"]
    assert cliente.get(f"/clubes/{clube['id']}", headers=b).json()["codigo"] is None   # o código fica só com o dono


def test_apagar_clube_so_o_dono_e_leva_os_posts(cliente):
    a, b = duas(cliente)
    clube = cliente.post("/clubes", json={"nome": "Clube X"}, headers=a).json()
    cliente.post(f"/clubes/{clube['id']}/entrar", headers=b)
    p = cliente.post("/social/posts", json={"texto": "dentro", "clube_id": clube["id"]}, headers=b).json()
    cliente.post(f"/social/posts/{p['id']}/comentarios", json={"texto": "c"}, headers=a)
    assert cliente.delete(f"/clubes/{clube['id']}", headers=b).status_code == 403
    assert cliente.delete(f"/clubes/{clube['id']}", headers=a).status_code == 200
    assert cliente.get("/social/feed", headers=b).json()["itens"] == []
    assert cliente.get("/clubes", headers=b).json()["itens"] == []
    assert cliente.get("/social/notificacoes", headers=b).json()["itens"] == []


def test_validacao_de_clube(cliente):
    a, _ = duas(cliente)
    assert cliente.post("/clubes", json={"nome": "ab"}, headers=a).status_code == 422
    assert cliente.post("/clubes", json={"nome": "Valido", "categoria": "xyz"}, headers=a).status_code == 422
    assert cliente.post("/clubes/entrar", json={"codigo": "abc"}, headers=a).status_code == 422


def test_resumo(cliente):
    a, b = duas(cliente)
    ana = id_de(cliente, b, "Ana")
    p = cliente.post("/social/posts", json={"texto": "oi"}, headers=a).json()
    clube = cliente.post("/clubes", json={"nome": "Meu clube"}, headers=b).json()
    cliente.put(f"/social/posts/{p['id']}/curtida", headers=b)
    cliente.post(f"/social/posts/{p['id']}/comentarios", json={"texto": "oi"}, headers=b)
    cliente.put(f"/pessoas/{ana}/seguir", headers=b)
    r = cliente.get("/social/resumo", headers=b).json()
    assert cliente.get("/clubes", params={"meus": True}, headers=a).json()["itens"] == []
    assert [x["id"] for x in cliente.get("/clubes", params={"meus": True}, headers=b).json()["itens"]] == [clube["id"]]
    assert isinstance(r.pop("id"), int)
    assert r == {"posts": 0, "cheers_dados": 1, "seguindo": 1, "seguidores": 0, "comentarios": 1, "clubes_criados": 1, "clubes": [clube["id"]], "nao_lidas": 0}
    assert cliente.get("/social/resumo", headers=a).json()["seguidores"] == 1
