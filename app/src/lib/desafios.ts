/* Contas dos desafios da Comunidade: o período escrito, quantos dias duram, em que dia estão e quanto falta para começar.
   As datas chegam do servidor como "AAAA-MM-DD"; o começo é a meia-noite do aparelho daquele dia. */
import type { Desafio } from '../api/social';
import { doIso, iso, somarDias } from './datas';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIA_MS = 86400000;

const curta = (s: string, comAno: boolean): string => {
  const d = doIso(s);
  return `${d.getDate()} de ${MES[d.getMonth()]}${comAno ? ` de ${d.getFullYear()}` : ''}`;
};

/* "24 de nov" (um dia só, com o ano se não for o deste ano) */
export const diaCurto = (s: string): string => curta(s, doIso(s).getFullYear() !== new Date().getFullYear());

/* "24 de nov – 24 de dez" (com o ano só quando não é o deste ano) */
export function periodo(inicio: string, fim: string): string {
  const ano = new Date().getFullYear();
  const comAno = doIso(inicio).getFullYear() !== ano || doIso(fim).getFullYear() !== ano;
  return `${curta(inicio, comAno)} – ${curta(fim, comAno)}`;
}

/* quantos dias o desafio dura, contando o primeiro e o último */
export const duracao = (inicio: string, fim: string): number => Math.round((doIso(fim).getTime() - doIso(inicio).getTime()) / DIA_MS) + 1;

/* em que dia do desafio estamos (1 = o primeiro), limitado à duração */
export function diaAtual(d: Pick<Desafio, 'inicio' | 'fim'>): number {
  const n = Math.round((doIso(iso()).getTime() - doIso(d.inicio).getTime()) / DIA_MS) + 1;
  return Math.max(1, Math.min(duracao(d.inicio, d.fim), n));
}

/* quanto falta (em ms) para a meia-noite do dia de começar */
export const faltaPara = (inicio: string): number => Math.max(0, doIso(inicio).getTime() - Date.now());

/* a frase da capa: "Começa amanhã", "Começa em 3 dias", "Último dia", "Faltam 5 dias", "Acabou" */
export function frase(d: Desafio): string {
  if (d.situacao === 'em_breve') {
    const dias = Math.round((doIso(d.inicio).getTime() - doIso(iso()).getTime()) / DIA_MS);
    return dias <= 1 ? 'Começa amanhã' : `Começa em ${dias} dias`;
  }
  if (d.situacao === 'encerrado') return 'Acabou';
  const restam = duracao(d.inicio, d.fim) - diaAtual(d);
  return restam <= 0 ? 'Último dia' : `Faltam ${restam} ${restam === 1 ? 'dia' : 'dias'}`;
}

export const pessoas = (n: number): string => `${n} ${n === 1 ? 'participante' : 'participantes'}`;

/* atalhos do dia de começar, no criar desafio */
export function atalhosInicio(): { nome: string; dia: string }[] {
  const hoje = new Date();
  const segunda = somarDias(hoje, ((8 - hoje.getDay()) % 7) || 7);
  const mesQueVem = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  return [
    { nome: 'Hoje', dia: iso(hoje) },
    { nome: 'Amanhã', dia: iso(somarDias(hoje, 1)) },
    { nome: 'Segunda', dia: iso(segunda) },
    { nome: 'Dia 1º', dia: iso(mesQueVem) },
  ];
}

export const DURACOES = [7, 14, 21, 30];
