/**
 * Visual Layout OS — Responsive Engine
 * Converts a desktop layout tree into mobile-first CSS with auto breakpoints.
 * Strategy: reads element roles and positions, generates media query rules that
 * stack elements vertically, adjust font-size scales, hide/show elements, etc.
 */
const ResponsiveEngine = (() => {
  'use strict';

  // Standard breakpoints (px)
  const BP = {
    xs:  320,
    sm:  480,
    md:  768,
    lg:  1024,
    xl:  1280,
    xxl: 1440
  };

  /**
   * Generate responsive CSS for an element based on its role and layout.
   * @param {Object} el       Element def with role, htmlTag, cssClass, layoutStrategy
   * @param {number} artboardW Desktop artboard width
   * @returns {string} CSS media query block
   */
  function generateResponsiveRules(el, artboardW) {
    const cls      = el.cssClass || `el-${el.id}`;
    const strategy = el.layoutStrategy;
    const role     = el.role;
    const rules    = [];

    // ── Mobile (≤768px) ───────────────────────────────────────────────────
    const mobileRules = [];

    // Full-width stacking for sections
    if (role === 'section' || role === 'hero' || role === 'header' || role === 'footer') {
      mobileRules.push(`width:100%;`);
    }

    // Sidebar becomes full-width on mobile
    if (role === 'sidebar') {
      mobileRules.push(`width:100%; position:static; float:none;`);
    }

    // Flex-row containers → flex-col on mobile
    if (strategy === 'flex-row') {
      mobileRules.push(`flex-direction:column;`);
    }

    // Grid containers → single column on mobile
    if (strategy === 'grid') {
      mobileRules.push(`grid-template-columns:1fr;`);
    }

    // Card stack on mobile
    if (role === 'card') {
      mobileRules.push(`width:100%; margin-left:0; margin-right:0;`);
    }

    // Carousel → scrollable row
    if (role === 'carousel') {
      mobileRules.push(`overflow-x:auto; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch;`);
    }

    if (mobileRules.length) {
      rules.push(
        `@media (max-width: ${BP.md}px) {\n` +
        `  .${cls} {\n` +
        mobileRules.map(r => `    ${r}`).join('\n') + '\n' +
        `  }\n}`
      );
    }

    // ── Tablet (769px – 1023px) ──────────────────────────────────────────
    const tabletRules = [];

    if (strategy === 'grid') {
      // Infer columns: guess from artboard width vs element width
      const cols = Math.max(1, Math.floor(artboardW / (el.width + 16)));
      const tabletCols = Math.max(1, Math.min(cols, 2));
      tabletRules.push(`grid-template-columns:repeat(${tabletCols},1fr);`);
    }

    if (role === 'sidebar') {
      tabletRules.push(`width:240px;`);
    }

    if (tabletRules.length) {
      rules.push(
        `@media (min-width: ${BP.md + 1}px) and (max-width: ${BP.lg - 1}px) {\n` +
        `  .${cls} {\n` +
        tabletRules.map(r => `    ${r}`).join('\n') + '\n' +
        `  }\n}`
      );
    }

    return rules.join('\n\n');
  }

  /**
   * Compute an auto grid-template-columns value based on element width and artboard.
   */
  function autoGridColumns(children, parentW) {
    if (!children || !children.length) return '1fr';
    const avgChildW = children.reduce((s, c) => s + c.width, 0) / children.length;
    const gap = 16;
    const cols = Math.max(1, Math.floor((parentW + gap) / (avgChildW + gap)));
    return `repeat(auto-fit, minmax(${Math.round(avgChildW)}px, 1fr))`;
  }

  /**
   * Generate the full responsive CSS block for the entire layout tree.
   * @returns {string}
   */
  function generateAll() {
    const artboardW = AppState.artboardW;
    const chunks    = [];
    const allEls    = AppState.getAll();

    allEls.forEach(el => {
      const css = generateResponsiveRules(el, artboardW);
      if (css) chunks.push(`/* ${el.name} — ${el.role || 'block'} */\n${css}`);
    });

    return chunks.join('\n\n');
  }

  /**
   * Infer which breakpoint scale a given artboard width targets.
   * Used to label the artboard in the inspector.
   */
  function inferBreakpointLabel(w) {
    if (w <= BP.xs) return 'xs';
    if (w <= BP.sm) return 'sm';
    if (w <= BP.md) return 'md';
    if (w <= BP.lg) return 'lg';
    if (w <= BP.xl) return 'xl';
    return 'xxl';
  }

  /**
   * Returns array of artboard sizes to simulate for responsive preview.
   * Each entry: { label, width, height }
   */
  function getPreviewSizes() {
    return [
      { label: 'Mobile',  width: 375,  height: 812  },
      { label: 'Tablet',  width: 768,  height: 1024 },
      { label: 'Laptop',  width: 1280, height: 800  },
      { label: 'Desktop', width: 1440, height: 900  },
    ];
  }

  return { generateAll, generateResponsiveRules, autoGridColumns,
           inferBreakpointLabel, getPreviewSizes, BP };
})();
