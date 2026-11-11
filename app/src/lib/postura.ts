/* A análise da execução: recebe, a cada quadro da câmera, os 33 pontos do corpo que o detector de pose encontrou (MediaPipe
   Pose Landmarker, em componentes/AnaliseExecucao.web.tsx) e devolve o que está certo e o que corrigir, já com o ponto do corpo
   e o sentido da correção ("cotovelo mais para trás"). É só conta, sem desenho nem câmera: dá para testar com pontos inventados.

   Como funciona, para cada exercício:
   - um ângulo principal (o do joelho no agachamento, o do cotovelo nos outros) conta as repetições: desce, sobe, conta uma;
   - checagens que valem o tempo todo (costas, alinhamento do corpo, cotovelo junto ao tronco) aparecem na hora, sobre o ponto;
   - checagens de amplitude (desceu o bastante, estendeu no alto) só dá para julgar no fim da repetição: viram o veredito dela.
   As correções ao vivo só aparecem depois de se repetirem por alguns quadros seguidos, para não piscarem a cada tremida. */

export type Ponto = { x: number; y: number; v: number };   // x e y de 0 a 1 no quadro; v = o quanto o ponto está visível (0 a 1)
export type Exercicio = 'agachamento' | 'flexao' | 'rosca' | 'desenvolvimento' | 'prancha';
export type Correcao = { chave: string; ponto: number; texto: string; alvo?: { x: number; y: number } };
export type Leitura = {
  aviso: string | null;          // enquadramento: o que falta para a análise funcionar
  correcoes: Correcao[];         // o que corrigir agora
  reps: number;                  // repetições contadas
  certas: number;                // quantas delas sem nada a corrigir
  ultima: { certa: boolean; correcoes: Correcao[] } | null;   // o veredito da última repetição
  segundosCertos: number;        // prancha: tempo na posição certa
};

export const EXERCICIOS: { id: Exercicio; nome: string; dica: string }[] = [
  { id: 'agachamento', nome: 'Agachamento', dica: 'Câmera de lado, na altura do quadril, com o corpo inteiro no quadro.' },
  { id: 'flexao', nome: 'Flexão', dica: 'Câmera de lado, perto do chão, com o corpo inteiro no quadro.' },
  { id: 'rosca', nome: 'Rosca direta', dica: 'Câmera de lado, na altura do peito, do quadril para cima no quadro.' },
  { id: 'desenvolvimento', nome: 'Desenvolvimento', dica: 'Câmera de frente, com os braços esticados para cima ainda no quadro.' },
  { id: 'prancha', nome: 'Prancha', dica: 'Câmera de lado, perto do chão, com o corpo inteiro no quadro.' },
];

/* O que a pessoa digitou ("rosca bíceps", "agachamento livre", "push up"...) vira um dos exercícios que a análise conhece.
   Sem acento e sem maiúsculas; vale português e inglês. Devolve null quando não reconhece. */
const PALAVRAS: [Exercicio, RegExp][] = [
  ['rosca', /rosca|bicep|curl|martelo|scott/],
  ['agachamento', /agach|squat|goblet|sumo|sentad/],
  ['flexao', /flex|push ?up|apoio|pushup/],
  ['desenvolvimento', /desenvolv|press|ombro|militar|arnold|shoulder/],
  ['prancha', /prancha|plank|isometri/],
];
export function exercicioDoTexto(texto: string): Exercicio | null {
  const t = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (!t) return null;
  for (const [id, padrao] of PALAVRAS) if (padrao.test(t)) return id;
  return null;
}

/* os pontos do corpo (numeração do MediaPipe) */
export const P = {
  nariz: 0, ombroE: 11, ombroD: 12, cotoveloE: 13, cotoveloD: 14, punhoE: 15, punhoD: 16,
  quadrilE: 23, quadrilD: 24, joelhoE: 25, joelhoD: 26, tornozeloE: 27, tornozeloD: 28, peE: 31, peD: 32,
} as const;
/* as ligações do esqueleto desenhado por cima da pessoa */
export const LIGACOES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32],
];

const VISIVEL = 0.5;
const QUADROS_PARA_MOSTRAR = 5;   // uma correção ao vivo só aparece depois de 5 quadros seguidos
const QUADROS_PARA_SUMIR = 8;     // e só some depois de 8 quadros sem ela

type Lado = { ombro: number; cotovelo: number; punho: number; quadril: number; joelho: number; tornozelo: number };
const ESQ: Lado = { ombro: P.ombroE, cotovelo: P.cotoveloE, punho: P.punhoE, quadril: P.quadrilE, joelho: P.joelhoE, tornozelo: P.tornozeloE };
const DIR: Lado = { ombro: P.ombroD, cotovelo: P.cotoveloD, punho: P.punhoD, quadril: P.quadrilD, joelho: P.joelhoD, tornozelo: P.tornozeloD };

/* ---------- geometria (x vezes a proporção do quadro, para os ângulos saírem certos num vídeo deitado) ---------- */
type V = { x: number; y: number };
const ponto = (p: Ponto, aspecto: number): V => ({ x: p.x * aspecto, y: p.y });
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
/* o ângulo em b, entre a e c, em graus (180 = reto) */
export function angulo(a: V, b: V, c: V): number {
  const ab = { x: a.x - b.x, y: a.y - b.y }, cb = { x: c.x - b.x, y: c.y - b.y };
  const cos = (ab.x * cb.x + ab.y * cb.y) / (Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
/* o quanto o segmento (de baixo para cima) se inclina em relação à vertical, em graus */
const inclinacao = (baixo: V, cima: V) => (Math.atan2(Math.abs(cima.x - baixo.x), Math.abs(baixo.y - cima.y)) * 180) / Math.PI;
/* distância (com sinal) de p até a reta a-b, em fração do comprimento de a-b: positiva = abaixo da reta (y maior) */
function desvio(p: V, a: V, b: V): number {
  const L = dist(a, b) || 1;
  const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (L * L);
  const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return (Math.sign(p.y - proj.y) || 1) * dist(p, proj) / L;
}
/* o ponto da reta a-b mais perto de p (para onde a seta aponta) */
function projecao(p: V, a: V, b: V): V {
  const L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
  const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / L2;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

export class Analisador {
  private exercicio: Exercicio;
  private reps = 0;
  private certas = 0;
  private ultima: Leitura['ultima'] = null;
  private emRep = false;                // no meio de uma repetição (já desceu, ainda não voltou)
  private minAng = 999;                 // o menor ângulo principal da repetição
  private maxAntes = 0;                 // o maior ângulo antes de a repetição começar (a extensão)
  private faltas = new Map<string, Correcao>();   // o que deu errado em algum momento desta repetição
  private troncoMin = 999; private troncoMax = 0;
  private contagem = new Map<string, number>();   // há quantos quadros cada correção ao vivo aparece (ou some, se negativo)
  private visiveis = new Map<string, Correcao>();
  private certoDesde: number | null = null;
  private segundos = 0;
  private ultimoT = 0;
  private lado: Lado = ESQ;               // o lado do corpo que a câmera vê melhor

  constructor(exercicio: Exercicio) { this.exercicio = exercicio; }

  /* `aspecto` = largura / altura do vídeo; `t` em milissegundos */
  quadro(pts: Ponto[] | null, aspecto: number, t: number): Leitura {
    const base = { reps: this.reps, certas: this.certas, ultima: this.ultima, segundosCertos: Math.floor(this.segundos) };
    if (!pts || pts.length < 33) { this.limparAoVivo(); return { ...base, aviso: 'Procurando uma pessoa no quadro...', correcoes: [] }; }
    const vis = (i: number) => pts[i].v >= VISIVEL;
    /* o lado mais visível (de lado para a câmera, um lado aparece melhor que o outro) */
    const nota = (l: Lado) => [l.ombro, l.cotovelo, l.punho, l.quadril, l.joelho, l.tornozelo].reduce((s, i) => s + pts[i].v, 0);
    const lado = nota(ESQ) >= nota(DIR) ? ESQ : DIR;
    this.lado = lado;
    const q = (i: number) => ponto(pts[i], aspecto);
    const precisa = (lista: number[], aviso: string): string | null => (lista.every(vis) ? null : aviso);

    const ao: Correcao[] = [];   // correções deste quadro
    let principal = 0;
    let limites = { desce: 0, sobe: 0, baixo: true };   // baixo: a repetição é o ângulo diminuindo e voltando
    let aviso: string | null = null;

    if (this.exercicio === 'agachamento') {
      aviso = precisa([lado.ombro, lado.quadril, lado.joelho, lado.tornozelo], 'Enquadre o corpo inteiro, dos ombros aos pés.');
      if (!aviso) {
        principal = angulo(q(lado.quadril), q(lado.joelho), q(lado.tornozelo));
        limites = { desce: 145, sobe: 162, baixo: true };
        const tronco = inclinacao(q(lado.quadril), q(lado.ombro));
        if (tronco > 50) ao.push({ chave: 'tronco', ponto: lado.ombro, texto: 'Peito mais para cima, costas retas', alvo: { x: pts[lado.quadril].x + (pts[lado.ombro].x - pts[lado.quadril].x) * 0.45, y: pts[lado.ombro].y - 0.05 } });
        /* de frente: os joelhos não podem fechar para dentro (mais juntos que os tornozelos) */
        if ([P.joelhoE, P.joelhoD, P.tornozeloE, P.tornozeloD, P.ombroE, P.ombroD].every(vis)) {
          const ombros = Math.abs(q(P.ombroE).x - q(P.ombroD).x), torso = dist(q(lado.ombro), q(lado.quadril));
          const deFrente = ombros > torso * 0.45;
          const joelhos = Math.abs(q(P.joelhoE).x - q(P.joelhoD).x), tornozelos = Math.abs(q(P.tornozeloE).x - q(P.tornozeloD).x);
          if (deFrente && principal < 150 && joelhos < tornozelos * 0.8) {
            ao.push({ chave: 'joelhoE', ponto: P.joelhoE, texto: 'Joelho para fora, na linha do pé', alvo: { x: pts[P.tornozeloE].x, y: pts[P.joelhoE].y } });
            ao.push({ chave: 'joelhoD', ponto: P.joelhoD, texto: 'Joelho para fora, na linha do pé', alvo: { x: pts[P.tornozeloD].x, y: pts[P.joelhoD].y } });
          }
        }
      }
    } else if (this.exercicio === 'flexao' || this.exercicio === 'prancha') {
      aviso = precisa([lado.ombro, lado.quadril, lado.tornozelo], 'Enquadre o corpo inteiro, de lado para a câmera.');
      if (!aviso) {
        const deitado = Math.abs(q(lado.ombro).y - q(lado.tornozelo).y) < Math.abs(q(lado.ombro).x - q(lado.tornozelo).x) * 0.7;
        if (!deitado) aviso = this.exercicio === 'prancha' ? 'Fique na posição de prancha, de lado para a câmera.' : 'Fique na posição de flexão, de lado para a câmera.';
        else {
          const d = desvio(q(lado.quadril), q(lado.ombro), q(lado.tornozelo));
          const alvo = projecao(q(lado.quadril), q(lado.ombro), q(lado.tornozelo));
          const alvoN = { x: alvo.x / aspecto, y: alvo.y };
          if (d > 0.07) ao.push({ chave: 'quadrilBaixo', ponto: lado.quadril, texto: 'Quadril mais para cima, corpo reto', alvo: alvoN });
          else if (d < -0.09) ao.push({ chave: 'quadrilAlto', ponto: lado.quadril, texto: 'Quadril mais para baixo, corpo reto', alvo: alvoN });
          if (this.exercicio === 'flexao') {
            if (!vis(lado.cotovelo) || !vis(lado.punho)) aviso = 'Deixe os braços à vista da câmera.';
            else { principal = angulo(q(lado.ombro), q(lado.cotovelo), q(lado.punho)); limites = { desce: 125, sobe: 152, baixo: true }; }
          }
        }
      }
    } else if (this.exercicio === 'rosca') {
      aviso = precisa([lado.ombro, lado.cotovelo, lado.punho, lado.quadril], 'Enquadre do quadril para cima, com o braço à vista.');
      if (!aviso) {
        principal = angulo(q(lado.ombro), q(lado.cotovelo), q(lado.punho));
        limites = { desce: 120, sobe: 145, baixo: true };
        const o = q(lado.ombro), h = q(lado.quadril), c = q(lado.cotovelo);
        const torso = dist(o, h) || 1;
        /* para onde a pessoa olha: o nariz fica à frente do ombro */
        const frente = vis(P.nariz) ? Math.sign(q(P.nariz).x - o.x) || 1 : 1;
        const naLinha = projecao(c, o, h);
        const fora = ((c.x - naLinha.x) * frente) / torso;   // > 0: cotovelo à frente do tronco
        const alvo = { x: naLinha.x / aspecto, y: pts[lado.cotovelo].y };
        if (fora > 0.24) ao.push({ chave: 'cotoveloFrente', ponto: lado.cotovelo, texto: 'Cotovelo mais para trás, junto ao corpo', alvo });
        else if (fora < -0.2) ao.push({ chave: 'cotoveloTras', ponto: lado.cotovelo, texto: 'Cotovelo mais para frente, junto ao corpo', alvo });
        const tronco = inclinacao(h, o);
        if (this.emRep) { this.troncoMin = Math.min(this.troncoMin, tronco); this.troncoMax = Math.max(this.troncoMax, tronco); }
      }
    } else if (this.exercicio === 'desenvolvimento') {
      aviso = precisa([P.ombroE, P.ombroD, P.cotoveloE, P.cotoveloD, P.punhoE, P.punhoD], 'Enquadre os dois braços, de frente para a câmera.');
      if (!aviso) {
        const ombros = Math.abs(q(P.ombroE).x - q(P.ombroD).x);
        const torso = vis(P.quadrilE) ? dist(q(P.ombroE), q(P.quadrilE)) : ombros * 1.6;
        if (ombros < torso * 0.4) aviso = 'Fique de frente para a câmera.';
        else {
          const aE = angulo(q(P.ombroE), q(P.cotoveloE), q(P.punhoE)), aD = angulo(q(P.ombroD), q(P.cotoveloD), q(P.punhoD));
          principal = (aE + aD) / 2;
          limites = { desce: 120, sobe: 150, baixo: false };   // aqui a repetição é estender (o ângulo sobe) e voltar
          for (const [cot, pun, chave] of [[P.cotoveloE, P.punhoE, 'cotE'], [P.cotoveloD, P.punhoD, 'cotD']] as const) {
            const ante = dist(q(cot), q(pun)) || 1;
            if (q(pun).y < q(cot).y && Math.abs(q(pun).x - q(cot).x) > ante * 0.45) {
              ao.push({ chave, ponto: cot, texto: 'Cotovelo embaixo do punho', alvo: { x: pts[pun].x, y: pts[cot].y } });
            }
          }
        }
      }
    }

    if (aviso) { this.limparAoVivo(); this.certoDesde = null; return { ...base, aviso, correcoes: [] }; }

    /* repetições */
    if (this.exercicio !== 'prancha') this.contar(principal, limites, ao);
    /* prancha: o tempo na posição certa */
    if (this.exercicio === 'prancha') {
      if (ao.length === 0) {
        if (this.certoDesde === null) this.certoDesde = t;
        this.segundos += this.ultimoT ? Math.min(0.25, (t - this.ultimoT) / 1000) : 0;
      } else this.certoDesde = null;
    }
    this.ultimoT = t;

    const correcoes = this.estabilizar(ao);
    return { reps: this.reps, certas: this.certas, ultima: this.ultima, segundosCertos: Math.floor(this.segundos), aviso: null, correcoes };
  }

  /* uma repetição: sai da posição de partida (passa de `desce`), vai ao extremo e volta (passa de `sobe`) */
  private contar(ang: number, lim: { desce: number; sobe: number; baixo: boolean }, ao: Correcao[]) {
    const partida = lim.baixo ? ang > lim.sobe : ang < lim.desce;
    const saiu = lim.baixo ? ang < lim.desce : ang > lim.sobe;
    if (!this.emRep) {
      this.maxAntes = lim.baixo ? Math.max(this.maxAntes, ang) : Math.min(this.maxAntes || 999, ang);
      if (saiu) { this.emRep = true; this.minAng = ang; this.faltas.clear(); this.troncoMin = 999; this.troncoMax = 0; }
      return;
    }
    this.minAng = lim.baixo ? Math.min(this.minAng, ang) : Math.max(this.minAng, ang);
    for (const c of ao) this.faltas.set(c.chave, c);
    if (!partida) return;
    /* voltou: fecha a repetição e julga a amplitude */
    this.emRep = false;
    const faltas = [...this.faltas.values()];
    const e = this.exercicio;
    if (e === 'agachamento' && this.minAng > 108) faltas.push({ chave: 'profundidade', ponto: this.lado.quadril, texto: 'Desça mais: quadril na altura do joelho' });
    if (e === 'flexao' && this.minAng > 105) faltas.push({ chave: 'profundidade', ponto: this.lado.ombro, texto: 'Desça mais: peito perto do chão' });
    if (e === 'flexao' && this.maxAntes < 150) faltas.push({ chave: 'extensao', ponto: this.lado.cotovelo, texto: 'Estenda os braços no alto' });
    if (e === 'rosca' && this.minAng > 65) faltas.push({ chave: 'topo', ponto: this.lado.punho, texto: 'Suba até o fim: mão perto do ombro' });
    if (e === 'rosca' && this.maxAntes < 150) faltas.push({ chave: 'descida', ponto: this.lado.cotovelo, texto: 'Estenda todo o braço na descida' });
    if (e === 'rosca' && this.troncoMax - this.troncoMin > 12) faltas.push({ chave: 'balanco', ponto: this.lado.quadril, texto: 'Sem balançar o tronco' });
    if (e === 'desenvolvimento' && this.minAng < 160) faltas.push({ chave: 'topo', ponto: P.punhoE, texto: 'Estenda os braços no alto' });
    if (e === 'desenvolvimento' && this.maxAntes > 100) faltas.push({ chave: 'descida', ponto: P.punhoE, texto: 'Desça até a altura dos ombros' });
    this.reps += 1;
    if (faltas.length === 0) this.certas += 1;
    this.ultima = { certa: faltas.length === 0, correcoes: faltas };
    this.maxAntes = ang;
  }

  /* só mostra uma correção ao vivo depois de alguns quadros seguidos, e só a tira depois de alguns quadros sem ela */
  private estabilizar(ao: Correcao[]): Correcao[] {
    const agora = new Set(ao.map((c) => c.chave));
    for (const c of ao) {
      const n = Math.max(0, this.contagem.get(c.chave) ?? 0) + 1;
      this.contagem.set(c.chave, n);
      if (n >= QUADROS_PARA_MOSTRAR || this.visiveis.has(c.chave)) this.visiveis.set(c.chave, c);
    }
    for (const chave of [...this.contagem.keys()]) {
      if (agora.has(chave)) continue;
      const n = Math.min(0, this.contagem.get(chave) ?? 0) - 1;
      this.contagem.set(chave, n);
      if (n <= -QUADROS_PARA_SUMIR) { this.visiveis.delete(chave); this.contagem.delete(chave); }
    }
    return [...this.visiveis.values()];
  }

  private limparAoVivo() { this.contagem.clear(); this.visiveis.clear(); }
}
