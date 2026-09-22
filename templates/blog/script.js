/**
 * CoreSystem — Blog Template Script
 * Standalone, production-ready JavaScript
 * Includes: navigation, reveal, tabs, accordion, modals, counters,
 *           form validation, article search, and toast notifications.
 */

/* ========================= Configuration ========================= */
const CONFIG = {
  revealThreshold:  0.15,
  revealRootMargin: '0px 0px -60px 0px',
  toastDuration:    3500,
  searchDebounce:   220,  // ms to debounce search input
};

/* ========================= Selectors / State ========================= */
const State = {
  search: {
    debounceTimer: null,
    query: '',
  },
};

/* ========================= Private Functions ========================= */

/**
 * Debounce utility — delays execution until after wait ms have elapsed.
 */
function _debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Normalise a string for search comparison (lowercase, no accents).
 */
function _normalise(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Show / hide article elements based on search query.
 * Searches heading text and paragraph text.
 */
function _filterArticles(query) {
  const articles = document.querySelectorAll('main article');
  const q        = _normalise(query.trim());

  if (!q) {
    // Show everything
    articles.forEach((art) => art.classList.remove('article-hidden'));
    return;
  }

  articles.forEach((art) => {
    const text = _normalise(art.textContent || '');
    if (text.includes(q)) {
      art.classList.remove('article-hidden');
    } else {
      art.classList.add('article-hidden');
    }
  });
}

/* ========================= Public API ========================= */

/**
 * initNavigation — mobile hamburger toggle
 */
function initNavigation() {
  const toggle  = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (!toggle || !navMenu) return;

  toggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  navMenu.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * initReveal — IntersectionObserver scroll-reveal for .reveal/.reveal-left/.reveal-right
 */
function initReveal() {
  const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!elements.length) return;

  if (!('IntersectionObserver' in window)) {
    elements.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold:  CONFIG.revealThreshold,
      rootMargin: CONFIG.revealRootMargin,
    }
  );

  elements.forEach((el) => observer.observe(el));
}

/**
 * initAccordion — generic accordion support
 */
function initAccordion() {
  const triggers = document.querySelectorAll('[data-accordion-trigger]');
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const targetSelector = trigger.getAttribute('data-accordion-trigger');
      const target         = document.querySelector(targetSelector);
      const isOpen         = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!isOpen));
      if (target) target.style.display = isOpen ? 'none' : 'block';
    });
  });
}

/**
 * initTabs — tab-btn + data-tab-target + tab-content
 */
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  if (!tabBtns.length) return;

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetSelector = btn.getAttribute('data-tab-target');
      if (!targetSelector) return;

      const targetContent = document.querySelector(targetSelector);
      if (!targetContent) return;

      const parentHeader = btn.closest('.tabs-header');
      if (parentHeader) {
        parentHeader.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      } else {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      }

      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      targetContent.classList.add('active');

      targetContent.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => {
        el.classList.add('visible');
      });
    });
  });
}

/**
 * initModals — data-modal-open / data-modal-close
 */
function initModals() {
  document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const modal = document.getElementById(trigger.getAttribute('data-modal-open'));
      if (modal) modal.classList.add('open');
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const modal = document.getElementById(trigger.getAttribute('data-modal-close'));
      if (modal) modal.classList.remove('open');
    });
  });
}

/**
 * initCounters — animates data-count elements with count-up effect
 */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  counters.forEach((el) => {
    const target   = parseFloat(el.getAttribute('data-count'));
    const duration = 1800;
    const start    = performance.now();

    function update(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const value    = Math.round(eased * target);
      el.textContent = value.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target.toLocaleString();
      }
    }

    requestAnimationFrame(update);
  });
}

/**
 * initFormValidation — validates forms with data-rules attributes.
 * Supports: required | email | minlength:N | phone
 */
function initFormValidation() {
  const forms = document.querySelectorAll('form[data-validate]');
  forms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      let valid = true;

      form.querySelectorAll('[data-rules]').forEach((field) => {
        const rules = field.getAttribute('data-rules').split('|');
        const value = field.value.trim();
        let   error = '';

        for (const rule of rules) {
          if (rule === 'required' && !value) {
            error = 'Este campo es obligatorio.'; break;
          }
          if (rule === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            error = 'Ingresa un email válido.'; break;
          }
          if (rule.startsWith('minlength:')) {
            const min = parseInt(rule.split(':')[1], 10);
            if (value.length < min) { error = `Mínimo ${min} caracteres.`; break; }
          }
          if (rule === 'phone' && value && !/^\+?[\d\s\-()]{7,}$/.test(value)) {
            error = 'Ingresa un teléfono válido.'; break;
          }
        }

        let errorEl = field.nextElementSibling;
        if (!errorEl || !errorEl.classList.contains('field-error')) {
          errorEl = document.createElement('span');
          errorEl.className = 'field-error';
          errorEl.style.cssText = 'color:#ef4444;font-size:0.75rem;margin-top:4px;display:block;';
          field.parentNode.insertBefore(errorEl, field.nextSibling);
        }

        if (error) {
          errorEl.textContent = error;
          field.style.borderColor = '#ef4444';
          valid = false;
        } else {
          errorEl.textContent = '';
          field.style.borderColor = '';
        }
      });

      if (!valid) e.preventDefault();
    });
  });
}

/**
 * initGalleryLightbox — stub (not applicable to blog template).
 */
function initGalleryLightbox() {
  // Not used in blog template
}

/**
 * initDashboardSidebar — stub (not applicable to blog template).
 */
function initDashboardSidebar() {
  // Not used in blog template
}

/**
 * initBlogSearch — wires up sidebar search input to filter article cards.
 * Searches all <article> elements within <main>.
 */
function initBlogSearch() {
  // Find search inputs — look for inputs with placeholder containing 'Buscar'
  const searchInputs = document.querySelectorAll('input[placeholder*="Buscar"], input[type="search"]');
  if (!searchInputs.length) return;

  const handleSearch = _debounce((e) => {
    const query = e.target.value;
    State.search.query = query;
    _filterArticles(query);

    // Show feedback toast for empty results
    const articles = document.querySelectorAll('main article');
    const visible  = Array.from(articles).filter((a) => !a.classList.contains('article-hidden'));
    if (query.trim() && visible.length === 0) {
      window.CoreSystem.toast(`No se encontraron artículos para "${query}"`, 'info');
    }
  }, CONFIG.searchDebounce);

  searchInputs.forEach((input) => {
    input.addEventListener('input', handleSearch);

    // Clear filter on Escape
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        _filterArticles('');
      }
    });
  });
}

/* ========================= CoreSystem Public API ========================= */
window.CoreSystem = window.CoreSystem || {};

/**
 * CoreSystem.toast(message, type)
 * type: 'success' | 'error' | 'warning' | 'info'
 */
window.CoreSystem.toast = function (message, type) {
  type = type || 'info';

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id        = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'ri-checkbox-circle-line',
    error:   'ri-close-circle-line',
    warning: 'ri-alert-line',
    info:    'ri-information-line',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info}" style="font-size:1.1rem;flex-shrink:0;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  const dismiss = () => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  setTimeout(dismiss, CONFIG.toastDuration);
  toast.addEventListener('click', dismiss);
};

// Backwards-compat alias
window.CoreToast = {
  show: (msg, type) => window.CoreSystem.toast(msg, type || 'info'),
};

/* ========================= Event Listeners ========================= */

// Newsletter subscription button click
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.card.bg-primary .btn');
  if (!btn) return;
  const emailInput = btn.closest('.card')?.querySelector('input[type="email"]');
  if (!emailInput) return;
  const email = emailInput.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.CoreSystem.toast('Por favor ingresa un email válido.', 'error');
    return;
  }
  window.CoreSystem.toast('¡Suscripción exitosa! Gracias.', 'success');
  emailInput.value = '';
});

/* ========================= Initialization ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initReveal();
  initTabs();
  initAccordion();
  initModals();
  initCounters();
  initFormValidation();
  initGalleryLightbox();
  initDashboardSidebar();
  initBlogSearch();

  console.info('[CoreSystem Blog] Initialized successfully.');
});
