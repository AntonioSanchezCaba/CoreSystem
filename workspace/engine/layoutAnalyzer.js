'use strict';
/**
 * CoreSystem Workspace — Layout Analyzer
 * Analyzes spatial positions of elements to infer:
 *   - Semantic roles (header/footer/sidebar/hero/card/section)
 *   - DOM hierarchy (which elements are "inside" others)
 *   - Layout strategies (flex-row / flex-col / grid / absolute)
 */
const Analyzer = (() => {

  // ── Role thresholds ───────────────────────────────────────────────────────
  const FULL_WIDTH  = 0.80; // element spans ≥ 80% of canvas bbox width
  const HEADER_H    = 0.18; // header ≤ 18% of bbox height, near top
  const FOOTER_H    = 0.18;
  const SIDEBAR_W   = 0.28; // sidebar ≤ 28% of bbox width
  const HERO_H      = 0.35; // hero ≥ 35% of bbox height
  const CARD_MAX_W  = 0.35;
  const CARD_ASPECT = { min: 0.4, max: 2.5 };

  // ── Bounding box of all elements ──────────────────────────────────────────
  function _bbox(els) {
    if (!els.length) return { x:0, y:0, width:1440, height:900 };
    const xs = els.map(e => e.x);
    const ys = els.map(e => e.y);
    const x2 = els.map(e => e.x + e.width);
    const y2 = els.map(e => e.y + e.height);
    return {
      x: Math.min(...xs), y: Math.min(...ys),
      width:  Math.max(...x2) - Math.min(...xs),
      height: Math.max(...y2) - Math.min(...ys),
    };
  }

  // ── Containment: does outer contain inner? ────────────────────────────────
  function _contains(outer, inner, threshold = 0.70) {
    const ox = outer.x, oy = outer.y, ow = outer.width, oh = outer.height;
    const ix = inner.x, iy = inner.y, iw = inner.width, ih = inner.height;
    const overlapX = Math.max(0, Math.min(ox+ow, ix+iw) - Math.max(ox, ix));
    const overlapY = Math.max(0, Math.min(oy+oh, iy+ih) - Math.max(oy, iy));
    const innerArea = iw * ih;
    return innerArea > 0 && (overlapX * overlapY) / innerArea >= threshold;
  }

  // ── Layout strategy for sibling group ────────────────────────────────────
  function _strategy(children) {
    if (!children || children.length < 2) return 'block';
    const yCenters = children.map(c => c.y + c.height / 2);
    const xCenters = children.map(c => c.x + c.width  / 2);
    const maxYDiff = Math.max(...yCenters) - Math.min(...yCenters);
    const maxXDiff = Math.max(...xCenters) - Math.min(...xCenters);
    const avgH = children.reduce((s,c) => s+c.height, 0) / children.length;
    const avgW = children.reduce((s,c) => s+c.width,  0) / children.length;

    if (maxYDiff < avgH * 0.4) return 'flex-row';
    if (maxXDiff < avgW * 0.4) return 'flex-col';

    // Grid: all similar size
    const wStdDev = _stdDev(children.map(c => c.width));
    const hStdDev = _stdDev(children.map(c => c.height));
    if (children.length >= 3 && wStdDev < avgW * 0.2 && hStdDev < avgH * 0.2) return 'grid';
    return 'absolute';
  }

  function _stdDev(arr) {
    const avg = arr.reduce((s,v) => s+v,0) / arr.length;
    return Math.sqrt(arr.reduce((s,v) => s + (v-avg)**2, 0) / arr.length);
  }

  // ── Detect role of an element ─────────────────────────────────────────────
  function _detectRole(el, bbox) {
    const bW = bbox.width, bH = bbox.height;
    const relW = el.width  / bW;
    const relH = el.height / bH;
    const relX = (el.x - bbox.x) / bW;
    const relY = (el.y - bbox.y) / bH;
    const relB = (el.y + el.height - bbox.y) / bH;
    const aspect = el.height / el.width;
    const isFullW = relW >= FULL_WIDTH;

    if (isFullW && relY < 0.08 && relH <= HEADER_H) return 'header';
    if (isFullW && relY < 0.08 && relH < 0.12)      return 'nav';
    if (isFullW && relB > 0.90 && relH <= FOOTER_H)  return 'footer';
    if (relW <= SIDEBAR_W && relX < 0.08)            return 'sidebar-left';
    if (relW <= SIDEBAR_W && relX > 0.60)            return 'sidebar-right';
    if (isFullW && relH >= HERO_H && relY < 0.50)    return 'hero';
    if (!isFullW && relW <= CARD_MAX_W &&
        aspect >= CARD_ASPECT.min && aspect <= CARD_ASPECT.max) return 'card';
    if (isFullW)                                      return 'section';
    return 'block';
  }

  // ── Tag / Class map ───────────────────────────────────────────────────────
  const ROLE_TAG = {
    header:'header', 'sidebar-left':'aside', 'sidebar-right':'aside',
    footer:'footer', nav:'nav', hero:'section', section:'section',
    card:'article', block:'div', grid:'div',
  };
  const ROLE_CLASS = {
    header:'site-header', 'sidebar-left':'sidebar', 'sidebar-right':'sidebar sidebar--right',
    footer:'site-footer', nav:'site-nav', hero:'hero', section:'content-section',
    card:'card', block:'block', grid:'grid-container',
  };

  // ── Build hierarchy tree ───────────────────────────────────────────────────
  function _buildTree(els, bbox) {
    const sorted = [...els].sort((a,b) => a.y - b.y || a.x - b.x);
    const assigned = new Set();

    // For each element, find the smallest parent that contains it
    const parents = new Map(); // id → parentId | null
    sorted.forEach((el, i) => {
      let bestParent = null, bestArea = Infinity;
      sorted.forEach(candidate => {
        if (candidate.id === el.id || assigned.has(candidate.id)) return;
        if (_contains(candidate, el) && candidate.width * candidate.height < bestArea) {
          bestParent = candidate.id;
          bestArea = candidate.width * candidate.height;
        }
      });
      parents.set(el.id, bestParent);
    });

    // Build tree nodes
    const nodes = new Map();
    sorted.forEach(el => {
      const role  = _detectRole(el, bbox);
      nodes.set(el.id, {
        id:       el.id,
        el,
        role,
        htmlTag:  ROLE_TAG[role]   || 'div',
        cssClass: ROLE_CLASS[role] || '',
        parentId: parents.get(el.id),
        children: [],
        layout:   'block',
      });
    });

    // Link parent ↔ children
    nodes.forEach((node, id) => {
      if (node.parentId) {
        const p = nodes.get(node.parentId);
        if (p) p.children.push(node);
      }
    });

    // Detect layout strategy for containers
    nodes.forEach(node => {
      if (node.children.length) {
        node.layout = _strategy(node.children.map(c => c.el));
      }
    });

    // Roots = no parent
    const roots = [...nodes.values()].filter(n => !n.parentId);
    roots.sort((a,b) => a.el.y - b.el.y);

    return { roots, nodes, bbox };
  }

  // ── Public analyze ────────────────────────────────────────────────────────
  function analyze() {
    const els  = State.getAllEls().filter(e => !e.hidden);
    if (!els.length) return { roots:[], nodes: new Map(), bbox: { x:0,y:0,width:0,height:0 } };
    const bbox = _bbox(els);
    const tree = _buildTree(els, bbox);

    // Push detected roles back to state (for export / inspector display)
    tree.nodes.forEach((node, id) => {
      State.update(id, {
        htmlTag:  node.htmlTag,
        cssClass: node.cssClass,
        _role:    node.role,
        _layout:  node.layout,
      });
    });

    State.emit('analysis:done', tree);
    return tree;
  }

  return { analyze, ROLE_TAG, ROLE_CLASS };
})();
