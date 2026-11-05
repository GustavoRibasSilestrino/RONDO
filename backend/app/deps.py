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
    return sessao.get(Usuario, uid) if uid else None


def usuario_atual(usuario: Usuario | None = Depends(usuario_opcional)) -> Usuario:
    if not usuario:
        raise HTTPException(401, "Não autenticado.")
    return usuario
