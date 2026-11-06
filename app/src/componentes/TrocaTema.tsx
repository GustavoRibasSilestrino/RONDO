/* Troca de tema com uma gosma toda preta: ela escorre pela tela inteira, de cima para baixo, cobre tudo, o tema muda por baixo e ela escorre para fora,
   deixando a tela já com a aparência nova. `useTrocaTema()` devolve a função que dispara a troca. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useLoja } from '../estado/loja';
import { useMovimentoReduzido } from '../lib/movimento';
import type { TemaId } from '../tema';

const DURACAO = 2300;      // a travessia inteira, de cima para baixo

const Contexto = createContext<(para: TemaId) => void>(() => {});
export const useTrocaTema = () => useContext(Contexto);

/* números sempre iguais para a mesma semente: as gotas não mudam de lugar entre um quadro e outro */
const sorteio = (semente: number) => { let v = semente; return () => (v = (v * 16807) % 2147483647) / 2147483647; };
const suave = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const vaiEVem = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };

type Gota = { x: number; w: number; len: number; atraso: number; raio: number };
function criarGotas(largura: number, n: number, semente: number, maior: number): Gota[] {
  const r = sorteio(semente);
  return Array.from({ length: n }, (_, i) => ({ x: ((i + 0.1 + r() * 0.8) * largura) / n, w: 26 + r() * 46, len: maior * (0.2 + r() * 0.8), atraso: r() * 0.35, raio: 0 }))
    .map((g) => ({ ...g, raio: g.w * 0.26 + 3 + r() * 5 }));
}

/* a borda da gosma balança devagar, como líquido grosso */
const onda = (x: number, tempo: number, fase: number) => 15 * Math.sin(x / 74 + tempo * 5 + fase) + 8 * Math.sin(x / 33 - tempo * 8 + fase * 2);

/* uma gota presa à borda: o pescoço abre em leque no alto e termina numa bolinha. `dir` 1 = para baixo, -1 = para cima. */
function pescoco(x: number, y0: number, comprimento: number, g: Gota, dir: 1 | -1): string {
  const meia = g.w * 0.26;
  const leque = g.w * 1.15;
  const gancho = Math.min(comprimento * 0.55, 64);
  const yPonta = y0 + dir * comprimento;
  return `M${x - leque} ${y0 - dir * 3}Q${x - meia} ${y0} ${x - meia} ${y0 + dir * gancho}L${x - meia} ${yPonta}L${x + meia} ${yPonta}L${x + meia} ${y0 + dir * gancho}Q${x + meia} ${y0} ${x + leque} ${y0 - dir * 3}Z`;
}

/* gosma toda preta: desce pela tela inteira como líquido grosso, com gotas que se esticam na frente e fios que ficam para trás */
function Onda({ aoMeio, aoFim }: { aoMeio: () => void; aoFim: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const [progresso, setProgresso] = useState(0);
  const altura = H * 1.2;                                  // a gosma é mais alta que a tela: cobre tudo no meio da travessia
  const frente = useMemo(() => criarGotas(W, Math.max(9, Math.round(W / 70)), 7, H * 0.3), [W, H]);
  const fios = useMemo(() => criarGotas(W, Math.max(7, Math.round(W / 95)), 23, H * 0.22), [W, H]);
  const trocou = useRef(false);

  useEffect(() => {
    const inicio = Date.now();
    let quadro = 0;
    const passo = () => {
      const p = Math.min(1, (Date.now() - inicio) / DURACAO);
      setProgresso(p);
      if (p >= 1) { aoFim(); return; }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = progresso;
  const maiorFrente = H * 0.3;
  const baixo = -maiorFrente + (H + altura + maiorFrente * 2) * vaiEVem(p);   // a borda da frente
  const cima = baixo - altura;                                                // a borda de trás
  if (!trocou.current && baixo >= H * 1.04) { trocou.current = true; aoMeio(); }

  const passoX = 12;
  let corpoCima = '';
  let corpoBaixo = '';
  for (let x = -24; x <= W + 24; x += passoX) {
    corpoCima += `${x === -24 ? 'M' : 'L'}${x} ${(cima + onda(x, p, 1.7)).toFixed(1)} `;
  }
  for (let x = W + 24; x >= -24; x -= passoX) corpoBaixo += `L${x} ${(baixo + onda(x, p, 0)).toFixed(1)} `;

  return (
    <View style={st.camada} pointerEvents="auto">
      <Svg width={W} height={H}>
        <Path d={`${corpoCima}${corpoBaixo}Z`} fill="#000000" />
        {frente.map((g, i) => {
          const L = g.len * suave((p - g.atraso) / 0.5) * (0.85 + 0.15 * Math.sin(p * 9 + i));
          const y0 = baixo + onda(g.x, p, 0);
          return L > 2 ? (
            <React.Fragment key={`f${i}`}>
              <Path d={pescoco(g.x, y0, L, g, 1)} fill="#000000" />
              <Circle cx={g.x} cy={y0 + L} r={g.raio} fill="#000000" />
            </React.Fragment>
          ) : null;
        })}
        {fios.map((g, i) => {
          const L = g.len * suave((p - 0.25 - g.atraso * 0.5) / 0.6);
          const y0 = cima + onda(g.x, p, 1.7);
          return L > 2 ? (
            <React.Fragment key={`t${i}`}>
              <Path d={pescoco(g.x, y0, L, g, -1)} fill="#000000" />
              <Circle cx={g.x} cy={y0 - L} r={g.raio * 0.8} fill="#000000" />
            </React.Fragment>
          ) : null;
        })}
      </Svg>
    </View>
  );
}

export function TrocaTemaProvider({ children }: { children: React.ReactNode }) {
  const { commit } = useLoja();
  const reduzido = useMovimentoReduzido();
  const [onda, setOnda] = useState<TemaId | null>(null);
  const trocando = useRef(false);

  const trocar = useCallback((para: TemaId) => {
    if (trocando.current) return;
    if (reduzido) { commit((e) => { e.tema = para; }); return; }   // sem movimento: troca direto
    trocando.current = true;
    setOnda(para);
  }, [commit, reduzido]);

  return (
    <Contexto.Provider value={trocar}>
      {children}
      {onda ? (
        <Onda
          aoMeio={() => commit((e) => { e.tema = onda; })}
          aoFim={() => { setOnda(null); trocando.current = false; }}
        />
      ) : null}
    </Contexto.Provider>
  );
}

const st = StyleSheet.create({
  camada: { ...StyleSheet.absoluteFill, zIndex: 3000, overflow: 'hidden' },
});
