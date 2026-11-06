/* A parte 3D da seção dos aparelhos: halter, kettlebell, barra com anilhas e banco, todos montados com formas simples.
   Este arquivo só é baixado quando a seção está perto da tela (import dinâmico em GymScene.tsx). */
import {
  AmbientLight, Color, CylinderGeometry, DirectionalLight, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, PMREMGenerator,
  PointLight, Scene, SphereGeometry, TorusGeometry, BoxGeometry, WebGLRenderer, SRGBColorSpace, ACESFilmicToneMapping,
  type BufferGeometry, type Object3D,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Cena = { nome: string; cor: string; luz: string };

/* um material de cada tipo, compartilhado por todas as peças: o mesmo visual com menos trocas de estado na placa de vídeo */
const MATERIAIS = {
  aco: new MeshStandardMaterial({ color: 0xc9ccd6, metalness: 1, roughness: 0.24 }),
  ferro: new MeshStandardMaterial({ color: 0x3a3a48, metalness: 0.9, roughness: 0.3 }),
  borracha: new MeshStandardMaterial({ color: 0x1a1a20, metalness: 0.15, roughness: 0.6 }),
  couro: new MeshStandardMaterial({ color: 0x2a2536, metalness: 0.1, roughness: 0.42 }),
};
const aco = () => MATERIAIS.aco;
const ferro = () => MATERIAIS.ferro;
const borracha = () => MATERIAIS.borracha;
const couro = () => MATERIAIS.couro;

const malha = (g: BufferGeometry, m: MeshStandardMaterial, pos: [number, number, number] = [0, 0, 0]) => {
  const o = new Mesh(g, m);
  o.position.set(...pos);
  return o;
};
const deitado = (o: Object3D) => { o.rotation.z = Math.PI / 2; return o; };   // cilindros nascem em pé: aqui ficam na horizontal

function halter(): Group {
  const g = new Group();
  const cabo = deitado(malha(new CylinderGeometry(0.085, 0.085, 1.3, 28), aco()));
  g.add(cabo);
  for (const x of [-0.27, 0.27]) g.add(deitado(malha(new CylinderGeometry(0.1, 0.1, 0.34, 28), ferro(), [x, 0, 0])));   // a pegada
  for (const lado of [-1, 1]) {
    g.add(deitado(malha(new CylinderGeometry(0.46, 0.46, 0.42, 6), ferro(), [lado * 0.78, 0, 0])));             // o bloco hexagonal
    g.add(deitado(malha(new CylinderGeometry(0.49, 0.49, 0.05, 6), borracha(), [lado * 0.78 - lado * 0.19, 0, 0])));
    g.add(deitado(malha(new CylinderGeometry(0.13, 0.13, 0.08, 28), aco(), [lado * 1.01, 0, 0])));
  }
  return g;
}

function kettlebell(): Group {
  const g = new Group();
  const corpo = malha(new SphereGeometry(0.62, 56, 40), ferro(), [0, -0.05, 0]);
  corpo.scale.set(1, 0.94, 1);
  g.add(corpo);
  g.add(malha(new CylinderGeometry(0.36, 0.42, 0.1, 40), ferro(), [0, -0.62, 0]));                       // a base reta
  const alca = malha(new TorusGeometry(0.36, 0.085, 22, 56, Math.PI), ferro(), [0, 0.42, 0]);
  g.add(alca);
  for (const x of [-0.36, 0.36]) g.add(malha(new CylinderGeometry(0.085, 0.085, 0.3, 22), ferro(), [x, 0.3, 0]));   // as pernas da alça
  return g;
}

function barra(): Group {
  const g = new Group();
  g.add(deitado(malha(new CylinderGeometry(0.05, 0.05, 3.6, 24), aco())));
  const discos: [number, number][] = [[0.64, 0.1], [0.52, 0.08], [0.4, 0.07]];
  for (const lado of [-1, 1]) {
    let x = 0.9;
    for (const [r, t] of discos) {
      g.add(deitado(malha(new CylinderGeometry(r, r, t, 56), ferro(), [lado * x, 0, 0])));
      g.add(deitado(malha(new CylinderGeometry(r - 0.045, r - 0.045, t + 0.012, 56), borracha(), [lado * x, 0, 0])));
      x += t + 0.015;
    }
    g.add(deitado(malha(new CylinderGeometry(0.1, 0.1, 0.12, 24), aco(), [lado * (x + 0.04), 0, 0])));   // a trava
  }
  return g;
}

function banco(): Group {
  const g = new Group();
  g.add(malha(new RoundedBoxGeometry(1.7, 0.17, 0.62, 5, 0.07), couro(), [0.18, 0.1, 0]));                 // o assento
  const encosto = malha(new RoundedBoxGeometry(1.0, 0.16, 0.62, 5, 0.07), couro(), [-1.0, 0.32, 0]);
  encosto.rotation.z = -0.32;
  g.add(encosto);
  for (const [x, z] of [[0.75, 0.2], [0.75, -0.2], [-0.45, 0.2], [-0.45, -0.2]] as const) g.add(malha(new BoxGeometry(0.07, 0.62, 0.07), ferro(), [x, -0.22, z]));
  for (const x of [0.75, -0.45]) g.add(malha(new BoxGeometry(0.07, 0.07, 0.66), ferro(), [x, -0.52, 0]));    // os pés
  g.add(malha(new BoxGeometry(1.35, 0.07, 0.07), ferro(), [0.15, -0.16, 0]));                              // a viga do meio
  return g;
}

export function iniciar(
  host: HTMLElement,
  secao: HTMLElement,
  cenas: Cena[],
  progresso: () => number,
  pintar: (q: number) => void,
  movimentoReduzido: boolean,
): () => void {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

  const cena = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // reflexos de um estúdio, para o metal parecer metal
  cena.environmentIntensity = 1.5;

  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.2, 9);

  const luzGeral = new AmbientLight(0xffffff, 0.55);
  const sol = new DirectionalLight(0xffffff, 2.4);
  sol.position.set(3, 5, 6);
  const contraluz = new PointLight(0xc4a8ff, 140, 22, 1.2);
  contraluz.position.set(-4, 2, -3);
  cena.add(luzGeral, sol, contraluz);

  const modelos = [halter(), kettlebell(), barra(), banco()];
  const bases = [1.0, 1.25, 0.95, 1.25];   // tamanho de cada um, para parecerem do mesmo peso na tela
  modelos.forEach((m) => { m.visible = false; cena.add(m); });

  let largura = 1, altura = 1, escala = 1;
  const ajustar = () => {
    const r = host.getBoundingClientRect();
    largura = Math.max(1, r.width); altura = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    escala = Math.min(1, camera.aspect * 0.95);   // em tela em pé, os aparelhos encolhem para caber
  };
  ajustar();
  const ro = new ResizeObserver(ajustar);
  ro.observe(host);

  const metade = () => Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;   // meia largura visível no centro da cena
  const cor = new Color();
  const luz = new Color();
  let visivel = true;
  const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }, { rootMargin: "100px" });
  io.observe(secao);

  let raf = 0;
  const t0 = performance.now();
  const quadro = (agora: number) => {
    raf = requestAnimationFrame(quadro);
    if (!visivel) return;
    const seg = cenas.length;
    const q = progresso() * (seg - 1);
    pintar(q);
    const tempo = (agora - t0) / 1000;
    const giro = movimentoReduzido ? 0.35 : 1;

    modelos.forEach((m, i) => {
      /* o aparelho entra pela direita, para no meio e sai pela esquerda; a rolagem manda */
      const t = (q - i) * 0.5 + 0.5;                       // 0 = entrando, 0.5 = no centro, 1 = saindo
      const dentro = t > -0.05 && t < 1.05;
      m.visible = dentro;
      if (!dentro) return;
      const x = -(ease(t) * 2 - 1) * metade() * 1.55;
      const pairar = movimentoReduzido ? 0 : Math.sin(tempo * 1.1 + i) * 0.06;
      m.position.set(x, pairar, 0);
      m.rotation.y = (t - 0.5) * Math.PI * 2.3 * giro + 0.5;
      m.rotation.x = Math.sin(t * Math.PI) * 0.35 * giro + 0.12;
      m.rotation.z = (t - 0.5) * 0.5 * giro;
      m.scale.setScalar(bases[i] * escala * 1.25);
    });

    /* a luz de trás acompanha a cor da cena */
    const i0 = Math.min(seg - 2, Math.max(0, Math.floor(q)));
    const f = Math.min(1, Math.max(0, q - i0));
    cor.set(cenas[i0].luz).lerp(luz.set(cenas[i0 + 1].luz), f);
    contraluz.color.copy(cor);
    renderer.render(cena, camera);
  };
  raf = requestAnimationFrame(quadro);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    modelos.forEach((m) => m.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    }));
    Object.values(MATERIAIS).forEach((mat) => mat.dispose());   // o three.js recria o que precisar se a cena voltar
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

function ease(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
