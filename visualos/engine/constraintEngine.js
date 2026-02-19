/**
 * Visual Layout OS — Constraint Engine
 * Figma-style constraints: when a parent is resized, children reposition/resize
 * according to their h (horizontal) and v (vertical) constraint types.
 *
 * h: 'left' | 'right' | 'center' | 'scale' | 'stretch'
 * v: 'top'  | 'bottom' | 'center' | 'scale' | 'stretch'
 */
const ConstraintEngine = (() => {
  'use strict';

  /**
   * Apply constraints to a child element when its parent resizes.
   * @param {Object} child      Element def with constraints, x, y, width, height
   * @param {Object} oldParent  { width, height } — parent BEFORE resize
   * @param {Object} newParent  { width, height } — parent AFTER resize
   * @returns {Object} patch    { x, y, width, height } to apply to child
   */
  function applyToChild(child, oldParent, newParent) {
    const dW = newParent.width  - oldParent.width;
    const dH = newParent.height - oldParent.height;

    const c = child.constraints || { h: 'left', v: 'top' };

    let { x, y, width, height } = child;

    // ── Horizontal ────────────────────────────────────────────────────────
    switch (c.h) {
      case 'left':
        // x fixed from left, width unchanged
        break;

      case 'right':
        // distance from right edge stays fixed
        x = x + dW;
        break;

      case 'center': {
        // distance from horizontal center stays proportional
        const oldCX  = oldParent.width / 2;
        const childCX = x + width / 2;
        const offsetFromCenter = childCX - oldCX;
        const newCX  = newParent.width / 2;
        x = newCX + offsetFromCenter - width / 2;
        break;
      }

      case 'scale': {
        // x and width scale proportionally with parent
        const ratioX = oldParent.width ? x / oldParent.width : 0;
        const ratioW = oldParent.width ? width / oldParent.width : 0;
        x = ratioX * newParent.width;
        width = ratioW * newParent.width;
        break;
      }

      case 'stretch':
        // left distance fixed, right distance fixed → width changes
        width = width + dW;
        break;
    }

    // ── Vertical ──────────────────────────────────────────────────────────
    switch (c.v) {
      case 'top':
        break;

      case 'bottom':
        y = y + dH;
        break;

      case 'center': {
        const oldCY  = oldParent.height / 2;
        const childCY = y + height / 2;
        const offsetFromCenter = childCY - oldCY;
        const newCY  = newParent.height / 2;
        y = newCY + offsetFromCenter - height / 2;
        break;
      }

      case 'scale': {
        const ratioY = oldParent.height ? y / oldParent.height : 0;
        const ratioH = oldParent.height ? height / oldParent.height : 0;
        y = ratioY * newParent.height;
        height = ratioH * newParent.height;
        break;
      }

      case 'stretch':
        height = height + dH;
        break;
    }

    // Clamp minimum size
    width  = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));
    x      = Math.round(x);
    y      = Math.round(y);

    return { x, y, width, height };
  }

  /**
   * Called after a parent element is resized.
   * Walks all direct children, computes new positions, and applies patches.
   * @param {string} parentId
   * @param {Object} oldSize  { width, height }
   * @param {Object} newSize  { width, height }
   */
  function propagateResize(parentId, oldSize, newSize) {
    const parent = AppState.getElement(parentId);
    if (!parent || !parent.childIds.length) return;
    if (oldSize.width === newSize.width && oldSize.height === newSize.height) return;

    parent.childIds.forEach(cid => {
      const child = AppState.getElement(cid);
      if (!child || child.locked) return;
      const patch = applyToChild(child, oldSize, newSize);
      AppState.updateElement(cid, patch);
      // Recursively propagate if this child also has children
      const childOld = { width: child.width, height: child.height };
      const childNew = { width: patch.width, height: patch.height };
      if (childOld.width !== childNew.width || childOld.height !== childNew.height) {
        propagateResize(cid, childOld, childNew);
      }
    });
  }

  /**
   * Resolves what constraint CSS value a given constraint maps to.
   * Used by ExportEngine when generating CSS.
   */
  function constraintToCSSHint(h, v) {
    const hints = [];
    if (h === 'stretch') hints.push('width:100%');
    if (v === 'stretch') hints.push('height:100%');
    if (h === 'center' && v === 'center') hints.push('margin:auto');
    return hints;
  }

  return { applyToChild, propagateResize, constraintToCSSHint };
})();
