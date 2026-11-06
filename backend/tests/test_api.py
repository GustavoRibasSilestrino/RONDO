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


def test_saude(cliente):
    assert cliente.get("/saude").json() == {"status": "ok"}


def test_cadastro_login_e_eu(cliente):
    r = cliente.post("/auth/cadastro", json={"nome": "Ana", "email": "Ana@x.com", "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True})
    assert r.status_code == 201
    assert cliente.post("/auth/cadastro", json={"nome": "Ana", "email": "ana@x.com", "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True}).status_code == 409

    assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "errada!"}).status_code == 401
    r = cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True})
    assert r.status_code == 200
    token = r.json()["token"]
    eu = cliente.get("/auth/eu", headers={"Authorization": f"Bearer {token}"})
    assert eu.json() == {"email": "ana@x.com", "nome": "Ana", "papel": "usuario", "verificado": False, "pro": False, "selo": None, "arroba": None, "bio": "", "marketing": False}
    assert cliente.get("/auth/eu").status_code == 401


def test_papel_do_dono_vem_do_banco_e_nao_do_cadastro(cliente):
    from sqlalchemy import select

    from app.banco import Sessao
    from app.modelos import Usuario

    corpo = {"nome": "Dono", "email": "dono@x.com", "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True, "papel": "dono", "verificado": True, "pro": True, "selo": "dono"}
    r = cliente.post("/auth/cadastro", json=corpo).json()
    assert (r["papel"], r["verificado"], r["pro"], r["selo"]) == ("usuario", False, False, None)   # o cadastro ignora esses campos

    with Sessao() as s:
        u = s.scalar(select(Usuario).where(Usuario.email == "dono@x.com"))
        u.papel, u.verificado, u.pro, u.selo = "dono", True, True, "dono"
        s.commit()
    r = cliente.post("/auth/login", json={"email": "dono@x.com", "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True}).json()
    assert (r["papel"], r["verificado"], r["pro"], r["selo"]) == ("dono", True, True, "dono")


def test_profissional(cliente):
    corpo = {"nome": "Bia", "email": "bia@x.com", "tipo": "CRN", "registro": "1234", "uf": "sp"}
    assert cliente.post("/profissionais", json=corpo).status_code == 422   # sem aceitar os termos e a privacidade
    corpo |= {"aceita_termos": True, "aceita_privacidade": True}
    assert cliente.post("/profissionais", json=corpo).json() == {"status": "pendente"}
    assert cliente.post("/profissionais", json=corpo).status_code == 409
    assert cliente.post("/profissionais", json={**corpo, "tipo": "XYZ"}).status_code == 422


def test_assinatura(cliente):
    assert cliente.post("/assinaturas", json={"plano_id": "pro-mensal", "token": "t"}).json() == {"status": "pendente"}
    assert cliente.post("/assinaturas", json={"plano_id": "nada", "token": "t"}).status_code == 422


def _conta(cliente, email="ana@x.com", nome="Ana"):
    r = cliente.post("/auth/cadastro", json={"nome": nome, "email": email, "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True}).json()
    return {"Authorization": f"Bearer {r['token']}"}


def test_dados_exigem_login_e_guardam_por_usuario(cliente):
    assert cliente.get("/me/dados").status_code == 401
    ana, bia = _conta(cliente), _conta(cliente, "bia@x.com", "Bia")

    corpo = {"itens": {"treinos": [{"data": "2026-11-05", "nome": "Peito"}], "agua": {"2026-11-05": 6}}}
    assert cliente.put("/me/dados", json=corpo, headers=ana).status_code == 200
    assert cliente.get("/me/dados", headers=ana).json()["itens"] == corpo["itens"]
    assert cliente.get("/me/dados", headers=bia).json()["itens"] == {}   # cada pessoa só vê o que é dela

    # atualizar uma chave troca o valor sem mexer nas outras
    cliente.put("/me/dados", json={"itens": {"agua": {"2026-11-05": 8}}}, headers=ana)
    itens = cliente.get("/me/dados", headers=ana).json()["itens"]
    assert itens["agua"] == {"2026-11-05": 8} and itens["treinos"][0]["nome"] == "Peito"


def test_dados_so_aceitam_chaves_conhecidas(cliente):
    ana = _conta(cliente)
    # xpExtra e pro são do servidor: o app não pode gravá-los
    r = cliente.put("/me/dados", json={"itens": {"xpExtra": 99999, "pro": True}}, headers=ana)
    assert r.status_code == 422
    assert cliente.get("/me/dados", headers=ana).json()["itens"] == {}


def test_stories_saiu_da_sincronia(cliente):
    ana = _conta(cliente)
    # um app antigo ainda manda "stories": é ignorado, e o resto da sincronia continua valendo
    r = cliente.put("/me/dados", json={"itens": {"stories": [{"id": "s1"}], "agua": {"2026-11-05": 3}}}, headers=ana)
    assert r.status_code == 200
    assert cliente.get("/me/dados", headers=ana).json()["itens"] == {"agua": {"2026-11-05": 3}}


def test_perfil_e_arroba_unica(cliente):
    ana, bia = _conta(cliente), _conta(cliente, "bia@x.com", "Bia")
    r = cliente.patch("/me/perfil", json={"nome": "Ana Souza", "arroba": "@Ana.Souza", "bio": "Treino de manhã"}, headers=ana)
    assert r.status_code == 200
    assert (r.json()["nome"], r.json()["arroba"], r.json()["bio"]) == ("Ana Souza", "ana.souza", "Treino de manhã")
    assert cliente.patch("/me/perfil", json={"arroba": "ana.souza"}, headers=bia).status_code == 409
    assert cliente.patch("/me/perfil", json={"arroba": "a"}, headers=bia).status_code == 422
    assert cliente.get("/auth/eu", headers=ana).json()["arroba"] == "ana.souza"


def test_trocar_senha(cliente):
    ana = _conta(cliente)
    assert cliente.post("/auth/senha", json={"atual": "errada!", "nova": "novasenha1"}, headers=ana).status_code == 401
    assert cliente.post("/auth/senha", json={"atual": "segredo1", "nova": "segredo1"}, headers=ana).status_code == 422
    assert cliente.post("/auth/senha", json={"atual": "segredo1", "nova": "novasenha1"}, headers=ana).status_code == 200
    assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo1", "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True}).status_code == 401
    assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "novasenha1"}).status_code == 200


def test_perfil_do_rondin_fica_salvo_na_conta(cliente):
    ana = _conta(cliente)
    fit = {"sotaque": "pt", "objetivo": "massa", "altura": 178, "peso": 78.5, "pesoMeta": 82, "diasSemana": 4, "foco": ["peito", "costas"]}
    r = cliente.put("/me/dados", json={"itens": {"perfilFit": fit, "perfil": {"sexo": "m", "idade": 30, "peso": 78.5, "altura": 178, "atividade": 1.55, "objetivo": 1.1}}}, headers=ana)
    assert r.status_code == 200
    itens = cliente.get("/me/dados", headers=ana).json()["itens"]
    assert itens["perfilFit"] == fit and itens["perfil"]["altura"] == 178
    assert cliente.get("/me/exportar", headers=ana).json()["dados_do_app"]["perfilFit"] == fit


# ---------- voz do RONDIN (nome e números) ----------

def test_voz_do_rondin_gera_guarda_e_serve(cliente, monkeypatch):
    from app.servicos import voz

    chamadas = []
    monkeypatch.setattr(voz, "gerar_mp3", lambda texto, sotaque: chamadas.append((texto, sotaque)) or b"mp3-falso")
    voz._cache.clear()
    r = cliente.post("/rondin/voz", json={"texto": "Ana", "sotaque": "br"})
    assert r.status_code == 200
    url = r.json()["url"]
    assert "Ana" not in url   # o nome não vai na URL
    a = cliente.get(url)
    assert a.status_code == 200 and a.content == b"mp3-falso" and a.headers["content-type"] == "audio/mpeg"
    cliente.post("/rondin/voz", json={"texto": "Ana", "sotaque": "br"})
    assert chamadas == [("Ana", "br")]   # o segundo pedido vem do cache


def test_voz_do_rondin_recusa_texto_e_sotaque_invalidos(cliente):
    for corpo in (
        {"texto": "", "sotaque": "br"}, {"texto": "x" * 31, "sotaque": "br"},
        {"texto": "<script>", "sotaque": "br"}, {"texto": "Ana", "sotaque": "klingon"},
    ):
        assert cliente.post("/rondin/voz", json=corpo).status_code == 422
    assert cliente.get("/rondin/voz/naoexiste.mp3").status_code == 404


def test_voz_do_rondin_sem_chave_responde_503_e_tem_limite(cliente, monkeypatch):
    from app.servicos import voz

    voz._cache.clear()
    voz._pedidos.clear()
    monkeypatch.setattr(voz.config(), "azure_speech_key", "")
    assert cliente.post("/rondin/voz", json={"texto": "Bia", "sotaque": "br"}).status_code == 503
    assert all(voz.dentro_do_limite("1.2.3.4", agora=100.0) for _ in range(voz.LIMITE_POR_MINUTO))
    assert voz.dentro_do_limite("1.2.3.4", agora=101.0) is False
    assert voz.dentro_do_limite("1.2.3.4", agora=200.0) is True   # passou o minuto


def test_voz_do_rondin_monta_ssml_com_voz_e_ajuste(cliente):
    from app.servicos import voz

    ssml = voz.montar_ssml("Ana & Cia", "br")
    assert 'xml:lang="pt-BR"' in ssml and 'name="pt-BR-AntonioNeural"' in ssml and "Ana &amp; Cia" in ssml and "prosody" not in ssml
    assert 'pitch="-28%"' in voz.montar_ssml("Ana", "narrador")
