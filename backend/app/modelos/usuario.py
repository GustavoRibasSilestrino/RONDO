from datetime import date, datetime, timezone

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, String, event, false
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(120))
    senha_hash: Mapped[str] = mapped_column(String(255))
    papel: Mapped[str] = mapped_column(String(12), default="usuario", server_default="usuario")  # usuario | dono
    verificado: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    pro: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    # selo ao lado do nome, definido só pelo banco: profissional | famoso | dono (nulo = sem selo)
    selo: Mapped[str | None] = mapped_column(String(12), nullable=True)
    arroba: Mapped[str | None] = mapped_column(String(30), unique=True, index=True, nullable=True)   # nome de usuário, sem o @
    bio: Mapped[str] = mapped_column(String(300), default="", server_default="")
    # a foto de perfil: o endereço público no Storage (a pasta do próprio usuário); nulo = sem foto
    foto: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # a capa do perfil (desde 2026-11-26): a imagem larga do alto do perfil, também na pasta do próprio usuário; nulo = capa cinza
    capa: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # o mascote que a conta mostra (ao lado da foto, nas publicações e passeando pelo app), como "linha-coluna" na folha de
    # mascotes; vazio = nenhum. O primeiro mascote que a conta ganha vira o dela; depois ela troca na coleção (2026-11-19)
    mascote: Mapped[str | None] = mapped_column(String(5), nullable=True)
    # o nome que a conta deu ao mascote que ela mostra (cópia de mascotes.nome, para ir junto com a pessoa nas publicações
    # e no perfil sem outra consulta); vazio = o nome de fábrica (2026-11-19)
    mascote_nome: Mapped[str | None] = mapped_column(String(24), nullable=True)
    # lápis da loja que a conta tem guardados: cada um dá um nome novo a um mascote da coleção (2026-11-19)
    lapis: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # até que treino o XP do mascote já foi contado (2026-11-23): o fim, em milissegundos, do último treino que deu XP, ou a
    # hora em que o mascote de agora foi escolhido, o que for mais novo. Só treinos terminados depois disso dão XP.
    xp_treino_ate: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    # só para saber se é menor de idade (precisa de responsável); contas antigas ficam sem
    nascimento: Mapped[date | None] = mapped_column(Date, nullable=True)
    # e-mails de novidades: só com consentimento separado, desligado por padrão; o histórico fica em consentimentos
    marketing: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    @property
    def tem_selo(self) -> bool:
        """O selo de verificado ao lado do nome: quem foi verificado à mão, quem assina o PRO e o dono do app (2026-11-18)."""
        return bool(self.verificado or self.pro or self.papel == "dono")
    # o nome e o @ sem acento e em minúsculas, para a busca de pessoas; preenchido sozinho ao gravar (ver abaixo)
    busca: Mapped[str] = mapped_column(String(200), default='', server_default='')
    # a política de conteúdo (servicos/penalidades.py): avisos do ciclo atual (0 a 3), suspensões já tomadas, até quando
    # a conta está suspensa e se foi banida. Quem define é só o servidor.
    avisos: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    suspensoes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    suspenso_ate: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    banido: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    # verificação em duas etapas (servicos/dois_fatores.py, desde 2026-11-27): o segredo do aplicativo autenticador, cifrado.
    # Com totp_ativo falso e segredo preenchido, a pessoa começou a ligar e ainda não confirmou o primeiro código.
    # totp_passo é o último passo de 30 s já usado: o mesmo código não entra duas vezes.
    totp_segredo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    totp_ativo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    totp_passo: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    # o e-mail já foi provado como da pessoa (desde 2026-11-27): por um código de "Esqueci a senha" ou por entrar com Google/Apple.
    # Conta criada com senha começa sem prova; se alguém criou a conta com o e-mail de outra pessoa, o primeiro login social do
    # dono de verdade toma a conta de volta (rotas/auth.py, _entrada_social).
    email_confirmado: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    @property
    def dois_fatores(self) -> bool:
        return bool(self.totp_ativo)


class Penalidade(Base):
    """O histórico da política de conteúdo de cada conta: cada aviso, suspensão e banimento, com o motivo e o trecho."""

    __tablename__ = "penalidades"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(String(12))          # aviso | suspensao | banimento
    motivo: Mapped[str] = mapped_column(String(160))
    trecho: Mapped[str | None] = mapped_column(String(300), nullable=True)
    em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


def _preencher_busca(_mapper, _conexao, usuario: "Usuario") -> None:
    from app.servicos.busca import texto_de_busca
    usuario.busca = texto_de_busca(usuario.nome, usuario.arroba)


event.listen(Usuario, "before_insert", _preencher_busca)
event.listen(Usuario, "before_update", _preencher_busca)
