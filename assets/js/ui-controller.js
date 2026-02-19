/**
 * CoreSystem Platform — UI Controller
 * All DOM interactions: filters, modals, code viewer, creative engine panel.
 */
const UIController = (() => {
  'use strict';
  const { $, $$, on, copyToClipboard, showToast, Highlighter } = Utils;

  // ── Template Library ──────────────────────────────────────────────────────
  function initTemplateLibrary() {
    const grid      = $('#template-grid');
    const filterBtns = $$('[data-filter]');
    const searchInput = $('#tpl-search');

    function renderTemplates() {
      const cat   = AppState.get('activeFilter');
      const query = AppState.get('searchQuery');
      const tpls  = TemplateEngine.filter(cat, query);
      grid.innerHTML = TemplateEngine.renderGrid(tpls);
    }

    // Filter buttons
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        AppState.set('activeFilter', btn.dataset.filter);
        renderTemplates();
      });
    });

    // Search
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(e => {
        AppState.set('searchQuery', e.target.value);
        renderTemplates();
      }, 220));
    }

    // Card action buttons (event delegation)
    on(grid, 'click', '[data-action]', async (e, btn) => {
      const action = btn.dataset.action;
      const id     = btn.dataset.tplId;
      const tpl    = await TemplateEngine.loadCode(id);
      if (!tpl) return;

      if (action === 'preview') openPreviewModal(tpl);
      if (action === 'code')    openCodeModal(tpl);
      if (action === 'download') {
        if (tpl.comingSoon) { showToast('Esta plantilla estará disponible pronto.', 'info'); return; }
        Generator.downloadTemplateZip(id, tpl);
      }
    });

    renderTemplates();
  }

  // ── Preview Modal ─────────────────────────────────────────────────────────
  function openPreviewModal(tpl) {
    const modal    = $('#modal-preview');
    const title    = $('#modal-preview-title');
    const iframe   = $('#preview-iframe');
    const openLink = $('#preview-open-link');

    title.textContent = tpl.name;

    if (tpl.comingSoon) {
      iframe.srcdoc = `<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#64748B;flex-direction:column;gap:1rem;"><div style="font-size:3rem;">🚧</div><h2>Coming Soon</h2><p>Esta plantilla estará disponible próximamente.</p></body>`;
    } else {
      // If HTML is a full page — show it
      if (tpl.html && tpl.html.includes('<!DOCTYPE')) {
        iframe.srcdoc = tpl.html.replace('styles.css', '').replace('script.js', '');
      } else {
        iframe.srcdoc = `<body style="padding:2rem;font-family:system-ui;"><p>Sirve el proyecto con un servidor HTTP para previsualizar.</p></body>`;
      }
    }

    openModal('modal-preview');
    openLink.href = `templates/${tpl.id}/`;
  }

  // ── Code Viewer Modal ─────────────────────────────────────────────────────
  function openCodeModal(tpl) {
    const modal      = $('#modal-code');
    const title      = $('#modal-code-title');
    const tabBtns    = $$('[data-code-tab]', modal);
    const codeBlock  = $('#code-output');
    const copyBtn    = $('#code-copy-btn');
    const langLabel  = $('#code-lang-label');

    title.textContent = `${tpl.name} — Source Code`;

    let activeTab = 'html';
    const codeMap = { html: tpl.html || '', css: tpl.css || '', js: tpl.js || '' };

    function showTab(lang) {
      activeTab = lang;
      tabBtns.forEach(b => b.classList.toggle('is-active', b.dataset.codeTab === lang));
      langLabel.textContent = lang.toUpperCase();
      const highlighted = Highlighter.highlight(codeMap[lang] || '// No content', lang);
      codeBlock.innerHTML = highlighted;
    }

    tabBtns.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.codeTab)));
    copyBtn.onclick = async () => {
      await copyToClipboard(codeMap[activeTab]);
      showToast('Copied to clipboard!', 'success', 2000);
    };

    showTab('html');
    openModal('modal-code');
  }

  // ── Modal System ──────────────────────────────────────────────────────────
  function openModal(id) {
    const modal = $(`#${id}`);
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    AppState.set('ui.activeModal', id);
    modal.focus?.();
  }

  function closeModal(id) {
    const modal = id ? $(`#${id}`) : $('.modal.is-open');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    AppState.set('ui.activeModal', null);
  }

  function initModals() {
    // Close on backdrop click
    on(document, 'click', '.modal__backdrop', (e, el) => {
      const modal = el.closest('.modal');
      if (modal) closeModal(modal.id);
    });

    // Close buttons
    on(document, 'click', '[data-modal-close]', (e, btn) => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });

    // Open triggers
    on(document, 'click', '[data-modal-open]', (e, btn) => {
      openModal(btn.dataset.modalOpen);
    });

    // ESC key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal(AppState.get('ui.activeModal'));
    });
  }

  // ── Creative Engine ───────────────────────────────────────────────────────
  function initCreativeEngine() {
    _initBlockPalette();
    _initCanvas();
    _initThemePanel();
    _initSettingsPanel();
    _initCodeOutput();
    _initDSLEditor();
    _initEngineActions();

    AppState.subscribe('blocks', () => { _renderCanvas(); _syncDSL(); });
    AppState.subscribe('selectedBlock', _renderPropertyPanel);
    AppState.subscribe('generated', _renderCodeOutput);
  }

  // Block palette
  function _initBlockPalette() {
    const palette = $('#ce-palette');
    if (!palette) return;

    const blocks = BlockLibrary.getAll();
    const categories = [...new Set(blocks.map(b => b.category))];

    palette.innerHTML = categories.map(cat => `
      <div class="ce-palette__section">
        <p class="ce-palette__cat">${cat.charAt(0).toUpperCase() + cat.slice(1)}</p>
        ${blocks.filter(b => b.category === cat).map(b => `
        <div class="ce-block-item" draggable="true" data-block-id="${b.id}" title="${b.description}">
          <span class="ce-block-item__icon">${b.icon}</span>
          <span class="ce-block-item__name">${b.name}</span>
          <button class="ce-block-item__add" data-add-block="${b.id}" aria-label="Add ${b.name}">+</button>
        </div>`).join('')}
      </div>`).join('');

    on(palette, 'click', '[data-add-block]', (e, btn) => {
      const def = BlockLibrary.get(btn.dataset.addBlock);
      if (def) { AppState.addBlock(def); showToast(`${def.name} added`, 'success', 1500); }
    });

    // Drag from palette
    on(palette, 'dragstart', '[data-block-id]', (e, el) => {
      e.dataTransfer.setData('text/plain', el.dataset.blockId);
      e.dataTransfer.effectAllowed = 'copy';
    });
  }

  // Canvas (block list)
  function _renderCanvas() {
    const canvas = $('#ce-canvas');
    if (!canvas) return;
    const blocks = AppState.getBlocks();
    const selectedId = AppState.get('selectedBlockId');

    if (blocks.length === 0) {
      canvas.innerHTML = `<div class="ce-empty"><div class="ce-empty__icon">⊞</div><p>Drag blocks here or click <strong>+</strong> in the palette</p></div>`;
      return;
    }

    canvas.innerHTML = blocks.map((b, i) => `
      <div class="ce-canvas-block${b.instanceId === selectedId ? ' is-selected' : ''}"
           data-instance-id="${b.instanceId}">
        <div class="ce-canvas-block__drag" title="Drag to reorder">⋮⋮</div>
        <div class="ce-canvas-block__info">
          <span class="ce-canvas-block__icon">${b.icon}</span>
          <span class="ce-canvas-block__name">${b.name}</span>
          <span class="ce-canvas-block__idx">#${i + 1}</span>
        </div>
        <div class="ce-canvas-block__controls">
          <button class="ce-ctrl-btn" data-move="up" data-id="${b.instanceId}" ${i === 0 ? 'disabled' : ''} title="Move up">↑</button>
          <button class="ce-ctrl-btn" data-move="down" data-id="${b.instanceId}" ${i === blocks.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
          <button class="ce-ctrl-btn ce-ctrl-btn--props" data-props="${b.instanceId}" title="Properties">⚙</button>
          <button class="ce-ctrl-btn ce-ctrl-btn--remove" data-remove="${b.instanceId}" title="Remove">✕</button>
        </div>
      </div>`).join('');

    // Canvas controls
    on(canvas, 'click', '[data-move]', (e, btn) => {
      AppState.moveBlock(btn.dataset.id, btn.dataset.move);
    });
    on(canvas, 'click', '[data-remove]', (e, btn) => {
      AppState.removeBlock(btn.dataset.remove);
      showToast('Block removed', 'info', 1500);
    });
    on(canvas, 'click', '[data-props]', (e, btn) => {
      AppState.selectBlock(btn.dataset.props);
    });

    // Drop on canvas
    canvas.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    canvas.addEventListener('drop', e => {
      e.preventDefault();
      const blockId = e.dataTransfer.getData('text/plain');
      const def = BlockLibrary.get(blockId);
      if (def) { AppState.addBlock(def); showToast(`${def.name} added`, 'success', 1500); }
    });
  }

  function _initCanvas() { _renderCanvas(); }

  // Property panel
  function _renderPropertyPanel() {
    const panel = $('#ce-props-panel');
    if (!panel) return;
    const block = AppState.getSelectedBlock();

    if (!block) {
      panel.innerHTML = `<p class="ce-props-hint">Click <span>⚙</span> on a block to edit its properties.</p>`;
      return;
    }

    const def = BlockLibrary.get(block.id);
    if (!def || !block.defaultConfig) {
      panel.innerHTML = `<p class="ce-props-hint">No configurable properties.</p>`;
      return;
    }

    panel.innerHTML = `
      <div class="ce-props-header">
        <span>${def.icon}</span> <strong>${def.name}</strong>
        <button class="ce-ctrl-btn ce-ctrl-btn--remove" data-remove="${block.instanceId}" title="Remove block">✕</button>
      </div>
      <div class="ce-props-fields">
        ${Object.entries(block.defaultConfig || {}).map(([key, defaultVal]) => {
          const val = block.config[key] ?? defaultVal;
          const isLong = String(defaultVal).length > 60 || String(defaultVal).includes(';');
          if (isLong) {
            return `<div class="ce-field"><label class="ce-field__label" for="prop-${key}">${_humanize(key)}</label><textarea class="ce-field__textarea" id="prop-${key}" data-prop-key="${key}" rows="4">${Utils.escapeHtml(String(val))}</textarea></div>`;
          }
          if (typeof defaultVal === 'boolean') {
            return `<div class="ce-field ce-field--checkbox"><label class="ce-field__label"><input type="checkbox" data-prop-key="${key}" ${val ? 'checked' : ''}> ${_humanize(key)}</label></div>`;
          }
          return `<div class="ce-field"><label class="ce-field__label" for="prop-${key}">${_humanize(key)}</label><input class="ce-field__input" id="prop-${key}" type="text" data-prop-key="${key}" value="${Utils.escapeHtml(String(val))}"></div>`;
        }).join('')}
      </div>`;

    // Update config on change
    on(panel, 'input', '[data-prop-key]', Utils.debounce((e, el) => {
      const val = el.type === 'checkbox' ? el.checked : el.value;
      AppState.updateBlockConfig(block.instanceId, el.dataset.propKey, val);
    }, 300));

    on(panel, 'click', '[data-remove]', (e, btn) => {
      AppState.removeBlock(btn.dataset.remove);
      showToast('Block removed', 'info', 1500);
    });
  }

  function _humanize(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).replace(/_/g, ' ');
  }

  // Theme panel
  function _initThemePanel() {
    const panel = $('#ce-theme-panel');
    if (!panel) return;

    on(panel, 'input', '[data-theme-prop]', Utils.debounce((e, el) => {
      AppState.set(`theme.${el.dataset.themeProp}`, el.value);
      ThemeManager.applyTheme(AppState.get('theme'));
    }, 100));

    on(panel, 'change', '[data-theme-prop]', (e, el) => {
      AppState.set(`theme.${el.dataset.themeProp}`, el.value);
      ThemeManager.applyTheme(AppState.get('theme'));
    });
  }

  // Settings panel
  function _initSettingsPanel() {
    const panel = $('#ce-settings-panel');
    if (!panel) return;

    on(panel, 'change', '[data-setting]', (e, el) => {
      AppState.set(`settings.${el.dataset.setting}`, el.type === 'checkbox' ? el.checked : el.value);
    });
  }

  // Code output
  function _initCodeOutput() { /* populated by _renderCodeOutput on state change */ }

  function _renderCodeOutput() {
    const { html, css, js } = AppState.getGenerated();
    const outputs = { html, css, js };
    const activeTab = AppState.get('ui.codeViewerTab');

    const content = outputs[activeTab] || '';
    const codeEl = $('#ce-code-output');
    if (codeEl) codeEl.innerHTML = Highlighter.highlight(content, activeTab);

    const lineCount = (content.match(/\n/g) || []).length + 1;
    const lineCountEl = $('#ce-line-count');
    if (lineCountEl) lineCountEl.textContent = `${lineCount} lines`;
  }

  function initCodeOutputTabs() {
    on(document, 'click', '[data-ce-tab]', (e, btn) => {
      $$('[data-ce-tab]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      AppState.set('ui.codeViewerTab', btn.dataset.ceTab);
      _renderCodeOutput();
    });
  }

  // DSL Editor
  function _initDSLEditor() {
    const editor  = $('#dsl-editor');
    const applyBtn = $('#dsl-apply-btn');
    const syncBtn  = $('#dsl-sync-btn');
    const errEl   = $('#dsl-errors');

    if (!editor) return;

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const errors = Generator.fromDSL(editor.value);
        if (errEl) {
          if (errors.length) {
            errEl.textContent = errors.join('\n');
            errEl.style.display = 'block';
          } else {
            errEl.style.display = 'none';
            showToast('DSL applied successfully', 'success');
          }
        }
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        editor.value = Generator.toDSL();
        showToast('Canvas synced to DSL', 'info', 1800);
      });
    }
  }

  function _syncDSL() {
    const editor = $('#dsl-editor');
    if (editor && AppState.get('ui.dslMode')) {
      editor.value = Generator.toDSL();
    }
  }

  // Engine action buttons
  function _initEngineActions() {
    on(document, 'click', '#ce-generate-btn', () => {
      if (AppState.getBlocks().length === 0) {
        showToast('Add at least one block to the canvas first.', 'warning'); return;
      }
      const { warnings } = Generator.generate();
      showToast('Code generated successfully!', 'success');
      if (warnings.length) setTimeout(() => showToast(warnings[0], 'info'), 600);
      document.querySelector('.ce-output')?.scrollIntoView({ behavior: 'smooth' });
    });

    on(document, 'click', '#ce-preview-btn', () => {
      if (AppState.getBlocks().length === 0) {
        showToast('Add at least one block first.', 'warning'); return;
      }
      const html = Generator.preview();
      const iframe = $('#ce-preview-iframe');
      if (iframe) {
        iframe.srcdoc = html;
        openModal('modal-ce-preview');
      }
    });

    on(document, 'click', '#ce-download-btn', () => Generator.downloadZip('my-project'));

    on(document, 'click', '#ce-clear-btn', () => {
      if (AppState.getBlocks().length === 0) return;
      if (confirm('Clear all blocks from the canvas?')) {
        AppState.clearBlocks();
        showToast('Canvas cleared', 'info', 1500);
      }
    });

    on(document, 'click', '#ce-copy-html', async () => {
      await copyToClipboard(AppState.getGenerated().html || '');
      showToast('HTML copied!', 'success', 1800);
    });
    on(document, 'click', '#ce-copy-css', async () => {
      await copyToClipboard(AppState.getGenerated().css || '');
      showToast('CSS copied!', 'success', 1800);
    });
    on(document, 'click', '#ce-copy-js', async () => {
      await copyToClipboard(AppState.getGenerated().js || '');
      showToast('JS copied!', 'success', 1800);
    });
  }

  // ── Navbar ────────────────────────────────────────────────────────────────
  function initNavbar() {
    const nav    = $('#main-navbar');
    const toggle = $('#nav-toggle');
    const menu   = $('#nav-menu');

    // Mobile toggle
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open);
        toggle.classList.toggle('is-open', open);
      });
    }

    // Sticky scroll class
    window.addEventListener('scroll', Utils.throttle(() => {
      if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 20);
    }, 100));

    // Dark mode toggle
    on(document, 'click', '[data-theme-toggle]', () => ThemeManager.toggle());

    // Smooth scroll for anchor links
    on(document, 'click', 'a[href^="#"]', (e, a) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (menu) menu.classList.remove('is-open');
      }
    });
  }

  // ── Scroll reveal ─────────────────────────────────────────────────────────
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '-40px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
  }

  // ── Public ────────────────────────────────────────────────────────────────
  return {
    initTemplateLibrary,
    initModals, openModal, closeModal,
    initCreativeEngine,
    initCodeOutputTabs,
    initNavbar,
    initScrollReveal
  };
})();
