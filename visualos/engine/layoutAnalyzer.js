/**
 * Visual Layout OS — Layout Analyzer
 * Structural intelligence engine. Analyses element positions/sizes relative to
 * the artboard and assigns semantic roles, HTML tags, CSS classes, and layout
 * strategies automatically.
 *
 * Roles: 'header' | 'footer' | 'sidebar' | 'hero' | 'section' | 'card' |
 *        'carousel' | 'nav' | 'grid' | 'modal'
 * HTML tags: header | footer | aside | main | section | nav | div | article
 * Layout strategies: 'flex-row' | 'flex-col' | 'grid' | 'absolute'
 */
const LayoutAnalyzer = (() => {
  'use strict';

  // ── Thresholds (fractions of artboard dimension) ──────────────────────────
  const HEADER_MAX_H    = 0.18;  // top element, height ≤ 18% artboard height
  const FOOTER_MAX_H    = 0.18;  // bottom element, height ≤ 18% artboard height
  const SIDEBAR_MAX_W   = 0.30;  // left/right element, width ≤ 30% artboard width
  const HERO_MIN_H      = 0.30;  // tall top area, height ≥ 30% artboard height
  const FULL_WIDTH_THR  = 0.85;  // element spans ≥ 85% of artboard width
  const CARD_ASPECT_MIN = 0.5;   // min h/w ratio for a card
  const CARD_ASPECT_MAX = 2.0;   // max h/w ratio for a card
  const CARD_MAX_W      = 0.40;  // card width ≤ 40% artboard width

  // ── Grid / Flex Detection ─────────────────────────────────────────────────
  /**
   * Detects layout strategy for a group of sibling elements.
   * @param {Array} children Array of element objects (relative coords)
   * @returns {string} 'flex-row' | 'flex-col' | 'grid' | 'absolute'
   */
  function detectLayoutStrategy(children) {
    if (!children || children.length < 2) return 'absolute';

    // Sort by x then y
    const byX = [...children].sort((a, b) => a.x - b.x);
    const byY = [...children].sort((a, b) => a.y - b.y);

    // Check if all Y positions are approximately equal (same row)
    const yCoordsClose = byX.every(
      el => Math.abs(el.y - byX[0].y) < Math.max(20, byX[0].height * 0.25)
    );

    // Check if all X positions are approximately equal (same column)
    const xCoordsClose = byY.every(
      el => Math.abs(el.x - byY[0].x) < Math.max(20, byY[0].width * 0.25)
    );

    if (yCoordsClose) return 'flex-row';
    if (xCoordsClose) return 'flex-col';

    // Grid detection: multiple rows × multiple columns of similar-size elements
    const widths  = children.map(c => c.width);
    const heights = children.map(c => c.height);
    const avgW = widths.reduce((a, b) => a + b, 0)  / widths.length;
    const avgH = heights.reduce((a, b) => a + b, 0) / heights.length;
    const uniformSize = children.every(
      c => Math.abs(c.width - avgW) < avgW * 0.25 && Math.abs(c.height - avgH) < avgH * 0.25
    );

    if (uniformSize && children.length >= 4) return 'grid';
    return 'absolute';
  }

  // ── Role Detection (Root-level elements) ──────────────────────────────────
  function detectRole(el, artboardW, artboardH) {
    const absRect = AppState.getAbsoluteRect(el.id);
    if (!absRect) return null;

    const { x, y, width, height } = absRect;
    const relX = x / artboardW;
    const relY = y / artboardH;
    const relW = width / artboardW;
    const relH = height / artboardH;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const relCY = centerY / artboardH;

    const isFullWidth = relW >= FULL_WIDTH_THR;
    const isAtTop    = relY < 0.05;
    const isAtBottom = (y + height) / artboardH > 0.90;
    const isAtLeft   = relX < 0.05;
    const isAtRight  = (x + width) / artboardW > 0.90;

    // ── Header
    if (isAtTop && isFullWidth && relH <= HEADER_MAX_H) return 'header';

    // ── Navigation bar (narrower variant of header)
    if (isAtTop && isFullWidth && relH < 0.12) return 'nav';

    // ── Footer
    if (isAtBottom && isFullWidth && relH <= FOOTER_MAX_H) return 'footer';

    // ── Sidebar left
    if (isAtLeft && !isFullWidth && relW <= SIDEBAR_MAX_W) return 'sidebar';

    // ── Sidebar right
    if (isAtRight && !isFullWidth && relW <= SIDEBAR_MAX_W) return 'sidebar';

    // ── Hero section (large, near top, full width)
    if (isAtTop && isFullWidth && relH >= HERO_MIN_H) return 'hero';

    // ── Card detection (small-ish, portrait/square aspect, not full width)
    const aspect = height / width;
    if (!isFullWidth && relW <= CARD_MAX_W &&
        aspect >= CARD_ASPECT_MIN && aspect <= CARD_ASPECT_MAX) return 'card';

    // ── Section (full width, middle of page)
    if (isFullWidth && !isAtTop && !isAtBottom) return 'section';

    // ── Generic
    return 'section';
  }

  // ── Role → HTML tag mapping ───────────────────────────────────────────────
  const ROLE_TO_TAG = {
    header:  'header',
    nav:     'nav',
    hero:    'section',
    sidebar: 'aside',
    section: 'section',
    card:    'article',
    footer:  'footer',
    grid:    'div',
    modal:   'div',
  };

  const ROLE_TO_CLASS = {
    header:  'site-header',
    nav:     'site-nav',
    hero:    'hero',
    sidebar: 'sidebar',
    section: 'content-section',
    card:    'card',
    footer:  'site-footer',
    grid:    'grid-container',
  };

  // ── Carousel Detection ────────────────────────────────────────────────────
  /**
   * Heuristic: a group of similarly-sized elements arranged in a horizontal row
   * whose combined width overflows the parent → carousel.
   */
  function isCarousel(children, parentW) {
    if (!children || children.length < 3) return false;
    const row = detectLayoutStrategy(children);
    if (row !== 'flex-row') return false;
    const totalW = children.reduce((sum, c) => sum + c.width, 0);
    return totalW > parentW * 1.1;
  }

  // ── Main Analysis Entry Point ─────────────────────────────────────────────
  function analyze() {
    const artboardW = AppState.artboardW;
    const artboardH = AppState.artboardH;
    const roots     = AppState.getRoots();
    const allEls    = AppState.getAll();

    // Walk all elements and assign roles
    allEls.forEach((el) => {
      const children = AppState.getChildrenOf(el.id);

      // Detect layout strategy for this container
      const strategy = detectLayoutStrategy(children);
      const patch = { layoutStrategy: strategy };

      // Detect carousel on child group
      if (children.length >= 3 && isCarousel(children, el.width)) {
        patch.layoutStrategy = 'flex-row';
        patch.role = 'carousel';
        patch.htmlTag = 'div';
        patch.cssClass = 'carousel';
      }

      // Top-level elements get role detection
      if (!el.parentId) {
        const role = detectRole(el, artboardW, artboardH);
        if (role) {
          patch.role    = role;
          patch.htmlTag = ROLE_TO_TAG[role] || 'div';
          patch.cssClass = ROLE_TO_CLASS[role] || 'block';
        }
      }

      // Apply patch (bypass lock check — this is analysis, not user action)
      const current = AppState.getElement(el.id);
      if (current) Object.assign(current, patch);
    });

    // Build a tree summary for inspection / export
    const tree = roots.map(el => _buildTreeNode(el));
    AppState.layoutTree = tree;

    EventBus.emit(EventBus.EVENTS.ANALYSIS_DONE, tree);
    return tree;
  }

  function _buildTreeNode(el) {
    return {
      id:             el.id,
      name:           el.name,
      role:           el.role,
      htmlTag:        el.htmlTag,
      cssClass:       el.cssClass,
      layoutStrategy: el.layoutStrategy,
      children:       AppState.getChildrenOf(el.id).map(c => _buildTreeNode(c))
    };
  }

  // ── Structural Summary (human-readable) ───────────────────────────────────
  function getSummary() {
    const tree = AppState.layoutTree;
    if (!tree) return 'No analysis yet.';
    return tree.map(node => {
      const childCount = node.children.length;
      return `${node.htmlTag || 'div'}.${node.cssClass || ''} [${node.role || '?'}]` +
             (childCount ? ` (${childCount} children, ${node.layoutStrategy})` : '');
    }).join('\n');
  }

  return { analyze, detectRole, detectLayoutStrategy, getSummary,
           ROLE_TO_TAG, ROLE_TO_CLASS };
})();
