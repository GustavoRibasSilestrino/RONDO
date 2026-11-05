/* Uma lista paginada que vem do servidor: carrega a primeira página, pede mais quando precisar e recarrega
   sozinha quando algo social muda (versaoSocial) ou quando as dependências mudam. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pagina } from '../api/social';
import { useLoja } from './loja';

export type Lista<T> = {
  itens: T[];
  carregando: boolean;
  erro: string;
  temMais: boolean;
  maisItens: () => void;
  recarregar: () => void;
  mudar: (f: (itens: T[]) => T[]) => void;   // ajuste local (ex.: tirar um item apagado) sem esperar o servidor
};

export function useLista<T>(buscar: (cursor: number | null) => Promise<Pagina<T>>, deps: unknown[], ativa = true): Lista<T> {
  const { versaoSocial } = useLoja();
  const [itens, setItens] = useState<T[]>([]);
  const [proximo, setProximo] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const geracao = useRef(0);   // descarta respostas de uma busca que já foi trocada por outra
  const emCurso = useRef(false);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const carregar = useCallback(async (cursor: number | null) => {
    const minha = ++geracao.current;
    emCurso.current = true;
    setCarregando(true);
    try {
      const pag = await buscarRef.current(cursor);
      if (minha !== geracao.current) return;
      setItens((atual) => (cursor === null ? pag.itens : [...atual, ...pag.itens]));
      setProximo(pag.proximo);
      setErro('');
    } catch (e) {
      if (minha !== geracao.current) return;
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar agora.');
    } finally {
      if (minha === geracao.current) { setCarregando(false); emCurso.current = false; }
    }
  }, []);

  /* trocou o filtro ou a busca: esvazia na hora, para não mostrar por um instante o resultado do filtro anterior */
  useEffect(() => {
    setItens([]);
    setProximo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!ativa) return;
    void carregar(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa, versaoSocial, carregar, ...deps]);

  return {
    itens,
    carregando,
    erro,
    temMais: proximo !== null,
    maisItens: () => { if (proximo !== null && !emCurso.current) void carregar(proximo); },
    recarregar: () => { void carregar(null); },
    mudar: (f) => setItens(f),
  };
}
