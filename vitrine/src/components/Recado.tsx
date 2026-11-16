import { useEffect, useRef, useState } from "react";
import { desenharOrbe, esfera } from "../lib/orbe";
import { APP_CRIAR } from "../lib/rotas";
import { Btn } from "./ui";

/* O recado de voz, em destaque (desde 2026-11-16): no app ele deixou de ser uma tela de gravação e virou uma conversa com o
   RONDIN (app/src/telas/Recado.tsx). Aqui a pessoa conduz uma conversa de exemplo, do mesmo jeito: o RONDIN faz a pergunta
   do dia, ela "responde" (uma gravação simulada: o site não usa o microfone), ele reage e faz a segunda pergunta, e no fim
   ela guarda no diário ou descarta. Os textos são os do app (app/src/lib/perguntas.ts e app/src/lib/rondinConversa.ts). */

const PERGUNTAS = [
  { p: "Se este dia se repetisse para sempre, você ainda o escolheria?", seguir: "O que, neste dia, você mudaria primeiro?" },
  { p: "O que você está adiando para um futuro que talvez nunca chegue?", seguir: "Qual seria o menor passo possível, ainda hoje?" },
  { p: "Se o seu corpo fosse um velho amigo, ele diria que você o trata com respeito?", seguir: "O que ele pediria a você hoje, se pudesse falar?" },
  { p: "Quem você seria se ninguém nunca tivesse esperado nada de você?", seguir: "Qual parte dessa pessoa você tem coragem de ser já?" },
];
const REACAO = "Interessante. Quando a gente fala, ouve o próprio pensamento de outro jeito.";
const FECHAMENTO = "Foi uma boa conversa. Quer guardar no seu diário, para ouvir mais tarde?";
const NAO_AGORA = "Tudo bem. A pergunta fica com você; pense nela durante o dia.";
const GUARDADO = "Guardei no seu diário. Daqui a um tempo, vale ouvir de novo.";
const DESCARTADO = "Tudo bem, descartei. Algumas respostas são só para o momento.";
const LIMITE = 60;

type Fala = { de: "rondin"; texto: string } | { de: "voce"; segundos: number };
type Fase = "pergunta" | "gravando" | "segunda" | "gravando2" | "fim" | "guardado" | "descartado" | "depois";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Orbe({ tamanho }: { tamanho: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = c.height = tamanho * dpr;
    ctx.scale(dpr, dpr);
    desenharOrbe(ctx, esfera(tamanho > 80 ? 420 : 190), 2.4, 0.1, tamanho);
  }, [tamanho]);
  return <canvas ref={ref} className="conversa-orbe" style={{ width: tamanho, height: tamanho }} aria-hidden="true" />;
}

/* a onda da resposta: barras paradas, com a altura sorteada uma vez (e crescendo enquanto a gravação corre) */
function Onda({ segundos, ao_vivo }: { segundos: number; ao_vivo?: boolean }) {
  const n = 28;
  const ativas = ao_vivo ? Math.min(n, Math.max(3, Math.round((segundos / 20) * n))) : n;
  return (
    <span className="conversa-onda" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ height: `${22 + Math.abs(Math.sin(i * 1.9) * 60) + ((i * 29) % 18)}%`, opacity: i < ativas ? 1 : 0.25 }} />
      ))}
    </span>
  );
}

function Conversa() {
  const [qi, setQi] = useState(0);
  const [fase, setFase] = useState<Fase>("pergunta");
  const [falas, setFalas] = useState<Fala[]>([{ de: "rondin", texto: PERGUNTAS[0].p }]);
  const [seg, setSeg] = useState(0);
  const fim = useRef<HTMLDivElement>(null);
  const gravando = fase === "gravando" || fase === "gravando2";

  useEffect(() => {
    if (!gravando) return;
    const id = setInterval(() => setSeg((s) => Math.min(LIMITE, s + 1)), 1000);
    return () => clearInterval(id);
  }, [gravando]);
  useEffect(() => { fim.current?.scrollTo({ top: fim.current.scrollHeight }); }, [falas, fase]);

  const recomecar = (i: number) => { setQi(i); setFase("pergunta"); setSeg(0); setFalas([{ de: "rondin", texto: PERGUNTAS[i].p }]); };
  const gravar = () => { setSeg(0); setFase(fase === "segunda" ? "gravando2" : "gravando"); };
  const enviar = () => {
    const s = Math.max(4, seg);
    if (fase === "gravando") {
      setFalas((f) => [...f, { de: "voce", segundos: s }, { de: "rondin", texto: `${REACAO} ${PERGUNTAS[qi].seguir}` }]);
      setFase("segunda");
    } else {
      setFalas((f) => [...f, { de: "voce", segundos: s }, { de: "rondin", texto: FECHAMENTO }]);
      setFase("fim");
    }
  };
  const encerrar = (como: "guardado" | "descartado" | "depois") => {
    setFalas((f) => [...f, { de: "rondin", texto: como === "guardado" ? GUARDADO : como === "descartado" ? DESCARTADO : NAO_AGORA }]);
    setFase(como);
  };
  const acabou = fase === "guardado" || fase === "descartado" || fase === "depois";

  return (
    <div className="conversa">
      <div className="conversa-falas" ref={fim} aria-live="polite">
        <div className="conversa-cena">
          <Orbe tamanho={150} />
          <b>RONDIN</b>
          <span>A pergunta de hoje</span>
        </div>
        {falas.map((f, i) => f.de === "rondin"
          ? <p key={i} className="fala-rondin">{f.texto}</p>
          : <div key={i} className="fala-voce"><Onda segundos={f.segundos} /><span>{fmt(f.segundos)}</span></div>)}
        {gravando ? <div className="fala-voce is-gravando"><Onda segundos={seg} ao_vivo /><span>{fmt(seg)}</span></div> : null}
      </div>

      <div className="conversa-acoes">
        {fase === "pergunta" || fase === "segunda" ? (
          <>
            <button type="button" className="conversa-responder" onClick={gravar}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              Responder
            </button>
            <button type="button" className="conversa-link" onClick={() => encerrar("depois")}>Agora não</button>
            {fase === "pergunta" ? <button type="button" className="conversa-link" onClick={() => recomecar((qi + 1) % PERGUNTAS.length)}>Outra pergunta</button> : null}
          </>
        ) : null}
        {gravando ? (
          <>
            <button type="button" className="conversa-responder is-gravando" onClick={enviar}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" /></svg>
              Terminar
            </button>
            <span className="conversa-dica">Gravação de exemplo: o site não usa o microfone. No app, até 1 minuto por resposta.</span>
          </>
        ) : null}
        {fase === "fim" ? (
          <>
            <button type="button" className="conversa-responder" onClick={() => encerrar("guardado")}>Guardar no diário</button>
            <button type="button" className="conversa-link" onClick={() => encerrar("descartado")}>Descartar</button>
          </>
        ) : null}
        {acabou ? <button type="button" className="conversa-link" onClick={() => recomecar((qi + 1) % PERGUNTAS.length)}>Conversar de novo</button> : null}
      </div>
    </div>
  );
}

export function Recado() {
  return (
    <section className="section recado-rondin" id="recado" aria-labelledby="recado-titulo">
      <div className="wrap recado-grade">
        <div className="recado-texto">
          <h2 id="recado-titulo" className="display">Um minuto por dia <span>com o RONDIN.</span></h2>
          <p className="lead">A superação também é de cabeça. Todo dia o RONDIN faz uma pergunta para você parar e pensar. Você responde falando, ele conversa de volta, e a sua voz vira um diário de quem você está se tornando.</p>
          <ul className="recado-pontos">
            <li><b>Uma pergunta por dia.</b> Perguntas para pensar de verdade, não "como foi o treino". A mesma para todo mundo, no mesmo dia.</li>
            <li><b>Uma conversa, não um formulário.</b> Ele reage ao que você disse e faz uma segunda pergunta. Dá para dizer "agora não".</li>
            <li><b>O seu diário de superação.</b> Um calendário com os dias em que você falou, todos os áudios para ouvir de novo e o seu ano em áudio.</li>
            <li><b>Só seu.</b> O áudio fica no seu aparelho. O servidor guarda só a lista, nunca a sua voz. É um diário, não terapia.</li>
          </ul>
          <Btn href={APP_CRIAR}>Conversar com o RONDIN <span className="arrow">→</span></Btn>
        </div>
        <Conversa />
      </div>
    </section>
  );
}
