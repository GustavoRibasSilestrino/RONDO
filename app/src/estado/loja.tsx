/* Estado do app: um objeto só, guardado no aparelho (AsyncStorage) e compartilhado por contexto.
   Para mudar algo: commit((e) => { e.agua[hoje] = 5; }). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { chamar, ErroHttp, registrarSessaoVencida } from '../api/cliente';
import { esquecerToken, lerToken } from '../api/sessao';
import { resumoSocial } from '../api/social';
import { CHAVES_SINCRONIZADAS, baixarDados, enviarDados } from '../api/sincronia';
import { perfilPadrao } from '../dados';
import type { Estado, ResumoSocial } from '../tipos';

const CHAVE = 'yy.app.v1';

export const socialVazio = (): ResumoSocial => ({ id: 0, posts: 0, cheersDados: 0, seguindo: 0, seguidores: 0, comentarios: 0, clubesCriados: 0, naoLidas: 0 });

export const estadoVazio = (): Estado => ({
  v: 1,
  usuario: null,
  perfil: perfilPadrao(),
  perfilFit: null,
  treinos: [],
  treinoAtual: null,
  rotinasProprias: [],
  refeicoes: {},
  agua: {},
  checkins: {},
  pesos: [],
  social: socialVazio(),
  perfilSocial: { bio: '', titulos: ['iniciante'], destaques: [] },
  semeadoSocial: false,
  recados: [],
  notificacoes: [],
  profissionais: {},
  storiesVistos: {},
  ultimoEmail: '',
  xpExtra: 0,
  pro: false,
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
  /* a parte social mora no servidor: traz o resumo (nível, medalhas, avisos) e, com `listas`, manda as telas recarregarem */
  atualizarSocial: (listas?: boolean) => Promise<void>;
  versaoSocial: number;   // sobe quando algo social mudou: feeds, clubes e avisos recarregam
};

const LojaContexto = createContext<Contexto | null>(null);

export function LojaProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>(estadoVazio);
  const [pronto, setPronto] = useState(false);
  const [versaoSocial, setVersaoSocial] = useState(0);
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

  useEffect(() => { registrarSessaoVencida(() => { void sessaoVenceu(); }); return () => registrarSessaoVencida(null); }, [sessaoVenceu]);

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

  const emVoo = useRef(false);   // uma busca do resumo por vez: várias chamadas juntas viram uma só
  const atualizarSocial = useCallback(async (listas = false) => {
    if (listas) setVersaoSocial((v) => v + 1);
    if (emVoo.current || !recente.current.usuario || !(await lerToken())) return;
    emVoo.current = true;
    try {
      const r = await resumoSocial();
      const social = { id: r.id, posts: r.posts, cheersDados: r.cheers_dados, seguindo: r.seguindo, seguidores: r.seguidores, comentarios: r.comentarios, clubesCriados: r.clubes_criados, naoLidas: r.nao_lidas };
      const atual = recente.current.social;
      if (JSON.stringify(atual) === JSON.stringify(social)) return;
      recente.current = { ...recente.current, social };
      setEstado(recente.current);
      salvar0.current();
    } catch (e) {
      if (e instanceof ErroHttp && e.status === 401) await sessaoVenceu();
    } finally {
      emVoo.current = false;
    }
  }, [sessaoVenceu]);

  const puxarDoServidor = useCallback(async () => {
    if (!recente.current.usuario || !(await lerToken())) return;
    try {
      const itens = await baixarDados();
      const copia: Estado = { ...recente.current };
      /* a conta no servidor manda: se a foto, o nome ou o @ mudaram em outro aparelho, este passa a mostrar o mesmo */
      try {
        const eu = await chamar<{ nome: string; arroba: string | null; foto: string | null; verificado: boolean; pro: boolean; selo: string | null; papel: string }>('GET', '/auth/eu');
        if (copia.usuario) copia.usuario = { ...copia.usuario, nome: eu.nome, arroba: eu.arroba ?? undefined, foto: eu.foto ?? undefined, verificado: eu.verificado, pro: eu.pro, selo: eu.selo, papel: eu.papel };
      } catch (e) {
        if (e instanceof ErroHttp && e.status === 401) throw e;   // sessão vencida: o tratamento de baixo derruba a sessão
      }
      for (const k of CHAVES_SINCRONIZADAS) {
        if (k in itens) { (copia as unknown as Record<string, unknown>)[k] = itens[k]; enviado.current[k] = JSON.stringify(itens[k]); }
      }
      recente.current = copia;
      setEstado(copia);
      salvar0.current();
      void sincronizar();   // o que só existe neste aparelho sobe agora
      void atualizarSocial(true);
    } catch (e) {
      if (e instanceof ErroHttp && e.status === 401) await sessaoVenceu();
    }
  }, [sincronizar, sessaoVenceu, atualizarSocial]);

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
      if (s === 'active') { void sincronizar(); void atualizarSocial(); }   // voltou ao app: sobe o que ficou pendente
    });
    /* a cada ~1min30, com folga aleatória (milhares de aparelhos não batem no servidor juntos) e só com o app à vista:
       sobe o que falhou antes e atualiza os avisos */
    let ciclo: ReturnType<typeof setTimeout>;
    const agendar = () => {
      ciclo = setTimeout(() => {
        if (AppState.currentState === 'active') { void sincronizar(); void atualizarSocial(); }
        agendar();
      }, 90_000 + Math.random() * 30_000);
    };
    agendar();
    return () => { sub.remove(); clearTimeout(ciclo); };
  }, [gravar, sincronizar, atualizarSocial]);

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
  const valor = useMemo(() => ({ estado, pronto, commit, limpar, puxarDoServidor, atualizarSocial, versaoSocial }), [estado, pronto, commit, limpar, puxarDoServidor, atualizarSocial, versaoSocial]);
  return <LojaContexto.Provider value={valor}>{children}</LojaContexto.Provider>;
}

export function useLoja(): Contexto {
  const c = useContext(LojaContexto);
  if (!c) throw new Error('useLoja precisa estar dentro de <LojaProvider>');
  return c;
}
