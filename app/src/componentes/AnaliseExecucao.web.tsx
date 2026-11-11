/* A câmera que analisa a execução (navegador). Primeiro o RONDIN pergunta qual exercício a pessoa vai fazer; ela digita
   ("rosca bíceps", "agachamento"...), lib/postura.ts reconhece o exercício e a câmera abre já configurada para ele (só então o
   navegador pede a permissão da câmera). Depois a pessoa aponta a câmera para alguém fazendo o exercício: o detector de pose
   (MediaPipe Pose Landmarker, que roda aqui no aparelho) acha os pontos do corpo a cada quadro, lib/postura.ts julga a execução
   e esta tela desenha por cima do vídeo o esqueleto, o ponto a corrigir (um círculo vermelho pulsando), a seta do sentido da
   correção e o texto ("Cotovelo mais para trás"). Embaixo ficam o veredito, as repetições e o que corrigir; com a voz ligada,
   cada correção nova também é falada.

   Privacidade: o vídeo não é gravado nem enviado a lugar nenhum; só o programa da análise (a biblioteca e o modelo do corpo)
   é baixado, de cdn.jsdelivr.net e storage.googleapis.com, na primeira vez que a tela abre.
   No app instalado (iPhone e Android) a tela é outra: AnaliseExecucao.tsx. */
import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import type * as Vision from '@mediapipe/tasks-vision';
type PoseLandmarker = Vision.PoseLandmarker;
import { Analisador, EXERCICIOS, LIGACOES, exercicioDoTexto, type Correcao, type Exercicio, type Leitura, type Ponto } from '../lib/postura';
import { Orbe } from './Orbe';

const VERSAO = '1.1.1';   // a mesma do package.json: a biblioteca e os arquivos .wasm têm de ser da mesma versão
const BIBLIOTECA = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSAO}/vision_bundle.js`;
/* a impressão digital do arquivo: se o CDN mandar qualquer coisa diferente do que foi conferido, o navegador não roda */
const INTEGRIDADE = 'sha384-33ConKAFiqnDTqoc8FFsTiKhp23eN52R5hP3ZqPBuRvIe9XyWblqpaEYnZZNVIvI';
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSAO}/wasm`;
const MODELO = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const ROXO = '#c4a8ff', VERMELHO = '#ff5d73', AMARELO = '#ffcf5c', VERDE = '#3ddc97';
const FONTE = 'Poppins_400Regular, system-ui, sans-serif', FONTE_FORTE = 'Poppins_600SemiBold, system-ui, sans-serif';

/* o detector é carregado uma vez e fica guardado para as próximas aberturas */
let detector: Promise<PoseLandmarker> | null = null;
function carregarDetector(): Promise<PoseLandmarker> {
  if (!detector) {
    detector = (async () => {
      /* a biblioteca vem do CDN na hora, numa tag de script com a impressão digital conferida (o empacotador do app não aceita
         o import dinâmico de dentro dela, e sem eval a política de segurança fica intacta); o pacote do npm fica só para os tipos */
      const { FilesetResolver, PoseLandmarker } = await carregarBiblioteca();
      const arquivos = await FilesetResolver.forVisionTasks(WASM);
      const opcoes = (delegate: 'GPU' | 'CPU') => ({ baseOptions: { modelAssetPath: MODELO, delegate }, runningMode: 'VIDEO' as const, numPoses: 1 });
      try { return await PoseLandmarker.createFromOptions(arquivos, opcoes('GPU')); }
      catch { return await PoseLandmarker.createFromOptions(arquivos, opcoes('CPU')); }   // sem placa de vídeo disponível: no processador
    })();
    detector.catch(() => { detector = null; });   // falhou (sem internet): a próxima abertura tenta de novo
  }
  return detector;
}

function carregarBiblioteca(): Promise<typeof Vision> {
  const pronto = (window as unknown as { Vision?: typeof Vision }).Vision;
  if (pronto) return Promise.resolve(pronto);
  return new Promise((ok, erro) => {
    const tag = document.createElement('script');
    tag.src = BIBLIOTECA; tag.integrity = INTEGRIDADE; tag.crossOrigin = 'anonymous'; tag.async = true;
    tag.onload = () => { const v = (window as unknown as { Vision?: typeof Vision }).Vision; if (v) ok(v); else erro(new Error('biblioteca')); };
    tag.onerror = () => { tag.remove(); erro(new Error('biblioteca')); };
    document.head.appendChild(tag);
  });
}

type Situacao = 'carregando' | 'pronto' | 'negado' | 'semCamera' | 'erro';

export function AnaliseExecucao({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  if (!aberta || typeof document === 'undefined') return null;
  /* o Modal põe a tela por cima de tudo (fora da coluna do app), como uma janela cheia */
  return <Modal visible transparent animationType="fade" onRequestClose={aoFechar}><Painel aoFechar={aoFechar} /></Modal>;
}

function Painel({ aoFechar }: { aoFechar: () => void }) {
  const [exercicio, setExercicio] = useState<Exercicio | null>(null);
  /* Esc fecha; a página de trás não rola enquanto a tela está aberta */
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    window.addEventListener('keydown', aoTeclar);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', aoTeclar); document.body.style.overflow = antes; window.speechSynthesis?.cancel(); };
  }, [aoFechar]);
  return exercicio
    ? <Camera exercicio={exercicio} aoFechar={aoFechar} aoTrocar={() => setExercicio(null)} />
    : <Pergunta aoEscolher={setExercicio} aoFechar={aoFechar} />;
}

/* fala em voz alta (a voz do aparelho), se a pessoa não desligou */
function dizer(texto: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'pt-BR'; u.rate = 1.05;
  window.speechSynthesis.speak(u);
}

/* ---------- a pergunta do RONDIN: qual exercício? ---------- */
const PERGUNTA = 'Qual exercício você vai fazer?';
const NAO_SEI = 'Esse eu ainda não sei corrigir. Por enquanto eu corrijo agachamento, flexão, rosca direta, desenvolvimento e prancha.';

function Pergunta({ aoEscolher, aoFechar }: { aoEscolher: (e: Exercicio) => void; aoFechar: () => void }) {
  const [texto, setTexto] = useState('');
  const [fala, setFala] = useState(PERGUNTA);
  const [estado, setEstado] = useState<'ouvindo' | 'falando' | 'pensando'>('falando');
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    dizer(PERGUNTA);
    const id = setTimeout(() => setEstado('ouvindo'), 1600);
    campo.current?.focus();
    return () => clearTimeout(id);
  }, []);
  const enviar = (e?: React.FormEvent) => {
    e?.preventDefault();
    const achado = exercicioDoTexto(texto);
    if (!achado) {
      setFala(NAO_SEI); setEstado('falando'); dizer(NAO_SEI);
      setTimeout(() => { setEstado('ouvindo'); campo.current?.select(); }, 2200);
      return;
    }
    const nome = EXERCICIOS.find((x) => x.id === achado)!.nome.toLowerCase();
    const resposta = `Beleza: vou corrigir a sua ${nome === 'flexão' || nome === 'prancha' || nome === 'rosca direta' ? '' : 'execução de '}${nome}. Aponte a câmera.`;
    setFala(resposta); setEstado('pensando'); dizer(resposta);
    setTimeout(() => aoEscolher(achado), 1100);   // dá tempo de ler a confirmação antes de a câmera abrir
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Análise da execução" style={css.fundo}>
      <div style={css.topo}>
        <button type="button" aria-label="Fechar" onClick={aoFechar} style={css.redondo}><Svg d="M6 6l12 12M18 6L6 18" /></button>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: FONTE_FORTE, fontSize: 16 }}>Análise da execução</div>
        <div style={{ width: 44 }} />
      </div>
      <form onSubmit={enviar} style={css.pergunta}>
        <Orbe hud tamanho={Math.min(220, Math.round(window.innerWidth * 0.55))} estado={estado} />
        <div style={{ fontFamily: FONTE_FORTE, fontSize: 12.5, letterSpacing: 3, color: ROXO, marginTop: -4 }}>RONDIN</div>
        <div aria-live="polite" style={{ fontSize: 21, lineHeight: 1.4, textAlign: 'center', maxWidth: 440, minHeight: 60 }}>{fala}</div>
        <input
          ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="O exercício que você vai fazer"
          placeholder="Ex.: rosca direta, agachamento, flexão" autoComplete="off" enterKeyHint="go" maxLength={60} style={css.campo}
        />
        <button type="submit" disabled={!texto.trim() || estado === 'pensando'} style={{ ...css.botao, width: '100%', maxWidth: 440, opacity: texto.trim() ? 1 : 0.5 }}>Abrir a câmera</button>
        <div style={{ fontSize: 12.5, color: '#9e96b8', textAlign: 'center', maxWidth: 440, lineHeight: 1.45 }}>A análise roda neste aparelho: o vídeo não é gravado nem enviado.</div>
      </form>
    </div>
  );
}

/* ---------- a câmera com a análise ---------- */
function Camera({ exercicio, aoFechar, aoTrocar }: { exercicio: Exercicio; aoFechar: () => void; aoTrocar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const toque = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const [camera, setCamera] = useState<'environment' | 'user'>(toque ? 'environment' : 'user');   // celular: a de trás, para filmar outra pessoa
  const [situacao, setSituacao] = useState<Situacao>('carregando');
  const [tentativa, setTentativa] = useState(0);
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [voz, setVoz] = useState(true);
  const analisador = useRef(new Analisador(exercicio));
  const vozRef = useRef(voz);
  vozRef.current = voz;
  const espelhar = camera === 'user';   // a câmera da frente aparece como um espelho


  /* a câmera e o laço da análise */
  useEffect(() => {
    let vivo = true, quadro = 0, fluxo: MediaStream | null = null;
    let ultimoTempo = -1, ultimoAviso = 0;
    const suave: Ponto[] = [];
    const faladas = new Map<string, number>();
    let ultimaRep = 0;
    setSituacao('carregando');

    const falar = (texto: string) => {
      if (!vozRef.current || !('speechSynthesis' in window)) return;
      const agora = performance.now();
      if ((faladas.get(texto) ?? -1e9) > agora - 6000) return;   // a mesma frase no máximo a cada 6 s
      faladas.set(texto, agora);
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'pt-BR'; u.rate = 1.05;
      window.speechSynthesis.speak(u);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setSituacao('semCamera'); return; }
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: camera }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch (e) {
        if (!vivo) return;
        const nome = (e as { name?: string }).name;
        setSituacao(nome === 'NotAllowedError' || nome === 'SecurityError' ? 'negado' : 'semCamera');
        return;
      }
      if (!vivo) { fluxo.getTracks().forEach((t) => t.stop()); return; }
      const v = video.current!;
      v.srcObject = fluxo;
      await v.play().catch(() => undefined);
      let det: PoseLandmarker;
      try { det = await carregarDetector(); } catch { if (vivo) setSituacao('erro'); return; }
      if (!vivo) return;
      setSituacao('pronto');

      const passo = () => {
        if (!vivo) return;
        quadro = requestAnimationFrame(passo);
        if (v.readyState < 2 || v.currentTime === ultimoTempo) return;
        ultimoTempo = v.currentTime;
        const agora = performance.now();
        let pts: Ponto[] | null = null;
        try {
          const r = det.detectForVideo(v, agora);
          const crus = r.landmarks[0];
          if (crus) {
            /* suaviza os pontos (o detector treme um pouco de um quadro para o outro) */
            pts = crus.map((p, i) => {
              const ant = suave[i], vis = p.visibility ?? 1;
              const novo = ant ? { x: ant.x + (p.x - ant.x) * 0.55, y: ant.y + (p.y - ant.y) * 0.55, v: vis } : { x: p.x, y: p.y, v: vis };
              suave[i] = novo;
              return novo;
            });
          } else suave.length = 0;
        } catch { return; }
        const l = analisador.current.quadro(pts, (v.videoWidth || 16) / (v.videoHeight || 9), agora);
        desenhar(pts, l.correcoes);
        /* a fala: cada correção nova, e o erro principal de uma repetição errada */
        if (l.correcoes[0]) falar(l.correcoes[0].texto);
        if (l.reps > ultimaRep) { ultimaRep = l.reps; if (l.ultima && !l.ultima.certa && !l.correcoes.length) falar(l.ultima.correcoes[0].texto); }
        if (agora - ultimoAviso > 140) { ultimoAviso = agora; setLeitura(l); }   // o texto da tela muda no máximo ~7 vezes por segundo
      };
      quadro = requestAnimationFrame(passo);
    })();

    /* o esqueleto, os pontos a corrigir, as setas e os textos, por cima do vídeo */
    function desenhar(pts: Ponto[] | null, correcoes: Correcao[]) {
      const c = tela.current, v = video.current, caixa = palco.current;
      if (!c || !v || !caixa) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = caixa.clientWidth, H = caixa.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!pts) return;
      /* onde o vídeo aparece dentro da caixa (ele cabe inteiro, com faixas se a proporção for outra) */
      const va = (v.videoWidth || 16) / (v.videoHeight || 9);
      const w = W / H > va ? H * va : W, h = W / H > va ? H : W / va;
      const ox = (W - w) / 2, oy = (H - h) / 2;
      const em = (x: number, y: number) => ({ X: ox + (espelhar ? 1 - x : x) * w, Y: oy + y * h });

      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(196,168,255,0.85)'; ctx.lineWidth = 3;
      for (const [a, b] of LIGACOES) {
        if (pts[a].v < 0.4 || pts[b].v < 0.4) continue;
        const A = em(pts[a].x, pts[a].y), B = em(pts[b].x, pts[b].y);
        ctx.beginPath(); ctx.moveTo(A.X, A.Y); ctx.lineTo(B.X, B.Y); ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      for (const [a, b] of LIGACOES) for (const i of [a, b]) {
        if (pts[i].v < 0.4) continue;
        const P = em(pts[i].x, pts[i].y);
        ctx.beginPath(); ctx.arc(P.X, P.Y, 4, 0, Math.PI * 2); ctx.fill();
      }

      const pulso = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      const usadas: { x: number; y: number; w: number; h: number }[] = [];
      for (const cor of correcoes) {
        const P = em(pts[cor.ponto].x, pts[cor.ponto].y);
        /* o ponto a corrigir: anel vermelho pulsando */
        ctx.strokeStyle = VERMELHO; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(P.X, P.Y, 13 + 5 * pulso, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = VERMELHO; ctx.beginPath(); ctx.arc(P.X, P.Y, 6, 0, Math.PI * 2); ctx.fill();
        /* a seta: para onde o ponto tem de ir */
        if (cor.alvo) {
          const A = em(cor.alvo.x, cor.alvo.y);
          let dx = A.X - P.X, dy = A.Y - P.Y;
          const d = Math.hypot(dx, dy) || 1;
          const L = Math.max(34, Math.min(80, d));
          dx = (dx / d) * L; dy = (dy / d) * L;
          const ini = { X: P.X + (dx / L) * 22, Y: P.Y + (dy / L) * 22 }, fim = { X: P.X + dx + (dx / L) * 22, Y: P.Y + dy + (dy / L) * 22 };
          ctx.strokeStyle = AMARELO; ctx.fillStyle = AMARELO; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(ini.X, ini.Y); ctx.lineTo(fim.X, fim.Y); ctx.stroke();
          const ang = Math.atan2(dy, dx);
          ctx.beginPath(); ctx.moveTo(fim.X + Math.cos(ang) * 6, fim.Y + Math.sin(ang) * 6);
          ctx.lineTo(fim.X + Math.cos(ang + 2.5) * 16, fim.Y + Math.sin(ang + 2.5) * 16);
          ctx.lineTo(fim.X + Math.cos(ang - 2.5) * 16, fim.Y + Math.sin(ang - 2.5) * 16);
          ctx.closePath(); ctx.fill();
        }
        /* o texto, num balão perto do ponto, sem sair da tela nem cobrir outro balão */
        ctx.font = `600 ${W < 520 ? 14 : 16}px ${FONTE_FORTE}`;
        const tw = ctx.measureText(cor.texto).width, bw = tw + 22, bh = W < 520 ? 32 : 36;
        let bx = P.X + 26, by = P.Y - bh - 18;
        if (bx + bw > W - 8) bx = P.X - 26 - bw;
        bx = Math.max(8, Math.min(W - bw - 8, bx));
        by = Math.max(8, Math.min(H - bh - 8, by));
        for (const u of usadas) if (bx < u.x + u.w && bx + bw > u.x && by < u.y + u.h && by + bh > u.y) by = u.y + u.h + 6;
        usadas.push({ x: bx, y: by, w: bw, h: bh });
        ctx.strokeStyle = 'rgba(255,93,115,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(P.X, P.Y); ctx.lineTo(bx + (bx > P.X ? 0 : bw), by + bh / 2); ctx.stroke();
        ctx.fillStyle = 'rgba(14,8,26,0.9)';
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = VERMELHO; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
        ctx.fillText(cor.texto, bx + 11, by + bh / 2 + 1);
      }
    }

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      fluxo?.getTracks().forEach((t) => t.stop());
      if (video.current) video.current.srcObject = null;
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, tentativa]);

  /* ---------- o que aparece embaixo ---------- */
  const ex = EXERCICIOS.find((e) => e.id === exercicio)!;
  const vivas = leitura?.correcoes ?? [];
  const daRep = leitura?.ultima && !leitura.ultima.certa ? leitura.ultima.correcoes : [];
  const lista = [...vivas, ...daRep].filter((c, i, a) => a.findIndex((x) => x.texto === c.texto) === i).slice(0, 3);
  const veredito = situacao !== 'pronto' ? null
    : !leitura || leitura.aviso ? { cor: '#9e96b8', texto: leitura?.aviso ?? 'Procurando uma pessoa no quadro...' }
    : vivas.length ? { cor: VERMELHO, texto: 'Corrija a execução' }
    : daRep.length ? { cor: AMARELO, texto: 'A última repetição precisa de ajuste' }
    : leitura.ultima ? { cor: VERDE, texto: 'Execução certa' }
    : { cor: VERDE, texto: exercicio === 'prancha' ? 'Posição certa' : 'Comece o movimento' };

  const mensagem: Record<Exclude<Situacao, 'pronto'>, string> = {
    carregando: 'Preparando a câmera e a análise...',
    negado: 'Permita o uso da câmera no navegador para analisar o exercício.',
    semCamera: 'Nenhuma câmera encontrada neste aparelho.',
    erro: 'Não foi possível carregar a análise. Confira a internet e tente de novo.',
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Análise da execução" style={css.fundo}>
      {/* topo: fechar, título, voz e trocar a câmera */}
      <div style={css.topo}>
        <button type="button" aria-label="Fechar a câmera" onClick={aoFechar} style={css.redondo}><Svg d="M6 6l12 12M18 6L6 18" /></button>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontFamily: FONTE_FORTE, fontSize: 16 }}>{ex.nome}</div>
          <button type="button" onClick={aoTrocar} style={css.trocar}>Trocar exercício</button>
        </div>
        <button type="button" aria-label={voz ? 'Desligar a voz' : 'Ligar a voz'} aria-pressed={voz} onClick={() => { setVoz((x) => !x); window.speechSynthesis?.cancel(); }} style={{ ...css.redondo, opacity: voz ? 1 : 0.55 }}>
          <Svg d={voz ? 'M4 9v6h4l5 4V5L8 9H4zm12 0a4 4 0 010 6m2-9a8 8 0 010 12' : 'M4 9v6h4l5 4V5L8 9H4zm12 1l5 5m0-5l-5 5'} />
        </button>
        <button type="button" aria-label="Trocar de câmera" onClick={() => setCamera((c) => (c === 'user' ? 'environment' : 'user'))} style={{ ...css.redondo, marginLeft: 8 }}>
          <Svg d="M4 8h3l2-3h6l2 3h3v11H4zM9 13.5a3 3 0 015-2.2M15 13.5a3 3 0 01-5 2.2M14 9.5v2h-2M10 17.5v-2h2" />
        </button>
      </div>

      {/* o vídeo com o desenho por cima */}
      <div ref={palco} style={css.palco}>
        <video ref={video} playsInline muted autoPlay style={{ ...css.video, transform: espelhar ? 'scaleX(-1)' : undefined }} />
        <canvas ref={tela} aria-hidden="true" style={css.tela} />
        {situacao !== 'pronto' ? (
          <div style={css.cobertura}>
            {situacao === 'carregando' ? <div style={css.girando} /> : null}
            <div style={{ maxWidth: 320, lineHeight: 1.5 }}>{mensagem[situacao]}</div>
            {situacao !== 'carregando' ? <button type="button" onClick={() => setTentativa((n) => n + 1)} style={css.botao}>Tentar de novo</button> : null}
          </div>
        ) : null}
      </div>

      {/* o veredito, as correções e as repetições */}
      <div style={css.base}>
        {veredito ? (
          <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: veredito.cor, boxShadow: `0 0 12px ${veredito.cor}` }} />
            <span style={{ fontFamily: FONTE_FORTE, fontSize: 17, color: veredito.cor === '#9e96b8' ? '#f4f1fb' : veredito.cor }}>{veredito.texto}</span>
            <span style={{ marginLeft: 'auto', fontSize: 13.5, color: '#c9c2db', whiteSpace: 'nowrap' }}>
              {exercicio === 'prancha' ? `${leitura?.segundosCertos ?? 0} s na posição certa` : `${leitura?.reps ?? 0} ${leitura?.reps === 1 ? 'repetição' : 'repetições'} · ${leitura?.certas ?? 0} ${leitura?.certas === 1 ? 'certa' : 'certas'}`}
            </span>
          </div>
        ) : null}
        {lista.length ? (
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }}>
            {lista.map((c) => <li key={c.texto} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 14.5, color: '#f4f1fb' }}><span style={{ color: vivas.includes(c) ? VERMELHO : AMARELO }}>●</span>{c.texto}</li>)}
          </ul>
        ) : null}
        <div style={{ marginTop: 10, fontSize: 12.5, color: '#9e96b8', lineHeight: 1.45 }}>{ex.dica} A análise roda neste aparelho: o vídeo não é gravado nem enviado.</div>
      </div>
    </div>
  );
}

function Svg({ d }: { d: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

if (typeof document !== 'undefined' && !document.getElementById('analise-execucao-css')) {
  const s = document.createElement('style');
  s.id = 'analise-execucao-css';
  s.textContent = '@keyframes analiseGira{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}

const css: Record<string, React.CSSProperties> = {
  fundo: { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column', background: '#07060b', color: '#f4f1fb', fontFamily: FONTE },
  topo: { display: 'flex', alignItems: 'center', padding: 'max(10px, env(safe-area-inset-top)) 12px 8px' },
  redondo: { width: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center', border: '1px solid rgba(167,139,250,0.26)', background: '#1a1626', cursor: 'pointer' },
  trocar: { background: 'none', border: 0, padding: '2px 6px', color: ROXO, fontFamily: FONTE, fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' },
  pergunta: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px 40px' },
  campo: { width: '100%', maxWidth: 440, minHeight: 52, padding: '0 16px', borderRadius: 14, border: '1px solid rgba(196,168,255,0.4)', background: '#0d0b13', color: '#f4f1fb', fontFamily: FONTE, fontSize: 16, outline: 'none', boxSizing: 'border-box' },
  palco: { position: 'relative', flex: 1, minHeight: 0, background: '#000', overflow: 'hidden' },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' },
  tela: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  cobertura: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', background: 'rgba(7,6,11,0.82)', fontSize: 15 },
  girando: { width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(196,168,255,0.25)', borderTopColor: ROXO, animation: 'analiseGira 0.9s linear infinite' },
  botao: { minHeight: 46, padding: '0 20px', borderRadius: 14, border: '1px solid rgba(214,196,255,0.36)', background: '#6a00d4', color: '#fff', fontFamily: FONTE_FORTE, fontSize: 15, cursor: 'pointer' },
  base: { padding: '12px 16px max(14px, env(safe-area-inset-bottom))', borderTop: '1px solid rgba(167,139,250,0.13)', background: '#0d0b13', maxWidth: 760, width: '100%', alignSelf: 'center', boxSizing: 'border-box' },
};
