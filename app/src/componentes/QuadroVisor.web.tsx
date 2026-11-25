/* O quadro do visor 3D no navegador: a página public/visor3d.html num iframe do mesmo site (o app web fica em /app, e a
   página também). Ela avisa por postMessage quando o mascote terminou de carregar ("pronto") ou se deu erro. */
import React, { useEffect } from 'react';

export function QuadroVisor({ endereco, aoAviso }: { endereco: string; aoAviso: (msg: string) => void }) {
  useEffect(() => {
    const ouvir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = (e.data as { visor3d?: unknown } | null)?.visor3d;
      if (typeof msg === 'string') aoAviso(msg);
    };
    window.addEventListener('message', ouvir);
    return () => window.removeEventListener('message', ouvir);
  }, [aoAviso]);
  return (
    <iframe
      src={`${__DEV__ ? '' : '/app'}${endereco}`}   // publicado, o app (e os arquivos de public/) fica em /app; no servidor local, na raiz
      title="O mascote em 3D"
      style={{ flex: 1, width: '100%', height: '100%', border: 0, background: 'transparent', display: 'block' }}
      allow="fullscreen"
    />
  );
}
