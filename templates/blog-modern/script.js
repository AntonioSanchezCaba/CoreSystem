/* ============================================================
   Blog Modern — script.js
   Navbar, dark mode, newsletter, search, progress bar, reveal
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Navbar Mobile Toggle ─────────────────────────────── */
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks  = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen);
      // Animate hamburger into X
      const spans = navToggle.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.opacity   = '0';
        spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity   = '';
        spans[2].style.transform = '';
      }
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.querySelectorAll('span').forEach(s => {
          s.style.transform = '';
          s.style.opacity   = '';
        });
      });
    });
  }

  /* ── 2. Sticky Navbar Shadow on Scroll ───────────────────── */
  const navbar = document.querySelector('.navbar');
  const onScroll = () => {
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    }
    updateProgress();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── 3. Dark Mode Toggle with localStorage ───────────────── */
  const themeToggle = document.getElementById('theme-toggle');
  const root        = document.documentElement;

  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.textContent = theme === 'dark' ? '☀' : '☾';
    }
  };

  const savedTheme = localStorage.getItem('blog-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('blog-theme', next);
    });
  }

  /* ── 4. Newsletter Form Submit Handler ───────────────────── */
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input   = form.querySelector('.newsletter-input');
      const successMsg = form.querySelector('.success-msg');
      if (!input || !input.value.trim()) return;
      if (successMsg) {
        successMsg.style.display = 'block';
        input.value = '';
        setTimeout(() => { successMsg.style.display = 'none'; }, 4000);
      }
    });
  });

  /* ── 5. Search — Filter Post Cards by Title ──────────────── */
  const searchInput  = document.querySelector('.search-input');
  const searchBtn    = document.querySelector('.btn-search');
  const postCards    = document.querySelectorAll('.post-card');

  const filterPosts = () => {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    postCards.forEach(card => {
      const title = (card.querySelector('h2')?.textContent || '').toLowerCase();
      card.style.display = (!query || title.includes(query)) ? '' : 'none';
    });
  };

  if (searchInput) {
    searchInput.addEventListener('input', filterPosts);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') filterPosts(); });
  }
  if (searchBtn) { searchBtn.addEventListener('click', filterPosts); }

  /* ── 6. Reading Progress Bar ─────────────────────────────── */
  const progressBar = document.getElementById('reading-progress');

  const updateProgress = () => {
    if (!progressBar) return;
    const scrollTop    = window.scrollY;
    const docHeight    = document.documentElement.scrollHeight - window.innerHeight;
    const pct          = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = Math.min(pct, 100) + '%';
  };

  /* ── 7. Scroll Reveal for Post Cards ─────────────────────── */
  const revealCards = () => {
    postCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight - 60) {
        card.classList.add('revealed');
      }
    });
  };

  window.addEventListener('scroll', revealCards, { passive: true });
  // Trigger once on load for cards already in view
  revealCards();

});
