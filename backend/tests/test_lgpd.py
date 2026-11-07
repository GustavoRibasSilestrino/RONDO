import os

os.environ["DATABASE_URL"] = "sqlite://"  # memória; precisa vir antes de importar o app

from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.banco import Base, Sessao, engine
from app.main import app
from app.modelos import Consentimento, Notificacao, Post, Seguidor, Story, Usuario
from app.servicos.conta import limpar_vencidos


@pytest.fixture()
def cliente():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    return TestClient(app)


def _corpo(email="ana@x.com", nascimento="1995-04-10", **extra):
    return {"nome": "Ana", "email": email, "senha": "segredo1", "nascimento": nascimento,
            "aceita_termos": True, "aceita_privacidade": True, **extra}


def _anos_atras(n: int) -> str:
    hoje = date.today()
    return hoje.replace(year=hoje.year - n).isoformat()


def _conta(cliente, email="ana@x.com"):
    r = cliente.post("/auth/cadastro", json=_corpo(email))
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_cadastro_exige_aceite_dos_termos_e_da_privacidade(cliente):
    assert cliente.post("/auth/cadastro", json=_corpo(aceita_termos=False)).status_code == 422
    assert cliente.post("/auth/cadastro", json=_corpo(aceita_privacidade=False)).status_code == 422
    sem_nascimento = _corpo()
    del sem_nascimento["nascimento"]
    assert cliente.post("/auth/cadastro", json=sem_nascimento).status_code == 422


def test_aceite_fica_registrado_com_versao_e_marketing_desligado(cliente):
    r = cliente.post("/auth/cadastro", json=_corpo())
    assert r.status_code == 201 and r.json()["marketing"] is False
    with Sessao() as s:
        tipos = {(c.tipo, c.aceito) for c in s.query(Consentimento).all()}
        versoes = {c.versao for c in s.query(Consentimento).all()}
    assert tipos == {("termos", True), ("privacidade", True), ("marketing", False)}
    assert None not in versoes


def test_menor_precisa_de_responsavel(cliente):
    menor = _anos_atras(15)
    assert cliente.post("/auth/cadastro", json=_corpo(nascimento=menor)).status_code == 422
    resp = {"nome": "Mae da Ana", "email": "mae@x.com", "autoriza": False}
    assert cliente.post("/auth/cadastro", json=_corpo(nascimento=menor, responsavel=resp)).status_code == 422
    resp_mesmo_email = {"nome": "Mae", "email": "ana@x.com", "autoriza": True}
    assert cliente.post("/auth/cadastro", json=_corpo(nascimento=menor, responsavel=resp_mesmo_email)).status_code == 422
    resp["autoriza"] = True
    assert cliente.post("/auth/cadastro", json=_corpo(nascimento=menor, responsavel=resp)).status_code == 201
    with Sessao() as s:
        c = s.query(Consentimento).filter_by(tipo="responsavel").one()
    assert c.aceito and c.detalhe == {"nome": "Mae da Ana", "email": "mae@x.com"}


def test_adulto_nao_guarda_dados_de_responsavel(cliente):
    resp = {"nome": "Alguem", "email": "alguem@x.com", "autoriza": True}
    assert cliente.post("/auth/cadastro", json=_corpo(responsavel=resp)).status_code == 201
    with Sessao() as s:
        assert s.query(Consentimento).filter_by(tipo="responsavel").count() == 0


def test_marketing_liga_desliga_e_registra(cliente):
    ana = _conta(cliente)
    assert cliente.patch("/me/marketing", json={"marketing": True}, headers=ana).json()["marketing"] is True
    assert cliente.patch("/me/marketing", json={"marketing": False}, headers=ana).json()["marketing"] is False
    with Sessao() as s:
        historico = [c.aceito for c in s.query(Consentimento).filter_by(tipo="marketing").order_by(Consentimento.id)]
    assert historico == [False, True, False]


def test_exportar_traz_os_dados_da_pessoa(cliente):
    ana = _conta(cliente)
    cliente.put("/me/dados", json={"itens": {"agua": {"2026-11-05": 6}}}, headers=ana)
    cliente.post("/social/posts", json={"texto": "Primeiro treino"}, headers=ana)
    d = cliente.get("/me/exportar", headers=ana).json()
    assert d["conta"]["email"] == "ana@x.com" and d["conta"]["nascimento"] == "1995-04-10"
    assert d["dados_do_app"] == {"agua": {"2026-11-05": 6}}
    assert [p["texto"] for p in d["publicacoes"]] == ["Primeiro treino"]
    assert {c["tipo"] for c in d["consentimentos"]} == {"termos", "privacidade", "marketing"}
    assert "senha_hash" not in str(d)
    assert cliente.get("/me/exportar").status_code == 401


def test_apagar_conta_pede_senha_e_apaga_tudo(cliente):
    ana, bia = _conta(cliente), _conta(cliente, "bia@x.com")
    post = cliente.post("/social/posts", json={"texto": "oi"}, headers=ana).json()
    cliente.put(f"/social/posts/{post['id']}/curtida", headers=bia)
    cliente.put("/pessoas/1/seguir", headers=bia)
    cliente.post("/social/stories", json={"texto": "story"}, headers=ana)

    assert cliente.request("DELETE", "/me", json={"senha": "errada"}, headers=ana).status_code == 401
    assert cliente.request("DELETE", "/me", json={"senha": "segredo1"}, headers=ana).status_code == 200
    with Sessao() as s:
        assert s.query(Usuario).filter_by(email="ana@x.com").count() == 0
        assert s.query(Post).count() == 0 and s.query(Story).count() == 0
        assert s.query(Seguidor).count() == 0 and s.query(Notificacao).count() == 0
        assert s.query(Consentimento).filter_by(usuario_id=1).count() == 0
    assert cliente.get("/me/dados", headers=ana).status_code == 401   # o token da conta apagada não vale mais
    assert cliente.post("/auth/login", json={"email": "ana@x.com", "senha": "segredo1"}).status_code == 401
    assert cliente.get("/me/dados", headers=bia).status_code == 200   # a outra conta segue normal


def test_retencao_apaga_stories_e_avisos_vencidos(cliente):
    _conta(cliente)
    agora = datetime.now(timezone.utc)
    with Sessao() as s:
        s.add_all([
            Story(autor_id=1, texto="velho", criado_em=agora - timedelta(hours=25)),
            Story(autor_id=1, texto="novo", criado_em=agora - timedelta(hours=1)),
            Notificacao(usuario_id=1, ator_id=1, tipo="seguidor", criado_em=agora - timedelta(days=181)),
            Notificacao(usuario_id=1, ator_id=1, tipo="seguidor", criado_em=agora - timedelta(days=2)),
        ])
        s.commit()
        limpar_vencidos(s, forcar=True)
        assert [x.texto for x in s.query(Story).all()] == ["novo"]
        assert s.query(Notificacao).count() == 1


def test_erro_de_validacao_nao_devolve_a_senha(cliente):
    r = cliente.post("/auth/cadastro", json=_corpo(aceita_termos=False))
    assert r.status_code == 422
    assert "segredo1" not in r.text and "ana@x.com" not in r.text and "1995-04-10" not in r.text
    assert "aceite os Termos de Uso" in r.json()["detail"][0]["msg"]


def test_login_regrava_hash_antigo_no_formato_leve(cliente):
    """Conta criada com o hash pesado de antes: o login confere e regrava no formato atual, e a senha segue valendo."""
    from argon2 import PasswordHasher
    from sqlalchemy import select
    from app.banco import Sessao
    from app.modelos import Usuario
    from app.seguranca import precisa_atualizar

    assert cliente.post("/auth/cadastro", json=_corpo("hash@example.com")).status_code == 201
    pesado = PasswordHasher().hash("segredo1")   # parâmetros padrão da biblioteca: os antigos
    assert precisa_atualizar(pesado)
    with Sessao() as s:
        u = s.scalar(select(Usuario).where(Usuario.email == "hash@example.com"))
        u.senha_hash = pesado
        s.commit()
    assert cliente.post("/auth/login", json={"email": "hash@example.com", "senha": "segredo1"}).status_code == 200
    with Sessao() as s:
        novo = s.scalar(select(Usuario).where(Usuario.email == "hash@example.com")).senha_hash
    assert not precisa_atualizar(novo) and novo != pesado
    assert cliente.post("/auth/login", json={"email": "hash@example.com", "senha": "segredo1"}).status_code == 200
    assert cliente.post("/auth/login", json={"email": "hash@example.com", "senha": "errada123"}).status_code == 401


# ---------- recuperar a senha por código no e-mail ----------
def _com_email_capturado(monkeypatch):
    """Troca o envio de e-mail por uma lista: o teste lê o código que iria para a caixa de entrada."""
    enviados = []
    monkeypatch.setattr("app.rotas.auth.enviar", lambda para, assunto, texto: enviados.append((para, assunto, texto)))
    return enviados


def _codigo_de(texto: str) -> str:
    import re
    return re.search(r"código é: (\d{6})", texto).group(1)


def test_recuperar_senha_com_codigo(cliente, monkeypatch):
    enviados = _com_email_capturado(monkeypatch)
    assert cliente.post("/auth/cadastro", json=_corpo("rec@example.com")).status_code == 201
    assert cliente.post("/auth/esqueci-senha", json={"email": "rec@example.com"}).json() == {"status": "ok"}
    assert len(enviados) == 1 and enviados[0][0] == "rec@example.com"
    codigo = _codigo_de(enviados[0][2])
    # o código errado não vale; o certo troca a senha, e só serve uma vez
    assert cliente.post("/auth/redefinir-senha", json={"email": "rec@example.com", "codigo": "000000" if codigo != "000000" else "111111", "nova": "novasenha1"}).status_code == 400
    assert cliente.post("/auth/redefinir-senha", json={"email": "rec@example.com", "codigo": codigo, "nova": "novasenha1"}).json() == {"status": "ok"}
    assert cliente.post("/auth/login", json={"email": "rec@example.com", "senha": "segredo1"}).status_code == 401
    assert cliente.post("/auth/login", json={"email": "rec@example.com", "senha": "novasenha1"}).status_code == 200
    assert cliente.post("/auth/redefinir-senha", json={"email": "rec@example.com", "codigo": codigo, "nova": "outrasenha1"}).status_code == 400


def test_recuperar_senha_nao_revela_quem_tem_conta(cliente, monkeypatch):
    enviados = _com_email_capturado(monkeypatch)
    r = cliente.post("/auth/esqueci-senha", json={"email": "ninguem@example.com"})
    assert r.status_code == 200 and r.json() == {"status": "ok"} and enviados == []
    assert cliente.post("/auth/redefinir-senha", json={"email": "ninguem@example.com", "codigo": "123456", "nova": "novasenha1"}).status_code == 400


def test_codigo_morre_depois_de_5_erros_e_vence_em_15_minutos(cliente, monkeypatch):
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select
    from app.banco import Sessao
    from app.modelos import RedefinicaoSenha

    enviados = _com_email_capturado(monkeypatch)
    cliente.post("/auth/cadastro", json=_corpo("lim@example.com"))
    cliente.post("/auth/esqueci-senha", json={"email": "lim@example.com"})
    certo = _codigo_de(enviados[0][2])
    errado = "999999" if certo != "999999" else "888888"
    for _ in range(5):
        assert cliente.post("/auth/redefinir-senha", json={"email": "lim@example.com", "codigo": errado, "nova": "novasenha1"}).status_code == 400
    # depois de 5 erros nem o código certo vale
    assert cliente.post("/auth/redefinir-senha", json={"email": "lim@example.com", "codigo": certo, "nova": "novasenha1"}).status_code == 400
    # um código novo vale; vencido, não
    cliente.post("/auth/esqueci-senha", json={"email": "lim@example.com"})
    novo = _codigo_de(enviados[1][2])
    with Sessao() as s:
        p = s.scalars(select(RedefinicaoSenha).order_by(RedefinicaoSenha.id.desc())).first()
        p.expira_em = datetime.now(timezone.utc) - timedelta(minutes=1)
        s.commit()
    assert cliente.post("/auth/redefinir-senha", json={"email": "lim@example.com", "codigo": novo, "nova": "novasenha1"}).status_code == 400


def test_no_maximo_3_codigos_por_hora(cliente, monkeypatch):
    enviados = _com_email_capturado(monkeypatch)
    cliente.post("/auth/cadastro", json=_corpo("tres@example.com"))
    for _ in range(5):
        assert cliente.post("/auth/esqueci-senha", json={"email": "tres@example.com"}).status_code == 200
    assert len(enviados) == 3


def test_o_codigo_nao_fica_guardado_em_claro(cliente, monkeypatch):
    from sqlalchemy import select
    from app.banco import Sessao
    from app.modelos import RedefinicaoSenha

    enviados = _com_email_capturado(monkeypatch)
    cliente.post("/auth/cadastro", json=_corpo("hash2@example.com"))
    cliente.post("/auth/esqueci-senha", json={"email": "hash2@example.com"})
    codigo = _codigo_de(enviados[0][2])
    with Sessao() as s:
        guardado = s.scalars(select(RedefinicaoSenha)).first().codigo_hash
    assert codigo not in guardado and len(guardado) == 64


# ---------- entrar com Google e com a Apple ----------
@pytest.fixture
def chaves_de_teste(monkeypatch):
    """Um par de chaves RSA de mentira: o teste assina o id_token como se fosse o Google ou a Apple, e o servidor confere com a chave pública."""
    from cryptography.hazmat.primitives.asymmetric import rsa
    privada = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    monkeypatch.setattr("app.servicos.login_social._chave", lambda url, token: privada.public_key())
    return privada


def _id_token(privada, provedor="google", email="gente@example.com", audiencia="cliente-rondo", verificado=True, expirado=False, nome="Gente Boa"):
    import jwt as pyjwt
    from datetime import datetime, timedelta, timezone
    agora = datetime.now(timezone.utc)
    emissor = "https://accounts.google.com" if provedor == "google" else "https://appleid.apple.com"
    corpo = {"iss": emissor, "aud": audiencia, "sub": "12345", "email": email, "email_verified": verificado, "name": nome,
             "exp": agora + timedelta(minutes=-5 if expirado else 5)}
    return pyjwt.encode(corpo, privada, algorithm="RS256")


def _configurar(monkeypatch):
    from app.config import config
    monkeypatch.setattr(config(), "google_client_ids", "cliente-rondo,outro-cliente")
    monkeypatch.setattr(config(), "apple_client_ids", "cliente-rondo")


def test_google_nao_configurado_responde_503(cliente, chaves_de_teste):
    r = cliente.post("/auth/google", json={"id_token": _id_token(chaves_de_teste)})
    assert r.status_code == 503


def test_google_primeira_vez_pede_cadastro_e_depois_entra_direto(cliente, chaves_de_teste, monkeypatch):
    _configurar(monkeypatch)
    r = cliente.post("/auth/google", json={"id_token": _id_token(chaves_de_teste)})
    assert r.status_code == 200
    d = r.json()
    assert d["precisa_cadastro"] is True and d["login"] is None and d["email"] == "gente@example.com" and d["token_social"]
    # o token da primeira etapa não abre a conta: só serve para o cadastro social
    assert cliente.get("/auth/eu", headers={"Authorization": f"Bearer {d['token_social']}"}).status_code == 401

    corpo = {"token_social": d["token_social"], "nascimento": "1995-04-10", "aceita_termos": True, "aceita_privacidade": True}
    assert cliente.post("/auth/social/cadastro", json={**corpo, "aceita_termos": False}).status_code == 422   # sem aceite não cria
    criada = cliente.post("/auth/social/cadastro", json=corpo)
    assert criada.status_code == 201 and criada.json()["email"] == "gente@example.com" and criada.json()["nome"] == "Gente Boa"
    assert cliente.get("/auth/eu", headers={"Authorization": f"Bearer {criada.json()['token']}"}).status_code == 200
    assert cliente.post("/auth/social/cadastro", json=corpo).status_code == 409   # a conta já existe

    # da segunda vez o Google entra direto, e a conta guardou o aceite
    de_novo = cliente.post("/auth/google", json={"id_token": _id_token(chaves_de_teste)}).json()
    assert de_novo["precisa_cadastro"] is False and de_novo["login"]["email"] == "gente@example.com" and de_novo["login"]["token"]
    h = {"Authorization": f"Bearer {de_novo['login']['token']}"}
    tipos = {c["tipo"] for c in cliente.get("/me/exportar", headers=h).json()["consentimentos"]}
    assert {"termos", "privacidade"} <= tipos


def test_google_conta_que_ja_existe_entra_direto(cliente, chaves_de_teste, monkeypatch):
    _configurar(monkeypatch)
    cliente.post("/auth/cadastro", json=_corpo("gente@example.com"))
    d = cliente.post("/auth/google", json={"id_token": _id_token(chaves_de_teste)}).json()
    assert d["precisa_cadastro"] is False and d["login"]["email"] == "gente@example.com"


def test_id_token_ruim_e_recusado(cliente, chaves_de_teste, monkeypatch):
    _configurar(monkeypatch)
    for token in (
        _id_token(chaves_de_teste, audiencia="de-outro-app"),   # não é para o RONDO
        _id_token(chaves_de_teste, verificado=False),           # e-mail que o provedor não confirmou
        _id_token(chaves_de_teste, expirado=True),              # vencido
        "isto-nao-e-um-token-valido",
    ):
        assert cliente.post("/auth/google", json={"id_token": token}).status_code == 401
    # assinado por outra chave
    from cryptography.hazmat.primitives.asymmetric import rsa
    outra = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    assert cliente.post("/auth/google", json={"id_token": _id_token(outra)}).status_code == 401


def test_cadastro_social_de_menor_exige_responsavel(cliente, chaves_de_teste, monkeypatch):
    _configurar(monkeypatch)
    d = cliente.post("/auth/google", json={"id_token": _id_token(chaves_de_teste, email="jovem@example.com")}).json()
    corpo = {"token_social": d["token_social"], "nascimento": _anos_atras(15), "aceita_termos": True, "aceita_privacidade": True}
    assert cliente.post("/auth/social/cadastro", json=corpo).status_code == 422
    com = {**corpo, "responsavel": {"nome": "Mãe do Jovem", "email": "mae@example.com", "autoriza": True}}
    assert cliente.post("/auth/social/cadastro", json=com).status_code == 201


def test_apple_funciona_como_o_google(cliente, chaves_de_teste, monkeypatch):
    _configurar(monkeypatch)
    token = _id_token(chaves_de_teste, provedor="apple", email="maca@privaterelay.appleid.com", nome=None)
    d = cliente.post("/auth/apple", json={"id_token": token}).json()
    assert d["precisa_cadastro"] is True and d["email"] == "maca@privaterelay.appleid.com"
    # um token com o emissor do Google não vale como token da Apple
    assert cliente.post("/auth/apple", json={"id_token": _id_token(chaves_de_teste, provedor="google")}).status_code == 401
    corpo = {"token_social": d["token_social"], "nome": "Maçã Silva", "nascimento": "1990-01-01", "aceita_termos": True, "aceita_privacidade": True}
    r = cliente.post("/auth/social/cadastro", json=corpo)
    assert r.status_code == 201 and r.json()["nome"] == "Maçã Silva"
