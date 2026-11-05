/* Estado do app: um objeto só, guardado no aparelho (AsyncStorage) e compartilhado por contexto.
   Para mudar algo: commit((e) => { e.agua[hoje] = 5; }). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ErroHttp } from '../api/cliente';
import { esquecerToken, lerToken } from '../api/sessao';
import { CHAVES_SINCRONIZADAS, baixarDados, enviarDados } from '../api/sincronia';
import { perfilPadrao } from '../dados';
import type { Estado } from '../tipos';

const CHAVE = 'yy.app.v1';

export const estadoVazio = (): Estado => ({
  v: 1,
  usuario: null,
  perfil: perfilPadrao(),
  treinos: [],
  treinoAtual: null,
  rotinasProprias: [],
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
  ultimoEmail: '',
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
  /* traz do servidor os dados da conta logada (no login e ao abrir o app); o que só existe aqui sobe em seguida */
  puxarDoServidor: () => Promise<void>;
};

const LojaContexto = createContext<Contexto | null>(null);

export function LojaProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>(estadoVazio);
  const [pronto, setPronto] = useState(false);
  const recente = useRef<Estado>(estado);   // sempre o estado mais novo, mesmo com vários commits no mesmo quadro
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- sincronia com o servidor ----------
     `enviado` guarda, por chave, o texto do último valor que o servidor já tem. Só sobe o que mudou desde então;
     se a rede falhar, nada se perde: a diferença continua e sobe na próxima tentativa. */
  const enviado = useRef<Record<string, string>>({});
  const ocupado = useRef(false);
  const timerSync = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessaoVenceu = useCallback(async () => {
    await esquecerToken();
    recente.current = { ...recente.current, usuario: null };
    setEstado(recente.current);
  }, []);

  const sincronizar = useCallback(async () => {
    if (ocupado.current || !recente.current.usuario) return;
    const itens: Record<string, unknown> = {};
    const textos: Record<string, string> = {};
    for (const k of CHAVES_SINCRONIZADAS) {
      const texto = JSON.stringify(recente.current[k]);
      if (texto !== undefined && enviado.current[k] !== texto) { itens[k] = recente.current[k]; textos[k] = texto; }
    }
    if (Object.keys(itens).length === 0 || !(await lerToken())) return;
    ocupado.current = true;
    try {
      await enviarDados(itens);
      Object.assign(enviado.current, textos);
    } catch (e) {
      if (e instanceof ErroHttp && e.status === 401) await sessaoVenceu();
      /* sem rede ou servidor fora: tenta de novo na próxima mudança, ao voltar ao app ou no ciclo de 30 s */
    } finally {
      ocupado.current = false;
    }
  }, [sessaoVenceu]);

  const agendarSync = useCallback(() => {
    if (timerSync.current) clearTimeout(timerSync.current);
    timerSync.current = setTimeout(() => { timerSync.current = null; void sincronizar(); }, 2000);
  }, [sincronizar]);

  const salvar0 = useRef<() => void>(() => {});

  const puxarDoServidor = useCallback(async () => {
    if (!recente.current.usuario || !(await lerToken())) return;
    try {
      const itens = await baixarDados();
      const copia: Estado = { ...recente.current };
      for (const k of CHAVES_SINCRONIZADAS) {
        if (k in itens) { (copia as unknown as Record<string, unknown>)[k] = itens[k]; enviado.current[k] = JSON.stringify(itens[k]); }
      }
      recente.current = copia;
      setEstado(copia);
      salvar0.current();
      void sincronizar();   // o que só existe neste aparelho sobe agora
    } catch (e) {
      if (e instanceof ErroHttp && e.status === 401) await sessaoVenceu();
    }
  }, [sincronizar, sessaoVenceu]);

  useEffect(() => {
    (async () => {
      try {
        const bruto = await AsyncStorage.getItem(CHAVE);
        if (bruto) {
          const guardado = JSON.parse(bruto) as Partial<Estado>;
          /* dados de uma versão antiga, com contas e histórico de demonstração: descarta e começa limpo */
          const lido: Estado = (guardado.semeado || guardado.semeadoSocial) ? estadoVazio() : { ...estadoVazio(), ...guardado };
          recente.current = lido;
          setEstado(lido);
        }
      } catch {
        /* sem dados guardados (ou ilegíveis): começa do zero */
      }
      setPronto(true);
      if (recente.current.usuario) void puxarDoServidor();   // já estava logado: atualiza com o que o servidor tem
    })();
  }, [puxarDoServidor]);

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
  salvar0.current = salvar;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && timer.current) gravar();
      if (s === 'active') void sincronizar();   // voltou ao app: sobe o que ficou pendente
    });
    const ciclo = setInterval(() => { void sincronizar(); }, 30_000);   // rede que voltou, mudanças que falharam
    return () => { sub.remove(); clearInterval(ciclo); };
  }, [gravar, sincronizar]);

  const commit = useCallback((mudar: (e: Estado) => void) => {
    // cópia profunda: structuredClone é bem mais rápido que ida e volta por JSON; sem ele (aparelhos antigos), JSON
    const copia: Estado = typeof structuredClone === 'function' ? structuredClone(recente.current) : JSON.parse(JSON.stringify(recente.current));
    mudar(copia);
    recente.current = copia;
    setEstado(copia);
    salvar();
    agendarSync();
  }, [salvar, agendarSync]);

  const limpar = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    recente.current = estadoVazio();
    enviado.current = {};
    setEstado(recente.current);
    try { await AsyncStorage.removeItem(CHAVE); } catch { /* nada a limpar */ }
  }, []);

  // o mesmo objeto enquanto nada muda: as telas só redesenham quando o estado muda de fato
  const valor = useMemo(() => ({ estado, pronto, commit, limpar, puxarDoServidor }), [estado, pronto, commit, limpar, puxarDoServidor]);
  return <LojaContexto.Provider value={valor}>{children}</LojaContexto.Provider>;
}

export function useLoja(): Contexto {
  const c = useContext(LojaContexto);
  if (!c) throw new Error('useLoja precisa estar dentro de <LojaProvider>');
  return c;
}
