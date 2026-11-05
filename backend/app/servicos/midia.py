"""Fotos e vídeos dos posts no Supabase Storage. O app sobe o arquivo direto para o Storage com um endereço assinado
que a API gera; a chave de serviço nunca sai do servidor."""
import uuid

import httpx
from fastapi import HTTPException

from app.config import config

EXTENSOES = {"jpg", "jpeg", "png", "webp", "gif", "heic", "mp4", "mov", "webm"}


def configurado() -> bool:
    c = config()
    return bool(c.supabase_url and c.supabase_service_key)


def prefixo_publico() -> str:
    c = config()
    return f"{c.supabase_url.rstrip('/')}/storage/v1/object/public/{c.supabase_bucket}/"


def url_publica(caminho: str) -> str:
    return prefixo_publico() + caminho


def _cabecalho() -> dict[str, str]:
    return {"Authorization": f"Bearer {config().supabase_service_key}"}


def assinar_upload(usuario_id: int, ext: str) -> dict[str, str]:
    """Gera o caminho `usuario/uuid.ext` e o endereço assinado para o app enviar o arquivo."""
    if not configurado():
        raise HTTPException(503, "O envio de fotos ainda não está configurado no servidor.")
    ext = ext.lower().lstrip(".")
    if ext not in EXTENSOES:
        raise HTTPException(422, "Tipo de arquivo não aceito.")
    c = config()
    caminho = f"{usuario_id}/{uuid.uuid4().hex}.{ext}"
    base = c.supabase_url.rstrip("/")
    try:
        r = httpx.post(f"{base}/storage/v1/object/upload/sign/{c.supabase_bucket}/{caminho}", headers=_cabecalho(), timeout=15)
        r.raise_for_status()
        assinado = r.json()["url"]   # "/object/upload/sign/bucket/caminho?token=..."
    except (httpx.HTTPError, KeyError, ValueError):
        raise HTTPException(502, "Não foi possível preparar o envio agora. Tente de novo.")
    return {"caminho": caminho, "url_envio": f"{base}/storage/v1{assinado}", "url": url_publica(caminho)}


def apagar_arquivos(urls: list[str]) -> None:
    """Melhor esforço: se o Storage não responder, o post some do mesmo jeito."""
    if not configurado() or not urls:
        return
    prefixo = prefixo_publico()
    caminhos = [u[len(prefixo):] for u in urls if u.startswith(prefixo)]
    if not caminhos:
        return
    c = config()
    try:
        httpx.request("DELETE", f"{c.supabase_url.rstrip('/')}/storage/v1/object/{c.supabase_bucket}", headers=_cabecalho(), json={"prefixes": caminhos}, timeout=15)
    except httpx.HTTPError:
        pass
