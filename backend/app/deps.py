from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.modelos import Usuario
from app.seguranca import ler_token, marca_da_senha

_bearer = HTTPBearer(auto_error=False)


def usuario_opcional(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    sessao: Session = Depends(obter_sessao),
) -> Usuario | None:
    if not cred:
        return None
    lido = ler_token(cred.credentials)
    usuario = sessao.get(Usuario, lido[0]) if lido else None
    # o token traz a marca da senha de quando foi emitido: se a senha mudou depois, ele não vale mais.
    # (tokens de antes desta regra não têm a marca e seguem valendo até vencerem, em no máximo 7 dias)
    if usuario and lido and lido[1] is not None and lido[1] != marca_da_senha(usuario.senha_hash):
        usuario = None
    # Devolve a conexão ao pool já: o pedido ainda vai esperar uma thread livre para rodar a rota, e segurar a conexão nesse
    # intervalo, com centenas de pedidos juntos, esgotava o pool e travava tudo (as threads esperavam conexão e as
    # conexões esperavam thread). Os dados do usuário continuam disponíveis; a rota abre a transação de novo ao precisar.
    sessao.commit()
    return usuario


def usuario_atual(usuario: Usuario | None = Depends(usuario_opcional)) -> Usuario:
    if not usuario:
        raise HTTPException(401, "Não autenticado.")
    return usuario
