// A 3D piano keyboard drawn with three.js.
// Keys can be highlighted with colors and labels, pressed (animated), and clicked/tapped.
import * as THREE from 'three';
import { isBlack } from './theory.js';

export const COLORS = {
  white: 0xf8f5ee,
  black: 0x1d1d22,
  scale: 0x8ecae6, // soft blue: notes that belong to the scale/chord
  tonic: 0xff9f1c, // orange: the "home" note
  target: 0xffd23f, // yellow: "play this one next"
  correct: 0x4caf50,
  wrong: 0xe63946,
  pressed: 0xb8c0cc,
  dim: 0xc7b8ea,
};

const WHITE_W = 1;
const WHITE_L = 6;
const WHITE_H = 0.6;
const BLACK_W = 0.58;
const BLACK_L = 3.8;
const BLACK_H = 0.5;

function makeLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, tex };
}

function drawLabel(label, text, color, sub) {
  const ctx = label.canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  if (text) {
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('/');
    if (lines.length > 1) {
      // Black keys with two names (C♯/D♭): one name per line.
      ctx.font = 'bold 46px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(lines[0], 64, 38);
      ctx.fillText(lines[1], 64, 92);
    } else {
      const size = text.length > 3 ? 44 : text.length > 2 ? 58 : 76;
      ctx.font = `bold ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.fillText(text, 64, sub ? 46 : 66);
      if (sub) {
        ctx.font = 'bold 40px system-ui, sans-serif';
        ctx.fillText(sub, 64, 104);
      }
    }
  }
  label.tex.needsUpdate = true;
}

function makeTextSprite(text, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.renderOrder = 10;
  return sprite;
}

export class Piano3D {
  constructor(container, { low = 60, high = 84 } = {}) {
    this.container = container;
    this.low = low;
    this.high = high;
    this.keys = new Map(); // midi -> key record
    this.onKeyDown = () => {};
    this.onKeyUp = () => {};
    this.baseLabels = new Map(); // midi -> text shown when key has no highlight label
    this.stepSprites = [];

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '3D piano keyboard. Click or tap keys to play.');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-4, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -12; sc.right = 12; sc.top = 8; sc.bottom = -8;
    this.scene.add(sun);

    this.build();
    this.bindPointer();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  build() {
    let whiteIndex = 0;
    const whiteX = new Map();
    for (let m = this.low; m <= this.high; m++) {
      if (!isBlack(m)) whiteX.set(m, whiteIndex++ * WHITE_W);
    }
    this.width = whiteIndex * WHITE_W;
    this.offsetX = -this.width / 2 + WHITE_W / 2;

    // Body of the piano behind and under the keys.
    const wood = new THREE.MeshStandardMaterial({ color: 0x3b2418, roughness: 0.55 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(this.width + 1.2, 1.8, 1.4), wood);
    back.position.set(0, 0.6, -WHITE_L / 2 - 0.7);
    back.receiveShadow = true;
    this.scene.add(back);
    const base = new THREE.Mesh(new THREE.BoxGeometry(this.width + 1.2, 0.4, WHITE_L + 1.4), wood);
    base.position.set(0, -0.25, -0.7);
    base.receiveShadow = true;
    this.scene.add(base);
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, WHITE_L + 1.4), wood);
      cheek.position.set(side * (this.width / 2 + 0.3), 0.4, -0.7);
      cheek.castShadow = true;
      this.scene.add(cheek);
    }
    const felt = new THREE.Mesh(new THREE.BoxGeometry(this.width, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0x9b1c1c, roughness: 1 }));
    felt.position.set(0, WHITE_H + 0.1, -WHITE_L / 2 - 0.05);
    this.scene.add(felt);

    const whiteGeo = new THREE.BoxGeometry(WHITE_W - 0.05, WHITE_H, WHITE_L);
    const blackGeo = new THREE.BoxGeometry(BLACK_W, BLACK_H, BLACK_L);

    for (let m = this.low; m <= this.high; m++) {
      const black = isBlack(m);
      const x = black ? whiteX.get(m - 1) + WHITE_W / 2 : whiteX.get(m);
      const pivot = new THREE.Group();
      pivot.position.set(this.offsetX + x, 0, -WHITE_L / 2);
      const mat = new THREE.MeshStandardMaterial({
        color: black ? COLORS.black : COLORS.white,
        roughness: black ? 0.35 : 0.4,
        metalness: 0,
        emissive: 0x000000,
      });
      const mesh = new THREE.Mesh(black ? blackGeo : whiteGeo, mat);
      if (black) mesh.position.set(0, WHITE_H + BLACK_H / 2 - 0.05, BLACK_L / 2);
      else mesh.position.set(0, WHITE_H / 2, WHITE_L / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.midi = m;
      pivot.add(mesh);

      const label = makeLabelTexture();
      const size = black ? 0.56 : 0.92;
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({ map: label.tex, transparent: true, depthWrite: false }),
      );
      plane.rotation.x = -Math.PI / 2;
      if (black) plane.position.set(0, WHITE_H + BLACK_H - 0.05 + 0.002, BLACK_L - 0.5);
      else plane.position.set(0, WHITE_H + 0.002, WHITE_L - 0.65);
      plane.userData.midi = m;
      pivot.add(plane);

      this.scene.add(pivot);
      this.keys.set(m, {
        midi: m, black, pivot, mesh, mat, label, x: this.offsetX + x,
        pressed: false, angle: 0, highlight: null, flash: null,
      });
      this.refreshKey(m);
    }
    this.pickables = [...this.keys.values()].flatMap((k) => [k.mesh, k.pivot.children[1]]);
  }

  // --- Public API -------------------------------------------------------------

  // highlights: Map or object of midi -> { color, label, sub }
  setHighlights(highlights = {}) {
    const entries = highlights instanceof Map ? highlights : new Map(Object.entries(highlights).map(([k, v]) => [Number(k), v]));
    for (const k of this.keys.values()) k.highlight = null;
    for (const [m, h] of entries) {
      const k = this.keys.get(m);
      if (k) k.highlight = h;
    }
    for (const m of this.keys.keys()) this.refreshKey(m);
  }

  setHighlight(midi, h) {
    const k = this.keys.get(midi);
    if (!k) return;
    k.highlight = h;
    this.refreshKey(midi);
  }

  clear() {
    this.setHighlights({});
    this.setSteps([]);
  }

  // Text shown on keys that have no highlight label (note names / computer keys / nothing).
  setBaseLabels(fn) {
    this.baseLabels.clear();
    for (const m of this.keys.keys()) {
      const t = fn ? fn(m) : '';
      if (t) this.baseLabels.set(m, t);
    }
    for (const m of this.keys.keys()) this.refreshKey(m);
  }

  // Temporarily color a key (e.g. green for right, red for wrong).
  flash(midi, color, ms = 600) {
    const k = this.keys.get(midi);
    if (!k) return;
    clearTimeout(k.flashTimer);
    k.flash = color;
    this.refreshKey(midi);
    k.flashTimer = setTimeout(() => {
      k.flash = null;
      this.refreshKey(midi);
    }, ms);
  }

  press(midi) {
    const k = this.keys.get(midi);
    if (k) k.pressed = true;
  }

  release(midi) {
    const k = this.keys.get(midi);
    if (k) k.pressed = false;
  }

  // Briefly press a key down and let it come back up (for playback/mic feedback).
  tap(midi, ms = 250) {
    const k = this.keys.get(midi);
    if (!k) return;
    k.pressed = true;
    clearTimeout(k.tapTimer);
    k.tapTimer = setTimeout(() => { k.pressed = false; }, ms);
  }

  // Floating W / H bubbles between pairs of keys. steps: [{from, to, text, color}]
  setSteps(steps) {
    for (const s of this.stepSprites) {
      this.scene.remove(s);
      s.material.map.dispose();
      s.material.dispose();
    }
    this.stepSprites = [];
    steps.forEach((st, i) => {
      const a = this.keys.get(st.from);
      const b = this.keys.get(st.to);
      if (!a || !b) return;
      const sprite = makeTextSprite(st.text, st.color || (st.text === 'H' ? '#e76f51' : '#2a9d8f'));
      // Alternate heights so neighbouring bubbles don't overlap.
      const lift = steps.length > 2 && i % 2 ? 0.75 : 0;
      sprite.position.set((a.x + b.x) / 2, 2.0 + lift, -WHITE_L / 2 - 0.3 - lift * 0.4);
      sprite.scale.set(1.1, 1.1, 1);
      this.scene.add(sprite);
      this.stepSprites.push(sprite);
    });
  }

  // --- Internals ---------------------------------------------------------------

  refreshKey(midi) {
    const k = this.keys.get(midi);
    const h = k.highlight;
    let color = k.black ? COLORS.black : COLORS.white;
    if (h && h.color != null) color = h.color;
    if (k.flash != null) color = k.flash;
    k.mat.color.setHex(color);
    const lit = color !== COLORS.black && color !== COLORS.white;
    k.mat.emissive.setHex(lit ? color : 0x000000);
    k.mat.emissiveIntensity = lit ? 0.25 : 0;

    const text = h && h.label != null ? h.label : this.baseLabels.get(midi) || '';
    const onDark = k.black && !lit;
    const textColor = onDark ? '#f1f1f1' : h && h.label != null ? '#111111' : '#555555';
    drawLabel(k.label, text, textColor, h && h.sub);
  }

  bindPointer() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const active = new Map(); // pointerId -> midi
    const pick = (e) => {
      const r = el.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, this.camera);
      const hit = ray.intersectObjects(this.pickables, false)[0];
      return hit ? hit.object.userData.midi : null;
    };
    el.addEventListener('pointerdown', (e) => {
      const m = pick(e);
      if (m == null) return;
      e.preventDefault();
      active.set(e.pointerId, m);
      this.press(m);
      this.onKeyDown(m);
    });
    const up = (e) => {
      const m = active.get(e.pointerId);
      if (m == null) return;
      active.delete(e.pointerId);
      this.release(m);
      this.onKeyUp(m);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('pointermove', (e) => {
      el.style.cursor = pick(e) != null ? 'pointer' : 'default';
    });
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Pull the camera back far enough that the whole keyboard fits the width.
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const tilt = 0.9; // radians above horizontal
    const needW = this.width + 1.8;
    const distW = needW / 2 / Math.tan(hFov / 2);
    const depth = (WHITE_L + 1.4) * Math.sin(tilt) + 3.2 * Math.cos(tilt);
    const distH = depth / 2 / Math.tan(vFov / 2);
    const dist = Math.max(distW, distH) * 1.04;
    const look = new THREE.Vector3(0, 0.6, -0.4);
    this.camera.position.set(0, look.y + Math.sin(tilt) * dist, look.z + Math.cos(tilt) * dist);
    this.camera.lookAt(look);
    this.camera.updateProjectionMatrix();
  }

  tick() {
    for (const k of this.keys.values()) {
      const target = k.pressed ? (k.black ? 0.045 : 0.035) : 0;
      k.angle += (target - k.angle) * 0.35;
      k.pivot.rotation.x = k.angle;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
