/**
 * LaunchKit — Landing Pro  |  script.js
 * Navbar toggle, sticky scroll, smooth scroll,
 * FAQ accordion, scroll reveal via IntersectionObserver
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Element References ──────────────────────────────── */
  const navbar      = document.getElementById('navbar');
  const hamburger   = document.getElementById('hamburger');
  const navMenu     = document.getElementById('nav-menu');
  const themeToggle = document.getElementById('theme-toggle');
  const faqItems    = document.querySelectorAll('.faq-item');
  const revealEls   = document.querySelectorAll('.reveal');
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  /* ── 2. Navbar — Mobile Hamburger Toggle ────────────────── */
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu when a nav link is clicked
    navMenu.querySelectorAll('.navbar-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target)) {
        navMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── 3. Navbar — Sticky Scroll Class ───────────────────── */
  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on init
  }

  /* ── 4. Dark / Light Theme Toggle ──────────────────────── */
  if (themeToggle) {
    const sunIcon  = themeToggle.querySelector('.icon-sun');
    const moonIcon = themeToggle.querySelector('.icon-moon');

    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      if (sunIcon && moonIcon) {
        sunIcon.style.display  = theme === 'dark' ? 'block' : 'none';
        moonIcon.style.display = theme === 'dark' ? 'none'  : 'block';
      }
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    };

    const savedTheme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  /* ── 5. Smooth Scroll for Anchor Links ──────────────────── */
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      const offset = (navbar ? navbar.offsetHeight : 0) + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ── 6. FAQ Accordion (multiple open allowed) ───────────── */
  faqItems.forEach(item => {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
      answer.setAttribute('aria-hidden', String(!isOpen));
    });
  });

  /* ── 7. Scroll Reveal via IntersectionObserver ──────────── */
  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: show all immediately if observer not supported
    revealEls.forEach(el => el.classList.add('visible'));
  }

  /* ── 8. Active Nav Link on Scroll ──────────────────────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.navbar-link[href^="#"]');

  if (sections.length && navLinks.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            navLinks.forEach(link => {
              link.classList.toggle(
                'active',
                link.getAttribute('href') === `#${entry.target.id}`
              );
            });
          }
        });
      },
      { threshold: 0.4 }
    );
    sections.forEach(section => sectionObserver.observe(section));
  }

});
