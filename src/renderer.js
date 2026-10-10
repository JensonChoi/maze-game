import * as THREE from 'three';

const COLORS = { floor: 0x283022, wall: 0x74845a, trail: 0x425035, lime: 0xd8fa79 };

export class MazeRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 200);
    this.camera.position.set(0, 24, 10);
    this.camera.lookAt(0, 0, 0);
    this.animation = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.canvas = this.renderer.domElement;
    } catch {
      // Keep every level playable on devices without WebGL.
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
    }
    this.canvas.setAttribute('aria-hidden', 'true');
    container.append(this.canvas);
    const ambient = new THREE.AmbientLight(0xeaf1d9, 2.2);
    const light = new THREE.DirectionalLight(0xf5ffde, 3);
    light.position.set(-9, 22, 8);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 60 });
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.025;
    this.scene.add(ambient, light);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
  }

  attach(container) {
    this.observer.unobserve(this.container);
    this.container = container;
    container.append(this.canvas);
    this.observer.observe(container);
    this.resize();
  }

  build(maze) {
    cancelAnimationFrame(this.animation);
    if (this.board) {
      const geometries = new Set();
      const materials = new Set();
      this.board.traverse(child => {
        if (child.geometry) geometries.add(child.geometry);
        if (child.material) materials.add(child.material);
        if (child.isInstancedMesh) child.dispose();
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      this.scene.remove(this.board);
    }
    this.maze = maze;
    this.position = maze.start;
    this.visited = new Set([maze.start]);
    if (!this.renderer) { this.resize(); return; }
    this.board = new THREE.Group();
    this.scene.add(this.board);
    const size = maze.size;
    const offset = (size - 1) / 2;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(size + 0.8, 0.22, size + 0.8), new THREE.MeshStandardMaterial({ color: 0x323e26, roughness: 0.88 }));
    floor.position.y = -0.16;
    floor.receiveShadow = true;
    this.board.add(floor);
    this.tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.96, 0.035, 0.96), new THREE.MeshStandardMaterial({ roughness: 1 }), size * size);
    this.tiles.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let cell = 0; cell < maze.cells.length; cell++) {
      dummy.position.set(cell % size - offset, -0.025, Math.floor(cell / size) - offset);
      dummy.updateMatrix();
      this.tiles.setMatrixAt(cell, dummy.matrix);
      this.tiles.setColorAt(cell, new THREE.Color(cell === 0 ? COLORS.trail : COLORS.floor));
    }
    this.board.add(this.tiles);
    const segments = [];
    maze.cells.forEach((walls, cell) => {
      const x = cell % size - offset;
      const z = Math.floor(cell / size) - offset;
      if (walls & 1) segments.push([x, z - 0.5, false]);
      if (walls & 8) segments.push([x - 0.5, z, true]);
      if (Math.floor(cell / size) === size - 1 && walls & 4) segments.push([x, z + 0.5, false]);
      if (cell % size === size - 1 && walls & 2) segments.push([x + 0.5, z, true]);
    });
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.8 }), segments.length);
    segments.forEach(([x, z, vertical], i) => {
      dummy.position.set(x, 0.13, z);
      dummy.rotation.set(0, vertical ? Math.PI / 2 : 0, 0);
      dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
    });
    walls.castShadow = true;
    walls.receiveShadow = true;
    this.board.add(walls);
    const exit = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.055, 10, 32), new THREE.MeshStandardMaterial({ color: 0xf2f0d9, emissive: 0xd8fa79, emissiveIntensity: 0.35 }));
    exit.rotation.x = -Math.PI / 2;
    exit.position.set(maze.exit % size - offset, 0.075, Math.floor(maze.exit / size) - offset);
    this.board.add(exit);
    this.player = new THREE.Mesh(new THREE.SphereGeometry(0.235, 24, 16), new THREE.MeshStandardMaterial({ color: COLORS.lime, emissive: COLORS.lime, emissiveIntensity: 0.3, roughness: 0.35 }));
    this.player.position.set(-offset, 0.23, -offset);
    this.player.castShadow = true;
    this.board.add(this.player);
    const start = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.33, 24), new THREE.MeshBasicMaterial({ color: 0x829466, side: THREE.DoubleSide }));
    start.rotation.x = -Math.PI / 2;
    start.position.set(-offset, 0.015, -offset);
    this.board.add(start);
    this.resize();
  }

  resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height || !this.maze) return;
    this.width = width;
    this.height = height;
    if (this.renderer) {
      this.renderer.setSize(width, height);
      const aspect = width / height;
      const half = Math.max((this.maze.size + 1.8) / 2, (this.maze.size + 1.8) / (2 * aspect));
      Object.assign(this.camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
      this.camera.updateProjectionMatrix();
    } else {
      const ratio = Math.min(window.devicePixelRatio, 2);
      this.canvas.width = width * ratio;
      this.canvas.height = height * ratio;
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    this.draw();
  }

  move(position) {
    this.position = position;
    this.visited.add(position);
    if (!this.renderer) { this.draw(); return; }
    this.tiles.setColorAt(position, new THREE.Color(COLORS.trail));
    this.tiles.instanceColor.needsUpdate = true;
    cancelAnimationFrame(this.animation);
    const from = this.player.position.clone();
    const offset = (this.maze.size - 1) / 2;
    const target = new THREE.Vector3(position % this.maze.size - offset, 0.23, Math.floor(position / this.maze.size) - offset);
    if (this.reducedMotion.matches) { this.player.position.copy(target); this.draw(); return; }
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / 90, 1);
      this.player.position.lerpVectors(from, target, 1 - (1 - t) ** 3);
      this.draw();
      if (t < 1) this.animation = requestAnimationFrame(tick);
    };
    this.animation = requestAnimationFrame(tick);
  }

  draw() {
    if (this.renderer) { this.renderer.render(this.scene, this.camera); return; }
    const ctx = this.context;
    if (!ctx || !this.maze) return;
    const { size, cells, exit } = this.maze;
    const unit = Math.min(this.width, this.height) / (size + 1.5);
    const left = (this.width - size * unit) / 2;
    const top = (this.height - size * unit) / 2;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#283022';
    ctx.fillRect(left, top, size * unit, size * unit);
    ctx.fillStyle = '#425035';
    this.visited.forEach(cell => ctx.fillRect(left + cell % size * unit, top + Math.floor(cell / size) * unit, unit, unit));
    ctx.strokeStyle = '#87966c';
    ctx.lineWidth = Math.max(1.5, unit * 0.08);
    ctx.beginPath();
    cells.forEach((walls, cell) => {
      const x = left + cell % size * unit;
      const y = top + Math.floor(cell / size) * unit;
      if (walls & 1) { ctx.moveTo(x, y); ctx.lineTo(x + unit, y); }
      if (walls & 8) { ctx.moveTo(x, y); ctx.lineTo(x, y + unit); }
      if (walls & 4) { ctx.moveTo(x, y + unit); ctx.lineTo(x + unit, y + unit); }
      if (walls & 2) { ctx.moveTo(x + unit, y); ctx.lineTo(x + unit, y + unit); }
    });
    ctx.stroke();
    ctx.strokeStyle = '#eeeee5';
    ctx.beginPath();
    ctx.arc(left + (exit % size + 0.5) * unit, top + (Math.floor(exit / size) + 0.5) * unit, unit * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8fa79';
    ctx.beginPath();
    ctx.arc(left + (this.position % size + 0.5) * unit, top + (Math.floor(this.position / size) + 0.5) * unit, unit * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }
}
