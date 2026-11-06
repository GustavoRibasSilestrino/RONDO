import { useEffect, useRef, useState } from "react";
import { lerPrefs, registrarAbrirPreferencias, salvarPrefs } from "../lib/consentimento";

/* Aviso de cookies: aparece na primeira visita (e quando a política de cookies muda).
   Aceitar e recusar têm o mesmo peso; nada opcional liga sem escolha. Reabre pelo rodapé. */
export function AvisoCookies() {
  const [aberto, setAberto] = useState(() => lerPrefs() === null);
  const [detalhes, setDetalhes] = useState(false);
  const [analise, setAnalise] = useState(() => lerPrefs()?.analise ?? false);
  const [marketing, setMarketing] = useState(() => lerPrefs()?.marketing ?? false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registrarAbrirPreferencias(() => {
      const p = lerPrefs();
      setAnalise(p?.analise ?? false); setMarketing(p?.marketing ?? false);
      setDetalhes(true); setAberto(true);
    });
    return () => registrarAbrirPreferencias(null);
  }, []);
  useEffect(() => { if (aberto) caixa.current?.focus(); }, [aberto]);

  if (!aberto) return null;
  const escolher = (a: boolean, m: boolean) => { salvarPrefs({ analise: a, marketing: m }); setAberto(false); setDetalhes(false); };

  return (
    <div className="cookies" role="dialog" aria-modal="false" aria-labelledby="cookies-titulo" tabIndex={-1} ref={caixa}
      onKeyDown={(e) => { if (e.key === "Escape") escolher(false, false); }}>
      <p id="cookies-titulo"><b>Cookies e privacidade</b></p>
      <p>
        O site usa só o armazenamento essencial para funcionar, como lembrar esta escolha. Hoje não usamos cookies de
        análise, de publicidade nem de rastreamento. Se um dia usarmos, eles só ligam com o seu aceite.{" "}
        <a href="/privacidade#cookies">Saiba mais</a>.
      </p>
      {detalhes ? (
        <fieldset className="cookies-opcoes">
          <legend className="sr-only">Categorias</legend>
          <label><input type="checkbox" checked disabled /> Essenciais (sempre ligados)</label>
          <label><input type="checkbox" checked={analise} onChange={(e) => setAnalise(e.target.checked)} /> Análise de visitas (não usamos hoje)</label>
          <label><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> Publicidade (não usamos hoje)</label>
        </fieldset>
      ) : null}
      <div className="cookies-acoes">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => escolher(false, false)}>Recusar opcionais</button>
        {detalhes
          ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => escolher(analise, marketing)}>Salvar escolhas</button>
          : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetalhes(true)}>Personalizar</button>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => escolher(true, true)}>Aceitar todos</button>
      </div>
    </div>
  );
}
