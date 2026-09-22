'use strict';
/**
 * CoreSystem Workspace — History Manager
 * Snapshot-based undo/redo. Max 60 steps.
 */
const History = (() => {
  const MAX = 60;
  let _undo = [];   // stack of snapshots
  let _redo = [];
  let _batch = false;

  function push(label = '') {
    if (_batch) return;
    _undo.push({ label, snap: State.__snapshot() });
    if (_undo.length > MAX) _undo.shift();
    _redo = [];
    _emit();
  }

  function undo() {
    if (!_undo.length) return;
    _redo.push({ snap: State.__snapshot() });
    State.__restore(_undo.pop().snap);
    _emit();
  }

  function redo() {
    if (!_redo.length) return;
    _undo.push({ snap: State.__snapshot() });
    State.__restore(_redo.pop().snap);
    _emit();
  }

  function beginBatch()         { _batch = true; }
  function endBatch(label = '') { _batch = false; push(label); }

  function canUndo() { return _undo.length > 0; }
  function canRedo() { return _redo.length > 0; }

  function _emit() {
    State.emit('history:change', { canUndo: canUndo(), canRedo: canRedo() });
  }

  return { push, undo, redo, beginBatch, endBatch, canUndo, canRedo };
})();
