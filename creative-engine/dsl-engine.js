/**
 * CoreSystem Platform — DSL Engine
 * Parses a declarative layout DSL and converts it to block instances
 * that can be added to the AppState canvas.
 *
 * DSL Syntax:
 *   layout {
 *     navbar(brand: "MyApp", sticky: true)
 *     hero(title: "Hello World", cta: "Get Started")
 *     features(cols: 3, title: "What we offer")
 *     pricing(featured: 1)
 *     faq()
 *     footer(brand: "MyApp")
 *   }
 */
const DSLEngine = (() => {
  'use strict';

  // ── Token types ───────────────────────────────────────────────────────────
  const TT = {
    IDENT: 'IDENT', STRING: 'STRING', NUMBER: 'NUMBER', BOOL: 'BOOL',
    COLON: 'COLON', COMMA: 'COMMA', LPAREN: 'LPAREN', RPAREN: 'RPAREN',
    LBRACE: 'LBRACE', RBRACE: 'RBRACE', EOF: 'EOF'
  };

  // ── Lexer ─────────────────────────────────────────────────────────────────
  function tokenize(src) {
    const tokens = [];
    let i = 0;

    while (i < src.length) {
      // Skip whitespace and comments
      if (/\s/.test(src[i])) { i++; continue; }
      if (src[i] === '/' && src[i+1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (src[i] === '/' && src[i+1] === '*') {
        i += 2; while (i < src.length && !(src[i] === '*' && src[i+1] === '/')) i++; i += 2; continue;
      }

      // Single-char tokens
      const singles = { ':': TT.COLON, ',': TT.COMMA, '(': TT.LPAREN, ')': TT.RPAREN, '{': TT.LBRACE, '}': TT.RBRACE };
      if (singles[src[i]]) { tokens.push({ type: singles[src[i]], val: src[i] }); i++; continue; }

      // Strings
      if (src[i] === '"' || src[i] === "'") {
        const q = src[i++]; let s = '';
        while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; s += src[i++]; }
        i++; tokens.push({ type: TT.STRING, val: s }); continue;
      }

      // Numbers
      if (/[0-9]/.test(src[i])) {
        let n = '';
        while (i < src.length && /[0-9.]/.test(src[i])) n += src[i++];
        tokens.push({ type: TT.NUMBER, val: parseFloat(n) }); continue;
      }

      // Identifiers / keywords (true, false)
      if (/[a-zA-Z_]/.test(src[i])) {
        let id = '';
        while (i < src.length && /[a-zA-Z0-9_-]/.test(src[i])) id += src[i++];
        if (id === 'true' || id === 'false') tokens.push({ type: TT.BOOL, val: id === 'true' });
        else tokens.push({ type: TT.IDENT, val: id });
        continue;
      }

      // Unknown — skip
      i++;
    }

    tokens.push({ type: TT.EOF, val: null });
    return tokens;
  }

  // ── Parser ────────────────────────────────────────────────────────────────
  function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const consume = (type) => {
      const t = tokens[pos];
      if (type && t.type !== type) throw new Error(`Expected ${type} but got ${t.type} ("${t.val}")`);
      pos++; return t;
    };

    const blocks = [];

    // Optional top-level `layout { ... }` wrapper
    if (peek().type === TT.IDENT && peek().val === 'layout') {
      consume(TT.IDENT);
      if (peek().type === TT.LBRACE) {
        consume(TT.LBRACE);
        while (peek().type !== TT.RBRACE && peek().type !== TT.EOF) {
          blocks.push(parseBlock());
        }
        if (peek().type === TT.RBRACE) consume(TT.RBRACE);
      }
    } else {
      // No wrapper — just list of blocks
      while (peek().type !== TT.EOF) {
        if (peek().type === TT.IDENT) blocks.push(parseBlock());
        else { pos++; }
      }
    }

    return blocks;

    function parseBlock() {
      const name = consume(TT.IDENT).val;
      let config = {};

      if (peek().type === TT.LPAREN) {
        consume(TT.LPAREN);
        config = parseArgs();
        consume(TT.RPAREN);
      }

      // Optional body (ignored structurally — nested blocks not yet supported)
      if (peek().type === TT.LBRACE) {
        consume(TT.LBRACE);
        const nested = [];
        while (peek().type !== TT.RBRACE && peek().type !== TT.EOF) {
          if (peek().type === TT.IDENT) nested.push(parseBlock());
          else pos++;
        }
        if (peek().type === TT.RBRACE) consume(TT.RBRACE);
        config._nested = nested;
      }

      return { id: name, config };
    }

    function parseArgs() {
      const args = {};
      while (peek().type !== TT.RPAREN && peek().type !== TT.EOF) {
        if (peek().type !== TT.IDENT) { pos++; continue; }
        const key = consume(TT.IDENT).val;
        if (peek().type === TT.COLON) {
          consume(TT.COLON);
          args[key] = parseValue();
        } else {
          args[key] = true;
        }
        if (peek().type === TT.COMMA) consume(TT.COMMA);
      }
      return args;
    }

    function parseValue() {
      const t = peek();
      if (t.type === TT.STRING) { pos++; return t.val; }
      if (t.type === TT.NUMBER) { pos++; return String(t.val); }
      if (t.type === TT.BOOL)   { pos++; return t.val; }
      if (t.type === TT.IDENT)  { pos++; return t.val; }
      return null;
    }
  }

  // ── Transform: AST → block instances ─────────────────────────────────────
  function transform(astBlocks) {
    const result = [];
    for (const node of astBlocks) {
      const def = BlockLibrary.get(node.id);
      if (!def) {
        console.warn(`[DSL] Unknown block: "${node.id}". Skipping.`);
        continue;
      }
      result.push({
        ...def,
        config: { ...(def.defaultConfig || {}), ...node.config }
      });
    }
    return result;
  }

  // ── Main entry point ──────────────────────────────────────────────────────
  /**
   * Compile DSL source string into block instances ready for AppState.
   * @param {string} src - DSL source code
   * @returns {{ blocks: Array, errors: string[] }}
   */
  function compile(src) {
    const errors = [];
    try {
      const tokens = tokenize(src);
      const ast = parse(tokens);
      const blocks = transform(ast);
      return { blocks, errors };
    } catch (e) {
      errors.push(e.message);
      return { blocks: [], errors };
    }
  }

  /**
   * Serialize current AppState blocks back to DSL source string.
   */
  function serialize(blocks) {
    if (!blocks || blocks.length === 0) return 'layout {\n  // Add blocks here\n}';

    const lines = blocks.map(b => {
      const config = b.config || {};
      const args = Object.entries(config)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => {
          if (typeof v === 'boolean') return `${k}: ${v}`;
          if (typeof v === 'number') return `${k}: ${v}`;
          // Truncate long values
          const s = String(v);
          if (s.length > 60) return `${k}: "${s.slice(0, 57)}..."`;
          return `${k}: "${s}"`;
        }).join(', ');
      return `  ${b.id}(${args})`;
    });

    return `layout {\n${lines.join('\n')}\n}`;
  }

  return { compile, serialize, tokenize };
})();
