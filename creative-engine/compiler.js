/**
 * CoreSystem Platform — Compiler
 * Takes the normalized output from the Parser and assembles complete
 * HTML, CSS and JS source files ready for production use.
 */
const Compiler = (() => {
  'use strict';

  /**
   * Compile complete HTML page from parsed fragments.
   * @param {string[]} htmlFragments
   * @param {Object} settings   - From AppState settings
   * @param {Object} theme      - From AppState theme
   * @param {boolean} inlineAssets - If true, embed CSS+JS inline (for preview)
   * @param {string} [css]     - Inline CSS (used when inlineAssets = true)
   * @param {string} [js]      - Inline JS (used when inlineAssets = true)
   * @returns {string}
   */
  function compileHTML(htmlFragments, settings, theme, inlineAssets = false, css = '', js = '') {
    const bodyPadding = settings.navbar !== 'none'
      ? 'style="padding-top: 64px;"'
      : '';

    const assetLinks = inlineAssets
      ? `<style>${css}</style>`
      : `<link rel="stylesheet" href="styles.css">`;

    const scriptTag = inlineAssets
      ? (js ? `<script>${js}</script>` : '')
      : `<script defer src="script.js"></script>`;

    return `<!DOCTYPE html>
<html lang="en" data-theme="${theme.mode || 'light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Built with CoreSystem — Professional Frontend Platform">
  <title>My Project — CoreSystem</title>
  ${assetLinks}
</head>
<body ${bodyPadding}>

${htmlFragments.join('\n\n')}

  ${scriptTag}
</body>
</html>`.trim();
  }

  /**
   * Compile complete CSS file from parsed fragments.
   * @param {string[]} cssFragments
   * @param {Object} theme
   * @param {Object} settings
   * @returns {string}
   */
  function compileCSS(cssFragments, theme, settings) {
    const themeCSS = ThemeManager.generateThemeCSS(theme);
    const maxWidthCSS = `:root { --max-w: ${settings.maxWidth || '1200px'}; }`;

    return [
      '/* === CoreSystem — Generated Stylesheet === */',
      '/* https://github.com/CoreSystem */',
      '',
      '/* 1. Design Tokens & Theme */',
      themeCSS,
      maxWidthCSS,
      '',
      '/* 2. Block Styles */',
      ...cssFragments,
      '',
      '/* 3. Responsive */',
      RESPONSIVE_CSS
    ].join('\n');
  }

  /**
   * Compile complete JS file from parsed fragments.
   * @param {string[]} jsFragments
   * @param {Object} settings
   * @returns {string}
   */
  function compileJS(jsFragments, settings) {
    const hasContent = jsFragments.some(j => j.trim().length > 0);
    if (!hasContent) return '/* No JavaScript required for this layout. */';

    const animationsCode = settings.animations ? SCROLL_REVEAL_JS : '';

    return [
      '/* === CoreSystem — Generated Script === */',
      "'use strict';",
      '',
      '// ── Initialise components ────────────────────────────────────────',
      'document.addEventListener("DOMContentLoaded", () => {',
      '',
      ...jsFragments.map(j => _indent(j, 2)),
      '',
      animationsCode ? _indent(animationsCode, 2) : '',
      '',
      '});'
    ].filter(l => l !== null).join('\n');
  }

  // ── Full compilation pipeline ─────────────────────────────────────────────
  /**
   * Run the full compile pipeline given a parsed structure.
   * @param {Object} parsed - Output of Parser.parse()
   * @param {Object} theme
   * @param {Object} settings
   * @returns {{ html: string, css: string, js: string }}
   */
  function compile(parsed, theme, settings) {
    const css  = compileCSS(parsed.css, theme, settings);
    const js   = compileJS(parsed.js, settings);
    const html = compileHTML(parsed.html, settings, theme);
    return { html, css, js };
  }

  /**
   * Compile to a single self-contained HTML string (for iframe preview).
   */
  function compileForPreview(parsed, theme, settings) {
    const css = compileCSS(parsed.css, theme, settings);
    const js  = compileJS(parsed.js, settings);
    return compileHTML(parsed.html, settings, theme, true, css, js);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _indent(str, spaces) {
    const pad = ' '.repeat(spaces);
    return str.split('\n').map(l => pad + l).join('\n');
  }

  const RESPONSIVE_CSS = `
@media (max-width: 1024px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .grid-3, .grid-4 { grid-template-columns: 1fr; }
  .cs-hero { padding: 4rem 0 3rem; }
  .cs-footer__top { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .cs-pricing__card--featured { transform: none; }
  .cs-footer__top { grid-template-columns: 1fr; }
}`.trim();

  const SCROLL_REVEAL_JS = `
// Scroll-reveal animation
const revealEls = document.querySelectorAll('.cs-feature-card, .cs-card, .cs-testimonial, .cs-pricing__card, .cs-faq__item');
if (revealEls.length && 'IntersectionObserver' in window) {
  revealEls.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; el.style.transition = 'opacity .5s ease, transform .5s ease'; });
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));
}`.trim();

  return { compile, compileForPreview, compileHTML, compileCSS, compileJS };
})();
