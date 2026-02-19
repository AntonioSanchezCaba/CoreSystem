/**
 * Visual Layout OS — History Manager
 * Stack-based undo/redo supporting all element mutations.
 * Snapshots the full element map + rootIds for simplicity and correctness.
 */
const HistoryManager = (() => {
  'use strict';

  const MAX_HISTORY = 60;
  const _undoStack = [];
  const _redoStack = [];
  let _isBatching = false;
  let _batchSnapshot = null;

  // ── Serialize / Deserialize ───────────────────────────────────────────────
  function _snapshot() {
    const elements = new Map();
    AppState.elements.forEach((el, id) => elements.set(id, _deepClone(el)));
    return {
      elements,
      rootIds: [...AppState.rootIds],
      selectionIds: [...AppState.selection]
    };
  }

  function _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(_deepClone);
    const out = {};
    for (const k in obj) out[k] = _deepClone(obj[k]);
    return out;
  }

  function _restore(snap) {
    AppState.elements = snap.elements;
    AppState.rootIds  = [...snap.rootIds];
    AppState.selection = new Set(snap.selectionIds);
    EventBus.emit(EventBus.EVENTS.CANVAS_RENDER);
    EventBus.emit(EventBus.EVENTS.SELECTION_CHANGE, AppState.selection);
    EventBus.emit(EventBus.EVENTS.HISTORY_CHANGE, { canUndo: canUndo(), canRedo: canRedo() });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  /**
   * Call BEFORE making a mutation that should be undoable.
   */
  function push(label = 'Action') {
    if (_isBatching) return;
    const snap = _snapshot();
    snap.label = label;
    _undoStack.push(snap);
    if (_undoStack.length > MAX_HISTORY) _undoStack.shift();
    _redoStack.length = 0; // clear redo on new action
    EventBus.emit(EventBus.EVENTS.HISTORY_CHANGE, { canUndo: true, canRedo: false });
  }

  function undo() {
    if (!_undoStack.length) return;
    // Save current state to redo stack
    const current = _snapshot();
    current.label = _undoStack[_undoStack.length - 1]?.label;
    _redoStack.push(current);
    // Restore previous
    _restore(_undoStack.pop());
  }

  function redo() {
    if (!_redoStack.length) return;
    const current = _snapshot();
    _undoStack.push(current);
    _restore(_redoStack.pop());
  }

  function canUndo() { return _undoStack.length > 0; }
  function canRedo() { return _redoStack.length > 0; }

  /**
   * Batch multiple mutations as a single undo step.
   */
  function beginBatch(label) {
    _isBatching = true;
    _batchSnapshot = _snapshot();
    _batchSnapshot.label = label;
  }

  function endBatch() {
    if (!_isBatching) return;
    _isBatching = false;
    _undoStack.push(_batchSnapshot);
    if (_undoStack.length > MAX_HISTORY) _undoStack.shift();
    _redoStack.length = 0;
    _batchSnapshot = null;
    EventBus.emit(EventBus.EVENTS.HISTORY_CHANGE, { canUndo: true, canRedo: canRedo() });
  }

  function clear() {
    _undoStack.length = 0;
    _redoStack.length = 0;
    EventBus.emit(EventBus.EVENTS.HISTORY_CHANGE, { canUndo: false, canRedo: false });
  }

  return { push, undo, redo, canUndo, canRedo, beginBatch, endBatch, clear };
})();
