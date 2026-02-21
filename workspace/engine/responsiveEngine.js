'use strict';
/**
 * CoreSystem Workspace — Responsive Engine
 * Generates mobile-first CSS media queries from the layout tree.
 */
const ResponsiveEng = (() => {
  const BP = { sm: 480, md: 768, lg: 1024 };

  function _px(v) { return `${Math.round(v)}px`; }

  // Per-role mobile rules
  function _mobileRules(node) {
    const rules = [];
    switch (node.role) {
      case 'header':
      case 'footer':
      case 'hero':
      case 'section':
      case 'nav':
        rules.push('width:100%;', 'max-width:100%;');
        break;
      case 'sidebar-left':
      case 'sidebar-right':
        rules.push('width:100%;', 'position:static;', 'float:none;', 'height:auto;');
        break;
      case 'card':
        rules.push('width:100%;', 'margin-left:0;', 'margin-right:0;');
        break;
    }
    if (node.layout === 'flex-row')  rules.push('flex-direction:column;');
    if (node.layout === 'grid')      rules.push('grid-template-columns:1fr;');
    return rules;
  }

  // Per-role tablet rules
  function _tabletRules(node) {
    const rules = [];
    if (node.layout === 'grid' && node.children.length > 2) {
      rules.push('grid-template-columns:repeat(2,1fr);');
    }
    if (node.role === 'sidebar-left' || node.role === 'sidebar-right') {
      rules.push('width:220px;');
    }
    return rules;
  }

  function generate(tree) {
    const chunks = [];

    function walk(node) {
      const cls = node.cssClass || `el-${node.id}`;
      const mob = _mobileRules(node);
      if (mob.length) {
        chunks.push(`/* ${node.el.name} — ${node.role} */\n@media (max-width:${BP.md}px) {\n  .${cls} {\n${mob.map(r => '    '+r).join('\n')}\n  }\n}`);
      }
      const tab = _tabletRules(node);
      if (tab.length) {
        chunks.push(`@media (min-width:${BP.md+1}px) and (max-width:${BP.lg-1}px) {\n  .${cls} {\n${tab.map(r => '    '+r).join('\n')}\n  }\n}`);
      }
      node.children.forEach(walk);
    }

    (tree.roots || []).forEach(walk);
    return chunks.join('\n\n');
  }

  function getPreviewSizes() {
    return [
      { label:'Mobile',  width:375,  height:812 },
      { label:'Tablet',  width:768,  height:1024 },
      { label:'Desktop', width:1440, height:900  },
    ];
  }

  return { generate, getPreviewSizes, BP };
})();
