/**
 * CoreSystem Platform — Theme Manager
 * Handles dark/light mode, CSS variable injection, font and radius settings.
 */
const ThemeManager = (() => {
  'use strict';

  const STORAGE_KEY = 'cs-platform-theme';
  const root = document.documentElement;

  const RADIUS_MAP = { sm: '4px', md: '8px', lg: '16px', xl: '24px' };
  const FONT_MAP = {
    system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono:   "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    serif:  "Georgia, 'Times New Roman', serif"
  };

  // ── Apply theme config to CSS variables ───────────────────────────────────
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme.mode);

    root.style.setProperty('--primary', theme.primaryColor);
    root.style.setProperty('--accent', theme.secondaryColor);
    root.style.setProperty('--radius', RADIUS_MAP[theme.radius] || RADIUS_MAP.md);
    root.style.setProperty('--font-sans', FONT_MAP[theme.font] || FONT_MAP.system);

    // Derive primary variants
    root.style.setProperty('--primary-dark', _darken(theme.primaryColor, 15));
    root.style.setProperty('--primary-light', _lighten(theme.primaryColor, 45));

    _updateToggleIcon(theme.mode);
    _persist(theme);
  }

  // ── Toggle dark / light ───────────────────────────────────────────────────
  function toggle() {
    const current = root.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    AppState.set('theme.mode', next);
    _updateToggleIcon(next);
    const saved = _load();
    _persist({ ...saved, mode: next });
  }

  function setMode(mode) {
    root.setAttribute('data-theme', mode);
    _updateToggleIcon(mode);
  }

  // ── Persist / Restore ─────────────────────────────────────────────────────
  function _persist(theme) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)); } catch {}
  }

  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }

  function restore() {
    const saved = _load();
    if (!saved.mode) return;
    AppState.set('theme.mode', saved.mode);
    if (saved.primaryColor) AppState.set('theme.primaryColor', saved.primaryColor);
    if (saved.secondaryColor) AppState.set('theme.secondaryColor', saved.secondaryColor);
    if (saved.radius) AppState.set('theme.radius', saved.radius);
    if (saved.font) AppState.set('theme.font', saved.font);
    applyTheme({ ...AppState.get('theme'), ...saved });
  }

  // ── Icon update ───────────────────────────────────────────────────────────
  function _updateToggleIcon(mode) {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', mode === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
      const icon = btn.querySelector('.theme-icon');
      if (icon) icon.textContent = mode === 'dark' ? '☀' : '◑';
    });
  }

  // ── Color helpers (hex manipulation) ─────────────────────────────────────
  function _hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return { r: parseInt(hex.slice(0,2), 16), g: parseInt(hex.slice(2,4), 16), b: parseInt(hex.slice(4,6), 16) };
  }

  function _rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  }

  function _darken(hex, pct) {
    const { r, g, b } = _hexToRgb(hex);
    const f = 1 - pct / 100;
    return _rgbToHex({ r: r * f, g: g * f, b: b * f });
  }

  function _lighten(hex, pct) {
    const { r, g, b } = _hexToRgb(hex);
    const f = pct / 100;
    return _rgbToHex({ r: r + (255 - r) * f, g: g + (255 - g) * f, b: b + (255 - b) * f });
  }

  // ── Generate theme CSS block (for compiled output) ────────────────────────
  function generateThemeCSS(theme) {
    const mode = theme.mode === 'dark';
    return `:root {
  --primary: ${theme.primaryColor};
  --primary-dark: ${_darken(theme.primaryColor, 15)};
  --primary-light: ${_lighten(theme.primaryColor, 45)};
  --accent: ${theme.secondaryColor};
  --radius: ${RADIUS_MAP[theme.radius] || '8px'};
  --font-sans: ${FONT_MAP[theme.font] || FONT_MAP.system};
  --bg: ${mode ? '#0F172A' : '#F8FAFC'};
  --surface: ${mode ? '#1E293B' : '#FFFFFF'};
  --border: ${mode ? '#334155' : '#E2E8F0'};
  --text: ${mode ? '#F1F5F9' : '#0F172A'};
  --text-2: ${mode ? '#94A3B8' : '#64748B'};
}`;
  }

  return { applyTheme, toggle, setMode, restore, generateThemeCSS };
})();
