/**
 * CoreSystem Platform — State Manager
 * Reactive global state with pub/sub pattern.
 * No external dependencies.
 */
const AppState = (() => {
  'use strict';

  // ── Private storage ──────────────────────────────────────────────────────
  const _subs = {};
  let _blockCounter = 0;

  const _state = {
    activeFilter: 'all',
    searchQuery: '',
    blocks: [],
    selectedBlockId: null,

    theme: {
      primaryColor: '#2563EB',
      secondaryColor: '#7C3AED',
      bgColor: '#F8FAFC',
      textColor: '#0F172A',
      mode: 'light',
      radius: 'md',
      shadow: true,
      font: 'system'
    },

    settings: {
      columns: 3,
      navbar: 'sticky',
      footer: 'corporate',
      animations: true,
      maxWidth: '1200px',
      spacing: 'comfortable'
    },

    generated: { html: '', css: '', js: '' },

    ui: {
      codeViewerTab: 'html',
      engineTab: 'canvas',
      previewVisible: false,
      dslMode: false,
      activeModal: null
    }
  };

  // ── Internal helpers ──────────────────────────────────────────────────────
  function _emit(key) {
    (_subs[key] || []).forEach(fn => fn(_deepGet(key)));
    (_subs['*'] || []).forEach(fn => fn(key, _deepGet(key)));
  }

  function _deepGet(path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), _state);
  }

  function _deepSet(path, value) {
    const keys = path.split('.');
    let obj = _state;
    keys.slice(0, -1).forEach(k => { if (!obj[k]) obj[k] = {}; obj = obj[k]; });
    obj[keys[keys.length - 1]] = value;
    _emit(keys[0]);
  }

  // ── Block operations ──────────────────────────────────────────────────────
  function addBlock(blockDef, insertAfter = null) {
    const block = {
      ...blockDef,
      instanceId: `blk_${++_blockCounter}`,
      config: { ...(blockDef.defaultConfig || {}) }
    };
    if (insertAfter) {
      const idx = _state.blocks.findIndex(b => b.instanceId === insertAfter);
      _state.blocks.splice(idx + 1, 0, block);
    } else {
      _state.blocks.push(block);
    }
    _emit('blocks');
    return block.instanceId;
  }

  function removeBlock(instanceId) {
    const idx = _state.blocks.findIndex(b => b.instanceId === instanceId);
    if (idx === -1) return;
    _state.blocks.splice(idx, 1);
    if (_state.selectedBlockId === instanceId) _state.selectedBlockId = null;
    _emit('blocks');
    _emit('selectedBlock');
  }

  function moveBlock(instanceId, dir) {
    const idx = _state.blocks.findIndex(b => b.instanceId === instanceId);
    if (idx === -1) return;
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= _state.blocks.length) return;
    [_state.blocks[idx], _state.blocks[target]] = [_state.blocks[target], _state.blocks[idx]];
    _emit('blocks');
  }

  function updateBlockConfig(instanceId, key, value) {
    const block = _state.blocks.find(b => b.instanceId === instanceId);
    if (block) { block.config[key] = value; _emit('blocks'); }
  }

  function selectBlock(instanceId) {
    _state.selectedBlockId = instanceId;
    _emit('selectedBlock');
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    get: _deepGet,
    set: _deepSet,

    subscribe(key, fn) {
      if (!_subs[key]) _subs[key] = [];
      _subs[key].push(fn);
      return () => { _subs[key] = _subs[key].filter(f => f !== fn); };
    },

    // Block operations
    addBlock,
    removeBlock,
    moveBlock,
    updateBlockConfig,
    selectBlock,
    clearBlocks() {
      _state.blocks = [];
      _state.selectedBlockId = null;
      _emit('blocks');
      _emit('selectedBlock');
    },

    getBlocks: () => [..._state.blocks],
    getBlock: (id) => _state.blocks.find(b => b.instanceId === id),
    getSelectedBlock: () => _state.blocks.find(b => b.instanceId === _state.selectedBlockId),

    setGenerated(html, css, js) {
      _state.generated = { html, css, js };
      _emit('generated');
    },

    getGenerated: () => ({ ..._state.generated }),

    // Full reset
    reset() {
      _state.blocks = [];
      _state.selectedBlockId = null;
      _state.generated = { html: '', css: '', js: '' };
      _blockCounter = 0;
      _emit('blocks');
      _emit('generated');
    }
  };
})();
