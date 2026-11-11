/* O fundo da conversa com o RONDIN, no navegador: preto de verdade, com três camadas vivas e bem discretas. Tudo é animação
   de CSS (o próprio navegador anima, na placa de vídeo, só com transform e opacity; o React não refaz nada a cada quadro):
   1. ondas de voz: anéis lilás que nascem no orbe e se abrem devagar até as bordas, um depois do outro, como um refrão que
      volta (o "rondó" que dá nome ao RONDO). O conjunto respira de leve e, quando o RONDIN fala, as ondas se acendem; quando
      ele espera, ficam quase apagadas;
   2. poeira de luz em três profundidades: as de longe são pequenas, lentas e fracas; as de perto, maiores e mais rápidas.
      Sobem balançando de leve, como brasas;
   3. duas névoas roxas, muito fracas, que fazem um passeio lento e largo pelos cantos.
   A poeira e as névoas ainda se deslocam um pouco ao contrário do cursor (paralaxe), o que dá profundidade sem distrair.
   Tudo aqui é fraco o bastante para o branco sobre o preto continuar a 15:1 ou mais. Quem pede "reduzir movimento" vê a mesma
   cena parada, sem nenhuma animação. No celular usa FundoRondin.tsx.
   Nota: o react-native-web só entende `animationKeyframes` em estilos de StyleSheet.create (não nos inline), por isso as
   animações ficam aqui embaixo, fixas; o que muda de elemento para elemento (lugar, duração, atraso) vai inline. Dentro dos
   quadros o transform tem de ser texto de CSS ('scale(0.5)'), porque ali ele não é convertido a partir de lista. */
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useMovimentoReduzido } from '../lib/movimento';
import type { EstadoOrbe } from '../lib/orbe';

type Props = { estado: EstadoOrbe; cx?: number; cy?: number };

const css = (o: object): never => o as never;   // propriedades de CSS que o tipo de estilo do React Native não conhece
const LILAS = '196,168,255';
const ONDAS = 4;
const CICLO = 14;      // segundos de uma onda, do orbe até a borda: devagar, para não competir com o texto
const FORCA: Record<EstadoOrbe, number> = { falando: 0.85, ouvindo: 0.5, pensando: 0.65, quieto: 0.4 };

/* a aparência de um anel: um fio lilás bem fraco e um brilho que sobe até a borda */
const ANEL = {
  borderWidth: 1, borderColor: `rgba(${LILAS},0.24)`,
  backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0) 62%, rgba(124,58,237,0.05) 84%, rgba(167,139,250,0.11) 99%, rgba(0,0,0,0) 100%)',
};

/* a poeira, em três profundidades: quanto mais perto, maior, mais rápida (sobe mais no tempo dela) e mais forte */
const CAMADAS = [
  { n: 12, tam: [1, 1.5], dur: [34, 46], subida: 160, pico: 0.22, balanco: 6 },
  { n: 8, tam: [1.5, 2.1], dur: [26, 34], subida: 280, pico: 0.34, balanco: 10 },
  { n: 6, tam: [2.1, 2.9], dur: [19, 26], subida: 430, pico: 0.5, balanco: 16 },
] as const;

/* a trajetória de um grão: sobe em linha reta e balança de um lado a outro como uma senóide (onze pontos; o navegador liga os
   pontos em linha reta, o que a esta densidade parece curva); aparece devagar, brilha e some antes do fim */
function grao(c: (typeof CAMADAS)[number]) {
  const quadros: Record<string, object> = {};
  for (let k = 0; k <= 10; k += 1) {
    const f = k / 10;
    const x = Math.sin(f * Math.PI * 2) * c.balanco;
    const opacidade = f < 0.15 ? (f / 0.15) * c.pico : f > 0.7 ? ((1 - f) / 0.3) * c.pico * 0.7 : c.pico * (1 - 0.3 * ((f - 0.15) / 0.55));
    quadros[`${k * 10}%`] = { opacity: Number(opacidade.toFixed(3)), transform: `translate(${x.toFixed(1)}px, ${(-c.subida * f).toFixed(1)}px)` };
  }
  return css({ willChange: 'transform, opacity', opacity: 0, animationKeyframes: [quadros], animationIterationCount: 'infinite', animationTimingFunction: 'linear' });
}

/* o passeio de uma névoa: uma volta larga e lenta, que volta ao ponto de partida sem solavanco */
const nevoa = (dx: number, dy: number) => css({
  willChange: 'transform',
  animationKeyframes: [{
    '0%': { transform: 'translate(0%, 0%) scale(1)' },
    '33%': { transform: `translate(${dx}%, ${dy}%) scale(1.1)` },
    '66%': { transform: `translate(${-dx * 0.5}%, ${dy * 0.6}%) scale(1.04)` },
    '100%': { transform: 'translate(0%, 0%) scale(1)' },
  }],
  animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out',
});

const anim = StyleSheet.create({
  /* a onda cresce com ease-out suave; a opacidade corre por dentro, em linha reta (aparece perto do orbe, some até a borda) */
  ondaEscala: css({
    willChange: 'transform',
    animationKeyframes: [{ '0%': { transform: 'scale(0.14)' }, '100%': { transform: 'scale(1)' } }],
    animationDuration: `${CICLO}s`, animationIterationCount: 'infinite', animationTimingFunction: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  }),
  ondaOpacidade: css({
    willChange: 'opacity',
    animationKeyframes: [{ '0%': { opacity: 0 }, '12%': { opacity: 1 }, '52%': { opacity: 0.35 }, '100%': { opacity: 0 } }],
    animationDuration: `${CICLO}s`, animationIterationCount: 'infinite', animationTimingFunction: 'linear',
  }),
  /* o conjunto das ondas respira: cresce e encolhe uns 3%, bem devagar */
  respira: css({
    willChange: 'transform',
    animationKeyframes: [{ '0%': { transform: 'scale(1)' }, '100%': { transform: 'scale(1.035)' } }],
    animationDuration: '9s', animationDirection: 'alternate', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out',
  }),
  nevoaA: nevoa(9, -7),
  nevoaB: nevoa(-8, 6),
  grao0: grao(CAMADAS[0]),
  grao1: grao(CAMADAS[1]),
  grao2: grao(CAMADAS[2]),
});
const GRAOS = [anim.grao0, anim.grao1, anim.grao2];

/* números repetíveis (sempre a mesma poeira): um gerador simples com semente */
function sorteio(semente: number) {
  let s = semente;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

type RefView = React.RefObject<React.ComponentRef<typeof View> | null>;
const noDom = (r: RefView): HTMLElement | null => (r.current as unknown as HTMLElement | null);

export function FundoRondin({ estado, cx, cy }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const parado = useMovimentoReduzido();
  const x0 = cx ?? W / 2, y0 = cy ?? H * 0.28;
  const D = Math.round(Math.max(760, Math.min(1500, Math.max(W, H) * 1.15)));   // o anel maior chega além das bordas
  const fator = W < 700 ? 0.6 : 1;                                              // menos poeira no celular
  const poeira = useMemo(() => {
    const r = sorteio(7);
    return CAMADAS.flatMap((c, camada) => Array.from({ length: Math.round(c.n * fator) }, () => {
      const dur = c.dur[0] + r() * (c.dur[1] - c.dur[0]);
      return { x: r(), y: 0.2 + r() * 0.9, tam: c.tam[0] + r() * (c.tam[1] - c.tam[0]), dur, atraso: -r() * dur, camada, lilas: r() < 0.45 };
    }));
  }, [fator]);

  /* paralaxe: a poeira e as névoas se deslocam um pouco ao contrário do cursor, as de longe menos que as de perto */
  const nevoasRef: RefView = useRef(null);
  const poeiraRef: RefView = useRef(null);
  useEffect(() => {
    if (parado) return undefined;
    let quadro = 0, tx = 0, ty = 0;
    const aplicar = () => {
      quadro = 0;
      const n = noDom(nevoasRef), p = noDom(poeiraRef);
      if (n) n.style.transform = `translate3d(${(-tx * 16).toFixed(1)}px, ${(-ty * 11).toFixed(1)}px, 0)`;
      if (p) p.style.transform = `translate3d(${(-tx * 8).toFixed(1)}px, ${(-ty * 6).toFixed(1)}px, 0)`;
    };
    const mover = (e: PointerEvent) => {
      tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      ty = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      if (!quadro) quadro = requestAnimationFrame(aplicar);
    };
    window.addEventListener('pointermove', mover, { passive: true });
    return () => { window.removeEventListener('pointermove', mover); if (quadro) cancelAnimationFrame(quadro); };
  }, [parado]);

  const m = Math.max(W, H);
  const nevoas = [
    { x: W * 0.06, y: H * 1.02, m: m * 0.95, cor: '91,33,182', a: 0.1, dur: 38, estilo: anim.nevoaA },
    { x: W * 0.98, y: H * 0.5, m: m * 0.7, cor: '124,58,237', a: 0.06, dur: 52, estilo: anim.nevoaB },
  ];
  /* o deslocamento do cursor é suave (a transição de CSS tira o tranco do movimento do mouse) */
  const suave = parado ? null : css({ transition: 'transform 900ms cubic-bezier(0.16, 1, 0.3, 1)' });

  return (
    <View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, css({ overflow: 'hidden', backgroundColor: '#000000' })]}>
      {/* as névoas: dois borrões roxos que passeiam devagar */}
      <View ref={nevoasRef} style={[StyleSheet.absoluteFill, suave]}>
        {nevoas.map((n, i) => (
          <View
            key={i}
            style={[
              css({
                position: 'absolute', left: n.x - n.m / 2, top: n.y - n.m / 2, width: n.m, height: n.m, borderRadius: n.m / 2,
                backgroundImage: `radial-gradient(circle, rgba(${n.cor},${n.a}) 0%, rgba(${n.cor},${n.a * 0.4}) 45%, rgba(${n.cor},0) 70%)`,
              }),
              parado ? null : [n.estilo, css({ animationDuration: `${n.dur}s` })],
            ]}
          />
        ))}
      </View>

      {/* as ondas de voz: o estado do orbe regula a força de todas, com uma transição suave */}
      <View style={css({ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: FORCA[estado], transition: parado ? undefined : 'opacity 900ms cubic-bezier(0.16, 1, 0.3, 1)' })}>
        <View style={[StyleSheet.absoluteFill, parado ? null : [anim.respira, css({ transformOrigin: `${x0}px ${y0}px` })]]}>
          {Array.from({ length: ONDAS }, (_, i) => {
            const base = { position: 'absolute', left: x0 - D / 2, top: y0 - D / 2, width: D, height: D, borderRadius: D / 2 } as const;
            if (parado) {   // parado: duas ondas fixas, discretas
              return i < 2 ? <View key={i} style={css({ ...base, ...ANEL, transform: [{ scale: i === 0 ? 0.42 : 0.78 }], opacity: i === 0 ? 0.3 : 0.16 })} /> : null;
            }
            const atraso = css({ animationDelay: `${-(i * CICLO) / ONDAS}s` });
            return (
              <View key={i} style={[base, anim.ondaEscala, atraso]}>
                <View style={[css({ width: D, height: D, borderRadius: D / 2, ...ANEL }), anim.ondaOpacidade, atraso]} />
              </View>
            );
          })}
        </View>
      </View>

      {/* a poeira de luz: sobe balançando e some */}
      <View ref={poeiraRef} style={[StyleSheet.absoluteFill, suave]}>
        {poeira.map((p, i) => (
          <View
            key={i}
            style={[
              css({ position: 'absolute', left: p.x * W, top: p.y * H, width: p.tam, height: p.tam, borderRadius: p.tam, backgroundColor: p.lilas ? `rgb(${LILAS})` : '#ffffff' }),
              parado ? css({ opacity: CAMADAS[p.camada].pico * 0.5 }) : [GRAOS[p.camada], css({ animationDuration: `${p.dur.toFixed(1)}s`, animationDelay: `${p.atraso.toFixed(1)}s` })],
            ]}
          />
        ))}
      </View>
    </View>
  );
}
