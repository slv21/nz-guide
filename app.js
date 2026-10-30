(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 940, H = 1330;
  const X = lon => (lon - 166.2) * 75.5;
  const Y = lat => (-34.2 - lat) * 100;
  const P = ([lon, lat]) => [X(lon), Y(lat)];
  const $ = s => document.querySelector(s);
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mapUrl = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q + ', New Zealand');
  const line = pts => 'M' + pts.map(p => P(p).map(v => v.toFixed(1)).join(',')).join('L');

  const svg = $('#map'), wrap = $('#mapwrap'), panel = $('#panel'), body = $('#panelBody');
  const byId = Object.fromEntries(PLACES.map(p => [p.id, p]));
  const isPhone = () => matchMedia('(max-width: 760px)').matches;

  // ---------- Static map art ----------
  const coastD = $('#coast').getAttribute('d');
  [[44, 'sea-line'], [36, 'sea'], [26, 'sea-line'], [19, 'sea'], [9, 'sea-line']].forEach(([w, c]) =>
    el('path', { d: coastD, class: 'ripple', stroke: `var(--${c})`, 'stroke-width': w }, $('#ripples')));

  const LAKES = [
    [[168.38, -44.83], [168.43, -44.96], [168.53, -45.02], [168.66, -45.05], [168.73, -45.11], [168.74, -45.23], [168.72, -45.33]],
    [[169.13, -44.69], [169.06, -44.60], [169.09, -44.50], [169.20, -44.42], [169.27, -44.35]],
    [[169.25, -44.62], [169.28, -44.50], [169.32, -44.40], [169.35, -44.30]],
    [[167.73, -45.43], [167.67, -45.30], [167.72, -45.15], [167.80, -45.03]],
    [[167.54, -45.51], [167.63, -45.55]],
    [[170.15, -44.18], [170.15, -44.05], [170.12, -43.93]],
    [[170.50, -44.02], [170.53, -43.93], [170.57, -43.85]],
    [[169.86, -44.30], [169.83, -44.15]],
    [[169.21, -45.03], [169.25, -44.92]],
  ];
  LAKES.forEach(pts => el('path', { d: line(pts), class: 'lake', 'stroke-width': 6 }, $('#lakes')));
  el('circle', { cx: X(175.90), cy: Y(-38.80), r: 11, fill: 'var(--lake)' }, $('#lakes'));

  // Southern Alps and the big North Island volcanoes, drawn as little peaks
  const ALPS = [[167.3, -45.9], [167.8, -45.2], [168.3, -44.75], [168.9, -44.35], [169.6, -43.95], [170.2, -43.6],
    [170.9, -43.2], [171.5, -42.85], [172.1, -42.5], [172.7, -42.25], [173.3, -42.0], [173.7, -41.75]].map(P);
  const pinXY = PLACES.map(p => P(p.at));
  const peak = (x, y, k) => {
    const g = el('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k})` }, $('#mountains'));
    el('path', { class: 'mtn', d: 'M-8,5 L-1,-7 L1,-5 L2.5,-7.5 L9,5 Z' }, g);
    el('path', { class: 'snow', d: 'M-3.4,-1.3 L-1,-7 L1,-5 L2.5,-7.5 L5.2,-2.4 L3.4,-3.4 L1.8,-2.2 L0,-3.4 Z' }, g);
  };
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < ALPS.length - 1; i++) {
    const [x1, y1] = ALPS[i], [x2, y2] = ALPS[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.round(len / 17);
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    for (let j = 0; j < n; j++) {
      const t = (j + rnd() * .5) / n, off = (j % 2 ? 1 : -1) * (5 + rnd() * 9);
      const x = x1 + (x2 - x1) * t + nx * off, y = y1 + (y2 - y1) * t + ny * off;
      if (pinXY.some(([px, py]) => Math.hypot(px - x, py - y) < 16)) continue;
      peak(x, y, 1 + rnd() * .6);
    }
  }
  [[175.57, -39.28], [174.06, -39.30], [175.75, -39.02]].forEach(c => { const [x, y] = P(c); peak(x, y, 1.6); });

  [['TASMAN SEA', 168.2, -39.6, 22], ['PACIFIC OCEAN', 175.2, -44.9, 22], ['Cook Strait', 174.35, -41.15, 12]].forEach(([t, lon, lat, fs]) => {
    const tx = el('text', { x: X(lon), y: Y(lat), class: 'sealabel', 'font-size': fs, 'text-anchor': 'middle' }, $('#sealabels'));
    tx.textContent = t;
  });

  // Every road used by any loop, drawn faintly
  const roadSet = new Map();
  LOOPS.forEach(l => l.items.forEach(it => { if (it.drive) roadSet.set(it.drive.join(), it.drive); }));
  roadSet.forEach(nodes => el('path', { d: line(nodes.map(n => NODES[n])) }, $('#roads')));

  // The flight from Auckland down to Christchurch
  const flightPath = el('path', {}, $('#flight'));
  function drawFlight(to) {
    const [ax, ay] = P(byId.auckland.at), [cx, cy] = P(byId[to].at);
    flightPath.setAttribute('d', `M${ax},${ay} Q${(ax + cx) / 2 + 200},${(ay + cy) / 2} ${cx},${cy}`);
  }

  // ---------- Pins ----------
  const pinEls = {};
  PLACES.forEach(p => {
    const [x, y] = P(p.at);
    const g = el('g', {
      class: `pin ${p.kind === 'extra' ? 'extra' : ''} ${p.kind === 'wedding' ? 'wedding' : ''} ${p.tier === 2 ? 'minor' : ''} ${p.things.some(t => t.pick) ? 'has-pick' : ''}`,
      'data-id': p.id, tabindex: 0, role: 'button', 'aria-label': p.name,
    }, $('#pins'));
    g._x = x; g._y = y;
    el('circle', { class: 'hit', r: 17 }, g);
    if (p.kind === 'wedding') {
      el('path', { class: 'heart', d: 'M0,7 C-9,0 -9,-7 -4.5,-7.5 C-2,-7.8 -0.5,-6 0,-4.5 C0.5,-6 2,-7.8 4.5,-7.5 C9,-7 9,0 0,7Z' }, g);
    } else {
      el('circle', { class: 'ring', r: 9.5 }, g);
      el('circle', { class: 'dot', r: 6 }, g);
    }
    const t = el('text', { class: 'lbl', x: p.side === 'l' ? -13 : 13, y: 5, 'text-anchor': p.side === 'l' ? 'end' : 'start' }, g);
    t.textContent = p.name;
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPlace(p.id); } });
    g.addEventListener('pointerenter', () => hoverStep(p.id, true));
    g.addEventListener('pointerleave', () => hoverStep(p.id, false));
    pinEls[p.id] = g;
  });

  // ---------- View box, zoom and pan ----------
  let vb = { x: 0, y: 0, w: W, h: H }, anim = null;
  const rect = () => svg.getBoundingClientRect();
  function apply() {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const s = vb.w / (rect().width || 1);
    for (const id in pinEls) { const g = pinEls[id]; g.setAttribute('transform', `translate(${g._x},${g._y}) scale(${s})`); }
    $('#roads').setAttribute('stroke-width', 1.6 * s);
    $('#route').setAttribute('stroke-width', 3.4 * s);
    $('#flight').setAttribute('stroke-width', 1.4 * s);
    $('#flight').setAttribute('stroke-dasharray', `${5 * s} ${5 * s}`);
    svg.classList.toggle('zoomed', s < 0.95);
  }
  // Before layout settles the map can measure 0×0, so fall back to a portrait shape
  const aspect = () => { const r = rect(); return r.width > 1 && r.height > 1 ? r.width / r.height : 0.7; };
  function fit(x, y, w, h, focusY = 0.5) {
    const a = aspect();
    let nw = Math.max(w, h * a), nh = nw / a;
    const cxm = x + w / 2, cym = y + h / 2;
    return clamp({ x: cxm - nw / 2, y: cym - nh * focusY, w: nw, h: nh });
  }
  function clamp(v) {
    const a = v.w / v.h;
    let w = Math.min(Math.max(v.w, 90), W * 1.6), h = w / a;
    const x = Math.min(Math.max(v.x + (v.w - w) / 2, -w * 0.6), W - w * 0.4);
    const y = Math.min(Math.max(v.y + (v.h - h) / 2, -h * 0.6), H - h * 0.4);
    return { x, y, w, h };
  }
  function animateTo(target, ms = 650) {
    cancelAnimationFrame(anim);
    const from = { ...vb }, t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), k = ease(t);
      vb = { x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k, w: from.w + (target.w - from.w) * k, h: from.h + (target.h - from.h) * k };
      apply();
      if (t < 1) anim = requestAnimationFrame(step);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { vb = target; apply(); return; }
    anim = requestAnimationFrame(step);
  }
  // Leave room for the bottom sheet on phones, so the focus sits in the visible part of the map
  const focusY = () => isPhone() && panel.classList.contains('open') ? 0.2 : (isPhone() ? 0.42 : 0.5);
  const VIEWS = {
    all: () => fit(-10, -10, W + 20, H + 20, isPhone() ? 0.45 : 0.5),
    south: () => fit(X(166.4), Y(-40.5), X(174.4) - X(166.4), Y(-46.8) - Y(-40.5), focusY()),
    auckland: () => fit(X(174.0), Y(-35.0), X(176.6) - X(174.0), Y(-39.5) - Y(-35.0), focusY()),
  };
  function zoomAt(cxp, cyp, f) {
    const r = rect(), s = vb.w / r.width;
    const mx = vb.x + (cxp - r.left) * s, my = vb.y + (cyp - r.top) * s;
    const w = vb.w * f, h = vb.h * f;
    const nv = clamp({ x: mx - (cxp - r.left) * (w / r.width), y: my - (cyp - r.top) * (h / r.height), w, h });
    return nv;
  }
  function zoomCenter(f) { const r = rect(); animateTo(zoomAt(r.left + r.width / 2, r.top + r.height * focusY(), f), 300); }
  $('#zin').onclick = () => zoomCenter(0.6);
  $('#zout').onclick = () => zoomCenter(1 / 0.6);
  document.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => animateTo(VIEWS[b.dataset.zoom]()));

  let hintTimer;
  svg.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) {
      $('#hint').classList.add('show'); clearTimeout(hintTimer);
      hintTimer = setTimeout(() => $('#hint').classList.remove('show'), 1400);
      return;
    }
    e.preventDefault(); cancelAnimationFrame(anim);
    vb = zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.01)); apply();
  }, { passive: false });

  const ptrs = new Map(); let gest = null, moved = false, downPin = null;
  const mid = pts => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
  const spread = pts => pts.length < 2 ? 0 : Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
  const begin = () => { const pts = [...ptrs.values()]; gest = { vb: { ...vb }, m: mid(pts), d: spread(pts) }; };
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    cancelAnimationFrame(anim);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) { moved = false; downPin = e.target.closest('.pin'); }
    begin();
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const pts = [...ptrs.values()], m = mid(pts), r = rect();
    if (!moved && (pts.length > 1 || Math.hypot(m[0] - gest.m[0], m[1] - gest.m[1]) > 6)) { moved = true; svg.classList.add('dragging'); }
    if (!moved) return;
    let w = gest.vb.w;
    if (pts.length > 1 && gest.d > 0) w = gest.vb.w * gest.d / spread(pts);
    const h = w * gest.vb.h / gest.vb.w, s0 = gest.vb.w / r.width, s1 = w / r.width;
    const mx = gest.vb.x + (gest.m[0] - r.left) * s0, my = gest.vb.y + (gest.m[1] - r.top) * s0;
    vb = clamp({ x: mx - (m[0] - r.left) * s1, y: my - (m[1] - r.top) * s1, w, h });
    apply();
  });
  const end = e => {
    if (!ptrs.delete(e.pointerId)) return;
    if (ptrs.size === 0) {
      svg.classList.remove('dragging');
      if (!moved && downPin && e.type === 'pointerup') openPlace(downPin.dataset.id);
      downPin = null;
    } else begin();
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  new ResizeObserver(() => { if (!rect().width) return; const c = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }; const a = aspect(); const w = vb.w, h = w / a; vb = clamp({ x: c.x - w / 2, y: c.y - h / 2, w, h }); apply(); }).observe(wrap);

  // ---------- State ----------
  let loopId = 'big', placeId = null, tab = 'route';
  try { loopId = localStorage.getItem('nz-loop') || 'big'; } catch (e) {}
  if (!LOOPS.find(l => l.id === loopId)) loopId = 'big';
  const loop = () => LOOPS.find(l => l.id === loopId);
  const loopStops = () => [...new Set(loop().items.filter(i => i.stop).map(i => i.stop))];

  function drawRoute() {
    const g = $('#route'); g.innerHTML = '';
    loop().items.forEach(it => {
      if (it.drive) el('path', { d: line(it.drive.map(n => NODES[n])), pathLength: 1, class: it.side ? 'side' : '' }, g);
    });
    drawFlight(loop().flyTo || 'christchurch');
    const on = new Set([...loopStops(), 'auckland']);
    for (const id in pinEls) pinEls[id].classList.toggle('off', !on.has(id));
  }

  function zoomToLoop() {
    const pts = loop().items.flatMap(it => it.drive ? it.drive.map(n => P(NODES[n])) : []);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 40;
    // Don't zoom in past the point where the simplified coastline starts to look blocky
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const w = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, 300), h = Math.max(Math.max(...ys) - Math.min(...ys) + pad * 2, 300);
    animateTo(fit(cx - w / 2, cy - h / 2, w, h, focusY()));
  }

  function hoverStep(id, on) {
    pinEls[id] && pinEls[id].classList.toggle('hot', on);
    body.querySelectorAll(`[data-id="${id}"]`).forEach(b => b.classList.toggle('hover', on));
  }

  const ICON_CAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M6 17v2M18 17v2M3 13l2-6h14l2 6v4H3z"/><circle cx="7.5" cy="13.5" r=".8"/><circle cx="16.5" cy="13.5" r=".8"/></svg>';
  const ICON_PLANE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14L3 11l1-2 8 1 5-6c1-1 3-1 3 0s0 2-1 3l-6 5 1 8-2 1-3-7"/></svg>';

  function stopButton(id, nights, note, extraClass = '') {
    const p = byId[id], wed = p.kind === 'wedding';
    const picks = p.things.filter(t => t.pick).length;
    return `<button class="stop-btn ${wed ? 'wed' : ''} ${extraClass}" data-id="${id}">
      <span class="nm">${esc(p.name)}</span><span class="nt">${esc(nights || '')}</span>
      ${note ? `<span class="note ${wed ? 'wed' : ''}">${esc(note)}</span>` : ''}
      ${picks && !note ? `<span class="note">${picks} of Stefan's pick${picks > 1 ? 's' : ''}</span>` : ''}
    </button>`;
  }

  function renderRoute() {
    const l = loop();
    let html = `<p class="intro">Tap any place on the map, or on the list below, to see what's worth doing there.
      No photos, on purpose: <b>we'd rather you see it for the first time in person.</b></p>
      <p class="intro">And eat pies. Every small-town bakery in NZ has a warmer full of them, and they're a road-trip essential.
      Stefan's favourites are in <button class="link" data-id="mapua">Wakefield</button> and <button class="link" data-id="fairlie">Fairlie</button>.</p>
      <div class="seg" role="group" aria-label="Choose a loop">${LOOPS.map(x => `<button data-loop="${x.id}" aria-pressed="${x.id === loopId}">${esc(x.name)}</button>`).join('')}</div>
      <p class="loopsum"><em>${esc(l.length)}</em>${esc(l.summary)}</p>
      <ol class="steps">
        <li>${stopButton('auckland', '2–3 days', 'Start here and get over the jet lag')}</li>
        <li class="leg fly">${ICON_PLANE} ${esc(l.fly || 'Fly to Christchurch, about 1 hr 20 min')}</li>`;
    l.items.forEach(it => {
      if (it.stop) html += `<li class="${it.side ? 'side-stop' : ''}">${stopButton(it.stop, it.nights, it.note)}</li>`;
      else html += `<li class="leg">${ICON_CAR} ${it.side ? 'Out and back, ' : ''}${esc(it.t)}${it.via ? ` via <button class="via" data-id="${it.via}">${esc(byId[it.via].name)}</button>` : ''}</li>`;
    });
    html += `</ol>
      <h3 class="sub">Got extra days?</h3>
      <p class="small">Detours that aren't on this loop.</p>
      <div class="chips">${PLACES.filter(p => !loopStops().includes(p.id) && p.id !== 'auckland' && p.kind !== 'drive')
        .concat(PLACES.filter(p => p.kind === 'drive' && !loop().items.some(i => i.via === p.id)))
        .map(p => `<button data-id="${p.id}">${esc(p.name)}${p.island === 'north' ? ' <span class="tt">(North Island)</span>' : ''}</button>`).join('')}</div>`;
    body.innerHTML = html;
    body.querySelectorAll('[data-loop]').forEach(b => b.onclick = () => {
      loopId = b.dataset.loop; try { localStorage.setItem('nz-loop', loopId); } catch (e) {}
      drawRoute(); renderRoute(); zoomToLoop();
    });
    wireIds();
    $('#handleTitle').textContent = l.name;
  }

  function wireIds() {
    body.querySelectorAll('button[data-id]').forEach(b => {
      b.onclick = () => openPlace(b.dataset.id);
      b.onmouseenter = () => pinEls[b.dataset.id].classList.add('hot');
      b.onmouseleave = () => pinEls[b.dataset.id].classList.remove('hot');
    });
  }

  let picksOnly = false;
  function renderPlace(id) {
    const p = byId[id];
    const stops = loopStops(), i = stops.indexOf(id);
    const prev = i > 0 ? stops[i - 1] : null, next = i >= 0 && i < stops.length - 1 ? stops[i + 1] : (id === 'auckland' ? stops[0] : null);
    const island = p.island === 'north' ? 'North Island' : 'South Island';
    const hasPicks = p.things.some(t => t.pick);
    const things = p.things.filter(t => !picksOnly || t.pick);
    body.innerHTML = `<div class="place">
      <button class="back" id="back">← All stops</button>
      <p class="eyebrow">${island}${i < 0 && id !== 'auckland' ? ' · Detour' : ''}</p>
      <h2>${esc(p.name)}</h2>${p.maori ? `<p class="maori">${esc(p.maori)}</p>` : ''}
      <p class="blurb">${esc(p.blurb)}</p>
      <dl class="meta"><div><dt>How long</dt><dd>${esc(p.stay)}</dd></div><div><dt>Getting there</dt><dd>${esc(p.getting)}
        <a class="maplink" href="${mapUrl(p.name)}" target="_blank" rel="noopener">Open in Google Maps ↗</a></dd></div></dl>
      ${p.tip ? `<p class="note-box">${esc(p.tip)}</p>` : ''}
      <h3 class="sub" style="margin-top:4px">Things to do</h3>
      ${hasPicks ? `<label class="filter"><input type="checkbox" id="picks" ${picksOnly ? 'checked' : ''}> Only show Stefan's picks</label>` : ''}
      <div class="things">${things.map(t => `
        <details class="thing">
          <summary><span class="tn">${esc(t.n)}</span>
            ${t.pick ? '<span class="badge pick">★ Stefan\'s pick</span>' : ''}
            ${t.food ? '<span class="badge food">Great food</span>' : ''}
            ${t.book ? '<span class="badge book">Book ahead</span>' : ''}
            ${t.wx ? '<span class="badge wx">Weather-dependent</span>' : ''}
            <span class="tt">${esc(t.t || '')}</span></summary>
          <div class="td"><p>${esc(t.d)}</p>${t.tip ? `<p class="tip">${esc(t.tip)}</p>` : ''}
            ${t.url || !t.nomap ? `<p class="links">${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">Website ↗</a>` : ''}${t.nomap ? '' : `<a href="${mapUrl(t.q || t.n + ', ' + p.name)}" target="_blank" rel="noopener">Map ↗</a>`}</p>` : ''}</div>
        </details>`).join('')}</div>
      ${prev || next ? `<nav class="pn">
        ${prev ? `<button data-id="${prev}"><small>← Previous</small><span>${esc(byId[prev].name)}</span></button>` : '<span></span>'}
        ${next ? `<button data-id="${next}"><small>Next →</small><span>${esc(byId[next].name)}</span></button>` : '<span></span>'}
      </nav>` : ''}
    </div>`;
    $('#back').onclick = closePlace;
    const pc = $('#picks'); if (pc) pc.onchange = () => { picksOnly = pc.checked; renderPlace(id); };
    wireIds();
    body.scrollTop = 0;
    $('#handleTitle').textContent = p.name;
  }

  function renderTips() {
    body.innerHTML = TIPS.map(t => `<section class="tip-card"><h3>${esc(t.h)}</h3>${t.p.map(x => `<p>${x}</p>`).join('')}</section>`).join('')
      + `<p class="signoff">See you in Māpua!</p>`;
    $('#handleTitle').textContent = 'Good to know';
  }

  function setTab(t) {
    tab = t;
    $('#tab-route').setAttribute('aria-selected', t === 'route');
    $('#tab-tips').setAttribute('aria-selected', t === 'tips');
    if (t === 'tips') renderTips(); else if (placeId) renderPlace(placeId); else renderRoute();
    body.scrollTop = 0;
  }
  $('#tab-route').onclick = () => { if (tab === 'route' && placeId) closePlace(); else setTab('route'); };
  $('#tab-tips').onclick = () => { setTab('tips'); openSheet(true); };

  function openSheet(on) { panel.classList.toggle('open', on); $('#handle').setAttribute('aria-expanded', on); }
  $('#handle').onclick = () => openSheet(!panel.classList.contains('open'));

  function openPlace(id, { fromHash = false } = {}) {
    if (!byId[id]) return;
    placeId = id;
    for (const k in pinEls) pinEls[k].classList.toggle('sel', k === id);
    tab = 'route';
    $('#tab-route').setAttribute('aria-selected', true); $('#tab-tips').setAttribute('aria-selected', false);
    renderPlace(id);
    openSheet(true);
    const [x, y] = P(byId[id].at), r = byId[id].island === 'north' && id !== 'auckland' ? 170 : 130;
    animateTo(fit(x - r, y - r, r * 2, r * 2, focusY()));
    if (!fromHash) history.replaceState(null, '', '#' + id);
  }
  function closePlace() {
    placeId = null;
    for (const k in pinEls) pinEls[k].classList.remove('sel');
    renderRoute();
    history.replaceState(null, '', location.pathname + location.search);
    animateTo(VIEWS.south());
  }
  addEventListener('hashchange', () => { const id = location.hash.slice(1); if (byId[id]) openPlace(id, { fromHash: true }); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && placeId) closePlace(); });

  // ---------- Start ----------
  drawRoute();
  vb = VIEWS.all(); apply();
  const start = location.hash.slice(1);
  if (byId[start]) openPlace(start, { fromHash: true });
  else { renderRoute(); setTimeout(() => animateTo(VIEWS.south(), 1100), 500); }

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
