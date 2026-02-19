/**
 * CoreSystem Platform — Structural Parser
 * Reads the block array from AppState and resolves each block definition
 * against the BlockLibrary, producing a normalized structure for the Compiler.
 */
const Parser = (() => {
  'use strict';

  /**
   * Parse the current canvas blocks into a normalized render tree.
   * @param {Array} blocks - Array of block instances from AppState
   * @returns {{ html: string[], css: string[], js: string[], meta: Object }}
   */
  function parse(blocks) {
    if (!blocks || blocks.length === 0) {
      return { html: [], css: [], js: [], meta: { blockCount: 0, hasNav: false, hasFooter: false } };
    }

    const htmlFragments = [];
    const cssFragments  = new Set();
    const jsFragments   = new Set();
    const meta = { blockCount: blocks.length, hasNav: false, hasFooter: false, ids: [] };

    // Always include base CSS
    cssFragments.add(BlockLibrary.BASE_CSS);

    for (const instance of blocks) {
      const def = BlockLibrary.get(instance.id);
      if (!def) {
        console.warn(`[Parser] Unknown block id: "${instance.id}"`);
        continue;
      }

      const config = instance.config || {};

      // Resolve HTML fragment
      try {
        const html = def.html(config);
        if (html && html.trim()) htmlFragments.push(html.trim());
      } catch (e) {
        console.error(`[Parser] html() error in block "${instance.id}":`, e);
      }

      // Collect CSS (de-duplicated by definition id, not instance)
      try {
        const css = def.css(config);
        if (css && css.trim()) cssFragments.add(`/* --- ${def.name} --- */\n${css.trim()}`);
      } catch (e) {
        console.error(`[Parser] css() error in block "${instance.id}":`, e);
      }

      // Collect JS (de-duplicated)
      try {
        const js = def.js(config);
        if (js && js.trim()) jsFragments.add(js.trim());
      } catch (e) {
        console.error(`[Parser] js() error in block "${instance.id}":`, e);
      }

      // Track metadata
      meta.ids.push(instance.id);
      if (instance.id === 'navbar') meta.hasNav = true;
      if (instance.id === 'footer') meta.hasFooter = true;
    }

    return {
      html: htmlFragments,
      css:  [...cssFragments],
      js:   [...jsFragments],
      meta
    };
  }

  /**
   * Validate block ordering — warn about structural issues.
   * @param {Array} blocks
   * @returns {string[]} Array of warning messages
   */
  function validate(blocks) {
    const warnings = [];
    const ids = blocks.map(b => b.id);

    if (ids.includes('footer') && ids.indexOf('footer') !== ids.length - 1) {
      warnings.push('Footer should be the last block.');
    }
    if (ids.includes('navbar') && ids.indexOf('navbar') !== 0) {
      warnings.push('Navbar should be the first block.');
    }
    if (!ids.includes('footer')) {
      warnings.push('Consider adding a footer block.');
    }
    if (!ids.includes('navbar')) {
      warnings.push('Consider adding a navbar block.');
    }

    return warnings;
  }

  return { parse, validate };
})();
