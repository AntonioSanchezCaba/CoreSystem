'use strict';
/**
 * CoreSystem Workspace — Properties Panel
 * Right side panel. Shows editable properties of selected element(s).
 * Updates are applied live to State.
 */
const PropsPanel = (() => {
  let _el = null;

  function init(panelEl) {
    _el = panelEl;
    _render([]);
    State.on('sel:change',     _render);
    State.on('el:update',      () => _render(State.selIds));
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  function _render(ids) {
    if (!_el) return;
    if (!ids || !ids.length) {
      _el.innerHTML = `
<div class="props__empty">
  <div class="props__empty-icon">↖</div>
  <p>Select an element<br>to edit its properties</p>
</div>
<div class="props__section props__section--canvas">
  <div class="props__group-label">Canvas</div>
  <div class="props__row">
    <label>Zoom</label>
    <span>${Math.round(State.zoom*100)}%</span>
  </div>
  <div class="props__row">
    <label>Grid</label>
    <input type="number" id="prop-grid-size" value="${State.gridSize}" min="4" max="100" style="width:60px">
  </div>
</div>`;
      _el.querySelector('#prop-grid-size')?.addEventListener('change', e => {
        State.gridSize = parseInt(e.target.value) || 20;
      });
      return;
    }

    // Multiple selection: show aggregate
    if (ids.length > 1) {
      _el.innerHTML = `
<div class="props__section">
  <div class="props__group-label">${ids.length} elements selected</div>
  <div class="props__row">
    <label>Opacity</label>
    <input type="range" data-prop="opacity" min="0" max="1" step="0.01" value="1" style="width:100%">
  </div>
  ${_zOrderSection()}
</div>`;
      _bindPropInputs(null);
      return;
    }

    const el = State.getEl(ids[0]);
    if (!el) return;
    const typeDef = Toolbox.getTypeDef(el.type);
    const typeColor = typeDef?.stroke || '#94A3B8';

    _el.innerHTML = `
<!-- Header -->
<div class="props__header">
  <div class="props__el-name">${el.name}</div>
  <div class="props__el-type" style="color:${typeColor}">${el.type}</div>
</div>

<!-- Position & Size -->
<div class="props__section">
  <div class="props__group-label">Position & Size</div>
  <div class="props__grid4">
    <label>X<input type="number" data-prop="x" value="${Math.round(el.x)}"></label>
    <label>Y<input type="number" data-prop="y" value="${Math.round(el.y)}"></label>
    <label>W<input type="number" data-prop="width"  min="1" value="${Math.round(el.width)}"></label>
    <label>H<input type="number" data-prop="height" min="1" value="${Math.round(el.height)}"></label>
  </div>
</div>

<!-- Appearance -->
<div class="props__section">
  <div class="props__group-label">Appearance</div>
  <div class="props__row">
    <label>Fill</label>
    <input type="color" data-prop="fill" value="${_safeColor(el.fill)}">
    <span class="props__color-hex" data-prop-label="fill">${el.fill}</span>
  </div>
  <div class="props__row">
    <label>Stroke</label>
    <input type="color" data-prop="stroke" value="${_safeColor(el.stroke)}">
    <input type="number" data-prop="strokeWidth" min="0" max="20" value="${el.strokeWidth}" style="width:50px;margin-left:4px">
  </div>
  <div class="props__row">
    <label>Opacity</label>
    <input type="range" data-prop="opacity" min="0" max="1" step="0.01" value="${el.opacity}" style="flex:1">
    <span>${Math.round(el.opacity * 100)}%</span>
  </div>
  <div class="props__row">
    <label>Radius</label>
    <input type="number" data-prop="borderRadius" min="0" max="9999" value="${el.borderRadius}" style="width:70px">
    px
  </div>
</div>

<!-- Layout -->
<div class="props__section">
  <div class="props__group-label">Layout</div>
  <div class="props__row">
    <label>Display</label>
    <select data-prop="display">
      ${['block','flex','grid','inline-block'].map(v =>
        `<option ${el.display===v?'selected':''} value="${v}">${v}</option>`).join('')}
    </select>
  </div>
  ${el.display === 'flex' ? `
  <div class="props__row">
    <label>Direction</label>
    <select data-prop="flexDir">
      <option ${el.flexDir==='row'?'selected':''} value="row">Row →</option>
      <option ${el.flexDir==='column'?'selected':''} value="column">Column ↓</option>
    </select>
  </div>` : ''}
  ${el.display === 'grid' ? `
  <div class="props__row">
    <label>Columns</label>
    <input type="number" data-prop="gridCols" min="1" max="12" value="${el.gridCols||3}" style="width:60px">
  </div>` : ''}
  <div class="props__row">
    <label>Gap</label>
    <input type="number" data-prop="gap" min="0" max="200" value="${el.gap||0}" style="width:60px">
    px
  </div>
</div>

<!-- Spacing -->
<div class="props__section">
  <div class="props__group-label">Padding (px)</div>
  <div class="props__grid4-spacing">
    <div></div>
    <label>T<input type="number" data-padding="top"    value="${el.padding?.top    ||0}" min="0"></label>
    <div></div>
    <div></div>
    <label>L<input type="number" data-padding="left"   value="${el.padding?.left   ||0}" min="0"></label>
    <div class="props__spacing-box">P</div>
    <label>R<input type="number" data-padding="right"  value="${el.padding?.right  ||0}" min="0"></label>
    <div></div>
    <label>B<input type="number" data-padding="bottom" value="${el.padding?.bottom ||0}" min="0"></label>
    <div></div>
    <div></div>
  </div>
</div>

<!-- Typography -->
<div class="props__section">
  <div class="props__group-label">Typography</div>
  <div class="props__row">
    <label>Content</label>
    <input type="text" data-prop="textContent" value="${(el.textContent||'').replace(/"/g,'&quot;')}" placeholder="Label text…" style="flex:1">
  </div>
  <div class="props__row">
    <label>Size</label>
    <input type="number" data-prop="fontSize" value="${el.fontSize||16}" min="6" max="200" style="width:55px"> px
    <select data-prop="fontWeight" style="margin-left:auto">
      ${['normal','500','600','700','800'].map(w =>
        `<option ${(el.fontWeight||'normal')===w?'selected':''} value="${w}">${w}</option>`).join('')}
    </select>
  </div>
  <div class="props__row">
    <label>Color</label>
    <input type="color" data-prop="textColor" value="${_safeColor(el.textColor||'#1F2328')}">
    <span class="props__color-hex" data-prop-label="textColor">${el.textColor||'#1F2328'}</span>
  </div>
  <div class="props__row">
    <label>Align</label>
    <div class="props__btn-group">
      ${['left','center','right'].map(a => `
      <button class="props__btn props__btn--xs props__align-btn${(el.textAlign||'center')===a?' is-active':''}"
              data-text-align="${a}" title="Align ${a}">${a==='left'?'⬛◻◻':a==='center'?'◻⬛◻':'◻◻⬛'}</button>`).join('')}
    </div>
  </div>
</div>

<!-- Shadow -->
<div class="props__section">
  <div class="props__group-label">Shadow</div>
  <div class="props__row">
    <label>Enable</label>
    <input type="checkbox" id="prop-shadow-on" ${el.shadow ? 'checked' : ''} style="width:auto">
  </div>
  <div id="prop-shadow-fields" style="${el.shadow ? '' : 'opacity:.35;pointer-events:none'}">
    <div class="props__grid4">
      <label>X<input type="number" id="prop-sh-x"    value="${el.shadow?.x    ?? 4}"></label>
      <label>Y<input type="number" id="prop-sh-y"    value="${el.shadow?.y    ?? 4}"></label>
      <label>Blur<input type="number" id="prop-sh-b"   value="${el.shadow?.blur   ?? 12}" min="0"></label>
      <label>Spread<input type="number" id="prop-sh-sp"  value="${el.shadow?.spread ?? 0}"></label>
    </div>
    <div class="props__row" style="margin-top:6px">
      <label>Color</label>
      <input type="color" id="prop-sh-color" value="${_safeColor(el.shadow?.color ?? '#000000')}">
      <input type="range"  id="prop-sh-alpha" min="0" max="100" value="${_shadowAlpha(el.shadow)}" style="flex:1;margin-left:4px" title="Shadow opacity">
      <span id="prop-sh-alpha-lbl" style="min-width:28px;text-align:right">${_shadowAlpha(el.shadow)}%</span>
    </div>
  </div>
</div>

<!-- Semantic -->
<div class="props__section">
  <div class="props__group-label">Semantic / Code</div>
  <div class="props__row">
    <label>HTML tag</label>
    <select data-prop="htmlTag">
      ${['div','section','article','header','footer','nav','aside','main','form','dialog'].map(t =>
        `<option ${el.htmlTag===t?'selected':''} value="${t}">${t}</option>`).join('')}
    </select>
  </div>
  <div class="props__row">
    <label>CSS class</label>
    <input type="text" data-prop="cssClass" value="${el.cssClass||''}" placeholder="my-class">
  </div>
</div>

<!-- Z-order & Actions -->
<div class="props__section">
  ${_zOrderSection(el.id)}
  <div class="props__actions">
    <button class="props__btn props__btn--ghost" data-action="duplicate">⊕ Dup</button>
    <button class="props__btn props__btn--ghost" data-action="lock">${el.locked?'🔓 Unlock':'🔒 Lock'}</button>
    <button class="props__btn props__btn--ghost" data-action="hide">${el.hidden?'👁 Show':'🙈 Hide'}</button>
    <button class="props__btn props__btn--danger" data-action="delete">✕ Delete</button>
  </div>
</div>`;

    _bindPropInputs(el);
    _bindShadow(el);
    _bindTextAlign(el);
    _bindActions(el);
  }

  // ── Shadow alpha helper ─────────────────────────────────────────────────────
  function _shadowAlpha(shadow) {
    if (!shadow) return 25;
    // Try to extract alpha from rgba string
    const m = (shadow.color || '').match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
    if (m) return Math.round(parseFloat(m[1]) * 100);
    return 25;
  }

  function _shadowCss(el) {
    const sh = el.shadow;
    if (!sh) return null;
    const alpha = _shadowAlpha(sh) / 100;
    const hexColor = sh.color || '#000000';
    // Convert hex to rgba
    const r = parseInt(hexColor.slice(1,3), 16);
    const g = parseInt(hexColor.slice(3,5), 16);
    const b = parseInt(hexColor.slice(5,7), 16);
    return { x: sh.x??4, y: sh.y??4, blur: sh.blur??12, spread: sh.spread??0,
             color: `rgba(${r},${g},${b},${alpha})` };
  }

  function _zOrderSection(id) {
    return `
<div class="props__group-label">Z-Order</div>
<div class="props__row" style="gap:4px">
  <button class="props__btn props__btn--xs" data-zorder="front">⬆ Front</button>
  <button class="props__btn props__btn--xs" data-zorder="fwd">↑ Fwd</button>
  <button class="props__btn props__btn--xs" data-zorder="bwd">↓ Bwd</button>
  <button class="props__btn props__btn--xs" data-zorder="back">⬇ Back</button>
</div>`;
  }

  // ── Event binding ──────────────────────────────────────────────────────────
  function _bindPropInputs(el) {
    if (!_el) return;

    _el.querySelectorAll('[data-prop]').forEach(input => {
      const prop = input.dataset.prop;
      const update = () => {
        let val = input.type === 'number' || input.type === 'range'
          ? parseFloat(input.value) : input.value;
        State.selIds.forEach(id => State.update(id, { [prop]: val }));
        // Update adjacent hex label
        const hexLabel = _el.querySelector(`[data-prop-label="${prop}"]`);
        if (hexLabel) hexLabel.textContent = val;
      };
      input.addEventListener('change', update);
      if (input.type === 'color' || input.type === 'range') {
        input.addEventListener('input', update);
      }
    });

    // Padding
    _el.querySelectorAll('[data-padding]').forEach(input => {
      const side = input.dataset.padding;
      input.addEventListener('change', () => {
        State.selIds.forEach(id => {
          const el = State.getEl(id);
          if (!el) return;
          const newPad = { ...(el.padding || {top:0,right:0,bottom:0,left:0}), [side]: parseInt(input.value)||0 };
          State.update(id, { padding: newPad });
        });
      });
    });

    // Z-order
    _el.querySelectorAll('[data-zorder]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = State.selIds[0];
        if (!id) return;
        switch(btn.dataset.zorder) {
          case 'front': State.bringToFront(id); break;
          case 'fwd':   State.bringForward(id); break;
          case 'bwd':   State.sendBackward(id); break;
          case 'back':  State.sendToBack(id);   break;
        }
      });
    });
  }

  function _bindActions(el) {
    if (!_el) return;
    _el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        switch(btn.dataset.action) {
          case 'duplicate':
            History.push('Duplicate');
            const newId = State.duplicate(el.id, 20, 20);
            State.setSelection([newId]);
            break;
          case 'lock': State.update(el.id, { locked: !el.locked }); break;
          case 'hide': State.update(el.id, { hidden: !el.hidden }); break;
          case 'delete': History.push('Delete'); State.remove(el.id); break;
        }
      });
    });
  }

  // ── Shadow binding ─────────────────────────────────────────────────────────
  function _bindShadow(el) {
    if (!_el) return;
    const onToggle = document.getElementById('prop-shadow-on');
    const fields   = document.getElementById('prop-shadow-fields');
    if (!onToggle || !fields) return;

    const _readShadow = () => {
      const x      = parseInt(document.getElementById('prop-sh-x')?.value  || 4);
      const y      = parseInt(document.getElementById('prop-sh-y')?.value  || 4);
      const blur   = parseInt(document.getElementById('prop-sh-b')?.value  || 12);
      const spread = parseInt(document.getElementById('prop-sh-sp')?.value || 0);
      const hexCol = document.getElementById('prop-sh-color')?.value || '#000000';
      const alpha  = parseInt(document.getElementById('prop-sh-alpha')?.value || 25) / 100;
      const r = parseInt(hexCol.slice(1,3), 16);
      const g = parseInt(hexCol.slice(3,5), 16);
      const b = parseInt(hexCol.slice(5,7), 16);
      return { x, y, blur, spread, color: `rgba(${r},${g},${b},${alpha})` };
    };

    const _apply = () => {
      const sh = onToggle.checked ? _readShadow() : null;
      State.selIds.forEach(id => State.update(id, { shadow: sh }));
    };

    onToggle.addEventListener('change', () => {
      fields.style.opacity = onToggle.checked ? '' : '.35';
      fields.style.pointerEvents = onToggle.checked ? '' : 'none';
      _apply();
    });

    ['prop-sh-x','prop-sh-y','prop-sh-b','prop-sh-sp','prop-sh-color'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', _apply);
    });

    const alphaSlider = document.getElementById('prop-sh-alpha');
    const alphaLbl    = document.getElementById('prop-sh-alpha-lbl');
    alphaSlider?.addEventListener('input', () => {
      if (alphaLbl) alphaLbl.textContent = alphaSlider.value + '%';
      _apply();
    });
  }

  // ── Text alignment binding ─────────────────────────────────────────────────
  function _bindTextAlign(el) {
    if (!_el) return;
    _el.querySelectorAll('[data-text-align]').forEach(btn => {
      btn.addEventListener('click', () => {
        const align = btn.dataset.textAlign;
        State.selIds.forEach(id => State.update(id, { textAlign: align }));
        _el.querySelectorAll('[data-text-align]').forEach(b => {
          b.classList.toggle('is-active', b.dataset.textAlign === align);
        });
      });
    });
  }

  function _safeColor(c) {
    if (!c || c === 'transparent' || c.startsWith('rgba')) return '#ffffff';
    return c;
  }

  return { init };
})();
