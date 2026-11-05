/* Lê um treino de um arquivo de texto (CSV, TXT) ou JSON e devolve os exercícios para a pessoa revisar antes de salvar.
   Aceita linhas como:
     Supino reto; 4; 8-10; 70        (nome; séries; repetições; carga em kg)
     Supino reto 4x10 70kg           (texto livre)
     1. Crucifixo - 3 x 12 - 14 kg
   e um título opcional ("Treino: Peito e tríceps"). Linhas que não dão para entender são ignoradas. */
import type { Exercicio } from '../dados';

export type TreinoLido = { nome?: string; exercicios: Exercicio[] };

const limitar = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));
const numero = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const maiuscula = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* quanto a carga sobe a cada toque, conforme o peso inicial */
const passoDe = (kg: number): number => (kg >= 100 ? 5 : kg >= 40 ? 2.5 : kg >= 15 ? 2 : 1);

let contador = 0;
const idNovo = (): string => `x${Date.now().toString(36)}${(contador++).toString(36)}`;

function montar(nome: string, series: number, min: number, max: number, kg: number): Exercicio | null {
  const limpo = nome.replace(/\s+/g, ' ').replace(/^[\s\-–•*·.:;,|]+|[\s\-–•*·.:;,|]+$/g, '').trim();
  if (limpo.length < 2 || series < 1) return null;
  const a = limitar(Math.round(min), 1, 50);
  const b = limitar(Math.round(max || min), a, 80);
  const carga = limitar(Math.round(kg * 2) / 2, 0, 500);
  return { id: idNovo(), nome: maiuscula(limpo.slice(0, 60)), series: limitar(Math.round(series), 1, 10), faixa: [a, b], passo: passoDe(carga), inicial: carga };
}

/* "8-10", "8 a 10", "12" -> [mín, máx] */
function faixa(texto: string): [number, number] {
  const m = texto.match(/(\d{1,3})\s*(?:[-–a/]\s*(\d{1,3}))?/);
  if (!m) return [0, 0];
  const a = parseInt(m[1], 10);
  return [a, m[2] ? parseInt(m[2], 10) : a];
}

function lerJson(texto: string): TreinoLido | null {
  let dado: unknown;
  try { dado = JSON.parse(texto); } catch { return null; }
  const obj = (dado && typeof dado === 'object' && !Array.isArray(dado) ? dado : {}) as Record<string, unknown>;
  const lista = (Array.isArray(dado) ? dado : Array.isArray(obj.exercicios) ? obj.exercicios : []) as Record<string, unknown>[];
  const exercicios: Exercicio[] = [];
  for (const it of lista) {
    if (!it || typeof it !== 'object') continue;
    const reps = it.repeticoes ?? it.repetições ?? it.reps ?? it.faixa ?? 10;
    const [a, b] = faixa(String(Array.isArray(reps) ? reps.join('-') : reps));
    const ex = montar(String(it.nome ?? it.exercicio ?? it.exercício ?? ''), numero(it.series ?? it.séries ?? 3) || 3, a || 10, b, numero(it.carga ?? it.kg ?? it.peso));
    if (ex) exercicios.push(ex);
  }
  const nome = typeof obj.nome === 'string' ? obj.nome : typeof obj.treino === 'string' ? obj.treino : undefined;
  return { nome, exercicios };
}

export function lerTreino(texto: string): TreinoLido {
  const t = texto.replace(/^﻿/, '').trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    const j = lerJson(t);
    if (j) return j;
  }
  let nome: string | undefined;
  const exercicios: Exercicio[] = [];
  for (const bruta of t.split(/\r?\n/)) {
    const linha = bruta.replace(/^\s*(?:\d{1,2}\s*[.)]|[-–•*])\s+/, '').trim();
    if (!linha) continue;
    const titulo = linha.match(/^(?:treino|nome)\s*[:\-]\s*(.+)$/i);
    if (titulo) { nome = titulo[1].trim(); continue; }

    /* colunas: nome; séries; repetições; carga */
    const colunas = linha.includes(';') || linha.includes('\t') ? linha.split(/[;\t]/) : (linha.match(/,/g) ?? []).length >= 2 ? linha.split(',') : null;
    if (colunas && colunas.length >= 2) {
      const [n, s, r, c] = colunas.map((x) => x.trim());
      if (!/\d/.test(linha)) continue;   // cabeçalho (nome;séries;...)
      const [a, b] = faixa(r ?? '');
      const ex = montar(n, numero(s) || 3, a || 10, b, numero(c));
      if (ex && /\d/.test(s ?? '')) { exercicios.push(ex); continue; }
    }

    /* texto livre: "Supino reto 4x10 70kg" */
    const sr = linha.match(/(\d{1,2})\s*[x×*]\s*(\d{1,3})(?:\s*[-–a/]\s*(\d{1,3}))?/i);
    if (!sr) continue;
    const kg = linha.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|quilos?)/i);
    const nomeEx = linha.slice(0, sr.index).trim() || linha.replace(sr[0], '').replace(kg?.[0] ?? '', '');
    const ex = montar(nomeEx, parseInt(sr[1], 10), parseInt(sr[2], 10), sr[3] ? parseInt(sr[3], 10) : 0, kg ? numero(kg[1]) : 0);
    if (ex) exercicios.push(ex);
  }
  return { nome, exercicios };
}
