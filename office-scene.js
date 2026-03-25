// office-scene.js — Three.js isometric office scene (Slide 3)
// Depends on Three.js loaded via CDN before this script.

(() => {
  const SLIDE = document.querySelector('.slide--canvas');
  if (!SLIDE || typeof THREE === 'undefined') return;

  // ── Loading overlay ────────────────────────────────
  const loadOverlay = document.createElement('div');
  loadOverlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:5;background:transparent;transition:opacity 0.6s ease;';
  const spinner = document.createElement('div');
  spinner.style.cssText = 'width:48px;height:48px;border:4px solid rgba(35,152,178,0.15);border-top-color:#2398B2;border-radius:50%;animation:office-spin 0.8s linear infinite;';
  const styleTag = document.createElement('style');
  styleTag.textContent = '@keyframes office-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(styleTag);
  loadOverlay.appendChild(spinner);
  SLIDE.appendChild(loadOverlay);

  // ── Loading manager ────────────────────────────────
  const loadingManager = new THREE.LoadingManager();
  let allLoaded = false;
  loadingManager.onLoad = () => {
    allLoaded = true;
    canvas.style.opacity = '1';
    loadOverlay.style.opacity = '0';
    setTimeout(() => loadOverlay.remove(), 600);
    // Expose snapshot capability for slide overview
    setTimeout(() => {
      resize();
      renderer.render(scene, camera);
      try {
        window.__officeSceneSnapshot = canvas.toDataURL('image/png');
        window.dispatchEvent(new Event('officeSceneReady'));
      } catch(e) {}
    }, 300);
  };

  // ── Renderer ────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0;transition:opacity 0.6s ease;transform:translateY(-32px);';
  SLIDE.prepend(canvas);

  // ── Scene ────────────────────────────────────────────
  const scene = new THREE.Scene();
  const clock  = new THREE.Clock();

  // ── Isometric Camera ─────────────────────────────────
  let frustum = 20;
  let aspect = window.innerWidth / window.innerHeight;

  const camera = new THREE.OrthographicCamera(
    -frustum * aspect / 2,  frustum * aspect / 2,
     frustum / 2,           -frustum / 2,
    0.1, 100
  );

  const LOOK_TARGET = new THREE.Vector3(0, 4.5, 0);
  const CAM_RADIUS  = 20;
  const CAM_AZIMUTH = Math.PI / 4;

  function setCameraTilt(deg) {
    const θ = deg * Math.PI / 180;
    camera.position.set(
      LOOK_TARGET.x + CAM_RADIUS * Math.cos(θ) * Math.cos(CAM_AZIMUTH),
      LOOK_TARGET.y + CAM_RADIUS * Math.sin(θ),
      LOOK_TARGET.z + CAM_RADIUS * Math.cos(θ) * Math.sin(CAM_AZIMUTH)
    );
    camera.lookAt(LOOK_TARGET);
  }

  setCameraTilt(35);

  // ── Lighting ─────────────────────────────────────────

  // Soft ambient — keeps shadow areas from going black
  const ambient = new THREE.AmbientLight(0xfff8f0, 0.5);
  scene.add(ambient);

  // Sun — positioned OUTSIDE the back wall (negative Z), shining inward through windows
  // Creates window-frame shadow patterns on the floor
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
  sun.position.set(0, 10, -20);
  sun.target.position.set(0, 0, 2);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left   = -12;
  sun.shadow.camera.right  =  12;
  sun.shadow.camera.top    =  12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near   =  1;
  sun.shadow.camera.far    =  50;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // Cool fill from camera side — lifts the room interior
  const fill = new THREE.DirectionalLight(0xd0e8f8, 0.5);
  fill.position.set(10, 8, 10);
  scene.add(fill);

  // Bounce fill from right — counteracts the back-wall corner shadow on the NW wall
  const bounce = new THREE.DirectionalLight(0xfff8f0, 0.4);
  bounce.position.set(14, 4, -2);
  scene.add(bounce);

  // ── Floor ────────────────────────────────────────────
  const FLOOR_SIZE = 12;
  const FLOOR_EXT = FLOOR_SIZE + 0.25;
  const floorGeo = new THREE.PlaneGeometry(FLOOR_EXT, FLOOR_EXT);

  const floorMat = new THREE.MeshLambertMaterial({ color: 0xE8D5B0 });

  new THREE.TextureLoader(loadingManager).load('/Office/herringbone_parquet_diff_2k.jpg', (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    floor.material = new THREE.MeshLambertMaterial({ map: tex });
    floorMat.dispose();
  });

  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Floor edge — dark brown gradient sides (stays Basic, unlit is fine here)
  const edgeCanvas = document.createElement('canvas');
  edgeCanvas.width = 4; edgeCanvas.height = 64;
  const edgeCtx = edgeCanvas.getContext('2d');
  const edgeGrad = edgeCtx.createLinearGradient(0, 0, 0, 64);
  edgeGrad.addColorStop(0, '#8B5230');
  edgeGrad.addColorStop(1, '#2A1005');
  edgeCtx.fillStyle = edgeGrad;
  edgeCtx.fillRect(0, 0, 4, 64);
  const edgeTex = new THREE.CanvasTexture(edgeCanvas);
  edgeTex.generateMipmaps = false;
  edgeTex.minFilter = THREE.LinearFilter;

  const edgeGeo = new THREE.BoxGeometry(FLOOR_EXT, 0.24, FLOOR_EXT);
  const edgeMat = new THREE.MeshBasicMaterial({ map: edgeTex });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.y = -0.13;
  scene.add(edge);

  // ── Walls ────────────────────────────────────────────
  const WALL_HEIGHT = 3.2;
  const WALL_T      = 0.25;
  const WALL_SINK   = 0.1;
  const WH = WALL_HEIGHT + WALL_SINK;
  const WY = WH / 2 - WALL_SINK;

  const matLeft = new THREE.MeshLambertMaterial({ color: 0xF4F0E8 });
  const matBack = new THREE.MeshLambertMaterial({ color: 0xEDEAE0 });
  const matCol     = new THREE.MeshLambertMaterial({ color: 0xFAF7F2 });
  const matLeftCol = new THREE.MeshLambertMaterial({ color: 0xD8D4CC }); // darker — pops against wall

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WH, FLOOR_SIZE + WALL_T), matLeft);
  leftWall.position.set(-FLOOR_SIZE / 2 - WALL_T / 2, WY, -WALL_T / 2);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Back wall (NE) — built in sections with real window openings
  const BW_CZ  = -FLOOR_SIZE / 2 - WALL_T / 2;
  const BW_X0  = -WALL_T / 2 - (FLOOR_SIZE + WALL_T) / 2;
  const BW_X1  =  WALL_T / 2 + (FLOOR_SIZE - WALL_T) / 2;
  const BW_Y0  = -WALL_SINK;
  const BW_Y1  = WALL_HEIGHT;
  const BW_WO  = [
    { x0: -4.225, x1: -2.925 },
    { x0: -1.925, x1: -0.625 },
    { x0:  0.375, x1:  1.675 },
    { x0:  2.675, x1:  3.975 },
  ];
  const WIN_OY0 = 0.15; const WIN_OY1 = 3.1;

  function bwp(x0, x1, y0, y1) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, WALL_T), matBack);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, BW_CZ);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
  bwp(BW_X0,       BW_WO[0].x0, BW_Y0, BW_Y1);
  bwp(BW_WO[0].x1, BW_WO[1].x0, BW_Y0, BW_Y1);
  bwp(BW_WO[1].x1, BW_WO[2].x0, BW_Y0, BW_Y1);
  bwp(BW_WO[2].x1, BW_WO[3].x0, BW_Y0, BW_Y1);
  bwp(BW_WO[3].x1, BW_X1,       BW_Y0, BW_Y1);
  BW_WO.forEach(w => {
    bwp(w.x0, w.x1, BW_Y0,   WIN_OY0);
    bwp(w.x0, w.x1, WIN_OY1, BW_Y1);
  });

  // ── Columns ──────────────────────────────────────────
  const COL_W = 0.38;
  const COL_P = 0.22;

  function addBackCol(x) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(COL_W, WH, WALL_T + COL_P), matCol);
    m.position.set(x, WY, -FLOOR_SIZE / 2 - WALL_T / 2);
    m.receiveShadow = true;
    scene.add(m);
  }
  function addLeftCol(z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(WALL_T + COL_P, WH, COL_W), matLeftCol);
    m.position.set(-FLOOR_SIZE / 2 - WALL_T / 2, WY, z);
    m.receiveShadow = true;
    scene.add(m);
  }

  const cornerCol = new THREE.Mesh(new THREE.BoxGeometry(WALL_T + COL_P, WH, WALL_T + COL_P), matCol);
  cornerCol.position.set(-FLOOR_SIZE / 2 - WALL_T / 2, WY, -FLOOR_SIZE / 2 - WALL_T / 2);
  cornerCol.receiveShadow = true;
  scene.add(cornerCol);

  addLeftCol(-3.9); addLeftCol(2);

  // ── Crown moulding ────────────────────────────────────
  const moldH = 0.09; const moldEx = 0.13;
  const matMold = new THREE.MeshLambertMaterial({ color: 0xFBF8F2 });
  // Back moulding — left end stops at corner col centre (no moldEx overhang on left)
  const backMold = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_SIZE + WALL_T + moldEx, moldH, WALL_T + moldEx), matMold);
  backMold.position.set(-WALL_T / 2 + moldEx / 2, WALL_HEIGHT, -FLOOR_SIZE / 2 - WALL_T / 2);
  backMold.receiveShadow = true;
  scene.add(backMold);
  // Left moulding — back end stops at corner col centre (no moldEx overhang at back)
  const leftMold = new THREE.Mesh(new THREE.BoxGeometry(WALL_T + moldEx, moldH, FLOOR_SIZE + WALL_T + moldEx), matMold);
  leftMold.position.set(-FLOOR_SIZE / 2 - WALL_T / 2, WALL_HEIGHT, -WALL_T / 2 + moldEx / 2);
  leftMold.receiveShadow = true;
  scene.add(leftMold);
  // Corner cap — fills the gap without any overlap
  const cornerMold = new THREE.Mesh(new THREE.BoxGeometry(WALL_T + moldEx, moldH, WALL_T + moldEx), matMold);
  cornerMold.position.set(-FLOOR_SIZE / 2 - WALL_T / 2, WALL_HEIGHT, -FLOOR_SIZE / 2 - WALL_T / 2);
  scene.add(cornerMold);

  // ── Baseboards ───────────────────────────────────────
  const BS_H  = 0.14;
  const BS_D  = 0.06;
  const matBS = new THREE.MeshLambertMaterial({ color: 0xFBF8F2 });

  // NE (back) wall baseboard — full width
  const neBS = new THREE.Mesh(
    new THREE.BoxGeometry(FLOOR_SIZE + WALL_T, BS_H, BS_D), matBS
  );
  neBS.position.set(-WALL_T / 2, BS_H / 2, -FLOOR_SIZE / 2 + BS_D / 2);
  neBS.receiveShadow = true;
  scene.add(neBS);

  // NW (left) wall baseboard — full depth
  const nwBS = new THREE.Mesh(
    new THREE.BoxGeometry(BS_D, BS_H, FLOOR_SIZE + WALL_T), matBS
  );
  nwBS.position.set(-FLOOR_SIZE / 2 + BS_D / 2, BS_H / 2, -WALL_T / 2);
  nwBS.receiveShadow = true;
  scene.add(nwBS);

  // ── Windows (NE / back wall only) ────────────────────
  const WIN_W = 1.3;
  const WIN_H = 2.95;
  const WIN_Y = 1.625;
  const WIN_Z = -FLOOR_SIZE / 2 + 0.02;
  const FT    = 0.12;
  const matFrame = new THREE.MeshLambertMaterial({ color: 0xFBF8F2 });

  function addWindow(x) {
    const hw = WIN_W / 2;
    const hh = WIN_H / 2;
    const FI = FT * 0.55; // inner glazing bar — thinner than outer frame

    const pieces = [
      // Outer frame
      [WIN_W + FT * 2, FT,         FT,    x,                  WIN_Y + hh + FT * 0.5, WIN_Z],
      [WIN_W + FT * 2, FT,         FT,    x,                  WIN_Y - hh - FT * 0.5, WIN_Z],
      [FT,             WIN_H + FT, FT,    x - hw - FT * 0.5,  WIN_Y,                 WIN_Z],
      [FT,             WIN_H + FT, FT,    x + hw + FT * 0.5,  WIN_Y,                 WIN_Z],
      // Centre vertical mullion
      [FI,             WIN_H + FT, FT,    x,                  WIN_Y,                 WIN_Z],
    ];

    // 4 horizontal glazing bars → 5 rows × 2 cols = 10 panes (French-door style)
    const rowH = WIN_H / 5;
    for (let i = 1; i <= 4; i++) {
      pieces.push([WIN_W + FT * 2, FI, FT, x, WIN_Y - hh + rowH * i, WIN_Z]);
    }

    pieces.forEach(([w, h, d, px, py, pz]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matFrame);
      m.position.set(px, py, pz);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    });
  }

  addWindow(-3.575);
  addWindow(-1.275);
  addWindow( 1.025);
  addWindow( 3.325);

  // ── NW Wall Dashboard Screen ──────────────────────────
  const SCR_W = 4.8;
  const SCR_H = 2.415;
  const SCR_X = -FLOOR_SIZE / 2 + 0.02;  // just inside NW wall interior face
  const SCR_Y = 1.55;                     // vertically centred in wall
  const SCR_Z = -1.0;                     // centred between left-wall columns

  // Bezel
  const bezelMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, SCR_H + 0.10, SCR_W + 0.10),
    bezelMat
  );
  bezel.position.set(SCR_X - 0.022, SCR_Y, SCR_Z);
  scene.add(bezel);

  // Screen glow — casts bluish-teal light into the room
  const screenGlow = new THREE.PointLight(0x2398B2, 0.35, 5);
  screenGlow.position.set(SCR_X + 0.6, SCR_Y, SCR_Z);
  scene.add(screenGlow);

  // Offscreen canvas for Chart.js (ratio matches SCR_W/SCR_H ≈ 2.286)
  const dashCanvas = document.createElement('canvas');
  dashCanvas.width  = 1024;
  dashCanvas.height = 448;

  const dashTex = new THREE.CanvasTexture(dashCanvas);
  dashTex.generateMipmaps = false;
  dashTex.minFilter = THREE.LinearFilter;
  // Mirror fix: plane facing +x flips the U axis; invert to correct
  dashTex.repeat.set(-1, 1);
  dashTex.offset.set(1, 0);

  // Screen panel — 98% of frame opening, flush against wall
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(SCR_W * 0.98, SCR_H * 0.98),
    new THREE.MeshBasicMaterial({ map: dashTex })
  );
  screenMesh.rotation.y = Math.PI / 2;
  screenMesh.position.set(SCR_X + 0.001, SCR_Y, SCR_Z);
  scene.add(screenMesh);

  // Extruded border frame — same 0.07 depth as the wall logo
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-SCR_W / 2, -SCR_H / 2);
  frameShape.lineTo( SCR_W / 2, -SCR_H / 2);
  frameShape.lineTo( SCR_W / 2,  SCR_H / 2);
  frameShape.lineTo(-SCR_W / 2,  SCR_H / 2);
  frameShape.closePath();
  const frameHole = new THREE.Path();
  frameHole.moveTo(-SCR_W * 0.49, -SCR_H * 0.49);
  frameHole.lineTo( SCR_W * 0.49, -SCR_H * 0.49);
  frameHole.lineTo( SCR_W * 0.49,  SCR_H * 0.49);
  frameHole.lineTo(-SCR_W * 0.49,  SCR_H * 0.49);
  frameHole.closePath();
  frameShape.holes.push(frameHole);
  const frameMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(frameShape, { depth: 0.07, bevelEnabled: false }),
    new THREE.MeshLambertMaterial({ color: 0x2e2e2e })
  );
  frameMesh.rotation.y = Math.PI / 2;
  frameMesh.position.set(SCR_X, SCR_Y, SCR_Z);
  scene.add(frameMesh);

  // Chart.js dashboard — waits for Chart global to be available
  (function initDash() {
    if (typeof Chart === 'undefined') { setTimeout(initDash, 100); return; }

    const LABELS = ['Deals Reviewed', 'Portfolio Value', 'Active Leads', 'Follow-ups'];
    function rndData() { return LABELS.map(() => Math.floor(Math.random() * 70 + 20)); }

    const vcBgPlugin = {
      id: 'vcBg',
      beforeDraw({ ctx, width, height }) {
        ctx.save();
        // Dark background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        // Teal gradient header bar
        const hh = 58;
        const g = ctx.createLinearGradient(0, 0, width, 0);
        g.addColorStop(0, '#2398B2');
        g.addColorStop(1, '#2DB1A1');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, hh);
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 26px "Manrope", "DM Sans", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('VC Dashboard', 22, hh / 2);
        ctx.restore();
      },
    };

    const chart = new Chart(dashCanvas, {
      type: 'bar',
      data: {
        labels: LABELS,
        datasets: [{
          data: rndData(),
          backgroundColor: ['#2398B2', '#259CB5', '#28A3B0', '#2DB1A1'],
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: false,
        animation: { duration: 700 },
        layout: { padding: { top: 72, bottom: 18, left: 28, right: 28 } },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', font: { family: '"DM Sans", sans-serif', size: 15 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.07)' },
            ticks: { color: '#64748b', font: { family: '"DM Sans", sans-serif', size: 13 } },
            beginAtZero: true,
            max: 100,
          },
        },
      },
      plugins: [
        vcBgPlugin,
        { id: 'vcUpd', afterRender() { dashTex.needsUpdate = true; } },
      ],
    });

    let chartInt = null;
    function startChart() { if (!chartInt) chartInt = setInterval(() => { chart.data.datasets[0].data = rndData(); chart.update(); }, 5000); }
    function stopChart()  { if (chartInt) { clearInterval(chartInt); chartInt = null; } }
    const chartObs = new MutationObserver(() => { document.body.classList.contains('canvas-slide') ? startChart() : stopChart(); });
    chartObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (document.body.classList.contains('canvas-slide')) startChart();
  })();

  // ── Office table (centre of room) ────────────────────
  new THREE.GLTFLoader(loadingManager).load('/Office/3D Models/OfficeTable.glb', (gltf) => {
    const model = gltf.scene;

    const rawBox    = new THREE.Box3().setFromObject(model);
    const rawSize   = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize);
    rawBox.getCenter(rawCenter);

    model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    model.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);

    const table = new THREE.Group();
    table.add(model);

    const horzMax = Math.max(rawSize.x, rawSize.z);
    table.scale.setScalar(7.0 / horzMax);

    table.position.set(0, 0, 0);
    scene.add(table);
    table.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(table);
    table.position.y = -box.min.y;
    // Recompute after grounding so x/z reflect real world positions
    table.updateMatrixWorld(true);
    box.setFromObject(table);

    // Hide stray prop meshes (e.g. pen/pencil accessories) — very small geometry near floor level
    table.traverse(n => {
      if (!n.isMesh) return;
      const b2 = new THREE.Box3().setFromObject(n);
      const s2 = new THREE.Vector3();
      b2.getSize(s2);
      if (Math.max(s2.x, s2.y, s2.z) < 0.12 && b2.min.y < 0.15) n.visible = false;
    });

    // ── Small fern — nested so we know the table's real bounds ──
    new THREE.GLTFLoader(loadingManager).load('/Office/3D Models/plant2-smallfern.glb', (fGltf) => {
      const fModel = fGltf.scene;
      const fRawBox    = new THREE.Box3().setFromObject(fModel);
      const fRawSize   = new THREE.Vector3();
      const fRawCenter = new THREE.Vector3();
      fRawBox.getSize(fRawSize);
      fRawBox.getCenter(fRawCenter);

      const leafData = [];
      fModel.traverse(n => {
        if (!n.isMesh) return;
        n.castShadow = true;
        n.receiveShadow = true;
        n.material = n.material.clone();
        n.material.side = THREE.DoubleSide;
        leafData.push({
          mesh: n, initX: 0, initZ: 0,
          phase: Math.random() * Math.PI * 2,
          freq:  0.3 + Math.random() * 0.2,
          amp:   0.015 + Math.random() * 0.015,
        });
      });
      fModel.position.set(-fRawCenter.x, -fRawCenter.y, -fRawCenter.z);

      const fern = new THREE.Group();
      fern.add(fModel);
      fern.scale.setScalar(1.2 / Math.max(fRawSize.x, fRawSize.y, fRawSize.z));

      fern.position.set(0, 0, 0);
      scene.add(fern);
      fern.updateMatrixWorld(true);

      const fBox = new THREE.Box3().setFromObject(fern);
      // SE corner = min.x / max.z of table bbox; inset 0.8 to land at table surface past chairs
      fern.position.x = box.min.x + 1.9;
      fern.position.y = -fBox.min.y;
      fern.position.z = box.max.z - 0.8;

      leafData.forEach(d => { d.initX = d.mesh.rotation.x; d.initZ = d.mesh.rotation.z; });
      if (!scene.userData.plantLeaves) scene.userData.plantLeaves = [];
      scene.userData.plantLeaves.push(...leafData);
    });
  });

  // ── Plant (NW corner) ────────────────────────────────
  new THREE.GLTFLoader(loadingManager).load('/Office/3D Models/Plant1.glb', (gltf) => {
    const model = gltf.scene;
    const rawBox    = new THREE.Box3().setFromObject(model);
    const rawSize   = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize);
    rawBox.getCenter(rawCenter);

    const leafData = [];
    model.traverse(n => {
      if (!n.isMesh) return;
      n.castShadow = true;
      n.receiveShadow = true;
      // Double-sided so leaves look right from all angles
      n.material = n.material.clone();
      n.material.side = THREE.DoubleSide;
      leafData.push({
        mesh:  n,
        initX: 0, initZ: 0,          // filled after group is placed
        phase: Math.random() * Math.PI * 2,
        freq:  0.35 + Math.random() * 0.25,
        amp:   0.022 + Math.random() * 0.025,
      });
    });
    model.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);

    const plant = new THREE.Group();
    plant.add(model);
    plant.scale.setScalar(2.2 / Math.max(rawSize.x, rawSize.y, rawSize.z));

    plant.position.set(0, 0, 0);
    scene.add(plant);
    plant.updateMatrixWorld(true);

    // Push into NW corner — bounding box edge flush against each wall interior face + margin
    const box = new THREE.Box3().setFromObject(plant);
    const margin = 0.12;
    plant.position.x = -FLOOR_SIZE / 2 + margin - box.min.x;
    plant.position.y = -box.min.y;
    plant.position.z = -FLOOR_SIZE / 2 + margin - box.min.z;

    // Capture resting rotations now that the group is in world space
    leafData.forEach(d => { d.initX = d.mesh.rotation.x; d.initZ = d.mesh.rotation.z; });
    if (!scene.userData.plantLeaves) scene.userData.plantLeaves = [];
    scene.userData.plantLeaves.push(...leafData);
  });

  // ── Plant 2 (right end of back wall) ─────────────────
  new THREE.GLTFLoader(loadingManager).load('/Office/3D Models/Plant1.glb', (gltf) => {
    const model = gltf.scene;
    const rawBox    = new THREE.Box3().setFromObject(model);
    const rawSize   = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize);
    rawBox.getCenter(rawCenter);

    const leafData = [];
    model.traverse(n => {
      if (!n.isMesh) return;
      n.castShadow = true;
      n.receiveShadow = true;
      n.material = n.material.clone();
      n.material.side = THREE.DoubleSide;
      leafData.push({
        mesh: n, initX: 0, initZ: 0,
        phase: Math.random() * Math.PI * 2,
        freq:  0.35 + Math.random() * 0.25,
        amp:   0.022 + Math.random() * 0.025,
      });
    });
    model.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);

    const plant2 = new THREE.Group();
    plant2.add(model);
    plant2.scale.setScalar(2.2 / Math.max(rawSize.x, rawSize.y, rawSize.z));
    plant2.rotation.y = 2.3; // distinct angle from plant 1

    plant2.position.set(0, 0, 0);
    scene.add(plant2);
    plant2.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(plant2);
    const margin = 0.15;
    plant2.position.x = FLOOR_SIZE / 2 - box.max.x + 0.4; // leaves curl over right edge
    plant2.position.y = -box.min.y;
    plant2.position.z = -FLOOR_SIZE / 2 + margin - box.min.z; // snapped to back wall

    leafData.forEach(d => { d.initX = d.mesh.rotation.x; d.initZ = d.mesh.rotation.z; });
    if (!scene.userData.plantLeaves) scene.userData.plantLeaves = [];
    scene.userData.plantLeaves.push(...leafData);
  });

  // ── Lounge corner (SE corner) ────────────────────────────────────────────
  const LOUNGE_X = 3.5;
  const LOUNGE_Z = -4.0;

  // Group anchor — add new GLBs into loungeGroup using local offsets
  const loungeGroup = new THREE.Group();
  loungeGroup.name = 'lounge-group';
  loungeGroup.position.set(LOUNGE_X, 0, LOUNGE_Z);
  scene.add(loungeGroup);

  // Helper — load a GLB into the lounge group
  // usage: loadIntoLounge('filename.glb', targetSize, rotY, offsetX, offsetZ)
  function loadIntoLounge(file, targetSize, rotY, offsetX, offsetZ) {
    new THREE.GLTFLoader(loadingManager).load('/Office/3D Models/' + file, (gltf) => {
      const model = gltf.scene;
      const rawBox = new THREE.Box3().setFromObject(model);
      const rawSize = new THREE.Vector3(); const rawCenter = new THREE.Vector3();
      rawBox.getSize(rawSize); rawBox.getCenter(rawCenter);
      model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      model.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);
      const item = new THREE.Group();
      item.name = file.replace('.glb', '');
      item.add(model);
      item.scale.setScalar(targetSize / Math.max(rawSize.x, rawSize.z));
      item.rotation.y = rotY;
      item.position.set(offsetX, 0, offsetZ);
      loungeGroup.add(item);
      item.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(item);
      item.position.y = -box.min.y;
      console.log('[LOUNGE] loaded', file, { offsetX, offsetZ });
    });
  }

  // ← Add loadIntoLounge() calls here once you decide on the new models

  // ── Chess set — bottom-right floor ridge ─────────────────────────────────
  new THREE.GLTFLoader(loadingManager).load('/Office/3D Models/chessset.glb', (gltf) => {
    const model = gltf.scene;
    const rawBox = new THREE.Box3().setFromObject(model);
    const rawSize = new THREE.Vector3(); const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize); rawBox.getCenter(rawCenter);
    model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; chessMeshes.push(n); } });
    model.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);
    const chessSet = new THREE.Group();
    chessSet.name = 'chess-set';
    chessSet.add(model);
    chessSet.scale.setScalar(4.0 / Math.max(rawSize.x, rawSize.z));
    chessSet.rotation.y = Math.PI / 2; // 45° CCW from before
    chessSet.position.set(5.2, 0, 4.0); // right ridge, chair-size in from corner
    scene.add(chessSet);
    chessSet.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(chessSet);
    chessSet.position.y = -box.min.y;
    chessSetGroup = chessSet;
  });

  // ── Chess set interaction state ───────────────────────
  let chessMeshes      = [];
  let chessSetGroup    = null;
  let chessHovered     = false;
  let isChessPanelOpen = false;

  // ── Corner speaker (NW top corner, above plant) ──────
  let speakerMeshes = [];
  let speakerGroup  = null;
  new THREE.GLTFLoader(loadingManager).load('/Office/3D Models/speaker.glb', (gltf) => {
    const model = gltf.scene;
    const rawBox = new THREE.Box3().setFromObject(model);
    const rawSize = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize);
    rawBox.getCenter(rawCenter);

    model.traverse(n => {
      if (n.isMesh) {
        n.castShadow = true; n.receiveShadow = true;
        n.userData.baseMat = n.material;
        speakerMeshes.push(n);
      }
    });
    model.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);

    const speaker = new THREE.Group();
    speaker.add(model);
    speaker.scale.setScalar(0.45 / Math.max(rawSize.x, rawSize.y, rawSize.z));

    speaker.rotation.y = Math.PI * 0.75;
    speaker.position.set(
      -FLOOR_SIZE / 2 + 0.3,
      WALL_HEIGHT - 0.35,
      -FLOOR_SIZE / 2 + 0.3
    );
    scene.add(speaker);
    speakerGroup = speaker;
  });

  // ── NW Wall Logo (extruded SVG) ──────────────────────
  // Fetch first, strip gradient url() fills (unsupported by SVGLoader) to silence warnings
  // Mounted between left column (z≈2.19) and open edge (z≈6), centred at z≈4.1
  function loadSVGClean(url, onLoad) {
    fetch(url)
      .then(r => r.text())
      .then(svgText => {
        // Replace fill/stroke="url(#...)" with a plain solid so SVGLoader doesn't warn
        const cleaned = svgText
          .replace(/fill="url\([^"]*\)"/g, 'fill="#2398B2"')
          .replace(/stroke="url\([^"]*\)"/g, 'stroke="#2398B2"');
        const blob = new Blob([cleaned], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);
        new THREE.SVGLoader(loadingManager).load(blobUrl, (data) => {
          URL.revokeObjectURL(blobUrl);
          onLoad(data);
        });
      });
  }

  loadSVGClean('/logo-extrude.svg', (data) => {
    const SVG_W   = 1627;
    const SVG_H   = 2192;
    const TGT_H   = 2.0;                  // world-unit height
    const s       = TGT_H / SVG_H;
    const DEPTH   = 0.07 / s;             // extrude depth in SVG units → 0.07 world units

    // MeshStandardMaterial with vertexColors — gradient matches SVG, lighting adds depth
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.15,
    });

    // Point light from in front of the logo — even front-face illumination
    const logoLight = new THREE.PointLight(0xffffff, 0.9, 6);
    logoLight.position.set(-FLOOR_SIZE / 2 + 1.5, 1.6, (2.19 + 6.0) / 2);
    scene.add(logoLight);

    // convertSRGBToLinear so vertex colors survive sRGBEncoding output and display as intended
    const c1 = new THREE.Color(0x2398B2).convertSRGBToLinear();
    const c2 = new THREE.Color(0x2DB1A1).convertSRGBToLinear();

    const inner = new THREE.Group();
    data.paths.forEach(path => {
      THREE.SVGLoader.createShapes(path).forEach(shape => {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: false });

        // Per-vertex gradient: SVG y=0 (top) → #2398B2, y=SVG_H (bottom) → #2DB1A1
        const pos = geo.attributes.position;
        const colArr = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          const t = THREE.MathUtils.clamp(pos.getY(i) / SVG_H, 0, 1);
          const c = new THREE.Color().lerpColors(c1, c2, t);
          colArr[i * 3] = c.r; colArr[i * 3 + 1] = c.g; colArr[i * 3 + 2] = c.b;
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));

        inner.add(new THREE.Mesh(geo, mat));
      });
    });

    // Scale + flip Y (SVG Y-down → 3D Y-up)
    inner.scale.set(s, -s, s);
    // Centre logo at local origin using known SVG content extents
    inner.position.set(-(SVG_W / 2) * s, (SVG_H / 2) * s, 0);

    // Mount: rotation.y = π/2 turns the XY-plane logo so it faces +X (into the room)
    const mount = new THREE.Group();
    mount.add(inner);
    mount.rotation.y = Math.PI / 2;

    // World position: flush on NW wall, centred in the open bay (z≈4.1), mid-wall height
    mount.position.set(-FLOOR_SIZE / 2 + 0.01, 1.6, (2.19 + 6.0) / 2);
    scene.add(mount);
  });

  // ── Dog — under NW wall logo ─────────────────────────
  let dogGroup      = null;
  let dogMeshes     = [];
  let dogBaseScale  = 1;
  let dogHovered    = false;
  let isDogPanelOpen = false;

  new THREE.GLTFLoader(loadingManager).load('/Office/3D Models/dog.glb', (gltf) => {
    const model = gltf.scene;
    const rawBox = new THREE.Box3().setFromObject(model);
    const rawSize = new THREE.Vector3(); const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize); rawBox.getCenter(rawCenter);
    model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; dogMeshes.push(n); } });
    model.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);
    const dog = new THREE.Group();
    dog.name = 'dog';
    dog.add(model);
    dogBaseScale = 1.2 / Math.max(rawSize.x, rawSize.z);
    dog.scale.setScalar(dogBaseScale);
    dog.rotation.y = Math.PI; // 90° CW from before → faces toward viewer
    dog.position.set(-5.7, 0, 4.1);
    scene.add(dog);
    dog.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(dog);
    dog.position.y = -box.min.y;
    dogGroup = dog;
  });

  // ── Resize ───────────────────────────────────────────
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    aspect = w / h;
    camera.left   = -frustum * aspect / 2;
    camera.right  =  frustum * aspect / 2;
    camera.top    =  frustum / 2;
    camera.bottom = -frustum / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  resize();
  window.addEventListener('resize', resize);

  // ── Davis floating panel (injected styles + HTML) ───
  const panelStyle = document.createElement('style');
  panelStyle.textContent = `
    .davis-panel {
      position: fixed; z-index: 100; pointer-events: auto;
      font-family: 'DM Sans', 'Poppins', sans-serif;
      min-width: 260px; max-width: 300px;
      background: rgba(10, 14, 28, 0.88);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 18px 20px 14px;
      color: #fff;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(35,152,178,0.15);
      opacity: 0; transform: translateY(8px) scale(0.96);
      transition: opacity .3s, transform .3s;
      display: none;
    }
    .davis-panel.visible { display: block; }
    .davis-panel.show { opacity: 1; transform: translateY(0) scale(1); }
    .davis-panel__close {
      position: absolute; top: 10px; right: 12px;
      background: none; border: none; color: #fff; font-size: 14px;
      cursor: pointer; opacity: 0.5; transition: opacity .15s;
      padding: 4px;
    }
    .davis-panel__close:hover { opacity: 1; }
    .davis-panel__name {
      font-size: 15px; font-weight: 700; margin-bottom: 14px;
      background: linear-gradient(90deg, #2398B2, #2DB1A1);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .davis-panel__option {
      padding: 10px 12px; margin: 0 -8px; border-radius: 10px;
      cursor: pointer; font-size: 14px; transition: background .15s;
    }
    .davis-panel__option:hover { background: rgba(255,255,255,0.08); }
    .davis-panel__back {
      background: none; border: none; color: rgba(255,255,255,0.5);
      font-size: 13px; cursor: pointer; padding: 0 0 8px;
      transition: color .15s;
    }
    .davis-panel__back:hover { color: #fff; }
    .davis-panel__sub { display: none; }
    .davis-panel__sub.active { display: block; }
    .davis-panel__main { display: block; }
    .davis-panel__main.hidden { display: none; }
    .davis-chat__messages {
      max-height: 150px; overflow-y: auto; margin-bottom: 10px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .davis-chat__msg {
      font-size: 13px; line-height: 1.4; padding: 8px 12px;
      border-radius: 12px; max-width: 90%;
    }
    .davis-chat__msg--davis {
      background: rgba(35,152,178,0.2); align-self: flex-start;
      border: 1px solid rgba(35,152,178,0.25);
    }
    .davis-chat__msg--user {
      background: rgba(255,255,255,0.1); align-self: flex-end;
    }
    .davis-chat__input-wrap { display: flex; gap: 6px; }
    .davis-chat__input {
      flex: 1; background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;
      padding: 8px 12px; color: #fff; font-size: 13px; outline: none;
      font-family: inherit;
    }
    .davis-chat__input::placeholder { color: rgba(255,255,255,0.3); }
    .davis-chat__input:focus { border-color: rgba(35,152,178,0.5); }
    .davis-task {
      padding: 8px 0; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .davis-task:last-child { border-bottom: none; }
    .davis-portfolio { font-size: 13px; opacity: 0.7; padding: 8px 0; }
  `;
  document.head.appendChild(panelStyle);

  // Build panel DOM
  const panel = document.createElement('div');
  panel.className = 'davis-panel';
  panel.innerHTML = `
    <div class="davis-panel__main">
      <button class="davis-panel__close">✕</button>
      <div class="davis-panel__name">Davis — VC Analyst</div>
      <div class="davis-panel__options">
        <div class="davis-panel__option" data-action="chat">💬 Talk to Davis</div>
        <div class="davis-panel__option" data-action="tasks">📋 View completed tasks</div>
        <div class="davis-panel__option" data-action="portfolio">📊 Ask for portfolio update</div>
      </div>
    </div>
    <div class="davis-panel__sub" data-sub="chat">
      <button class="davis-panel__back">← Back</button>
      <div class="davis-panel__name">Talk to Davis</div>
      <div class="davis-chat__messages">
        <div class="davis-chat__msg davis-chat__msg--davis">Hey, what can I help you with?</div>
      </div>
      <div class="davis-chat__input-wrap">
        <input type="text" class="davis-chat__input" placeholder="Type a message…">
      </div>
    </div>
    <div class="davis-panel__sub" data-sub="tasks">
      <button class="davis-panel__back">← Back</button>
      <div class="davis-panel__name">Completed Tasks</div>
      <div class="davis-tasks">
        <div class="davis-task">✅ Reviewed Q4 earnings report</div>
        <div class="davis-task">✅ Updated deal pipeline spreadsheet</div>
        <div class="davis-task">✅ Sent follow-up to Series B lead</div>
        <div class="davis-task">✅ Compiled competitor analysis brief</div>
      </div>
    </div>
    <div class="davis-panel__sub" data-sub="portfolio">
      <button class="davis-panel__back">← Back</button>
      <div class="davis-panel__name">Portfolio Update</div>
      <div class="davis-portfolio">
        <p>Pulling latest numbers…</p>
        <p style="margin-top:8px;opacity:0.5;font-size:12px">Portfolio value: €12.4M · IRR 22.3%</p>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const panelMain = panel.querySelector('.davis-panel__main');
  const panelSubs = panel.querySelectorAll('.davis-panel__sub');
  let isPanelOpen = false;
  let davisGroupRef = null;  // set once Davis loads

  function showPanel() {
    isPanelOpen = true;
    panelMain.classList.remove('hidden');
    panelSubs.forEach(s => s.classList.remove('active'));
    panel.classList.add('visible');
    requestAnimationFrame(() => panel.classList.add('show'));
  }

  function hidePanel() {
    panel.classList.remove('show');
    setTimeout(() => {
      panel.classList.remove('visible');
      isPanelOpen = false;
    }, 300);
  }

  // Panel option clicks → open sub-panel
  panel.querySelectorAll('.davis-panel__option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = opt.dataset.action;
      panelMain.classList.add('hidden');
      panel.querySelector(`[data-sub="${action}"]`).classList.add('active');
    });
  });

  // Back buttons → return to main
  panel.querySelectorAll('.davis-panel__back').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panelSubs.forEach(s => s.classList.remove('active'));
      panelMain.classList.remove('hidden');
    });
  });

  // Close button
  panel.querySelector('.davis-panel__close').addEventListener('click', (e) => {
    e.stopPropagation();
    hidePanel();
    if (scene.userData.davisClosePanel) scene.userData.davisClosePanel();
  });

  // Click outside panel → close
  window.addEventListener('pointerdown', (e) => {
    if (!isPanelOpen) return;
    if (panel.contains(e.target)) return;
    hidePanel();
    if (scene.userData.davisClosePanel) scene.userData.davisClosePanel();
  });

  // Chat input sends user messages (shell only — no AI)
  const chatInput = panel.querySelector('.davis-chat__input');
  const chatMsgs = panel.querySelector('.davis-chat__messages');
  chatInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !chatInput.value.trim()) return;
    const msg = document.createElement('div');
    msg.className = 'davis-chat__msg davis-chat__msg--user';
    msg.textContent = chatInput.value.trim();
    chatMsgs.appendChild(msg);
    chatInput.value = '';
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    // Placeholder Davis reply
    setTimeout(() => {
      const reply = document.createElement('div');
      reply.className = 'davis-chat__msg davis-chat__msg--davis';
      reply.textContent = "I'll look into that for you.";
      chatMsgs.appendChild(reply);
      chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }, 800);
  });

  // Stop panel clicks from reaching the wave-trigger click handler
  panel.addEventListener('click', (e) => e.stopPropagation());

  // Project Davis position → screen coords (called in render loop)
  const projVec = new THREE.Vector3();
  function updatePanelPosition() {
    if (!isPanelOpen || !davisGroupRef) return;
    // Project a point near Davis's chest/head
    projVec.set(
      davisGroupRef.position.x,
      davisGroupRef.position.y + 0.7,
      davisGroupRef.position.z
    );
    projVec.project(camera);
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;
    const sx = projVec.x * hw + hw;
    const sy = -projVec.y * hh + hh;
    panel.style.left = (sx + 30) + 'px';
    panel.style.top  = (sy - 60) + 'px';
  }

  // ── Morgan panel ─────────────────────────────────────
  const morganPanelStyle = document.createElement('style');
  morganPanelStyle.textContent = `
    .morgan-panel {
      position: fixed; z-index: 10002; width: 260px;
      background: rgba(10, 14, 28, 0.88);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 18px 20px 14px;
      color: #fff;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(35,152,178,0.15);
      opacity: 0; transform: translateY(8px) scale(0.96);
      transition: opacity .3s, transform .3s;
      display: none;
    }
    .morgan-panel.visible { display: block; }
    .morgan-panel.show { opacity: 1; transform: translateY(0) scale(1); }
    .morgan-panel__close {
      position: absolute; top: 10px; right: 12px;
      background: none; border: none; color: #fff; font-size: 14px;
      cursor: pointer; opacity: 0.5; transition: opacity .15s; padding: 4px;
    }
    .morgan-panel__close:hover { opacity: 1; }
    .morgan-panel__name {
      font-size: 15px; font-weight: 700; margin-bottom: 14px;
      background: linear-gradient(90deg, #2398B2, #2DB1A1);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .morgan-panel__option {
      padding: 10px 12px; margin: 0 -8px; border-radius: 10px;
      cursor: pointer; font-size: 14px; transition: background .15s;
    }
    .morgan-panel__option:hover { background: rgba(255,255,255,0.08); }
    .morgan-panel__back {
      background: none; border: none; color: rgba(255,255,255,0.5);
      font-size: 13px; cursor: pointer; padding: 0 0 8px; transition: color .15s;
    }
    .morgan-panel__back:hover { color: #fff; }
    .morgan-panel__sub { display: none; }
    .morgan-panel__sub.active { display: block; }
    .morgan-panel__main { display: block; }
    .morgan-panel__main.hidden { display: none; }
    .morgan-chat__messages {
      max-height: 150px; overflow-y: auto; margin-bottom: 10px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .morgan-chat__msg {
      font-size: 13px; line-height: 1.4; padding: 8px 12px;
      border-radius: 12px; max-width: 90%;
    }
    .morgan-chat__msg--morgan {
      background: rgba(35,152,178,0.2); align-self: flex-start;
      border: 1px solid rgba(35,152,178,0.25);
    }
    .morgan-chat__msg--user {
      background: rgba(255,255,255,0.1); align-self: flex-end;
    }
    .morgan-chat__input-wrap { display: flex; gap: 6px; }
    .morgan-chat__input {
      flex: 1; background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;
      padding: 8px 12px; color: #fff; font-size: 13px; outline: none;
      font-family: inherit;
    }
    .morgan-chat__input::placeholder { color: rgba(255,255,255,0.3); }
    .morgan-chat__input:focus { border-color: rgba(35,152,178,0.5); }
    .morgan-task { padding: 8px 0; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .morgan-task:last-child { border-bottom: none; }
    .morgan-portfolio { font-size: 13px; opacity: 0.7; padding: 8px 0; }
  `;
  document.head.appendChild(morganPanelStyle);

  const morganPanel = document.createElement('div');
  morganPanel.className = 'morgan-panel';
  morganPanel.innerHTML = `
    <div class="morgan-panel__main">
      <button class="morgan-panel__close">✕</button>
      <div class="morgan-panel__name">Morgan — Cap Table Manager</div>
      <div class="morgan-panel__options">
        <div class="morgan-panel__option" data-action="chat">💬 Talk to Morgan</div>
        <div class="morgan-panel__option" data-action="tasks">📋 View completed tasks</div>
        <div class="morgan-panel__option" data-action="captable">📊 Cap table overview</div>
      </div>
    </div>
    <div class="morgan-panel__sub" data-sub="chat">
      <button class="morgan-panel__back">← Back</button>
      <div class="morgan-panel__name">Talk to Morgan</div>
      <div class="morgan-chat__messages">
        <div class="morgan-chat__msg morgan-chat__msg--morgan">Hi! Need anything on the cap table?</div>
      </div>
      <div class="morgan-chat__input-wrap">
        <input type="text" class="morgan-chat__input" placeholder="Type a message…">
      </div>
    </div>
    <div class="morgan-panel__sub" data-sub="tasks">
      <button class="morgan-panel__back">← Back</button>
      <div class="morgan-panel__name">Completed Tasks</div>
      <div class="morgan-tasks">
        <div class="morgan-task">✅ Updated Series A share allocation</div>
        <div class="morgan-task">✅ Reconciled option pool grants</div>
        <div class="morgan-task">✅ Generated waterfall analysis</div>
        <div class="morgan-task">✅ Filed 409A valuation update</div>
      </div>
    </div>
    <div class="morgan-panel__sub" data-sub="captable">
      <button class="morgan-panel__back">← Back</button>
      <div class="morgan-panel__name">Cap Table Overview</div>
      <div class="morgan-portfolio">
        <p>Loading latest cap table…</p>
        <p style="margin-top:8px;opacity:0.5;font-size:12px">Total shares: 10M · Option pool: 15% · Last round: Series A</p>
      </div>
    </div>
  `;
  document.body.appendChild(morganPanel);

  const morganPanelMain = morganPanel.querySelector('.morgan-panel__main');
  const morganPanelSubs = morganPanel.querySelectorAll('.morgan-panel__sub');
  let isMorganPanelOpen = false;
  let morganGroupRef = null;

  function showMorganPanel() {
    isMorganPanelOpen = true;
    morganPanelMain.classList.remove('hidden');
    morganPanelSubs.forEach(s => s.classList.remove('active'));
    morganPanel.classList.add('visible');
    requestAnimationFrame(() => morganPanel.classList.add('show'));
  }

  function hideMorganPanel() {
    morganPanel.classList.remove('show');
    setTimeout(() => {
      morganPanel.classList.remove('visible');
      isMorganPanelOpen = false;
    }, 300);
  }

  // Panel option clicks → sub-panel
  morganPanel.querySelectorAll('.morgan-panel__option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      morganPanelMain.classList.add('hidden');
      morganPanel.querySelector(`[data-sub="${opt.dataset.action}"]`).classList.add('active');
    });
  });

  // Back buttons
  morganPanel.querySelectorAll('.morgan-panel__back').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      morganPanelSubs.forEach(s => s.classList.remove('active'));
      morganPanelMain.classList.remove('hidden');
    });
  });

  // Close button
  morganPanel.querySelector('.morgan-panel__close').addEventListener('click', (e) => {
    e.stopPropagation();
    hideMorganPanel();
    if (scene.userData.morganClosePanel) scene.userData.morganClosePanel();
  });

  morganPanel.addEventListener('click', (e) => e.stopPropagation());

  // Click outside Morgan panel
  window.addEventListener('pointerdown', (e) => {
    if (!isMorganPanelOpen) return;
    if (morganPanel.contains(e.target)) return;
    hideMorganPanel();
    if (scene.userData.morganClosePanel) scene.userData.morganClosePanel();
  });

  // Chat input
  const morganChatInput = morganPanel.querySelector('.morgan-chat__input');
  const morganChatMsgs = morganPanel.querySelector('.morgan-chat__messages');
  morganChatInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !morganChatInput.value.trim()) return;
    const msg = document.createElement('div');
    msg.className = 'morgan-chat__msg morgan-chat__msg--user';
    msg.textContent = morganChatInput.value.trim();
    morganChatMsgs.appendChild(msg);
    morganChatInput.value = '';
    morganChatMsgs.scrollTop = morganChatMsgs.scrollHeight;
    setTimeout(() => {
      const reply = document.createElement('div');
      reply.className = 'morgan-chat__msg morgan-chat__msg--morgan';
      reply.textContent = 'Let me check on that for you…';
      morganChatMsgs.appendChild(reply);
      morganChatMsgs.scrollTop = morganChatMsgs.scrollHeight;
    }, 600);
  });

  // Project Morgan position → screen coords
  const morganProjVec = new THREE.Vector3();
  function updateMorganPanelPosition() {
    if (!isMorganPanelOpen || !morganGroupRef) return;
    morganProjVec.set(
      morganGroupRef.position.x,
      morganGroupRef.position.y + 0.7,
      morganGroupRef.position.z
    );
    morganProjVec.project(camera);
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;
    const sx = morganProjVec.x * hw + hw;
    const sy = -morganProjVec.y * hh + hh;
    morganPanel.style.left = (sx + 30) + 'px';
    morganPanel.style.top  = (sy - 60) + 'px';
  }

  // ── Ripley panel ──────────────────────────────────────
  const ripleyPanelStyle = document.createElement('style');
  ripleyPanelStyle.textContent = `
    .ripley-panel {
      position: fixed; z-index: 10002; width: 260px;
      background: rgba(10, 14, 28, 0.88);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px; padding: 18px 20px 14px; color: #fff;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(35,152,178,0.15);
      opacity: 0; transform: translateY(8px) scale(0.96);
      transition: opacity .3s, transform .3s; display: none;
    }
    .ripley-panel.visible { display: block; }
    .ripley-panel.show { opacity: 1; transform: translateY(0) scale(1); }
    .ripley-panel__close {
      position: absolute; top: 10px; right: 12px;
      background: none; border: none; color: #fff; font-size: 14px;
      cursor: pointer; opacity: 0.5; transition: opacity .15s; padding: 4px;
    }
    .ripley-panel__close:hover { opacity: 1; }
    .ripley-panel__name {
      font-size: 15px; font-weight: 700; margin-bottom: 14px;
      background: linear-gradient(90deg, #2398B2, #2DB1A1);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .ripley-panel__option {
      padding: 10px 12px; margin: 0 -8px; border-radius: 10px;
      cursor: pointer; font-size: 14px; transition: background .15s;
    }
    .ripley-panel__option:hover { background: rgba(255,255,255,0.08); }
    .ripley-panel__back {
      background: none; border: none; color: rgba(255,255,255,0.5);
      font-size: 13px; cursor: pointer; padding: 0 0 8px; transition: color .15s;
    }
    .ripley-panel__back:hover { color: #fff; }
    .ripley-panel__sub { display: none; }
    .ripley-panel__sub.active { display: block; }
    .ripley-panel__main { display: block; }
    .ripley-panel__main.hidden { display: none; }
    .ripley-chat__messages {
      max-height: 150px; overflow-y: auto; margin-bottom: 10px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .ripley-chat__msg {
      font-size: 13px; line-height: 1.4; padding: 8px 12px;
      border-radius: 12px; max-width: 90%;
    }
    .ripley-chat__msg--ripley {
      background: rgba(35,152,178,0.2); align-self: flex-start;
      border: 1px solid rgba(35,152,178,0.25);
    }
    .ripley-chat__msg--user {
      background: rgba(255,255,255,0.1); align-self: flex-end;
    }
    .ripley-chat__input-wrap { display: flex; gap: 6px; }
    .ripley-chat__input {
      flex: 1; background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;
      padding: 8px 12px; color: #fff; font-size: 13px; outline: none; font-family: inherit;
    }
    .ripley-chat__input::placeholder { color: rgba(255,255,255,0.3); }
    .ripley-chat__input:focus { border-color: rgba(35,152,178,0.5); }
    .ripley-task { padding: 8px 0; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .ripley-task:last-child { border-bottom: none; }
  `;
  document.head.appendChild(ripleyPanelStyle);

  const ripleyPanel = document.createElement('div');
  ripleyPanel.className = 'ripley-panel';
  ripleyPanel.innerHTML = `
    <div class="ripley-panel__main">
      <button class="ripley-panel__close">✕</button>
      <div class="ripley-panel__name">Ripley — Flash Report Chaser</div>
      <div class="ripley-panel__options">
        <div class="ripley-panel__option" data-action="chat">💬 Talk to Ripley</div>
        <div class="ripley-panel__option" data-action="tasks">📋 View completed tasks</div>
        <div class="ripley-panel__option" data-action="reports">📄 Flash reports</div>
      </div>
    </div>
    <div class="ripley-panel__sub" data-sub="chat">
      <button class="ripley-panel__back">← Back</button>
      <div class="ripley-panel__name">Talk to Ripley</div>
      <div class="ripley-chat__messages">
        <div class="ripley-chat__msg ripley-chat__msg--ripley">Hold on, just finishing a call — what's up?</div>
      </div>
      <div class="ripley-chat__input-wrap">
        <input type="text" class="ripley-chat__input" placeholder="Type a message…">
      </div>
    </div>
    <div class="ripley-panel__sub" data-sub="tasks">
      <button class="ripley-panel__back">← Back</button>
      <div class="ripley-panel__name">Completed Tasks</div>
      <div class="ripley-tasks">
        <div class="ripley-task">✅ Chased Q3 flash report from PortCo Alpha</div>
        <div class="ripley-task">✅ Compiled weekly LP update</div>
        <div class="ripley-task">✅ Followed up on overdue metrics</div>
        <div class="ripley-task">✅ Sent reminder to 3 portfolio companies</div>
      </div>
    </div>
    <div class="ripley-panel__sub" data-sub="reports">
      <button class="ripley-panel__back">← Back</button>
      <div class="ripley-panel__name">Flash Reports</div>
      <div style="font-size:13px;opacity:0.7;padding:8px 0">
        <p>📊 PortCo Alpha — received 2h ago</p>
        <p style="margin-top:6px">⏳ PortCo Beta — overdue by 3 days</p>
        <p style="margin-top:6px">📊 PortCo Gamma — received yesterday</p>
      </div>
    </div>
  `;
  document.body.appendChild(ripleyPanel);

  const ripleyPanelMain = ripleyPanel.querySelector('.ripley-panel__main');
  const ripleyPanelSubs = ripleyPanel.querySelectorAll('.ripley-panel__sub');
  let isRipleyPanelOpen = false;
  let ripleyGroupRef = null;

  function showRipleyPanel() {
    isRipleyPanelOpen = true;
    ripleyPanelMain.classList.remove('hidden');
    ripleyPanelSubs.forEach(s => s.classList.remove('active'));
    ripleyPanel.classList.add('visible');
    requestAnimationFrame(() => ripleyPanel.classList.add('show'));
  }
  function hideRipleyPanel() {
    ripleyPanel.classList.remove('show');
    setTimeout(() => { ripleyPanel.classList.remove('visible'); isRipleyPanelOpen = false; }, 300);
  }

  ripleyPanel.querySelectorAll('.ripley-panel__option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      ripleyPanelMain.classList.add('hidden');
      ripleyPanel.querySelector(`[data-sub="${opt.dataset.action}"]`).classList.add('active');
    });
  });
  ripleyPanel.querySelectorAll('.ripley-panel__back').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      ripleyPanelSubs.forEach(s => s.classList.remove('active'));
      ripleyPanelMain.classList.remove('hidden');
    });
  });
  ripleyPanel.querySelector('.ripley-panel__close').addEventListener('click', (e) => {
    e.stopPropagation();
    hideRipleyPanel();
    if (scene.userData.ripleyClosePanel) scene.userData.ripleyClosePanel();
  });
  ripleyPanel.addEventListener('click', (e) => e.stopPropagation());

  window.addEventListener('pointerdown', (e) => {
    if (!isRipleyPanelOpen) return;
    if (ripleyPanel.contains(e.target)) return;
    hideRipleyPanel();
    if (scene.userData.ripleyClosePanel) scene.userData.ripleyClosePanel();
  });

  const ripleyChatInput = ripleyPanel.querySelector('.ripley-chat__input');
  const ripleyChatMsgs = ripleyPanel.querySelector('.ripley-chat__messages');
  ripleyChatInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !ripleyChatInput.value.trim()) return;
    const msg = document.createElement('div');
    msg.className = 'ripley-chat__msg ripley-chat__msg--user';
    msg.textContent = ripleyChatInput.value.trim();
    ripleyChatMsgs.appendChild(msg);
    ripleyChatInput.value = '';
    ripleyChatMsgs.scrollTop = ripleyChatMsgs.scrollHeight;
    setTimeout(() => {
      const reply = document.createElement('div');
      reply.className = 'ripley-chat__msg ripley-chat__msg--ripley';
      reply.textContent = 'On it — let me check my notes…';
      ripleyChatMsgs.appendChild(reply);
      ripleyChatMsgs.scrollTop = ripleyChatMsgs.scrollHeight;
    }, 600);
  });

  const ripleyProjVec = new THREE.Vector3();
  function updateRipleyPanelPosition() {
    if (!isRipleyPanelOpen || !ripleyGroupRef) return;
    ripleyProjVec.set(ripleyGroupRef.position.x, ripleyGroupRef.position.y + 0.7, ripleyGroupRef.position.z);
    ripleyProjVec.project(camera);
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;
    ripleyPanel.style.left = (ripleyProjVec.x * hw + hw + 30) + 'px';
    ripleyPanel.style.top  = (-ripleyProjVec.y * hh + hh - 60) + 'px';
  }

  // ── Ripley character ─────────────────────────────────
  let ripleyMixer = null;
  const ripleyMeshes = [];
  const ripleyOutlines = [];
  let ripleyHovered = false;

  new THREE.GLTFLoader(loadingManager).load('/Ripley.glb', (gltf) => {
    const model = gltf.scene;
    console.log('Ripley animations:', gltf.animations.map(a => a.name));

    model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

    const ripleyGroup = new THREE.Group();
    ripleyGroup.add(model);
    ripleyGroup.scale.setScalar(0.0001);

    // Pace along the right side of the office (near windows)
    const PACE_Z_MIN = -4.5;
    const PACE_Z_MAX = 3.0;
    const PACE_X = 3.5;
    ripleyGroup.position.set(PACE_X, 0, PACE_Z_MIN);
    ripleyGroup.rotation.y = 0;  // animation handles facing via hip bone

    scene.add(ripleyGroup);
    ripleyGroup.position.y = 0.9;
    ripleyGroupRef = ripleyGroup;

    // Outline glow
    const rOutlineMat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0xffffff) }, intensity: { value: 0.9 } },
      vertexShader: `
        #include <skinning_pars_vertex>
        void main() {
          #include <skinbase_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          transformed += normal * 120.0;
          #include <project_vertex>
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor; uniform float intensity;
        void main() { gl_FragColor = vec4(glowColor, intensity); }
      `,
      side: THREE.BackSide, transparent: true, depthWrite: false, skinning: true,
    });

    model.traverse(n => {
      if (n.isSkinnedMesh) {
        ripleyMeshes.push(n);
        const outline = new THREE.SkinnedMesh(n.geometry, rOutlineMat.clone());
        outline.bind(n.skeleton, n.bindMatrix);
        outline.visible = false; outline.castShadow = false;
        outline.receiveShadow = false; outline.frustumCulled = false;
        n.parent.add(outline);
        ripleyOutlines.push(outline);
      }
    });

    // Animations
    ripleyMixer = new THREE.AnimationMixer(model);
    const rIdleClip = THREE.AnimationClip.findByName(gltf.animations, 'Idle');
    const rPaceClip = THREE.AnimationClip.findByName(gltf.animations, 'PhonePacing');
    const rWaveClip = THREE.AnimationClip.findByName(gltf.animations, 'Wave');
    const rIdleAction = rIdleClip ? ripleyMixer.clipAction(rIdleClip) : null;
    const rPaceAction = rPaceClip ? ripleyMixer.clipAction(rPaceClip) : null;
    const rWaveAction = rWaveClip ? ripleyMixer.clipAction(rWaveClip) : null;

    // Loop strategy: pace (LoopOnce) → fade to idle (1s pause) → fade to pace (reset)
    const LOOP_FADE = 0.5;       // crossfade duration
    const LOOP_IDLE_PAUSE = 1.0; // seconds to idle between loops
    // States: 'playing' | 'fading_to_idle' | 'idle_pause' | 'fading_to_pace'
    if (rPaceAction) {
      rPaceAction.setLoop(THREE.LoopRepeat);
      rPaceAction.play(); rPaceAction.setEffectiveWeight(1);
    }
    if (rIdleAction) { rIdleAction.play(); rIdleAction.setEffectiveWeight(0); }
    if (rWaveAction) { rWaveAction.play(); rWaveAction.setEffectiveWeight(0); rWaveAction.setLoop(THREE.LoopOnce); }


    // ── Hip-bone-driven pacing + state machine ─────────
    const ripleyStartPos = ripleyGroup.position.clone();
    const hipMin = 97;
    const hipMax = 548;
    const hipMid = (hipMin + hipMax) / 2;
    const pacingDistance = 2.5;
    let useHipMotion = true;

    // State: 'pacing' | 'transitioning_to_interact' | 'interacting' | 'transitioning_to_pacing'
    let rState = 'pacing';
    const frozenPos = new THREE.Vector3();
    let resumeBlendTime = 0;
    const RESUME_BLEND_DUR = 1.0;
    let persistentOffset = 0; // world-space correction so she paces around her frozen position
    let _prevPaceTime = 0; // for detecting loop wrap
    let lastHipBoneY = null; // for detecting hip-bone jump at loop boundary

    function getHipDrivenZ() {
      const hipBone = ripleyGroup.getObjectByName('mixamorigHips');
      if (!hipBone) return ripleyGroup.position.z;
      const hipY = hipBone.position.y;
      const normalizedOffset = (hipY - hipMid) / ((hipMax - hipMin) / 2);
      return ripleyStartPos.z + normalizedOffset * pacingDistance;
    }

    function updateRipleyRootMotion(dt) {
      if (rState === 'pacing' && useHipMotion) {
        const hipBone = ripleyGroup.getObjectByName('mixamorigHips');
        const hipBoneY = hipBone ? hipBone.position.y : 0;
        // Detect loop wrap (time jumped backward)
        if (rPaceAction && rPaceAction.time < _prevPaceTime) {
          console.log('[RIPLEY LOOP WRAP]', {
            prevActionTime: _prevPaceTime.toFixed(2),
            newActionTime: rPaceAction.time.toFixed(2),
            hipBoneY: hipBoneY.toFixed(2),
            persistentOffset: persistentOffset.toFixed(3),
            posZBefore: ripleyGroup.position.z.toFixed(3),
          });
        }
        _prevPaceTime = rPaceAction ? rPaceAction.time : 0;
        // Detect hip-bone jump at loop boundary and absorb it into persistentOffset
        if (lastHipBoneY !== null && (lastHipBoneY - hipBoneY) > 100) {
          const posBeforeJump = ripleyGroup.position.z;
          const newHipDrivenZ = getHipDrivenZ();
          persistentOffset = posBeforeJump - newHipDrivenZ;
          console.log('[RIPLEY] Loop wrap detected, new persistentOffset:', persistentOffset.toFixed(3),
            '| hipY jumped from', lastHipBoneY.toFixed(2), '→', hipBoneY.toFixed(2));
        }
        lastHipBoneY = hipBoneY;
        // Log last 2s of clip
        if (rPaceAction && rPaceAction.time > 35) {
          console.log('[RIPLEY LOOP EDGE]', {
            actionTime: rPaceAction.time.toFixed(2),
            hipBoneY: hipBoneY.toFixed(2),
            persistentOffset: persistentOffset.toFixed(3),
            posZ: ripleyGroup.position.z.toFixed(3),
          });
        }
        const unclamped = getHipDrivenZ() + persistentOffset;
        const clamped = Math.max(-5.5, Math.min(5.5, unclamped)); // floor edges only
        ripleyGroup.position.z = clamped;
        if (clamped !== unclamped) {
          persistentOffset -= (unclamped - clamped);
        }
      } else if (rState === 'transitioning_to_interact' || rState === 'interacting') {
        ripleyGroup.position.z = frozenPos.z;
      } else if (rState === 'transitioning_to_pacing') {
        const hipZ = getHipDrivenZ();
        const blend = Math.min(1, resumeBlendTime / RESUME_BLEND_DUR);
        const targetZ = hipZ + persistentOffset;
        ripleyGroup.position.z = frozenPos.z + (targetZ - frozenPos.z) * blend;
        if (blend >= 1) {
          rState = 'pacing';
          useHipMotion = true;
        }
      }
    }

    scene.userData.updateRipleyRootMotion = updateRipleyRootMotion;

    // Interaction state
    let rTargetRotY = ripleyGroup.rotation.y;
    const R_FADE = 0.5;
    let rFadeTarget = null;
    let rFadeFrom = null;
    let rFadeProgress = 0;
    let rWaveTimer = null;
    let rTurnDone = false;

    function updateRipleySequence(dt) {
      // Rotation lerp
      const rot = ripleyGroup.rotation.y;
      const rotDone = Math.abs(rot - rTargetRotY) <= 0.01;

      if (!rotDone) {
        ripleyGroup.rotation.y += (rTargetRotY - rot) * Math.min(1, dt * 4);
      }

      // State: transitioning_to_interact — turn done → start wave + show panel
      if (rState === 'transitioning_to_interact' && rotDone && !rTurnDone) {
        rTurnDone = true;
        ripleyGroup.rotation.y = rTargetRotY;
        // Crossfade idle → wave
        rWaveAction.stop(); rWaveAction.reset();
        rWaveAction.setEffectiveWeight(0); rWaveAction.enabled = true; rWaveAction.play();
        rFadeFrom = rIdleAction;
        rFadeTarget = 'wave';
        rFadeProgress = 0;
        // After wave finishes, fade to idle → interacting state
        if (rWaveTimer) clearTimeout(rWaveTimer);
        rWaveTimer = setTimeout(() => {
          rFadeFrom = rWaveAction;
          rFadeTarget = 'idle';
          rFadeProgress = 0;
          rIdleAction.setEffectiveWeight(0); rIdleAction.enabled = true;
          rState = 'interacting';
        }, (rWaveClip.duration - R_FADE) * 1000);
        showRipleyPanel();
      }

      // State: transitioning_to_pacing — track resume blend time
      if (rState === 'transitioning_to_pacing') {
        resumeBlendTime += dt;
      }

      // Weight crossfade
      if (rFadeTarget) {
        rFadeProgress = Math.min(1, rFadeProgress + dt / R_FADE);
        const from = rFadeFrom;
        const to = rFadeTarget === 'wave' ? rWaveAction
                 : rFadeTarget === 'pace' ? rPaceAction
                 : rIdleAction;
        if (from && to) {
          from.setEffectiveWeight(1 - rFadeProgress);
          to.setEffectiveWeight(rFadeProgress);
        }
        if (rFadeProgress >= 1) {
          if (from && from !== rIdleAction && from !== rPaceAction) {
            from.stop(); from.setEffectiveWeight(0);
          }
          rFadeTarget = null;
        }
      }
    }

    scene.userData.ripleyClosePanel = () => {
      if (rWaveTimer) { clearTimeout(rWaveTimer); rWaveTimer = null; }
      // Kill wave if still playing
      rWaveAction.stop(); rWaveAction.setEffectiveWeight(0);
      // Reset pace action — always LoopRepeat so it never stops after one cycle
      rPaceAction.stop(); rPaceAction.reset();
      rPaceAction.setLoop(THREE.LoopRepeat); rPaceAction.clampWhenFinished = false;
      rPaceAction.setEffectiveWeight(0); rPaceAction.enabled = true; rPaceAction.play();
      rPaceAction.time = rPaceAction.getClip().duration / 2; // start near the turn, not always from 0
      loopState = 'playing';
      // Crossfade idle → pace (weight blend handled by rFadeTarget system)
      rFadeFrom = rIdleAction;
      rFadeTarget = 'pace';
      rFadeProgress = 0;
      rIdleAction.setEffectiveWeight(1);
      // Lerp rotation back to rest
      rTargetRotY = 0;
      // State machine blends from frozenPos to hip-driven pos over RESUME_BLEND_DUR
      frozenPos.copy(ripleyGroup.position);
      resumeBlendTime = 0;
      const _hipNow = getHipDrivenZ();
      persistentOffset = frozenPos.z - _hipNow;
      rState = 'transitioning_to_pacing';
      rTurnDone = false;
    };

    scene.userData.ripleyTrigger = () => {
      if (rState !== 'pacing' || isRipleyPanelOpen) return;
      // Freeze position
      useHipMotion = false;
      frozenPos.copy(ripleyGroup.position);
      rState = 'transitioning_to_interact';
      rTurnDone = false;
      // Stop pace, swap to idle
      rPaceAction.setEffectiveWeight(0);
      loopState = 'playing'; // reset loop cycle
      rIdleAction.setEffectiveWeight(1);
      rFadeTarget = null;
      // Turn toward camera
      rTargetRotY = Math.PI / 4;
    };

    scene.userData.updateRipleySequence = updateRipleySequence;
  }, undefined, (err) => console.error('Ripley load error:', err));

  // ── Davis character ──────────────────────────────────
  let davisMixer = null;
  const davisMeshes = [];
  const davisOutlines = [];
  let davisHovered = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  new THREE.GLTFLoader(loadingManager).load('/Davis.glb', (gltf) => {
    const model = gltf.scene;
    console.log('Davis animations:', gltf.animations.map(a => a.name));

    model.traverse(n => {
      if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
    });

    // New GLB has verts ~10000x → scale 0.0001 for ~1.8m world height
    const davisGroup = new THREE.Group();
    davisGroup.add(model);
    davisGroup.scale.setScalar(0.0001);

    // Position in front of windows, facing into room
    davisGroup.position.set(-1.5, 0, -5.0);
    davisGroup.rotation.y = Math.PI;

    scene.add(davisGroup);

    // Armature origin is at hips — feet are ~half height below. Lift to floor.
    davisGroup.position.y = 0.9;
    davisGroupRef = davisGroup;

    // ── Outline glow meshes (BackSide technique) ──────
    const outlineMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xffffff) },
        intensity: { value: 0.9 },
      },
      vertexShader: `
        #include <skinning_pars_vertex>
        void main() {
          #include <skinbase_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          // Push verts outward along normal for outline thickness
          transformed += normal * 120.0;
          #include <project_vertex>
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        void main() {
          gl_FragColor = vec4(glowColor, intensity);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      skinning: true,
    });

    model.traverse(n => {
      if (n.isSkinnedMesh) {
        davisMeshes.push(n);

        const outline = new THREE.SkinnedMesh(n.geometry, outlineMat.clone());
        outline.bind(n.skeleton, n.bindMatrix);
        outline.visible = false;
        outline.castShadow = false;
        outline.receiveShadow = false;
        outline.frustumCulled = false;
        n.parent.add(outline);
        davisOutlines.push(outline);
      }
    });

    // AnimationMixer — Idle + Waving + Salute
    davisMixer = new THREE.AnimationMixer(model);
    const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'Idle');
    const waveClip = THREE.AnimationClip.findByName(gltf.animations, 'Waving');
    const saluteClip = THREE.AnimationClip.findByName(gltf.animations, 'Salute');
    const idleAction = idleClip ? davisMixer.clipAction(idleClip) : null;
    const waveAction = waveClip ? davisMixer.clipAction(waveClip) : null;
    const saluteAction = saluteClip ? davisMixer.clipAction(saluteClip) : null;
    if (idleAction) { idleAction.play(); idleAction.setEffectiveWeight(1); }
    if (waveAction) { waveAction.play(); waveAction.setEffectiveWeight(0); waveAction.setLoop(THREE.LoopRepeat, 3); }
    if (saluteAction) { saluteAction.play(); saluteAction.setEffectiveWeight(0); saluteAction.setLoop(THREE.LoopOnce); }

    // Auto-fade back to idle when wave finishes
    let waveTimer = null;

    // ── Click: smooth turn toward camera → wave + panel ──
    let isAnimating = false;
    let isReturning = false;
    let targetRotY = davisGroup.rotation.y;
    const FADE_DUR = 0.6;
    let fadeTarget = null; // 'wave', 'salute', or 'idle'
    let fadeFrom = null;
    let fadeProgress = 0;

    function updateDavisSequence(dt) {
      const rot = davisGroup.rotation.y;

      // Smooth rotation lerp
      if (Math.abs(rot - targetRotY) > 0.01) {
        davisGroup.rotation.y += (targetRotY - rot) * Math.min(1, dt * 4);
      } else if (isAnimating && Math.abs(rot - targetRotY) <= 0.01) {
        davisGroup.rotation.y = targetRotY;
        isAnimating = false;
        // Start crossfade to waving — re-prime fully before blending
        waveAction.stop();
        waveAction.reset();
        waveAction.setEffectiveWeight(0);
        waveAction.enabled = true;
        waveAction.play();
        fadeFrom = idleAction;
        fadeTarget = 'wave';
        fadeProgress = 0;
        // After wave clip ends, fade back to idle automatically
        if (waveTimer) clearTimeout(waveTimer);
        waveTimer = setTimeout(() => {
          fadeFrom = waveAction;
          fadeTarget = 'idle';
          fadeProgress = 0;
          idleAction.setEffectiveWeight(0);
          idleAction.enabled = true;
        }, (waveClip.duration * 3 - FADE_DUR) * 1000);
        showPanel();
      } else if (isReturning && Math.abs(rot - targetRotY) <= 0.01) {
        davisGroup.rotation.y = targetRotY;
        isReturning = false;
      }

      // Manual weight crossfade (avoids T-pose from crossFadeTo)
      if (fadeTarget) {
        fadeProgress = Math.min(1, fadeProgress + dt / FADE_DUR);
        const fromAction = fadeFrom;
        const toAction = fadeTarget === 'wave' ? waveAction
                       : fadeTarget === 'salute' ? saluteAction
                       : idleAction;
        if (fromAction && toAction) {
          fromAction.setEffectiveWeight(1 - fadeProgress);
          toAction.setEffectiveWeight(fadeProgress);
        }
        if (fadeProgress >= 1) {
          // Stop the action we faded away from
          if (fromAction && fromAction !== idleAction) {
            fromAction.stop();
            fromAction.setEffectiveWeight(0);
          }
          fadeTarget = null;
        }
      }
    }

    let saluteTimer = null;

    scene.userData.davisClosePanel = () => {
      isAnimating = false;
      if (waveTimer) { clearTimeout(waveTimer); waveTimer = null; }
      // Kill wave, fade to salute
      waveAction.stop();
      waveAction.setEffectiveWeight(0);
      // Prime salute
      saluteAction.stop();
      saluteAction.reset();
      saluteAction.setEffectiveWeight(0);
      saluteAction.enabled = true;
      saluteAction.play();
      fadeFrom = idleAction;
      fadeTarget = 'salute';
      fadeProgress = 0;
      idleAction.setEffectiveWeight(1);
      // After salute finishes, fade to idle + lerp back
      if (saluteTimer) clearTimeout(saluteTimer);
      saluteTimer = setTimeout(() => {
        fadeFrom = saluteAction;
        fadeTarget = 'idle';
        fadeProgress = 0;
        idleAction.setEffectiveWeight(0);
        idleAction.enabled = true;
        isReturning = true;
        targetRotY = Math.PI;
      }, (saluteClip.duration - FADE_DUR) * 1000);
    };

    scene.userData.davisTrigger = () => {
      if (isAnimating || isReturning || isPanelOpen) return;
      isAnimating = true;
      targetRotY = Math.PI / 4;
    };

    scene.userData.updateDavisSequence = updateDavisSequence;
  }, undefined, (err) => console.error('Davis load error:', err));

  // ── Morgan character ─────────────────────────────────
  let morganMixer = null;
  const morganMeshes = [];
  const morganOutlines = [];
  let morganHovered = false;

  new THREE.GLTFLoader(loadingManager).load('/Morgan.glb', (gltf) => {
    const model = gltf.scene;
    console.log('Morgan animations:', gltf.animations.map(a => a.name));

    model.traverse(n => {
      if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
    });

    const morganGroup = new THREE.Group();
    morganGroup.add(model);
    morganGroup.scale.setScalar(0.0001);

    // Position in front of the screen, facing into the room
    morganGroup.position.set(-FLOOR_SIZE / 2 + 1.5, 0, -1.0);
    morganGroup.rotation.y = -Math.PI * 0.5; // face -X (toward NW wall / screen)

    scene.add(morganGroup);
    morganGroup.position.y = 0.9;
    morganGroupRef = morganGroup;

    // ── Outline glow meshes ──────
    const mOutlineMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xffffff) },
        intensity: { value: 0.9 },
      },
      vertexShader: `
        #include <skinning_pars_vertex>
        void main() {
          #include <skinbase_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          transformed += normal * 120.0;
          #include <project_vertex>
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        void main() {
          gl_FragColor = vec4(glowColor, intensity);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      skinning: true,
    });

    model.traverse(n => {
      if (n.isSkinnedMesh) {
        morganMeshes.push(n);
        const outline = new THREE.SkinnedMesh(n.geometry, mOutlineMat.clone());
        outline.bind(n.skeleton, n.bindMatrix);
        outline.visible = false;
        outline.castShadow = false;
        outline.receiveShadow = false;
        outline.frustumCulled = false;
        n.parent.add(outline);
        morganOutlines.push(outline);
      }
    });

    // AnimationMixer — Idle + Wave + Point
    morganMixer = new THREE.AnimationMixer(model);
    const mIdleClip = THREE.AnimationClip.findByName(gltf.animations, 'Idle');
    const mWaveClip = THREE.AnimationClip.findByName(gltf.animations, 'Wave');
    const mPointClip = THREE.AnimationClip.findByName(gltf.animations, 'Point');
    const mIdleAction = mIdleClip ? morganMixer.clipAction(mIdleClip) : null;
    const mWaveAction = mWaveClip ? morganMixer.clipAction(mWaveClip) : null;
    const mPointAction = mPointClip ? morganMixer.clipAction(mPointClip) : null;
    if (mIdleAction) { mIdleAction.play(); mIdleAction.setEffectiveWeight(1); }
    if (mWaveAction) { mWaveAction.play(); mWaveAction.setEffectiveWeight(0); mWaveAction.setLoop(THREE.LoopOnce); }
    if (mPointAction) { mPointAction.play(); mPointAction.setEffectiveWeight(0); mPointAction.setLoop(THREE.LoopOnce); }

    let mWaveTimer = null;
    let mIsAnimating = false;
    let mIsReturning = false;
    let mTargetRotY = morganGroup.rotation.y;
    const mRestRotY = morganGroup.rotation.y; // remember rest rotation
    const M_FADE = 0.6;
    let mFadeTarget = null;
    let mFadeFrom = null;
    let mFadeProgress = 0;

    function updateMorganSequence(dt) {
      const rot = morganGroup.rotation.y;

      if (Math.abs(rot - mTargetRotY) > 0.01) {
        morganGroup.rotation.y += (mTargetRotY - rot) * Math.min(1, dt * 4);
      } else if (mIsAnimating && Math.abs(rot - mTargetRotY) <= 0.01) {
        morganGroup.rotation.y = mTargetRotY;
        mIsAnimating = false;
        // Crossfade to wave
        mWaveAction.stop();
        mWaveAction.reset();
        mWaveAction.setEffectiveWeight(0);
        mWaveAction.enabled = true;
        mWaveAction.play();
        mFadeFrom = mIdleAction;
        mFadeTarget = 'wave';
        mFadeProgress = 0;
        // Auto-fade back to idle after wave
        if (mWaveTimer) clearTimeout(mWaveTimer);
        mWaveTimer = setTimeout(() => {
          mFadeFrom = mWaveAction;
          mFadeTarget = 'idle';
          mFadeProgress = 0;
          mIdleAction.setEffectiveWeight(0);
          mIdleAction.enabled = true;
        }, (mWaveClip.duration - M_FADE) * 1000);
        showMorganPanel();
      } else if (mIsReturning && Math.abs(rot - mTargetRotY) <= 0.01) {
        morganGroup.rotation.y = mTargetRotY;
        mIsReturning = false;
      }

      // Manual weight crossfade
      if (mFadeTarget) {
        mFadeProgress = Math.min(1, mFadeProgress + dt / M_FADE);
        const from = mFadeFrom;
        const to = mFadeTarget === 'wave' ? mWaveAction
                 : mFadeTarget === 'point' ? mPointAction
                 : mIdleAction;
        if (from && to) {
          from.setEffectiveWeight(1 - mFadeProgress);
          to.setEffectiveWeight(mFadeProgress);
        }
        if (mFadeProgress >= 1) {
          if (from && from !== mIdleAction) {
            from.stop();
            from.setEffectiveWeight(0);
          }
          mFadeTarget = null;
        }
      }
    }

    let mPointTimer = null;

    scene.userData.morganClosePanel = () => {
      mIsAnimating = false;
      if (mWaveTimer) { clearTimeout(mWaveTimer); mWaveTimer = null; }
      // Kill wave, fade to point
      mWaveAction.stop();
      mWaveAction.setEffectiveWeight(0);
      mPointAction.stop();
      mPointAction.reset();
      mPointAction.setEffectiveWeight(0);
      mPointAction.enabled = true;
      mPointAction.play();
      mFadeFrom = mIdleAction;
      mFadeTarget = 'point';
      mFadeProgress = 0;
      mIdleAction.setEffectiveWeight(1);
      // After point finishes, fade to idle + lerp back
      if (mPointTimer) clearTimeout(mPointTimer);
      mPointTimer = setTimeout(() => {
        mFadeFrom = mPointAction;
        mFadeTarget = 'idle';
        mFadeProgress = 0;
        mIdleAction.setEffectiveWeight(0);
        mIdleAction.enabled = true;
        mIsReturning = true;
        mTargetRotY = mRestRotY;
      }, (mPointClip.duration - M_FADE) * 1000);
    };

    scene.userData.morganTrigger = () => {
      if (mIsAnimating || mIsReturning || isMorganPanelOpen) return;
      mIsAnimating = true;
      mTargetRotY = Math.PI / 4;
    };

    scene.userData.updateMorganSequence = updateMorganSequence;
  }, undefined, (err) => console.error('Morgan load error:', err));

  // ── Screen interaction ──────────────────────────────
  // Hover overlay — white semi-transparent plane on top of screen
  const screenOverlay = new THREE.Mesh(
    new THREE.PlaneGeometry(SCR_W * 0.98, SCR_H * 0.98),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthTest: true })
  );
  screenOverlay.rotation.y = Math.PI / 2;
  screenOverlay.position.set(SCR_X + 0.003, SCR_Y, SCR_Z);
  screenOverlay.visible = false;
  scene.add(screenOverlay);

  let screenHovered = false;
  let isScreenPanelOpen = false;

  // Screen panel styles
  const screenPanelStyle = document.createElement('style');
  screenPanelStyle.textContent = `
    .screen-panel {
      position: fixed; z-index: 10002; width: 240px;
      background: rgba(10, 14, 28, 0.88);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 18px 20px 14px;
      color: #fff;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(35,152,178,0.15);
      opacity: 0; transform: translateY(8px) scale(0.96);
      transition: opacity .3s, transform .3s;
      display: none;
    }
    .screen-panel.visible { display: block; }
    .screen-panel.show { opacity: 1; transform: translateY(0) scale(1); }
    .screen-panel__close {
      position: absolute; top: 10px; right: 12px;
      background: none; border: none; color: #fff; font-size: 14px;
      cursor: pointer; opacity: 0.5; transition: opacity .15s;
      padding: 4px;
    }
    .screen-panel__close:hover { opacity: 1; }
    .screen-panel__name {
      font-size: 15px; font-weight: 700; margin-bottom: 14px;
      background: linear-gradient(90deg, #2398B2, #2DB1A1);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .screen-panel__option {
      padding: 10px 12px; margin: 0 -8px; border-radius: 10px;
      cursor: pointer; font-size: 14px; transition: background .15s;
    }
    .screen-panel__option:hover { background: rgba(255,255,255,0.08); }
  `;
  document.head.appendChild(screenPanelStyle);

  const screenPanel = document.createElement('div');
  screenPanel.className = 'screen-panel';
  screenPanel.innerHTML = `
    <button class="screen-panel__close">✕</button>
    <div class="screen-panel__name">Dashboard — Display</div>
    <div class="screen-panel__options">
      <div class="screen-panel__option" data-view="portfolio">📊 Portfolio overview</div>
      <div class="screen-panel__option" data-view="deals">🤝 Deal pipeline</div>
      <div class="screen-panel__option" data-view="metrics">📈 Fund metrics</div>
      <div class="screen-panel__option" data-view="reports">📋 Flash reports</div>
    </div>
  `;
  document.body.appendChild(screenPanel);

  function showScreenPanel() {
    isScreenPanelOpen = true;
    screenPanel.classList.add('visible');
    requestAnimationFrame(() => screenPanel.classList.add('show'));
  }

  function hideScreenPanel() {
    screenPanel.classList.remove('show');
    setTimeout(() => {
      screenPanel.classList.remove('visible');
      isScreenPanelOpen = false;
    }, 300);
  }

  screenPanel.querySelector('.screen-panel__close').addEventListener('click', (e) => {
    e.stopPropagation();
    hideScreenPanel();
  });

  screenPanel.addEventListener('click', (e) => e.stopPropagation());

  // Project screen center → screen coords
  const screenProjVec = new THREE.Vector3();
  function updateScreenPanelPosition() {
    if (!isScreenPanelOpen) return;
    screenProjVec.set(SCR_X + 0.5, SCR_Y + 0.3, SCR_Z);
    screenProjVec.project(camera);
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;
    const sx = screenProjVec.x * hw + hw;
    const sy = -screenProjVec.y * hh + hh;
    screenPanel.style.left = (sx + 30) + 'px';
    screenPanel.style.top  = (sy - 60) + 'px';
  }

  // ── Hover detection ─────────────────────────────────
  const screenHitTargets = [screenMesh, bezel];

  let hoverRafPending = false;
  window.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    if (hoverRafPending) return;
    hoverRafPending = true;
    requestAnimationFrame(() => {
    hoverRafPending = false;
    if (animId === null) return;
    raycaster.setFromCamera(pointer, camera);

    // Davis hover
    if (davisMeshes.length) {
      const dHover = raycaster.intersectObjects(davisMeshes, false).length > 0;
      if (dHover !== davisHovered) {
        davisHovered = dHover;
        davisOutlines.forEach(o => o.visible = dHover);
      }
    }

    // Morgan hover
    if (morganMeshes.length) {
      const mHover = raycaster.intersectObjects(morganMeshes, false).length > 0;
      if (mHover !== morganHovered) {
        morganHovered = mHover;
        morganOutlines.forEach(o => o.visible = mHover);
      }
    }

    // Ripley hover
    if (ripleyMeshes.length) {
      const rHover = raycaster.intersectObjects(ripleyMeshes, false).length > 0;
      if (rHover !== ripleyHovered) {
        ripleyHovered = rHover;
        ripleyOutlines.forEach(o => o.visible = rHover);
      }
    }

    // Screen hover
    const sHover = raycaster.intersectObjects(screenHitTargets, false).length > 0;
    if (sHover !== screenHovered) {
      screenHovered = sHover;
      screenOverlay.visible = sHover;
    }

    // Speaker hover — boost emissive
    if (speakerMeshes.length) {
      const spHover = raycaster.intersectObjects(speakerMeshes, false).length > 0;
      if (spHover !== speakerHovered) {
        speakerHovered = spHover;
        speakerMeshes.forEach(m => {
          if (!m.material.emissive) return;
          m.material.emissive.set(spHover ? 0x444444 : 0x000000);
        });
      }
    }

    // Chess hover — emissive highlight
    if (chessMeshes.length) {
      const cHover = raycaster.intersectObjects(chessMeshes, false).length > 0;
      if (cHover !== chessHovered) {
        chessHovered = cHover;
        chessMeshes.forEach(m => {
          if (m.material && m.material.emissive) m.material.emissive.set(cHover ? 0x334455 : 0x000000);
        });
      }
    }

    // Dog hover
    if (dogMeshes.length) {
      const dogH = raycaster.intersectObjects(dogMeshes, false).length > 0;
      if (dogH !== dogHovered) {
        dogHovered = dogH;
      }
    }

    SLIDE.style.cursor = (davisHovered || morganHovered || ripleyHovered || screenHovered || speakerHovered || chessHovered || dogHovered) ? 'pointer' : '';
    });
  });

  // ── Click detection ──────────────────────────────────
  window.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const anyPanelOpen = isPanelOpen || isMorganPanelOpen || isRipleyPanelOpen || isScreenPanelOpen || isSpeakerPanelOpen || isChessPanelOpen || isDogPanelOpen;

    // Dog click
    if (!anyPanelOpen && dogMeshes.length && raycaster.intersectObjects(dogMeshes, false).length > 0) {
      showDogPanel();
      return;
    }

    // Chess click
    if (!anyPanelOpen && chessMeshes.length && raycaster.intersectObjects(chessMeshes, false).length > 0) {
      showChessPanel();
      return;
    }

    // Speaker click
    if (!anyPanelOpen && speakerMeshes.length && raycaster.intersectObjects(speakerMeshes, false).length > 0) {
      showSpeakerPanel();
      return;
    }

    // Screen click
    if (!anyPanelOpen && raycaster.intersectObjects(screenHitTargets, false).length > 0) {
      showScreenPanel();
      return;
    }

    // Davis click
    if (davisMeshes.length && scene.userData.davisTrigger && !anyPanelOpen) {
      if (raycaster.intersectObjects(davisMeshes, false).length > 0) {
        scene.userData.davisTrigger();
        return;
      }
    }

    // Morgan click
    if (morganMeshes.length && scene.userData.morganTrigger && !anyPanelOpen) {
      if (raycaster.intersectObjects(morganMeshes, false).length > 0) {
        scene.userData.morganTrigger();
        return;
      }
    }

    // Ripley click
    if (ripleyMeshes.length && scene.userData.ripleyTrigger && !anyPanelOpen) {
      if (raycaster.intersectObjects(ripleyMeshes, false).length > 0) {
        scene.userData.ripleyTrigger();
      }
    }
  });

  // Close screen panel on click outside
  window.addEventListener('pointerdown', (e) => {
    if (!isScreenPanelOpen) return;
    if (screenPanel.contains(e.target)) return;
    hideScreenPanel();
  });

  // ── Speaker / Radio interaction ───────────────────────
  let speakerHovered    = false;
  let isSpeakerPanelOpen = false;
  let currentStation    = null;

  const radioAudio = new Audio();
  radioAudio.crossOrigin = 'anonymous';

  const radioStations = [
    { id: 'classical', label: '🎻 Classical',   url: 'https://stream.srg-ssr.ch/m/rsc_de/mp3_128' },
    { id: 'rock',      label: '🎸 Classic Rock', url: 'https://ice1.somafm.com/bootliquor-128-mp3' },
    { id: 'jazz',      label: '🎷 Jazz',         url: 'https://ice1.somafm.com/groovesalad-256-mp3' },
    { id: 'ambient',   label: '🌌 Ambient',      url: 'https://ice1.somafm.com/dronezone-128-mp3' },
  ];

  const speakerStyle = document.createElement('style');
  speakerStyle.textContent = `
    .speaker-panel {
      position: fixed; display: none; opacity: 0;
      transform: translateY(8px) scale(0.97);
      transition: opacity .3s, transform .3s;
      background: rgba(20,24,30,0.92); backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
      padding: 16px 18px; min-width: 190px; z-index: 200;
      font-family: Poppins, sans-serif; color: #fff; pointer-events: all;
    }
    .speaker-panel.visible { display: block; }
    .speaker-panel.show { opacity: 1; transform: translateY(0) scale(1); }
    .speaker-panel__close {
      position: absolute; top: 10px; right: 12px;
      background: none; border: none; color: rgba(255,255,255,0.45);
      font-size: 13px; cursor: pointer; padding: 2px 6px;
    }
    .speaker-panel__close:hover { color: #fff; }
    .speaker-panel__name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
    .speaker-panel__now  { font-size: 11px; color: #2DB1A1; min-height: 16px; margin-bottom: 8px; }
    .speaker-panel__option {
      font-size: 13px; padding: 8px 10px; border-radius: 7px;
      cursor: pointer; transition: background .15s;
    }
    .speaker-panel__option:hover  { background: rgba(255,255,255,0.08); }
    .speaker-panel__option.active { background: rgba(35,152,178,0.22); color: #2DB1A1; }
    .speaker-panel__stop {
      margin-top: 8px; padding: 7px 10px; border-radius: 7px; font-size: 12px;
      cursor: pointer; text-align: center; color: rgba(255,255,255,0.5);
      background: rgba(255,255,255,0.05); transition: background .15s;
    }
    .speaker-panel__stop:hover { background: rgba(255,255,255,0.1); color: #fff; }
  `;
  document.head.appendChild(speakerStyle);

  const speakerPanel = document.createElement('div');
  speakerPanel.className = 'speaker-panel';
  speakerPanel.innerHTML = `
    <button class="speaker-panel__close">✕</button>
    <div class="speaker-panel__name">🔊 Office Radio</div>
    <div class="speaker-panel__now"></div>
    <div class="speaker-panel__options">
      ${radioStations.map(s => `<div class="speaker-panel__option" data-station="${s.id}">${s.label}</div>`).join('')}
    </div>
    <div class="speaker-panel__stop">⏹ Stop</div>
  `;
  document.body.appendChild(speakerPanel);

  function refreshSpeakerPanel() {
    speakerPanel.querySelectorAll('.speaker-panel__option').forEach(el => {
      el.classList.toggle('active', el.dataset.station === currentStation);
    });
    const nowEl = speakerPanel.querySelector('.speaker-panel__now');
    if (currentStation) {
      const st = radioStations.find(s => s.id === currentStation);
      nowEl.textContent = '▶ ' + (st ? st.label : '');
    } else {
      nowEl.textContent = '';
    }
  }

  function playStation(id) {
    const st = radioStations.find(s => s.id === id);
    if (!st) return;
    radioAudio.src = st.url;
    radioAudio.play().catch(() => {});
    currentStation = id;
    refreshSpeakerPanel();
  }

  function stopRadio() {
    radioAudio.pause(); radioAudio.src = '';
    currentStation = null;
    refreshSpeakerPanel();
  }

  function showSpeakerPanel() {
    isSpeakerPanelOpen = true;
    speakerPanel.classList.add('visible');
    requestAnimationFrame(() => speakerPanel.classList.add('show'));
  }

  function hideSpeakerPanel() {
    speakerPanel.classList.remove('show');
    setTimeout(() => { speakerPanel.classList.remove('visible'); isSpeakerPanelOpen = false; }, 300);
  }

  speakerPanel.querySelector('.speaker-panel__close').addEventListener('click', e => { e.stopPropagation(); hideSpeakerPanel(); });
  speakerPanel.addEventListener('click', e => e.stopPropagation());
  speakerPanel.querySelector('.speaker-panel__stop').addEventListener('click', e => { e.stopPropagation(); stopRadio(); });
  speakerPanel.querySelectorAll('.speaker-panel__option').forEach(el => {
    el.addEventListener('click', e => { e.stopPropagation(); playStation(el.dataset.station); });
  });

  window.addEventListener('pointerdown', e => {
    if (!isSpeakerPanelOpen) return;
    if (speakerPanel.contains(e.target)) return;
    hideSpeakerPanel();
  });

  const speakerProjVec = new THREE.Vector3();
  function updateSpeakerPanelPosition() {
    if (!isSpeakerPanelOpen || !speakerGroup) return;
    speakerProjVec.copy(speakerGroup.position);
    speakerProjVec.project(camera);
    const hw = window.innerWidth / 2, hh = window.innerHeight / 2;
    speakerPanel.style.left = (speakerProjVec.x * hw + hw + 20) + 'px';
    speakerPanel.style.top  = (-speakerProjVec.y * hh + hh - 40) + 'px';
  }

  // ── Dog (Gino) panel ──────────────────────────────────
  const dogStyle = document.createElement('style');
  dogStyle.textContent = `
    .dog-panel {
      position: fixed; z-index: 200; pointer-events: auto;
      font-family: 'DM Sans', 'Poppins', sans-serif;
      min-width: 260px; max-width: 300px;
      background: rgba(10,14,28,0.88);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 16px;
      padding: 18px 20px 14px; color: #fff;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(35,152,178,0.15);
      opacity: 0; transform: translateY(8px) scale(0.96);
      transition: opacity .3s, transform .3s; display: none;
    }
    .dog-panel.visible { display: block; }
    .dog-panel.show { opacity: 1; transform: translateY(0) scale(1); }
    .dog-panel__close {
      position: absolute; top: 10px; right: 12px;
      background: none; border: none; color: #fff; font-size: 14px;
      cursor: pointer; opacity: 0.5; transition: opacity .15s; padding: 4px;
    }
    .dog-panel__close:hover { opacity: 1; }
    .dog-panel__name {
      font-size: 15px; font-weight: 700; margin-bottom: 4px;
      background: linear-gradient(90deg, #2398B2, #2DB1A1);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .dog-panel__role { font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 14px; }
    .dog-panel__option {
      padding: 10px 12px; margin: 0 -8px; border-radius: 10px;
      cursor: pointer; font-size: 14px; transition: background .15s;
    }
    .dog-panel__option:hover { background: rgba(255,255,255,0.08); }
    .dog-panel__back {
      background: none; border: none; color: rgba(255,255,255,0.5);
      font-size: 13px; cursor: pointer; padding: 0 0 8px; transition: color .15s;
    }
    .dog-panel__back:hover { color: #fff; }
    .dog-panel__sub { display: none; }
    .dog-panel__sub.active { display: block; }
    .dog-panel__main { display: block; }
    .dog-panel__main.hidden { display: none; }
    .dog-panel__response {
      font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.75);
      padding: 4px 0;
    }
  `;
  document.head.appendChild(dogStyle);

  const dogPanel = document.createElement('div');
  dogPanel.className = 'dog-panel';
  dogPanel.innerHTML = `
    <button class="dog-panel__close">✕</button>
    <div class="dog-panel__main">
      <div class="dog-panel__name">Gino</div>
      <div class="dog-panel__role">Chief Morale Officer</div>
      <div class="dog-panel__option" data-action="pet">🐾 Pet Gino</div>
      <div class="dog-panel__option" data-action="feed">🦴 Feed Gino</div>
    </div>
    <div class="dog-panel__sub" data-sub="pet">
      <button class="dog-panel__back">← Back</button>
      <div class="dog-panel__name">Pet Gino</div>
      <div class="dog-panel__response">Gino's tail starts wagging furiously. He looks up at you with pure joy — for a brief moment, every deal memo, cap table, and pipeline update ceases to exist.</div>
    </div>
    <div class="dog-panel__sub" data-sub="feed">
      <button class="dog-panel__back">← Back</button>
      <div class="dog-panel__name">Feed Gino</div>
      <div class="dog-panel__response">Gino inhales the treat before you've even let go. He sits very straight, pretending he didn't just do that, ready for another one.</div>
    </div>
  `;
  document.body.appendChild(dogPanel);

  function showDogPanel() {
    isDogPanelOpen = true;
    // reset to main view
    dogPanel.querySelector('.dog-panel__main').classList.remove('hidden');
    dogPanel.querySelectorAll('.dog-panel__sub').forEach(s => s.classList.remove('active'));
    dogPanel.classList.add('visible');
    requestAnimationFrame(() => dogPanel.classList.add('show'));
  }
  function hideDogPanel() {
    dogPanel.classList.remove('show');
    setTimeout(() => { dogPanel.classList.remove('visible'); isDogPanelOpen = false; }, 300);
  }

  dogPanel.querySelector('.dog-panel__close').addEventListener('click', e => { e.stopPropagation(); hideDogPanel(); });
  dogPanel.addEventListener('click', e => e.stopPropagation());

  dogPanel.querySelectorAll('.dog-panel__option').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      dogPanel.querySelector('.dog-panel__main').classList.add('hidden');
      dogPanel.querySelector(`.dog-panel__sub[data-sub="${el.dataset.action}"]`).classList.add('active');
    });
  });

  dogPanel.querySelectorAll('.dog-panel__back').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      dogPanel.querySelectorAll('.dog-panel__sub').forEach(s => s.classList.remove('active'));
      dogPanel.querySelector('.dog-panel__main').classList.remove('hidden');
    });
  });

  window.addEventListener('pointerdown', e => {
    if (!isDogPanelOpen) return;
    if (dogPanel.contains(e.target)) return;
    hideDogPanel();
  });

  const dogProjVec = new THREE.Vector3();
  function updateDogPanelPosition() {
    if (!isDogPanelOpen || !dogGroup) return;
    dogProjVec.copy(dogGroup.position);
    dogProjVec.project(camera);
    const hw = window.innerWidth / 2, hh = window.innerHeight / 2;
    dogPanel.style.left = (dogProjVec.x * hw + hw - 90) + 'px';
    dogPanel.style.top  = (-dogProjVec.y * hh + hh - 160) + 'px';
  }

  // ── Chess panel ───────────────────────────────────────
  const chessStyle = document.createElement('style');
  chessStyle.textContent = `
    .chess-panel {
      position: fixed; display: none; opacity: 0;
      transform: translateY(8px) scale(0.97);
      transition: opacity .3s, transform .3s;
      background: rgba(14,18,24,0.93); backdrop-filter: blur(14px);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
      padding: 18px 20px 14px; min-width: 230px; z-index: 200;
      font-family: Poppins, sans-serif; color: #fff; pointer-events: all;
    }
    .chess-panel.visible { display: block; }
    .chess-panel.show { opacity: 1; transform: translateY(0) scale(1); }
    .chess-panel__close {
      position: absolute; top: 10px; right: 12px;
      background: none; border: none; color: rgba(255,255,255,0.4);
      font-size: 13px; cursor: pointer; padding: 2px 6px;
    }
    .chess-panel__close:hover { color: #fff; }
    .chess-panel__title { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 14px; }
    .chess-panel__card {
      display: flex; align-items: center; gap: 11px;
      padding: 9px 10px; border-radius: 9px; margin-bottom: 6px;
      cursor: pointer; transition: background .15s;
    }
    .chess-panel__card:hover { background: rgba(255,255,255,0.07); }
    .chess-panel__avatar {
      width: 44px; height: 44px; border-radius: 50%;
      overflow: hidden; flex-shrink: 0;
      border: 2px solid rgba(35,152,178,0.35);
    }
    .chess-panel__avatar img {
      width: 100%; height: 100%; object-fit: cover; object-position: top center;
    }
    .chess-panel__info { flex: 1; min-width: 0; }
    .chess-panel__name { font-size: 13px; font-weight: 600; line-height: 1.2; }
    .chess-panel__role { font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
    .chess-panel__elo-row { display: flex; align-items: center; gap: 6px; }
    .chess-panel__elo-bar {
      flex: 1; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.1); overflow: hidden;
    }
    .chess-panel__elo-fill {
      height: 100%; border-radius: 2px;
      background: linear-gradient(90deg, #2398B2, #2DB1A1);
    }
    .chess-panel__elo-label { font-size: 10px; color: #2DB1A1; font-weight: 600; white-space: nowrap; }
    .chess-panel__btn {
      width: 100%; margin-top: 4px; padding: 9px;
      border-radius: 8px; border: 1px solid rgba(35,152,178,0.4);
      background: rgba(35,152,178,0.12); color: #2DB1A1;
      font-family: Poppins, sans-serif; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: background .15s;
    }
    .chess-panel__btn:hover { background: rgba(35,152,178,0.25); }
  `;
  document.head.appendChild(chessStyle);

  const chessOpponents = [
    { img: '/Bot Videos/Davis Portrait.jpg',  name: 'Davis',  role: 'VC Team Lead',        elo: 1847, level: 'Expert',      pct: 92 },
    { img: '/Bot Videos/Ripley Portrait.jpg', name: 'Ripley', role: 'Flash Report Chaser', elo: 1124, level: 'Intermediate', pct: 48 },
    { img: '/Bot Videos/Morgan Portrait.jpg', name: 'Morgan', role: 'Cap Table Manager',   elo:  943, level: 'Beginner',     pct: 22 },
  ];

  const chessPanel = document.createElement('div');
  chessPanel.className = 'chess-panel';
  chessPanel.innerHTML = `
    <button class="chess-panel__close">✕</button>
    <div class="chess-panel__title">♟ Choose your opponent</div>
    ${chessOpponents.map(p => `
      <div class="chess-panel__card">
        <div class="chess-panel__avatar"><img src="${p.img}" alt="${p.name}"></div>
        <div class="chess-panel__info">
          <div class="chess-panel__name">${p.name}</div>
          <div class="chess-panel__role">${p.role}</div>
          <div class="chess-panel__elo-row">
            <div class="chess-panel__elo-bar"><div class="chess-panel__elo-fill" style="width:${p.pct}%"></div></div>
            <div class="chess-panel__elo-label">${p.elo} · ${p.level}</div>
          </div>
        </div>
      </div>
    `).join('')}
  `;
  document.body.appendChild(chessPanel);

  function showChessPanel() {
    isChessPanelOpen = true;
    chessPanel.classList.add('visible');
    requestAnimationFrame(() => chessPanel.classList.add('show'));
  }
  function hideChessPanel() {
    chessPanel.classList.remove('show');
    setTimeout(() => { chessPanel.classList.remove('visible'); isChessPanelOpen = false; }, 300);
  }

  chessPanel.querySelector('.chess-panel__close').addEventListener('click', e => { e.stopPropagation(); hideChessPanel(); });
  chessPanel.addEventListener('click', e => e.stopPropagation());

  window.addEventListener('pointerdown', e => {
    if (!isChessPanelOpen) return;
    if (chessPanel.contains(e.target)) return;
    hideChessPanel();
  });

  const chessProjVec = new THREE.Vector3();
  function updateChessPanelPosition() {
    if (!isChessPanelOpen || !chessSetGroup) return;
    chessProjVec.copy(chessSetGroup.position);
    chessProjVec.project(camera);
    const hw = window.innerWidth / 2, hh = window.innerHeight / 2;
    chessPanel.style.left = (chessProjVec.x * hw + hw - 115) + 'px';
    chessPanel.style.top  = (-chessProjVec.y * hh + hh - 220) + 'px';
  }

  // ── Render loop ───────────────────────────────────────
  let animId = null;

  function tick() {
    animId = requestAnimationFrame(tick);

    const delta = clock.getDelta();

    // Update character animations + crossfade sequences
    if (davisMixer) davisMixer.update(delta);
    if (scene.userData.updateDavisSequence) scene.userData.updateDavisSequence(delta);
    if (morganMixer) morganMixer.update(delta);
    if (scene.userData.updateMorganSequence) scene.userData.updateMorganSequence(delta);
    if (ripleyMixer) ripleyMixer.update(delta);
    if (scene.userData.updateRipleyRootMotion) scene.userData.updateRipleyRootMotion(delta);
    if (scene.userData.updateRipleySequence) scene.userData.updateRipleySequence(delta);

    // Gently wave plant leaves
    const t = clock.getElapsedTime();
    if (scene.userData.plantLeaves) {
      scene.userData.plantLeaves.forEach(d => {
        d.mesh.rotation.z = d.initZ + Math.sin(t * d.freq       + d.phase) * d.amp;
        d.mesh.rotation.x = d.initX + Math.sin(t * d.freq * 1.4 + d.phase + 1.2) * d.amp * 0.45;
      });
    }

    // Keep floating panels anchored
    updatePanelPosition();
    updateMorganPanelPosition();
    updateRipleyPanelPosition();
    updateScreenPanelPosition();
    updateSpeakerPanelPosition();
    updateChessPanelPosition();
    updateDogPanelPosition();

    // Dog breathing
    if (dogGroup) {
      const breath = dogBaseScale * (1 + 0.02 * Math.sin(t * 1.8));
      dogGroup.scale.setScalar(breath);
    }

    updateTutorialPills();

    renderer.render(scene, camera);
  }

  function start() {
    if (animId !== null) return;
    resize();
    tick();
  }

  function stop() {
    if (animId !== null) { cancelAnimationFrame(animId); animId = null; }
  }

  // ── Sync with slide system ────────────────────────────
  const observer = new MutationObserver(() => {
    document.body.classList.contains('canvas-slide') ? start() : stop();
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  if (document.body.classList.contains('canvas-slide')) start();

  // ── Tilt slider ───────────────────────────────────────
  const tiltSlider = document.getElementById('tiltSlider');
  if (tiltSlider) {
    tiltSlider.addEventListener('input', () => {
      setCameraTilt(parseFloat(tiltSlider.value));
    });
  }

  // ── Venue toggle ──────────────────────────────────────
  let venueMode = 'uneti'; // 'uneti' | 'other'
  const venueToggle = document.getElementById('venueToggle');
  if (venueToggle) {
    const track    = venueToggle.querySelector('.venue-track');
    const labels   = venueToggle.querySelectorAll('.venue-label');

    function applyVenueMode() {
      track.classList.toggle('other', venueMode === 'other');
      labels.forEach(l => l.classList.toggle('active', l.dataset.side === venueMode));
      // TODO: swap furniture / walls / logo per venueMode
    }

    applyVenueMode(); // set initial state (UNETI active)

    venueToggle.addEventListener('click', () => {
      venueMode = venueMode === 'uneti' ? 'other' : 'uneti';
      applyVenueMode();
    });
  }

  // ── Tutorial pills ──────────────────────────────────
  const pillDefs = [
    { label: 'Pet Gino',                    get3D: () => dogGroup      && new THREE.Vector3(dogGroup.position.x, dogGroup.position.y + 1.2, dogGroup.position.z) },
    { label: 'Talk to Davis',               get3D: () => davisGroupRef && new THREE.Vector3(davisGroupRef.position.x, davisGroupRef.position.y + 1.3, davisGroupRef.position.z) },
    { label: 'Talk to Morgan',              get3D: () => morganGroupRef && new THREE.Vector3(morganGroupRef.position.x + 0.6, morganGroupRef.position.y + 1.3, morganGroupRef.position.z) },
    { label: 'Talk to Ripley',              get3D: () => ripleyGroupRef && new THREE.Vector3(ripleyGroupRef.position.x, ripleyGroupRef.position.y + 1.3, ripleyGroupRef.position.z) },
    { label: 'Play chess',                  get3D: () => new THREE.Vector3(5.2, 1.2, 4.0) },
    { label: 'Play music',                  get3D: () => speakerGroup  && new THREE.Vector3(speakerGroup.position.x, speakerGroup.position.y + 0.6, speakerGroup.position.z) },
    { label: 'View the screen',             get3D: () => new THREE.Vector3(-5.98, 1.55 + 1.2, -1.0) },
  ];

  const pillContainer = document.createElement('div');
  pillContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:10;overflow:hidden;';
  SLIDE.appendChild(pillContainer);

  const pillEls = pillDefs.map(def => {
    const el = document.createElement('div');
    el.className = 'tutorial-pill';
    el.textContent = def.label;
    pillContainer.appendChild(el);
    return { el, get3D: def.get3D };
  });

  let tutorialOn = true;
  const tutorialToggle = document.getElementById('tutorialToggle');
  if (tutorialToggle) {
    tutorialToggle.addEventListener('change', () => {
      tutorialOn = tutorialToggle.checked;
      pillEls.forEach(p => p.el.classList.toggle('hidden', !tutorialOn));
    });
  }

  function updateTutorialPills() {
    if (!tutorialOn) return;
    const rect = canvas.getBoundingClientRect();
    const slideRect = SLIDE.getBoundingClientRect();
    pillEls.forEach(p => {
      const pos3D = p.get3D();
      if (!pos3D) { p.el.style.display = 'none'; return; }
      const v = pos3D.clone().project(camera);
      const sx = (v.x * 0.5 + 0.5) * rect.width + (rect.left - slideRect.left);
      const sy = (-v.y * 0.5 + 0.5) * rect.height + (rect.top - slideRect.top);
      if (v.z > 1 || sx < -50 || sy < -50 || sx > slideRect.width + 50 || sy > slideRect.height + 50) {
        p.el.style.display = 'none';
      } else {
        p.el.style.display = '';
        p.el.style.left = sx + 'px';
        p.el.style.top = sy + 'px';
      }
    });
  }

  window.officeScene = { scene, camera, renderer, start, stop, getVenueMode: () => venueMode };
})();
