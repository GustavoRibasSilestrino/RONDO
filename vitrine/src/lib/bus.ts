/* A linha do tempo do dia registra aqui como rolar até um momento; o menu só chama. */
let fn: ((name: string) => void) | null = null;
export const setGoMoment = (f: ((name: string) => void) | null) => { fn = f; };
export const goMoment = (name: string) => fn?.(name);
