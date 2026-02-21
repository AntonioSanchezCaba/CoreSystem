/**
 * CoreSystem — Dashboard Template Script
 * Standalone, production-ready JavaScript
 * Features: sidebar toggle, toast notifications, theme toggle,
 *           active nav link highlighting, table interactions.
 */

/* ========================= Utilities ========================= */
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

/* ========================= Toast Notifications ========================= */
const CoreToast = {
  container: null,

  _getContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      Object.assign(this.container.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: '9999',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      });
      document.body.appendChild(this.container);
    }
    return this.container;
  },

  show(message, type = 'default') {
    const container = this._getContainer();
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
    toast.setAttribute('role', 'alert');
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
      maxWidth: '360px',
      minWidth: '220px',
      cursor: 'pointer',
    });
    toast.innerHTML = `
      <i class="ri ${icons[type] || icons.default}" style="font-size:1rem;flex-shrink:0;"></i>
      <span style="flex:1">${message}</span>
      <i class="ri-close-line" style="font-size:1rem;opacity:.8;flex-shrink:0;"></i>
    `;

    toast.addEventListener('click', () => dismiss(toast));
    container.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      });
    });

    function dismiss(t) {
      t.style.opacity = '0';
      t.style.transform = 'translateX(40px)';
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    }

    setTimeout(() => dismiss(toast), 3500);
  },
};

// Expose globally so inline onclick handlers work
window.CoreToast = CoreToast;

/* ========================= Sidebar Toggle ========================= */
function initSidebar() {
  const sidebar  = $('.sidebar');
  const overlay  = $('.sidebar-overlay');
  const toggleBtn = $('[data-toggle-sidebar]');

  function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('visible');
    document.body.style.overflow = '';
  }

  toggleBtn?.addEventListener('click', () => {
    if (sidebar?.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay?.addEventListener('click', closeSidebar);

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSidebar();
  });
}

/* ========================= Active Sidebar Link ========================= */
function initSidebarNav() {
  const links = $$('.sidebar-link');

  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

/* ========================= Theme Toggle ========================= */
function initTheme() {
  const btn = $('[data-theme-toggle]');
  if (!btn) return;

  const stored = localStorage.getItem('dashboard-theme') || 'light';
  if (stored === 'dark') document.body.classList.add('dark');

  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('dashboard-theme', isDark ? 'dark' : 'light');
    const icon = btn.querySelector('i');
    if (icon) icon.className = isDark ? 'ri-sun-line' : 'ri-moon-line';
  });
}

/* ========================= Navbar Scroll ========================= */
function initNavbar() {
  const header = $('header, .topbar, .main-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ========================= Table Row Hover ========================= */
function initTable() {
  $$('.table tbody tr').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      $$('.table tbody tr').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
    });
  });
}

/* ========================= Stat Cards Animation ========================= */
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
        const eased = 1 - Math.pow(1 - progress, 3);
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

/* ========================= Init ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initSidebarNav();
  initTheme();
  initNavbar();
  initTable();
  initCounters();
});
