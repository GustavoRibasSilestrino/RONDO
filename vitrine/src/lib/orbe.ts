/* A esfera de pontos do RONDIN (a mesma conta do app, em app/src/lib/orbe.ts, e do 3D em brand/rondin-3d), em versão
   pequena para o site: desenha num canvas, com o miolo escuro e o brilho dos pontos acesos. */

export function esfera(n: number): Float32Array {
  const p = new Float32Array(n * 3);
  const ouro = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const f = i * ouro;
    p[i * 3] = Math.cos(f) * r;
    p[i * 3 + 1] = y;
    p[i * 3 + 2] = Math.sin(f) * r;
  }
  return p;
}

const cor = (branco: number, luz: number) => {
  const r = Math.min(255, Math.round(138 + 58 * luz + 59 * branco));
  const g = Math.min(255, Math.round(61 + 107 * luz + 87 * branco));
  return `rgb(${r},${g},255)`;
};

/* um quadro: t em segundos, `amp` o quanto ele "respira" (0 parado, 1 falando), tamanho em px do canvas */
export function desenharOrbe(ctx: CanvasRenderingContext2D, pts: Float32Array, t: number, amp: number, tamanho: number) {
  const n = pts.length / 3, c = tamanho / 2, R = tamanho * 0.4;
  const giro = t * 0.34, cg = Math.cos(giro), sg = Math.sin(giro);
  const incl = 0.42, ci = Math.cos(incl), si = Math.sin(incl);
  const onda = 0.05 + 0.2 * amp;
  /* o tamanho do ponto acompanha o espaço entre eles: com poucos pontos (esfera pequena), pontos maiores */
  const escala = (R * Math.sqrt((4 * Math.PI) / n)) / 16 * 1.45;
  const pequeno = tamanho < 80;
  ctx.clearRect(0, 0, tamanho, tamanho);
  const frente: number[] = [];
  const desenhar = (i: number, x: number, y: number, z: number) => {
    const volume = 1 + onda * Math.sin(y * 5.5 + x * 2 + t * (1.8 + amp * 2.6));
    const xr = (x * cg + z * sg) * volume, zr = (-x * sg + z * cg) * volume, yr = y * volume;
    const y2 = yr * ci - zr * si, z2 = yr * si + zr * ci;
    const faixa = 0.5 + 0.5 * Math.sin(y * 8.5 + x * 2.2 + t * 1.5 + amp * 1.5), luz = faixa * faixa;
    const prof = (z2 + 1.4) / 2.4;
    const op = Math.min(1, (z2 > 0 ? (pequeno ? 0.38 : 0.26) : 0.07) + 0.9 * luz * prof);
    const branco = luz > 0.82 ? Math.min(1, (luz - 0.82) * 5.5) : 0;
    ctx.globalAlpha = Math.min(1, op * (pequeno ? 1.6 : 1.25));
    ctx.fillStyle = cor(branco, op);
    ctx.beginPath();
    const raio = Math.max(0.45, (0.55 + 2.1 * luz * prof) * escala);
    ctx.arc(c + xr * R, c + y2 * R, raio, 0, Math.PI * 2);
    ctx.fill();
    if (z2 > 0 && luz > 0.55) {   // o brilho em volta dos acesos, como a luz do 3D
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (luz - 0.55) * 0.5;
      ctx.fillStyle = "rgb(176,128,255)";
      ctx.beginPath();
      ctx.arc(c + xr * R, c + y2 * R, raio * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    return z2 > 0;
  };
  /* primeiro os pontos de trás, depois o miolo escuro, depois os da frente */
  for (let i = 0; i < n; i += 1) {
    const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
    const z2 = (y * si) + ((-x * sg + z * cg) * ci);
    if (z2 > 0) { frente.push(i); continue; }
    desenhar(i, x, y, z);
  }
  ctx.globalAlpha = 1;
  const miolo = ctx.createRadialGradient(c, c - R * 0.25, 0, c, c, R * 0.97);
  miolo.addColorStop(0, `rgba(40,20,82,${pequeno ? 0.5 : 0.72})`);
  miolo.addColorStop(0.92, `rgba(10,6,22,${pequeno ? 0.55 : 0.8})`);
  miolo.addColorStop(1, "rgba(5,3,10,0)");
  ctx.fillStyle = miolo;
  ctx.beginPath();
  ctx.arc(c, c, R * 0.97, 0, Math.PI * 2);
  ctx.fill();
  for (const i of frente) desenhar(i, pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
  ctx.globalAlpha = 1;
}
