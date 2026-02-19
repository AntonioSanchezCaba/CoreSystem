/**
 * CoreSystem Platform — Block Library
 * Structural block definitions for the Creative Engine.
 * Each block produces HTML, CSS and JS fragments combined by the compiler.
 */
const BlockLibrary = (() => {
  'use strict';

  // ── Block registry ────────────────────────────────────────────────────────
  const blocks = {};

  function register(def) { blocks[def.id] = def; }
  function get(id) { return blocks[id]; }
  function getAll() { return Object.values(blocks); }
  function getByCategory(cat) { return getAll().filter(b => b.category === cat); }

  // ── Base CSS shared across compiled pages ─────────────────────────────────
  const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-sans, system-ui, sans-serif); background: var(--bg, #F8FAFC); color: var(--text, #0F172A); line-height: 1.6; }
img { display: block; max-width: 100%; }
a { color: var(--primary, #2563EB); text-decoration: none; }
.container { max-width: var(--max-w, 1200px); margin: 0 auto; padding: 0 1.5rem; }
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
.grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
.grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
.flex { display: flex; } .flex-col { flex-direction: column; }
.items-center { align-items: center; } .justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.text-center { text-align: center; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.py-16 { padding-top: 4rem; padding-bottom: 4rem; }
.py-24 { padding-top: 6rem; padding-bottom: 6rem; }
.mb-4 { margin-bottom: 1rem; } .mb-6 { margin-bottom: 1.5rem; } .mb-8 { margin-bottom: 2rem; }
.gap-4 { gap: 1rem; } .gap-6 { gap: 1.5rem; }
.btn { display: inline-flex; align-items: center; gap: .4rem; padding: .6rem 1.4rem; border-radius: var(--radius, 8px); border: 1.5px solid transparent; font-size: .9rem; font-weight: 600; cursor: pointer; transition: all .2s; text-decoration: none; }
.btn-primary { background: var(--primary, #2563EB); color: #fff; border-color: var(--primary, #2563EB); }
.btn-primary:hover { opacity: .88; transform: translateY(-1px); }
.btn-outline { background: transparent; color: var(--primary, #2563EB); border-color: var(--primary, #2563EB); }
.btn-outline:hover { background: var(--primary, #2563EB); color: #fff; }
`.trim();

  // ── NAVBAR ────────────────────────────────────────────────────────────────
  register({
    id: 'navbar', name: 'Navbar', icon: '▬',
    category: 'layout', description: 'Barra de navegación sticky con logo y links',
    defaultConfig: { brand: 'CoreSystem', links: 'Inicio, Sobre, Servicios, Contacto', cta: 'Comenzar', sticky: true },
    html: (c) => `
<nav class="cs-navbar${c.sticky ? ' cs-navbar--sticky' : ''}">
  <div class="container flex justify-between items-center">
    <a href="#" class="cs-navbar__brand">${c.brand || 'CoreSystem'}</a>
    <button class="cs-navbar__toggle" aria-label="Menú" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <ul class="cs-navbar__menu">
      ${(c.links || 'Inicio,Sobre,Servicios,Contacto').split(',').map(l =>
        `<li><a href="#" class="cs-navbar__link">${l.trim()}</a></li>`).join('')}
      ${c.cta ? `<li><a href="#" class="btn btn-primary">${c.cta}</a></li>` : ''}
    </ul>
  </div>
</nav>`,
    css: () => `
.cs-navbar { background: var(--surface, #fff); border-bottom: 1px solid var(--border, #E2E8F0); padding: 0 0; height: 64px; display: flex; align-items: center; z-index: 100; }
.cs-navbar--sticky { position: sticky; top: 0; }
.cs-navbar__brand { font-size: 1.25rem; font-weight: 800; color: var(--primary, #2563EB); letter-spacing: -.02em; }
.cs-navbar__menu { display: flex; align-items: center; gap: 1.5rem; list-style: none; }
.cs-navbar__link { font-size: .9rem; font-weight: 500; color: var(--text, #0F172A); transition: color .2s; }
.cs-navbar__link:hover { color: var(--primary, #2563EB); }
.cs-navbar__toggle { display: none; flex-direction: column; gap: 4px; background: none; border: none; cursor: pointer; padding: 6px; }
.cs-navbar__toggle span { display: block; width: 22px; height: 2px; background: var(--text, #0F172A); border-radius: 2px; transition: .2s; }
@media (max-width: 768px) {
  .cs-navbar__toggle { display: flex; }
  .cs-navbar__menu { display: none; position: absolute; top: 64px; left: 0; right: 0; background: var(--surface, #fff); flex-direction: column; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border, #E2E8F0); gap: 1rem; }
  .cs-navbar__menu.is-open { display: flex; }
}`,
    js: () => `
document.querySelectorAll('.cs-navbar__toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const menu = btn.closest('.cs-navbar').querySelector('.cs-navbar__menu');
    const open = menu.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open);
  });
});`
  });

  // ── HERO ──────────────────────────────────────────────────────────────────
  register({
    id: 'hero', name: 'Hero Section', icon: '★',
    category: 'content', description: 'Sección hero con headline, subtítulo y CTA',
    defaultConfig: { title: 'Build Professional Websites Faster', subtitle: 'A complete frontend ecosystem. No frameworks. No dependencies. Just clean code ready for production.', cta: 'Get Started', cta2: 'View Templates', badge: 'New — v2.0' },
    html: (c) => `
<section class="cs-hero">
  <div class="container text-center">
    ${c.badge ? `<span class="cs-hero__badge">${c.badge}</span>` : ''}
    <h1 class="cs-hero__title">${c.title}</h1>
    <p class="cs-hero__sub">${c.subtitle}</p>
    <div class="cs-hero__actions">
      ${c.cta ? `<a href="#" class="btn btn-primary">${c.cta}</a>` : ''}
      ${c.cta2 ? `<a href="#" class="btn btn-outline">${c.cta2}</a>` : ''}
    </div>
  </div>
</section>`,
    css: () => `
.cs-hero { padding: 6rem 0 5rem; background: linear-gradient(135deg, var(--primary, #2563EB) 0%, var(--accent, #7C3AED) 100%); color: #fff; }
.cs-hero__badge { display: inline-block; padding: .3rem .9rem; background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3); border-radius: 999px; font-size: .8rem; font-weight: 600; letter-spacing: .04em; margin-bottom: 1.5rem; }
.cs-hero__title { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.15; letter-spacing: -.03em; margin-bottom: 1.5rem; }
.cs-hero__sub { font-size: 1.15rem; color: rgba(255,255,255,.85); max-width: 600px; margin: 0 auto 2.5rem; line-height: 1.7; }
.cs-hero__actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.cs-hero__actions .btn-primary { background: #fff; color: var(--primary, #2563EB); border-color: #fff; }
.cs-hero__actions .btn-outline { color: #fff; border-color: rgba(255,255,255,.5); }
.cs-hero__actions .btn-outline:hover { background: rgba(255,255,255,.15); }`,
    js: () => ''
  });

  // ── FEATURE GRID ──────────────────────────────────────────────────────────
  register({
    id: 'features', name: 'Feature Grid', icon: '⊞',
    category: 'content', description: 'Grid de características con iconos y descripción',
    defaultConfig: { title: 'Everything You Need', subtitle: 'A complete set of professional building blocks for your next project.', cols: '3', items: 'Zero Dependencies|Pure HTML5 CSS3 and Vanilla JS — no build tools required.;Fully Responsive|Mobile-first design that looks perfect on every screen size.;Production Ready|Clean, commented, scalable architecture ready to ship.' },
    html: (c) => {
      const cols = c.cols || '3';
      const items = (c.items || '').split(';').map(i => {
        const [t, d] = i.split('|'); return { t: (t||'').trim(), d: (d||'').trim() };
      });
      const icons = ['⚡','🎨','📦','🛡','🔧','🚀','💡','🌐','✓'];
      return `
<section class="cs-features py-24">
  <div class="container">
    ${c.title ? `<div class="text-center mb-8"><h2 class="cs-section-title">${c.title}</h2>${c.subtitle ? `<p class="cs-section-sub">${c.subtitle}</p>` : ''}</div>` : ''}
    <div class="grid-${cols}">
      ${items.map((item, i) => `
      <div class="cs-feature-card">
        <div class="cs-feature-card__icon">${icons[i % icons.length]}</div>
        <h3 class="cs-feature-card__title">${item.t}</h3>
        <p class="cs-feature-card__desc">${item.d}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;
    },
    css: () => `
.cs-section-title { font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 800; letter-spacing: -.03em; margin-bottom: .75rem; }
.cs-section-sub { font-size: 1.05rem; color: var(--text-2, #64748B); max-width: 560px; margin: 0 auto; }
.cs-feature-card { background: var(--surface, #fff); border: 1px solid var(--border, #E2E8F0); border-radius: calc(var(--radius, 8px) * 1.5); padding: 2rem; transition: box-shadow .25s, transform .25s; }
.cs-feature-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,.08); transform: translateY(-3px); }
.cs-feature-card__icon { font-size: 2rem; margin-bottom: 1rem; }
.cs-feature-card__title { font-size: 1.05rem; font-weight: 700; margin-bottom: .5rem; }
.cs-feature-card__desc { font-size: .9rem; color: var(--text-2, #64748B); line-height: 1.65; }`,
    js: () => ''
  });

  // ── PRICING ───────────────────────────────────────────────────────────────
  register({
    id: 'pricing', name: 'Pricing Table', icon: '💲',
    category: 'content', description: 'Tabla de precios con 3 planes',
    defaultConfig: { title: 'Simple, Transparent Pricing', featured: '1', plan1: 'Starter|Free|For individuals;Up to 5 projects;Community support;Basic components', plan2: 'Pro|$29/mo|For professionals;Unlimited projects;Priority support;All components;Advanced templates', plan3: 'Enterprise|Custom|For teams;Everything in Pro;Dedicated support;Custom integrations;SLA guarantee' },
    html: (c) => {
      const plans = [c.plan1 || '', c.plan2 || '', c.plan3 || ''].map((p, i) => {
        const [name, price, ...feats] = p.split(';');
        const [pname, pprice] = (name || `Plan ${i+1}`).split('|');
        const isFeatured = String(c.featured) === String(i);
        return { name: pname, price: pprice || '–', feats: feats.join(';').split(';'), featured: isFeatured };
      });
      return `
<section class="cs-pricing py-24">
  <div class="container">
    ${c.title ? `<div class="text-center mb-8"><h2 class="cs-section-title">${c.title}</h2></div>` : ''}
    <div class="cs-pricing__grid">
      ${plans.map(p => `
      <div class="cs-pricing__card${p.featured ? ' cs-pricing__card--featured' : ''}">
        ${p.featured ? '<span class="cs-pricing__badge">Most Popular</span>' : ''}
        <h3 class="cs-pricing__name">${p.name}</h3>
        <div class="cs-pricing__price">${p.price}</div>
        <ul class="cs-pricing__feats">
          ${p.feats.filter(Boolean).map(f => `<li>✓ ${f.replace(/.*\|/,'')}</li>`).join('')}
        </ul>
        <a href="#" class="btn ${p.featured ? 'btn-primary' : 'btn-outline'} cs-pricing__cta">Get Started</a>
      </div>`).join('')}
    </div>
  </div>
</section>`;
    },
    css: () => `
.cs-pricing__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; align-items: start; max-width: 900px; margin: 0 auto; }
.cs-pricing__card { background: var(--surface, #fff); border: 2px solid var(--border, #E2E8F0); border-radius: calc(var(--radius, 8px) * 2); padding: 2rem; position: relative; }
.cs-pricing__card--featured { border-color: var(--primary, #2563EB); box-shadow: 0 20px 60px rgba(37,99,235,.15); transform: scale(1.04); }
.cs-pricing__badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary, #2563EB); color: #fff; font-size: .7rem; font-weight: 700; padding: .2rem .8rem; border-radius: 999px; white-space: nowrap; }
.cs-pricing__name { font-size: 1rem; font-weight: 700; color: var(--text-2, #64748B); text-transform: uppercase; letter-spacing: .08em; margin-bottom: .5rem; }
.cs-pricing__price { font-size: 2.4rem; font-weight: 800; letter-spacing: -.03em; margin-bottom: 1.5rem; }
.cs-pricing__feats { list-style: none; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: .6rem; }
.cs-pricing__feats li { font-size: .9rem; color: var(--text-2, #64748B); }
.cs-pricing__cta { width: 100%; justify-content: center; }`,
    js: () => ''
  });

  // ── FAQ ───────────────────────────────────────────────────────────────────
  register({
    id: 'faq', name: 'FAQ Accordion', icon: '?',
    category: 'content', description: 'Preguntas frecuentes en acordeón interactivo',
    defaultConfig: { title: 'Frequently Asked Questions', items: 'What is CoreSystem?|CoreSystem is a professional frontend ecosystem built with pure HTML5, CSS3 and Vanilla JavaScript — no frameworks required.;Is it free to use?|Yes, CoreSystem is completely free and open source. Use it for personal and commercial projects.;Do I need a build tool?|No. Simply link styles.css and script.js in your HTML. No Node.js, no npm, no webpack needed.;Is it responsive?|Absolutely. Every template and component is mobile-first and fully responsive.' },
    html: (c) => {
      const items = (c.items || '').split(';').map(i => { const [q, a] = i.split('|'); return { q, a }; });
      return `
<section class="cs-faq py-24">
  <div class="container" style="max-width:720px">
    ${c.title ? `<div class="text-center mb-8"><h2 class="cs-section-title">${c.title}</h2></div>` : ''}
    <div class="cs-faq__list">
      ${items.map((item, i) => `
      <div class="cs-faq__item">
        <button class="cs-faq__q" aria-expanded="false" aria-controls="faq-a-${i}">
          <span>${item.q || 'Question'}</span>
          <span class="cs-faq__arrow">›</span>
        </button>
        <div class="cs-faq__a" id="faq-a-${i}" hidden>${item.a || 'Answer goes here.'}</div>
      </div>`).join('')}
    </div>
  </div>
</section>`;
    },
    css: () => `
.cs-faq__list { display: flex; flex-direction: column; gap: .75rem; }
.cs-faq__item { background: var(--surface, #fff); border: 1px solid var(--border, #E2E8F0); border-radius: var(--radius, 8px); overflow: hidden; }
.cs-faq__q { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.1rem 1.25rem; background: none; border: none; cursor: pointer; font-size: .95rem; font-weight: 600; color: var(--text, #0F172A); text-align: left; }
.cs-faq__arrow { font-size: 1.3rem; transition: transform .25s; flex-shrink: 0; color: var(--text-2, #64748B); }
.cs-faq__item.is-open .cs-faq__arrow { transform: rotate(90deg); }
.cs-faq__a { padding: 0 1.25rem 1.1rem; font-size: .9rem; color: var(--text-2, #64748B); line-height: 1.7; }`,
    js: () => `
document.querySelectorAll('.cs-faq__q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.cs-faq__item');
    const answer = item.querySelector('.cs-faq__a');
    const open = item.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open);
    answer.hidden = !open;
  });
});`
  });

  // ── TESTIMONIALS ──────────────────────────────────────────────────────────
  register({
    id: 'testimonials', name: 'Testimonials', icon: '❝',
    category: 'content', description: 'Cards de testimonios de clientes',
    defaultConfig: { title: 'What Our Users Say', items: 'Alex Rivera|Lead Developer at TechCorp|CoreSystem saved us weeks of setup time. Clean architecture, zero config needed.|⭐⭐⭐⭐⭐;Mia Chen|Freelance Designer|Finally, a professional template system without the bloat. Exactly what I was looking for.|⭐⭐⭐⭐⭐;James Park|Startup Founder|We shipped our MVP in record time. The components are production-quality right out of the box.|⭐⭐⭐⭐⭐' },
    html: (c) => {
      const items = (c.items || '').split(';').map(i => { const [name, role, quote, stars] = i.split('|'); return { name, role, quote, stars }; });
      return `
<section class="cs-testimonials py-24" style="background: var(--bg, #F8FAFC);">
  <div class="container">
    ${c.title ? `<div class="text-center mb-8"><h2 class="cs-section-title">${c.title}</h2></div>` : ''}
    <div class="grid-3">
      ${items.map(t => `
      <div class="cs-testimonial">
        <div class="cs-testimonial__stars">${t.stars || '⭐⭐⭐⭐⭐'}</div>
        <p class="cs-testimonial__quote">"${t.quote || ''}"</p>
        <div class="cs-testimonial__author">
          <div class="cs-testimonial__avatar">${(t.name || 'U').charAt(0)}</div>
          <div><div class="cs-testimonial__name">${t.name || ''}</div><div class="cs-testimonial__role">${t.role || ''}</div></div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;
    },
    css: () => `
.cs-testimonial { background: var(--surface, #fff); border: 1px solid var(--border, #E2E8F0); border-radius: calc(var(--radius, 8px) * 1.5); padding: 1.75rem; }
.cs-testimonial__stars { margin-bottom: .75rem; font-size: .9rem; }
.cs-testimonial__quote { font-size: .95rem; color: var(--text, #0F172A); line-height: 1.7; margin-bottom: 1.25rem; font-style: italic; }
.cs-testimonial__author { display: flex; align-items: center; gap: .75rem; }
.cs-testimonial__avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--primary, #2563EB); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
.cs-testimonial__name { font-size: .9rem; font-weight: 700; }
.cs-testimonial__role { font-size: .8rem; color: var(--text-2, #64748B); }`,
    js: () => ''
  });

  // ── CTA SECTION ───────────────────────────────────────────────────────────
  register({
    id: 'cta', name: 'CTA Section', icon: '→',
    category: 'content', description: 'Llamada a la acción con fondo gradiente',
    defaultConfig: { title: 'Ready to Build Something Great?', subtitle: 'Start with CoreSystem and ship professional quality websites in record time.', cta: 'Get Started Free', cta2: 'View Documentation' },
    html: (c) => `
<section class="cs-cta py-24 text-center">
  <div class="container">
    <h2 class="cs-cta__title">${c.title}</h2>
    <p class="cs-cta__sub">${c.subtitle}</p>
    <div class="cs-hero__actions">
      ${c.cta ? `<a href="#" class="btn cs-cta__btn-primary">${c.cta}</a>` : ''}
      ${c.cta2 ? `<a href="#" class="btn cs-cta__btn-outline">${c.cta2}</a>` : ''}
    </div>
  </div>
</section>`,
    css: () => `
.cs-cta { background: linear-gradient(135deg, var(--primary, #2563EB) 0%, var(--accent, #7C3AED) 100%); color: #fff; }
.cs-cta__title { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800; letter-spacing: -.03em; margin-bottom: 1rem; }
.cs-cta__sub { font-size: 1.1rem; color: rgba(255,255,255,.85); max-width: 520px; margin: 0 auto 2.5rem; }
.cs-cta__btn-primary { background: #fff; color: var(--primary, #2563EB); border-color: #fff; }
.cs-cta__btn-outline { color: #fff; border-color: rgba(255,255,255,.5); }`,
    js: () => ''
  });

  // ── STATS ─────────────────────────────────────────────────────────────────
  register({
    id: 'stats', name: 'Stats / Metrics', icon: '📊',
    category: 'content', description: 'Métricas numéricas con animación de contador',
    defaultConfig: { items: '10K+|Active Users;98%|Satisfaction;50+|Components;0|Dependencies' },
    html: (c) => {
      const items = (c.items || '').split(';').map(i => { const [val, label] = i.split('|'); return { val, label }; });
      return `
<section class="cs-stats py-16">
  <div class="container">
    <div class="cs-stats__grid">
      ${items.map(s => `<div class="cs-stat"><div class="cs-stat__val" data-target="${s.val}">${s.val}</div><div class="cs-stat__label">${s.label}</div></div>`).join('')}
    </div>
  </div>
</section>`;
    },
    css: () => `
.cs-stats { background: var(--surface, #fff); border-top: 1px solid var(--border, #E2E8F0); border-bottom: 1px solid var(--border, #E2E8F0); }
.cs-stats__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 2rem; text-align: center; }
.cs-stat__val { font-size: 2.4rem; font-weight: 800; color: var(--primary, #2563EB); letter-spacing: -.03em; }
.cs-stat__label { font-size: .875rem; color: var(--text-2, #64748B); font-weight: 500; margin-top: .25rem; }`,
    js: () => ''
  });

  // ── FOOTER ────────────────────────────────────────────────────────────────
  register({
    id: 'footer', name: 'Footer', icon: '▁',
    category: 'layout', description: 'Footer corporativo con columnas y copyright',
    defaultConfig: { brand: 'CoreSystem', tagline: 'Professional frontend ecosystem.', cols: 'Product|Templates,Components,Design System,Changelog;Resources|Documentation,Blog,Community,Support;Company|About,Careers,Privacy,Terms' },
    html: (c) => {
      const colData = (c.cols || '').split(';').map(col => {
        const [title, ...links] = col.split(',');
        return { title, links: links.join(',').split(',') };
      });
      return `
<footer class="cs-footer">
  <div class="container">
    <div class="cs-footer__top">
      <div class="cs-footer__brand">
        <div class="cs-footer__logo">${c.brand || 'CoreSystem'}</div>
        <p class="cs-footer__tagline">${c.tagline || ''}</p>
      </div>
      ${colData.map(col => `
      <div>
        <p class="cs-footer__col-title">${col.title}</p>
        ${col.links.map(l => `<a href="#" class="cs-footer__link">${l.trim()}</a>`).join('')}
      </div>`).join('')}
    </div>
    <div class="cs-footer__bottom">
      <p>© ${new Date().getFullYear()} ${c.brand || 'CoreSystem'}. All rights reserved.</p>
    </div>
  </div>
</footer>`;
    },
    css: () => `
.cs-footer { background: var(--gray-900, #0F172A); color: #94A3B8; padding: 4rem 0 2rem; }
.cs-footer__top { display: grid; grid-template-columns: 1.5fr repeat(auto-fit, minmax(140px, 1fr)); gap: 3rem; margin-bottom: 3rem; }
.cs-footer__logo { font-size: 1.2rem; font-weight: 800; color: #fff; margin-bottom: .5rem; }
.cs-footer__tagline { font-size: .85rem; line-height: 1.6; }
.cs-footer__col-title { font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #fff; margin-bottom: 1rem; }
.cs-footer__link { display: block; font-size: .875rem; color: #64748B; margin-bottom: .5rem; transition: color .2s; }
.cs-footer__link:hover { color: #fff; }
.cs-footer__bottom { border-top: 1px solid #1E293B; padding-top: 1.5rem; font-size: .8rem; }
@media (max-width: 768px) { .cs-footer__top { grid-template-columns: 1fr 1fr; } }`,
    js: () => ''
  });

  // ── SECTION WRAPPER ───────────────────────────────────────────────────────
  register({
    id: 'section', name: 'Section', icon: '□',
    category: 'layout', description: 'Sección genérica con título y área de contenido',
    defaultConfig: { title: 'Section Title', subtitle: 'Section subtitle goes here describing the content.', bg: 'default' },
    html: (c) => `
<section class="cs-section py-24${c.bg === 'alt' ? ' cs-section--alt' : ''}">
  <div class="container">
    ${c.title ? `<div class="text-center mb-8"><h2 class="cs-section-title">${c.title}</h2>${c.subtitle ? `<p class="cs-section-sub">${c.subtitle}</p>` : ''}</div>` : ''}
    <!-- Section content here -->
    <div style="min-height:120px;border:2px dashed var(--border,#E2E8F0);border-radius:var(--radius,8px);display:flex;align-items:center;justify-content:center;color:var(--text-2,#64748B);font-size:.9rem;">Add blocks here</div>
  </div>
</section>`,
    css: () => `.cs-section--alt { background: var(--gray-50, #F8FAFC); }`,
    js: () => ''
  });

  // ── CARD GRID ─────────────────────────────────────────────────────────────
  register({
    id: 'cards', name: 'Card Grid', icon: '▦',
    category: 'content', description: 'Grid de cards con imagen, título y descripción',
    defaultConfig: { title: 'Our Services', cols: '3', items: 'Web Design|Professional UI/UX design that converts visitors into customers.;Development|Clean, maintainable code built on modern web standards.;Consulting|Expert guidance on architecture, performance, and scalability.' },
    html: (c) => {
      const items = (c.items || '').split(';').map(i => { const [t, d] = i.split('|'); return { t, d }; });
      const cols = c.cols || '3';
      return `
<section class="cs-cards py-24">
  <div class="container">
    ${c.title ? `<div class="text-center mb-8"><h2 class="cs-section-title">${c.title}</h2></div>` : ''}
    <div class="grid-${cols}">
      ${items.map(item => `
      <div class="cs-card">
        <div class="cs-card__header"></div>
        <div class="cs-card__body">
          <h3 class="cs-card__title">${item.t || 'Card Title'}</h3>
          <p class="cs-card__desc">${item.d || 'Card description goes here.'}</p>
          <a href="#" class="cs-card__link">Learn more →</a>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;
    },
    css: () => `
.cs-card { background: var(--surface, #fff); border: 1px solid var(--border, #E2E8F0); border-radius: calc(var(--radius, 8px) * 1.5); overflow: hidden; transition: box-shadow .25s, transform .25s; }
.cs-card:hover { box-shadow: 0 16px 40px rgba(0,0,0,.1); transform: translateY(-4px); }
.cs-card__header { height: 160px; background: linear-gradient(135deg, var(--primary, #2563EB), var(--accent, #7C3AED)); }
.cs-card__body { padding: 1.5rem; }
.cs-card__title { font-size: 1rem; font-weight: 700; margin-bottom: .5rem; }
.cs-card__desc { font-size: .875rem; color: var(--text-2, #64748B); line-height: 1.65; margin-bottom: 1rem; }
.cs-card__link { font-size: .875rem; font-weight: 600; color: var(--primary, #2563EB); }`,
    js: () => ''
  });

  // ── PUBLIC API ────────────────────────────────────────────────────────────
  return { register, get, getAll, getByCategory, BASE_CSS };
})();
