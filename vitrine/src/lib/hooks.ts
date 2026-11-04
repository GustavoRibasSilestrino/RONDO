import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/* true quando a consulta de mídia vale; acompanha mudanças (girar o aparelho, redimensionar) */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => matchMedia(query).matches,
    () => false,
  );
}

/* vira true na primeira vez que o elemento entra na tela */
export function useSeen<T extends Element>(threshold: number, off = false) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (off || !el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, off]);
  return [ref, seen] as const;
}
