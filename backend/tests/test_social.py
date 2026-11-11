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
    r = cliente.post("/auth/cadastro", json={"nome": nome, "email": email, "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True}).json()
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
    assert cliente.get("/pessoas", params={"q": "%"}, headers=b).json()["itens"] == []   # % não vira curinga
    assert cliente.get("/pessoas", params={"q": "_"}, headers=b).json()["itens"] == []
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
    assert cliente.post(f"/clubes/{clube['id']}/entrar", headers=b).status_code == 404   # nem confirma que existe
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


def test_stories_so_para_quem_segue_e_por_24_horas(cliente):
    from datetime import datetime, timedelta, timezone

    from app.banco import Sessao
    from app.modelos import Story

    a, b = duas(cliente)
    ana = id_de(cliente, b, "Ana")
    assert cliente.post("/social/stories", json={}, headers=a).status_code == 422
    assert cliente.post("/social/stories", json={"texto": "  "}, headers=a).status_code == 422
    s1 = cliente.post("/social/stories", json={"texto": "Bom dia", "fundo": 2}, headers=a)
    assert s1.status_code == 201 and s1.json()["texto"] == "Bom dia"
    assert cliente.post("/social/stories", json={"midia": {"id": "m", "tipo": "imagem", "url": "https://evil.com/x.jpg"}}, headers=a).status_code == 422

    # quem não segue não vê; o próprio autor vê
    assert cliente.get("/social/stories", headers=b).json()["pessoas"] == []
    mine = cliente.get("/social/stories", headers=a).json()["pessoas"]
    assert len(mine) == 1 and mine[0]["autor"]["voce"] is True
    cliente.put(f"/pessoas/{ana}/seguir", headers=b)
    vistos = cliente.get("/social/stories", headers=b).json()["pessoas"]
    assert [p["autor"]["nome"] for p in vistos] == ["Ana"] and [i["texto"] for i in vistos[0]["itens"]] == ["Bom dia"]

    # passadas 24 horas, some
    with Sessao() as s:
        st = s.get(Story, s1.json()["id"])
        st.criado_em = datetime.now(timezone.utc) - timedelta(hours=25)
        s.commit()
    assert cliente.get("/social/stories", headers=b).json()["pessoas"] == []

    # só o autor apaga
    s2 = cliente.post("/social/stories", json={"texto": "outro"}, headers=a).json()
    assert cliente.delete(f"/social/stories/{s2['id']}", headers=b).status_code == 404
    assert cliente.delete(f"/social/stories/{s2['id']}", headers=a).status_code == 200
    assert cliente.get("/social/stories", headers=a).json()["pessoas"] == []


def test_perfil_mostra_os_clubes_que_quem_olha_pode_ver(cliente):
    a, b = duas(cliente)
    publico = cliente.post("/clubes", json={"nome": "Corrida 5k"}, headers=a).json()
    privado = cliente.post("/clubes", json={"nome": "Segredo", "privado": True}, headers=a).json()
    ana = id_de(cliente, b, "Ana")
    # quem não está no clube privado vê só o público, e o privado não aparece nem como nome
    nomes = [c["nome"] for c in cliente.get(f"/pessoas/{ana}", headers=b).json()["clubes"]]
    assert nomes == ["Corrida 5k"]
    assert cliente.get(f"/pessoas/{ana}", headers=b).json()["clubes"][0]["id"] == publico["id"]
    # entrando no privado pelo código, passa a ver os dois
    cliente.post("/clubes/entrar", json={"codigo": privado["codigo"]}, headers=b)
    assert sorted(c["nome"] for c in cliente.get(f"/pessoas/{ana}", headers=b).json()["clubes"]) == ["Corrida 5k", "Segredo"]
    # e o contrário: a Ana vê no perfil da Bia o clube em que as duas estão
    bia = id_de(cliente, a, "Bia")
    assert cliente.get(f"/pessoas/{bia}", headers=a).json()["clubes"] == [{"id": privado["id"], "nome": "Segredo"}]


def test_story_reacoes_visualizacoes_e_privacidade(cliente):
    a, b = duas(cliente)
    c, _ = conta(cliente, "caio@x.com", "Caio")
    d, _ = conta(cliente, "duda@x.com", "Duda")
    e, _ = conta(cliente, "edu@x.com", "Edu")
    ana = id_de(cliente, b, "Ana")
    for quem in (b, c, d, e):
        cliente.put(f"/pessoas/{ana}/seguir", headers=quem)
    intruso, _ = conta(cliente, "fora@x.com", "Fora")   # não segue a Ana
    s = cliente.post("/social/stories", json={"texto": "Bom dia"}, headers=a).json()
    base = f"/social/stories/{s['id']}"

    # quem não segue não vê, não reage e não marca visto
    assert cliente.post(f"{base}/visto", headers=intruso).status_code == 404
    assert cliente.put(f"{base}/reacao", json={"tipo": "curtir"}, headers=intruso).status_code == 404
    # o autor não reage ao próprio story, e a reação precisa ser de uma das opções
    assert cliente.put(f"{base}/reacao", json={"tipo": "curtir"}, headers=a).status_code == 422
    assert cliente.put(f"{base}/reacao", json={"tipo": "xingamento"}, headers=b).status_code == 422

    # a Bia vê, reage com fogo e troca por curtir; a reação é uma só por pessoa
    assert cliente.post(f"{base}/visto", headers=b).status_code == 200
    assert cliente.post(f"{base}/visto", headers=b).status_code == 200   # repetir não duplica
    assert cliente.put(f"{base}/reacao", json={"tipo": "fogo"}, headers=b).status_code == 200
    assert cliente.put(f"{base}/reacao", json={"tipo": "curtir"}, headers=b).status_code == 200
    meu_view = cliente.get("/social/stories", headers=b).json()["pessoas"][0]["itens"][0]
    assert meu_view["minha_reacao"] == "curtir" and meu_view["visualizacoes"] == 0 and meu_view["vistos"] == []   # quem vê não enxerga os números

    # os outros três veem; só o autor enxerga a contagem e as 3 últimas pessoas
    for quem in (c, d, e):
        cliente.post(f"{base}/visto", headers=quem)
    do_autor = cliente.get("/social/stories", headers=a).json()["pessoas"][0]["itens"][0]
    assert do_autor["visualizacoes"] == 4 and do_autor["reacoes"] == 1 and len(do_autor["vistos"]) == 3
    assert do_autor["minha_reacao"] is None

    # a lista completa só para o autor, com a reação de cada um
    assert cliente.get(f"{base}/visualizacoes", headers=b).status_code == 404
    lista = cliente.get(f"{base}/visualizacoes", headers=a).json()
    assert lista["total"] == 4 and len(lista["itens"]) == 4
    assert {i["pessoa"]["nome"]: i["reacao"] for i in lista["itens"]}["Bia"] == "curtir"

    # tirar a reação; e apagar o story leva junto o que as pessoas fizeram nele
    assert cliente.delete(f"{base}/reacao", headers=b).status_code == 200
    assert cliente.get("/social/stories", headers=b).json()["pessoas"][0]["itens"][0]["minha_reacao"] is None
    assert cliente.delete(base, headers=a).status_code == 200
    from sqlalchemy import select
    from app.banco import Sessao
    from app.modelos import StoryVisto
    with Sessao() as sessao:
        assert sessao.scalars(select(StoryVisto)).all() == []


def test_pessoas_trazem_a_foto_de_perfil(cliente):
    from app.banco import Sessao
    from app.modelos import Usuario
    from sqlalchemy import select

    a, b = duas(cliente)
    with Sessao() as s:
        u = s.scalars(select(Usuario).where(Usuario.nome == "Ana")).first()
        u.foto = "https://exemplo.supabase.co/storage/v1/object/public/midia/1/foto.jpg"
        s.commit()
    ana = id_de(cliente, b, "Ana")
    assert cliente.get(f"/pessoas/{ana}", headers=b).json()["foto"].endswith("/1/foto.jpg")
    assert cliente.get("/pessoas", params={"q": "Ana"}, headers=b).json()["itens"][0]["foto"].endswith("/1/foto.jpg")
    cliente.post("/social/posts", json={"texto": "oi"}, headers=a)
    assert cliente.get("/social/feed", headers=b).json()["itens"][0]["autor"]["foto"].endswith("/1/foto.jpg")


def test_busca_parecida_com_a_do_instagram(cliente):
    eu, _ = conta(cliente, "eu@x.com", "Eu Mesmo")
    nomes = ["Vinícius Silva", "Vinicius Souza", "Vini Costa", "Marcos Vinícius", "Ana Vinhas", "Bruno Lima", "Viviane Dias"]
    for k, n in enumerate(nomes):
        conta(cliente, f"p{k}@x.com", n)
    vinicius_souza = id_de(cliente, eu, "Vinicius Souza")
    cliente.put(f"/pessoas/{vinicius_souza}/seguir", headers=eu)

    def buscar(q):
        return [x["nome"] for x in cliente.get("/pessoas", params={"q": q}, headers=eu).json()["itens"]]

    r = buscar("vinicius")
    # sem acento e sem maiúscula acha os dois Vinícius e o "Marcos Vinícius"; quem eu sigo vem primeiro
    assert r[0] == "Vinicius Souza" and {"Vinícius Silva", "Marcos Vinícius"} <= set(r[:4])
    assert "Bruno Lima" not in r
    assert "Vinícius Silva" in buscar("VINÍCIUS")
    assert "Vinícius Silva" in buscar("vini sil")        # cada palavra começa uma palavra do nome
    assert "Vinícius Silva" in buscar("vinicus")         # erro de digitação: perdoado
    assert "Vini Costa" in buscar("vin")                 # começo do nome
    assert "Vini Costa" in buscar("vinicius")            # "Vini" é um começo de "vinicius": parecido
    assert buscar("zzzzqq") == []
    assert "Eu Mesmo" not in buscar("eu mesmo")          # nunca a própria pessoa
    assert cliente.get("/pessoas", params={"q": "vini%"}, headers=eu).status_code == 200   # % não vira curinga


def test_busca_acha_pelo_novo_nome_e_arroba_depois_de_editar_o_perfil(cliente):
    a, b = duas(cliente)
    cliente.patch("/me/perfil", json={"nome": "Ana Carolina", "arroba": "carol.run"}, headers=a)
    assert [x["nome"] for x in cliente.get("/pessoas", params={"q": "carol"}, headers=b).json()["itens"]] == ["Ana Carolina"]
    assert [x["nome"] for x in cliente.get("/pessoas", params={"q": "@carol.run"}, headers=b).json()["itens"]] == ["Ana Carolina"]
