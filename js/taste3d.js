/**
 * ════════════════════════════════════════════════════════════════
 *  Delice — "Tatib ko'rish" 3D Food Tasting Experience
 *  Self-contained module. Zero modifications to existing files.
 *  Dynamically loads Three.js + OrbitControls when needed.
 * ════════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ── Design tokens matching Delice palette ──────────────── */
  var GOLD    = '#f2b51b';
  var GOLD_H  = '#ffc83e';
  var GOLD_D  = '#d4a017';
  var BG      = '#0d0d0d';
  var CARD_BG = '#151515';
  var BORDER  = '#3b3325';
  var TXT     = '#f4f1eb';
  var TXT_M   = '#b0a898';
  var FONT    = 'Arial,sans-serif';

  /* ── Module state ───────────────────────────────────────── */
  var currentExp   = null;
  var overlayEl    = null;
  var threeReady   = false;
  var threeLoading = false;
  var threeCbs     = [];

  /* ═══════════════════════════════════════════════════════════
     1. CSS INJECTION
     ═══════════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('taste3d-css')) return;
    var s = document.createElement('style');
    s.id = 'taste3d-css';
    s.textContent =
      '.card-body button[onclick*="addToCart"]{' +
        'background-color:rgba(248,244,0,0.71)!important;' +
        'color:#000!important;' +
        'border:none!important;' +
        'border-radius:10px!important;' +
        'font-family:' + FONT + '!important;' +
        'font-size:13px!important;' +
        'font-weight:600!important;' +
        'padding:6px 14px!important;' +
        'height:34px!important;' +
        'cursor:pointer!important;' +
        'transition:all .25s ease!important;' +
        'vertical-align:middle!important;' +
        'display:inline-flex!important;' +
        'align-items:center!important;' +
        'justify-content:center!important;' +
        'margin-top:6px!important;' +
      '}' +
      '.card-body button[onclick*="addToCart"]:hover{' +
        'background-color:#ffc83e!important;' +
        'transform:translateY(-2px);' +
        'box-shadow:0 4px 14px rgba(242,181,27,.35);' +
      '}' +
      '.taste3d-btn{' +
        'display:inline-flex;' +
        'align-items:center;' +
        'justify-content:center;' +
        'gap:5px;' +
        'margin-top:6px;' +
        'margin-left:8px;' +
        'padding:6px 14px;' +
        'height:34px;' +
        'background-color:rgba(248,244,0,0.71);' +
        'color:#000;' +
        'border:none;' +
        'border-radius:10px;' +
        'font-family:' + FONT + ';' +
        'font-size:13px;' +
        'font-weight:600;' +
        'cursor:pointer;' +
        'transition:all .25s ease;' +
        'vertical-align:middle;' +
      '}' +
      '.taste3d-btn:hover{' +
        'background-color:#ffc83e;' +
        'color:#000;' +
        'transform:translateY(-2px);' +
        'box-shadow:0 4px 14px rgba(242,181,27,.35);' +
      '}' +
      '.taste3d-btn:active{transform:translateY(0)}' +

      '.taste3d-overlay{' +
        'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
        'display:flex;align-items:center;justify-content:center;' +
        'opacity:0;visibility:hidden;transition:opacity .4s,visibility .4s' +
      '}' +
      '.taste3d-overlay.t3active{opacity:1;visibility:visible}' +

      '.taste3d-modal{' +
        'width:94vw;max-width:1200px;height:88vh;max-height:760px;' +
        'background:' + CARD_BG + ';border:1px solid ' + BORDER + ';border-radius:18px;' +
        'display:flex;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.7);' +
        'transform:scale(.92) translateY(20px);transition:transform .4s cubic-bezier(.4,0,.2,1)' +
      '}' +
      '.taste3d-overlay.t3active .taste3d-modal{transform:scale(1) translateY(0)}' +

      '.taste3d-cw{flex:1;position:relative;background:#080808;min-width:0}' +
      '.taste3d-cw canvas{width:100%!important;height:100%!important;display:block}' +

      '.taste3d-hint{' +
        'position:absolute;bottom:14px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,0,0,.72);color:' + TXT_M + ';font-size:11px;' +
        'padding:6px 18px;border-radius:20px;pointer-events:none;' +
        'white-space:nowrap;font-family:' + FONT +
      '}' +

      '.taste3d-info{' +
        'width:320px;flex-shrink:0;padding:28px 24px;display:flex;' +
        'flex-direction:column;gap:14px;border-left:1px solid ' + BORDER + ';overflow-y:auto' +
      '}' +

      '.taste3d-close{' +
        'position:absolute;top:16px;right:16px;width:38px;height:38px;' +
        'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);' +
        'border-radius:50%;color:#fff;font-size:22px;cursor:pointer;display:flex;' +
        'align-items:center;justify-content:center;z-index:10;' +
        'transition:background .2s;font-family:' + FONT + ';line-height:1' +
      '}' +
      '.taste3d-close:hover{background:rgba(255,60,60,.3)}' +

      '.taste3d-fimg{' +
        'width:100%;height:180px;object-fit:cover;border-radius:12px;' +
        'border:1px solid ' + BORDER +
      '}' +
      '.taste3d-fname{' +
        'font-family:"Brush Script MT",cursive;font-size:28px;color:#fff;' +
        'margin:0;font-style:italic' +
      '}' +
      '.taste3d-fprice{font-family:' + FONT + ';font-size:22px;color:' + GOLD + ';font-weight:700;margin:0}' +
      '.taste3d-fdesc{font-family:' + FONT + ';font-size:13px;color:' + TXT_M + ';line-height:1.55;margin:0}' +

      '.taste3d-ctrls{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:12px}' +
      '.taste3d-cb{' +
        'flex:1;min-width:80px;padding:10px 8px;background:transparent;' +
        'border:1.5px solid ' + GOLD + ';border-radius:10px;color:' + GOLD + ';' +
        'font-family:' + FONT + ';font-size:12px;font-weight:600;cursor:pointer;' +
        'transition:all .25s;text-align:center' +
      '}' +
      '.taste3d-cb:hover{background:' + GOLD + ';color:#111}' +
      '.taste3d-cb.pri{background:' + GOLD + ';color:#111;border-color:' + GOLD + '}' +
      '.taste3d-cb.pri:hover{background:' + GOLD_H + '}' +

      '.taste3d-ld{' +
        'position:absolute;inset:0;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;background:#080808;z-index:5;gap:16px' +
      '}' +
      '.taste3d-sp{' +
        'width:44px;height:44px;border:3px solid rgba(242,181,27,.2);' +
        'border-top-color:' + GOLD + ';border-radius:50%;animation:t3spin .8s linear infinite' +
      '}' +
      '@keyframes t3spin{to{transform:rotate(360deg)}}' +
      '.taste3d-lt{color:' + TXT_M + ';font-family:' + FONT + ';font-size:13px}' +

      '@media(max-width:768px){' +
        '.taste3d-modal{flex-direction:column;width:98vw;height:95vh;max-height:none;border-radius:14px}' +
        '.taste3d-cw{height:50%;flex:none}' +
        '.taste3d-info{width:100%;height:50%;border-left:none;border-top:1px solid ' + BORDER + ';padding:16px}' +
        '.taste3d-fimg{height:100px}' +
        '.taste3d-fname{font-size:22px}' +
        '.taste3d-close{top:8px;right:8px;width:32px;height:32px;font-size:18px}' +
      '}';
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════
     2. MODAL DOM
     ═══════════════════════════════════════════════════════════ */
  function ensureModal() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.className = 'taste3d-overlay';
    overlayEl.innerHTML =
      '<div class="taste3d-modal">' +
        '<div class="taste3d-cw" id="t3d-cw">' +
          '<div class="taste3d-ld" id="t3d-ld">' +
            '<div class="taste3d-sp"></div>' +
            '<div class="taste3d-lt">Tayyorlanmoqda...</div>' +
          '</div>' +
          '<div class="taste3d-hint">\uD83D\uDDB1\uFE0F Aylantirish \u00B7 Scroll kattalashtirish</div>' +
        '</div>' +
        '<div class="taste3d-info">' +
          '<button class="taste3d-close" id="t3d-x" title="Yopish">\u00D7</button>' +
          '<img class="taste3d-fimg" id="t3d-img" src="" alt="">' +
          '<h3 class="taste3d-fname" id="t3d-nm"></h3>' +
          '<p class="taste3d-fprice" id="t3d-pr"></p>' +
          '<p class="taste3d-fdesc" id="t3d-ds"></p>' +
          '<div class="taste3d-ctrls">' +
            '<button class="taste3d-cb pri" id="t3d-play">\u25B6 Tatib ko\'rish</button>' +
            '<button class="taste3d-cb" id="t3d-pause">\u23F8 Pauza</button>' +
            '<button class="taste3d-cb" id="t3d-replay">\u21BB Qayta</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlayEl);

    document.getElementById('t3d-x').addEventListener('click', closeExperience);
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) closeExperience();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlayEl && overlayEl.classList.contains('t3active')) closeExperience();
    });
    document.getElementById('t3d-play').addEventListener('click', function () {
      if (currentExp) currentExp.play();
    });
    document.getElementById('t3d-pause').addEventListener('click', function () {
      if (currentExp) currentExp.togglePause();
    });
    document.getElementById('t3d-replay').addEventListener('click', function () {
      if (currentExp) currentExp.replay();
    });
  }

  /* ═══════════════════════════════════════════════════════════
     3. THREE.JS DYNAMIC LOADER
     ═══════════════════════════════════════════════════════════ */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = function () { rej(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureThree(cb) {
    if (threeReady) { cb(); return; }
    threeCbs.push(cb);
    if (threeLoading) return;
    threeLoading = true;
    var p = window.THREE ? Promise.resolve() : loadScript('js/three.min.js');
    p.then(function () {
      if (window.THREE && window.THREE.OrbitControls) return Promise.resolve();
      return loadScript('js/OrbitControls.js');
    }).then(function () {
      threeReady = true;
      threeLoading = false;
      var cbs = threeCbs.slice();
      threeCbs = [];
      cbs.forEach(function (fn) { fn(); });
    }).catch(function (err) {
      threeLoading = false;
      console.error('[Taste3D] Three.js load error:', err);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     4. FOOD TYPE DETECTION
     ═══════════════════════════════════════════════════════════ */
  var FOOD_KW = {
    pizza:    ['pizza','margherita','pepperoni','calzone'],
    burger:   ['burger','hamburger','cheeseburger','slider'],
    pasta:    ['pasta','spaghetti','noodle','macaroni','penne','fettuccine','lasagna','carbonara','alfredo','bolognese','ravioli'],
    sushi:    ['sushi','sashimi','maki','nigiri'],
    steak:    ['steak','beef stew','ribeye','sirloin','filet mignon'],
    salad:    ['salad','coleslaw','caesar','greek salad'],
    cake:     ['cake','cookie','brownie','ice cream','dessert','pudding','pie','tart','muffin','cupcake','donut','pastry','cheesecake','tiramisu','croissant','macaron','panna cotta','creme brulee','flan','mousse'],
    soup:     ['soup','stew','broth','chowder','bisque','ramen','pho','gazpacho','minestrone'],
    chicken:  ['chicken','wing','drumstick','poultry','turkey','tikka','tandoori','teriyaki chicken','fried chicken','roast chicken'],
    rice:     ['rice','biryani','risotto','paella','pilaf','fried rice','jambalaya','nasi goreng'],
    fish:     ['fish','salmon','tuna','cod','shrimp','prawn','seafood','lobster','crab','grilled fish','baked fish','fish and chips','ceviche'],
    taco:     ['taco','burrito','enchilada','quesadilla','nacho','tortilla','fajita','chimichanga'],
    sandwich: ['sandwich','sub','panini','wrap','toast','bruschetta','caprese','club','blt','grilled cheese'],
    pancake:  ['pancake','waffle','crepe','french toast','banana pancake'],
    chocolate:['chocolate','truffle','chocolate cake','lava cake','ganache']
  };

  function detectType(name) {
    var lo = (name || '').toLowerCase();
    for (var type in FOOD_KW) {
      if (!FOOD_KW.hasOwnProperty(type)) continue;
      var kws = FOOD_KW[type];
      for (var i = 0; i < kws.length; i++) {
        if (lo.indexOf(kws[i]) !== -1) return type;
      }
    }
    return 'generic';
  }

  /* ═══════════════════════════════════════════════════════════
     5. THREE.JS HELPERS
     ═══════════════════════════════════════════════════════════ */
  function mt(color, rough, metal) {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: rough !== undefined ? rough : 0.7,
      metalness: metal || 0
    });
  }
  function cy(rt, rb, h, seg) {
    return new THREE.CylinderGeometry(rt, rb, h, seg || 16);
  }
  function sp(r, ws, hs) {
    return new THREE.SphereGeometry(r, ws || 12, hs || 8);
  }
  function bx(w, h, d) {
    return new THREE.BoxGeometry(w, h, d);
  }
  function mk(geo, material) {
    var m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  /* ═══════════════════════════════════════════════════════════
     6. PLATE BUILDER
     ═══════════════════════════════════════════════════════════ */
  function buildPlate() {
    var g = new THREE.Group();
    g.add(mk(cy(1.0, 0.92, 0.08, 32), mt(0xf5f0e8, 0.3, 0.1)));
    var rim = mk(new THREE.TorusGeometry(0.96, 0.035, 8, 32), mt(0xd4af37, 0.35, 0.6));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.04;
    g.add(rim);
    return g;
  }

  /* ═══════════════════════════════════════════════════════════
     7. FOOD MODEL BUILDERS — one per type
     ═══════════════════════════════════════════════════════════ */

  // ── PIZZA ──────────────────────────────────────────────────
  function buildPizza() {
    var g = new THREE.Group();
    g.add(mk(cy(0.85, 0.85, 0.1, 24), mt(0xd4a247, 0.85)));
    var crust = mk(new THREE.TorusGeometry(0.8, 0.07, 8, 24), mt(0xc49030, 0.9));
    crust.rotation.x = Math.PI / 2; crust.position.y = 0.05; g.add(crust);
    g.add(mk(cy(0.7, 0.7, 0.02, 20), mt(0xc0392b, 0.7)));
    var sauce = g.children[g.children.length - 1]; sauce.position.y = 0.06;
    var i, a, r, m;
    for (i = 0; i < 10; i++) {
      a = i / 10 * Math.PI * 2; r = 0.25 + Math.random() * 0.35;
      m = mk(sp(0.07 + Math.random() * 0.04), mt(0xf5c518, 0.6));
      m.position.set(Math.cos(a) * r, 0.08, Math.sin(a) * r);
      m.scale.y = 0.5; g.add(m);
    }
    for (i = 0; i < 7; i++) {
      a = i / 7 * Math.PI * 2 + 0.5; r = 0.2 + Math.random() * 0.4;
      m = mk(cy(0.055, 0.055, 0.02, 8), mt(0x8b1a1a, 0.7));
      m.position.set(Math.cos(a) * r, 0.09, Math.sin(a) * r); g.add(m);
    }
    for (i = 0; i < 4; i++) {
      a = i / 4 * Math.PI * 2 + 1; r = 0.15 + Math.random() * 0.4;
      m = mk(sp(0.035), mt(0x27ae60, 0.8));
      m.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
      m.scale.set(1.6, 0.3, 1); g.add(m);
    }
    return g;
  }

  // ── BURGER ─────────────────────────────────────────────────
  function buildBurger() {
    var g = new THREE.Group();
    var bb = mk(cy(0.48, 0.52, 0.18, 16), mt(0xd4a247, 0.8));
    bb.position.y = 0.09; g.add(bb);
    var pt = mk(cy(0.5, 0.5, 0.12, 16), mt(0x3e2723, 0.85));
    pt.position.y = 0.24; g.add(pt);
    var ch = mk(bx(0.75, 0.025, 0.75), mt(0xf5c518, 0.55));
    ch.position.y = 0.32; ch.rotation.y = 0.4; g.add(ch);
    var lt = mk(cy(0.53, 0.53, 0.035, 12), mt(0x27ae60, 0.8));
    lt.position.y = 0.36; g.add(lt);
    var tm = mk(cy(0.42, 0.42, 0.035, 12), mt(0xe74c3c, 0.65));
    tm.position.y = 0.39; g.add(tm);
    var tb = mk(sp(0.48, 16, 10), mt(0xd4a247, 0.8));
    tb.position.y = 0.54; tb.scale.y = 0.52; g.add(tb);
    for (var i = 0; i < 9; i++) {
      var a = i / 9 * Math.PI * 2;
      var sm = mk(sp(0.018), mt(0xfff8dc, 0.5));
      sm.position.set(Math.cos(a) * 0.22, 0.66, Math.sin(a) * 0.22);
      g.add(sm);
    }
    return g;
  }

  // ── PASTA ──────────────────────────────────────────────────
  function buildPasta() {
    var g = new THREE.Group();
    var i, m;
    for (i = 0; i < 9; i++) {
      m = mk(new THREE.TorusGeometry(0.14 + Math.random() * 0.14, 0.022, 6, 12), mt(0xf5deb3, 0.65));
      m.position.set((Math.random() - 0.5) * 0.5, 0.04 + Math.random() * 0.1, (Math.random() - 0.5) * 0.5);
      m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      g.add(m);
    }
    for (i = 0; i < 5; i++) {
      m = mk(sp(0.045 + Math.random() * 0.025), mt(0xc0392b, 0.6));
      m.position.set((Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.4);
      g.add(m);
    }
    for (i = 0; i < 3; i++) {
      m = mk(sp(0.022), mt(0x27ae60, 0.8));
      m.position.set((Math.random() - 0.5) * 0.3, 0.14, (Math.random() - 0.5) * 0.3);
      g.add(m);
    }
    return g;
  }

  // ── SUSHI ──────────────────────────────────────────────────
  function buildSushi() {
    var g = new THREE.Group();
    var pos = [[-0.28, 0, 0.14], [0, 0, 0.14], [0.28, 0, 0.14], [-0.14, 0, -0.14], [0.14, 0, -0.14]];
    var fc = [0xfa8072, 0xff6347, 0xe9967a, 0xffa07a, 0xf08080];
    pos.forEach(function (p, idx) {
      var pc = new THREE.Group();
      pc.add(mk(bx(0.17, 0.09, 0.09), mt(0xfff8f0, 0.55)));
      pc.children[0].position.y = 0.045;
      var nori1 = mk(bx(0.18, 0.055, 0.004), mt(0x1a3c1a, 0.8));
      nori1.position.set(0, 0.045, 0.047); pc.add(nori1);
      var nori2 = mk(bx(0.004, 0.055, 0.095), mt(0x1a3c1a, 0.8));
      nori2.position.set(0.088, 0.045, 0); pc.add(nori2);
      var fish = mk(bx(0.15, 0.025, 0.075), mt(fc[idx], 0.5));
      fish.position.y = 0.1; pc.add(fish);
      pc.position.set(p[0], p[1], p[2]);
      g.add(pc);
    });
    return g;
  }

  // ── STEAK ──────────────────────────────────────────────────
  function buildSteak() {
    var g = new THREE.Group();
    var body = mk(bx(0.7, 0.12, 0.48), mt(0x5c3317, 0.85));
    body.position.y = 0.06; body.rotation.y = 0.15; g.add(body);
    for (var i = 0; i < 4; i++) {
      var mark = mk(bx(0.62, 0.004, 0.028), mt(0x2c1810, 0.92));
      mark.position.set(0, 0.125, -0.14 + i * 0.1); mark.rotation.y = 0.15; g.add(mark);
    }
    var fat1 = mk(sp(0.028), mt(0xf5f0e0, 0.55));
    fat1.position.set(0.15, 0.13, 0.1); g.add(fat1);
    var fat2 = mk(sp(0.024), mt(0xf5f0e0, 0.55));
    fat2.position.set(-0.1, 0.13, -0.05); g.add(fat2);
    var herb = mk(sp(0.035), mt(0x27ae60, 0.7));
    herb.position.set(0.22, 0.14, 0.14); herb.scale.set(1.5, 0.35, 1); g.add(herb);
    var butter = mk(cy(0.04, 0.04, 0.015, 8), mt(0xffd700, 0.4));
    butter.position.set(-0.05, 0.14, 0.12); g.add(butter);
    return g;
  }

  // ── SALAD ──────────────────────────────────────────────────
  function buildSalad() {
    var g = new THREE.Group();
    var bowl = mk(sp(0.6, 16, 12), mt(0xf5f0e8, 0.35, 0.1));
    bowl.scale.y = 0.45; bowl.position.y = 0.05; g.add(bowl);
    var colors = [0x27ae60, 0x2ecc71, 0xe74c3c, 0xf39c12, 0x8e44ad, 0xf5f5dc, 0x1abc9c, 0xe67e22];
    for (var i = 0; i < 16; i++) {
      var a = Math.random() * Math.PI * 2;
      var r = Math.random() * 0.32;
      var v = mk(sp(0.035 + Math.random() * 0.03), mt(colors[i % colors.length], 0.7));
      v.position.set(Math.cos(a) * r, 0.1 + Math.random() * 0.1, Math.sin(a) * r);
      if (Math.random() > 0.5) v.scale.set(1.6, 0.35, 1);
      g.add(v);
    }
    return g;
  }

  // ── CAKE / DESSERT ─────────────────────────────────────────
  function buildCake() {
    var g = new THREE.Group();
    var b = mk(cy(0.52, 0.52, 0.24, 16), mt(0x5c3317, 0.7));
    b.position.y = 0.12; g.add(b);
    var f1 = mk(cy(0.54, 0.54, 0.025, 16), mt(0xfff8f0, 0.45));
    f1.position.y = 0.245; g.add(f1);
    var t = mk(cy(0.38, 0.38, 0.18, 16), mt(0x8b4513, 0.7));
    t.position.y = 0.35; g.add(t);
    var f2 = mk(cy(0.4, 0.4, 0.025, 16), mt(0xfff0f5, 0.45));
    f2.position.y = 0.445; g.add(f2);
    var cherry = mk(sp(0.045), mt(0xdc143c, 0.45));
    cherry.position.y = 0.5; g.add(cherry);
    var stem = mk(cy(0.004, 0.004, 0.055, 4), mt(0x228b22, 0.7));
    stem.position.y = 0.55; g.add(stem);
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2;
      var d = mk(sp(0.02), mt(0xffd700, 0.35, 0.3));
      d.position.set(Math.cos(a) * 0.48, 0.245, Math.sin(a) * 0.48);
      g.add(d);
    }
    return g;
  }

  // ── SOUP ───────────────────────────────────────────────────
  function buildSoup() {
    var g = new THREE.Group();
    var bowl = mk(sp(0.62, 20, 14), mt(0xf5f0e8, 0.3, 0.1));
    bowl.scale.y = 0.42; bowl.position.y = 0.08; g.add(bowl);
    var liquid = mk(cy(0.52, 0.52, 0.018, 20), mt(0xd4760a, 0.35));
    liquid.position.y = 0.16; g.add(liquid);
    for (var i = 0; i < 5; i++) {
      var a = Math.random() * Math.PI * 2;
      var r = Math.random() * 0.28;
      var gar = mk(sp(0.022), mt(0x27ae60, 0.7));
      gar.position.set(Math.cos(a) * r, 0.18, Math.sin(a) * r);
      gar.scale.set(1.5, 0.3, 1); g.add(gar);
    }
    for (i = 0; i < 3; i++) {
      var cr = mk(bx(0.035, 0.025, 0.035), mt(0xd4a247, 0.8));
      cr.position.set((Math.random() - 0.5) * 0.28, 0.18, (Math.random() - 0.5) * 0.28);
      cr.rotation.y = Math.random() * Math.PI; g.add(cr);
    }
    return g;
  }

  // ── CHICKEN ────────────────────────────────────────────────
  function buildChicken() {
    var g = new THREE.Group();
    var body = mk(sp(0.28, 12, 8), mt(0xc8850a, 0.75));
    body.position.y = 0.18; body.scale.set(1, 0.75, 1.3); g.add(body);
    var p2 = mk(sp(0.24, 12, 8), mt(0xd4960e, 0.75));
    p2.position.set(0.28, 0.14, 0.08); p2.scale.set(1, 0.7, 1.2); g.add(p2);
    var bone = mk(cy(0.018, 0.012, 0.18, 6), mt(0xfff8dc, 0.5));
    bone.position.set(-0.14, 0.18, -0.18); bone.rotation.z = 0.5; g.add(bone);
    for (var i = 0; i < 5; i++) {
      var cb = mk(sp(0.018), mt(0xb8720a, 0.85));
      cb.position.set((Math.random() - 0.5) * 0.45, 0.08 + Math.random() * 0.12, (Math.random() - 0.5) * 0.35);
      g.add(cb);
    }
    var h = mk(sp(0.028), mt(0x27ae60, 0.7));
    h.position.set(0.18, 0.28, 0.12); h.scale.set(1.5, 0.3, 1); g.add(h);
    return g;
  }

  // ── RICE ───────────────────────────────────────────────────
  function buildRice() {
    var g = new THREE.Group();
    var mound = mk(sp(0.48, 14, 10), mt(0xfff8f0, 0.6));
    mound.scale.y = 0.42; mound.position.y = 0.08; g.add(mound);
    for (var i = 0; i < 5; i++) {
      var gar = mk(sp(0.018), mt(i < 3 ? 0x27ae60 : 0xe74c3c, 0.7));
      gar.position.set((Math.random() - 0.5) * 0.2, 0.22 + Math.random() * 0.04, (Math.random() - 0.5) * 0.2);
      g.add(gar);
    }
    var drz = mk(cy(0.016, 0.012, 0.22, 6), mt(0xd4760a, 0.5));
    drz.position.set(0.08, 0.18, 0); drz.rotation.z = Math.PI / 4; g.add(drz);
    return g;
  }

  // ── FISH ───────────────────────────────────────────────────
  function buildFish() {
    var g = new THREE.Group();
    var fillet = mk(bx(0.65, 0.09, 0.32), mt(0xfa8072, 0.55));
    fillet.position.y = 0.07; g.add(fillet);
    var skin = mk(bx(0.65, 0.018, 0.32), mt(0x708090, 0.7));
    skin.position.y = 0.02; g.add(skin);
    var lemon = mk(cy(0.07, 0.07, 0.018, 10), mt(0xffd700, 0.45));
    lemon.position.set(0.22, 0.13, 0.08); g.add(lemon);
    for (var i = 0; i < 3; i++) {
      var h = mk(sp(0.018), mt(0x27ae60, 0.7));
      h.position.set((Math.random() - 0.5) * 0.35, 0.13, (Math.random() - 0.5) * 0.18);
      h.scale.set(1.5, 0.3, 1); g.add(h);
    }
    return g;
  }

  // ── TACO ───────────────────────────────────────────────────
  function buildTaco() {
    var g = new THREE.Group();
    var shellGeo = new THREE.CylinderGeometry(0.38, 0.32, 0.07, 12, 1, true, 0, Math.PI);
    var shell = mk(shellGeo, mt(0xd4a247, 0.8));
    shell.rotation.z = Math.PI; shell.position.y = 0.15; g.add(shell);
    var shell2 = mk(new THREE.CylinderGeometry(0.38, 0.32, 0.07, 12, 1, true, Math.PI, Math.PI), mt(0xd4a247, 0.8));
    shell2.rotation.z = Math.PI; shell2.position.y = 0.15; g.add(shell2);
    var meat = mk(sp(0.14), mt(0x8b4513, 0.8));
    meat.position.y = 0.11; meat.scale.y = 0.5; g.add(meat);
    var let_ = mk(sp(0.1), mt(0x27ae60, 0.7));
    let_.position.set(0, 0.16, 0); let_.scale.y = 0.3; g.add(let_);
    var ch = mk(sp(0.07), mt(0xf5c518, 0.6));
    ch.position.set(0.04, 0.18, 0.04); ch.scale.y = 0.3; g.add(ch);
    var tm = mk(sp(0.035), mt(0xe74c3c, 0.6));
    tm.position.set(-0.04, 0.18, -0.02); g.add(tm);
    return g;
  }

  // ── SANDWICH ───────────────────────────────────────────────
  function buildSandwich() {
    var g = new THREE.Group();
    g.add(mk(bx(0.55, 0.09, 0.38), mt(0xd4a247, 0.8)));
    g.children[0].position.y = 0.045;
    var lt = mk(bx(0.5, 0.018, 0.36), mt(0x27ae60, 0.7));
    lt.position.y = 0.1; g.add(lt);
    var mt2 = mk(bx(0.48, 0.055, 0.34), mt(0x8b4513, 0.8));
    mt2.position.y = 0.15; g.add(mt2);
    var ch = mk(bx(0.5, 0.018, 0.35), mt(0xf5c518, 0.55));
    ch.position.y = 0.19; ch.rotation.y = 0.08; g.add(ch);
    var tm = mk(bx(0.42, 0.025, 0.3), mt(0xe74c3c, 0.6));
    tm.position.y = 0.21; g.add(tm);
    var tb = mk(bx(0.55, 0.1, 0.38), mt(0xc49030, 0.8));
    tb.position.y = 0.28; g.add(tb);
    return g;
  }

  // ── PANCAKE ────────────────────────────────────────────────
  function buildPancake() {
    var g = new THREE.Group();
    for (var i = 0; i < 3; i++) {
      var pc = mk(cy(0.4 - i * 0.02, 0.4 - i * 0.02, 0.06, 20), mt(0xd4a247, 0.75));
      pc.position.y = 0.03 + i * 0.065; g.add(pc);
    }
    var syrup = mk(cy(0.25, 0.3, 0.01, 14), mt(0x8B6914, 0.4));
    syrup.position.y = 0.23; g.add(syrup);
    var butter = mk(cy(0.06, 0.06, 0.025, 8), mt(0xfff8dc, 0.4));
    butter.position.y = 0.25; g.add(butter);
    var berry1 = mk(sp(0.03), mt(0xdc143c, 0.5));
    berry1.position.set(0.2, 0.22, 0.1); g.add(berry1);
    var berry2 = mk(sp(0.025), mt(0x4a0080, 0.5));
    berry2.position.set(-0.15, 0.22, 0.12); g.add(berry2);
    return g;
  }

  // ── CHOCOLATE ──────────────────────────────────────────────
  function buildChocolate() {
    var g = new THREE.Group();
    var base = mk(cy(0.45, 0.45, 0.22, 16), mt(0x3e1a00, 0.65));
    base.position.y = 0.11; g.add(base);
    var ganache = mk(cy(0.47, 0.35, 0.04, 16), mt(0x1a0a00, 0.5));
    ganache.position.y = 0.23; g.add(ganache);
    var drip1 = mk(cy(0.02, 0.018, 0.08, 6), mt(0x1a0a00, 0.5));
    drip1.position.set(0.35, 0.18, 0); g.add(drip1);
    var drip2 = mk(cy(0.018, 0.015, 0.06, 6), mt(0x1a0a00, 0.5));
    drip2.position.set(-0.3, 0.19, 0.15); g.add(drip2);
    var curl = mk(sp(0.04), mt(0xf5f0e8, 0.5));
    curl.position.y = 0.28; curl.scale.set(2, 0.4, 0.8); g.add(curl);
    var berry = mk(sp(0.03), mt(0xdc143c, 0.45));
    berry.position.set(0.08, 0.28, 0.05); g.add(berry);
    return g;
  }

  // ── GENERIC ────────────────────────────────────────────────
  function buildGeneric() {
    var g = new THREE.Group();
    var dome = mk(sp(0.38, 14, 10), mt(0xc8850a, 0.7));
    dome.scale.y = 0.55; dome.position.y = 0.08; g.add(dome);
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * Math.PI * 2;
      var gar = mk(sp(0.025), mt(i < 3 ? 0x27ae60 : 0xe74c3c, 0.7));
      gar.position.set(Math.cos(a) * 0.48, 0.04, Math.sin(a) * 0.48); g.add(gar);
    }
    var dr = mk(cy(0.012, 0.008, 0.2, 6), mt(0xd4760a, 0.5));
    dr.position.set(0.12, 0.18, 0); dr.rotation.z = 0.6; g.add(dr);
    return g;
  }

  /* ── Builder lookup ─────────────────────────────────────── */
  var BUILDERS = {
    pizza: buildPizza,     burger: buildBurger,     pasta: buildPasta,
    sushi: buildSushi,     steak: buildSteak,       salad: buildSalad,
    cake: buildCake,       soup: buildSoup,         chicken: buildChicken,
    rice: buildRice,       fish: buildFish,         taco: buildTaco,
    sandwich: buildSandwich, pancake: buildPancake,
    chocolate: buildChocolate, generic: buildGeneric
  };

  /* ═══════════════════════════════════════════════════════════
     8. TABLE
     ═══════════════════════════════════════════════════════════ */
  function buildTable() {
    var g = new THREE.Group();
    var top = mk(bx(3, 0.08, 2), mt(0x3e2723, 0.85));
    top.receiveShadow = true; g.add(top);
    var cloth = mk(bx(0.9, 0.004, 2.04), mt(0x8b0000, 0.55));
    cloth.position.y = 0.044; g.add(cloth);
    var legMt = mt(0x2c1810, 0.9);
    [[-1.3, -0.85], [1.3, -0.85], [-1.3, 0.85], [1.3, 0.85]].forEach(function (p) {
      var leg = mk(cy(0.04, 0.04, 1, 8), legMt);
      leg.position.set(p[0], -0.54, p[1]); g.add(leg);
    });
    return g;
  }

  /* ═══════════════════════════════════════════════════════════
     9. FORK
     ═══════════════════════════════════════════════════════════ */
  function buildFork() {
    var g = new THREE.Group();
    var fm = mt(0xc0c0c0, 0.25, 0.82);
    g.add(mk(cy(0.011, 0.009, 0.38, 6), fm));
    var head = mk(bx(0.055, 0.004, 0.1), fm);
    head.position.y = 0.22; g.add(head);
    for (var i = -1; i <= 1; i++) {
      var t = mk(cy(0.004, 0.003, 0.11, 4), fm);
      t.position.set(i * 0.016, 0.3, 0); g.add(t);
    }
    return g;
  }

  /* ═══════════════════════════════════════════════════════════
     10. CHARACTER
     ═══════════════════════════════════════════════════════════ */
  function buildCharacter() {
    var g = new THREE.Group();
    var skin = mt(0xf5cba7, 0.6);

    // Body (shirt)
    var body = mk(cy(0.28, 0.24, 0.65, 12), mt(0x2c3e50, 0.7));
    body.position.y = 0.325; g.add(body);

    // Collar
    var collar = mk(new THREE.TorusGeometry(0.22, 0.025, 6, 12), mt(0xecf0f1, 0.5));
    collar.rotation.x = Math.PI / 2; collar.position.y = 0.65; g.add(collar);

    // Neck
    g.add(mk(cy(0.07, 0.07, 0.1, 8), skin));
    g.children[g.children.length - 1].position.y = 0.72;

    // Head
    var head = mk(sp(0.26, 16, 12), skin);
    head.position.y = 1.02; head.name = 'charHead'; g.add(head);

    // Hair
    var hair = mk(sp(0.27, 14, 10), mt(0x2c1810, 0.8));
    hair.position.y = 1.1; hair.scale.set(1, 0.62, 1); g.add(hair);

    // Eyes — whites + pupils
    var eyeW = mt(0xffffff, 0.3);
    var eyeP = mt(0x1a1a2e, 0.3);
    [[-0.09, 0.09], [0.09, 0.09]].forEach(function (p) {
      var white = mk(sp(0.04, 8, 6), eyeW);
      white.position.set(p[0], 1.05, 0.2); g.add(white);
      var pupil = mk(sp(0.022, 6, 4), eyeP);
      pupil.position.set(p[0], 1.05, 0.23); g.add(pupil);
    });

    // Eyebrows
    var browMat = mt(0x2c1810, 0.8);
    [[-0.09, 0.09], [0.09, 0.09]].forEach(function (p) {
      var brow = mk(bx(0.06, 0.008, 0.015), browMat);
      brow.position.set(p[0], 1.1, 0.22); g.add(brow);
    });

    // Mouth
    var mouth = mk(sp(0.035, 8, 6), mt(0xc0392b, 0.5));
    mouth.position.set(0, 0.93, 0.22);
    mouth.scale.set(1.2, 0.3, 0.5);
    mouth.name = 'charMouth'; g.add(mouth);

    // Cheek blush
    var blushM = mt(0xffb6c1, 0.5);
    [[-0.16, 0.016], [0.16, 0.016]].forEach(function (p) {
      var bl = mk(sp(0.03, 6, 4), blushM);
      bl.position.set(p[0], 0.98, 0.18); bl.scale.y = 0.5; g.add(bl);
    });

    // Left arm (resting on table)
    var armMat = mt(0x2c3e50, 0.7);
    var la = mk(cy(0.055, 0.045, 0.42, 8), armMat);
    la.position.set(-0.32, 0.28, 0.28);
    la.rotation.z = 0.75; la.rotation.x = -0.55; g.add(la);
    var lh = mk(sp(0.045, 8, 6), skin);
    lh.position.set(-0.52, 0.1, 0.46); g.add(lh);

    // Right arm
    var ra = mk(cy(0.055, 0.045, 0.42, 8), armMat);
    ra.position.set(0.32, 0.28, 0.28);
    ra.rotation.z = -0.75; ra.rotation.x = -0.55;
    ra.name = 'charRArm'; g.add(ra);
    var rh = mk(sp(0.045, 8, 6), skin);
    rh.position.set(0.52, 0.1, 0.46);
    rh.name = 'charRHand'; g.add(rh);

    return g;
  }

  /* ═══════════════════════════════════════════════════════════
     11. ANIMATION KEYFRAMES
     ═══════════════════════════════════════════════════════════ */
  var KF = [
    { t: 0.00, fx: 0.52, fy: 1.10, fz:-1.10, frx: 0,     fry: 0, frz: 0.30, mo: 0,   hn: 0,     fp: false },
    { t: 0.10, fx: 0.38, fy: 1.12, fz:-0.45, frx:-0.30,  fry: 0, frz: 0.18, mo: 0,   hn: 0,     fp: false },
    { t: 0.22, fx: 0.08, fy: 1.16, fz: 0.25, frx:-0.80,  fry: 0, frz: 0.04, mo: 0,   hn:-0.04,  fp: false },
    { t: 0.30, fx: 0.08, fy: 1.08, fz: 0.25, frx:-1.00,  fry: 0, frz: 0.04, mo: 0,   hn:-0.04,  fp: false },
    { t: 0.37, fx: 0.08, fy: 1.20, fz: 0.25, frx:-0.55,  fry: 0, frz: 0.04, mo: 0,   hn: 0,     fp: true  },
    { t: 0.48, fx: 0.12, fy: 1.48, fz:-0.30, frx:-0.30,  fry: 0, frz: 0.00, mo: 0,   hn: 0,     fp: true  },
    { t: 0.58, fx: 0.04, fy: 1.52, fz:-1.10, frx:-0.10,  fry: 0, frz:-0.08, mo: 0.85, hn:-0.10, fp: true  },
    { t: 0.65, fx: 0.02, fy: 1.48, fz:-1.16, frx: 0,     fry: 0, frz:-0.08, mo: 0.35, hn:-0.05, fp: false },
    { t: 0.73, fx: 0.18, fy: 1.32, fz:-0.85, frx: 0.08,  fry: 0, frz: 0.08, mo: 0,   hn: 0.07,  fp: false },
    { t: 0.82, fx: 0.32, fy: 1.18, fz:-0.78, frx: 0.04,  fry: 0, frz: 0.18, mo: 0,   hn:-0.08,  fp: false },
    { t: 0.92, fx: 0.42, fy: 1.12, fz:-0.90, frx: 0.02,  fry: 0, frz: 0.24, mo: 0,   hn: 0.12,  fp: false },
    { t: 1.00, fx: 0.52, fy: 1.10, fz:-1.10, frx: 0,     fry: 0, frz: 0.30, mo: 0,   hn: 0,     fp: false }
  ];

  function easeIO(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ═══════════════════════════════════════════════════════════
     12. TASTE EXPERIENCE
     ═══════════════════════════════════════════════════════════ */
  function TasteExp(container, name, image, price) {
    this.ctr       = container;
    this.name      = name;
    this.image     = image;
    this.price     = price;
    this.type      = detectType(name);

    this.scene     = null;
    this.cam       = null;
    this.ren       = null;
    this.ctrl      = null;
    this.clk       = null;

    this.state     = 'idle';
    this.at        = 0;
    this.dur       = 6.0;
    this.raf       = null;

    this.forkGrp   = null;
    this.foodPc    = null;
    this.cHead     = null;
    this.cMouth    = null;
    this.foodGrp   = null;

    this._ba = this._anim.bind(this);
    this._init();
  }

  TasteExp.prototype._init = function () {
    var T = THREE;
    var w = this.ctr.clientWidth  || 600;
    var h = this.ctr.clientHeight || 450;

    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x080808);
    this.scene.fog = new T.FogExp2(0x080808, 0.065);

    this.cam = new T.PerspectiveCamera(44, w / h, 0.1, 100);
    this.cam.position.set(2.2, 2.6, 3.4);
    this.cam.lookAt(new T.Vector3(0, 1.1, -0.3));

    this.ren = new T.WebGLRenderer({ antialias: true });
    this.ren.setSize(w, h);
    this.ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.ren.shadowMap.enabled = true;
    this.ren.shadowMap.type = T.PCFSoftShadowMap;
    if (this.ren.toneMapping !== undefined) {
      this.ren.toneMapping = T.ACESFilmicToneMapping || 0;
      this.ren.toneMappingExposure = 1.0;
    }
    this.ctr.appendChild(this.ren.domElement);

    this.ctrl = new T.OrbitControls(this.cam, this.ren.domElement);
    this.ctrl.target.set(0, 1.1, -0.3);
    this.ctrl.enableDamping = true;
    this.ctrl.dampingFactor = 0.08;
    this.ctrl.minDistance = 1.5;
    this.ctrl.maxDistance = 7;
    this.ctrl.maxPolarAngle = Math.PI * 0.78;
    this.ctrl.update();

    this.clk = new T.Clock();
    this._lights();
    this._env();
    this._buildScene();

    var self = this;
    this._onR = function () {
      var ww = self.ctr.clientWidth;
      var hh = self.ctr.clientHeight;
      if (ww && hh) {
        self.cam.aspect = ww / hh;
        self.cam.updateProjectionMatrix();
        self.ren.setSize(ww, hh);
      }
    };
    window.addEventListener('resize', this._onR);

    var ld = document.getElementById('t3d-ld');
    if (ld) ld.style.display = 'none';

    this._anim();
  };

  TasteExp.prototype._lights = function () {
    var T = THREE;
    this.scene.add(new T.AmbientLight(0xfff0e0, 0.45));

    var key = new T.DirectionalLight(0xffd699, 1.2);
    key.position.set(3, 4.5, 2);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 15;
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0008;
    this.scene.add(key);

    var fill = new T.DirectionalLight(0xb0c4de, 0.28);
    fill.position.set(-2, 2, 1);
    this.scene.add(fill);

    var rim = new T.PointLight(0xffd700, 0.55, 8);
    rim.position.set(-1, 3.5, -3.5);
    this.scene.add(rim);

    var spot = new T.SpotLight(0xffe0b2, 0.75, 6, Math.PI / 6, 0.5);
    spot.position.set(0, 3.8, 0.5);
    spot.target.position.set(0, 1, 0.3);
    this.scene.add(spot);
    this.scene.add(spot.target);
  };

  TasteExp.prototype._env = function () {
    var T = THREE;
    var floor = new T.Mesh(
      new T.PlaneGeometry(20, 20),
      new T.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    var wall = new T.Mesh(
      new T.PlaneGeometry(20, 10),
      new T.MeshStandardMaterial({ color: 0x14110d, roughness: 0.95 })
    );
    wall.position.set(0, 5, -4.5);
    this.scene.add(wall);
  };

  TasteExp.prototype._buildScene = function () {
    var table = buildTable();
    table.position.y = 1.04;
    this.scene.add(table);

    var plate = buildPlate();
    plate.position.set(0, 1.09, 0.3);
    this.scene.add(plate);

    var builder = BUILDERS[this.type] || buildGeneric;
    this.foodGrp = builder();
    this.foodGrp.position.set(0, 1.13, 0.3);
    this.scene.add(this.foodGrp);

    var ch = buildCharacter();
    ch.position.set(0, 0.6, -1.4);
    this.scene.add(ch);
    this.cHead  = ch.getObjectByName('charHead');
    this.cMouth = ch.getObjectByName('charMouth');

    this.forkGrp = buildFork();
    this.forkGrp.position.set(KF[0].fx, KF[0].fy, KF[0].fz);
    this.forkGrp.rotation.z = KF[0].frz;
    this.scene.add(this.forkGrp);

    this.foodPc = mk(sp(0.032), mt(this._fpColor(), 0.6));
    this.foodPc.visible = false;
    this.scene.add(this.foodPc);

    var napkin = mk(bx(0.28, 0.008, 0.22), mt(0xfff8f0, 0.5));
    napkin.position.set(-0.78, 1.09, 0.48);
    napkin.rotation.y = 0.2;
    this.scene.add(napkin);

    var glassMat = new THREE.MeshStandardMaterial({
      color: 0x87CEEB, roughness: 0.1, metalness: 0.1,
      transparent: true, opacity: 0.25
    });
    var glass = new THREE.Mesh(cy(0.055, 0.048, 0.22, 10), glassMat);
    glass.position.set(0.72, 1.2, -0.18);
    this.scene.add(glass);

    var candle = mk(cy(0.025, 0.025, 0.12, 8), mt(0xfff8dc, 0.5));
    candle.position.set(-0.45, 1.15, -0.15);
    this.scene.add(candle);
    var flame = mk(sp(0.018, 6, 4), mt(0xff8c00, 0.3, 0.1));
    flame.position.set(-0.45, 1.23, -0.15);
    flame.name = 'flame';
    this.flame = flame;
    this.scene.add(flame);
  };

  TasteExp.prototype._fpColor = function () {
    var c = {
      pizza: 0xd4a247, burger: 0x3e2723, pasta: 0xf5deb3, sushi: 0xfa8072,
      steak: 0x5c3317, salad: 0x27ae60, cake: 0x8b4513, soup: 0xd4760a,
      chicken: 0xc8850a, rice: 0xfff8f0, fish: 0xfa8072, taco: 0x8b4513,
      sandwich: 0xd4a247, pancake: 0xd4a247, chocolate: 0x3e1a00, generic: 0xc8850a
    };
    return c[this.type] || 0xc8850a;
  };

  TasteExp.prototype._anim = function () {
    this.raf = requestAnimationFrame(this._ba);
    var dt = this.clk.getDelta();

    if (this.state === 'playing') {
      this.at += dt;
      this._upd();
      if (this.at >= this.dur) {
        this.state = 'done';
        this._labels();
      }
    }

    if (this.foodGrp && (this.state === 'idle' || this.state === 'done')) {
      this.foodGrp.rotation.y += dt * 0.35;
    }

    if (this.flame) {
      this.flame.scale.y = 0.8 + Math.sin(Date.now() * 0.012) * 0.3;
      this.flame.scale.x = 0.9 + Math.sin(Date.now() * 0.009) * 0.15;
    }

    this.ctrl.update();
    this.ren.render(this.scene, this.cam);
  };

  TasteExp.prototype._upd = function () {
    var nt = Math.min(this.at / this.dur, 1.0);

    var idx = 0;
    for (idx = 0; idx < KF.length - 1; idx++) {
      if (nt >= KF[idx].t && nt <= KF[idx + 1].t) break;
    }
    if (idx >= KF.length - 1) idx = KF.length - 2;

    var a = KF[idx], b = KF[idx + 1];
    var seg = (b.t - a.t) > 0 ? (nt - a.t) / (b.t - a.t) : 0;
    seg = easeIO(Math.max(0, Math.min(1, seg)));

    this.forkGrp.position.set(
      lerp(a.fx, b.fx, seg),
      lerp(a.fy, b.fy, seg),
      lerp(a.fz, b.fz, seg)
    );
    this.forkGrp.rotation.set(
      lerp(a.frx, b.frx, seg),
      lerp(a.fry, b.fry, seg),
      lerp(a.frz, b.frz, seg)
    );

    var hasFP = seg > 0.5 ? b.fp : a.fp;
    this.foodPc.visible = hasFP;
    if (hasFP) {
      this.foodPc.position.copy(this.forkGrp.position);
      this.foodPc.position.y += 0.34;
    }

    var mo = lerp(a.mo, b.mo, seg);
    if (this.cMouth) {
      this.cMouth.scale.y = 0.3 + mo * 0.75;
      this.cMouth.scale.z = 0.5 + mo * 0.5;
    }

    var hn = lerp(a.hn, b.hn, seg);
    if (this.cHead) {
      this.cHead.rotation.x = hn;
    }

    if (this.foodGrp) {
      this.foodGrp.rotation.y *= 0.95;
    }
  };

  TasteExp.prototype.play = function () {
    if (this.state === 'done') this.at = 0;
    this.state = 'playing';
    this._labels();
  };

  TasteExp.prototype.togglePause = function () {
    if (this.state === 'playing') {
      this.state = 'paused';
    } else if (this.state === 'paused') {
      this.state = 'playing';
    }
    this._labels();
  };

  TasteExp.prototype.replay = function () {
    this.at = 0;
    if (this.foodPc) this.foodPc.visible = false;
    this.state = 'playing';
    this._labels();
  };

  TasteExp.prototype._labels = function () {
    var pb = document.getElementById('t3d-play');
    var pa = document.getElementById('t3d-pause');
    if (!pb || !pa) return;
    if (this.state === 'playing') {
      pb.textContent = '\u25B6 Animatsiya...';
      pa.textContent = '\u23F8 Pauza';
    } else if (this.state === 'paused') {
      pb.textContent = '\u25B6 Davom';
      pa.textContent = '\u25B6 Davom';
    } else if (this.state === 'done') {
      pb.textContent = '\u21BB Qayta tatib ko\'rish';
      pa.textContent = '\u23F8 Pauza';
    } else {
      pb.textContent = '\u25B6 Tatib ko\'rish';
      pa.textContent = '\u23F8 Pauza';
    }
  };

  TasteExp.prototype.dispose = function () {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onR);
    if (this.ctrl) this.ctrl.dispose();
    if (this.scene) {
      this.scene.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); });
          else obj.material.dispose();
        }
      });
    }
    if (this.ren) {
      this.ren.dispose();
      if (this.ren.domElement && this.ren.domElement.parentNode) {
        this.ren.domElement.parentNode.removeChild(this.ren.domElement);
      }
    }
    this.scene = null;
    this.cam = null;
    this.ren = null;
    this.ctrl = null;
  };

  /* ═══════════════════════════════════════════════════════════
     13. OPEN / CLOSE
     ═══════════════════════════════════════════════════════════ */
  function openExperience(name, image, price) {
    injectCSS();
    ensureModal();

    document.getElementById('t3d-img').src = image;
    document.getElementById('t3d-img').alt = name;
    document.getElementById('t3d-nm').textContent = name;
    document.getElementById('t3d-pr').textContent = price;

    var type = detectType(name);
    var desc = {
      pizza:     'Issiq, yangi tayyorlangan pizza, maxsus pechda pishirilgan.',
      burger:    'Sifatli go\'sht, yangi sabzavotlar va maxsus sous bilan.',
      pasta:     'Italyan uslubida tayyorlangan, mazali sous bilan.',
      sushi:     'Yangi baliq va guruch bilan an\'anaviy tayyorlangan.',
      steak:     'Premium go\'sht, mukammal darajada pishirilgan.',
      salad:     'Yangi sabzavotlar va vitaminlarga boy salat.',
      cake:      'Shirin va mazali desert, maxsus tayyorlangan.',
      soup:      'Issiq va mazali sho\'rva, an\'anaviy retsept bilan.',
      chicken:   'Tovuq go\'shti, maxsus ziravorlar bilan pishirilgan.',
      rice:      'Xushbo\'y guruch, ziravorlar bilan tayyorlangan.',
      fish:      'Yangi baliq, mukammal darajada pishirilgan.',
      taco:      'Meksika oshxonasi uslubida tayyorlangan.',
      sandwich:  'Yangi non va sifatli ingredientlar bilan.',
      pancake:   'Yumshoq, issiq va shirin pancake.',
      chocolate: 'Shokoladli desert, mukammal ta\'m.',
      generic:   'Maxsus tayyorlangan mazali taom.'
    };
    document.getElementById('t3d-ds').textContent = desc[type] || desc.generic;

    var ld = document.getElementById('t3d-ld');
    if (ld) ld.style.display = 'flex';

    overlayEl.classList.add('t3active');
    document.body.style.overflow = 'hidden';

    ensureThree(function () {
      if (currentExp) { currentExp.dispose(); currentExp = null; }
      var wrap = document.getElementById('t3d-cw');
      currentExp = new TasteExp(wrap, name, image, price);
    });
  }

  function closeExperience() {
    if (overlayEl) overlayEl.classList.remove('t3active');
    document.body.style.overflow = '';
    setTimeout(function () {
      if (currentExp) { currentExp.dispose(); currentExp = null; }
    }, 420);
  }

  window.openTaste3D = openExperience;

  /* ═══════════════════════════════════════════════════════════
     14. BUTTON INJECTION (Supports dynamic cards)
     ═══════════════════════════════════════════════════════════ */
  function injectBtnForAddButton(addBtn) {
    if (!addBtn || !addBtn.parentNode) return;
    if (addBtn.parentNode.querySelector('.taste3d-btn')) return;

    var name  = addBtn.getAttribute('data-name')  || '';
    var image = addBtn.getAttribute('data-image') || '';
    var price = addBtn.getAttribute('data-price') || '';

    var btn = document.createElement('button');
    btn.className = 'taste3d-btn';
    btn.type = 'button';
    btn.innerHTML = '\uD83C\uDF7D\uFE0F Tatib ko\'rish';
    btn.setAttribute('data-t3n', name);
    btn.setAttribute('data-t3i', image);
    btn.setAttribute('data-t3p', price);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openExperience(
        this.getAttribute('data-t3n'),
        this.getAttribute('data-t3i'),
        this.getAttribute('data-t3p')
      );
    });

    addBtn.parentNode.insertBefore(btn, addBtn.nextSibling);
  }

  function scanAll() {
    var addBtns = document.querySelectorAll('button[onclick*="addToCart"]');
    for (var i = 0; i < addBtns.length; i++) {
      injectBtnForAddButton(addBtns[i]);
    }
  }

  function observe() {
    scanAll();
    var obs = new MutationObserver(function (muts) {
      var needsScan = false;
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes.length > 0) {
          needsScan = true;
          break;
        }
      }
      if (needsScan) scanAll();
    });
    var target = document.querySelector('.row') || document.body;
    obs.observe(target, { childList: true, subtree: true });
  }

  /* ═══════════════════════════════════════════════════════════
     15. INITIALIZATION
     ═══════════════════════════════════════════════════════════ */
  function init() {
    injectCSS();
    ensureModal();
    observe();
    setTimeout(scanAll, 1200);
    setTimeout(scanAll, 3000);
    setTimeout(scanAll, 5500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

