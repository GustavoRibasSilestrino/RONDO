/* Os treinos SUGERIDOS para o corpo de cada pessoa (desde 2026-11-17, pedido do dono). São montados com as respostas do
   cadastro do RONDIN (perfilFit): a divisão vem dos dias por semana; as repetições, do objetivo; as séries, da experiência; e a
   carga inicial de cada exercício, do peso e da altura (IMC), do sexo e da experiência. Quem treina em casa ou na rua ganha
   exercícios sem aparelho. São só um ponto de partida: a tela de treino diz isso em destaque, e a pessoa pode editar, criar ou
   enviar os seus. Depois do primeiro treino, o app passa a usar a última carga de verdade (a carga daqui só vale até lá).
   Os exercícios que já existiam nos treinos fixos (dados.ts) mantêm o mesmo id, para o histórico continuar valendo. */
import type { Exercicio, Rotina } from '../dados';
import type { PerfilFit } from '../tipos';
import type { GrupoMuscular } from './musculos';
import { GRUPOS_SEM_APARELHO } from './semAparelho';

/* um exercício de academia: a carga é uma fração do peso do corpo (de um homem de nível intermediário) */
type Modelo = { id: string; nome: string; fracao: number; passo: number; membro: 'sup' | 'inf'; faixa?: [number, number] };

const ACADEMIA: Record<string, Modelo> = {
  supino: { id: 'supino', nome: 'Supino reto', fracao: 0.6, passo: 2.5, membro: 'sup' },
  inclinado: { id: 'inclinado', nome: 'Supino inclinado com halteres', fracao: 0.18, passo: 2, membro: 'sup' },
  crucifixo: { id: 'crucifixo', nome: 'Crucifixo', fracao: 0.12, passo: 1, membro: 'sup' },
  triceps: { id: 'triceps', nome: 'Tríceps corda', fracao: 0.3, passo: 2.5, membro: 'sup' },
  testa: { id: 'sug-testa', nome: 'Tríceps testa', fracao: 0.2, passo: 2, membro: 'sup' },
  puxada: { id: 'puxada', nome: 'Puxada na frente', fracao: 0.6, passo: 2.5, membro: 'sup' },
  remada: { id: 'remada', nome: 'Remada baixa', fracao: 0.55, passo: 2.5, membro: 'sup' },
  serrote: { id: 'sug-serrote', nome: 'Remada unilateral (serrote)', fracao: 0.22, passo: 2, membro: 'sup' },
  rosca: { id: 'rosca', nome: 'Rosca direta', fracao: 0.25, passo: 1, membro: 'sup' },
  martelo: { id: 'sug-martelo', nome: 'Rosca martelo', fracao: 0.12, passo: 1, membro: 'sup' },
  desenvolvimento: { id: 'sug-desenvolvimento', nome: 'Desenvolvimento com halteres', fracao: 0.15, passo: 2, membro: 'sup' },
  lateral: { id: 'sug-lateral', nome: 'Elevação lateral', fracao: 0.08, passo: 1, membro: 'sup' },
  agachamento: { id: 'agachamento', nome: 'Agachamento', fracao: 0.8, passo: 2.5, membro: 'inf' },
  legpress: { id: 'legpress', nome: 'Leg press', fracao: 1.6, passo: 5, membro: 'inf' },
  extensora: { id: 'extensora', nome: 'Cadeira extensora', fracao: 0.45, passo: 2.5, membro: 'inf' },
  flexora: { id: 'sug-flexora', nome: 'Mesa flexora', fracao: 0.35, passo: 2.5, membro: 'inf' },
  panturrilha: { id: 'sug-panturrilha', nome: 'Panturrilha na máquina', fracao: 0.6, passo: 5, membro: 'inf' },
};

/* cada treino: o título da pasta, o nome, os músculos da figura e os exercícios (academia e sem aparelho) */
type Molde = { id: string; capa: string; nome: string; musculos: GrupoMuscular[]; academia: string[]; casa: string[] };

const MOLDES: Record<string, Molde> = {
  peito: { id: 'sug-peito', capa: 'PEITO', nome: 'Treino de Peito', musculos: ['peito', 'triceps'], academia: ['supino', 'inclinado', 'crucifixo', 'triceps'], casa: ['Flexão de braço', 'Flexão diamante', 'Mergulho na cadeira (tríceps)', 'Prancha (segundos)'] },
  costas: { id: 'sug-costas', capa: 'COSTAS', nome: 'Treino de Costas', musculos: ['dorsal', 'trapezio', 'biceps'], academia: ['puxada', 'remada', 'serrote', 'rosca'], casa: ['Remada invertida na mesa', 'Remada com mochila', 'Superman no chão', 'Elevação de pernas'] },
  pernas: { id: 'sug-pernas', capa: 'PERNAS', nome: 'Treino de Pernas', musculos: ['quadriceps', 'panturrilha'], academia: ['agachamento', 'legpress', 'extensora', 'flexora', 'panturrilha'], casa: ['Agachamento livre', 'Afundo (cada perna)', 'Ponte de glúteo', 'Panturrilha em pé'] },
  ombros: { id: 'sug-ombros', capa: 'OMBROS', nome: 'Treino de Ombros', musculos: ['trapezio', 'triceps'], academia: ['desenvolvimento', 'lateral', 'testa'], casa: ['Flexão pike (ombros)', 'Mergulho na cadeira (tríceps)', 'Prancha lateral (segundos)'] },
  bracos: { id: 'sug-bracos', capa: 'BRAÇOS', nome: 'Treino de Braços', musculos: ['biceps', 'triceps'], academia: ['rosca', 'martelo', 'triceps', 'testa'], casa: ['Flexão diamante', 'Mergulho na cadeira (tríceps)', 'Remada com mochila'] },
  corpo: { id: 'sug-corpo', capa: 'CORPO TODO', nome: 'Treino de Corpo Todo', musculos: ['peito', 'dorsal', 'quadriceps', 'panturrilha'], academia: ['agachamento', 'supino', 'puxada', 'desenvolvimento'], casa: ['Agachamento livre', 'Flexão de braço', 'Remada invertida na mesa', 'Polichinelo'] },
};

/* a divisão da semana pelos dias que a pessoa disse que treina */
function divisao(dias: number): string[] {
  if (dias <= 2) return ['corpo', 'pernas'];
  if (dias === 3) return ['peito', 'costas', 'pernas'];
  if (dias === 4) return ['peito', 'costas', 'pernas', 'ombros'];
  return ['peito', 'costas', 'pernas', 'ombros', 'bracos'];
}

/* repetições pelo objetivo */
function faixaDoObjetivo(objetivo: string): [number, number] {
  if (objetivo === 'forca') return [5, 8];
  if (objetivo === 'massa') return [8, 12];
  if (objetivo === 'gordura' || objetivo === 'corrida') return [12, 15];
  return [10, 12];
}

/* séries pela experiência */
function seriesDaExperiencia(exp: string): number {
  if (exp === 'nunca') return 2;
  if (exp === 'avancado') return 4;
  return 3;
}

const NIVEL: Record<string, number> = { nunca: 0.45, iniciante: 0.6, intermediario: 0.85, avancado: 1.05 };

export const imcDe = (p: Pick<PerfilFit, 'peso' | 'altura'>): number => p.peso / Math.pow(Math.max(1, p.altura) / 100, 2);

/* a carga inicial: fração do peso do corpo, ajustada pela experiência, pelo sexo e pelo IMC (quem tem IMC alto pesa mais, mas a
   força não cresce na mesma proporção; quem tem IMC baixo começa um pouco mais leve). Arredondada ao passo do aparelho. */
function cargaInicial(m: Modelo, p: PerfilFit): number {
  const imc = imcDe(p);
  const fatorImc = imc >= 30 ? 0.78 : imc >= 27 ? 0.88 : imc < 19 ? 0.9 : 1;
  const fatorSexo = p.sexo === 'f' ? (m.membro === 'sup' ? 0.6 : 0.8) : p.sexo === 'nd' ? 0.8 : 1;
  const bruto = p.peso * m.fracao * (NIVEL[p.experiencia] ?? 0.6) * fatorSexo * fatorImc;
  return Math.max(m.passo, Math.round(bruto / m.passo) * m.passo);
}

const semAparelho = (nome: string): { series: number; faixa: [number, number] } => {
  for (const g of GRUPOS_SEM_APARELHO) {
    const x = g.itens.find((i) => i.nome === nome);
    if (x) return x;
  }
  return { series: 3, faixa: [10, 15] };
};

const idDoNome = (nome: string): string => 'sug-' + nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* os treinos sugeridos para este corpo; vazio se o cadastro ainda não tem peso e altura */
export function rotinasSugeridas(p: PerfilFit | null | undefined): Rotina[] {
  if (!p || !p.peso || !p.altura) return [];
  const emCasa = p.local === 'casa' || p.local === 'rua';
  const faixa = faixaDoObjetivo(p.objetivo);
  const series = seriesDaExperiencia(p.experiencia);
  return divisao(p.diasSemana || 3).map((chave) => {
    const molde = MOLDES[chave];
    const exercicios: Exercicio[] = emCasa
      ? molde.casa.map((nome) => {
        const b = semAparelho(nome);
        return { id: idDoNome(nome), nome, series: Math.min(b.series, series + 1), faixa: b.faixa, passo: 1, inicial: 0 };
      })
      : molde.academia.map((k) => {
        const m = ACADEMIA[k];
        return { id: m.id, nome: m.nome, series, faixa: m.faixa ?? faixa, passo: m.passo, inicial: cargaInicial(m, p) };
      });
    const minutos = Math.max(25, exercicios.reduce((t, x) => t + x.series, 0) * 4);
    return { id: molde.id, nome: molde.nome, capa: molde.capa, minutos, exercicios, musculos: molde.musculos, sugerida: true };
  });
}

const ALVO: Record<string, string> = { gordura: 'perder gordura', massa: 'ganhar massa', forma: 'entrar em forma', forca: 'ganhar força', saude: 'cuidar da saúde', corrida: 'correr melhor' };

/* a frase que explica de onde veio a sugestão, ex.: "Para 1,78 m e 78 kg, para ganhar massa, 3 dias por semana." */
export function explicacaoDaSugestao(p: PerfilFit): string {
  const altura = (p.altura / 100).toFixed(2).replace('.', ',');
  const alvo = ALVO[p.objetivo];
  return `Para ${altura} m e ${Math.round(p.peso)} kg${alvo ? `, para ${alvo}` : ''}, ${p.diasSemana || 3} ${(p.diasSemana || 3) === 1 ? 'dia' : 'dias'} por semana${p.local === 'casa' || p.local === 'rua' ? ', sem aparelho' : ''}.`;
}
