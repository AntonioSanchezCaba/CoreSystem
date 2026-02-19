/**
 * Visual Layout OS — Export Engine
 * Generates production-grade HTML5 (semantic), ITCSS CSS, and minimal JS
 * from the current AppState layout tree + design tokens.
 */
const ExportEngine = (() => {
  'use strict';

  // ── Element → CSS class ────────────────────────────────────────────────────
  function _elementClass(el) {
    return el.cssClass || `el-${el.id}`;
  }

  // ── CSS value helpers ──────────────────────────────────────────────────────
  function _px(v) { return `${Math.round(v)}px`; }
  function _rgba(hex, opacity) {
    if (opacity === 1) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }

  // ── Single element → CSS block ─────────────────────────────────────────────
  function _elementCSS(el, parentEl) {
    const cls = _elementClass(el);
    const strategy = el.layoutStrategy || 'absolute';
    const rules = [];

    // Position: if parent uses absolute, this element is positioned absolutely
    // If parent uses flex/grid, this element flows normally
    const parentStrategy = parentEl ? (parentEl.layoutStrategy || 'absolute') : 'absolute';
    if (parentStrategy === 'absolute' || !parentEl) {
      rules.push(`position:absolute;`);
      rules.push(`left:${_px(el.x)};`);
      rules.push(`top:${_px(el.y)};`);
    }

    rules.push(`width:${_px(el.width)};`);
    rules.push(`height:${_px(el.height)};`);

    if (el.fill && el.fill !== 'transparent') {
      rules.push(`background-color:${_rgba(el.fill, el.fillOpacity ?? 1)};`);
    }
    if (el.stroke && el.strokeWidth > 0) {
      rules.push(`border:${el.strokeWidth}px solid ${el.stroke};`);
    }
    if (el.borderRadius > 0) {
      rules.push(`border-radius:${_px(el.borderRadius)};`);
    }
    if (el.opacity < 1) {
      rules.push(`opacity:${el.opacity};`);
    }
    if (el.hidden) {
      rules.push(`display:none;`);
    }

    // Layout strategy for container
    if (strategy === 'flex-row') {
      rules.push(`display:flex; flex-direction:row; flex-wrap:wrap; gap:1rem;`);
    } else if (strategy === 'flex-col') {
      rules.push(`display:flex; flex-direction:column; gap:1rem;`);
    } else if (strategy === 'grid') {
      const children = AppState.getChildrenOf(el.id);
      const autoGrid = ResponsiveEngine.autoGridColumns(children, el.width);
      rules.push(`display:grid; grid-template-columns:${autoGrid}; gap:1rem;`);
    }

    // Constraint hints
    const cHints = ConstraintEngine.constraintToCSSHint(
      el.constraints?.h, el.constraints?.v
    );
    cHints.forEach(h => rules.push(h + ';'));

    return `.${cls} {\n${rules.map(r => `  ${r}`).join('\n')}\n}`;
  }

  // ── Recursive HTML generation ──────────────────────────────────────────────
  function _elementHTML(el, indent = 0) {
    const pad  = '  '.repeat(indent);
    const tag  = el.htmlTag || 'div';
    const cls  = _elementClass(el);
    const aria = _ariaAttrs(el);
    const children = AppState.getChildrenOf(el.id);
    const label = el.name || el.role || 'block';

    let inner = '';
    if (children.length) {
      inner = '\n' + children.map(c => _elementHTML(c, indent + 1)).join('\n') + '\n' + pad;
    } else {
      // Leaf node: emit placeholder content based on role
      inner = _placeholderContent(el);
    }

    return `${pad}<${tag} class="${cls}"${aria}>${inner}</${tag}>`;
  }

  function _ariaAttrs(el) {
    const attrs = [];
    if (el.role === 'nav')     attrs.push(' aria-label="Site navigation"');
    if (el.role === 'header')  attrs.push(' role="banner"');
    if (el.role === 'footer')  attrs.push(' role="contentinfo"');
    if (el.role === 'sidebar') attrs.push(' aria-label="Sidebar"');
    if (el.hidden)             attrs.push(' aria-hidden="true"');
    return attrs.join('');
  }

  function _placeholderContent(el) {
    switch (el.role) {
      case 'header':  return `<a href="/" class="logo">Logo</a>`;
      case 'nav':     return `<ul><li><a href="#">Home</a></li><li><a href="#">About</a></li><li><a href="#">Contact</a></li></ul>`;
      case 'hero':    return `<h1>${el.name}</h1><p>Hero content goes here.</p>`;
      case 'footer':  return `<p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>`;
      case 'card':    return `<h3>${el.name}</h3><p>Card content.</p>`;
      case 'sidebar': return `<nav aria-label="Secondary"><ul><li><a href="#">Item 1</a></li><li><a href="#">Item 2</a></li></ul></nav>`;
      default:        return `<!-- ${el.name} -->`;
    }
  }

  // ── Full Document Generation ───────────────────────────────────────────────
  function generateHTML() {
    // Ensure analysis is up to date
    LayoutAnalyzer.analyze();
    const roots = AppState.getRoots();

    const bodyContent = roots.map(el => _elementHTML(el, 2)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Generated by Visual Layout OS">
  <title>Exported Layout</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${bodyContent}
  <script src="app.js"><\/script>
</body>
</html>`;
  }

  function generateCSS() {
    LayoutAnalyzer.analyze();
    const allEls = AppState.getAll();
    const sections = [];

    // ── 1. Design Tokens ────────────────────────────────────────────────────
    sections.push(`/* ============================================================\n   1. Design Tokens\n   ============================================================ */`);
    sections.push(TokenSystem.toCSSVars());

    // ── 2. Reset ────────────────────────────────────────────────────────────
    sections.push(`/* ============================================================\n   2. Reset\n   ============================================================ */`);
    sections.push(`*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }`);
    sections.push(`html { font-size:16px; -webkit-text-size-adjust:100%; }`);
    sections.push(`body { font-family:var(--font-base, system-ui, sans-serif); line-height:1.6; color:var(--color-text, #1e293b); background:var(--color-bg, #fff); }`);
    sections.push(`img, video { max-width:100%; height:auto; display:block; }`);
    sections.push(`a { color:var(--color-primary, #3b82f6); text-decoration:none; }`);
    sections.push(`ul, ol { list-style:none; }`);

    // ── 3. Layout ────────────────────────────────────────────────────────────
    sections.push(`/* ============================================================\n   3. Layout\n   ============================================================ */`);
    sections.push(`.artboard { position:relative; width:${_px(AppState.artboardW)}; min-height:${_px(AppState.artboardH)}; margin:0 auto; overflow:hidden; }`);

    // ── 4. Elements ──────────────────────────────────────────────────────────
    sections.push(`/* ============================================================\n   4. Elements\n   ============================================================ */`);
    allEls.forEach(el => {
      const parentEl = el.parentId ? AppState.getElement(el.parentId) : null;
      sections.push(_elementCSS(el, parentEl));
    });

    // ── 5. Responsive ────────────────────────────────────────────────────────
    sections.push(`/* ============================================================\n   5. Responsive\n   ============================================================ */`);
    sections.push(ResponsiveEngine.generateAll());

    return sections.join('\n\n');
  }

  function generateJS() {
    // Minimal interactivity JS — only generated if there are interactive elements
    const hasNav = [...AppState.getAll().values()].some(e => e.role === 'nav' || e.role === 'header');
    const hasCarousel = [...AppState.getAll().values()].some(e => e.role === 'carousel');

    const parts = [
      `'use strict';`,
      `document.addEventListener('DOMContentLoaded', () => {`
    ];

    if (hasNav) {
      parts.push(`
  // Mobile nav toggle
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navMenu = document.querySelector('[data-nav-menu]');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded',
        navToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });
  }`);
    }

    if (hasCarousel) {
      parts.push(`
  // Carousel scroll
  document.querySelectorAll('.carousel').forEach(c => {
    const prev = c.querySelector('[data-prev]');
    const next = c.querySelector('[data-next]');
    if (prev) prev.addEventListener('click', () => { c.scrollBy({ left: -300, behavior: 'smooth' }); });
    if (next) next.addEventListener('click', () => { c.scrollBy({ left: 300, behavior: 'smooth' }); });
  });`);
    }

    parts.push(`});`);
    return parts.join('\n');
  }

  // ── ZIP export ─────────────────────────────────────────────────────────────
  function exportZip(projectName = 'layout-export') {
    const html = generateHTML();
    const css  = generateCSS();
    const js   = generateJS();

    const readme = `# ${projectName}\nGenerated by Visual Layout OS\nDate: ${new Date().toISOString().split('T')[0]}\n\n## Files\n- index.html\n- style.css\n- app.js\n`;

    const files = {
      'index.html': html,
      'style.css':  css,
      'app.js':     js,
      'README.md':  readme,
    };

    const zip = _createZip(files);
    _downloadBlob(zip, `${projectName}.zip`, 'application/zip');
    EventBus.emit(EventBus.EVENTS.EXPORT_DONE, { projectName, files: Object.keys(files) });
  }

  // ── Minimal ZIP writer (PKZIP Store) ──────────────────────────────────────
  function _createZip(files) {
    const enc    = new TextEncoder();
    const parts  = [];
    const central = [];
    let offset   = 0;

    const u16 = v => [v & 0xFF, (v >> 8) & 0xFF];
    const u32 = v => [v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF];

    function crc32(data) {
      let c = 0xFFFFFFFF;
      for (let i = 0; i < data.length; i++) {
        c ^= data[i];
        for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
      }
      return (c ^ 0xFFFFFFFF) >>> 0;
    }

    for (const [name, content] of Object.entries(files)) {
      const data    = enc.encode(content);
      const nameB   = enc.encode(name);
      const crc     = crc32(data);
      const now     = new Date();
      const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
      const dosDate = ((now.getFullYear()-1980) << 9) | ((now.getMonth()+1) << 5) | now.getDate();

      const lh = [
        0x50,0x4B,0x03,0x04,  // sig
        ...u16(20),            // version needed
        ...u16(0),             // flags
        ...u16(0),             // compression (Store)
        ...u16(dosTime), ...u16(dosDate),
        ...u32(crc),
        ...u32(data.length), ...u32(data.length),
        ...u16(nameB.length), ...u16(0),
        ...nameB,
      ];

      const cdir = [
        0x50,0x4B,0x01,0x02,  // sig
        ...u16(20), ...u16(20),
        ...u16(0), ...u16(0),
        ...u16(dosTime), ...u16(dosDate),
        ...u32(crc),
        ...u32(data.length), ...u32(data.length),
        ...u16(nameB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(0),
        ...u32(offset),
        ...nameB,
      ];

      parts.push(...lh, ...data);
      central.push(...cdir);
      offset += lh.length + data.length;
    }

    const eocd = [
      0x50,0x4B,0x05,0x06,
      ...u16(0), ...u16(0),
      ...u16(Object.keys(files).length), ...u16(Object.keys(files).length),
      ...u32(central.length),
      ...u32(offset),
      ...u16(0),
    ];

    return new Uint8Array([...parts, ...central, ...eocd]);
  }

  function _downloadBlob(data, filename, mime) {
    const blob = new Blob([data], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Single-file preview HTML (self-contained) ──────────────────────────────
  function generatePreviewHTML() {
    LayoutAnalyzer.analyze();
    const roots = AppState.getRoots();
    const bodyContent = roots.map(el => _elementHTML(el, 2)).join('\n');
    const css = generateCSS();
    const js  = generateJS();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Preview</title>
<style>${css}</style>
</head>
<body>
${bodyContent}
<script>${js}<\/script>
</body>
</html>`;
  }

  return { generateHTML, generateCSS, generateJS, generatePreviewHTML, exportZip };
})();
