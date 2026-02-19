/**
 * CoreSystem Platform — Generator
 * Orchestrates the parse → compile → output pipeline.
 * Provides download and preview capabilities.
 */
const Generator = (() => {
  'use strict';

  /**
   * Run the full generation pipeline from current AppState.
   * @returns {{ html: string, css: string, js: string, warnings: string[] }}
   */
  function generate() {
    const blocks   = AppState.getBlocks();
    const theme    = AppState.get('theme');
    const settings = AppState.get('settings');

    const warnings = Parser.validate(blocks);
    const parsed   = Parser.parse(blocks);
    const output   = Compiler.compile(parsed, theme, settings);

    AppState.setGenerated(output.html, output.css, output.js);

    return { ...output, warnings };
  }

  /**
   * Build a self-contained HTML string for iframe preview.
   */
  function preview() {
    const blocks   = AppState.getBlocks();
    const theme    = AppState.get('theme');
    const settings = AppState.get('settings');
    const parsed   = Parser.parse(blocks);
    return Compiler.compileForPreview(parsed, theme, settings);
  }

  /**
   * Compile DSL source and apply blocks to AppState.
   * @param {string} dslSrc
   * @returns {string[]} Errors (empty if success)
   */
  function fromDSL(dslSrc) {
    const { blocks, errors } = DSLEngine.compile(dslSrc);
    if (errors.length) return errors;

    AppState.clearBlocks();
    blocks.forEach(b => AppState.addBlock(b));
    return [];
  }

  /**
   * Serialize current canvas to DSL string.
   */
  function toDSL() {
    return DSLEngine.serialize(AppState.getBlocks());
  }

  /**
   * Download generated files as a ZIP archive.
   * @param {string} projectName
   */
  function downloadZip(projectName = 'my-project') {
    const { html, css, js } = AppState.getGenerated();
    if (!html) {
      Utils.showToast('Generate code first before downloading.', 'warning');
      return;
    }

    const folderName = projectName.toLowerCase().replace(/\s+/g, '-');
    Utils.downloadZip(`${folderName}.zip`, [
      { name: `${folderName}/index.html`, content: html },
      { name: `${folderName}/styles.css`,  content: css  },
      { name: `${folderName}/script.js`,   content: js   },
      { name: `${folderName}/README.md`,   content: _readme(folderName) }
    ]);

    Utils.showToast(`${folderName}.zip downloaded successfully!`, 'success');
  }

  /**
   * Download a single template's files as a ZIP.
   * @param {string} tplId
   * @param {Object} tplData - { name, html, css, js }
   */
  function downloadTemplateZip(tplId, tplData) {
    const folder = tplId.toLowerCase().replace(/\s+/g, '-');
    Utils.downloadZip(`${folder}.zip`, [
      { name: `${folder}/index.html`, content: tplData.html },
      { name: `${folder}/styles.css`, content: tplData.css  },
      { name: `${folder}/script.js`,  content: tplData.js   },
      { name: `${folder}/README.md`,  content: _readme(folder) }
    ]);
    Utils.showToast(`${tplData.name}.zip downloaded!`, 'success');
  }

  // ── Internal ──────────────────────────────────────────────────────────────
  function _readme(name) {
    return `# ${name}\n\nGenerated with CoreSystem Platform.\n\n## Usage\n\n1. Open \`index.html\` in your browser\n2. Customise \`styles.css\` to match your brand\n3. Add interactivity in \`script.js\`\n\n## Structure\n\n\`\`\`\n${name}/\n├── index.html   # Main page\n├── styles.css   # Stylesheet\n└── script.js    # Scripts\n\`\`\`\n\nhttps://coresystem.dev\n`;
  }

  return { generate, preview, fromDSL, toDSL, downloadZip, downloadTemplateZip };
})();
