/* Faz o RONDIN falar numa tela: a voz (lib/rondinVoz) e a legenda palavra por palavra (Legenda, de telas/Rondin.tsx) andam
   juntas. `dizer(partes, depois)` fala as partes em ordem; `depois` roda quando a voz e a legenda terminaram. Tocar no orbe
   pula a fala enquanto ela corre e a repete depois. É a mesma lógica de telas/Rondin.tsx, sem as etapas do cadastro. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { falar, parar, useSomBloqueado, type Sotaque } from './rondinVoz';
import { trechosParaVoz, type Trecho } from './rondinRoteiro';

export type FalaRondin = {
  fala: string; chave: number; indiceVoz: number; duracaoMs: number; completa: boolean; falando: boolean;
  /* `ocultar`: palavras da pessoa (o nome) que aparecem na legenda mas não são faladas */
  dizer: (partes: string[], depois?: () => void, graca?: number, ocultar?: string[]) => void;
  tocarNoOrbe: () => void;
  aoCompletarLegenda: () => void;
  calar: () => void;
};

export function useFalaRondin(sotaque: Sotaque): FalaRondin {
  const [fala, setFala] = useState('');
  const [chave, setChave] = useState(0);
  const [indiceVoz, setIndiceVoz] = useState(-1);
  const [duracaoMs, setDuracaoMs] = useState(0);
  const [completa, setCompleta] = useState(false);
  const [falando, setFalando] = useState(false);
  const ctrl = useRef<{ id: number; voz: boolean; leg: boolean; depois: (() => void) | null; graca: number }>({ id: 0, voz: false, leg: false, depois: null, graca: 3500 });
  const ultimas = useRef<Trecho[]>([]);
  const sotaqueRef = useRef(sotaque);
  sotaqueRef.current = sotaque;

  const checar = useCallback((id: number) => {
    const c = ctrl.current;
    if (c.id !== id || !c.voz || !c.leg) return;
    setFalando(false);
    const d = c.depois;
    c.depois = null;
    d?.();
  }, []);

  const dizer = useCallback((partes: string[], depois?: () => void, graca = 3500, ocultar: string[] = []) => {
    const id = ctrl.current.id + 1;
    ctrl.current = { id, voz: false, leg: false, depois: depois ?? null, graca };
    const trechos = partes.flatMap((p) => trechosParaVoz(p, ocultar));
    ultimas.current = trechos;
    setFala(partes.join(' ')); setChave(id); setIndiceVoz(-1); setDuracaoMs(0); setCompleta(false); setFalando(true);
    falar(
      trechos, sotaqueRef.current,
      () => { if (ctrl.current.id === id) { ctrl.current.voz = true; checar(id); } },
      (i) => { if (ctrl.current.id === id) setIndiceVoz(i); },
      (ms) => { if (ctrl.current.id === id) setDuracaoMs(ms); },
    );
  }, [checar]);

  /* a legenda terminou; a voz pode demorar mais, mas não se espera para sempre (a síntese pode travar) */
  const aoCompletarLegenda = useCallback(() => {
    const id = ctrl.current.id;
    ctrl.current.leg = true;
    checar(id);
    setTimeout(() => { if (ctrl.current.id === id) { ctrl.current.voz = true; checar(id); } }, ctrl.current.graca);
  }, [checar]);

  /* corta a voz e mostra a frase inteira de uma vez */
  const pular = useCallback(() => {
    parar();
    ctrl.current.voz = true;
    setCompleta(true);
  }, []);

  const tocarNoOrbe = useCallback(() => {
    if (ctrl.current.id > 0 && !ctrl.current.leg) { pular(); return; }
    if (ultimas.current.length) falar(ultimas.current, sotaqueRef.current, () => undefined);
  }, [pular]);

  /* no navegador o som pode ser recusado antes do primeiro toque na página: no primeiro toque, a fala atual volta, com voz */
  const bloqueado = useSomBloqueado();
  const estava = useRef(false);
  useEffect(() => {
    if (bloqueado) { estava.current = true; return; }
    if (!estava.current) return;
    estava.current = false;
    if (ultimas.current.length && ctrl.current.id > 0) falar(ultimas.current, sotaqueRef.current, () => undefined);
  }, [bloqueado]);

  /* sai da tela: a voz para e nenhuma frase pendente roda depois */
  const calar = useCallback(() => {
    ctrl.current = { ...ctrl.current, id: ctrl.current.id + 1, depois: null };
    parar();
    setFalando(false);
  }, []);

  useEffect(() => () => { ctrl.current.depois = null; ctrl.current.id += 1; parar(); }, []);

  return { fala, chave, indiceVoz, duracaoMs, completa, falando, dizer, tocarNoOrbe, aoCompletarLegenda, calar };
}
