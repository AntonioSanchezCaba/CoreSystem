'use strict';
/**
 * CoreSystem Workspace — Snapping Engine
 * Grid snap, element-edge snap, center-line snap, equal-spacing detection.
 * Returns corrected position + guide descriptors for rendering.
 */
const SnapEng = (() => {
  const THRESHOLD = 7; // px in world coords (before zoom)

  // ── Grid snap ─────────────────────────────────────────────────────────────
  function toGrid(v, gs = State.gridSize) {
    return Math.round(v / gs) * gs;
  }

  function snapRect(x, y, w, h) {
    return { x: toGrid(x), y: toGrid(y), width: w, height: h };
  }

  // ── Element edge / center snap ─────────────────────────────────────────────
  /**
   * @param {Object} moving   { x, y, width, height } — candidate world rect
   * @param {Set}    skipIds  IDs to ignore
   * @returns {{ x, y, guides[] }}
   */
  function snapToElements(moving, skipIds = new Set()) {
    const thr = THRESHOLD / State.zoom; // threshold in world px
    let bestX = null, dX = thr + 1;
    let bestY = null, dY = thr + 1;
    const guides = [];

    const mL  = moving.x,  mR  = moving.x + moving.width;
    const mCX = moving.x + moving.width  / 2;
    const mT  = moving.y,  mB  = moving.y + moving.height;
    const mCY = moving.y + moving.height / 2;

    State.getAllEls().forEach(t => {
      if (skipIds.has(t.id) || t.hidden) return;
      const tL = t.x, tR = t.x + t.width, tCX = t.x + t.width  / 2;
      const tT = t.y, tB = t.y + t.height, tCY = t.y + t.height / 2;

      // ── X ──────────────────────────────────────────────────────────────
      const xCandidates = [
        { d: Math.abs(mL  - tL),  snap: tL,              pos: tL,  label:'left→left'   },
        { d: Math.abs(mL  - tR),  snap: tR,              pos: tR,  label:'left→right'  },
        { d: Math.abs(mR  - tR),  snap: tR - moving.width, pos: tR,label:'right→right' },
        { d: Math.abs(mR  - tL),  snap: tL - moving.width, pos: tL,label:'right→left'  },
        { d: Math.abs(mCX - tCX), snap: tCX - moving.width/2, pos: tCX, label:'centerX'   },
      ];
      xCandidates.forEach(c => {
        if (c.d < dX) { dX = c.d; bestX = { snap: c.snap, guide: { axis:'x', pos: c.pos } }; }
      });

      // ── Y ──────────────────────────────────────────────────────────────
      const yCandidates = [
        { d: Math.abs(mT  - tT),  snap: tT,               pos: tT,  label:'top→top'    },
        { d: Math.abs(mT  - tB),  snap: tB,               pos: tB,  label:'top→bottom' },
        { d: Math.abs(mB  - tB),  snap: tB - moving.height, pos: tB,label:'bot→bot'    },
        { d: Math.abs(mB  - tT),  snap: tT - moving.height, pos: tT,label:'bot→top'    },
        { d: Math.abs(mCY - tCY), snap: tCY - moving.height/2, pos: tCY, label:'centerY'},
      ];
      yCandidates.forEach(c => {
        if (c.d < dY) { dY = c.d; bestY = { snap: c.snap, guide: { axis:'y', pos: c.pos } }; }
      });
    });

    const x = bestX ? bestX.snap : moving.x;
    const y = bestY ? bestY.snap : moving.y;
    if (bestX) guides.push(bestX.guide);
    if (bestY) guides.push(bestY.guide);
    return { x, y, guides };
  }

  // ── Equal spacing detection ────────────────────────────────────────────────
  function detectSpacing(moving, skipIds = new Set()) {
    const guides = [];
    const others = State.getAllEls().filter(e => !skipIds.has(e.id) && !e.hidden);
    const thr = THRESHOLD * 2 / State.zoom;

    // Horizontal neighbours
    const left  = others.filter(t => t.x + t.width  <= moving.x).sort((a,b) => b.x+b.width - a.x-a.width);
    const right = others.filter(t => t.x >= moving.x + moving.width).sort((a,b) => a.x - b.x);
    if (left.length && right.length) {
      const gL = moving.x - (left[0].x + left[0].width);
      const gR = right[0].x - (moving.x + moving.width);
      if (Math.abs(gL - gR) < thr) {
        const midY = moving.y + moving.height / 2;
        guides.push({ type:'spacing', axis:'x', x1: left[0].x+left[0].width, x2: moving.x, y: midY });
        guides.push({ type:'spacing', axis:'x', x1: moving.x+moving.width, x2: right[0].x, y: midY });
      }
    }

    // Vertical neighbours
    const above = others.filter(t => t.y + t.height <= moving.y).sort((a,b) => b.y+b.height - a.y-a.height);
    const below = others.filter(t => t.y >= moving.y + moving.height).sort((a,b) => a.y - b.y);
    if (above.length && below.length) {
      const gA = moving.y - (above[0].y + above[0].height);
      const gB = below[0].y - (moving.y + moving.height);
      if (Math.abs(gA - gB) < thr) {
        const midX = moving.x + moving.width / 2;
        guides.push({ type:'spacing', axis:'y', y1: above[0].y+above[0].height, y2: moving.y, x: midX });
        guides.push({ type:'spacing', axis:'y', y1: moving.y+moving.height, y2: below[0].y, x: midX });
      }
    }

    return guides;
  }

  // ── Master snap ────────────────────────────────────────────────────────────
  /**
   * @returns {{ x, y, guides[] }}
   */
  function snap(moving, skipIds = new Set()) {
    if (!State.snapEnabled) return { x: moving.x, y: moving.y, guides: [] };

    // 1. Element snapping (highest priority)
    const elResult = snapToElements(moving, skipIds);
    const snapped  = { ...moving, x: elResult.x, y: elResult.y };
    const guides   = [...elResult.guides];

    // 2. Spacing hints (no position change)
    guides.push(...detectSpacing(snapped, skipIds));

    // 3. Grid snap only when no element snap fired
    const hasElSnap = guides.some(g => !g.type);
    if (!hasElSnap && State.snapEnabled) {
      snapped.x = toGrid(snapped.x);
      snapped.y = toGrid(snapped.y);
    }

    return { x: snapped.x, y: snapped.y, guides };
  }

  return { snap, snapRect, toGrid, detectSpacing, THRESHOLD };
})();
