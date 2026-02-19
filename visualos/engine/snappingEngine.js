/**
 * Visual Layout OS — Snapping Engine
 * Provides magnetic snap-to-grid, snap-to-element-edges, snap-to-centers,
 * and equal-spacing detection. Returns corrected positions and visual guide data.
 */
const SnappingEngine = (() => {
  'use strict';

  const SNAP_THRESHOLD = 6;   // px distance to trigger snap
  const GRID_SIZE      = 8;   // default grid cell size

  // ── Grid Snap ─────────────────────────────────────────────────────────────
  function snapToGrid(value, gridSize = GRID_SIZE) {
    return Math.round(value / gridSize) * gridSize;
  }

  function snapRectToGrid(x, y, w, h, gridSize = GRID_SIZE) {
    return {
      x: snapToGrid(x, gridSize),
      y: snapToGrid(y, gridSize),
      width:  w,
      height: h
    };
  }

  // ── Element Edge / Center Snap ─────────────────────────────────────────────
  /**
   * Snaps a moving rect against all other elements (absolute rects).
   * @param {Object} moving  { x, y, width, height } — candidate position
   * @param {Array}  targets Array of { x, y, width, height, id }
   * @param {Set}    excludeIds IDs to skip (the element being moved)
   * @returns {{ x, y, guides: Array<{type,pos,axis}> }}
   */
  function snapToElements(moving, targets, excludeIds = new Set()) {
    let bestX = null, bestXDelta = SNAP_THRESHOLD + 1;
    let bestY = null, bestYDelta = SNAP_THRESHOLD + 1;
    const guides = [];

    const mLeft   = moving.x;
    const mRight  = moving.x + moving.width;
    const mCenterX = moving.x + moving.width / 2;
    const mTop    = moving.y;
    const mBottom = moving.y + moving.height;
    const mCenterY = moving.y + moving.height / 2;

    for (const t of targets) {
      if (excludeIds.has(t.id)) continue;

      const tLeft   = t.x;
      const tRight  = t.x + t.width;
      const tCenterX = t.x + t.width / 2;
      const tTop    = t.y;
      const tBottom = t.y + t.height;
      const tCenterY = t.y + t.height / 2;

      // ── X-axis snaps ──────────────────────────────────────────────────────
      // left→left
      let d = Math.abs(mLeft - tLeft);
      if (d < bestXDelta) { bestXDelta = d; bestX = { snap: tLeft, offset: 0, guide: { type:'edge', axis:'x', pos: tLeft } }; }
      // right→right
      d = Math.abs(mRight - tRight);
      if (d < bestXDelta) { bestXDelta = d; bestX = { snap: tRight - moving.width, offset: moving.width, guide: { type:'edge', axis:'x', pos: tRight } }; }
      // left→right
      d = Math.abs(mLeft - tRight);
      if (d < bestXDelta) { bestXDelta = d; bestX = { snap: tRight, offset: 0, guide: { type:'edge', axis:'x', pos: tRight } }; }
      // right→left
      d = Math.abs(mRight - tLeft);
      if (d < bestXDelta) { bestXDelta = d; bestX = { snap: tLeft - moving.width, offset: moving.width, guide: { type:'edge', axis:'x', pos: tLeft } }; }
      // center→center
      d = Math.abs(mCenterX - tCenterX);
      if (d < bestXDelta) { bestXDelta = d; bestX = { snap: tCenterX - moving.width / 2, offset: moving.width / 2, guide: { type:'center', axis:'x', pos: tCenterX } }; }

      // ── Y-axis snaps ──────────────────────────────────────────────────────
      d = Math.abs(mTop - tTop);
      if (d < bestYDelta) { bestYDelta = d; bestY = { snap: tTop, offset: 0, guide: { type:'edge', axis:'y', pos: tTop } }; }
      d = Math.abs(mBottom - tBottom);
      if (d < bestYDelta) { bestYDelta = d; bestY = { snap: tBottom - moving.height, offset: moving.height, guide: { type:'edge', axis:'y', pos: tBottom } }; }
      d = Math.abs(mTop - tBottom);
      if (d < bestYDelta) { bestYDelta = d; bestY = { snap: tBottom, offset: 0, guide: { type:'edge', axis:'y', pos: tBottom } }; }
      d = Math.abs(mBottom - tTop);
      if (d < bestYDelta) { bestYDelta = d; bestY = { snap: tTop - moving.height, offset: moving.height, guide: { type:'edge', axis:'y', pos: tTop } }; }
      d = Math.abs(mCenterY - tCenterY);
      if (d < bestYDelta) { bestYDelta = d; bestY = { snap: tCenterY - moving.height / 2, offset: moving.height / 2, guide: { type:'center', axis:'y', pos: tCenterY } }; }
    }

    const snappedX = bestX ? bestX.snap : moving.x;
    const snappedY = bestY ? bestY.snap : moving.y;

    if (bestX) guides.push(bestX.guide);
    if (bestY) guides.push(bestY.guide);

    return { x: snappedX, y: snappedY, guides };
  }

  // ── Equal Spacing Detection ────────────────────────────────────────────────
  /**
   * Detects if moving element, when placed at (x,y), creates equal horizontal
   * or vertical gaps with its neighbours. Returns spacing guide data.
   */
  function detectEqualSpacing(moving, targets, excludeIds = new Set()) {
    const others = targets.filter(t => !excludeIds.has(t.id));
    const guides = [];

    // Horizontal: find elements directly left and right
    const left  = others.filter(t => t.x + t.width  <= moving.x).sort((a,b) => (b.x+b.width) - (a.x+a.width));
    const right = others.filter(t => t.x >= moving.x + moving.width).sort((a,b) => a.x - b.x);

    if (left.length && right.length) {
      const gapLeft  = moving.x - (left[0].x + left[0].width);
      const gapRight = right[0].x - (moving.x + moving.width);
      if (Math.abs(gapLeft - gapRight) < SNAP_THRESHOLD) {
        guides.push({ type:'spacing', axis:'x',
          x1: left[0].x + left[0].width, x2: moving.x,
          y: moving.y + moving.height / 2 });
        guides.push({ type:'spacing', axis:'x',
          x1: moving.x + moving.width, x2: right[0].x,
          y: moving.y + moving.height / 2 });
      }
    }

    // Vertical: find elements directly above and below
    const above = others.filter(t => t.y + t.height <= moving.y).sort((a,b) => (b.y+b.height) - (a.y+a.height));
    const below = others.filter(t => t.y >= moving.y + moving.height).sort((a,b) => a.y - b.y);

    if (above.length && below.length) {
      const gapAbove = moving.y - (above[0].y + above[0].height);
      const gapBelow = below[0].y - (moving.y + moving.height);
      if (Math.abs(gapAbove - gapBelow) < SNAP_THRESHOLD) {
        guides.push({ type:'spacing', axis:'y',
          y1: above[0].y + above[0].height, y2: moving.y,
          x: moving.x + moving.width / 2 });
        guides.push({ type:'spacing', axis:'y',
          y1: moving.y + moving.height, y2: below[0].y,
          x: moving.x + moving.width / 2 });
      }
    }

    return guides;
  }

  // ── Artboard Center Snap ───────────────────────────────────────────────────
  function snapToArtboard(moving, artboardW, artboardH) {
    const guides = [];
    let { x, y } = moving;

    const centerX = artboardW / 2;
    const centerY = artboardH / 2;
    const mCX = x + moving.width / 2;
    const mCY = y + moving.height / 2;

    if (Math.abs(mCX - centerX) < SNAP_THRESHOLD) {
      x = centerX - moving.width / 2;
      guides.push({ type:'artboard-center', axis:'x', pos: centerX });
    }
    if (Math.abs(mCY - centerY) < SNAP_THRESHOLD) {
      y = centerY - moving.height / 2;
      guides.push({ type:'artboard-center', axis:'y', pos: centerY });
    }
    // Artboard edges
    if (Math.abs(x) < SNAP_THRESHOLD) { x = 0; guides.push({ type:'artboard-edge', axis:'x', pos: 0 }); }
    if (Math.abs(y) < SNAP_THRESHOLD) { y = 0; guides.push({ type:'artboard-edge', axis:'y', pos: 0 }); }
    if (Math.abs(x + moving.width - artboardW) < SNAP_THRESHOLD) { x = artboardW - moving.width; guides.push({ type:'artboard-edge', axis:'x', pos: artboardW }); }
    if (Math.abs(y + moving.height - artboardH) < SNAP_THRESHOLD) { y = artboardH - moving.height; guides.push({ type:'artboard-edge', axis:'y', pos: artboardH }); }

    return { x, y, guides };
  }

  // ── Full Snap Computation ──────────────────────────────────────────────────
  /**
   * Master snap function — applies all active snapping rules in priority order.
   * @param {Object} moving       Current candidate rect {x,y,width,height}
   * @param {Array}  allRects     All element absolute rects [{id,x,y,width,height}]
   * @param {Set}    excludeIds   IDs to skip
   * @param {Object} opts         { gridEnabled, elementSnap, artboardSnap, artboardW, artboardH, gridSize }
   * @returns {{ x, y, guides }}
   */
  function snap(moving, allRects, excludeIds = new Set(), opts = {}) {
    const {
      gridEnabled   = AppState.snapEnabled,
      elementSnap   = true,
      artboardSnap  = true,
      artboardW     = AppState.artboardW,
      artboardH     = AppState.artboardH,
      gridSize      = GRID_SIZE
    } = opts;

    let result = { x: moving.x, y: moving.y, guides: [] };

    // 1. Element edge / center snapping (highest priority)
    if (elementSnap) {
      const elemResult = snapToElements(result, allRects, excludeIds);
      result.x = elemResult.x;
      result.y = elemResult.y;
      result.guides.push(...elemResult.guides);

      // Equal spacing decoration (doesn't change position, just adds guides)
      const spacingGuides = detectEqualSpacing(
        { ...moving, x: result.x, y: result.y }, allRects, excludeIds
      );
      result.guides.push(...spacingGuides);
    }

    // 2. Artboard snap
    if (artboardSnap) {
      const abResult = snapToArtboard({ ...moving, x: result.x, y: result.y }, artboardW, artboardH);
      result.x = abResult.x;
      result.y = abResult.y;
      result.guides.push(...abResult.guides);
    }

    // 3. Grid snap (lowest priority — only if no element snap fired)
    if (gridEnabled && !result.guides.some(g => g.type === 'edge' || g.type === 'center')) {
      const snapped = snapRectToGrid(result.x, result.y, moving.width, moving.height, gridSize);
      result.x = snapped.x;
      result.y = snapped.y;
    }

    // Emit guide data for RenderEngine to draw overlays
    EventBus.emit(EventBus.EVENTS.SNAP_GUIDES, result.guides);

    return result;
  }

  return { snap, snapToGrid, snapRectToGrid, snapToElements, snapToArtboard,
           detectEqualSpacing, SNAP_THRESHOLD, GRID_SIZE };
})();
