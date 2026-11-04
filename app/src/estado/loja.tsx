/* Estado do app: um objeto só, guardado no aparelho (AsyncStorage) e compartilhado por contexto.
   Para mudar algo: commit((e) => { e.agua[hoje] = 5; }). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { perfilPadrao } from '../dados';
import type { Estado } from '../tipos';

const CHAVE = 'yy.app.v1';

export const estadoVazio = (): Estado => ({
  v: 1,
  usuario: null,
  perfil: perfilPadrao(),
  treinos: [],
  treinoAtual: null,
  refeicoes: {},
  agua: {},
  checkins: {},
  pesos: [],
  posts: [],
  curtidas: {},
  comentarios: {},
  grupos: [],
  clubes: {},
  recados: [],
  semeado: false,
});

type Contexto = {
  estado: Estado;
  pronto: boolean;
  commit: (mudar: (e: Estado) => void) => void;
  limpar: () => Promise<void>;
};

const LojaContexto = createContext<Contexto | null>(null);

export function LojaProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>(estadoVazio);
  const [pronto, setPronto] = useState(false);
  const recente = useRef<Estado>(estado);   // sempre o estado mais novo, mesmo com vários commits no mesmo quadro
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const bruto = await AsyncStorage.getItem(CHAVE);
        if (bruto) {
          const lido: Estado = { ...estadoVazio(), ...JSON.parse(bruto) };
          recente.current = lido;
          setEstado(lido);
        }
      } catch {
        /* sem dados guardados (ou ilegíveis): começa do zero */
      }
      setPronto(true);
    })();
  }, []);

  const salvar = useCallback((e: Estado) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { AsyncStorage.setItem(CHAVE, JSON.stringify(e)).catch(() => {}); }, 250);
  }, []);

  const commit = useCallback((mudar: (e: Estado) => void) => {
    const copia: Estado = JSON.parse(JSON.stringify(recente.current));
    mudar(copia);
    recente.current = copia;
    setEstado(copia);
    salvar(copia);
  }, [salvar]);

  const limpar = useCallback(async () => {
    recente.current = estadoVazio();
    setEstado(recente.current);
    try { await AsyncStorage.removeItem(CHAVE); } catch { /* nada a limpar */ }
  }, []);

  return <LojaContexto.Provider value={{ estado, pronto, commit, limpar }}>{children}</LojaContexto.Provider>;
}

export function useLoja(): Contexto {
  const c = useContext(LojaContexto);
  if (!c) throw new Error('useLoja precisa estar dentro de <LojaProvider>');
  return c;
}
