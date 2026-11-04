/* Quem pede "reduzir movimento" no aparelho vê as telas prontas, sem entradas animadas nem laços infinitos. */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (vivo) setReduzido(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduzido(v));
    return () => { vivo = false; sub.remove(); };
  }, []);
  return reduzido;
}
