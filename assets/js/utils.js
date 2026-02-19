/**
 * CoreSystem Platform — Utilities
 * DOM helpers, string utilities, ZIP creator, syntax highlighter, toast.
 * No external dependencies.
 */
const Utils = (() => {
  'use strict';

  // ── DOM Helpers ───────────────────────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function on(target, event, selectorOrFn, fn) {
    if (typeof selectorOrFn === 'function') {
      target.addEventListener(event, selectorOrFn);
      return () => target.removeEventListener(event, selectorOrFn);
    }
    const handler = (e) => {
      const match = e.target.closest(selectorOrFn);
      if (match && target.contains(match)) fn(e, match);
    };
    target.addEventListener(event, handler);
    return () => target.removeEventListener(event, handler);
  }

  function createElement(tag, props = {}, innerHTML = '') {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k.startsWith('data-')) el.setAttribute(k, v);
      else el.setAttribute(k, v);
    });
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  }

  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function throttle(fn, ms) {
    let last = 0;
    return (...a) => { const n = Date.now(); if (n - last >= ms) { last = n; fn(...a); } };
  }

  // ── String / ID ───────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function generateId(prefix = 'cs') {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // ── Clipboard ─────────────────────────────────────────────────────────────
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text); return true;
    } catch {
      const ta = Object.assign(document.createElement('textarea'), {
        value: text, style: 'position:fixed;opacity:0'
      });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      ta.remove(); return true;
    }
  }

  // ── File Download ─────────────────────────────────────────────────────────
  function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([content], { type: mime })),
      download: filename
    });
    a.click(); URL.revokeObjectURL(a.href);
  }

  // ── ZIP Writer (pure JS, PKZIP Store method) ──────────────────────────────
  function _crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function _u16(v) { return [v & 0xFF, (v >> 8) & 0xFF]; }
  function _u32(v) { return [v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF]; }

  function createZip(files) {
    const enc = new TextEncoder();
    const locals = []; const centrals = []; let pos = 0;

    for (const { name, content } of files) {
      const nameBytes = enc.encode(name);
      const data = enc.encode(content);
      const crc = _crc32(data);
      const sz = data.length;

      const lh = [
        0x50, 0x4B, 0x03, 0x04,   // signature
        ..._u16(20), ..._u16(0), ..._u16(0),   // version, flags, method
        ..._u16(0), ..._u16(0),    // mod time, mod date
        ..._u32(crc), ..._u32(sz), ..._u32(sz),
        ..._u16(nameBytes.length), ..._u16(0),
        ...nameBytes, ...data
      ];

      const ch = [
        0x50, 0x4B, 0x01, 0x02,   // signature
        ..._u16(20), ..._u16(20), ..._u16(0), ..._u16(0),
        ..._u16(0), ..._u16(0),
        ..._u32(crc), ..._u32(sz), ..._u32(sz),
        ..._u16(nameBytes.length), ..._u16(0), ..._u16(0), ..._u16(0), ..._u16(0),
        ..._u32(0), ..._u32(pos),
        ...nameBytes
      ];

      locals.push(lh); centrals.push(ch); pos += lh.length;
    }

    const cdStart = pos;
    const cdSize = centrals.reduce((s, c) => s + c.length, 0);
    const eocd = [
      0x50, 0x4B, 0x05, 0x06,
      ..._u16(0), ..._u16(0),
      ..._u16(files.length), ..._u16(files.length),
      ..._u32(cdSize), ..._u32(cdStart),
      ..._u16(0)
    ];

    const all = [...locals.flat(), ...centrals.flat(), ...eocd];
    return new Uint8Array(all);
  }

  function downloadZip(zipName, files) {
    const data = createZip(files);
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([data], { type: 'application/zip' })),
      download: zipName
    });
    a.click(); URL.revokeObjectURL(a.href);
  }

  // ── Syntax Highlighter ────────────────────────────────────────────────────
  const Highlighter = {
    html(raw) {
      return escapeHtml(raw)
        // Comments
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<em class="hl-comment">$1</em>')
        // Doctype
        .replace(/(&lt;!DOCTYPE[^&]*&gt;)/gi, '<span class="hl-doctype">$1</span>')
        // Closing tags
        .replace(/(&lt;\/)([\w-]+)(&gt;)/g, '$1<span class="hl-tag">$2</span>$3')
        // Opening tags — tag name
        .replace(/(&lt;)([\w-]+)/g, '$1<span class="hl-tag">$2</span>')
        // Attribute names
        .replace(/\s([\w-:]+)=/g, ' <span class="hl-attr">$1</span>=')
        // Attribute values
        .replace(/=(&quot;[^&]*&quot;)/g, '=<span class="hl-string">$1</span>');
    },

    css(raw) {
      return escapeHtml(raw)
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<em class="hl-comment">$1</em>')
        .replace(/(@[\w-]+)/g, '<span class="hl-at">$1</span>')
        .replace(/([\w.#:*\[\](),"' +~>^$|=-]+)\s*\{/g, '<span class="hl-selector">$1</span> {')
        .replace(/([\w-]+)\s*:/g, '<span class="hl-prop">$1</span>:')
        .replace(/:\s*([^;\n{]+)/g, (m, v) => `: <span class="hl-value">${v}</span>`);
    },

    js(raw) {
      const kw = ['const','let','var','function','return','if','else','for','while',
        'class','extends','new','this','typeof','instanceof','null','undefined',
        'true','false','async','await','try','catch','finally','throw','switch',
        'case','break','continue','of','in','import','export','default','static'];
      return escapeHtml(raw)
        .replace(/(\/\/[^\n]*)/g, '<em class="hl-comment">$1</em>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<em class="hl-comment">$1</em>')
        .replace(/(`[^`]*`)/gs, '<span class="hl-string">$1</span>')
        .replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, '<span class="hl-string">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>')
        .replace(new RegExp(`\\b(${kw.join('|')})\\b`, 'g'), '<span class="hl-kw">$1</span>');
    },

    addLineNumbers(highlighted) {
      return highlighted.split('\n')
        .map((line, i) => `<span class="code-line"><span class="line-num">${i + 1}</span>${line}</span>`)
        .join('\n');
    },

    highlight(code, lang) {
      const h = lang === 'html' ? this.html(code)
              : lang === 'css'  ? this.css(code)
              : this.js(code);
      return this.addLineNumbers(h);
    }
  };

  // ── Toast Notifications ───────────────────────────────────────────────────
  function showToast(msg, type = 'info', duration = 3500) {
    const ct = document.getElementById('toast-container');
    if (!ct) return;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const t = createElement('div', { class: `toast toast--${type}` },
      `<span class="toast__icon">${icons[type] || '●'}</span>
       <span class="toast__msg">${escapeHtml(msg)}</span>
       <button class="toast__close" aria-label="Cerrar">✕</button>`
    );
    ct.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast--visible'));

    const remove = () => { t.classList.remove('toast--visible'); setTimeout(() => t.remove(), 300); };
    t.querySelector('.toast__close').addEventListener('click', remove);
    setTimeout(remove, duration);
  }

  // ── Public ────────────────────────────────────────────────────────────────
  return {
    $, $$, on, createElement, debounce, throttle,
    escapeHtml, generateId,
    copyToClipboard, downloadFile, downloadZip,
    Highlighter, showToast
  };
})();
