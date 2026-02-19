/**
 * Visual Layout OS — Inspector UI
 * Right panel: element properties (position, size, fill, stroke, opacity,
 * border-radius), constraint controls, and design token editor.
 */
const InspectorUI = (() => {
  'use strict';

  let _el = null;

  function init(panelEl) {
    _el = panelEl;
    _render();

    EventBus.on(EventBus.EVENTS.SELECTION_CHANGE,  _render);
    EventBus.on(EventBus.EVENTS.ELEMENT_UPDATE,    _render);
    EventBus.on(EventBus.EVENTS.TOKENS_CHANGE,     _renderTokens);
  }

  // ── Main Render ─────────────────────────────────────────────────────────────
  function _render() {
    if (!_el) return;
    const ids = AppState.selectionIds;

    if (!ids.length) {
      _el.innerHTML = `
<div class="inspector__section">
  <h4 class="inspector__title">No selection</h4>
  <p class="inspector__hint">Select an element to edit its properties.</p>
</div>
${_renderTokensSection()}`;
      _bindTokenEvents();
      return;
    }

    // Multi-selection: show aggregate info
    if (ids.length > 1) {
      _el.innerHTML = `
<div class="inspector__section">
  <h4 class="inspector__title">${ids.length} elements selected</h4>
  <div class="inspector__row">
    <label>Opacity</label>
    <input type="range" min="0" max="1" step="0.01" data-prop="opacity" value="1">
  </div>
</div>
${_renderTokensSection()}`;
      _bindPropertyEvents(null);
      _bindTokenEvents();
      return;
    }

    const el = AppState.getElement(ids[0]);
    if (!el) return;

    _el.innerHTML = `
<div class="inspector__section">
  <h4 class="inspector__title">${el.name} <span class="inspector__tag">${el.role || el.type}</span></h4>
</div>

<div class="inspector__section">
  <h5 class="inspector__group-title">Position & Size</h5>
  <div class="inspector__grid2">
    <label>X <input type="number" data-prop="x" value="${Math.round(el.x)}"></label>
    <label>Y <input type="number" data-prop="y" value="${Math.round(el.y)}"></label>
    <label>W <input type="number" data-prop="width"  min="1" value="${Math.round(el.width)}"></label>
    <label>H <input type="number" data-prop="height" min="1" value="${Math.round(el.height)}"></label>
  </div>
</div>

<div class="inspector__section">
  <h5 class="inspector__group-title">Appearance</h5>
  <div class="inspector__row">
    <label>Fill</label>
    <input type="color" data-prop="fill" value="${el.fill || '#DBEAFE'}">
    <input type="range" min="0" max="1" step="0.01" data-prop="fillOpacity"
           value="${el.fillOpacity ?? 1}" style="width:80px">
  </div>
  <div class="inspector__row">
    <label>Stroke</label>
    <input type="color" data-prop="stroke" value="${el.stroke || '#93C5FD'}">
    <input type="number" data-prop="strokeWidth" min="0" max="20"
           value="${el.strokeWidth ?? 0}" style="width:50px" placeholder="0">
  </div>
  <div class="inspector__row">
    <label>Opacity</label>
    <input type="range" min="0" max="1" step="0.01" data-prop="opacity" value="${el.opacity ?? 1}">
    <span data-opacity-label>${Math.round((el.opacity ?? 1)*100)}%</span>
  </div>
  <div class="inspector__row">
    <label>Radius</label>
    <input type="number" data-prop="borderRadius" min="0" max="9999" value="${el.borderRadius || 0}">
  </div>
</div>

<div class="inspector__section">
  <h5 class="inspector__group-title">Constraints</h5>
  <div class="constraint-grid">
    <div class="constraint-box" data-axis="h">
      ${_constraintButtons('h', el.constraints?.h || 'left')}
    </div>
    <div class="constraint-box" data-axis="v">
      ${_constraintButtons('v', el.constraints?.v || 'top')}
    </div>
  </div>
</div>

<div class="inspector__section">
  <h5 class="inspector__group-title">Layout</h5>
  <div class="inspector__row">
    <label>Strategy</label>
    <select data-prop="layoutStrategy">
      ${['absolute','flex-row','flex-col','grid'].map(s =>
        `<option value="${s}" ${el.layoutStrategy===s?'selected':''}>${s}</option>`
      ).join('')}
    </select>
  </div>
  <div class="inspector__row">
    <label>HTML tag</label>
    <select data-prop="htmlTag">
      ${['div','section','article','header','footer','nav','aside','main'].map(t =>
        `<option value="${t}" ${el.htmlTag===t?'selected':''}>${t}</option>`
      ).join('')}
    </select>
  </div>
  <div class="inspector__row">
    <label>CSS class</label>
    <input type="text" data-prop="cssClass" value="${el.cssClass || ''}">
  </div>
</div>

<div class="inspector__section">
  <div class="inspector__row">
    <button class="inspector__btn inspector__btn--danger" data-action="delete">Delete</button>
    <button class="inspector__btn" data-action="duplicate">Duplicate</button>
    <button class="inspector__btn" data-action="front">Front</button>
    <button class="inspector__btn" data-action="back">Back</button>
  </div>
</div>

${_renderTokensSection()}`;

    _bindPropertyEvents(el);
    _bindConstraintEvents(el);
    _bindActionEvents(el);
    _bindTokenEvents();
  }

  // ── Constraint buttons ─────────────────────────────────────────────────────
  function _constraintButtons(axis, current) {
    const opts = axis === 'h'
      ? [['left','Left'],['right','Right'],['center','Center'],['scale','Scale'],['stretch','Stretch']]
      : [['top','Top'],['bottom','Bottom'],['center','Center'],['scale','Scale'],['stretch','Stretch']];

    return opts.map(([val, label]) => `
      <button class="constraint-btn ${current===val?'is-active':''}"
              data-constraint-axis="${axis}" data-constraint-val="${val}" title="${label}">
        ${_constraintIcon(axis, val)}
      </button>`).join('');
  }

  function _constraintIcon(axis, val) {
    const icons = {
      h: { left:'⊣', right:'⊢', center:'⊕', scale:'⇔', stretch:'↔' },
      v: { top:'⊤', bottom:'⊥', center:'⊕', scale:'⇕', stretch:'↕' },
    };
    return icons[axis]?.[val] || val[0].toUpperCase();
  }

  // ── Design tokens section ──────────────────────────────────────────────────
  function _renderTokensSection() {
    const categories = TokenSystem.getCategories();
    return `
<div class="inspector__section inspector__section--tokens">
  <h5 class="inspector__group-title">Design Tokens</h5>
  ${categories.slice(0, 2).map(cat => `
    <div class="token-category">
      <div class="token-category__label">${cat.name}</div>
      ${cat.tokens.map(t => `
        <div class="inspector__row">
          <label title="${t.key}">${t.key.replace(/^--/,'').split('-').slice(-1)[0]}</label>
          ${t.isColor
            ? `<input type="color" data-token="${t.key}" value="${t.value}">`
            : `<input type="text"  data-token="${t.key}" value="${t.value}" style="width:120px">`}
        </div>`).join('')}
    </div>`).join('')}
  <details>
    <summary class="inspector__hint" style="cursor:pointer">Show all tokens…</summary>
    ${categories.slice(2).map(cat => `
      <div class="token-category">
        <div class="token-category__label">${cat.name}</div>
        ${cat.tokens.map(t => `
          <div class="inspector__row">
            <label title="${t.key}">${t.key.replace(/^--/,'').split('-').slice(-1)[0]}</label>
            ${t.isColor
              ? `<input type="color" data-token="${t.key}" value="${t.value}">`
              : `<input type="text"  data-token="${t.key}" value="${t.value}" style="width:120px">`}
          </div>`).join('')}
      </div>`).join('')}
    <button class="inspector__btn" data-action="reset-tokens">Reset tokens</button>
  </details>
</div>`;
  }

  function _renderTokens() {
    if (!_el) return;
    const section = _el.querySelector('.inspector__section--tokens');
    if (section) section.outerHTML = _renderTokensSection();
    _bindTokenEvents();
  }

  // ── Bind Events ─────────────────────────────────────────────────────────────
  function _bindPropertyEvents(el) {
    if (!_el) return;

    _el.querySelectorAll('[data-prop]').forEach(input => {
      const prop = input.dataset.prop;

      const updateFn = () => {
        const ids = AppState.selectionIds;
        if (!ids.length) return;

        let val = input.type === 'range' || input.type === 'number'
          ? parseFloat(input.value) : input.value;

        ids.forEach(id => AppState.updateElement(id, { [prop]: val }));

        // Update opacity label
        if (prop === 'opacity') {
          const label = _el.querySelector('[data-opacity-label]');
          if (label) label.textContent = `${Math.round(val*100)}%`;
        }

        EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
      };

      input.addEventListener('change', updateFn);
      if (input.type === 'color' || input.type === 'range') {
        input.addEventListener('input', updateFn);
      }
    });
  }

  function _bindConstraintEvents(el) {
    if (!_el) return;
    _el.querySelectorAll('[data-constraint-axis]').forEach(btn => {
      btn.addEventListener('click', () => {
        const axis = btn.dataset.constraintAxis;
        const val  = btn.dataset.constraintVal;
        const ids  = AppState.selectionIds;
        ids.forEach(id => {
          const elem = AppState.getElement(id);
          if (elem) {
            AppState.updateElement(id, {
              constraints: { ...elem.constraints, [axis]: val }
            });
          }
        });
        _render();
      });
    });
  }

  function _bindActionEvents(el) {
    if (!_el) return;
    _el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ids = AppState.selectionIds;
        switch (btn.dataset.action) {
          case 'delete':
            HistoryManager.push('Delete');
            AppState.deleteSelected();
            break;
          case 'duplicate':
            HistoryManager.push('Duplicate');
            AppState.selectionIds.forEach(id => AppState.duplicateElement(id, 20, 20));
            break;
          case 'front':
            ids.forEach(id => AppState.bringToFront(id));
            break;
          case 'back':
            ids.forEach(id => AppState.sendToBack(id));
            break;
        }
        EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
      });
    });
  }

  function _bindTokenEvents() {
    if (!_el) return;
    _el.querySelectorAll('[data-token]').forEach(input => {
      input.addEventListener('change', () => {
        TokenSystem.set(input.dataset.token, input.value);
        EventBus.emit(EventBus.EVENTS.TOKENS_CHANGE);
      });
      if (input.type === 'color') {
        input.addEventListener('input', () => {
          TokenSystem.set(input.dataset.token, input.value);
          EventBus.emit(EventBus.EVENTS.TOKENS_CHANGE);
        });
      }
    });

    const resetBtn = _el.querySelector('[data-action="reset-tokens"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        TokenSystem.reset();
        _render();
      });
    }
  }

  return { init };
})();
