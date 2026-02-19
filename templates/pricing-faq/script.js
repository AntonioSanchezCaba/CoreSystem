/* ========================= Configuration ========================= */
const CONFIG = {
  revealThreshold: 0.15,
  toastDuration:   4000,
  accordionSingle: true,  // only one item open at a time
};

/* ========================= Selectors / State ========================= */
const state = {
  toastContainer: null,
};

/* ========================= Private Functions ========================= */

/**
 * Create and append the toast container once.
 */
function _ensureToastContainer() {
  if (state.toastContainer) return;
  const el = document.createElement('div');
  el.className = 'toast-container';
  el.style.cssText = `
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  `;
  document.body.appendChild(el);
  state.toastContainer = el;
}

/**
 * Render a single toast message.
 */
function _renderToast(msg, type) {
  _ensureToastContainer();

  const colors = {
    success: { bg: '#10b981', icon: '✓' },
    error:   { bg: '#ef4444', icon: '✕' },
    warning: { bg: '#f59e0b', icon: '⚠' },
    info:    { bg: '#0ea5e9', icon: 'ℹ' },
    default: { bg: '#334155', icon: '●' },
  };
  const c = colors[type] || colors.default;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: ${c.bg};
    color: #fff;
    padding: 0.75rem 1.25rem;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 10px 15px rgba(0,0,0,0.15);
    pointer-events: all;
    cursor: pointer;
    min-width: 220px;
    max-width: 360px;
    opacity: 0;
    transform: translateX(40px);
    transition: opacity 0.25s ease, transform 0.25s ease;
    font-family: system-ui, sans-serif;
  `;
  toast.innerHTML = `<span style="font-size:1rem;">${c.icon}</span><span>${msg}</span>`;
  state.toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
  });

  // Dismiss on click
  toast.addEventListener('click', () => _dismissToast(toast));

  // Auto-dismiss
  setTimeout(() => _dismissToast(toast), CONFIG.toastDuration);
}

function _dismissToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(40px)';
  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
}

/* ========================= Public API ========================= */
window.CoreSystem = {
  /**
   * Show a toast notification.
   * @param {string} msg   - Message text
   * @param {string} [type] - 'success' | 'error' | 'warning' | 'info'
   */
  toast(msg, type = 'default') {
    _renderToast(msg, type);
  },
};

/* ========================= Module: Navigation ========================= */
function initNavigation() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // Scroll shadow
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      navbar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
    } else {
      navbar.style.boxShadow = '';
    }
  }, { passive: true });

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const menu   = document.querySelector('.nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('open');
    });

    // Close on link click
    menu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/* ========================= Module: Reveal (IntersectionObserver) ========================= */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: CONFIG.revealThreshold });

  targets.forEach(el => observer.observe(el));
}

/* ========================= Module: Accordion ========================= */
function initAccordion() {
  const items = document.querySelectorAll('.accordion-item');
  if (!items.length) return;

  items.forEach(item => {
    const header = item.querySelector('.accordion-header');
    if (!header) return;

    // Set initial max-height for already-active items
    if (item.classList.contains('active')) {
      const body = item.querySelector('.accordion-body');
      if (body) body.style.maxHeight = body.scrollHeight + 'px';
    }

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      const body     = item.querySelector('.accordion-body');

      // If single-open mode, close all others
      if (CONFIG.accordionSingle) {
        items.forEach(other => {
          if (other !== item && other.classList.contains('active')) {
            other.classList.remove('active');
            const otherBody = other.querySelector('.accordion-body');
            if (otherBody) otherBody.style.maxHeight = '0';
          }
        });
      }

      if (isActive) {
        item.classList.remove('active');
        if (body) body.style.maxHeight = '0';
      } else {
        item.classList.add('active');
        if (body) body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });
}

/* ========================= Module: Tabs ========================= */
function initTabs() {
  const tabBtns = document.querySelectorAll('[data-tab-target]');
  if (!tabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId  = btn.getAttribute('data-tab-target');
      const target    = document.querySelector(targetId);
      if (!target) return;

      // Determine the group: find siblings in the same tabs-header
      const header    = btn.closest('.tabs-header');
      const container = header ? header.parentElement : btn.parentElement;

      // Deactivate all buttons in the same header
      if (header) {
        header.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');

      // Hide all tab-content siblings; show target
      // We look for tab-content elements that share the same parent container
      const allContents = document.querySelectorAll('.tab-content');
      allContents.forEach(tc => {
        if (tc === target) {
          tc.classList.add('active');
        } else {
          // only hide if it's in the same logical group
          const relatedBtns = document.querySelectorAll(`[data-tab-target="#${tc.id}"]`);
          relatedBtns.forEach(rb => {
            const rh = rb.closest('.tabs-header');
            if (rh === header) tc.classList.remove('active');
          });
        }
      });
    });
  });
}

/* ========================= Module: Modals ========================= */
function initModals() {
  // Open
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-modal-open');
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  // Close (buttons)
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => _closeModal(btn.closest('.modal-overlay')));
  });

  // Close on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _closeModal(overlay);
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(_closeModal);
    }
  });
}

function _closeModal(overlay) {
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ========================= Module: Counters ========================= */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.getAttribute('data-count'), 10);
      const duration = 1500;
      const start  = performance.now();

      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ========================= Module: Form Validation ========================= */
function initFormValidation() {
  const forms = document.querySelectorAll('[data-validate]');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!_validateForm(form)) e.preventDefault();
    });

    // Live validation on blur
    form.querySelectorAll('[data-rules]').forEach(field => {
      field.addEventListener('blur', () => _validateField(field));
      field.addEventListener('input', () => {
        if (field.classList.contains('error')) _validateField(field);
      });
    });
  });
}

function _validateForm(form) {
  let valid = true;
  form.querySelectorAll('[data-rules]').forEach(field => {
    if (!_validateField(field)) valid = false;
  });
  return valid;
}

function _validateField(field) {
  const rules   = field.getAttribute('data-rules').split('|');
  const value   = field.value.trim();
  const errEl   = field.closest('.form-group')?.querySelector('.form-error');
  let error     = '';

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
    if (rule === 'phone' && value && !/^[\d\s\+\-\(\)]{7,}$/.test(value)) {
      error = 'Ingresa un teléfono válido.'; break;
    }
  }

  field.classList.toggle('error',   !!error);
  field.classList.toggle('success', !error && !!value);
  if (errEl) {
    errEl.textContent = error;
    errEl.classList.toggle('visible', !!error);
  }
  return !error;
}

/* ========================= Module: Multistep (stub for this template) ========================= */
function initMultistep() {
  // Not used in pricing-faq template — no-op
}

/* ========================= Event Listeners ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initReveal();
  initAccordion();
  initTabs();
  initModals();
  initCounters();
  initFormValidation();
  initMultistep();
});
