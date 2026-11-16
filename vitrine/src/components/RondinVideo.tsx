import { useEffect, useRef } from "react";
import poster3d from "../assets/rondin/rondin-3d.jpg";
import video3d from "../assets/rondin/rondin-3d.mp4";

/* O RONDIN em 3D (o vídeo feito no Blender, brand/rondin-3d/, desde 2026-11-16), usado no recado, nas pastas do treino e no
   RONDIN flutuante: a esfera girando, em laço, sem som. O fundo preto do vídeo some com `mix-blend-mode: screen` (classe
   .rondin-video, em base.css), então só os pontos aparecem sobre o fundo escuro. Com `tocando` falso, ou para quem pediu
   menos movimento no sistema, fica parado. */
export function RondinVideo({ tamanho, tocando = true, className }: { tamanho: number; tocando?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const menos = matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => { if (menos.matches || !tocando) v.pause(); else v.play().catch(() => {}); };
    aplicar();
    menos.addEventListener("change", aplicar);
    return () => menos.removeEventListener("change", aplicar);
  }, [tocando]);
  return (
    <video ref={ref} className={`rondin-video${className ? ` ${className}` : ""}`} src={video3d} poster={poster3d}
      width={tamanho} height={tamanho} style={{ width: tamanho, height: tamanho }}
      muted loop playsInline preload="metadata" aria-hidden="true" />
  );
}
