/* O tema escolhido (escuro ou claro), desde 2026-11-26 (pedido do dono). O ícone de sol/lua (componentes/BotaoTema.tsx) troca;
   a escolha fica guardada no aparelho (no navegador, no localStorage) e vale da próxima vez que o app abrir.
   Trocar reescreve as cores (tema.ts, aplicarTema) e o App redesenha as telas com a chave do tema (App.tsx). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { aplicarTema, nomeDoTema, type NomeTema } from '../tema';

const CHAVE = 'rondo:tema';

type ValorTema = { tema: NomeTema; alternar: () => void };
const TemaContexto = createContext<ValorTema>({ tema: 'escuro', alternar: () => {} });
export const useTema = () => useContext(TemaContexto);

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<NomeTema>(nomeDoTema());
  const [pronto, setPronto] = useState(false);

  /* ao abrir: o tema guardado, antes da primeira tela (para não piscar o escuro antes do claro) */
  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(CHAVE)
      .then((v) => {
        if (!vivo) return;
        if (v === 'claro' || v === 'escuro') { aplicarTema(v); setTema(v); }
      })
      .catch(() => {})
      .finally(() => { if (vivo) setPronto(true); });
    return () => { vivo = false; };
  }, []);

  const alternar = useCallback(() => {
    const novo: NomeTema = nomeDoTema() === 'escuro' ? 'claro' : 'escuro';
    aplicarTema(novo);
    setTema(novo);
    AsyncStorage.setItem(CHAVE, novo).catch(() => {});
  }, []);

  if (!pronto) return null;
  return <TemaContexto.Provider value={{ tema, alternar }}>{children}</TemaContexto.Provider>;
}
