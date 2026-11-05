/* A posição da rolagem da tela de baixo, para o cabeçalho do alto reagir (o nome some quando a tela rola).
   A tela avisa a cada rolagem; o cabeçalho só atualiza quando passa do limite, para não redesenhar à toa. */
import { useEffect, useState } from 'react';

const LIMITE = 28;   // a partir daqui, a tela é considerada "rolada"
let rolada = false;
const ouvintes = new Set<(r: boolean) => void>();

export function definirRolagem(y: number): void {
  const agora = y > LIMITE;
  if (agora === rolada) return;
  rolada = agora;
  ouvintes.forEach((f) => f(agora));
}

/* true quando a tela atual já rolou um pouco */
export function useRolada(): boolean {
  const [r, setR] = useState(rolada);
  useEffect(() => {
    ouvintes.add(setR);
    setR(rolada);
    return () => { ouvintes.delete(setR); };
  }, []);
  return r;
}
