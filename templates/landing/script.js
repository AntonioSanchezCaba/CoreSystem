/* =========================================================
   CoreSystem — Landing Page Script
   Standalone, no external dependencies
   ========================================================= */

(function (global) {
  'use strict';

  /* =========================================================
     Configuration
     ========================================================= */
  const CONFIG = {
    scrollThreshold: 10,          // px before navbar goes solid
    revealThreshold: 0.15,        // IntersectionObserver threshold
    counterDuration: 2000,        // ms for count-up animation
    toastDuration: 4000,          // ms toast stays visible
    toastAnimationDuration: 300,  // ms for toast slide animation
    accordionSelector: '.accordion-item',
    tabBtnSelector: '.tab-btn',
    tabContentSelector: '.tab-content',
  };

  /* =========================================================
     Selectors / State
     ========================================================= */
  const state = {
    navOpen: false,
    observers: [],
    activeModals: new Set(),
  };

  /* =========================================================
     Private Functions
     ========================================================= */

  /**
   * Throttle a function call to at most once per `limit` ms.
   */
  function throttle(fn, limit) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  }

  /**
   * Ease-out function for counter animation.
   */
  function easeOutQuad(t) {
    return t * (2 - t);
  }

  /**
   * Animate a numeric counter from 0 to `target`.
   * @param {HTMLElement} el
   * @param {number} target
   * @param {string} suffix
   */
  function animateCounter(el, target, suffix) {
    const startTime = performance.now();
    const isFloat = !Number.isInteger(target);

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / CONFIG.counterDuration, 1);
      const eased = easeOutQuad(progress);
      const current = isFloat
        ? parseFloat((eased * target).toFixed(1))
        : Math.floor(eased * target);
      el.textContent = current + (suffix || '');
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + (suffix || '');
      }
    }
    requestAnimationFrame(step);
  }

  /**
   * Build a toast icon based on type.
   */
  function getToastIcon(type) {
    const icons = {
      success: 'ri-checkbox-circle-fill',
      error:   'ri-close-circle-fill',
      warning: 'ri-alert-fill',
      info:    'ri-information-fill',
    };
    return icons[type] || icons.info;
  }

  /**
   * Validate a single field against its rules.
   * Returns an error string or empty string if valid.
   */
  function validateField(input) {
    const rulesAttr = input.getAttribute('data-rules');
    if (!rulesAttr) return '';
    const value = input.value.trim();
    const rules = rulesAttr.split('|');

    for (const rule of rules) {
      if (rule === 'required') {
        if (!value) return 'Este campo es obligatorio.';
      } else if (rule === 'email') {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRe.test(value)) return 'Introduce un email válido.';
      } else if (rule.startsWith('minlength:')) {
        const min = parseInt(rule.split(':')[1], 10);
        if (value && value.length < min) return `Mínimo ${min} caracteres.`;
      } else if (rule === 'phone') {
        const phoneRe = /^[+\d][\d\s\-().]{6,}$/;
        if (value && !phoneRe.test(value)) return 'Introduce un teléfono válido.';
      }
    }
    return '';
  }

  /**
   * Display or clear a field's error message.
   */
  function showFieldError(input, message) {
    const group = input.closest('.form-group');
    if (!group) return;
    const errorEl = group.querySelector('.form-error');
    if (!errorEl) return;
    errorEl.textContent = message;
    if (message) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
    } else {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
    }
  }

  /* =========================================================
     Public API
     ========================================================= */
  const CoreSystem = {
    /**
     * Show a toast notification.
     * @param {string} message
     * @param {'success'|'error'|'warning'|'info'} type
     */
    toast(message, type = 'info') {
      let container = document.getElementById('cs-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'cs-toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'polite');
      toast.innerHTML = `
        <i class="${getToastIcon(type)} toast-icon" aria-hidden="true"></i>
        <span>${message}</span>
      `;
      container.appendChild(toast);

      // Trigger slide-in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
      });

      // Auto-remove
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, CONFIG.toastAnimationDuration);
      }, CONFIG.toastDuration);
    },
  };

  /* =========================================================
     Event Listeners — Module Inits
     ========================================================= */

  /**
   * initNavigation — hamburger toggle, scroll-solid navbar, smooth scroll
   */
  function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const toggle = document.querySelector('.nav-toggle');
    const menu   = document.querySelector('.nav-menu');

    if (!navbar) return;

    /* Scroll: transparent → solid */
    function handleScroll() {
      if (window.scrollY > CONFIG.scrollThreshold) {
        navbar.classList.remove('transparent');
        navbar.classList.add('solid');
      } else {
        navbar.classList.add('transparent');
        navbar.classList.remove('solid');
      }
    }

    // Only apply transparent logic if it starts transparent
    if (navbar.classList.contains('transparent')) {
      window.addEventListener('scroll', throttle(handleScroll, 50), { passive: true });
      handleScroll();
    }

    /* Hamburger toggle */
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        state.navOpen = !state.navOpen;
        menu.classList.toggle('open', state.navOpen);
        toggle.setAttribute('aria-expanded', String(state.navOpen));
        toggle.innerHTML = state.navOpen
          ? '<i class="ri-close-line"></i>'
          : '<i class="ri-menu-line"></i>';
      });

      /* Close nav when a link is clicked */
      menu.querySelectorAll('.nav-link, .btn').forEach(link => {
        link.addEventListener('click', () => {
          if (state.navOpen) {
            state.navOpen = false;
            menu.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<i class="ri-menu-line"></i>';
          }
        });
      });

      /* Close nav on outside click */
      document.addEventListener('click', (e) => {
        if (state.navOpen && !navbar.contains(e.target)) {
          state.navOpen = false;
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.innerHTML = '<i class="ri-menu-line"></i>';
        }
      });
    }

    /* Smooth scroll for anchor links */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const offset = target.getBoundingClientRect().top + window.scrollY - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '64', 10);
          window.scrollTo({ top: offset, behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * initReveal — IntersectionObserver for reveal animations
   */
  function initReveal() {
    const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: CONFIG.revealThreshold }
    );

    elements.forEach(el => observer.observe(el));
    state.observers.push(observer);
  }

  /**
   * initAccordion — click to open/close .accordion-item
   */
  function initAccordion() {
    const items = document.querySelectorAll(CONFIG.accordionSelector);
    if (!items.length) return;

    items.forEach(item => {
      const header = item.querySelector('.accordion-header');
      const body   = item.querySelector('.accordion-body');
      const icon   = item.querySelector('.accordion-icon');
      if (!header || !body) return;

      // Set initial height for open items
      if (item.classList.contains('active')) {
        body.style.maxHeight = body.scrollHeight + 'px';
      } else {
        body.style.maxHeight = '0';
        body.style.overflow = 'hidden';
      }

      body.style.transition = 'max-height 0.35s ease';
      body.style.overflow = 'hidden';

      header.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');

        // Close all items in this accordion group
        const group = item.closest('.accordion');
        if (group) {
          group.querySelectorAll('.accordion-item.active').forEach(openItem => {
            if (openItem !== item) {
              openItem.classList.remove('active');
              const openBody = openItem.querySelector('.accordion-body');
              const openIcon = openItem.querySelector('.accordion-icon');
              if (openBody) openBody.style.maxHeight = '0';
              if (openIcon) openIcon.style.transform = 'rotate(0deg)';
            }
          });
        }

        if (isOpen) {
          item.classList.remove('active');
          body.style.maxHeight = '0';
          if (icon) icon.style.transform = 'rotate(0deg)';
        } else {
          item.classList.add('active');
          body.style.maxHeight = body.scrollHeight + 'px';
          if (icon) icon.style.transform = 'rotate(180deg)';
        }
      });

      // Set icon initial state
      if (icon) {
        icon.style.transition = 'transform 0.3s ease';
        if (item.classList.contains('active')) {
          icon.style.transform = 'rotate(180deg)';
        }
      }
    });
  }

  /**
   * initTabs — .tab-btn with data-tab-target switches .tab-content
   */
  function initTabs() {
    const tabBtns = document.querySelectorAll(CONFIG.tabBtnSelector);
    if (!tabBtns.length) return;

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSelector = btn.getAttribute('data-tab-target');
        if (!targetSelector) return;
        const targetContent = document.querySelector(targetSelector);
        if (!targetContent) return;

        /* Find sibling buttons in the same tabs-header */
        const tabsHeader = btn.closest('.tabs-header');
        if (tabsHeader) {
          tabsHeader.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        }
        btn.classList.add('active');

        /* Deactivate all sibling tab contents — search in same section or document */
        const contentParent = targetContent.parentElement;
        if (contentParent) {
          contentParent.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        }
        targetContent.classList.add('active');
      });
    });
  }

  /**
   * initModals — data-modal-open / data-modal-close / backdrop click
   */
  function initModals() {
    /* Open triggers */
    document.querySelectorAll('[data-modal-open]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const id = trigger.getAttribute('data-modal-open');
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add('active');
        state.activeModals.add(id);
        document.body.style.overflow = 'hidden';
        // Focus trap: focus first focusable element
        const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
      });
    });

    /* Close triggers (within modal) */
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (!modal) return;
        closeModal(modal);
      });
    });

    /* Backdrop click */
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay);
      });
    });

    /* Escape key */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal-overlay.active');
        openModals.forEach(m => closeModal(m));
      }
    });

    function closeModal(modal) {
      modal.classList.remove('active');
      state.activeModals.delete(modal.id);
      if (state.activeModals.size === 0) {
        document.body.style.overflow = '';
      }
    }
  }

  /**
   * initCounters — count-up animation for [data-count]
   */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseFloat(el.getAttribute('data-count'));
            const suffix = el.getAttribute('data-suffix') || '';
            animateCounter(el, target, suffix);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(el => observer.observe(el));
    state.observers.push(observer);
  }

  /**
   * initFormValidation — validate [data-rules] on submit and blur
   */
  function initFormValidation() {
    const forms = document.querySelectorAll('[data-validate]');
    if (!forms.length) return;

    forms.forEach(form => {
      const inputs = form.querySelectorAll('[data-rules]');

      /* Real-time validation on blur */
      inputs.forEach(input => {
        input.addEventListener('blur', () => {
          const error = validateField(input);
          showFieldError(input, error);
        });
        input.addEventListener('input', () => {
          if (input.classList.contains('is-invalid')) {
            const error = validateField(input);
            showFieldError(input, error);
          }
        });
      });

      /* Validate all on submit */
      form.addEventListener('submit', (e) => {
        let valid = true;
        inputs.forEach(input => {
          const error = validateField(input);
          showFieldError(input, error);
          if (error) valid = false;
        });

        if (!valid) {
          e.preventDefault();
          CoreSystem.toast('Por favor corrige los errores antes de enviar.', 'error');
          const firstInvalid = form.querySelector('.is-invalid');
          if (firstInvalid) firstInvalid.focus();
        }
      });
    });
  }

  /* =========================================================
     Initialization
     ========================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initReveal();
    initAccordion();
    initTabs();
    initModals();
    initCounters();
    initFormValidation();

    // Expose CoreSystem globally
    global.CoreSystem = CoreSystem;
  });

  // Also expose immediately in case of deferred scripts
  global.CoreSystem = CoreSystem;

}(window));
