/**
 * CoreSystem — Portfolio Template Script
 * Standalone, production-ready JavaScript
 * Features: navbar, mobile nav, reveal animations, counter animation,
 *           tabs, tooltips, smooth scroll, toast notifications.
 */

/* ========================= Utilities ========================= */
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

/* ========================= Toast Notifications ========================= */
const CoreSystem = {
  toast(message, type = 'default') {
    let container = $('#toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      Object.assign(container.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: '9999',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      });
      document.body.appendChild(container);
    }

    const icons = {
      success: 'ri-check-line',
      error:   'ri-error-warning-line',
      warning: 'ri-alert-line',
      info:    'ri-information-line',
      default: 'ri-notification-line',
    };
    const colors = {
      success: '#10b981',
      error:   '#ef4444',
      warning: '#f59e0b',
      info:    '#2563eb',
      default: '#334155',
    };

    const toast = document.createElement('div');
    Object.assign(toast.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 16px',
      borderRadius: '10px',
      background: colors[type] || colors.default,
      color: '#fff',
      fontSize: '.88rem',
      boxShadow: '0 8px 32px rgba(0,0,0,.18)',
      pointerEvents: 'auto',
      opacity: '0',
      transform: 'translateX(40px)',
      transition: 'opacity .3s ease, transform .3s ease',
      maxWidth: '340px',
      cursor: 'pointer',
    });
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <i class="ri ${icons[type] || icons.default}" style="font-size:1rem;flex-shrink:0;"></i>
      <span style="flex:1">${message}</span>
    `;

    function dismiss() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }

    toast.addEventListener('click', dismiss);
    container.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      });
    });

    setTimeout(dismiss, 3500);
  },
};

// Expose globally so onclick handlers work
window.CoreSystem = CoreSystem;

/* ========================= Navbar ========================= */
function initNavbar() {
  const navbar    = $('.navbar');
  const toggleBtn = $('.nav-toggle');
  const navMenu   = $('.nav-menu');

  // Scroll shadow
  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // Mobile toggle
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('nav-open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      const icon = toggleBtn.querySelector('i');
      if (icon) icon.className = isOpen ? 'ri-close-line' : 'ri-menu-line';
    });
  }

  // Smooth scroll + close menu on nav link click
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = $(href);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        navMenu?.classList.remove('nav-open');
        toggleBtn?.setAttribute('aria-expanded', 'false');
        const icon = toggleBtn?.querySelector('i');
        if (icon) icon.className = 'ri-menu-line';
      }
    });
  });

  // Active nav link on scroll
  const sections = $$('section[id]');
  const navLinks = $$('.nav-link');

  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => link.classList.remove('active'));
        const active = navLinks.find(l => l.getAttribute('href') === `#${entry.target.id}`);
        active?.classList.add('active');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => sectionObserver.observe(s));
}

/* ========================= Reveal Animations ========================= */
function initReveal() {
  const elements = $$('.reveal, .reveal-left, .reveal-right');
  if (!elements.length || !window.IntersectionObserver) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  elements.forEach(el => observer.observe(el));
}

/* ========================= Counter Animation ========================= */
function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length || !window.IntersectionObserver) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const isDecimal = String(target).includes('.');
      const duration = 1200;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
        const value = target * eased;
        el.textContent = (isDecimal ? value.toFixed(1) : Math.round(value)) + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ========================= Tabs ========================= */
function initTabs() {
  const tabBtns = $$('[data-tab-target]');
  if (!tabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSel = btn.dataset.tabTarget;
      const target = $(targetSel);
      if (!target) return;

      // Determine the group (siblings with same parent)
      const container = btn.closest('.tabs-header');
      if (container) {
        $$('[data-tab-target]', container).forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');

      // Hide all sibling tab contents
      const parentSection = btn.closest('section') || document;
      $$('.tab-content', parentSection).forEach(pane => pane.classList.remove('active'));
      target.classList.add('active');
    });
  });
}

/* ========================= Tooltips ========================= */
function initTooltips() {
  $$('[data-tooltip]').forEach(el => {
    let tip = null;

    function show() {
      tip = document.createElement('div');
      tip.textContent = el.dataset.tooltip;
      Object.assign(tip.style, {
        position: 'absolute',
        background: '#0f172a',
        color: '#fff',
        padding: '5px 10px',
        borderRadius: '6px',
        fontSize: '.76rem',
        fontWeight: '500',
        whiteSpace: 'nowrap',
        zIndex: '9990',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity .2s ease',
      });
      document.body.appendChild(tip);

      const rect = el.getBoundingClientRect();
      tip.style.left = `${rect.left + rect.width / 2 - tip.offsetWidth / 2 + window.scrollX}px`;
      tip.style.top  = `${rect.top - tip.offsetHeight - 8 + window.scrollY}px`;

      requestAnimationFrame(() => { tip.style.opacity = '1'; });
    }

    function hide() {
      tip?.remove();
      tip = null;
    }

    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', show);
    el.addEventListener('blur', hide);
  });
}

/* ========================= Init ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initReveal();
  initCounters();
  initTabs();
  initTooltips();
});
