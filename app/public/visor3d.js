/* O visor 3D dos mascotes (visor3d.html). Carrega modelos/<chave>.glb (comprimido com Draco) e deixa girar com o dedo
   (ou o mouse) e aproximar com dois dedos (ou a rodinha). O three.js vem do jsDelivr, que o app já libera no CSP.

   O material imita o do Blender (brand/mascotes-voxel/voxel.py, material_voxel): a cor de cada bloco vem da malha e a
   linha escura fina entre os blocos é desenhada pelo próprio material, sem geometria a mais. Os vidros (o capacete do
   Browastronauta e a bolha do Browceleste) ficam transparentes. Ao terminar de carregar, avisa o app ("pronto"). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/DRACOLoader.js/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js/+esm';

const VOXEL = 0.02;   // o lado de um bloco, em metros (o mesmo de voxel.py)
const params = new URLSearchParams(location.search);
const chave = params.get('m') ?? '';
const cor = /^[0-9a-f]{6}$/i.test(params.get('c') ?? '') ? `#${params.get('c')}` : '#c084fc';
const aviso = document.getElementById('aviso');
const dica = document.getElementById('dica');
document.documentElement.style.setProperty('--cor', cor);
// a tela do mascote (desde 2026-11-27) pinta o próprio fundo na cor do mascote e põe o nome em cima e os repetidos embaixo:
// t=<cor do texto, sem #>, pt e pb (as folgas de cima e de baixo, em px, onde o mascote não deve ficar) e b=0 (sem o brilho)
const corTexto = /^[0-9a-f]{6}$/i.test(params.get('t') ?? '') ? `#${params.get('t')}` : null;
if (corTexto) document.documentElement.style.setProperty('--texto', corTexto);
const folga = (k) => Math.min(400, Math.max(0, Number(params.get(k)) || 0));
const folgaCima = folga('pt'), folgaBaixo = folga('pb');
document.documentElement.style.setProperty('--pb', `${folgaBaixo}px`);
document.documentElement.style.setProperty('--desvio', `${(folgaCima - folgaBaixo) / 2}px`);
if (params.get('b') === '0') document.getElementById('brilho')?.remove();

function avisarApp(msg) {
  try { window.ReactNativeWebView?.postMessage(msg); } catch { /* fora do app */ }
  try { if (window.parent !== window) window.parent.postMessage({ visor3d: msg }, location.origin); } catch { /* sem quadro */ }
}

const DRACO = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const pre = params.get('pre');
if (pre !== null) {
  // o pré-carregamento (visor3d.html?pre=<chaves>): a aba Coleção abre esta página escondida para o three.js, o
  // decodificador e os modelos da conta já estarem no cache quando a pessoa tocar num mascote (pedido do dono: o 3D
  // abrir na hora, sem ficar carregando). Não desenha nada.
  aviso.remove(); dica.remove();
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO);
  draco.preload();
  for (const k of pre.split(',').filter((k) => /^\d-\d{1,2}$/.test(k))) fetch(`modelos/${k}.glb`).catch(() => undefined);
} else if (!/^\d-\d{1,2}$/.test(chave)) {
  aviso.textContent = 'Mascote não encontrado.';
} else {
  iniciar().catch(() => { aviso.textContent = 'Não foi possível carregar o mascote. Confira a internet.'; avisarApp('erro'); });
}

async function iniciar() {
  const tela = document.getElementById('tela');
  const render = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: 'high-performance' });
  render.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  render.outputColorSpace = THREE.SRGBColorSpace;
  render.toneMapping = THREE.NoToneMapping;

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);

  // a luz: uma principal da frente, à esquerda e de cima (como a de vitrine), uma que abre a sombra, contornos atrás e o céu
  cena.add(new THREE.HemisphereLight(0xfff4ec, 0x3a3058, 1.7));
  const chaveLuz = new THREE.DirectionalLight(0xfff3e6, 2.9); chaveLuz.position.set(-2, 3, 2.5); cena.add(chaveLuz);
  const preenche = new THREE.DirectionalLight(0xdfe6ff, 1.1); preenche.position.set(2.6, 1.4, 2.4); cena.add(preenche);
  const recorte = new THREE.DirectionalLight(0xffd9bf, 1.2); recorte.position.set(0, 2.2, -3); cena.add(recorte);
  // as luzes giram junto com a câmera: o mascote fica sempre bem iluminado, de qualquer lado
  const luzes = [chaveLuz, preenche, recorte].map((l) => ({ l, p: l.position.clone() }));

  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(`modelos/${chave}.glb`);
  const modelo = gltf.scene;

  modelo.traverse((o) => {
    if (!o.isMesh) return;
    const vidro = /vidro|janela/i.test(o.name) || /vidro|janela/i.test(o.parent?.name ?? '');
    o.material = vidro ? materialVidro(/janela/i.test(o.name)) : materialBloco();
    if (vidro) o.renderOrder = 2;
  });
  cena.add(modelo);

  // enquadra: o mascote inteiro no meio, com folga
  const caixa = new THREE.Box3().setFromObject(modelo);
  const tam = caixa.getSize(new THREE.Vector3());
  const centro = caixa.getCenter(new THREE.Vector3());
  const raio = Math.max(tam.y, tam.x, tam.z) * 0.62;
  const controles = new OrbitControls(camera, tela);
  controles.target.copy(centro);
  controles.enablePan = false;
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.rotateSpeed = 0.9;
  controles.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  controles.autoRotateSpeed = 1.6;
  controles.minPolarAngle = 0.25;
  controles.maxPolarAngle = Math.PI - 0.35;

  function ajustar() {
    const w = window.innerWidth, h = window.innerHeight;
    render.setSize(w, h, false);
    camera.aspect = w / h;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    // o mascote cabe no espaço entre as folgas (pt e pb) e fica no meio dele
    const hUtil = Math.max(h * 0.5, h - folgaCima - folgaBaixo);
    const vFovUtil = 2 * Math.atan(Math.tan(vFov / 2) * (hUtil / h));
    const dist = raio / Math.sin(Math.min(vFovUtil, hFov) / 2);
    if (folgaCima !== folgaBaixo) camera.setViewOffset(w, h, 0, (folgaBaixo - folgaCima) / 2, w, h);
    else camera.clearViewOffset();
    controles.minDistance = dist * 0.45;
    controles.maxDistance = dist * 1.8;
    camera.near = dist / 50; camera.far = dist * 6;
    camera.updateProjectionMatrix();
    return dist;
  }
  const dist = ajustar();
  camera.position.set(centro.x + dist * 0.38, centro.y + dist * 0.16, centro.z + dist * 0.91);
  controles.update();
  window.addEventListener('resize', ajustar);

  // ao tocar, para de girar sozinho e some a dica; volta a girar devagar depois de um tempo parado
  let volta = 0;
  controles.addEventListener('start', () => {
    controles.autoRotate = false; dica.classList.add('some'); clearTimeout(volta);
  });
  controles.addEventListener('end', () => {
    clearTimeout(volta);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) volta = setTimeout(() => { controles.autoRotate = true; }, 4000);
  });
  setTimeout(() => dica.classList.add('some'), 5000);

  aviso.remove();
  avisarApp('pronto');
  render.setAnimationLoop(() => {
    controles.update();
    const giro = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(camera.matrixWorld));
    for (const { l, p } of luzes) l.position.copy(p).applyQuaternion(giro);
    render.render(cena, camera);
  });
}

/* o material dos blocos: a cor de cada bloco e a junta escura entre eles (como no Blender: perto da borda do bloco, até
   7% dele, a cor escurece até 62%; na face de cima de um bloco a borda do eixo da normal não conta) */
function materialBloco() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uVoxel = { value: VOXEL };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosL;\nvarying vec3 vNorL;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosL = position;\nvNorL = normal;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uVoxel;\nvarying vec3 vPosL;\nvarying vec3 vNorL;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        // no glTF o Y é o alto (o Z do Blender) e o Z é o -Y do Blender: as juntas ficam nas mesmas posições de lá
        vec3 f = fract(vPosL / uVoxel + vec3(0.5, 0.0, 0.5));
        vec3 t = min(min(f, 1.0 - f) / 0.07, vec3(1.0));
        vec3 n = abs(normalize(vNorL));
        t = t + n - n * t;
        diffuseColor.rgb *= mix(0.62, 1.0, t.x * t.y * t.z);`);
  };
  return m;
}

function materialVidro(janela) {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true, transparent: true, opacity: janela ? 0.06 : 0.16, roughness: 0.15, metalness: 0,
    clearcoat: 0.6, depthWrite: false, side: THREE.DoubleSide,
  });
}
