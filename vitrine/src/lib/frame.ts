/* Um único laço de animação para a página toda: cada componente se inscreve e recebe (t, dt).
   dt é o tempo em "quadros de 60 Hz", para que o decaimento não dependa da taxa de atualização. */
type Fn = (t: number, dt: number) => void;
const subs = new Set<Fn>();
let raf = 0, last = 0;

function tick(t: number) {
  raf = 0;
  const dt = last ? Math.min(60, Math.max(0.5, (t - last) / 16.667)) : 1;
  last = t;
  subs.forEach((f) => f(t, dt));
  if (subs.size) raf = requestAnimationFrame(tick);
  else last = 0;
}

export function onFrame(fn: Fn) {
  subs.add(fn);
  if (!raf) raf = requestAnimationFrame(tick);
  return () => { subs.delete(fn); };
}
