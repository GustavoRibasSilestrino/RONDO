/* Identificador curto de uma frase (FNV-1a de 32 bits em hexadecimal). O app e o gerador de vozes usam a mesma conta, então
   o arquivo de áudio de uma frase tem sempre o mesmo nome. Sem dependências: roda no app e no Node. */
export function hashFala(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
