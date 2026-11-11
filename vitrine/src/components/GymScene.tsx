import { useEffect, useRef } from "react";
import { onFrame } from "../lib/frame";
import { APP_CRIAR } from "../lib/rotas";
import { clamp, reduceMotion, vars } from "../lib/util";
import { FOLHAS, QUADROS } from "./gymQuadros";

/* Aparelhos de academia passando pela tela, enquanto a cor da tela muda de um para o outro.
   Os aparelhos são modelos 3D, mas o 3D não é calculado aqui: cada um foi renderizado antes (scripts/aparelhos3d), em vários
   ângulos, e a cena só troca de quadro conforme a rolagem. Rolar a página empurra o próximo aparelho da direita para a esquerda,
   girando, e atrás dele vem o "ontem" do aparelho, só o contorno.

   Para não travar: não há WebGL; o que anda é só transform e opacity (a GPU move camadas prontas); trocar de ângulo é copiar um
   pedaço de uma imagem já aberta para um canvas pequeno, e só quando o quadro muda; a cor do painel é uma pilha de camadas que
   se dissolvem uma na outra, nunca um background-color animado; os valores só são escritos quando mudam; e o laço do quadro
   dorme assim que a rolagem para.

   As folhas com os ângulos (AVIF) só são baixadas quando a seção está chegando, uma de cada vez e com prioridade baixa. Até
   chegarem, e em navegador sem AVIF ou com economia de dados ligada, aparece o quadro de descanso (uma imagem parada do mesmo
   modelo). Com movimento reduzido, a seção vira uma grade parada com os quatro aparelhos (ver styles/gym.css). */

const ARQUIVOS = import.meta.glob("../assets/gym/*.{avif,webp}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const arquivo = (nome: string) => ARQUIVOS[`../assets/gym/${nome}`];

type Cena = { nome: string; linha: string; cor: string; luz: string };

/* a ordem e as cores são as mesmas de scripts/aparelhos3d/render.mjs: a luz de cada cena já vem pintada no metal */
const CENAS: Cena[] = [
  { nome: "Halter", linha: "Abre com a carga de ontem e sugere a de hoje.", cor: "#3b0f8c", luz: "#c4a8ff" },
  { nome: "Kettlebell", linha: "Cada série registrada, cada recorde guardado.", cor: "#1b2a9e", luz: "#9db4ff" },
  { nome: "Barra", linha: "Volume da semana comparado com a anterior.", cor: "#7a1180", luz: "#f2a8ff" },
  { nome: "Banco", linha: "Descanso cronometrado entre uma série e outra.", cor: "#0b4a63", luz: "#8fe0ff" },
];
const N = CENAS.length;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/* o fundo da página é a cor de cada cena bem escurecida */
const escuro = (c: string, t: number) => "#" + hex(c).map((v) => Math.round(v * (1 - t)).toString(16).padStart(2, "0")).join("");
const ESCURAS = CENAS.map((c) => escuro(c.cor, 0.62));
/* o painel: a cor da cena com um clarão da luz dela atrás do aparelho */
const painel = (c: Cena) => `radial-gradient(60% 52% at 50% 50%, ${c.luz}38, transparent 72%), ${c.cor}`;
const smooth = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

const GIRO_PLANO = 9;    // graus que o quadro ainda vira como um cartão nas pontas do caminho (o giro de verdade vem dos quadros)
const ATRASO = 0.045;    // o quanto o "ontem" fica para trás do aparelho parado, em largura da tela
const PLATO = 0.12;      // o aparelho fica parado no centro enquanto |d| < PLATO
const FOLGA = 0.84;      // quanto ele anda para fora, em (largura da tela + a largura dele)
const ARRANQUE = 1.35;   // a saída do centro: 1 seria linha reta (tranco ao sair do repouso); acima de 1 ele ganha velocidade aos poucos
const INERCIA = 0.87;    // quanto da distância até o alvo sobra a cada quadro de 60 Hz: mais perto de 1, mais macio
const PERIODO = 120;     // distância entre os traços grandes da régua, em px

export function GymScene() {
  const secao = useRef<HTMLElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const cores = useRef<(HTMLElement | null)[]>([]);
  const fundos = useRef<(HTMLElement | null)[]>([]);
  const palavras = useRef<(HTMLSpanElement | null)[]>([]);
  const hojes = useRef<(HTMLDivElement | null)[]>([]);
  const ecos = useRef<(HTMLImageElement | null)[]>([]);
  const fotos = useRef<(HTMLImageElement | null)[]>([]);
  const telas = useRef<(HTMLCanvasElement | null)[]>([]);
  const regua = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = secao.current, stage = palco.current;
    if (!sec || !stage || reduceMotion) return;   // movimento reduzido: o CSS mostra a grade parada

    /* só escreve no DOM quando o valor muda */
    const ultimo = new Map<Element, Record<string, string>>();
    const poe = (el: HTMLElement | null, prop: "transform" | "opacity" | "visibility", v: string) => {
      if (!el) return;
      let m = ultimo.get(el);
      if (!m) ultimo.set(el, (m = {}));
      if (m[prop] === v) return;
      m[prop] = v;
      el.style[prop] = v;
    };

    let W = stage.clientWidth;
    let larg: number[] = [];   // largura de cada aparelho na tela
    const medirTudo = () => { W = stage.clientWidth; larg = hojes.current.map((el) => el?.parentElement?.offsetWidth ?? W * 0.5); };
    medirTudo();
    let ativa = -1;

    const progresso = () => {
      const r = sec.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      return clamp(-r.top / total, 0, 1);
    };
    let alvo = progresso() * (N - 1), atual = alvo, desliga: (() => void) | null = null;

    /* ---- os quadros 3D ----
       Cada aparelho tem uma folha com todos os ângulos. A folha aberta (ImageBitmap) ocupa memória, então só ficam abertas a do
       aparelho da vez e as das vizinhas; as outras ficam guardadas comprimidas e são reabertas quando a rolagem chega perto. */
    const pequena = matchMedia("(max-width: 820px)").matches;
    const medida = (i: number) => (pequena ? FOLHAS[i].p : FOLHAS[i]);
    const guardadas: (Blob | null)[] = FOLHAS.map(() => null);
    const abertas: (ImageBitmap | null)[] = FOLHAS.map(() => null);
    const abrindo = FOLHAS.map(() => false);
    const noQuadro = FOLHAS.map(() => -1);   // o quadro que está desenhado em cada canvas
    const ctxs = telas.current.map((c, i) => {
      if (!c) return null;
      c.width = medida(i).w; c.height = medida(i).h;
      return c.getContext("2d");
    });
    let vivo = true, semFolhas = false, baixando = false;

    const desenhar = (i: number, f: number) => {
      const folha = abertas[i], ctx = ctxs[i];
      if (!folha || !ctx || noQuadro[i] === f) return;
      const m = medida(i);
      ctx.clearRect(0, 0, m.w, m.h);
      ctx.drawImage(folha, (f % m.cols) * m.w, Math.floor(f / m.cols) * m.h, m.w, m.h, 0, 0, m.w, m.h);
      if (noQuadro[i] < 0) poe(fotos.current[i], "opacity", "0");   // o canvas assume o lugar do quadro de descanso
      noQuadro[i] = f;
    };
    const perto = (i: number) => Math.abs(i - Math.max(0, ativa)) <= 1;
    const abrir = async (i: number) => {
      const blob = guardadas[i];
      if (!blob || abertas[i] || abrindo[i] || semFolhas) return;
      abrindo[i] = true;
      try {
        const folha = await createImageBitmap(blob);
        if (vivo && perto(i)) { abertas[i] = folha; pintar(atual); } else folha.close();
      } catch { semFolhas = true; }   // navegador sem AVIF: fica o quadro de descanso
      abrindo[i] = false;
    };
    const cuidar = () => {
      for (let i = 0; i < N; i++) {
        if (perto(i)) void abrir(i);
        else if (abertas[i]) { abertas[i]!.close(); abertas[i] = null; }
      }
    };
    const baixar = async () => {
      const economia = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
      if (baixando || semFolhas || economia) return;
      baixando = true;
      const ordem = FOLHAS.map((_, i) => i).sort((a, b) => Math.abs(a - atual) - Math.abs(b - atual));   // primeiro a que está na tela
      for (const i of ordem) {
        if (!vivo || semFolhas) break;
        if (guardadas[i]) continue;
        try {
          const r = await fetch(arquivo(`${FOLHAS[i].id}-${pequena ? "p" : "g"}.avif`), { priority: "low" } as RequestInit);
          if (!r.ok) continue;
          guardadas[i] = await r.blob();
          cuidar();
        } catch { /* sem rede: fica o quadro de descanso; a próxima chegada à seção tenta de novo */ }
      }
      baixando = false;
    };

    /* d = quanto o aparelho está do centro: -1 chegando pela direita, 0 no meio, 1 saindo pela esquerda.
       k = quanto ele já andou para fora: 0 enquanto |d| < PLATO (parado no centro, para dar tempo de ler) e, dali em diante, até 1.
       Ele sai do repouso ganhando velocidade aos poucos (potência ARRANQUE) e chega do mesmo jeito, freando: em linha reta ele
       arrancava e parava de uma vez, com um tranco na borda do platô. Uma curva forte demais deixaria o que sai e o que entra
       perto do meio ao mesmo tempo (no celular, onde cada aparelho ocupa quase a largura toda, um passaria por cima do outro);
       por isso a FOLGA subiu junto: no pior instante (d = 0,5) os dois vizinhos ficam a 0,54 × (2 larguras de tela + as larguras
       deles) um do outro, um pouco mais do que na linha reta de antes, e em |d| = 1 ele já saiu inteiro. */
    const k = (d: number) => Math.pow(clamp((Math.abs(d) - PLATO) / (1 - PLATO), 0, 1), ARRANQUE);
    const xDe = (d: number, i: number) => -Math.sign(d) * k(d) * (W + larg[i]) * FOLGA;
    const pose = (d: number, i: number, extra = 0) => {
      const a = k(d);
      const esc = 1 - 0.1 * Math.pow(a, 1.5);   // nunca passa de 1: a imagem não precisa ser ampliada
      return `translate3d(${(xDe(d, i) + extra).toFixed(1)}px,0,0) perspective(1200px) rotateY(${(-Math.sign(d) * a * GIRO_PLANO).toFixed(2)}deg) scale(${esc.toFixed(3)})`;
    };

    function pintar(q: number) {
      /* cor: a camada da cena de baixo fica inteira e a de cima se dissolve por cima */
      const i0 = clamp(Math.floor(q), 0, N - 2);
      const f = smooth(q - i0);
      for (let i = 0; i < N; i++) {
        const o = i === i0 ? 1 : i === i0 + 1 ? f : 0;
        poe(cores.current[i], "opacity", o.toFixed(3));
        poe(fundos.current[i], "opacity", o.toFixed(3));
      }

      for (let i = 0; i < N; i++) {
        const d = q - i;
        const dentro = Math.abs(d) < 1.02;
        /* o "ontem" só aparece com o aparelho perto do centro e some antes da troca: assim o contorno de um nunca se mistura com o vizinho */
        const verEco = clamp(1 - (Math.abs(d) - 0.2) / 0.3, 0, 1);
        poe(hojes.current[i], "visibility", dentro ? "visible" : "hidden");
        poe(ecos.current[i], "visibility", verEco > 0 ? "visible" : "hidden");
        if (dentro) {
          poe(hojes.current[i], "transform", pose(d, i));
          /* o ângulo acompanha o caminho: quadro 0 entrando pela direita, o do meio no centro, o último saindo pela esquerda */
          desenhar(i, clamp(Math.round((d + 1) * 0.5 * (QUADROS.n - 1)), 0, QUADROS.n - 1));
        }
        if (verEco > 0) {
          poe(ecos.current[i], "opacity", (0.55 * verEco).toFixed(3));
          poe(ecos.current[i], "transform", pose(d, i, W * (ATRASO + 0.1 * k(d))));   // fica um pouco para trás (à direita) do aparelho
        }
        const el = palavras.current[i];
        poe(el, "opacity", Math.max(0, 1 - Math.abs(d) * 1.9).toFixed(3));
        if (el && Math.abs(d) < 0.6) poe(el, "transform", `translate3d(${(-d * 0.14 * W).toFixed(1)}px,0,0)`);
      }
      poe(regua.current, "transform", `translate3d(${(-((q * W * 0.55) % PERIODO)).toFixed(1)}px,0,0)`);

      const nova = clamp(Math.round(q), 0, N - 1);
      if (nova !== ativa) {
        ativa = nova;
        cuidar();
      }
    }

    /* a rolagem define o alvo; o laço corre atrás dele com um pouco de inércia (rolar com a roda do mouse anda aos pulos)
       e dorme quando chega */
    const passo = (_t: number, dt: number) => {
      atual += (alvo - atual) * (1 - Math.pow(INERCIA, dt));
      if (Math.abs(alvo - atual) < 0.0006) { atual = alvo; desliga?.(); desliga = null; }
      pintar(atual);
    };
    const aoRolar = () => { alvo = progresso() * (N - 1); if (!desliga) desliga = onFrame(passo); };
    const medir = () => { medirTudo(); ultimo.clear(); pintar(atual); };
    pintar(atual);

    /* só escuta a rolagem enquanto a seção está perto da tela */
    let ouvindo = false;
    const escutar = (liga: boolean) => {
      if (liga === ouvindo) return;
      ouvindo = liga;
      if (liga) { window.addEventListener("scroll", aoRolar, { passive: true }); aoRolar(); }
      else { window.removeEventListener("scroll", aoRolar); desliga?.(); desliga = null; }
    };
    const io = new IntersectionObserver(([e]) => escutar(e.isIntersecting), { rootMargin: "300px 0px" });
    io.observe(sec);
    /* as folhas começam a descer quando a seção está a menos de uma tela de distância */
    const ioFolhas = new IntersectionObserver(([e]) => { if (e.isIntersecting) void baixar(); }, { rootMargin: "100% 0px" });
    ioFolhas.observe(sec);
    const ro = new ResizeObserver(medir);
    ro.observe(stage);

    return () => {
      vivo = false;
      io.disconnect(); ioFolhas.disconnect(); ro.disconnect(); escutar(false);
      abertas.forEach((f) => f?.close());
    };
  }, []);

  return (
    <section ref={secao} className="gym" id="aparelhos" aria-labelledby="gym-titulo">
      {/* textura de spray: ruído que desmancha a borda das letras grandes (pintada uma vez; a palavra só muda de opacidade) */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <filter id="gym-spray" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="ruido" />
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale="9" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </svg>

      {/* o fundo da página: a cor de cada cena bem escurecida, camada sobre camada */}
      <div className="gym-fundo" aria-hidden="true">
        {CENAS.map((c, i) => <i key={c.nome} ref={(el) => { fundos.current[i] = el; }} style={{ background: ESCURAS[i], opacity: i === 0 ? 1 : 0 }} />)}
      </div>

      <div className="gym-stage" ref={palco}>
        <div className="gym-cores" aria-hidden="true">
          {CENAS.map((c, i) => <i key={c.nome} className="gym-cor" ref={(el) => { cores.current[i] = el; }} style={{ background: painel(c), opacity: i === 0 ? 1 : 0 }} />)}
        </div>

        <div className="gym-words" aria-hidden="true">
          {CENAS.map((c, i) => <span key={c.nome} ref={(el) => { palavras.current[i] = el; }} className="gym-word"><span>{c.nome}</span></span>)}
        </div>
        <div className="gym-regua" ref={regua} aria-hidden="true" />

        {/* os aparelhos: o contorno do "ontem" atrás e o de hoje na frente (o quadro de descanso e, por cima, o canvas com o ângulo da vez) */}
        <div className="gym-aparelhos">
          {CENAS.map((c, i) => {
            const { id, w, h, chao } = FOLHAS[i];
            return (
              <figure key={id} className={`gym-ap ap-${id}`} style={vars({ "--r": (w / h).toFixed(4), "--chao": chao })}>
                <img className="gym-eco" src={arquivo(`${id}-eco.webp`)} alt="" width={w} height={h} loading="lazy" decoding="async" ref={(el) => { ecos.current[i] = el; }} />
                <div className="gym-hoje" ref={(el) => { hojes.current[i] = el; }}>
                  <img src={arquivo(`${id}.webp`)} alt="" width={w} height={h} loading="lazy" decoding="async" ref={(el) => { fotos.current[i] = el; }} />
                  <canvas aria-hidden="true" ref={(el) => { telas.current[i] = el; }} />
                </div>
                <figcaption><b>{c.nome}</b><span>{c.linha}</span></figcaption>
              </figure>
            );
          })}
        </div>
        <div className="gym-grain" aria-hidden="true" />

        <p className="gym-serie" aria-hidden="true">[ Série: aparelhos 04 ]</p>

        <div className="gym-base">
          <h2 id="gym-titulo" className="gym-title"><span>Carga de ontem.</span><span>Passo de hoje.</span><span>Recorde de amanhã.</span></h2>
          <div className="gym-meio">
            <a className="gym-hex" href={APP_CRIAR} aria-label="Criar conta grátis">
              <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" /><path d="M38 62 L64 36 M44 36 H64 V56" /></svg>
            </a>
            <div><b>Criar conta grátis</b><small>Cada aparelho abre com a carga de ontem e sugere a de hoje.</small></div>
          </div>
        </div>
      </div>
    </section>
  );
}
