/**
 * reservation3d.js — Delice Luxury 3D Restaurant Interior & Table Reservation
 * Fully local Three.js, Robust Multi-Event Pointer & Click Detection,
 * Synchronized with Reservation Form & Info Panel.
 */

(function () {
  'use strict';

  // ─── Table Configuration ──────────────────────────────────────────────────────
  const TABLE_DEFS = [
    { tableId: 1, capacity: 2, position: [-5.0, 0, -3.8] },
    { tableId: 2, capacity: 2, position: [ 0.0, 0, -3.8] },
    { tableId: 3, capacity: 4, position: [ 5.0, 0, -3.8] },
    { tableId: 4, capacity: 4, position: [-5.0, 0,  0.4] },
    { tableId: 5, capacity: 6, position: [ 0.0, 0,  0.4] }, // Center VIP Table
    { tableId: 6, capacity: 4, position: [ 5.0, 0,  0.4] },
    { tableId: 7, capacity: 2, position: [-5.0, 0,  4.4] },
    { tableId: 8, capacity: 4, position: [ 5.0, 0,  4.4] },
  ];

  // ─── Luxury Status Palette ────────────────────────────────────────────────────
  const STATUS_COLORS = {
    available:   0x228b22, // Rich emerald green
    selected:    0xf5b018, // Radiant Delice gold
    reserved:    0xd32f2f, // Crimson red
    unavailable: 0x546e7a, // Slate grey
    upcoming:    0xef6c00, // Warm amber
  };

  const STATUS_HEX = {
    available:   '#228b22',
    selected:    '#f5b018',
    reserved:    '#d32f2f',
    unavailable: '#546e7a',
    upcoming:    '#ef6c00',
  };

  // ─── Runtime State ────────────────────────────────────────────────────────────
  let renderer, camera, controls, scene;
  const tableEntries    = [];   // { tableId, capacity, group, topMesh, labelMesh, ctx, texture, status }
  const clickableMeshes = [];  // all meshes belonging to tables that respond to raycaster
  let selectedTableId  = null;
  const raycaster       = new THREE.Raycaster();
  const mouse           = new THREE.Vector2(-999, -999);
  const downPos         = { x: 0, y: 0, time: 0 };

  let canvas = null;

  // ─── Dimension Helper ─────────────────────────────────────────────────────────
  function getCanvasSize() {
    if (!canvas) return { w: 800, h: 600 };
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width || canvas.offsetWidth || 800);
    const h = Math.round(rect.height || canvas.offsetHeight || 600);
    return { w: Math.max(w, 300), h: Math.max(h, 300) };
  }

  // ─── Initialization ───────────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('restaurant-canvas');
    if (!canvas) {
      console.warn('[Delice3D] Canvas #restaurant-canvas not found yet, retrying...');
      setTimeout(init, 100);
      return;
    }

    if (typeof THREE === 'undefined') {
      console.error('[Delice3D] Three.js is not loaded!');
      return;
    }

    const { w, h } = getCanvasSize();

    // 1. WebGL Renderer
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0e0e);

    // 3. Perspective Camera (Dollhouse angle overlooking dining room)
    camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 100);
    camera.position.set(0, 13.5, 15.0);
    camera.lookAt(0, 0.4, 0);

    // 4. Orbit Controls
    const OrbitControls = THREE.OrbitControls;
    if (OrbitControls) {
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.target.set(0, 0.4, 0);
      controls.minDistance = 5.0;
      controls.maxDistance = 24.0;
      controls.minPolarAngle = 0.15;
      controls.maxPolarAngle = Math.PI / 2.15; // Keep camera above floor
      controls.update();
    }

    // 5. Build Environment
    buildLighting();
    buildRoom();
    buildTables();
    buildDecorations();

    // 6. Event Listeners
    setupInteractionEvents();

    // 7. Render Loop
    requestAnimationFrame(animate);

    console.log('[Delice3D] Restaurant scene loaded successfully with 8 interactive tables.');
  }

  // ─── Lighting Setup ───────────────────────────────────────────────────────────
  function buildLighting() {
    // Ambient Light (Warm base so interior is clearly visible)
    const ambientLight = new THREE.AmbientLight(0xfff1de, 1.15);
    scene.add(ambientLight);

    // Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0xffebd2, 0x1f140e, 0.7);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Main Directional Light (Chandelier simulation)
    const mainLight = new THREE.DirectionalLight(0xfffbf2, 1.35);
    mainLight.position.set(7, 18, 11);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 1.0;
    mainLight.shadow.camera.far = 40.0;
    mainLight.shadow.camera.left   = -13;
    mainLight.shadow.camera.right  =  13;
    mainLight.shadow.camera.top    =  10;
    mainLight.shadow.camera.bottom = -10;
    mainLight.shadow.bias = -0.0008;
    scene.add(mainLight);

    // Warm Fill Light from back-left
    const fillLight = new THREE.DirectionalLight(0xf2c46d, 0.55);
    fillLight.position.set(-11, 14, -6);
    scene.add(fillLight);

    // Point Light above VIP Table 5
    const vipPoint = new THREE.PointLight(0xffd580, 1.1, 14, 1.4);
    vipPoint.position.set(0, 4.2, 0.4);
    scene.add(vipPoint);

    // Point Light over Reception Desk
    const recepPoint = new THREE.PointLight(0xffdd99, 1.0, 10, 1.5);
    recepPoint.position.set(6.5, 3.2, -5.2);
    scene.add(recepPoint);
  }

  // ─── Room Architecture (Open-View Dollhouse) ──────────────────────────────────
  function buildRoom() {
    // 1. Main Parquet Floor
    const floorGeo = new THREE.BoxGeometry(19.5, 0.25, 15.5);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x241710,
      roughness: 0.35,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.125;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor grid / wooden plank seams
    const gridLineMat = new THREE.MeshBasicMaterial({ color: 0x160e0a });
    for (let x = -8.5; x <= 8.5; x += 1.8) {
      const lg = new THREE.BoxGeometry(0.02, 0.26, 15.2);
      const lm = new THREE.Mesh(lg, gridLineMat);
      lm.position.set(x, -0.12, 0);
      scene.add(lm);
    }
    for (let z = -6.5; z <= 6.5; z += 1.8) {
      const lg = new THREE.BoxGeometry(19.2, 0.26, 0.02);
      const lm = new THREE.Mesh(lg, gridLineMat);
      lm.position.set(0, -0.12, z);
      scene.add(lm);
    }

    // 2. Luxury Dining Area Rug
    const rugGeo = new THREE.BoxGeometry(16.5, 0.02, 12.0);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.85,
      metalness: 0.05,
    });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.position.set(0, 0.01, 0.3);
    rug.receiveShadow = true;
    scene.add(rug);

    // Rug Golden Border
    const rugBorderGeo = new THREE.BoxGeometry(16.7, 0.025, 12.2);
    const rugBorderMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.45,
      metalness: 0.4,
    });
    const rugBorder = new THREE.Mesh(rugBorderGeo, rugBorderMat);
    rugBorder.position.set(0, 0.005, 0.3);
    scene.add(rugBorder);

    // 3. Elegant Back Wall (Z = -7.4)
    const wallH = 4.8;
    const backWallGeo = new THREE.BoxGeometry(19.5, wallH, 0.3);
    const backWallMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
    });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, wallH / 2, -7.5);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Gold crown molding on back wall
    const crownGeo = new THREE.BoxGeometry(19.6, 0.12, 0.36);
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.6,
    });
    const crown = new THREE.Mesh(crownGeo, goldTrimMat);
    crown.position.set(0, wallH - 0.06, -7.5);
    scene.add(crown);

    // Baseboard trim
    const baseGeo = new THREE.BoxGeometry(19.6, 0.2, 0.36);
    const baseTrim = new THREE.Mesh(baseGeo, goldTrimMat);
    baseTrim.position.set(0, 0.1, -7.5);
    scene.add(baseTrim);

    // Decorative wall panel stripes
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.6 });
    [-6.5, -3.5, 0, 3.5].forEach(px => {
      const pGeo = new THREE.BoxGeometry(2.4, 3.0, 0.04);
      const pMesh = new THREE.Mesh(pGeo, panelMat);
      pMesh.position.set(px, 2.4, -7.33);
      scene.add(pMesh);

      const fGeo = new THREE.BoxGeometry(2.5, 3.1, 0.02);
      const fMesh = new THREE.Mesh(fGeo, goldTrimMat);
      fMesh.position.set(px, 2.4, -7.34);
      scene.add(fMesh);
    });

    // Back Wall DELICE Brand Sign
    buildWallBrandSign();

    // 4. Left Wall (X = -9.7)
    const leftWallGeo = new THREE.BoxGeometry(0.3, wallH, 15.5);
    const leftWall = new THREE.Mesh(leftWallGeo, backWallMat);
    leftWall.position.set(-9.7, wallH / 2, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const leftCrownGeo = new THREE.BoxGeometry(0.36, 0.12, 15.6);
    const leftCrown = new THREE.Mesh(leftCrownGeo, goldTrimMat);
    leftCrown.position.set(-9.7, wallH - 0.06, 0);
    scene.add(leftCrown);

    // Illuminated Window Panes on left wall
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8 });
    [-4.0, 0.0, 4.0].forEach(pz => {
      const winGeo = new THREE.BoxGeometry(0.05, 2.6, 1.8);
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(-9.52, 2.6, pz);
      scene.add(win);

      const winFrameGeo = new THREE.BoxGeometry(0.08, 2.7, 1.9);
      const winFrame = new THREE.Mesh(winFrameGeo, goldTrimMat);
      winFrame.position.set(-9.53, 2.6, pz);
      scene.add(winFrame);
    });

    // 5. Right Low Boundary Partition
    const rightWallGeo = new THREE.BoxGeometry(0.25, 1.1, 15.5);
    const rightWall = new THREE.Mesh(rightWallGeo, backWallMat);
    rightWall.position.set(9.7, 0.55, 0);
    scene.add(rightWall);

    const rightCapGeo = new THREE.BoxGeometry(0.35, 0.08, 15.6);
    const rightCap = new THREE.Mesh(rightCapGeo, goldTrimMat);
    rightCap.position.set(9.7, 1.12, 0);
    scene.add(rightCap);

    // 6. Front Edge Curb
    const frontCurbGeo = new THREE.BoxGeometry(19.6, 0.1, 0.2);
    const frontCurb = new THREE.Mesh(frontCurbGeo, goldTrimMat);
    frontCurb.position.set(0, 0.05, 7.7);
    scene.add(frontCurb);
  }

  // ─── Delice Golden Wall Sign ──────────────────────────────────────────────────
  function buildWallBrandSign() {
    const canvas2d = document.createElement('canvas');
    canvas2d.width  = 512;
    canvas2d.height = 128;
    const ctx = canvas2d.getContext('2d');

    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 112);

    ctx.font = 'italic bold 44px "Brush Script MT", cursive, Georgia, serif';
    ctx.fillStyle = '#f2b51b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Delice Restaurant', 256, 52);

    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('• FINE DINING & RESERVATIONS •', 256, 92);

    const tex = new THREE.CanvasTexture(canvas2d);
    const planeGeo = new THREE.PlaneGeometry(3.6, 0.9);
    const planeMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.3,
      metalness: 0.2,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.set(0, 3.2, -7.3);
    scene.add(plane);
  }

  // ─── Build Interactive Tables ─────────────────────────────────────────────────
  function buildTables() {
    TABLE_DEFS.forEach(def => {
      const entry = createTableObject(def);
      scene.add(entry.group);
      tableEntries.push(entry);
    });
  }

  function createTableObject({ tableId, capacity, position: [px, py, pz] }) {
    const group = new THREE.Group();
    group.position.set(px, py, pz);
    group.userData = { tableId: Number(tableId), capacity, status: 'available' };

    const dims = {
      2: { w: 1.25, d: 1.05, h: 0.085 },
      4: { w: 1.65, d: 1.25, h: 0.085 },
      6: { w: 2.35, d: 1.35, h: 0.085 },
    };
    const { w: tw, d: td, h: th } = dims[capacity] || dims[4];

    const legH = 0.74;
    const tableTopY = legH + th / 2;

    // 1. Table Top (Colored Status Material)
    const topGeo = new THREE.BoxGeometry(tw, th, td);
    const topMat = new THREE.MeshStandardMaterial({
      color: STATUS_COLORS.available,
      roughness: 0.32,
      metalness: 0.15,
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = tableTopY;
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    topMesh.userData = { isTableTop: true, tableId: Number(tableId) };
    group.add(topMesh);
    clickableMeshes.push(topMesh);

    // 2. Luxury Gold Rim
    const rimGeo = new THREE.BoxGeometry(tw + 0.04, th + 0.015, td + 0.04);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.35,
      metalness: 0.5,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = tableTopY - 0.005;
    rimMesh.userData = { tableId: Number(tableId) };
    group.add(rimMesh);
    clickableMeshes.push(rimMesh);

    // 3. Sturdy Legs with Brass Tips
    const legSize = 0.075;
    const legGeo = new THREE.BoxGeometry(legSize, legH, legSize);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1f140d, roughness: 0.6 });
    const tipGeo = new THREE.BoxGeometry(legSize + 0.015, 0.1, legSize + 0.015);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });

    const lx = tw / 2 - 0.12;
    const lz = td / 2 - 0.12;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(sx * lx, legH / 2, sz * lz);
      leg.castShadow = true;
      leg.userData = { tableId: Number(tableId) };
      group.add(leg);
      clickableMeshes.push(leg);

      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(sx * lx, 0.05, sz * lz);
      group.add(tip);
    });

    // 4. Dining Place Settings
    buildPlaceSettings(group, capacity, tw, td, tableTopY + th / 2, tableId);

    // 5. Centerpiece: Candle Lamp
    buildCenterpiece(group, tableTopY + th / 2, tableId);

    // 6. Realistic Dining Chairs
    buildChairs(group, capacity, tw, td, tableId);

    // 7. Floating Camera-Facing 3D Badge (Preserving canvas2d, ctx, texture)
    const badgeData = createFloatingBadge(tableId, capacity, 'AVAILABLE', STATUS_HEX.available);
    const labelMesh = badgeData.mesh;
    labelMesh.position.set(0, tableTopY + 0.7, 0);
    labelMesh.userData = { tableId: Number(tableId) };
    group.add(labelMesh);
    clickableMeshes.push(labelMesh);

    return {
      tableId: Number(tableId),
      capacity,
      group,
      topMesh,
      labelMesh,
      canvas2d: badgeData.canvas2d,
      ctx: badgeData.ctx,
      texture: badgeData.texture,
      status: 'available',
    };
  }

  // ─── Table Place Settings & Centerpiece ───────────────────────────────────────
  function buildPlaceSettings(group, capacity, tw, td, surfaceY, tableId) {
    const plateGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.018, 16);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.2 });

    const glassGeo = new THREE.CylinderGeometry(0.035, 0.025, 0.09, 12);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75,
    });

    const edgeGap = 0.24;
    const positions = [];

    if (capacity === 2) {
      positions.push({ x: 0, z: -(td / 2 - edgeGap) });
      positions.push({ x: 0, z:  (td / 2 - edgeGap) });
    } else if (capacity === 4) {
      positions.push({ x: -0.38, z: -(td / 2 - edgeGap) });
      positions.push({ x:  0.38, z: -(td / 2 - edgeGap) });
      positions.push({ x: -0.38, z:  (td / 2 - edgeGap) });
      positions.push({ x:  0.38, z:  (td / 2 - edgeGap) });
    } else if (capacity === 6) {
      positions.push({ x: -0.65, z: -(td / 2 - edgeGap) });
      positions.push({ x:   0.0, z: -(td / 2 - edgeGap) });
      positions.push({ x:  0.65, z: -(td / 2 - edgeGap) });
      positions.push({ x: -0.65, z:  (td / 2 - edgeGap) });
      positions.push({ x:   0.0, z:  (td / 2 - edgeGap) });
      positions.push({ x:  0.65, z:  (td / 2 - edgeGap) });
    }

    positions.forEach(({ x, z }) => {
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.set(x, surfaceY + 0.009, z);
      plate.receiveShadow = true;
      plate.userData = { tableId: Number(tableId) };
      group.add(plate);
      clickableMeshes.push(plate);

      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(x + 0.11, surfaceY + 0.045, z - 0.05);
      glass.userData = { tableId: Number(tableId) };
      group.add(glass);
      clickableMeshes.push(glass);
    });
  }

  function buildCenterpiece(group, surfaceY, tableId) {
    const baseGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.04, 12);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, surfaceY + 0.02, 0);
    base.userData = { tableId: Number(tableId) };
    group.add(base);

    const votiveGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12);
    const votiveMat = new THREE.MeshStandardMaterial({ color: 0xffedd0, transparent: true, opacity: 0.8 });
    const votive = new THREE.Mesh(votiveGeo, votiveMat);
    votive.position.set(0, surfaceY + 0.07, 0);
    votive.userData = { tableId: Number(tableId) };
    group.add(votive);

    const flameGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, surfaceY + 0.13, 0);
    group.add(flame);
  }

  // ─── Realistic Dining Chairs ──────────────────────────────────────────────────
  function buildChairs(group, capacity, tw, td, tableId) {
    const seatH = 0.44;
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f140d, roughness: 0.6 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x2d2218, roughness: 0.8 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x150d08, roughness: 0.5 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.4 });

    const positions = [];
    const edgeDist = 0.42;

    if (capacity === 2) {
      positions.push({ x: 0, z: -(td / 2 + edgeDist), ry: 0 });
      positions.push({ x: 0, z:  (td / 2 + edgeDist), ry: Math.PI });
    } else if (capacity === 4) {
      positions.push({ x: -0.4, z: -(td / 2 + edgeDist), ry: 0 });
      positions.push({ x:  0.4, z: -(td / 2 + edgeDist), ry: 0 });
      positions.push({ x: -0.4, z:  (td / 2 + edgeDist), ry: Math.PI });
      positions.push({ x:  0.4, z:  (td / 2 + edgeDist), ry: Math.PI });
    } else if (capacity === 6) {
      positions.push({ x: -0.65, z: -(td / 2 + edgeDist), ry: 0 });
      positions.push({ x:   0.0, z: -(td / 2 + edgeDist), ry: 0 });
      positions.push({ x:  0.65, z: -(td / 2 + edgeDist), ry: 0 });
      positions.push({ x: -0.65, z:  (td / 2 + edgeDist), ry: Math.PI });
      positions.push({ x:   0.0, z:  (td / 2 + edgeDist), ry: Math.PI });
      positions.push({ x:  0.65, z:  (td / 2 + edgeDist), ry: Math.PI });
    }

    positions.forEach(({ x, z, ry }) => {
      const chair = new THREE.Group();
      chair.position.set(x, 0, z);
      chair.rotation.y = ry;
      chair.userData = { tableId: Number(tableId) };

      const seatGeo = new THREE.BoxGeometry(0.42, 0.05, 0.42);
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.y = seatH;
      seat.castShadow = true;
      chair.add(seat);

      const cushGeo = new THREE.BoxGeometry(0.38, 0.04, 0.38);
      const cush = new THREE.Mesh(cushGeo, cushionMat);
      cush.position.y = seatH + 0.035;
      chair.add(cush);

      const backGeo = new THREE.BoxGeometry(0.4, 0.38, 0.04);
      const back = new THREE.Mesh(backGeo, seatMat);
      back.position.set(0, seatH + 0.22, -0.19);
      back.castShadow = true;
      chair.add(back);

      const railGeo = new THREE.BoxGeometry(0.42, 0.03, 0.05);
      const rail = new THREE.Mesh(railGeo, goldTrimMat);
      rail.position.set(0, seatH + 0.41, -0.19);
      chair.add(rail);

      const clGeo = new THREE.BoxGeometry(0.04, seatH, 0.04);
      [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(([cx, cz]) => {
        const cl = new THREE.Mesh(clGeo, legMat);
        cl.position.set(cx, seatH / 2, cz);
        chair.add(cl);
      });

      chair.traverse(child => {
        if (child.isMesh) {
          child.userData = { tableId: Number(tableId) };
          clickableMeshes.push(child);
        }
      });

      group.add(chair);
    });
  }

  // ─── Floating Camera-Facing 3D Table Badge ────────────────────────────────────
  function createFloatingBadge(tableId, capacity, statusText, statusHex) {
    const canvas2d = document.createElement('canvas');
    canvas2d.width  = 384;
    canvas2d.height = 192;
    const ctx = canvas2d.getContext('2d');

    drawBadgeCanvas(ctx, tableId, capacity, statusText, statusHex);

    const texture = new THREE.CanvasTexture(canvas2d);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const badgeGeo = new THREE.PlaneGeometry(1.2, 0.6);
    const badgeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(badgeGeo, badgeMat);
    mesh.userData = { tableId: Number(tableId) };

    return { mesh, canvas2d, ctx, texture };
  }

  function drawBadgeCanvas(ctx, tableId, capacity, statusText, statusHex) {
    const w = 384;
    const h = 192;
    ctx.clearRect(0, 0, w, h);

    // Background Pill
    ctx.fillStyle = 'rgba(14, 14, 14, 0.92)';
    roundRectPath(ctx, 10, 10, w - 20, h - 20, 24);
    ctx.fill();

    // Golden Outer Border
    ctx.strokeStyle = statusHex || '#d4af37';
    ctx.lineWidth = 6;
    roundRectPath(ctx, 10, 10, w - 20, h - 20, 24);
    ctx.stroke();

    // Table Title: TABLE 1
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillStyle = '#f5b018';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`TABLE ${tableId}`, w / 2, 54);

    // Capacity & Status Line
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${capacity} GUESTS  •  ${statusText || 'AVAILABLE'}`, w / 2, 104);

    // Subtle bottom status bar
    ctx.fillStyle = statusHex || '#228b22';
    roundRectPath(ctx, 40, 140, w - 80, 16, 8);
    ctx.fill();
  }

  function roundRectPath(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
    }
  }

  function updateBadgeDisplay(entry, status) {
    if (!entry || !entry.ctx || !entry.texture) return;
    const hex = STATUS_HEX[status] || STATUS_HEX.available;
    const label = (status || 'AVAILABLE').toUpperCase();
    drawBadgeCanvas(entry.ctx, entry.tableId, entry.capacity, label, hex);
    entry.texture.needsUpdate = true;
  }

  // ─── Decorations (Reception Desk & Plants) ────────────────────────────────────
  function buildDecorations() {
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.3 });

    const deskBaseGeo = new THREE.BoxGeometry(3.6, 1.15, 0.9);
    const deskBase = new THREE.Mesh(deskBaseGeo, deskMat);
    deskBase.position.set(6.2, 0.575, -5.6);
    deskBase.castShadow = true;
    scene.add(deskBase);

    // Marble Top
    const deskTopGeo = new THREE.BoxGeometry(3.8, 0.08, 1.05);
    const deskTop = new THREE.Mesh(deskTopGeo, goldMat);
    deskTop.position.set(6.2, 1.19, -5.6);
    scene.add(deskTop);

    // Front Reception Logo Plaque
    const plaqueGeo = new THREE.BoxGeometry(1.6, 0.35, 0.04);
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.8 });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(6.2, 0.75, -5.13);
    scene.add(plaque);

    // Desk Lamp
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 12), goldMat);
    lampBase.position.set(5.0, 1.25, -5.6);
    scene.add(lampBase);

    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 8), goldMat);
    lampStem.position.set(5.0, 1.41, -5.6);
    scene.add(lampStem);

    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 12), goldMat);
    lampShade.position.set(5.0, 1.57, -5.6);
    scene.add(lampShade);

    // Luxury Potted Plants
    const plantSpots = [
      [-8.2, 0, -6.0],
      [-8.2, 0,  5.8],
      [ 8.2, 0,  5.8],
      [-8.2, 0,  0.4],
    ];
    plantSpots.forEach(([px, py, pz]) => createPottedPlant(px, py, pz));
  }

  function createPottedPlant(x, y, z) {
    const potMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.4 });
    const goldRingMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });

    const potGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.65, 16);
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(x, y + 0.325, z);
    pot.castShadow = true;
    scene.add(pot);

    const ringGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.04, 16);
    const ring = new THREE.Mesh(ringGeo, goldRingMat);
    ring.position.set(x, y + 0.58, z);
    scene.add(ring);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x247a24, roughness: 0.65 });
    const leafCluster = new THREE.Group();
    leafCluster.position.set(x, y + 0.65, z);

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), leafMat);
      leaf.scale.set(1.4, 0.25, 0.7);
      leaf.position.set(Math.cos(angle) * 0.28, 0.28 + (i % 3) * 0.1, Math.sin(angle) * 0.28);
      leaf.rotation.y = angle;
      leaf.rotation.z = 0.35;
      leaf.castShadow = true;
      leafCluster.add(leaf);
    }

    const topLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), leafMat);
    topLeaf.scale.set(0.9, 1.3, 0.9);
    topLeaf.position.set(0, 0.42, 0);
    leafCluster.add(topLeaf);

    scene.add(leafCluster);
  }

  // ─── External Status Updates ──────────────────────────────────────────────────
  function updateTableColor(tableId, status) {
    const numId = Number(tableId);
    const entry = tableEntries.find(t => t.tableId === numId);
    if (!entry) return;

    const hexCol = STATUS_COLORS[status] ?? STATUS_COLORS.available;
    if (entry.topMesh && entry.topMesh.material) {
      entry.topMesh.material.color.setHex(hexCol);
    }
    entry.status = status;
    if (entry.group.userData) {
      entry.group.userData.status = status;
    }

    updateBadgeDisplay(entry, status);
  }

  function getTableStatus(tableId) {
    const entry = tableEntries.find(t => t.tableId === Number(tableId));
    return entry ? entry.status : 'unavailable';
  }

  function setTableStatus(tableId, status) {
    updateTableColor(tableId, status);
  }

  // ─── Interaction & Raycasting Events ──────────────────────────────────────────
  function setupInteractionEvents() {
    canvas.addEventListener('pointermove', onPointerMove, { passive: true });

    canvas.addEventListener('pointerdown', (e) => {
      downPos.x = e.clientX;
      downPos.y = e.clientY;
      downPos.time = performance.now();
    });

    canvas.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      const elapsed = performance.now() - downPos.time;
      if (dist < 8 && elapsed < 500) {
        updatePointerCoords(e.clientX, e.clientY);
        executeTableSelection();
      }
    });

    canvas.addEventListener('click', onPointerClick);
  }

  function updatePointerCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onPointerMove(event) {
    updatePointerCoords(event.clientX, event.clientY);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, true);

    if (hits.length > 0) {
      for (let i = 0; i < hits.length; i++) {
        let curr = hits[i].object;
        while (curr && curr !== scene) {
          if (curr.userData && curr.userData.tableId) {
            canvas.style.cursor = 'pointer';
            return;
          }
          curr = curr.parent;
        }
      }
    }

    canvas.style.cursor = 'grab';
  }

  function onPointerClick(event) {
    updatePointerCoords(event.clientX, event.clientY);
    executeTableSelection();
  }

  function executeTableSelection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes, true);
    if (!intersects.length) return;

    let tid = null;
    for (let i = 0; i < intersects.length; i++) {
      let curr = intersects[i].object;
      while (curr && curr !== scene) {
        if (curr.userData && curr.userData.tableId) {
          tid = Number(curr.userData.tableId);
          break;
        }
        curr = curr.parent;
      }
      if (tid) break;
    }

    if (!tid) return;

    // Restore previously selected table's original status color
    if (selectedTableId && selectedTableId !== tid) {
      const prevEntry = tableEntries.find(t => t.tableId === selectedTableId);
      if (prevEntry) {
        const realStatus = prevEntry.status === 'selected' ? 'available' : prevEntry.status;
        updateTableColor(selectedTableId, realStatus);
      }
    }

    // Highlight new selection with radiant gold
    selectedTableId = tid;
    updateTableColor(tid, 'selected');

    // Trigger main reservation logic in reservations.js
    if (typeof window.onTableClick === 'function') {
      window.onTableClick(tid);
    }
  }

  // ─── Window Resize ────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    if (!renderer || !camera || !canvas) return;
    const { w, h } = getCanvasSize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });

  // ─── Render Animation Loop ────────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);

    if (controls) controls.update();

    // Billboard table badges to face camera
    tableEntries.forEach(entry => {
      if (entry.labelMesh && camera) {
        entry.labelMesh.quaternion.copy(camera.quaternion);
      }
    });

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // ─── Global Bridge API ────────────────────────────────────────────────────────
  window.updateTableColor = updateTableColor;
  window.scene3D = {
    updateTableColor,
    getTableStatus,
    setTableStatus,
    getTables: () => tableEntries,
  };

  // ─── Boot Scene ───────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 50));
  } else {
    setTimeout(init, 50);
  }
})();
