/* O que o mascote da conta fala quando aparece pela tela (componentes/MascoteFlutuante.tsx; desde 2026-11-19). Ele fala a
   verdade sobre os treinos da pessoa, do jeito que estão: se a semana está melhor ou pior que a anterior, se faz dias que ela
   não treina, se a sequência está para apagar. Também lembra de treinar e de beber água, e às vezes só motiva.
   Cada fala pode trazer um atalho (a função útil do mascote): beber um copo de água ali mesmo, ir treinar ou ver a missão mais
   perto de dar um brownie. Tudo é calculado no aparelho, com os dados da própria pessoa; nada sai daqui. */
import type { Estado } from '../tipos';
import { aguaDoDia, COPO_ML, litros, metaAgua } from './agua';
import { comparar, situacaoDaSequencia, statsSemana } from './calc';
import { doIso, iso } from './datas';
import { emAndamento, missoesDe, textoValor } from './missoes';

export type Tom = 'bom' | 'ruim' | 'lembrete' | 'motiva';
export type Atalho = 'agua' | 'treinar' | 'missoes';
export type Fala = { id: string; texto: string; tom: Tom; atalho?: Atalho; peso: number };

const MOTIVACAO = [
  'Ninguém se arrepende de um treino feito. Só dos que ficaram para amanhã.',
  'Você não precisa ser o melhor da academia. Só melhor do que ontem.',
  'Dia ruim também conta. Um treino curto vale mais que nenhum.',
  'Constância ganha de intensidade. Aparece hoje, mesmo que pouco.',
  'O seu eu de ontem está te olhando. Bora passar ele?',
  'Força não é só carga. É voltar todo dia.',
  'Cada série é um tijolo. Hoje é dia de obra.',
];

const LEMBRETES = [
  'Já separou a roupa do treino? Metade do caminho é sair de casa.',
  'Que tal um treino hoje? Até 20 minutos já mexem com o seu dia.',
  'Hoje ainda dá tempo de treinar. Eu fico aqui torcendo.',
];

const diasEntre = (a: string, b: string) => Math.round((doIso(b).getTime() - doIso(a).getTime()) / 86_400_000);

/* todas as falas que fazem sentido agora, cada uma com um peso (as mais urgentes pesam mais) */
export function falasPossiveis(e: Estado, agora: Date): Fala[] {
  const hoje = iso(agora);
  const hora = agora.getHours();
  const falas: Fala[] = [];
  const treinouHoje = e.treinos.some((t) => t.data === hoje);

  /* a sequência */
  const { dias, situacao } = situacaoDaSequencia(e, agora);
  if (situacao === 'emRisco' && dias > 0) {
    falas.push({ id: 'seq-risco', tom: 'lembrete', atalho: 'treinar', peso: hora >= 17 ? 10 : 6,
      texto: `A sua sequência de ${dias} ${dias === 1 ? 'dia' : 'dias'} ainda não ganhou o dia de hoje. Não deixa ela apagar!` });
  } else if (situacao === 'acesa' && dias >= 3) {
    falas.push({ id: 'seq-acesa', tom: 'bom', peso: 3, texto: `${dias} dias seguidos. Você está pegando fogo, de verdade.` });
  }

  /* quanto tempo sem treinar */
  const ultimo = [...e.treinos].sort((a, b) => b.inicio - a.inicio)[0];
  if (!ultimo) {
    falas.push({ id: 'primeiro', tom: 'lembrete', atalho: 'treinar', peso: 6, texto: 'Você ainda não registrou nenhum treino. Que tal o primeiro hoje? Eu comemoro com você.' });
  } else if (!treinouHoje) {
    const sem = diasEntre(ultimo.data, hoje);
    if (sem >= 4) falas.push({ id: 'sumido', tom: 'ruim', atalho: 'treinar', peso: 8, texto: `Faz ${sem} dias que você não treina. Sem bronca: só volta hoje, nem que seja leve.` });
    else if (sem >= 2) falas.push({ id: 'pausa', tom: 'lembrete', atalho: 'treinar', peso: 5, texto: `Já são ${sem} dias sem treino. O corpo agradece se você voltar hoje.` });
  } else {
    falas.push({ id: 'treinou', tom: 'bom', peso: 4, texto: 'Treino de hoje feito. Agora é comer bem e descansar, que o músculo cresce no descanso.' });
  }

  /* a semana contra a anterior */
  const cur = statsSemana(e, agora, 0);
  const prev = statsSemana(e, agora, 1);
  const c = comparar(cur, prev);
  if (prev.treinos > 0 || cur.treinos > 0) {
    if (cur.treinos > prev.treinos) falas.push({ id: 'semana-mais', tom: 'bom', peso: 4, texto: `Esta semana você já treinou ${cur.treinos} ${cur.treinos === 1 ? 'vez' : 'vezes'}, mais que na semana passada até aqui. Está melhor que o seu eu de ontem!` });
    else if (cur.treinos < prev.treinos) falas.push({ id: 'semana-menos', tom: 'ruim', atalho: 'treinar', peso: 5, texto: `A semana está mais fraca: ${cur.treinos} ${cur.treinos === 1 ? 'treino' : 'treinos'} contra ${prev.treinos} na passada até hoje. Ainda dá para virar.` });
    if (c.volume !== null && c.volume >= 10) falas.push({ id: 'volume-sobe', tom: 'bom', peso: 3, texto: `Você levantou ${Math.round(c.volume)}% mais peso no total do que na semana passada. Isso é evolução.` });
    else if (c.volume !== null && c.volume <= -25) falas.push({ id: 'volume-cai', tom: 'ruim', peso: 3, texto: `O peso total levantado caiu ${Math.abs(Math.round(c.volume))}% em relação à semana passada. Bora recuperar?` });
  }

  /* a água do dia */
  const ml = aguaDoDia(e, hoje);
  const meta = metaAgua(e.perfil);
  if (ml >= meta) falas.push({ id: 'agua-ok', tom: 'bom', peso: 2, texto: `Meta de água batida: ${litros(ml)}. Hidratado, rende mais.` });
  else if (hora >= 10) {
    const falta = meta - ml;
    falas.push({ id: 'agua', tom: 'lembrete', atalho: 'agua', peso: hora >= 15 && ml < meta / 2 ? 6 : 3,
      texto: ml === 0 ? `Você ainda não registrou água hoje. A sua meta é ${litros(meta)}.` : `Faltam ${litros(falta)} para a sua meta de água de hoje. Um copo agora?` });
  }

  /* a missão mais perto de dar um brownie */
  const perto = emAndamento(missoesDe(e, agora))[0];
  if (perto && perto.atual / perto.meta >= 0.5) {
    falas.push({ id: 'missao', tom: 'motiva', atalho: 'missoes', peso: 3,
      texto: `Falta pouco para outro brownie: ${perto.desc.replace(/\.$/, '').toLowerCase()} (${textoValor(perto, perto.atual)} de ${textoValor(perto, perto.meta)}).` });
  }

  /* um lembrete simples e uma frase de motivação, sempre disponíveis */
  if (!treinouHoje) falas.push({ id: `lembrete-${agora.getDate() % LEMBRETES.length}`, tom: 'lembrete', atalho: 'treinar', peso: 2, texto: LEMBRETES[agora.getDate() % LEMBRETES.length] });
  const i = Math.floor(Math.random() * MOTIVACAO.length);
  falas.push({ id: `motiva-${i}`, tom: 'motiva', peso: 2, texto: MOTIVACAO[i] });
  return falas;
}

/* sorteia uma fala pelo peso, sem repetir as últimas */
export function escolherFala(e: Estado, agora: Date, evitar: string[]): Fala {
  const todas = falasPossiveis(e, agora);
  const livres = todas.filter((f) => !evitar.includes(f.id));
  const lista = livres.length ? livres : todas;
  const total = lista.reduce((a, f) => a + f.peso, 0);
  let sorte = Math.random() * total;
  for (const f of lista) {
    sorte -= f.peso;
    if (sorte <= 0) return f;
  }
  return lista[lista.length - 1];
}

export const ROTULO_ATALHO: Record<Atalho, string> = { agua: `Beber ${COPO_ML} ml`, treinar: 'Ir treinar', missoes: 'Ver missões' };
