/**
 * Admin Dashboard — script.js
 * Sidebar toggle, dark mode, table interactions,
 * dropdowns, counter animations. Wrapped in DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Utility ─────────────────────────────────────────────── */
  const el  = (sel, ctx = document) => ctx.querySelector(sel);
  const els = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];


  /* ── 1. Sidebar — Desktop Collapse / Mobile Overlay ──────── */
  const sidebar        = el('.sidebar');
  const sidebarOverlay = el('.sidebar-overlay');
  const hamburgerBtn   = el('.topbar__hamburger');
  const collapseBtn    = el('.sidebar__collapse-btn');
  const main           = el('.main');

  let isMobile = () => window.innerWidth <= 768;

  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      if (isMobile()) {
        closeMobileSidebar();
      } else {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        collapseBtn.setAttribute('aria-expanded', String(!isCollapsed));
        collapseBtn.querySelector('.collapse-icon').textContent = isCollapsed ? '▶' : '◀';
        localStorage.setItem('sidebarCollapsed', isCollapsed);
      }
    });
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
      if (sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
  }

  function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    sidebarOverlay.classList.add('visible');
    hamburgerBtn && hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    sidebarOverlay.classList.remove('visible');
    hamburgerBtn && hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  // Restore collapsed state from localStorage
  const savedCollapsed = localStorage.getItem('sidebarCollapsed');
  if (savedCollapsed === 'true' && !isMobile()) {
    sidebar && sidebar.classList.add('collapsed');
    if (collapseBtn) {
      collapseBtn.querySelector('.collapse-icon').textContent = '▶';
    }
  }

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      closeMobileSidebar();
    }
  });


  /* ── 2. Dark Mode Toggle ──────────────────────────────────── */
  const darkToggle = el('#darkModeToggle');
  const htmlEl     = document.documentElement;

  function applyTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    if (darkToggle) {
      darkToggle.setAttribute('aria-pressed', String(theme === 'dark'));
      darkToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
      darkToggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }

  const savedTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  if (darkToggle) {
    darkToggle.addEventListener('click', () => {
      const next = htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('theme', next);
    });
  }


  /* ── 3. Active Nav Link Highlighting ─────────────────────── */
  const navItems = els('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });


  /* ── 4. Notification & User Dropdowns ────────────────────── */
  function setupDropdown(toggleSel, menuSel) {
    const toggle = el(toggleSel);
    const menu   = el(menuSel);
    if (!toggle || !menu) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');
      // Close all open dropdowns first
      els('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
      if (!isOpen) {
        menu.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      } else {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  setupDropdown('#notifToggle',  '#notifMenu');
  setupDropdown('#userToggle',   '#userMenu');

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    els('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    els('[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  });


  /* ── 5. Table — Select All + Individual Checkboxes ───────── */
  const selectAll  = el('#selectAll');
  const rowChecks  = els('.row-check');

  if (selectAll) {
    selectAll.addEventListener('change', () => {
      rowChecks.forEach(cb => {
        cb.checked = selectAll.checked;
        cb.closest('tr').classList.toggle('selected', selectAll.checked);
      });
    });
  }

  rowChecks.forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('tr').classList.toggle('selected', cb.checked);
      if (selectAll) {
        selectAll.checked = rowChecks.every(c => c.checked);
        selectAll.indeterminate = rowChecks.some(c => c.checked) && !rowChecks.every(c => c.checked);
      }
    });
  });


  /* ── 6. Sortable Table Columns ────────────────────────────── */
  const sortableHeaders = els('thead th[data-sort]');

  sortableHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const currentDir = th.dataset.dir || 'none';
      // Reset all headers
      sortableHeaders.forEach(h => {
        h.dataset.dir = 'none';
        const icon = h.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
      });
      // Toggle current
      const newDir = currentDir === 'asc' ? 'desc' : 'asc';
      th.dataset.dir = newDir;
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = newDir === 'asc' ? '↑' : '↓';

      sortTableByColumn(th);
    });
  });

  function sortTableByColumn(th) {
    const table   = th.closest('table');
    const tbody   = table.querySelector('tbody');
    const colIdx  = [...th.parentElement.children].indexOf(th);
    const dir     = th.dataset.dir;
    const rows    = [...tbody.querySelectorAll('tr')];

    rows.sort((a, b) => {
      const aText = a.cells[colIdx]?.textContent.trim() || '';
      const bText = b.cells[colIdx]?.textContent.trim() || '';
      const aNum  = parseFloat(aText.replace(/[^0-9.-]/g, ''));
      const bNum  = parseFloat(bText.replace(/[^0-9.-]/g, ''));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return dir === 'asc' ? aNum - bNum : bNum - aNum;
      }
      return dir === 'asc'
        ? aText.localeCompare(bText)
        : bText.localeCompare(aText);
    });

    rows.forEach(row => tbody.appendChild(row));
  }


  /* ── 7. KPI Counter Animation (count up from 0) ──────────── */
  function animateCounter(el, target, duration = 1400, prefix = '', suffix = '') {
    const start     = performance.now();
    const isDecimal = target % 1 !== 0;

    function update(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = target * eased;
      el.textContent = prefix + (isDecimal
        ? current.toFixed(1)
        : Math.round(current).toLocaleString()) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  const kpiCounters = els('[data-count]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el      = entry.target;
          const target  = parseFloat(el.dataset.count);
          const prefix  = el.dataset.prefix  || '';
          const suffix  = el.dataset.suffix  || '';
          animateCounter(el, target, 1400, prefix, suffix);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    kpiCounters.forEach(c => observer.observe(c));
  } else {
    // Fallback: set values directly
    kpiCounters.forEach(c => {
      c.textContent = (c.dataset.prefix || '') + c.dataset.count + (c.dataset.suffix || '');
    });
  }


  /* ── 8. Modal — Quick Actions ─────────────────────────────── */
  const modalOverlay = el('.modal-overlay');
  const modalClose   = el('.modal__close');

  els('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      modalOverlay && modalOverlay.classList.add('open');
    });
  });

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      modalOverlay.classList.remove('open');
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.remove('open');
    });
    // Esc key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modalOverlay.classList.remove('open');
    });
  }

}); // end DOMContentLoaded
