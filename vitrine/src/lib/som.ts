/* O som de notificação do RONDIN (quando ele aparece no canto da tela): duas notas curtas e suaves, sintetizadas na hora
   pelo Web Audio, sem arquivo para baixar.
   Os navegadores só deixam uma página tocar som depois que a pessoa interage com ela (um clique, um toque, uma tecla);
   antes disso o RONDIN aparece em silêncio. Rolar a página não conta como interação. */
let audio: AudioContext | null = null;

function liberar() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;   // navegador sem Web Audio: segue sem som
  }
}
if (typeof window !== "undefined") {
  for (const ev of ["pointerdown", "keydown", "touchend"]) addEventListener(ev, liberar, { passive: true });
}

export function tocarNotificacao() {
  if (!audio || audio.state !== "running" || document.hidden) return;
  const agora = audio.currentTime;
  const saida = audio.createGain();
  saida.gain.value = 0.16;
  saida.connect(audio.destination);
  /* duas notas subindo (Mi e Si), cada uma com um ataque rápido e um fim que some devagar, como um "plim" */
  [[659.25, 0], [987.77, 0.11]].forEach(([freq, atraso]) => {
    const inicio = agora + atraso;
    const osc = audio!.createOscillator();
    const env = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, inicio);
    env.gain.linearRampToValueAtTime(1, inicio + 0.012);
    env.gain.exponentialRampToValueAtTime(0.001, inicio + 0.55);
    osc.connect(env).connect(saida);
    osc.start(inicio);
    osc.stop(inicio + 0.6);
  });
}
