/* Dados de demonstração: 10 semanas de histórico para os gráficos e o "Você vs. Yesteryou" já terem o que mostrar.
   Gerados de forma determinística a partir da data de hoje. Em produção isto vem da API. */
import { ALIMENTOS, ROTINAS } from './dados';
import { diaDaSemana, iso, somarDias } from './lib/datas';
import type { Estado, ExercicioFeito, Refeicao, TipoRefeicao } from './tipos';

/* gerador pseudoaleatório simples (mulberry32), para o histórico ser sempre o mesmo */
function sorteio(semente: number) {
  let a = semente;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MODELO_REFEICOES: { refeicao: TipoRefeicao; itens: [string, number][] }[] = [
  { refeicao: 'cafe', itens: [['pao', 50], ['ovo', 100], ['banana', 100]] },
  { refeicao: 'almoco', itens: [['arroz', 150], ['feijao', 100], ['frango', 120], ['brocolis', 60]] },
  { refeicao: 'lanche', itens: [['iogurte', 170], ['aveia', 30]] },
  { refeicao: 'jantar', itens: [['batata-doce', 150], ['patinho', 110], ['alface', 40]] },
];

export function semear(estado: Estado, hoje: Date): void {
  if (estado.semeado) return;
  const rnd = sorteio(42);
  const DIAS = 70;
  let contagem = 0;

  for (let atras = DIAS; atras >= 1; atras--) {
    const dia = somarDias(hoje, -atras);
    const d = iso(dia);
    const dow = diaDaSemana(dia);
    const treina = dow === 0 || dow === 2 || dow === 4 || (dow === 5 && rnd() < 0.4);

    if (treina) {
      const rotina = ROTINAS[contagem++ % ROTINAS.length];
      const semanas = Math.floor((DIAS - atras) / 7);   // a carga sobe um pouco toda semana
      const exercicios: ExercicioFeito[] = rotina.exercicios.map((ex) => {
        const kg = Math.round((ex.inicial + semanas * ex.passo * 0.5) * 2) / 2;
        const series = Array.from({ length: ex.series }, (_, i) => ({
          kg,
          reps: Math.max(ex.faixa[0], ex.faixa[1] - (i === ex.series - 1 && rnd() < 0.5 ? 1 : 0) - (rnd() < 0.15 ? 1 : 0)),
        }));
        return { id: ex.id, nome: ex.nome, series };
      });
      const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 18, 30).getTime();
      estado.treinos.push({ data: d, rotina: rotina.id, nome: rotina.nome, inicio, fim: inicio + rotina.minutos * 60000, exercicios });
    }

    if (treina || rnd() < 0.5) estado.checkins[d] = true;

    if (atras <= 14) {
      const itens: Refeicao[] = [];
      for (const bloco of MODELO_REFEICOES) {
        if (rnd() < 0.12) continue;   // às vezes esquece de registrar
        for (const [id, g] of bloco.itens) {
          const a = ALIMENTOS.find((x) => x.id === id);
          if (!a) continue;
          const f = g / 100;
          itens.push({ id: `${d}-${id}`, refeicao: bloco.refeicao, alimento: a.nome, gramas: g, kcal: Math.round(a.kcal * f), p: +(a.p * f).toFixed(1), c: +(a.c * f).toFixed(1), g: +(a.g * f).toFixed(1) });
        }
      }
      estado.refeicoes[d] = itens;
      estado.agua[d] = 5 + Math.floor(rnd() * 4);
    }
  }

  /* peso: uma pesagem por semana, descendo devagar */
  for (let s = 10; s >= 0; s--) {
    estado.pesos.push({ data: iso(somarDias(hoje, -7 * s)), kg: +(79.4 - (10 - s) * 0.14 + (rnd() - 0.5) * 0.3).toFixed(1) });
  }
  estado.perfil.peso = estado.pesos[estado.pesos.length - 1].kg;
  estado.semeado = true;
}
