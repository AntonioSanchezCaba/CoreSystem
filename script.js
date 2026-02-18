/**
 * =========================================
 * CORE SYSTEM v2.0 — script.js
 * Pattern : IIFE Module Pattern (ES6+)
 * Autor   : CoreSystem Framework
 * =========================================
 */

const CoreSystem = (() => {
    'use strict';

    /* =====================================================
       1. CONFIGURATION
       ===================================================== */
    const Config = {
        activeClass:    'active',
        openClass:      'open',
        scrolledClass:  'scrolled',
        collapsedClass: 'collapsed',
        hidingClass:    'hiding',
        completedClass: 'completed',
        toastDuration:  3500,
        scrollThreshold: 50,
        revealThreshold: 0.12,
        revealMargin:   '-40px',
        // Extend: feature flags, API base URLs, env vars
    };

    /* =====================================================
       2. SIMPLE STATE MANAGER
       ===================================================== */
    const State = {
        _data: {},
        _listeners: {},

        get(key) { return this._data[key]; },

        set(key, value) {
            const prev = this._data[key];
            this._data[key] = value;
            this._emit(key, value, prev);
            return this;
        },

        /** Subscribe: State.on('key', (newVal, oldVal) => {}) */
        on(key, fn) {
            if (!this._listeners[key]) this._listeners[key] = [];
            this._listeners[key].push(fn);
        },

        _emit(key, newVal, oldVal) {
            (this._listeners[key] || []).forEach(fn => fn(newVal, oldVal));
        },
        // Extend: plug in localStorage, sessionStorage, or a reactive store
    };

    /* =====================================================
       3. PRIVATE UTILITIES
       ===================================================== */
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    const _throttle = (fn, ms = 100) => {
        let last = 0;
        return (...args) => {
            const now = Date.now();
            if (now - last >= ms) { last = now; fn(...args); }
        };
    };

    /* =====================================================
       4. MODULES
       ===================================================== */

    /**
     * MODULE: Navigation
     * Mobile toggle, sticky scroll, transparent variant
     * Extend: active-route highlighting, keyboard nav
     */
    const Navigation = {
        init() {
            const navbar = $('.navbar');
            const toggle = $('.nav-toggle');
            const menu   = $('.nav-menu');

            if (!navbar) return;

            if (toggle && menu) {
                toggle.addEventListener('click', () => {
                    const isOpen = menu.classList.toggle(Config.activeClass);
                    toggle.setAttribute('aria-expanded', isOpen);
                    const icon = toggle.querySelector('i');
                    if (icon) icon.className = isOpen ? 'ri-close-line' : 'ri-menu-line';
                });

                $$('.nav-link, .nav-dropdown-item', menu).forEach(link => {
                    link.addEventListener('click', () => {
                        menu.classList.remove(Config.activeClass);
                        toggle.setAttribute('aria-expanded', false);
                        const icon = toggle.querySelector('i');
                        if (icon) icon.className = 'ri-menu-line';
                    });
                });

                document.addEventListener('click', e => {
                    if (!navbar.contains(e.target)) {
                        menu.classList.remove(Config.activeClass);
                    }
                });
            }

            const onScroll = _throttle(() => {
                navbar.classList.toggle(Config.scrolledClass, window.scrollY > Config.scrollThreshold);
            }, 50);

            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        },
    };

    /**
     * MODULE: Sidebar
     * Collapsible (desktop), slide-in (mobile), overlay
     * Extend: persist state to localStorage
     */
    const Sidebar = {
        sidebar: null,
        overlay: null,

        init() {
            this.sidebar = $('.sidebar');
            this.overlay = $('.sidebar-overlay');
            if (!this.sidebar) return;

            $$('[data-toggle-sidebar]').forEach(btn => btn.addEventListener('click', () => this.toggle()));
            $$('[data-collapse-sidebar]').forEach(btn => btn.addEventListener('click', () => this.collapse()));

            this.overlay?.addEventListener('click', () => this.close());
            document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
        },

        open() {
            this.sidebar.classList.add(Config.openClass);
            this.overlay?.classList.add(Config.activeClass);
            document.body.style.overflow = 'hidden';
        },

        close() {
            this.sidebar.classList.remove(Config.openClass);
            this.overlay?.classList.remove(Config.activeClass);
            document.body.style.overflow = '';
        },

        toggle() { this.sidebar.classList.contains(Config.openClass) ? this.close() : this.open(); },

        collapse() {
            const isCollapsed = this.sidebar.classList.toggle(Config.collapsedClass);
            const content = $('.main-content');
            if (content) {
                content.style.marginLeft = isCollapsed
                    ? 'var(--sidebar-collapsed)'
                    : 'var(--sidebar-width)';
            }
        },
    };

    /**
     * MODULE: Modal Manager
     * data-modal-open="id" on triggers | data-modal-close on close btns
     * Extend: return Promise, stacked modals
     */
    const Modal = {
        init() {
            $$('[data-modal-open]').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.open(btn.dataset.modalOpen);
                });
            });

            $$('[data-modal-close]').forEach(btn => btn.addEventListener('click', () => this.closeAll()));

            $$('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', e => { if (e.target === overlay) this.closeAll(); });
            });

            document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeAll(); });
        },

        open(id) {
            const modal = document.getElementById(id);
            if (!modal) return;
            this.closeAll();
            modal.classList.add(Config.openClass);
            document.body.style.overflow = 'hidden';
            modal.querySelector('button, [href], input, select, textarea')?.focus();
        },

        closeAll() {
            $$('.modal-overlay').forEach(m => m.classList.remove(Config.openClass));
            document.body.style.overflow = '';
        },
    };

    /**
     * MODULE: Tabs Manager
     * data-tab-target="#panel-id" on .tab-btn elements
     * Extend: URL hash sync, swipe gestures
     */
    const Tabs = {
        init() {
            $$('[data-tab-target]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const target    = $(btn.dataset.tabTarget);
                    if (!target) return;
                    const header    = btn.closest('.tabs-header');
                    const container = target.parentElement;

                    if (header) $$('.tab-btn', header).forEach(t => t.classList.remove(Config.activeClass));
                    $$('.tab-content', container).forEach(c => c.classList.remove(Config.activeClass));

                    btn.classList.add(Config.activeClass);
                    target.classList.add(Config.activeClass);
                });
            });
        },
    };

    /**
     * MODULE: Accordion Manager
     * .accordion > .accordion-item > .accordion-header + .accordion-body
     * data-exclusive="false" on .accordion to allow multiple open
     * Extend: animate with exact scrollHeight
     */
    const Accordion = {
        init() {
            $$('.accordion-header').forEach(header => {
                header.addEventListener('click', () => {
                    const item      = header.closest('.accordion-item');
                    const accordion = item.closest('.accordion');
                    const exclusive = accordion?.dataset.exclusive !== 'false';

                    if (exclusive) {
                        $$('.accordion-item', accordion).forEach(i => {
                            if (i !== item) i.classList.remove(Config.activeClass);
                        });
                    }
                    item.classList.toggle(Config.activeClass);
                });
            });
        },
    };

    /**
     * MODULE: Dropdown Manager
     * data-dropdown on trigger; next sibling must be .dropdown-menu
     * Extend: keyboard ArrowUp/Down, submenu support
     */
    const Dropdown = {
        init() {
            $$('[data-dropdown]').forEach(trigger => {
                trigger.addEventListener('click', e => {
                    e.stopPropagation();
                    const menu = trigger.nextElementSibling;
                    if (!menu?.classList.contains('dropdown-menu')) return;
                    const isOpen = menu.classList.contains(Config.openClass);
                    this.closeAll();
                    if (!isOpen) menu.classList.add(Config.openClass);
                });
            });
            document.addEventListener('click', () => this.closeAll());
        },
        closeAll() { $$('.dropdown-menu').forEach(m => m.classList.remove(Config.openClass)); },
    };

    /**
     * MODULE: Toast Notifications
     * API: CoreSystem.toast('Message', 'success'|'error'|'warning'|'info')
     * Extend: progress bar, action button, queue
     */
    const Toast = {
        container: null,
        icons: {
            success: 'ri-check-circle-line',
            error:   'ri-error-warning-line',
            warning: 'ri-alert-line',
            info:    'ri-information-line',
            default: 'ri-notification-3-line',
        },

        _getContainer() {
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.className = 'toast-container';
                this.container.setAttribute('aria-live', 'polite');
                document.body.appendChild(this.container);
            }
            return this.container;
        },

        show(message, type = 'default', duration = Config.toastDuration) {
            const container = this._getContainer();
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <i class="${this.icons[type] || this.icons.default} toast-icon"></i>
                <span class="toast-message">${message}</span>`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add(Config.hidingClass);
                toast.addEventListener('animationend', () => toast.remove(), { once: true });
            }, duration);

            return toast;
        },
    };

    /**
     * MODULE: Form Validation
     * Add data-validate to <form>
     * Add data-rules="required|email|minlength:8" to inputs
     * Place <span class="form-error"> after inputs for messages
     * Extend: FormValidation.rules.myRule = (val, param) => true || 'error'
     */
    const FormValidation = {
        rules: {
            required:  v       => v.trim() !== ''                                       || 'Este campo es requerido',
            email:     v       => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)                 || 'Email inválido',
            minlength: (v, l)  => v.length >= +l                                        || `Mínimo ${l} caracteres`,
            maxlength: (v, l)  => v.length <= +l                                        || `Máximo ${l} caracteres`,
            phone:     v       => /^[\d\s\+\-\(\)]{7,15}$/.test(v)                     || 'Teléfono inválido',
            url:       v       => /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})/.test(v) || 'URL inválida',
            numeric:   v       => /^\d+$/.test(v)                                       || 'Solo números',
            match:     (v, sel) => v === ($(sel)?.value || '')                          || 'Los campos no coinciden',
        },

        init() {
            $$('form[data-validate]').forEach(form => {
                form.addEventListener('submit', e => {
                    if (!this.validateForm(form)) {
                        e.preventDefault();
                        form.querySelector('.form-input.error, .form-textarea.error')?.focus();
                    }
                });

                $$('[data-rules]', form).forEach(input => {
                    input.addEventListener('blur',  () => this.validateField(input));
                    input.addEventListener('input', () => {
                        if (input.classList.contains('error')) this.validateField(input);
                    });
                });
            });
        },

        validateField(input) {
            const rules   = (input.dataset.rules || '').split('|').filter(Boolean);
            const errorEl = input.parentElement?.querySelector('.form-error') ||
                            input.closest('.form-group')?.querySelector('.form-error');
            let error = null;

            for (const rule of rules) {
                const [name, param] = rule.split(':');
                const result = this.rules[name]?.(input.value, param);
                if (result !== true) { error = result; break; }
            }

            if (error) {
                input.classList.add('error');
                input.classList.remove('success');
                if (errorEl) { errorEl.textContent = error; errorEl.classList.add('visible'); }
                return false;
            }
            input.classList.remove('error');
            if (rules.includes('required')) input.classList.add('success');
            errorEl?.classList.remove('visible');
            return true;
        },

        validateForm(form) {
            let valid = true;
            $$('[data-rules]', form).forEach(input => { if (!this.validateField(input)) valid = false; });
            return valid;
        },
    };

    /**
     * MODULE: Scroll Reveal (Intersection Observer)
     * Add .reveal | .reveal-left | .reveal-right | .reveal-scale
     * Use .delay-100/.delay-200 etc for stagger effects
     * Extend: observe dynamically added elements
     */
    const ScrollReveal = {
        init() {
            const elements = $$('.reveal, .reveal-left, .reveal-right, .reveal-scale');
            if (!elements.length) return;

            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(Config.activeClass);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: Config.revealThreshold, rootMargin: `0px 0px ${Config.revealMargin} 0px` });

            elements.forEach(el => observer.observe(el));
        },
    };

    /**
     * MODULE: Multi-Step Form
     * data-multistep on wrapper
     * .step elements in .stepper for indicators
     * .step-panel for content | data-step-next / data-step-prev / data-step-submit
     * Extend: validate panel before Next
     */
    const MultiStep = {
        init() {
            $$('[data-multistep]').forEach(form => {
                const panels = $$('.step-panel', form);
                const steps  = $$('.step', form);
                let current  = 1;
                const total  = panels.length;

                const update = () => {
                    panels.forEach((p, i) => p.classList.toggle(Config.activeClass, i + 1 === current));
                    steps.forEach((s, i) => {
                        s.classList.remove(Config.activeClass, Config.completedClass);
                        if (i + 1 < current)  s.classList.add(Config.completedClass);
                        if (i + 1 === current) s.classList.add(Config.activeClass);
                    });
                    const prevBtn   = $('[data-step-prev]',   form);
                    const nextBtn   = $('[data-step-next]',   form);
                    const submitBtn = $('[data-step-submit]', form);
                    if (prevBtn)   prevBtn.style.display   = current === 1     ? 'none' : 'inline-flex';
                    if (nextBtn)   nextBtn.style.display   = current === total ? 'none' : 'inline-flex';
                    if (submitBtn) submitBtn.style.display = current === total ? 'inline-flex' : 'none';
                    const indicator = $('[data-step-indicator]', form);
                    if (indicator) indicator.textContent = `Paso ${current} de ${total}`;
                };

                $('[data-step-next]', form)?.addEventListener('click', () => { if (current < total) { current++; update(); } });
                $('[data-step-prev]', form)?.addEventListener('click', () => { if (current > 1)     { current--; update(); } });
                update();
            });
        },
    };

    /**
     * MODULE: Counter Animation
     * data-count="1500" data-suffix="+" data-prefix="$" data-duration="2000"
     * Extend: decimal values, custom easing
     */
    const Counter = {
        init() {
            const counters = $$('[data-count]');
            if (!counters.length) return;

            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this._animate(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });

            counters.forEach(el => observer.observe(el));
        },

        _animate(el) {
            const target   = +el.dataset.count;
            const duration = +(el.dataset.duration || 2000);
            const prefix   = el.dataset.prefix || '';
            const suffix   = el.dataset.suffix || '';
            const start    = performance.now();

            const tick = now => {
                const progress = Math.min((now - start) / duration, 1);
                const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                el.textContent = prefix + Math.floor(eased * target).toLocaleString() + suffix;
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        },
    };

    /**
     * MODULE: Off-Canvas Menu
     * data-offcanvas-open="panel-id" on triggers
     * data-offcanvas-close on close buttons
     * .offcanvas-backdrop as backdrop element
     * Extend: right/top/bottom variants
     */
    const OffCanvas = {
        init() {
            const backdrop = $('.offcanvas-backdrop');

            const closeAll = () => {
                $$('.offcanvas').forEach(p => p.classList.remove(Config.openClass));
                backdrop?.classList.remove(Config.openClass);
                document.body.style.overflow = '';
            };

            $$('[data-offcanvas-open]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const panel = document.getElementById(btn.dataset.offcanvasOpen) || $('.offcanvas');
                    if (!panel) return;
                    panel.classList.add(Config.openClass);
                    backdrop?.classList.add(Config.openClass);
                    document.body.style.overflow = 'hidden';
                });
            });

            $$('[data-offcanvas-close]').forEach(btn => btn.addEventListener('click', closeAll));
            backdrop?.addEventListener('click', closeAll);
            document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
        },
    };

    /**
     * MODULE: Smooth Scroll
     * Handles <a href="#section"> with header offset
     * Extend: scroll-spy for nav highlighting
     */
    const SmoothScroll = {
        init() {
            $$('a[href^="#"]').forEach(link => {
                link.addEventListener('click', e => {
                    const href   = link.getAttribute('href');
                    if (href === '#') return;
                    const target = document.querySelector(href);
                    if (!target) return;
                    e.preventDefault();
                    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 70;
                    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerH - 16, behavior: 'smooth' });
                });
            });
        },
    };

    /**
     * MODULE: Gallery Lightbox (simple)
     * Add data-gallery-src="full-url" to .gallery-item elements
     * Extend: swipe gestures, zoom, keyboard navigation
     */
    const Gallery = {
        init() {
            const items = $$('[data-gallery-src]');
            if (!items.length) return;

            const lb = document.createElement('div');
            lb.className = 'modal-overlay';
            lb.id = '_cs_lightbox';
            lb.innerHTML = `
                <div style="position:relative;max-width:90vw;max-height:90vh;">
                    <img id="_cs_lb_img" style="max-width:90vw;max-height:85vh;border-radius:var(--radius-xl);display:block;" alt="">
                    <button style="position:absolute;top:-16px;right:-16px;background:var(--white);width:32px;height:32px;border-radius:var(--radius-md);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.2rem;" id="_cs_lb_close"><i class="ri-close-line"></i></button>
                </div>`;
            document.body.appendChild(lb);

            const lbImg  = lb.querySelector('#_cs_lb_img');
            const close  = () => { lb.classList.remove(Config.openClass); document.body.style.overflow = ''; };

            items.forEach(item => {
                item.style.cursor = 'pointer';
                item.addEventListener('click', () => {
                    lbImg.src = item.dataset.gallerySrc || item.querySelector('img')?.src || '';
                    lb.classList.add(Config.openClass);
                    document.body.style.overflow = 'hidden';
                });
            });

            lb.addEventListener('click', e => { if (e.target === lb) close(); });
            lb.querySelector('#_cs_lb_close')?.addEventListener('click', close);
            document.addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains(Config.openClass)) close(); });
        },
    };

    /**
     * MODULE: Theme Toggle (Dark Mode)
     * data-theme-toggle on any button
     * Extend: OS preference sync, CSS variables override for dark theme
     */
    const Theme = {
        init() {
            if (!$$('[data-theme-toggle]').length) return;
            const saved = localStorage.getItem('cs-theme');
            if (saved) document.documentElement.setAttribute('data-theme', saved);

            $$('[data-theme-toggle]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', next);
                    localStorage.setItem('cs-theme', next);
                    State.set('theme', next);
                });
            });
        },
    };

    /* =====================================================
       5. GLOBAL LISTENERS
       ===================================================== */
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') Dropdown.closeAll();
    });

    /* =====================================================
       6. PUBLIC API & INITIALIZATION
       ===================================================== */
    return {
        init() {
            Navigation.init();
            Sidebar.init();
            Modal.init();
            Tabs.init();
            Accordion.init();
            Dropdown.init();
            ScrollReveal.init();
            FormValidation.init();
            MultiStep.init();
            Counter.init();
            OffCanvas.init();
            SmoothScroll.init();
            Gallery.init();
            Theme.init();

            // Expose Toast globally for inline HTML: onclick="CoreSystem.toast('msg', 'success')"
            window.CoreToast = Toast;

            console.log('%cCoreSystem v2.0 ✓ — Listo para producción', 'color:#2563eb;font-weight:700;font-size:13px;');
        },

        // ── Shorthand public API ──────────────────────────
        toast:           (msg, type, ms) => Toast.show(msg, type, ms),
        openModal:       id  => Modal.open(id),
        closeModals:     ()  => Modal.closeAll(),
        openSidebar:     ()  => Sidebar.open(),
        closeSidebar:    ()  => Sidebar.close(),
        collapseSidebar: ()  => Sidebar.collapse(),
        state:           State,
        // Extend: expose modules for external scripts
    };
})();

document.addEventListener('DOMContentLoaded', () => CoreSystem.init());
