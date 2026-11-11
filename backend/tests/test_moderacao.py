"""Denunciar, bloquear e a fila de denúncias do dono (exigências das lojas para apps com conteúdo das pessoas)."""
from sqlalchemy import update

from app.banco import Sessao
from app.modelos import Usuario
from tests.test_social import cliente, duas, id_de  # noqa: F401  (a fixture vem junto)


def _virar_dono(email):
    with Sessao() as s:
        s.execute(update(Usuario).where(Usuario.email == email).values(papel="dono"))
        s.commit()


def test_bloquear_esconde_nos_dois_sentidos_e_desfaz_o_seguir(cliente):
    a, b = duas(cliente)
    id_b, id_a = id_de(cliente, a, "Bia"), id_de(cliente, b, "Ana")
    cliente.put(f"/pessoas/{id_b}/seguir", headers=a)
    cliente.put(f"/pessoas/{id_a}/seguir", headers=b)
    post_b = cliente.post("/social/posts", json={"texto": "post da Bia"}, headers=b).json()["id"]
    post_a = cliente.post("/social/posts", json={"texto": "post da Ana"}, headers=a).json()["id"]
    cliente.post(f"/social/posts/{post_a}/comentarios", json={"texto": "comentario da Bia"}, headers=b)
    cliente.post("/social/stories", json={"texto": "story da Bia"}, headers=b)

    assert cliente.put(f"/bloqueios/{id_b}", headers=a).json()["status"] == "bloqueado"
    # a Ana não vê mais nada da Bia
    assert all(p["autor"]["id"] != id_b for p in cliente.get("/social/feed", headers=a).json()["itens"])
    assert cliente.get(f"/social/posts/{post_a}/comentarios", headers=a).json()["itens"] == []
    assert all(x["autor"]["id"] != id_b for x in cliente.get("/social/stories", headers=a).json()["pessoas"])
    assert cliente.get(f"/pessoas/{id_b}", headers=a).status_code == 404
    assert cliente.get("/pessoas", params={"q": "Bia"}, headers=a).json()["itens"] == []
    # e a Bia não vê mais a Ana (nem consegue seguir de novo ou dar cheers)
    assert all(p["autor"]["id"] != id_a for p in cliente.get("/social/feed", headers=b).json()["itens"])
    assert cliente.get(f"/pessoas/{id_a}", headers=b).status_code == 404
    assert cliente.put(f"/pessoas/{id_a}/seguir", headers=b).status_code == 404
    assert cliente.put(f"/social/posts/{post_a}/curtida", headers=b).status_code == 404
    assert cliente.get(f"/social/posts/{post_b}/comentarios", headers=a).status_code == 404
    assert cliente.get("/social/resumo", headers=a).json()["seguindo"] == 0
    # a lista de bloqueados e o desbloquear
    assert [p["id"] for p in cliente.get("/bloqueios", headers=a).json()["itens"]] == [id_b]
    assert cliente.delete(f"/bloqueios/{id_b}", headers=a).status_code == 200
    assert cliente.get(f"/pessoas/{id_b}", headers=a).status_code == 200


def test_nao_bloqueia_a_si_mesmo(cliente):
    a, _ = duas(cliente)
    eu = cliente.get("/social/resumo", headers=a).json()["id"]
    assert cliente.put(f"/bloqueios/{eu}", headers=a).status_code == 422


def test_denunciar_e_o_dono_tira_do_ar(cliente):
    a, b = duas(cliente)
    id_a = id_de(cliente, b, "Ana")
    post = cliente.post("/social/posts", json={"texto": "conteudo ruim"}, headers=a).json()["id"]
    # não denuncia o próprio, nem o que não existe
    assert cliente.post("/denuncias", json={"tipo": "post", "alvo_id": post, "motivo": "spam"}, headers=a).status_code == 422
    assert cliente.post("/denuncias", json={"tipo": "post", "alvo_id": 9999, "motivo": "spam"}, headers=b).status_code == 404
    assert cliente.post("/denuncias", json={"tipo": "post", "alvo_id": post, "motivo": "ofensa", "detalhe": "  xinga  "}, headers=b).status_code == 201
    assert cliente.post("/denuncias", json={"tipo": "post", "alvo_id": post, "motivo": "ofensa"}, headers=b).json()["status"] == "ja_denunciado"
    assert all(p["id"] != post for p in cliente.get("/social/feed", headers=b).json()["itens"])   # sumiu para quem denunciou
    assert any(p["id"] == post for p in cliente.get("/social/feed", headers=a).json()["itens"])   # e continua para os outros
    assert cliente.post("/denuncias", json={"tipo": "pessoa", "alvo_id": id_a, "motivo": "golpe"}, headers=b).status_code == 201
    # quem não é dono não vê a fila
    assert cliente.get("/moderacao/denuncias", headers=b).status_code == 404
    _virar_dono("bia@x.com")
    fila = cliente.get("/moderacao/denuncias", headers=b).json()
    assert fila["pendentes"] == 2
    d = next(x for x in fila["itens"] if x["tipo"] == "post")
    assert d["trecho"] == "conteudo ruim" and d["detalhe"] == "xinga" and d["autor"]["id"] == id_a
    assert cliente.post(f"/moderacao/denuncias/{d['id']}", json={"acao": "remover"}, headers=b).json()["status"] == "removido"
    assert cliente.get(f"/social/posts/{post}/comentarios", headers=a).status_code == 404   # saiu do ar
    assert cliente.get("/moderacao/denuncias", headers=b).json()["pendentes"] == 1
    p = cliente.get("/moderacao/denuncias", headers=b).json()["itens"][0]
    assert cliente.post(f"/moderacao/denuncias/{p['id']}", json={"acao": "manter"}, headers=b).json()["status"] == "mantido"
    assert cliente.get("/moderacao/denuncias", params={"situacao": "removido"}, headers=b).json()["itens"][0]["id"] == d["id"]


def test_dono_remove_a_conta_denunciada(cliente):
    a, b = duas(cliente)
    id_a = id_de(cliente, b, "Ana")
    cliente.post("/denuncias", json={"tipo": "pessoa", "alvo_id": id_a, "motivo": "odio"}, headers=b)
    _virar_dono("bia@x.com")
    d = cliente.get("/moderacao/denuncias", headers=b).json()["itens"][0]
    assert cliente.post(f"/moderacao/denuncias/{d['id']}", json={"acao": "remover"}, headers=b).status_code == 200
    assert cliente.get("/auth/eu", headers=a).status_code == 401   # a conta não existe mais
