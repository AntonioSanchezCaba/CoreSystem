/**
 * Visual Layout OS — Event Bus
 * Decoupled pub/sub for cross-module communication.
 * All engine modules communicate exclusively through this bus.
 */
const EventBus = (() => {
  'use strict';

  const _listeners = new Map(); // topic → Set<fn>

  function on(topic, fn) {
    if (!_listeners.has(topic)) _listeners.set(topic, new Set());
    _listeners.get(topic).add(fn);
    return () => off(topic, fn);
  }

  function once(topic, fn) {
    const wrapper = (...args) => { fn(...args); off(topic, wrapper); };
    return on(topic, wrapper);
  }

  function off(topic, fn) {
    _listeners.get(topic)?.delete(fn);
  }

  function emit(topic, payload) {
    _listeners.get(topic)?.forEach(fn => {
      try { fn(payload); } catch (e) { console.error(`[EventBus] Error in "${topic}":`, e); }
    });
    // Wildcard listeners
    _listeners.get('*')?.forEach(fn => {
      try { fn({ topic, payload }); } catch (e) {}
    });
  }

  function clear(topic) {
    if (topic) _listeners.delete(topic);
    else _listeners.clear();
  }

  // ── Well-known event topics ───────────────────────────────────────────────
  const EVENTS = {
    // State changes
    STATE_CHANGE:      'state:change',
    SELECTION_CHANGE:  'selection:change',
    ELEMENT_ADD:       'element:add',
    ELEMENT_UPDATE:    'element:update',
    ELEMENT_DELETE:    'element:delete',
    ELEMENT_REORDER:   'element:reorder',
    // Tools
    TOOL_CHANGE:       'tool:change',
    // Canvas
    CANVAS_PAN:        'canvas:pan',
    CANVAS_ZOOM:       'canvas:zoom',
    CANVAS_RENDER:     'canvas:render',
    SNAP_GUIDES:       'snap:guides',
    // Engine
    ANALYSIS_DONE:     'analysis:done',
    EXPORT_DONE:       'export:done',
    TOKENS_CHANGE:     'tokens:change',
    // History
    HISTORY_CHANGE:    'history:change',
    // UI
    PREVIEW_OPEN:      'preview:open',
    PREVIEW_CLOSE:     'preview:close',
    CONTEXT_MENU:      'ui:contextMenu',
    CONTEXT_MENU_CLOSE:'ui:contextMenuClose',
  };

  return { on, once, off, emit, clear, EVENTS };
})();
