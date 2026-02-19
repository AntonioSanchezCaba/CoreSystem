/**
 * CoreSystem Platform — App Entry Point
 * Initializes all modules in dependency order on DOMContentLoaded.
 */
(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {

    // 1. Restore persisted theme
    ThemeManager.restore();

    // 2. UI infrastructure
    UIController.initNavbar();
    UIController.initModals();
    UIController.initScrollReveal();

    // 3. Template library
    UIController.initTemplateLibrary();

    // 4. Creative Engine
    UIController.initCreativeEngine();
    UIController.initCodeOutputTabs();

    // 5. Load a starter block set if canvas is empty
    if (AppState.getBlocks().length === 0) {
      const starters = ['navbar', 'hero', 'features', 'cta', 'footer'];
      starters.forEach(id => {
        const def = BlockLibrary.get(id);
        if (def) AppState.addBlock(def);
      });
    }

    // 6. Expose public API to window for inline scripts
    window.CS = {
      toast:     Utils.showToast,
      openModal: UIController.openModal,
      closeModal: UIController.closeModal,
      state:     AppState,
      generate:  Generator.generate,
      preview:   Generator.preview
    };

    console.info('[CoreSystem] Platform v2.0 initialised.');
  });
})();
