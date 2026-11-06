from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.modelos import Usuario
from app.seguranca import ler_token

_bearer = HTTPBearer(auto_error=False)


def usuario_opcional(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    sessao: Session = Depends(obter_sessao),
) -> Usuario | None:
    if not cred:
        return None
    uid = ler_token(cred.credentials)
    usuario = sessao.get(Usuario, uid) if uid else None
    # Devolve a conexão ao pool já: o pedido ainda vai esperar uma thread livre para rodar a rota, e segurar a conexão nesse
    # intervalo, com centenas de pedidos juntos, esgotava o pool e travava tudo (as threads esperavam conexão e as
    # conexões esperavam thread). Os dados do usuário continuam disponíveis; a rota abre a transação de novo ao precisar.
    sessao.commit()
    return usuario


def usuario_atual(usuario: Usuario | None = Depends(usuario_opcional)) -> Usuario:
    if not usuario:
        raise HTTPException(401, "Não autenticado.")
    return usuario
