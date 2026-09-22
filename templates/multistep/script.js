/* ========================= Configuration ========================= */
const CONFIG = {
  revealThreshold: 0.15,
  toastDuration:   4000,
  totalSteps:      4,
};

/* ========================= Selectors / State ========================= */
const state = {
  toastContainer: null,
  currentStep: 1,
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
  const navbar  = document.querySelector('.navbar');
  const toggle  = document.querySelector('.nav-toggle');
  const menu    = document.querySelector('.nav-menu');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.style.boxShadow = window.scrollY > 10
        ? '0 4px 12px rgba(0,0,0,0.08)'
        : '';
    }, { passive: true });
  }

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('open');
    });
    menu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
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
  document.querySelectorAll('.accordion-item').forEach(item => {
    const header = item.querySelector('.accordion-header');
    if (!header) return;

    if (item.classList.contains('active')) {
      const body = item.querySelector('.accordion-body');
      if (body) body.style.maxHeight = body.scrollHeight + 'px';
    }

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      const body     = item.querySelector('.accordion-body');

      document.querySelectorAll('.accordion-item').forEach(other => {
        if (other !== item && other.classList.contains('active')) {
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
  document.querySelectorAll('[data-tab-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab-target');
      const target   = document.querySelector(targetId);
      if (!target) return;

      const header = btn.closest('.tabs-header');
      if (header) header.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const parent = header ? header.parentElement : document.body;
      parent.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      target.classList.add('active');
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
  document.querySelectorAll('[data-validate]').forEach(form => {
    form.addEventListener('submit', e => {
      if (!_validateForm(form)) e.preventDefault();
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

/* ========================= Module: Multistep ========================= */
function initMultistep() {
  const wrapper    = document.querySelector('[data-multistep]');
  if (!wrapper) return;

  const panels     = wrapper.querySelectorAll('.step-panel');
  const stepEls    = wrapper.querySelectorAll('.step[data-step]');
  const indicator  = wrapper.querySelector('[data-step-indicator]');
  const prevBtn    = wrapper.querySelector('[data-step-prev]');
  const nextBtn    = wrapper.querySelector('[data-step-next]');
  const submitBtn  = wrapper.querySelector('[data-step-submit]');

  const total = panels.length;

  /**
   * Render UI for the given step number (1-indexed).
   */
  function goToStep(n) {
    if (n < 1 || n > total) return;
    state.currentStep = n;

    // Update panels
    panels.forEach((panel, i) => {
      panel.classList.toggle('active', i === n - 1);
    });

    // Update stepper indicators
    stepEls.forEach((step, i) => {
      const stepNum = i + 1;
      step.classList.remove('active', 'completed');
      if (stepNum === n) {
        step.classList.add('active');
      } else if (stepNum < n) {
        step.classList.add('completed');
        // Replace number with checkmark
        const numEl = step.querySelector('.step-number');
        if (numEl && !numEl.querySelector('i.ri-check-line')) {
          numEl.innerHTML = '<i class="ri-check-line"></i>';
        }
      } else {
        // Restore number for future steps
        const numEl = step.querySelector('.step-number');
        if (numEl && numEl.querySelector('i.ri-check-line')) {
          numEl.textContent = String(stepNum);
        }
      }
    });

    // Update indicator text
    if (indicator) indicator.textContent = `Paso ${n} de ${total}`;

    // Manage navigation buttons
    if (prevBtn) prevBtn.style.display = n > 1 ? '' : 'none';
    if (nextBtn)   nextBtn.style.display   = n < total ? '' : 'none';
    if (submitBtn) submitBtn.style.display = n === total ? '' : 'none';

    // When reaching confirm step, fill summary
    if (n === total) _fillConfirmation();

    // Scroll to top of card
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Validate the current step before advancing.
   * Step 1 has a form; other steps are optional.
   */
  function validateCurrentStep() {
    if (state.currentStep === 1) {
      const form = document.getElementById('step1-form');
      if (form) return _validateForm(form);
    }
    return true;
  }

  /**
   * Populate the confirmation panel with values from prior steps.
   */
  function _fillConfirmation() {
    const email   = document.getElementById('s1-email')?.value   || '—';
    const fname   = document.getElementById('s2-fname')?.value   || '';
    const lname   = document.getElementById('s2-lname')?.value   || '';
    const company = document.getElementById('s2-company')?.value || '—';
    const plan    = document.querySelector('input[name="plan"]:checked')?.value || 'free';

    const confirmEmail   = document.getElementById('confirm-email');
    const confirmName    = document.getElementById('confirm-name');
    const confirmCompany = document.getElementById('confirm-company');
    const confirmPlan    = document.getElementById('confirm-plan');

    if (confirmEmail)   confirmEmail.textContent   = email;
    if (confirmName)    confirmName.textContent    = `${fname} ${lname}`.trim() || '—';
    if (confirmCompany) confirmCompany.textContent = company || '—';
    if (confirmPlan)    confirmPlan.textContent    =
      plan.charAt(0).toUpperCase() + plan.slice(1);
  }

  // Wire navigation buttons
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (validateCurrentStep()) {
        goToStep(state.currentStep + 1);
      } else {
        CoreSystem.toast('Completa los campos requeridos antes de continuar.', 'warning');
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => goToStep(state.currentStep - 1));
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      // The checkbox validation for terms
      const termsCheck = panels[total - 1].querySelector('input[type="checkbox"]');
      if (termsCheck && !termsCheck.checked) {
        CoreSystem.toast('Debes aceptar los términos de servicio.', 'warning');
        return;
      }
      CoreSystem.toast('¡Cuenta creada exitosamente!', 'success');
    });
  }

  // Initialize first step
  goToStep(1);
}

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
});
