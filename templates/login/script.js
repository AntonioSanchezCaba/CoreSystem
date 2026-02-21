/* ========================= Configuration ========================= */
const CONFIG = {
  revealThreshold: 0.1,
  toastDuration:   4000,
};

/* ========================= Selectors / State ========================= */
const state = {
  toastContainer: null,
};

/* ========================= Private Functions ========================= */

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

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
  });

  toast.addEventListener('click', () => _dismissToast(toast));
  setTimeout(() => _dismissToast(toast), CONFIG.toastDuration);
}

function _dismissToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(40px)';
  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
}

/* ========================= Public API ========================= */
window.CoreSystem = {
  toast(msg, type = 'default') {
    _renderToast(msg, type);
  },
};

/* ========================= Module: Navigation ========================= */
function initNavigation() {
  // No navbar in login template — no-op
}

/* ========================= Module: Reveal ========================= */
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
  items.forEach(item => {
    const header = item.querySelector('.accordion-header');
    if (!header) return;

    if (item.classList.contains('active')) {
      const body = item.querySelector('.accordion-body');
      if (body) body.style.maxHeight = body.scrollHeight + 'px';
    }

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      const body = item.querySelector('.accordion-body');

      items.forEach(other => {
        if (other !== item) {
          other.classList.remove('active');
          const ob = other.querySelector('.accordion-body');
          if (ob) ob.style.maxHeight = '0';
        }
      });

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
      const targetId = btn.getAttribute('data-tab-target');
      const target = document.querySelector(targetId);
      if (!target) return;

      const header = btn.closest('.tabs-header');

      // Deactivate sibling buttons
      if (header) {
        header.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');

      // Deactivate all tab-contents in this same group (same parent)
      const parent = header ? header.parentElement : document.body;
      parent.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      target.classList.add('active');
    });
  });
}

/* ========================= Module: Password Toggle ========================= */
function initPasswordToggle() {
  document.querySelectorAll('[data-password-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.getAttribute('data-password-toggle');
      const input   = document.getElementById(inputId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
      }
      btn.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  });
}

/* ========================= Module: Modals ========================= */
function initModals() {
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.getAttribute('data-modal-open'));
      if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
    });
  });
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => _closeModal(btn.closest('.modal-overlay')));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) _closeModal(overlay); });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(_closeModal);
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
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-count'), 10);
      const start  = performance.now();
      function step(now) {
        const p = Math.min((now - start) / 1500, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
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
      e.preventDefault();
      if (_validateForm(form)) {
        // Demo: show success toast
        const isLogin = form.id === 'login-form';
        CoreSystem.toast(
          isLogin ? '¡Sesión iniciada correctamente!' : '¡Cuenta creada exitosamente!',
          'success'
        );
      }
    });

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
  // Handle checkboxes with required rule
  if (field.type === 'checkbox') {
    const rules  = field.getAttribute('data-rules') || '';
    const errEl  = field.closest('.form-group')?.querySelector('.form-error');
    if (rules.includes('required') && !field.checked) {
      if (errEl) { errEl.textContent = 'Debes aceptar los términos.'; errEl.classList.add('visible'); }
      return false;
    }
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
    return true;
  }

  const rules  = (field.getAttribute('data-rules') || '').split('|');
  const value  = field.value.trim();
  const errEl  = field.closest('.form-group')?.querySelector('.form-error');
  let error    = '';

  for (const rule of rules) {
    if (rule === 'required' && !value) { error = 'Este campo es obligatorio.'; break; }
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

/* ========================= Module: Multistep (not used here) ========================= */
function initMultistep() { /* no-op */ }

/* ========================= Helper: tab switch from link clicks ========================= */
window.switchToRegister = function(e) {
  e.preventDefault();
  const btn = document.querySelector('[data-tab-target="#tab-register"]');
  if (btn) btn.click();
};

window.switchToLogin = function(e) {
  e.preventDefault();
  const btn = document.querySelector('[data-tab-target="#tab-login"]');
  if (btn) btn.click();
};

/* ========================= Initialization ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initReveal();
  initAccordion();
  initTabs();
  initModals();
  initCounters();
  initFormValidation();
  initMultistep();
  initPasswordToggle();
});
