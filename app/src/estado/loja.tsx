/* Estado do app: um objeto só, guardado no aparelho (AsyncStorage) e compartilhado por contexto.
   Para mudar algo: commit((e) => { e.agua[hoje] = 5; }). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
  seguindo: {},
  seguidores: [],
  perfilSocial: { bio: '', titulos: ['iniciante'], destaques: [] },
  semeadoSocial: false,
  comentarios: {},
  grupos: [],
  clubes: {},
  recados: [],
  notificacoes: [],
  profissionais: {},
  stories: [],
  storiesVistos: {},
  xpExtra: 0,
  pro: false,
  tema: 'normal',
  nivelAvisado: null,
  medalhasAvisadas: null,
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

  /* gravar no aparelho é caro (o estado inteiro vira texto): junta as mudanças seguidas (digitar, tocar várias
     vezes) e grava uma vez só; ao sair do app, grava na hora o que estiver pendente */
  const gravar = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    AsyncStorage.setItem(CHAVE, JSON.stringify(recente.current)).catch(() => {});
  }, []);
  const salvar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(gravar, 600);
  }, [gravar]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s !== 'active' && timer.current) gravar(); });
    return () => sub.remove();
  }, [gravar]);

  const commit = useCallback((mudar: (e: Estado) => void) => {
    // cópia profunda: structuredClone é bem mais rápido que ida e volta por JSON; sem ele (aparelhos antigos), JSON
    const copia: Estado = typeof structuredClone === 'function' ? structuredClone(recente.current) : JSON.parse(JSON.stringify(recente.current));
    mudar(copia);
    recente.current = copia;
    setEstado(copia);
    salvar();
  }, [salvar]);

  const limpar = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    recente.current = estadoVazio();
    setEstado(recente.current);
    try { await AsyncStorage.removeItem(CHAVE); } catch { /* nada a limpar */ }
  }, []);

  // o mesmo objeto enquanto nada muda: as telas só redesenham quando o estado muda de fato
  const valor = useMemo(() => ({ estado, pronto, commit, limpar }), [estado, pronto, commit, limpar]);
  return <LojaContexto.Provider value={valor}>{children}</LojaContexto.Provider>;
}

export function useLoja(): Contexto {
  const c = useContext(LojaContexto);
  if (!c) throw new Error('useLoja precisa estar dentro de <LojaProvider>');
  return c;
}
