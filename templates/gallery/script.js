/**
 * CoreSystem — Gallery Template Script
 * Standalone, production-ready JavaScript
 * Includes: navigation, reveal, tabs, lightbox (with keyboard nav), pagination, toast
 */

/* ========================= Configuration ========================= */
const CONFIG = {
  revealThreshold:  0.15,
  revealRootMargin: '0px 0px -60px 0px',
  toastDuration:    3500,
  lightboxFadeMs:   200,
};

/* ========================= Selectors / State ========================= */
const State = {
  lightbox: {
    currentIndex: 0,
    items: [],       // array of { src, el } objects for the active tab
    open: false,
  },
};

/* ========================= Private Functions ========================= */

/**
 * Collect all gallery items visible in the currently active tab.
 * Each entry stores the data-gallery-src and the DOM element.
 */
function _collectGalleryItems() {
  const activeContent = document.querySelector('.tab-content.active');
  if (!activeContent) return [];
  return Array.from(activeContent.querySelectorAll('[data-gallery-src]')).map((el) => ({
    src: el.getAttribute('data-gallery-src'),
    el,
  }));
}

/**
 * Open the lightbox at a given index within the current items array.
 */
function _openLightbox(index) {
  State.lightbox.items = _collectGalleryItems();
  if (!State.lightbox.items.length) return;

  State.lightbox.currentIndex = index;
  State.lightbox.open = true;

  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');

  if (!lb || !lbImg) return;

  const item = State.lightbox.items[index];
  lbImg.src  = item.src;

  if (counter) {
    counter.textContent = `${index + 1} / ${State.lightbox.items.length}`;
  }

  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/**
 * Close the lightbox.
 */
function _closeLightbox() {
  const lb    = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');

  if (!lb) return;

  lb.classList.remove('open');
  document.body.style.overflow = '';
  State.lightbox.open = false;

  // Delay clearing src so fade-out looks clean
  setTimeout(() => { if (lbImg) lbImg.src = ''; }, CONFIG.lightboxFadeMs + 50);
}

/**
 * Navigate lightbox by delta (-1 or +1).
 */
function _navigateLightbox(delta) {
  const total = State.lightbox.items.length;
  if (!total) return;

  State.lightbox.currentIndex = (State.lightbox.currentIndex + delta + total) % total;
  _openLightbox(State.lightbox.currentIndex);
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

  // Close menu when a nav link is clicked
  navMenu.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * initReveal — IntersectionObserver for scroll-reveal elements.
 * Supports .reveal, .reveal-left, .reveal-right and .delay-* modifiers.
 */
function initReveal() {
  const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!elements.length) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback: show everything immediately
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
 * initAccordion — generic accordion support (not used in gallery, but required by spec).
 */
function initAccordion() {
  const triggers = document.querySelectorAll('[data-accordion-trigger]');
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const target  = document.querySelector(trigger.getAttribute('data-accordion-trigger'));
      const isOpen  = trigger.getAttribute('aria-expanded') === 'true';
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

      // Deactivate siblings in the same tabs-header
      const parentHeader = btn.closest('.tabs-header');
      if (parentHeader) {
        parentHeader.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      } else {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      }

      // Hide all sibling tab contents
      const allContents = document.querySelectorAll('.tab-content');
      allContents.forEach((c) => c.classList.remove('active'));

      // Activate selected
      btn.classList.add('active');
      targetContent.classList.add('active');

      // Re-run reveal on newly visible items
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
 * initCounters — animates elements with data-count attribute
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
      // Ease-out cubic
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
        const rules   = field.getAttribute('data-rules').split('|');
        const value   = field.value.trim();
        let   error   = '';

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

        // Show / clear error
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
 * initGalleryLightbox — sets up lightbox for all .gallery-item[data-gallery-src] elements.
 * Includes prev/next navigation and full keyboard support (Escape, ArrowLeft, ArrowRight).
 */
function initGalleryLightbox() {
  // Build lightbox DOM if it doesn't exist
  if (!document.getElementById('lightbox')) {
    const lb = document.createElement('div');
    lb.id        = 'lightbox';
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Visor de imagen');
    lb.innerHTML = `
      <button class="lightbox-close" id="lightbox-close" aria-label="Cerrar">
        <i class="ri-close-line"></i>
      </button>
      <button class="lightbox-prev" id="lightbox-prev" aria-label="Anterior">
        <i class="ri-arrow-left-s-line"></i>
      </button>
      <img class="lightbox-img" id="lightbox-img" src="" alt="Imagen ampliada">
      <button class="lightbox-next" id="lightbox-next" aria-label="Siguiente">
        <i class="ri-arrow-right-s-line"></i>
      </button>
      <span class="lightbox-counter" id="lightbox-counter"></span>
    `;
    document.body.appendChild(lb);
  }

  // Delegate clicks on gallery items
  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-gallery-src]');
    if (!item) return;

    // Find index within the active tab's items
    State.lightbox.items = _collectGalleryItems();
    const index = State.lightbox.items.findIndex((i) => i.el === item);
    if (index === -1) return;

    _openLightbox(index);
  });

  // Close button
  document.addEventListener('click', (e) => {
    if (e.target.closest('#lightbox-close')) _closeLightbox();
  });

  // Prev / Next buttons
  document.addEventListener('click', (e) => {
    if (e.target.closest('#lightbox-prev')) _navigateLightbox(-1);
    if (e.target.closest('#lightbox-next')) _navigateLightbox(+1);
  });

  // Click backdrop to close
  document.addEventListener('click', (e) => {
    const lb = document.getElementById('lightbox');
    if (lb && e.target === lb) _closeLightbox();
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (!State.lightbox.open) return;
    switch (e.key) {
      case 'Escape':    _closeLightbox();         break;
      case 'ArrowLeft': _navigateLightbox(-1);    break;
      case 'ArrowRight':_navigateLightbox(+1);    break;
    }
  });
}

/**
 * initDashboardSidebar — not applicable in gallery; stub included for API parity.
 */
function initDashboardSidebar() {
  // Not used in gallery template
}

/* ========================= CoreSystem Public API ========================= */
window.CoreSystem = window.CoreSystem || {};

/**
 * CoreSystem.toast(message, type)
 * type: 'success' | 'error' | 'warning' | 'info' (default: 'info')
 */
window.CoreSystem.toast = function (message, type) {
  type = type || 'info';

  // Ensure container exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id        = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Icon mapping
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

  // Auto-dismiss
  const dismiss = () => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  setTimeout(dismiss, CONFIG.toastDuration);
  toast.addEventListener('click', dismiss);
};

// Backwards-compat alias used in dashboard HTML
window.CoreToast = {
  show: (msg, type) => window.CoreSystem.toast(msg, type || 'info'),
};

/* ========================= Event Listeners ========================= */
// (Specific to DOM events not covered by initializer functions)

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

  console.info('[CoreSystem Gallery] Initialized successfully.');
});
