"""A política de conteúdo: filtro de palavras, 3 avisos, suspensão de 7 dias e banimento depois de 2 suspensões."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import update

from app.banco import Sessao
from app.modelos import Usuario
from app.servicos.filtro import achar_ofensa
from tests.test_social import cliente, duas, id_de  # noqa: F401  (a fixture vem junto)

RUIM = {"texto": "voce e um idiota"}
BOM = {"texto": "treino de pernas concluido"}


def _postar(cliente, h, corpo=RUIM):
    return cliente.post("/social/posts", json=corpo, headers=h)


def test_filtro_pega_truques_e_nao_barra_palavras_inocentes():
    for ruim in ("idiota", "IDIOTA", "1d10ta", "p.u.t.a", "puuuuta", "m3rd@", "vai tomar no cu", "vaitomarnocu", "f u c k", "Arrombados"):
        assert achar_ofensa(ruim), ruim
    for bom in ("curso de escuro", "computador", "a bola rola", "treino foda", "concurso", "discussão", "bom dia!", "Cuiabá"):
        assert achar_ofensa(bom) is None, bom


def test_tres_avisos_depois_suspensao(cliente):
    a, _ = duas(cliente)
    for n in (1, 2, 3):
        r = _postar(cliente, a)
        assert r.status_code == 422 and f"Aviso {n} de 3" in r.json()["detail"]
    assert cliente.get("/social/feed", headers=a).json()["itens"] == []   # nada foi publicado
    eu = cliente.get("/auth/eu", headers=a).json()
    assert (eu["avisos"], eu["suspensoes"], eu["suspenso_ate"]) == (3, 0, None)
    # passou do limite: suspensa por 7 dias
    r = _postar(cliente, a)
    assert r.status_code == 403 and "suspensa por 7 dias" in r.json()["detail"]
    eu = cliente.get("/auth/eu", headers=a).json()
    assert (eu["avisos"], eu["suspensoes"]) == (0, 1) and eu["suspenso_ate"]
    # suspensa: não publica nada (nem texto limpo), mas continua usando o app
    for rota, corpo in (("/social/posts", BOM), ("/social/stories", {"texto": "oi"}), ("/clubes", {"nome": "Clube bom"})):
        r = cliente.post(rota, json=corpo, headers=a)
        assert r.status_code == 403 and "suspensa até" in r.json()["detail"], rota
    assert cliente.patch("/me/perfil", json={"bio": "nova bio"}, headers=a).status_code == 403
    assert cliente.get("/social/feed", headers=a).status_code == 200
    assert cliente.get("/auth/eu", headers=a).json()["suspensoes"] == 1   # tentar enquanto suspensa não soma nada


def _fim_da_suspensao(email):
    with Sessao() as s:
        s.execute(update(Usuario).where(Usuario.email == email).values(suspenso_ate=datetime.now(timezone.utc) - timedelta(minutes=1)))
        s.commit()


def test_duas_suspensoes_e_passar_do_limite_de_novo_bane(cliente):
    a, _ = duas(cliente)
    for _ in range(2):            # dois ciclos: 3 avisos e a suspensão
        for _ in range(4):
            _postar(cliente, a)
        _fim_da_suspensao("ana@x.com")
    eu = cliente.get("/auth/eu", headers=a).json()
    assert (eu["avisos"], eu["suspensoes"]) == (0, 2)
    assert _postar(cliente, a, BOM).status_code == 201   # cumpriu a suspensão: volta a publicar
    for _ in range(3):
        assert _postar(cliente, a).status_code == 422
    r = _postar(cliente, a)
    assert r.status_code == 403 and "banida" in r.json()["detail"]
    # banida: nenhum pedido passa e o login é recusado
    assert cliente.get("/social/feed", headers=a).status_code == 403
    login = cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo1"})
    assert login.status_code == 403 and "banida" in login.json()["detail"]


def test_comentario_story_clube_e_perfil_tambem_passam_pelo_filtro(cliente):
    a, b = duas(cliente)
    post = _postar(cliente, b, BOM).json()["id"]
    assert cliente.post(f"/social/posts/{post}/comentarios", json={"texto": "seu otario"}, headers=a).status_code == 422
    assert cliente.post("/social/stories", json={"texto": "merda"}, headers=a).status_code == 422
    assert cliente.post("/clubes", json={"nome": "Clube dos babacas"}, headers=a).status_code == 422
    r = cliente.patch("/me/perfil", json={"bio": "sou fdp"}, headers=a)
    assert r.status_code == 403 and "suspensa" in r.json()["detail"]   # foi a 4ª: suspensão


def test_cadastro_com_nome_ofensivo_e_recusado_sem_aviso(cliente):
    r = cliente.post("/auth/cadastro", json={"nome": "Puta Velha", "email": "x@x.com", "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True})
    assert r.status_code == 422 and "não é permitida" in r.json()["detail"]


def test_conteudo_tirado_do_ar_pela_moderacao_conta_como_aviso(cliente):
    a, b = duas(cliente)
    post = _postar(cliente, a, BOM).json()["id"]
    cliente.post("/denuncias", json={"tipo": "post", "alvo_id": post, "motivo": "ofensa"}, headers=b)
    with Sessao() as s:
        s.execute(update(Usuario).where(Usuario.email == "bia@x.com").values(papel="dono"))
        s.commit()
    d = cliente.get("/moderacao/denuncias", headers=b).json()["itens"][0]
    cliente.post(f"/moderacao/denuncias/{d['id']}", json={"acao": "remover"}, headers=b)
    assert cliente.get("/auth/eu", headers=a).json()["avisos"] == 1
    hist = cliente.get("/me/exportar", headers=a).json()["politica_de_conteudo"]["historico"]
    assert hist[0]["tipo"] == "aviso" and "moderação" in hist[0]["motivo"]
