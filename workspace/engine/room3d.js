'use strict';
/**
 * CoreSystem Workspace — Room 3D Engine
 *
 * Turns the 2D floor-plan elements (State) into a clean, solid 3D room:
 * every element rectangle becomes four extruded perimeter walls sitting on a
 * floor slab. Rendered with a tiny self-contained software renderer on a 2D
 * canvas — no external 3D library (the project ships zero dependencies).
 *
 * Design choices that keep the result looking solid (unlike a torn
 * photogrammetry mesh): geometry is watertight boxes, every quad is shaded
 * two-sided (normal is flipped toward the camera so no face is ever a hole),
 * and faces are painter-sorted back-to-front by camera depth.
 *
 * Controls (mouse + touch):
 *   • drag / one finger      → orbit
 *   • wheel / pinch          → zoom
 *   • right-drag / two finger → pan
 */
const Room3D = (() => {

  // ── DOM ──────────────────────────────────────────────────────────────────
  let _canvas = null, _ctx = null, _measureEl = null;
  let _open = false, _dirty = false, _raf = 0;

  // ── Scene settings ─────────────────────────────────────────────────────────
  let _pxPerM   = 100;    // world-px per metre (measurement scale)
  let _heightM  = 2.7;    // wall height in metres
  let _showFloor = true;
  const WALL_T  = 8;      // wall thickness in world-px
  const FOV     = 55 * Math.PI / 180;

  // ── Camera (orbit) ──────────────────────────────────────────────────────────
  let _cam = { theta: -0.7, phi: 0.62, radius: 1400, center: { x: 0, y: 0, z: 0 } };

  // ── Geometry cache ──────────────────────────────────────────────────────────
  let _quads = [];        // [{ v:[[x,y,z]x4], color:[r,g,b], n:[x,y,z] }]

  // ── Light ────────────────────────────────────────────────────────────────────
  const LIGHT = _norm([-0.4, 0.85, 0.35]);

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init(modalEl) {
    if (!modalEl) return;
    _canvas    = modalEl.querySelector('#r3d-canvas');
    _measureEl = modalEl.querySelector('#r3d-measure');
    if (!_canvas) return;
    _ctx = _canvas.getContext('2d');

    _bindControls(modalEl);
    _bindPointer();
    window.addEventListener('resize', () => { if (_open) { _resize(); _invalidate(); } });
  }

  function _bindControls(modalEl) {
    const scale  = modalEl.querySelector('#r3d-scale');
    const height = modalEl.querySelector('#r3d-height');
    const floor  = modalEl.querySelector('#r3d-floor');
    const reset  = modalEl.querySelector('#r3d-reset');

    scale?.addEventListener('input', () => {
      _pxPerM = Math.max(1, parseFloat(scale.value) || 100);
      _rebuild(); _renderMeasures(); _invalidate();
    });
    height?.addEventListener('input', () => {
      _heightM = Math.max(0.1, parseFloat(height.value) || 2.7);
      _rebuild(); _renderMeasures(); _invalidate();
    });
    floor?.addEventListener('change', () => {
      _showFloor = floor.checked; _rebuild(); _invalidate();
    });
    reset?.addEventListener('click', () => { _resetView(); _invalidate(); });
  }

  // ── Public: open / close ─────────────────────────────────────────────────────
  function open() {
    _open = true;
    _rebuild();
    _resetView();
    _resize();
    _renderMeasures();
    _invalidate();
  }
  function close() {
    _open = false;
    if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
  }

  // ── Build geometry from the 2D layout ──────────────────────────────────────
  function _rebuild() {
    _quads = [];
    const els = (State.getAllEls?.() || []).filter(e => !e.hidden);
    const H = _heightM * _pxPerM;

    if (!els.length) { _cam.center = { x: 0, y: 0, z: 0 }; return; }

    // Bounding box (for floor + camera framing)
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    els.forEach(e => {
      minX = Math.min(minX, e.x);        minZ = Math.min(minZ, e.y);
      maxX = Math.max(maxX, e.x + e.width); maxZ = Math.max(maxZ, e.y + e.height);
    });

    // Floor slab (a little beyond the bounds, sitting just below the walls)
    if (_showFloor) {
      const pad = 40;
      _addQuad(
        [ [minX - pad, -1, minZ - pad], [maxX + pad, -1, minZ - pad],
          [maxX + pad, -1, maxZ + pad], [minX - pad, -1, maxZ + pad] ],
        [176, 190, 205]
      );
    }

    // Each element → 4 perimeter wall boxes, tinted by its stroke colour
    els.forEach(e => {
      const c = _tint(e.stroke || e.fill || '#C79B78');
      const x0 = e.x, z0 = e.y, x1 = e.x + e.width, z1 = e.y + e.height;
      const t = WALL_T / 2;
      _addBox(x0 - t, z0 - t, x1 + t, z0 + t, H, c); // north
      _addBox(x0 - t, z1 - t, x1 + t, z1 + t, H, c); // south
      _addBox(x0 - t, z0 - t, x0 + t, z1 + t, H, c); // west
      _addBox(x1 - t, z0 - t, x1 + t, z1 + t, H, c); // east
    });

    _cam.center = { x: (minX + maxX) / 2, y: H * 0.4, z: (minZ + maxZ) / 2 };
    _frameRadius = Math.max(maxX - minX, maxZ - minZ, H) * 1.6 + 400;
  }

  let _frameRadius = 1400;

  // Add an extruded box (min/max in X and Z, from y=0 to y=h). 5 visible faces.
  function _addBox(xa, za, xb, zb, h, col) {
    const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    const top = _shade(col, 1.12), side = col;
    // top
    _addQuad([[x0,h,z0],[x1,h,z0],[x1,h,z1],[x0,h,z1]], top);
    // four sides
    _addQuad([[x0,0,z0],[x1,0,z0],[x1,h,z0],[x0,h,z0]], side); // -Z
    _addQuad([[x1,0,z1],[x0,0,z1],[x0,h,z1],[x1,h,z1]], side); // +Z
    _addQuad([[x0,0,z1],[x0,0,z0],[x0,h,z0],[x0,h,z1]], side); // -X
    _addQuad([[x1,0,z0],[x1,0,z1],[x1,h,z1],[x1,h,z0]], side); // +X
  }

  function _addQuad(v, color) {
    const n = _faceNormal(v);
    _quads.push({ v, color, n });
  }

  // ── Camera framing ──────────────────────────────────────────────────────────
  function _resetView() {
    _cam.theta  = -0.7;
    _cam.phi    = 0.62;
    _cam.radius = _frameRadius;
  }

  // ── Resize canvas to its stage (device-pixel crisp) ─────────────────────────
  function _resize() {
    if (!_canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = _canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    _canvas.width  = w * dpr;
    _canvas.height = h * dpr;
    _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    _cssW = w; _cssH = h;
  }
  let _cssW = 1, _cssH = 1;

  // ── Redraw scheduling ─────────────────────────────────────────────────────
  function _invalidate() {
    if (!_open || _dirty) return;
    _dirty = true;
    _raf = requestAnimationFrame(() => { _dirty = false; _render(); });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function _render() {
    if (!_ctx || !_open) return;
    const W = _cssW, H = _cssH;
    // Background gradient
    const g = _ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141a22'); g.addColorStop(1, '#0b0f14');
    _ctx.fillStyle = g; _ctx.fillRect(0, 0, W, H);

    const eye = _eye();
    const basis = _basis(eye, _cam.center);
    const fpx = (H / 2) / Math.tan(FOV / 2);
    const cx = W / 2, cy = H / 2;
    const near = 1;

    // Project + collect drawable faces
    const draw = [];
    for (const q of _quads) {
      const cam = [], scr = [];
      let zsum = 0, ok = true;
      for (const p of q.v) {
        const rel = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
        const camPt = [ _dot(rel, basis.x), _dot(rel, basis.y), _dot(rel, basis.z) ];
        if (-camPt[2] < near) { ok = false; break; } // behind near plane
        cam.push(camPt); zsum += camPt[2];
        scr.push([ cx + (camPt[0] / -camPt[2]) * fpx, cy - (camPt[1] / -camPt[2]) * fpx ]);
      }
      if (!ok) continue;

      // Two-sided lighting: orient the normal toward the camera so no face
      // ever renders dark/invisible (this is what avoids "holes").
      const centroid = [ (q.v[0][0]+q.v[1][0]+q.v[2][0]+q.v[3][0])/4,
                         (q.v[0][1]+q.v[1][1]+q.v[2][1]+q.v[3][1])/4,
                         (q.v[0][2]+q.v[1][2]+q.v[2][2]+q.v[3][2])/4 ];
      const toEye = _norm([eye[0]-centroid[0], eye[1]-centroid[1], eye[2]-centroid[2]]);
      let n = q.n;
      if (_dot(n, toEye) < 0) n = [-n[0], -n[1], -n[2]];
      const lit = 0.42 + 0.58 * Math.max(0, _dot(n, LIGHT));

      draw.push({ scr, z: zsum / 4, color: q.color, lit });
    }

    // Painter's algorithm: farthest (most negative z) first
    draw.sort((a, b) => a.z - b.z);

    for (const f of draw) {
      const [r, g2, b] = f.color;
      _ctx.beginPath();
      _ctx.moveTo(f.scr[0][0], f.scr[0][1]);
      for (let i = 1; i < f.scr.length; i++) _ctx.lineTo(f.scr[i][0], f.scr[i][1]);
      _ctx.closePath();
      _ctx.fillStyle = `rgb(${r*f.lit|0},${g2*f.lit|0},${b*f.lit|0})`;
      _ctx.fill();
      _ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      _ctx.lineWidth = 1;
      _ctx.stroke();
    }

    if (!_quads.length) {
      _ctx.fillStyle = '#7d8590';
      _ctx.font = '14px -apple-system, sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText('No elements to show — draw a floor plan first.', W / 2, H / 2);
    }
  }

  // ── Camera helpers ─────────────────────────────────────────────────────────
  function _eye() {
    const { theta, phi, radius, center } = _cam;
    return [
      center.x + radius * Math.cos(phi) * Math.sin(theta),
      center.y + radius * Math.sin(phi),
      center.z + radius * Math.cos(phi) * Math.cos(theta),
    ];
  }
  function _basis(eye, c) {
    const z = _norm([eye[0]-c.x, eye[1]-c.y, eye[2]-c.z]); // camera back
    const x = _norm(_cross([0, 1, 0], z));
    const y = _cross(z, x);
    return { x, y, z };
  }

  // ── Pointer / touch controls ─────────────────────────────────────────────
  function _bindPointer() {
    if (!_canvas) return;
    let mode = null, lastX = 0, lastY = 0, pinchDist = 0, pinchMid = null;

    // Mouse
    _canvas.addEventListener('mousedown', e => {
      mode = (e.button === 2 || e.shiftKey) ? 'pan' : 'orbit';
      lastX = e.clientX; lastY = e.clientY; e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!mode || !_open) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      mode === 'pan' ? _pan(dx, dy) : _orbit(dx, dy);
    });
    window.addEventListener('mouseup', () => { mode = null; });
    _canvas.addEventListener('contextmenu', e => e.preventDefault());
    _canvas.addEventListener('wheel', e => {
      e.preventDefault();
      _zoom(e.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });

    // Touch
    _canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        mode = 'orbit'; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        mode = 'pinch';
        pinchDist = _touchDist(e.touches[0], e.touches[1]);
        pinchMid  = _touchMid(e.touches[0], e.touches[1]);
      }
      e.preventDefault();
    }, { passive: false });
    _canvas.addEventListener('touchmove', e => {
      if (!_open) return;
      e.preventDefault();
      if (mode === 'orbit' && e.touches.length === 1) {
        const t = e.touches[0];
        _orbit(t.clientX - lastX, t.clientY - lastY);
        lastX = t.clientX; lastY = t.clientY;
      } else if (mode === 'pinch' && e.touches.length === 2) {
        const d = _touchDist(e.touches[0], e.touches[1]);
        const mid = _touchMid(e.touches[0], e.touches[1]);
        if (pinchDist > 0) _zoom(pinchDist / d);
        _pan(mid.x - pinchMid.x, mid.y - pinchMid.y);
        pinchDist = d; pinchMid = mid;
      }
    }, { passive: false });
    const end = e => { if (!e.touches || e.touches.length === 0) mode = null;
                       else if (e.touches.length === 1) {
                         mode = 'orbit'; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
                       } };
    _canvas.addEventListener('touchend', end);
    _canvas.addEventListener('touchcancel', end);
  }

  function _orbit(dx, dy) {
    _cam.theta -= dx * 0.008;
    _cam.phi = Math.max(-1.45, Math.min(1.45, _cam.phi + dy * 0.008));
    _invalidate();
  }
  function _zoom(f) {
    _cam.radius = Math.max(120, Math.min(20000, _cam.radius * f));
    _invalidate();
  }
  function _pan(dx, dy) {
    // Move the orbit centre in the camera's screen plane
    const eye = _eye(), basis = _basis(eye, _cam.center);
    const k = _cam.radius * 0.0016;
    _cam.center.x += (-dx * basis.x[0] + dy * basis.y[0]) * k;
    _cam.center.y += (-dx * basis.x[1] + dy * basis.y[1]) * k;
    _cam.center.z += (-dx * basis.x[2] + dy * basis.y[2]) * k;
    _invalidate();
  }

  // ── Measurement panel ──────────────────────────────────────────────────────
  function _renderMeasures() {
    if (!_measureEl) return;
    const els = (State.getAllEls?.() || []).filter(e => !e.hidden);
    if (!els.length) { _measureEl.innerHTML = '<p class="r3d-empty">No rooms yet.</p>'; return; }

    let totalArea = 0;
    const rows = els.map(e => {
      const w = e.width / _pxPerM, d = e.height / _pxPerM, a = w * d;
      totalArea += a;
      return `<tr><td>${_esc(e.name || e.type || 'Room')}</td>
              <td>${w.toFixed(2)}×${d.toFixed(2)}</td>
              <td>${a.toFixed(2)}</td></tr>`;
    }).join('');

    _measureEl.innerHTML = `
<div class="r3d-summary">
  <div><span>${els.length}</span><label>rooms</label></div>
  <div><span>${totalArea.toFixed(1)}</span><label>m² total</label></div>
  <div><span>${_heightM.toFixed(1)}</span><label>m height</label></div>
</div>
<table class="r3d-table">
  <thead><tr><th>Room</th><th>W×D (m)</th><th>Area</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
  }

  // ── Small math + colour helpers ────────────────────────────────────────────
  function _dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function _cross(a, b) {
    return [ a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0] ];
  }
  function _norm(a) {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0]/l, a[1]/l, a[2]/l];
  }
  function _faceNormal(v) {
    const a = [v[1][0]-v[0][0], v[1][1]-v[0][1], v[1][2]-v[0][2]];
    const b = [v[2][0]-v[0][0], v[2][1]-v[0][1], v[2][2]-v[0][2]];
    return _norm(_cross(a, b));
  }
  function _touchDist(a, b) { return Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY); }
  function _touchMid(a, b) { return { x: (a.clientX+b.clientX)/2, y: (a.clientY+b.clientY)/2 }; }

  function _tint(hex) {
    const c = _hexRgb(hex);
    // Blend toward a warm plaster tone so rooms read as architecture
    const base = [199, 155, 120];
    return [ (c[0]*0.35 + base[0]*0.65)|0,
             (c[1]*0.35 + base[1]*0.65)|0,
             (c[2]*0.35 + base[2]*0.65)|0 ];
  }
  function _shade(c, f) {
    return [ Math.min(255, c[0]*f)|0, Math.min(255, c[1]*f)|0, Math.min(255, c[2]*f)|0 ];
  }
  function _hexRgb(hex) {
    if (typeof hex !== 'string') return [199, 155, 120];
    let h = hex.trim();
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
    if (h.length < 6) return [199, 155, 120];
    return [ parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16) ];
  }
  function _esc(s) {
    return String(s).replace(/[&<>"]/g, ch =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
  }

  return { init, open, close };
})();
