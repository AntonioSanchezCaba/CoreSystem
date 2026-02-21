/**
 * CoreSystem — Blog Sidebar Template Script
 * Standalone, production-ready JavaScript
 * Features: navbar, mobile menu, search, sidebar search, newsletter,
 *           reveal animations, pagination, tag filtering, toast notifications.
 */

/* ========================= Configuration ========================= */
const CONFIG = {
  revealThreshold:  0.15,
  revealRootMargin: '0px 0px -60px 0px',
  toastDuration:    3500,
  searchDebounce:   250,
};

/* ========================= State ========================= */
let debounceTimer = null;
let toastQueue    = [];
let isShowingToast = false;

/* ========================= Utility Functions ========================= */
function debounce(fn, wait) {
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

/* ========================= Toast Notifications ========================= */
function showToast(message, type = 'default') {
  const container = $('#toastContainer');
  if (!container) return;

  const icons = {
    success: 'ri-check-line',
    error:   'ri-error-warning-line',
    warning: 'ri-alert-line',
    info:    'ri-information-line',
    default: 'ri-notification-line',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <i class="ri ${icons[type] || icons.default} toast-icon"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Cerrar notificación">
      <i class="ri-close-line"></i>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
  });

  setTimeout(() => dismissToast(toast), CONFIG.toastDuration);
}

function dismissToast(toast) {
  toast.classList.remove('toast-visible');
  toast.classList.add('toast-hiding');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

/* ========================= Navbar ========================= */
function initNavbar() {
  const navbar   = $('.navbar');
  const menuBtn  = $('.mobile-menu-btn');
  const nav      = $('.navbar-nav');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (!navbar) return;
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // Mobile menu toggle
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav-open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      menuBtn.querySelector('i').className = isOpen ? 'ri-close-line' : 'ri-menu-line';
    });
  }

  // Close menu on nav link click
  $$('.navbar-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav?.classList.remove('nav-open');
      menuBtn?.setAttribute('aria-expanded', 'false');
      if (menuBtn) menuBtn.querySelector('i').className = 'ri-menu-line';
    });
  });
}

/* ========================= Search (Navbar) ========================= */
function initNavSearch() {
  const toggleBtn  = $('.search-toggle-btn');
  const closeBtn   = $('.search-close-btn');
  const searchBar  = $('#navbarSearch');
  const searchInput = $('#navSearchInput');

  function openSearch() {
    searchBar?.classList.add('search-open');
    searchBar?.setAttribute('aria-hidden', 'false');
    searchInput?.focus();
  }

  function closeSearch() {
    searchBar?.classList.remove('search-open');
    searchBar?.setAttribute('aria-hidden', 'true');
    if (searchInput) searchInput.value = '';
  }

  toggleBtn?.addEventListener('click', openSearch);
  closeBtn?.addEventListener('click', closeSearch);

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });
}

/* ========================= Sidebar Search ========================= */
function initSidebarSearch() {
  const input      = $('#sidebarSearch');
  const articles   = $$('.article-card');
  const countEl    = $('#articleCount');

  if (!input) return;

  const filterArticles = debounce(() => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;

    articles.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const tags  = (card.dataset.tags  || '').toLowerCase();
      const match = !q || title.includes(q) || tags.includes(q);

      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    if (countEl) {
      countEl.textContent = q
        ? `${visible} resultado${visible !== 1 ? 's' : ''} encontrado${visible !== 1 ? 's' : ''}`
        : `Mostrando ${articles.length} artículos`;
    }
  }, CONFIG.searchDebounce);

  input.addEventListener('input', filterArticles);
}

/* ========================= Reveal Animations ========================= */
function initReveal() {
  const elements = $$('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: CONFIG.revealThreshold,
    rootMargin: CONFIG.revealRootMargin,
  });

  elements.forEach(el => observer.observe(el));
}

/* ========================= Newsletter Form ========================= */
function initNewsletter() {
  const form  = $('#newsletterForm');
  const email = $('#newsletterEmail');

  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const val = email?.value.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!val || !emailRe.test(val)) {
      showToast('Por favor ingresa un email válido.', 'warning');
      email?.classList.add('input-error');
      return;
    }

    email?.classList.remove('input-error');
    showToast('¡Suscripción exitosa! Revisa tu bandeja de entrada.', 'success');
    form.reset();
  });
}

/* ========================= Pagination ========================= */
function initPagination() {
  const btns = $$('.pagination .pagination-btn:not([disabled])');

  btns.forEach(btn => {
    if (btn.getAttribute('aria-label')) return; // skip prev/next

    btn.addEventListener('click', () => {
      $$('.pagination-btn.active').forEach(b => {
        b.classList.remove('active');
        b.removeAttribute('aria-current');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');

      // Scroll back to article list
      document.querySelector('.articles-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ========================= Tag Filtering ========================= */
function initTagFilter() {
  const tagLinks = $$('.tags-cloud .tag');
  const articles = $$('.article-card');
  const countEl  = $('#articleCount');

  tagLinks.forEach(tag => {
    tag.addEventListener('click', e => {
      e.preventDefault();
      const keyword = tag.textContent.trim().toLowerCase();

      let visible = 0;
      articles.forEach(card => {
        const tags  = (card.dataset.tags  || '').toLowerCase();
        const title = (card.dataset.title || '').toLowerCase();
        const match = tags.includes(keyword) || title.includes(keyword);

        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });

      if (countEl) {
        countEl.textContent = `${visible} artículo${visible !== 1 ? 's' : ''} con "${tag.textContent.trim()}"`;
      }

      // Scroll to articles
      document.querySelector('.articles-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ========================= Category Filter ========================= */
function initCategoryFilter() {
  const categoryItems = $$('.category-item');
  const articles      = $$('.article-card');
  const countEl       = $('#articleCount');

  categoryItems.forEach(item => {
    item.style.cursor = 'pointer';

    item.addEventListener('click', () => {
      const cat = item.querySelector('span:first-child')?.textContent.trim().toLowerCase();
      if (!cat) return;

      let visible = 0;
      articles.forEach(card => {
        const tags  = (card.dataset.tags  || '').toLowerCase();
        const title = (card.dataset.title || '').toLowerCase();
        const match = tags.includes(cat) || title.includes(cat);

        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });

      if (countEl) {
        countEl.textContent = `${visible} artículo${visible !== 1 ? 's' : ''} en "${item.querySelector('span:first-child')?.textContent.trim()}"`;
      }

      document.querySelector('.articles-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ========================= Article Read More ========================= */
function initReadMore() {
  $$('.article-read-more').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const title = link.closest('.article-card')?.dataset.title || 'este artículo';
      showToast(`Abriendo: "${title}"`, 'info');
    });
  });
}

/* ========================= Init ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initNavSearch();
  initSidebarSearch();
  initReveal();
  initNewsletter();
  initPagination();
  initTagFilter();
  initCategoryFilter();
  initReadMore();
});
