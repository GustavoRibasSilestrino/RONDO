"""Os e-mails que o RONDO manda para as pessoas, cada um com uma versão em HTML (com a logo) e uma só de texto (para os programas
que não mostram HTML e para os filtros de spam, que desconfiam de e-mail só com HTML).

O HTML segue as regras de e-mail: tabelas para o layout, estilos escritos em cada elemento (o Gmail descarta boa parte do <style>),
nada de script nem de SVG, e a logo como PNG com endereço público (o site). Tudo o que vem da pessoa (nome, e-mail) passa por
`html.escape`."""
from dataclasses import dataclass
from html import escape

from app.config import config

# as cores do app (preto, cinza e branco, com o verde só nos destaques): ver app/src/tema.ts
PRETO = "#070707"
FUNDO = "#f2f2f2"
CARTAO = "#ffffff"
TEXTO = "#161616"
TEXTO2 = "#4a4a4a"
TEXTO3 = "#6b6b6b"
LINHA = "#e2e2e2"
VERDE = "#15803d"
FONTE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"


@dataclass(frozen=True)
class Mensagem:
    assunto: str
    texto: str
    html: str


def _logo_url() -> str:
    return config().site_url.rstrip("/") + "/assets/logo/rondo-simbolo.png"


def _pagina(previa: str, corpo: str, rodape: str) -> str:
    """O esqueleto comum: faixa preta com a logo, o cartão branco com o conteúdo e o rodapé cinza."""
    site = config().site_url.rstrip("/")
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>RONDO</title>
</head>
<body style="margin:0;padding:0;background:{FUNDO};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{FUNDO};">{escape(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{FUNDO};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
    <tr><td style="background:{PRETO};border-radius:16px 16px 0 0;padding:28px 32px;" align="left">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;padding-right:12px;"><img src="{_logo_url()}" width="36" height="33" alt="" style="display:block;border:0;width:36px;height:33px;"></td>
        <td style="vertical-align:middle;font-family:{FONTE};font-size:22px;font-weight:800;letter-spacing:4px;color:#ffffff;">RONDO</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:{CARTAO};border-radius:0 0 16px 16px;padding:36px 32px 32px;font-family:{FONTE};color:{TEXTO};">
{corpo}
    </td></tr>
    <tr><td style="padding:24px 8px 0;font-family:{FONTE};font-size:12px;line-height:18px;color:{TEXTO3};" align="center">
      {rodape}<br><br>
      RONDO · Vença o você de ontem.<br>
      <a href="{site}/privacidade" style="color:{TEXTO3};text-decoration:underline;">Política de Privacidade</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>"""


def codigo_redefinicao(nome: str, email: str, codigo: str, minutos: int = 15) -> Mensagem:
    """O código de 6 dígitos de "Esqueci a senha"."""
    assunto = "Seu código para redefinir a senha do RONDO"
    texto = (
        f"Olá, {nome}!\n\n"
        "Recebemos um pedido para redefinir a senha da sua conta no RONDO.\n\n"
        f"Seu código é: {codigo}\n\n"
        f"Ele vale por {minutos} minutos e só pode ser usado uma vez. Não compartilhe este código com ninguém.\n\n"
        "Não foi você? É só ignorar este e-mail: a sua senha continua a mesma.\n\n"
        "Equipe RONDO\n\n"
        f"Você recebeu este e-mail porque alguém pediu para redefinir a senha da conta RONDO ligada a {email}. "
        "Este é um e-mail automático, não é preciso responder."
    )
    p = f'style="margin:0 0 16px;font-size:16px;line-height:24px;color:{TEXTO2};"'
    corpo = f"""      <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;font-weight:700;color:{TEXTO};">Redefinir a senha</h1>
      <p {p}>Olá, {escape(nome)}!</p>
      <p {p}>Recebemos um pedido para redefinir a senha da sua conta no RONDO. Use este código no app ou no site:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
        <tr><td align="center" style="background:{FUNDO};border:1px solid {LINHA};border-radius:12px;padding:20px 12px;">
          <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:10px;color:{TEXTO};padding-left:10px;">{escape(codigo)}</div>
          <div style="margin-top:8px;font-size:13px;line-height:18px;color:{VERDE};font-weight:600;">Vale por {minutos} minutos e só pode ser usado uma vez</div>
        </td></tr>
      </table>
      <p {p}>Não compartilhe este código com ninguém.</p>
      <p style="margin:0;padding-top:16px;border-top:1px solid {LINHA};font-size:14px;line-height:21px;color:{TEXTO3};">
        <strong style="color:{TEXTO2};">Não foi você?</strong> É só ignorar este e-mail: a sua senha continua a mesma.
      </p>"""
    rodape = (
        f"Você recebeu este e-mail porque alguém pediu para redefinir a senha da conta RONDO ligada a "
        f'<span style="color:{TEXTO2};">{escape(email)}</span>. Este é um e-mail automático, não é preciso responder.'
    )
    previa = f"Seu código é {codigo}. Ele vale por {minutos} minutos."
    return Mensagem(assunto, texto, _pagina(previa, corpo, rodape))


# ---------- avisos de segurança (com o botão "Proteger minha conta") ----------
def _botao(texto: str, link: str) -> str:
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;"><tr>'
        f'<td style="background:{PRETO};border-radius:10px;">'
        f'<a href="{escape(link, quote=True)}" style="display:inline-block;padding:14px 24px;font-family:{FONTE};font-size:15px;'
        f'font-weight:700;color:#ffffff;text-decoration:none;">{escape(texto)}</a></td></tr></table>'
    )


def _aviso(assunto: str, titulo: str, nome: str, email: str, linhas: list[tuple[str, str]], explicacao: str,
           link_proteger: str, motivo: str) -> Mensagem:
    """Um aviso de segurança: o que aconteceu (com quando e onde), "se foi você, tudo certo" e o botão de proteger a conta."""
    tabela = "".join(
        f'<tr><td style="padding:6px 0;font-size:14px;line-height:20px;color:{TEXTO3};width:96px;vertical-align:top;">{escape(k)}</td>'
        f'<td style="padding:6px 0;font-size:14px;line-height:20px;color:{TEXTO};font-weight:600;">{escape(v)}</td></tr>'
        for k, v in linhas
    )
    p = f'style="margin:0 0 16px;font-size:16px;line-height:24px;color:{TEXTO2};"'
    corpo = f"""      <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;font-weight:700;color:{TEXTO};">{escape(titulo)}</h1>
      <p {p}>Olá, {escape(nome)}!</p>
      <p {p}>{escape(explicacao)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background:{FUNDO};border:1px solid {LINHA};border-radius:12px;">
        <tr><td style="padding:12px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{tabela}</table></td></tr>
      </table>
      <p {p}><strong style="color:{TEXTO};">Foi você?</strong> Então está tudo certo, não precisa fazer nada.</p>
      <p style="margin:0 0 12px;padding-top:16px;border-top:1px solid {LINHA};font-size:16px;line-height:24px;color:{TEXTO2};">
        <strong style="color:{TEXTO};">Não foi você?</strong> Proteja a sua conta agora: todos os aparelhos saem da conta na hora e você cria uma senha nova.
      </p>
      {_botao("Proteger minha conta", link_proteger)}
      <p style="margin:12px 0 0;font-size:12px;line-height:18px;color:{TEXTO3};">O botão vale por 7 dias. Se ele não abrir, copie este endereço no navegador:<br>
        <span style="color:{TEXTO2};word-break:break-all;">{escape(link_proteger)}</span></p>"""
    detalhes = "\n".join(f"{k}: {v}" for k, v in linhas)
    texto = (
        f"Olá, {nome}!\n\n{explicacao}\n\n{detalhes}\n\n"
        "Foi você? Então está tudo certo, não precisa fazer nada.\n\n"
        "Não foi você? Proteja a sua conta agora: todos os aparelhos saem da conta na hora e você cria uma senha nova.\n"
        f"Proteger minha conta (vale por 7 dias): {link_proteger}\n\n"
        "Equipe RONDO\n\n"
        f"Você recebeu este e-mail porque {motivo} na conta RONDO ligada a {email}. "
        "É um aviso de segurança automático e não dá para desligar; não é preciso responder."
    )
    rodape = (
        f"Você recebeu este e-mail porque {escape(motivo)} na conta RONDO ligada a "
        f'<span style="color:{TEXTO2};">{escape(email)}</span>. É um aviso de segurança automático e não dá para desligar; '
        "não é preciso responder."
    )
    return Mensagem(assunto, texto, _pagina(f"{titulo}. Foi você? Se não foi, proteja a sua conta.", corpo, rodape))


def senha_alterada(nome: str, email: str, quando: str, aparelho: str, link_proteger: str) -> Mensagem:
    return _aviso(
        "A senha da sua conta RONDO foi alterada", "Sua senha foi alterada", nome, email,
        [("Quando", quando), ("Onde", aparelho)],
        "A senha da sua conta no RONDO acabou de ser trocada. Os outros aparelhos saíram da conta e precisam da senha nova para entrar.",
        link_proteger, "a senha foi alterada",
    )


def entrada_nova(nome: str, email: str, quando: str, aparelho: str, link_proteger: str) -> Mensagem:
    return _aviso(
        "Entrada nova na sua conta RONDO", "Entrada nova na sua conta", nome, email,
        [("Quando", quando), ("Onde", aparelho)],
        "Alguém entrou na sua conta do RONDO por um aparelho ou navegador que ela ainda não tinha usado.",
        link_proteger, "houve uma entrada por um aparelho novo",
    )


def dois_fatores_mudou(nome: str, email: str, ligou: bool, quando: str, aparelho: str, link_proteger: str) -> Mensagem:
    if ligou:
        return _aviso(
            "Verificação em duas etapas ligada na sua conta RONDO", "Verificação em duas etapas ligada", nome, email,
            [("Quando", quando), ("Onde", aparelho)],
            "A verificação em duas etapas foi ligada na sua conta. A partir de agora, para entrar com a senha, também é preciso o código do aplicativo autenticador.",
            link_proteger, "a verificação em duas etapas foi ligada",
        )
    return _aviso(
        "Verificação em duas etapas desligada na sua conta RONDO", "Verificação em duas etapas desligada", nome, email,
        [("Quando", quando), ("Onde", aparelho)],
        "A verificação em duas etapas foi desligada na sua conta. Para entrar, agora basta a senha.",
        link_proteger, "a verificação em duas etapas foi desligada",
    )
