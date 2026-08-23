// ── Hero molecule: a procedurally-grown 3D ball-and-stick model ──
// Rendered with three.js so the counterclockwise turn produces genuine
// depth parallax (near atoms swing further across the frame than far
// ones, and real occlusion changes as it turns) rather than a flat
// card-style CSS rotation.

// Relies on the global `THREE` namespace from the classic
// three.min.js <script> tag loaded before this file in index.html.

// ── Deterministic PRNG so the structure is stable across reloads ──
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLORS = {
  pale: 0xc9dcc2,   // majority terminal atoms
  dark: 0x232e20,   // carbon-like junctions
  mid: 0x5c7650,    // mid-tone junctions
  blue: 0x5c86c4,   // nitrogen-like accents
  bright: 0x86a878, // small bright accent dots
};
const BOND_COLOR = 0xaec9a0;

// ── Procedural growth: branching random walk in 3D, biased into a ──
// ── loose double-cluster silhouette (wide at top, tapering below) ──
function buildMolecule(targetCount, rand) {
  const atoms = []; // { pos: Vector3, r, color }
  const bonds = []; // [i, j]

  function addAtom(pos, r, color) {
    atoms.push({ pos, r, color });
    return atoms.length - 1;
  }

  const seeds = [
    [-55, 68, 48], [55, 66, -52], [-22, 28, -42],
    [30, 30, 44], [0, -12, -28], [0, 54, 30],
    [-30, -55, 30], [32, -50, -34],
  ];

  let frontier = [];
  for (const [x, y, z] of seeds) {
    const id = addAtom(new THREE.Vector3(x, y, z), 5.5, COLORS.dark);
    frontier.push(id);
  }

  function tooClose(p, minD) {
    for (const a of atoms) {
      if (a.pos.distanceToSquared(p) < minD * minD) return true;
    }
    return false;
  }
  function inBounds(p) {
    return Math.abs(p.x) < 118 && p.y > -128 && p.y < 122 && Math.abs(p.z) < 112;
  }

  let stall = 0;
  while (atoms.length < targetCount && frontier.length && stall < 8000) {
    stall++;
    const pid = frontier[Math.floor(rand() * frontier.length)];
    const parent = atoms[pid];
    const branches = 2 + Math.floor(rand() * 3);
    let madeAny = false;
    for (let b = 0; b < branches; b++) {
      if (atoms.length >= targetCount) break;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const dist = 15 + rand() * 13;
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta) - 0.1,
        Math.cos(phi)
      );
      const next = parent.pos.clone().add(dir.multiplyScalar(dist));
      if (!inBounds(next) || tooClose(next, 12.5)) continue;
      const roll = rand();
      let r, color;
      if (roll < 0.52) { r = 3.4; color = COLORS.pale; }
      else if (roll < 0.70) { r = 4.2; color = COLORS.mid; }
      else if (roll < 0.85) { r = 4.6; color = COLORS.dark; }
      else if (roll < 0.94) { r = 4.2; color = COLORS.blue; }
      else { r = 3.0; color = COLORS.bright; }
      const nid = addAtom(next, r, color);
      bonds.push([pid, nid]);
      madeAny = true;
      if (color === COLORS.dark || color === COLORS.mid || color === COLORS.blue) {
        frontier.push(nid);
      }
    }
    if (!madeAny && rand() < 0.3 && frontier.length > 10) {
      frontier.splice(frontier.indexOf(pid), 1);
    }
  }

  // Extra cross-links for a tangled-network look (non-tree edges)
  const existing = new Set(bonds.map(([i, j]) => (i < j ? `${i}_${j}` : `${j}_${i}`)));
  let extra = 0, attempts = 0;
  while (extra < 34 && attempts < 2000) {
    attempts++;
    const a = Math.floor(rand() * atoms.length);
    const b = Math.floor(rand() * atoms.length);
    if (a === b) continue;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (existing.has(key)) continue;
    const d2 = atoms[a].pos.distanceToSquared(atoms[b].pos);
    if (d2 > 13 * 13 && d2 < 25 * 25) {
      bonds.push([a, b]);
      existing.add(key);
      extra++;
    }
  }

  // Connect any isolated atoms to their nearest neighbor
  const degree = new Array(atoms.length).fill(0);
  for (const [i, j] of bonds) { degree[i]++; degree[j]++; }
  atoms.forEach((a, i) => {
    if (degree[i] === 0) {
      let best = -1, bestD = Infinity;
      atoms.forEach((b, j) => {
        if (i === j) return;
        const d2 = a.pos.distanceToSquared(b.pos);
        if (d2 < bestD) { bestD = d2; best = j; }
      });
      if (best >= 0) bonds.push([i, best]);
    }
  });

  // Union-find: bridge any remaining separate clusters into one cohesive
  // tangled mass (matches the reference image's single continuous network
  // rather than several disconnected floating groups).
  const parent = atoms.map((_, i) => i);
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(a, b) { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }
  bonds.forEach(([i, j]) => union(i, j));

  let guard = 0;
  while (guard++ < atoms.length) {
    const roots = new Set(atoms.map((_, i) => find(i)));
    if (roots.size <= 1) break;
    const rootList = [...roots];
    const groupA = rootList[0];
    let bestI = -1, bestJ = -1, bestD = Infinity;
    for (let i = 0; i < atoms.length; i++) {
      if (find(i) !== groupA) continue;
      for (let j = 0; j < atoms.length; j++) {
        if (find(j) === groupA) continue;
        const d2 = atoms[i].pos.distanceToSquared(atoms[j].pos);
        if (d2 < bestD) { bestD = d2; bestI = i; bestJ = j; }
      }
    }
    if (bestI >= 0) {
      bonds.push([bestI, bestJ]);
      union(bestI, bestJ);
    } else {
      break;
    }
  }

  return { atoms, bonds };
}

function buildMeshes({ atoms, bonds }) {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();

  const byColor = new Map();
  atoms.forEach((a) => {
    if (!byColor.has(a.color)) byColor.set(a.color, []);
    byColor.get(a.color).push(a);
  });

  const sphereGeo = new THREE.SphereGeometry(1, 18, 14);
  byColor.forEach((list, color) => {
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.55, metalness: 0.03, transparent: false, opacity: 1,
    });
    const mesh = new THREE.InstancedMesh(sphereGeo, mat, list.length);
    list.forEach((a, idx) => {
      dummy.position.copy(a.pos);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(a.r);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });

  const bondGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
  const bondMat = new THREE.MeshStandardMaterial({
    color: BOND_COLOR, roughness: 0.6, metalness: 0.02, transparent: false, opacity: 1,
  });
  const bondMesh = new THREE.InstancedMesh(bondGeo, bondMat, bonds.length);
  const up = new THREE.Vector3(0, 1, 0);
  bonds.forEach(([i, j], idx) => {
    const p1 = atoms[i].pos, p2 = atoms[j].pos;
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    const dir = p2.clone().sub(p1);
    const len = dir.length();
    dir.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    dummy.position.copy(mid);
    dummy.quaternion.copy(quat);
    dummy.scale.set(1.5, len, 1.5);
    dummy.updateMatrix();
    bondMesh.setMatrixAt(idx, dummy.matrix);
  });
  bondMesh.instanceMatrix.needsUpdate = true;
  group.add(bondMesh);

  return group;
}

function initHeroMolecule() {
  const container = document.getElementById('heroMolecule');
  if (!container) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // No WebGL — the CSS ambient glow behind the container still shows.
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(34, 1, 1, 1400);
  camera.position.set(0, 8, 540);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const key = new THREE.DirectionalLight(0xfff6e6, 1.05);
  key.position.set(160, 220, 260);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbcd0ae, 0.6);
  rim.position.set(-220, -90, -180);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(0, -180, 200);
  scene.add(fill);

  const rand = mulberry32(1337);
  const moleculeGroup = buildMeshes(buildMolecule(260, rand));
  scene.add(moleculeGroup);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    renderer.render(scene, camera);
    return;
  }

  function animate() {
    moleculeGroup.rotation.y -= 0.0032; // counterclockwise about the vertical y-axis
    moleculeGroup.position.y = Math.sin(Date.now() * 0.00035) * 6;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroMolecule);
} else {
  initHeroMolecule();
}
