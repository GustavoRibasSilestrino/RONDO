import { useEffect, useRef } from "react";
import { onFrame } from "../lib/frame";
import { clamp, reduceMotion, vars } from "../lib/util";
import { ARTES, ArteDefs } from "./gymArte";

/* Aparelhos de academia passando pela tela, enquanto a cor da tela muda de um para o outro.
   Os aparelhos são desenhos vetoriais (gymArte.tsx), sem WebGL e sem arquivo de imagem. A cena é presa à rolagem:
   rolar a página empurra o próximo aparelho da direita para a esquerda, e atrás dele vem o "ontem" do aparelho, só o contorno.

   Para não travar: tudo o que anda é só transform e opacity (a GPU move camadas prontas, nada é repintado a cada quadro);
   a cor do painel é uma pilha de camadas que se dissolvem uma na outra, nunca um background-color animado; os valores só são
   escritos quando mudam; e o laço do quadro dorme assim que a rolagem para. Com movimento reduzido, a seção vira uma grade
   parada com os quatro aparelhos (ver styles/gym.css). */

type Cena = { nome: string; linha: string; cor: string; luz: string };

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

const ATRASO = 0.045;    // o quanto o "ontem" fica para trás do aparelho parado, em largura da tela
const PLATO = 0.12;      // o aparelho fica parado no centro enquanto |d| < PLATO
const FOLGA = 0.62;      // quanto ele anda para fora, em (largura da tela + a largura dele)
const PERIODO = 120;     // distância entre os traços grandes da régua, em px

export function GymScene() {
  const secao = useRef<HTMLElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const cores = useRef<(HTMLElement | null)[]>([]);
  const fundos = useRef<(HTMLElement | null)[]>([]);
  const palavras = useRef<(HTMLSpanElement | null)[]>([]);
  const hojes = useRef<(SVGSVGElement | null)[]>([]);
  const ecos = useRef<(SVGSVGElement | null)[]>([]);
  const regua = useRef<HTMLDivElement>(null);
  const etiquetas = useRef<(HTMLLIElement | null)[]>([]);
  const indice = useRef<HTMLSpanElement>(null);
  const trilha = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sec = secao.current, stage = palco.current;
    if (!sec || !stage || reduceMotion) return;   // movimento reduzido: o CSS mostra a grade parada

    /* só escreve no DOM quando o valor muda */
    const ultimo = new Map<Element, Record<string, string>>();
    const poe = (el: HTMLElement | SVGElement | null, prop: "transform" | "opacity" | "visibility", v: string) => {
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

    /* d = quanto o aparelho está do centro: -1 chegando pela direita, 0 no meio, 1 saindo pela esquerda.
       k = quanto ele já andou para fora: 0 enquanto |d| < PLATO (parado no centro, para dar tempo de ler) e, dali em diante, em linha reta até 1.
       Linha reta de propósito: com a curva que quase parava no centro, o que sai e o que entra ficavam perto do meio ao mesmo tempo,
       e no celular, onde cada desenho ocupa 80 a 98% da largura, um passava por cima do outro. Com FOLGA = 0,62 a distância entre
       dois vizinhos em qualquer instante é maior que a soma das meias-larguras (conferido na medição), e em |d| = 1 ele já saiu inteiro. */
    const k = (d: number) => clamp((Math.abs(d) - PLATO) / (1 - PLATO), 0, 1);
    const xDe = (d: number, i: number) => -Math.sign(d) * k(d) * (W + larg[i]) * FOLGA;
    const pose = (d: number, i: number, extra = 0) => {
      const a = k(d);
      const esc = 1 - 0.1 * Math.pow(a, 1.5);   // nunca passa de 1: o desenho não precisa ser repintado maior
      return `translate3d(${(xDe(d, i) + extra).toFixed(1)}px,0,0) perspective(1200px) rotateY(${(-Math.sign(d) * a * 26).toFixed(2)}deg) scale(${esc.toFixed(3)})`;
    };

    const pintar = (q: number) => {
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
        if (dentro) poe(hojes.current[i], "transform", pose(d, i));
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
        if (indice.current) indice.current.textContent = String(nova + 1).padStart(2, "0");
        etiquetas.current.forEach((el, i) => el?.classList.toggle("on", i === nova));
      }
      poe(trilha.current, "transform", `scaleX(${(q / (N - 1)).toFixed(4)})`);
    };

    /* a rolagem define o alvo; o laço corre atrás dele com um pouco de inércia (rolar com a roda do mouse anda aos pulos)
       e dorme quando chega */
    let alvo = progresso() * (N - 1), atual = alvo, desliga: (() => void) | null = null;
    const passo = (_t: number, dt: number) => {
      atual += (alvo - atual) * (1 - Math.pow(0.84, dt));
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
    const ro = new ResizeObserver(medir);
    ro.observe(stage);

    return () => { io.disconnect(); ro.disconnect(); escutar(false); };
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
      <ArteDefs />

      {/* o fundo da página: a cor de cada cena bem escurecida, camada sobre camada */}
      <div className="gym-fundo" aria-hidden="true">
        {CENAS.map((c, i) => <i key={c.nome} ref={(el) => { fundos.current[i] = el; }} style={{ background: ESCURAS[i], opacity: i === 0 ? 1 : 0 }} />)}
      </div>

      <div className="gym-stage" ref={palco}>
        {CENAS.map((c, i) => <i key={c.nome} className="gym-cor" aria-hidden="true" ref={(el) => { cores.current[i] = el; }} style={{ background: painel(c), opacity: i === 0 ? 1 : 0 }} />)}

        <div className="gym-words" aria-hidden="true">
          {CENAS.map((c, i) => <span key={c.nome} ref={(el) => { palavras.current[i] = el; }} className="gym-word"><span>{c.nome}</span></span>)}
        </div>
        <div className="gym-regua" ref={regua} aria-hidden="true" />

        {/* os aparelhos: o contorno do "ontem" atrás, o desenho de hoje na frente */}
        <div className="gym-aparelhos">
          {CENAS.map((c, i) => {
            const { id, ratio, caixa, desenho: Desenho } = ARTES[i];
            return (
              <figure key={id} className={`gym-ap ap-${id}`} style={vars({ "--r": ratio.toFixed(3) })}>
                <svg className="gym-eco" viewBox={caixa} preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" ref={(el) => { ecos.current[i] = el; }}><Desenho /></svg>
                <svg className="gym-hoje" viewBox={caixa} preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" ref={(el) => { hojes.current[i] = el; }}><Desenho /></svg>
                <figcaption><b>{c.nome}</b><span>{c.linha}</span></figcaption>
              </figure>
            );
          })}
        </div>
        <div className="gym-grain" aria-hidden="true" />

        <ul className="gym-etiquetas" aria-hidden="true">
          {CENAS.map((c, i) => <li key={c.nome} ref={(el) => { etiquetas.current[i] = el; }} className={i === 0 ? "on" : ""}>[ {c.nome} ]</li>)}
        </ul>
        <p className="gym-serie" aria-hidden="true">[ Série: aparelhos 04 ]</p>

        <div className="gym-base">
          <h2 id="gym-titulo" className="gym-title"><span>Carga de ontem.</span><span>Passo de hoje.</span><span>Recorde de amanhã.</span></h2>
          <div className="gym-meio">
            <a className="gym-hex" href="#cadastro" aria-label="Criar conta grátis">
              <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" /><path d="M38 62 L64 36 M44 36 H64 V56" /></svg>
            </a>
            <div><b>Criar conta grátis</b><small>Cada aparelho abre com a carga de ontem e sugere a de hoje.</small></div>
          </div>
          <div className="gym-fim" aria-hidden="true">
            <span className="gym-pager"><span ref={indice}>01</span><i><em ref={trilha} /></i><span>04</span></span>
            <span className="gym-barras" />
          </div>
        </div>
      </div>
    </section>
  );
}
