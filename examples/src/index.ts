import {
  ACESFilmicToneMapping,
  PerspectiveCamera,
  WebGLRenderer,
  sRGBEncoding
} from 'three';

import { SkinDemo } from './demos/skin-demo';

const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;

const camera = new PerspectiveCamera();

const renderer = new WebGLRenderer({ canvas });
renderer.physicallyCorrectLights = true;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
renderer.toneMappingExposure = 1.0;
renderer.setAnimationLoop((delta: number) => {
  demo.update();
  demo.render(renderer);
});

const demo = new SkinDemo(renderer, camera);

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  
  renderer.setSize(w, h, false);
}
window.onresize = resize;

resize();
