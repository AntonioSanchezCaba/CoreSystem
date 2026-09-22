/**
 * CoreSystem — Ecommerce Template Script
 * Standalone, production-ready JavaScript
 * Features: product filtering, cart management, wishlist,
 *           view toggle, sort, search, toast notifications.
 */

/* ========================= State ========================= */
const State = {
  cart: [],        // { id, name, price, qty }
  wishlist: new Set(),
  activeCategory: 'all',
  activeView: 'grid',
  searchQuery: '',
  sortBy: 'popular',
};

let debounceTimer = null;

/* ========================= Utilities ========================= */
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function debounce(fn, wait) {
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function formatPrice(price) {
  return parseFloat(price).toFixed(2).replace('.', ',');
}

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
    <button class="toast-close" aria-label="Cerrar">
      <i class="ri-close-line"></i>
    </button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
  });

  setTimeout(() => dismissToast(toast), 3500);
}

function dismissToast(toast) {
  toast.classList.remove('toast-visible');
  toast.classList.add('toast-hiding');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

/* ========================= Cart ========================= */
function updateCartBadge() {
  const badge = $('#cartBadge');
  if (!badge) return;
  const total = State.cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = total;
  badge.style.display = total > 0 ? '' : 'none';
}

function addToCart(id, name, price) {
  const existing = State.cart.find(item => item.id === id);
  if (existing) {
    existing.qty++;
  } else {
    State.cart.push({ id, name, price: parseFloat(price), qty: 1 });
  }
  updateCartBadge();
  showToast(`"${name}" añadido al carrito 🛒`, 'success');
}

function initCart() {
  const cartBtn = $('.cart-btn, [data-open-cart]');
  cartBtn?.addEventListener('click', () => {
    showToast(`${State.cart.reduce((s, i) => s + i.qty, 0)} producto(s) en tu carrito`, 'info');
  });

  // Add to cart buttons
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-cart');
    if (!btn) return;
    e.preventDefault();
    addToCart(btn.dataset.id, btn.dataset.name, btn.dataset.price);

    // Visual feedback
    btn.classList.add('btn-cart--added');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="ri-check-line"></i> Añadido';
    setTimeout(() => {
      btn.classList.remove('btn-cart--added');
      btn.innerHTML = origText;
    }, 1400);
  });
}

/* ========================= Wishlist ========================= */
function initWishlist() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-wishlist');
    if (!btn) return;
    e.preventDefault();

    const id = btn.dataset.id;
    if (State.wishlist.has(id)) {
      State.wishlist.delete(id);
      btn.classList.remove('btn-wishlist--active');
      btn.querySelector('i').className = 'ri-heart-line';
      showToast('Eliminado de lista de deseos', 'info');
    } else {
      State.wishlist.add(id);
      btn.classList.add('btn-wishlist--active');
      btn.querySelector('i').className = 'ri-heart-fill';
      showToast('Añadido a lista de deseos ♥', 'success');
    }
  });
}

/* ========================= Product Filtering ========================= */
function getProducts() {
  return $$('.product-card', document);
}

function filterAndSort() {
  const products = getProducts();
  const { activeCategory, searchQuery, sortBy } = State;

  let visible = [];

  products.forEach(card => {
    const cat   = card.dataset.category || '';
    const name  = card.querySelector('.product-name')?.textContent.toLowerCase() || '';
    const desc  = card.querySelector('.product-desc')?.textContent.toLowerCase() || '';

    const matchCat    = activeCategory === 'all' || cat === activeCategory;
    const matchSearch = !searchQuery || name.includes(searchQuery) || desc.includes(searchQuery);

    if (matchCat && matchSearch) {
      card.style.display = '';
      visible.push(card);
    } else {
      card.style.display = 'none';
    }
  });

  // Sort visible items
  const grid = $('#productGrid');
  if (grid) {
    const sorted = visible.sort((a, b) => {
      if (sortBy === 'price-asc')  return parseFloat(a.dataset.price || 0) - parseFloat(b.dataset.price || 0);
      if (sortBy === 'price-desc') return parseFloat(b.dataset.price || 0) - parseFloat(a.dataset.price || 0);
      if (sortBy === 'popular')    return parseInt(b.dataset.popular || 0) - parseInt(a.dataset.popular || 0);
      return 0;
    });
    sorted.forEach(card => grid.appendChild(card));
  }

  // Update count
  const countEl = $('#productCount');
  if (countEl) {
    countEl.textContent = `${visible.length} producto${visible.length !== 1 ? 's' : ''}`;
  }
}

function initCategoryFilter() {
  const pills = $$('.category-pill');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-pressed', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-pressed', 'true');

      State.activeCategory = pill.dataset.category || 'all';
      filterAndSort();
    });
  });
}

function initSearch() {
  const input = $('#searchInput, .search-input');
  if (!input) return;

  const filterDebounced = debounce(() => {
    State.searchQuery = input.value.trim().toLowerCase();
    filterAndSort();
  }, 250);

  input.addEventListener('input', filterDebounced);
}

function initSort() {
  const select = $('#sortSelect, .sort-select');
  if (!select) return;

  select.addEventListener('change', () => {
    State.sortBy = select.value;
    filterAndSort();
  });
}

/* ========================= View Toggle (Grid / List) ========================= */
function initViewToggle() {
  const gridBtn = $('#gridViewBtn');
  const listBtn = $('#listViewBtn');
  const grid    = $('#productGrid');

  if (!gridBtn || !listBtn || !grid) return;

  function setView(view) {
    State.activeView = view;

    grid.classList.toggle('product-list', view === 'list');
    grid.classList.toggle('product-grid', view === 'grid');

    gridBtn.classList.toggle('active', view === 'grid');
    listBtn.classList.toggle('active', view === 'list');
    gridBtn.setAttribute('aria-pressed', String(view === 'grid'));
    listBtn.setAttribute('aria-pressed', String(view === 'list'));
  }

  gridBtn.addEventListener('click', () => setView('grid'));
  listBtn.addEventListener('click', () => setView('list'));
}

/* ========================= Navbar ========================= */
function initNavbar() {
  const navbar = $('.navbar');

  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* ========================= Reveal Animations ========================= */
function initReveal() {
  const elements = $$('.reveal, .product-card');
  if (!elements.length || !window.IntersectionObserver) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
}

/* ========================= Init ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCart();
  initWishlist();
  initCategoryFilter();
  initSearch();
  initSort();
  initViewToggle();
  initReveal();
  updateCartBadge();
});
