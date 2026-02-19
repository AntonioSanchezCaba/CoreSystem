/**
 * CoreSystem Platform — Template Engine
 * Template registry with embedded code, card renderer, and filter logic.
 * Embedded code allows the viewer to work without a local server (file://).
 */
const TemplateEngine = (() => {
  'use strict';

  // ── Template registry ─────────────────────────────────────────────────────
  const registry = {};

  function register(tpl) { registry[tpl.id] = tpl; }
  function get(id) { return registry[id]; }
  function getAll() { return Object.values(registry); }

  function filter(category, query = '') {
    return getAll().filter(t => {
      const matchCat = category === 'all' || t.categories.includes(category);
      const q = query.toLowerCase();
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }

  // ── Render card HTML ──────────────────────────────────────────────────────
  function renderCard(tpl) {
    const levelClass = { Básico: 'badge--green', Intermedio: 'badge--yellow', Avanzado: 'badge--purple' }[tpl.level] || 'badge--gray';
    return `
<article class="tpl-card" data-tpl-id="${tpl.id}">
  <div class="tpl-card__thumb">${tpl.thumbnail}</div>
  <div class="tpl-card__body">
    <div class="tpl-card__meta">
      <span class="badge ${levelClass}">${tpl.level}</span>
      <span class="tpl-card__stack">${tpl.stack}</span>
    </div>
    <h3 class="tpl-card__name">${tpl.name}</h3>
    <p class="tpl-card__desc">${tpl.description}</p>
    <div class="tpl-card__tags">${tpl.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
    <div class="tpl-card__actions">
      <button class="btn btn-sm btn-outline" data-action="preview" data-tpl-id="${tpl.id}">
        <span>⊡</span> Preview
      </button>
      <button class="btn btn-sm btn-ghost" data-action="code" data-tpl-id="${tpl.id}">
        <span>&lt;/&gt;</span> Código
      </button>
      <button class="btn btn-sm btn-primary" data-action="download" data-tpl-id="${tpl.id}">
        <span>↓</span> ZIP
      </button>
    </div>
  </div>
</article>`.trim();
  }

  function renderGrid(templates) {
    if (templates.length === 0) {
      return `<div class="tpl-empty"><div class="tpl-empty__icon">🔍</div><p class="tpl-empty__title">No templates found</p><p class="tpl-empty__sub">Try a different category or search term.</p></div>`;
    }
    return templates.map(renderCard).join('');
  }

  // ── Template data (with embedded code) ───────────────────────────────────
  // landing-pro
  register({
    id: 'landing-pro',
    name: 'Landing Pro',
    level: 'Avanzado',
    categories: ['all', 'saas', 'avanzado'],
    tags: ['Hero', 'Pricing', 'Testimonials', 'FAQ', 'CTA'],
    stack: 'HTML5 · CSS3 · JS',
    description: 'SaaS landing page with animated hero, feature grid, 3-tier pricing, testimonials and FAQ accordion.',
    thumbnail: `<div class="thumb-landing">
      <div class="thumb__nav"></div>
      <div class="thumb__hero"></div>
      <div class="thumb__grid"><div></div><div></div><div></div></div>
      <div class="thumb__pricing"><div></div><div class="thumb__pricing-feat"></div><div></div></div>
    </div>`,
    html: null, css: null, js: null // lazy-loaded via _loadCode
  });

  // dashboard-admin
  register({
    id: 'dashboard-admin',
    name: 'Dashboard Admin',
    level: 'Avanzado',
    categories: ['all', 'dashboard', 'avanzado'],
    tags: ['Sidebar', 'Stats', 'Tables', 'Charts', 'Dark Mode'],
    stack: 'HTML5 · CSS3 · JS',
    description: 'Admin panel with collapsible sidebar, KPI metrics, responsive data table and dark mode toggle.',
    thumbnail: `<div class="thumb-dashboard">
      <div class="thumb__sidebar"></div>
      <div class="thumb__main">
        <div class="thumb__topbar"></div>
        <div class="thumb__stats"><div></div><div></div><div></div><div></div></div>
        <div class="thumb__table"></div>
      </div>
    </div>`,
    html: null, css: null, js: null
  });

  // blog-modern
  register({
    id: 'blog-modern',
    name: 'Blog Modern',
    level: 'Intermedio',
    categories: ['all', 'blog', 'intermedio'],
    tags: ['Post Grid', 'Sidebar', 'Search', 'Tags', 'Newsletter'],
    stack: 'HTML5 · CSS3 · JS',
    description: 'Modern blog layout with featured hero post, 3-column post grid, sticky sidebar and newsletter widget.',
    thumbnail: `<div class="thumb-blog">
      <div class="thumb__nav"></div>
      <div class="thumb__hero-sm"></div>
      <div class="thumb__blog-layout">
        <div class="thumb__posts"><div></div><div></div><div></div></div>
        <div class="thumb__sidebar-sm"><div></div><div></div></div>
      </div>
    </div>`,
    html: null, css: null, js: null
  });

  // portfolio-dev (demo card — no files)
  register({
    id: 'portfolio-dev',
    name: 'Portfolio Dev',
    level: 'Intermedio',
    categories: ['all', 'portfolio', 'intermedio'],
    tags: ['About', 'Skills', 'Projects', 'Filters', 'Contact'],
    stack: 'HTML5 · CSS3 · JS',
    description: 'Developer portfolio with animated stats, filterable project gallery, skill progress bars and contact form.',
    thumbnail: `<div class="thumb-portfolio">
      <div class="thumb__avatar-hero"></div>
      <div class="thumb__grid"><div></div><div></div><div></div></div>
      <div class="thumb__skills"><div></div><div></div><div></div></div>
    </div>`,
    html: null, css: null, js: null,
    comingSoon: true
  });

  // ecommerce (demo card)
  register({
    id: 'ecommerce-shop',
    name: 'E-commerce Shop',
    level: 'Avanzado',
    categories: ['all', 'ecommerce', 'avanzado'],
    tags: ['Product Grid', 'Cart', 'Filters', 'Search', 'Checkout'],
    stack: 'HTML5 · CSS3 · JS',
    description: 'Complete e-commerce product listing with cart sidebar, category filters, product cards and checkout flow.',
    thumbnail: `<div class="thumb-ecommerce">
      <div class="thumb__nav"></div>
      <div class="thumb__shop-layout">
        <div class="thumb__filters-col"></div>
        <div class="thumb__products"><div></div><div></div><div></div><div></div><div></div><div></div></div>
      </div>
    </div>`,
    html: null, css: null, js: null,
    comingSoon: true
  });

  // landing-minimal (demo card)
  register({
    id: 'landing-minimal',
    name: 'Landing Minimal',
    level: 'Básico',
    categories: ['all', 'basico'],
    tags: ['Clean', 'Hero', 'Features', 'CTA'],
    stack: 'HTML5 · CSS3',
    description: 'Clean minimalist landing page, single column layout with hero, three features and a CTA. Perfect starting point.',
    thumbnail: `<div class="thumb-minimal">
      <div class="thumb__nav-min"></div>
      <div class="thumb__center-block"></div>
      <div class="thumb__mini-feats"><div></div><div></div><div></div></div>
      <div class="thumb__cta-block"></div>
    </div>`,
    html: null, css: null, js: null,
    comingSoon: true
  });

  // ── Lazy code loader ──────────────────────────────────────────────────────
  // Loads template code from /templates/ folder files or falls back to embedded.
  async function loadCode(id) {
    const tpl = registry[id];
    if (!tpl) return null;
    if (tpl.html !== null) return tpl; // already loaded or embedded

    // Attempt fetch (works when served via HTTP server)
    const base = `templates/${id}`;
    try {
      const [htmlRes, cssRes, jsRes] = await Promise.all([
        fetch(`${base}/index.html`),
        fetch(`${base}/styles.css`),
        fetch(`${base}/script.js`)
      ]);
      if (htmlRes.ok && cssRes.ok && jsRes.ok) {
        tpl.html = await htmlRes.text();
        tpl.css  = await cssRes.text();
        tpl.js   = await jsRes.text();
        return tpl;
      }
    } catch {}

    // Fallback: use embedded code stubs
    tpl.html = _embeddedHTML[id] || `<!-- ${tpl.name} HTML -->\n<!-- Serve via HTTP to load full source -->`;
    tpl.css  = _embeddedCSS[id]  || `/* ${tpl.name} CSS */`;
    tpl.js   = _embeddedJS[id]   || `// ${tpl.name} JS`;
    return tpl;
  }

  // ── Embedded code stubs (used as fallback for file:// protocol) ───────────
  const _embeddedHTML = {
    'landing-pro': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Pro — CoreSystem Template</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- See templates/landing-pro/index.html for full source -->
  <script defer src="script.js"></script>
</body>
</html>`,
    'dashboard-admin': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Admin — CoreSystem Template</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- See templates/dashboard-admin/index.html for full source -->
  <script defer src="script.js"></script>
</body>
</html>`,
    'blog-modern': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog Modern — CoreSystem Template</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- See templates/blog-modern/index.html for full source -->
  <script defer src="script.js"></script>
</body>
</html>`
  };

  const _embeddedCSS = { 'landing-pro': '/* See templates/landing-pro/styles.css */', 'dashboard-admin': '/* See templates/dashboard-admin/styles.css */', 'blog-modern': '/* See templates/blog-modern/styles.css */' };
  const _embeddedJS  = { 'landing-pro': '// See templates/landing-pro/script.js', 'dashboard-admin': '// See templates/dashboard-admin/script.js', 'blog-modern': '// See templates/blog-modern/script.js' };

  return { register, get, getAll, filter, renderCard, renderGrid, loadCode };
})();
