/**
 * Visual Layout OS — Token System
 * Design tokens stored as CSS custom properties.
 * Changing a token updates the entire preview instantly.
 */
const TokenSystem = (() => {
  'use strict';

  const DEFAULTS = {
    // Colors
    'color-primary':    '#2563EB',
    'color-secondary':  '#7C3AED',
    'color-accent':     '#10B981',
    'color-bg':         '#F8FAFC',
    'color-surface':    '#FFFFFF',
    'color-border':     '#E2E8F0',
    'color-text':       '#0F172A',
    'color-text-2':     '#64748B',

    // Spacing
    'spacing-1':  '4px',
    'spacing-2':  '8px',
    'spacing-3':  '12px',
    'spacing-4':  '16px',
    'spacing-5':  '20px',
    'spacing-6':  '24px',
    'spacing-8':  '32px',
    'spacing-10': '40px',
    'spacing-12': '48px',
    'spacing-16': '64px',
    'spacing-20': '80px',
    'spacing-24': '96px',

    // Border radius
    'radius-sm':  '4px',
    'radius-md':  '8px',
    'radius-lg':  '16px',
    'radius-xl':  '24px',
    'radius-full':'9999px',

    // Shadows
    'shadow-sm':  '0 1px 3px rgba(0,0,0,.08)',
    'shadow-md':  '0 4px 12px rgba(0,0,0,.1)',
    'shadow-lg':  '0 12px 32px rgba(0,0,0,.12)',
    'shadow-xl':  '0 24px 64px rgba(0,0,0,.16)',

    // Typography
    'font-base':        "system-ui, -apple-system, 'Segoe UI', sans-serif",
    'font-mono':        "'JetBrains Mono', 'Fira Code', monospace",
    'font-size-xs':     '0.75rem',
    'font-size-sm':     '0.875rem',
    'font-size-base':   '1rem',
    'font-size-lg':     '1.125rem',
    'font-size-xl':     '1.25rem',
    'font-size-2xl':    '1.5rem',
    'font-size-3xl':    '1.875rem',
    'font-size-4xl':    '2.25rem',
    'font-size-5xl':    '3rem',
    'font-scale-ratio': '1.25',
    'line-height-base': '1.6',

    // Breakpoints (stored as px values)
    'breakpoint-sm':    '640px',
    'breakpoint-md':    '768px',
    'breakpoint-lg':    '1024px',
    'breakpoint-xl':    '1280px',

    // Transitions
    'transition-fast':  '120ms ease',
    'transition-base':  '200ms ease',
    'transition-slow':  '350ms ease',
  };

  let _tokens = { ...DEFAULTS };

  // ── Apply to DOM ──────────────────────────────────────────────────────────
  function _apply() {
    const root = document.documentElement;
    Object.entries(_tokens).forEach(([k, v]) => {
      root.style.setProperty(`--${k}`, v);
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function init() {
    // Load persisted tokens
    try {
      const saved = localStorage.getItem('vlos-tokens');
      if (saved) _tokens = { ...DEFAULTS, ...JSON.parse(saved) };
    } catch {}
    _apply();
  }

  function get(key) { return _tokens[key] ?? DEFAULTS[key]; }

  function set(key, value) {
    _tokens[key] = value;
    document.documentElement.style.setProperty(`--${key}`, value);
    try { localStorage.setItem('vlos-tokens', JSON.stringify(_tokens)); } catch {}
    EventBus.emit(EventBus.EVENTS.TOKENS_CHANGE, { key, value });
  }

  function setMany(partial) {
    Object.assign(_tokens, partial);
    _apply();
    try { localStorage.setItem('vlos-tokens', JSON.stringify(_tokens)); } catch {}
    EventBus.emit(EventBus.EVENTS.TOKENS_CHANGE, _tokens);
  }

  function getAll() { return { ..._tokens }; }

  function reset() {
    _tokens = { ...DEFAULTS };
    _apply();
    try { localStorage.removeItem('vlos-tokens'); } catch {}
    EventBus.emit(EventBus.EVENTS.TOKENS_CHANGE, _tokens);
  }

  /** Generate CSS :root block for exported stylesheets */
  function toCSSVars() {
    return `:root {\n` +
      Object.entries(_tokens)
        .map(([k, v]) => `  --${k}: ${v};`)
        .join('\n') +
    `\n}`;
  }

  /** Categorized token list for the inspector UI */
  function getCategories() {
    return {
      Colors:     Object.entries(_tokens).filter(([k]) => k.startsWith('color-')),
      Spacing:    Object.entries(_tokens).filter(([k]) => k.startsWith('spacing-')),
      Radius:     Object.entries(_tokens).filter(([k]) => k.startsWith('radius-')),
      Shadows:    Object.entries(_tokens).filter(([k]) => k.startsWith('shadow-')),
      Typography: Object.entries(_tokens).filter(([k]) => k.startsWith('font-') || k.startsWith('font-size-') || k.startsWith('line-')),
      Breakpoints:Object.entries(_tokens).filter(([k]) => k.startsWith('breakpoint-')),
    };
  }

  return { init, get, set, setMany, getAll, reset, toCSSVars, getCategories, DEFAULTS };
})();
