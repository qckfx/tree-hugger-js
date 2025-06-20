import { NodeWrapper, NodePredicate } from './types';

export interface Selector {
  type: 'type' | 'descendant' | 'child' | 'attribute' | 'pseudo' | 'combination';
  value?: string;
  left?: Selector;
  right?: Selector;
  operator?: string;
  name?: string;
  selectors?: Selector[];
}

// Intuitive aliases that map to actual tree-sitter node types
const NODE_TYPE_ALIASES: Record<string, string[]> = {
  // Functions
  function: ['function_declaration', 'function_expression', 'arrow_function', 'method_definition'],
  arrow: ['arrow_function'],
  method: ['method_definition'],

  // Classes and interfaces
  class: ['class_declaration', 'class_expression'],
  interface: ['interface_declaration'],

  // Variables
  variable: ['variable_declarator'],
  const: ['lexical_declaration'],
  let: ['lexical_declaration'],
  var: ['variable_declaration'],

  // Strings
  string: ['string', 'template_string'],
  template: ['template_string'],

  // Loops
  loop: [
    'for_statement',
    'while_statement',
    'do_statement',
    'for_in_statement',
    'for_of_statement',
  ],
  for: ['for_statement', 'for_in_statement', 'for_of_statement'],
  while: ['while_statement', 'do_statement'],

  // Conditionals
  condition: ['if_statement', 'switch_statement', 'ternary_expression'],
  if: ['if_statement'],
  switch: ['switch_statement'],
  ternary: ['ternary_expression'],

  // Imports/Exports
  import: ['import_statement'],
  export: ['export_statement'],

  // JSX
  jsx: ['jsx_element', 'jsx_self_closing_element', 'jsx_fragment'],
  'jsx-element': ['jsx_element', 'jsx_self_closing_element'],
  'jsx-attribute': ['jsx_attribute'],

  // Comments
  comment: ['comment'],

  // Calls
  call: ['call_expression'],
  new: ['new_expression'],

  // Returns
  return: ['return_statement'],
  throw: ['throw_statement'],

  // Common patterns
  statement: ['expression_statement', 'block_statement', 'empty_statement'],
  block: ['block_statement', 'statement_block'],
};

export class PatternParser {
  private pos = 0;
  private input = '';

  parse(pattern: string): NodePredicate {
    this.input = pattern.trim();
    this.pos = 0;

    // Handle empty pattern
    if (!this.input) {
      return () => false;
    }

    try {
      const selector = this.parseSelector();
      return this.compilePredicate(selector);
    } catch {
      // Check if this might be a typo
      const suggestions = this.getSuggestions(pattern);
      if (suggestions.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`Unknown pattern '${pattern}'. Did you mean: ${suggestions.join(', ')}?`);
      }
      // For invalid patterns, return a predicate that matches nothing
      return () => false;
    }
  }

  private getSuggestions(pattern: string): string[] {
    const suggestions: string[] = [];

    // Check for common typos
    const lowerPattern = pattern.toLowerCase();

    // Check aliases
    for (const alias of Object.keys(NODE_TYPE_ALIASES)) {
      if (alias.includes(lowerPattern) || lowerPattern.includes(alias)) {
        suggestions.push(alias);
      }
    }

    // Common mistakes
    const commonMistakes: Record<string, string[]> = {
      'async-function': ['function[async]', 'arrow[async]'],
      async_function: ['function[async]', 'arrow[async]'],
      func: ['function'],
      str: ['string'],
      tpl: ['template'],
      cls: ['class'],
    };

    if (commonMistakes[lowerPattern]) {
      suggestions.push(...commonMistakes[lowerPattern]);
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  private parseSelector(): Selector {
    const selectors: Selector[] = [];

    while (this.pos < this.input.length) {
      // Skip whitespace
      this.skipWhitespace();

      if (this.pos >= this.input.length) break;

      // Check for combinators
      if (this.peek() === '>') {
        this.pos++;
        this.skipWhitespace();
        const right = this.parseSimpleSelector();
        const left = selectors.pop();
        if (!left) throw new Error('Invalid child combinator');
        selectors.push({ type: 'child', left, right });
      } else if (this.peek() === ',') {
        this.pos++;
        continue; // Will be handled at the end
      } else {
        const selector = this.parseSimpleSelector();

        // Check if next is a descendant (space)
        this.skipWhitespace();
        if (this.pos < this.input.length && this.peek() !== '>' && this.peek() !== ',') {
          const right = this.parseSimpleSelector();
          selectors.push({ type: 'descendant', left: selector, right });
        } else {
          selectors.push(selector);
        }
      }
    }

    if (selectors.length === 1) {
      return selectors[0];
    }

    return { type: 'combination', selectors };
  }

  private parseSimpleSelector(): Selector {
    let selector: Selector | null = null;

    // Parse type selector
    if (this.isIdentifierStart()) {
      const type = this.parseIdentifier();
      selector = { type: 'type', value: type };
    }

    // Parse attributes and pseudo-selectors
    while (this.pos < this.input.length) {
      if (this.peek() === '[') {
        const attr = this.parseAttribute();
        if (!selector) {
          selector = attr;
        } else {
          selector = { type: 'combination', selectors: [selector, attr] };
        }
      } else if (this.peek() === ':') {
        const pseudo = this.parsePseudo();
        if (!selector) {
          selector = pseudo;
        } else {
          selector = { type: 'combination', selectors: [selector, pseudo] };
        }
      } else {
        break;
      }
    }

    if (!selector) {
      throw new Error('Expected selector');
    }

    return selector;
  }

  private parseAttribute(): Selector {
    this.expect('[');
    this.skipWhitespace();

    const name = this.parseIdentifier();
    this.skipWhitespace();

    let operator = '=';
    let value: string | undefined;

    if (this.peek() === '=') {
      this.pos++;
      value = this.parseAttributeValue();
    } else if (this.peek() === '~' && this.peekNext() === '=') {
      operator = '~=';
      this.pos += 2;
      value = this.parseAttributeValue();
    } else if (this.peek() === '^' && this.peekNext() === '=') {
      operator = '^=';
      this.pos += 2;
      value = this.parseAttributeValue();
    } else if (this.peek() === '$' && this.peekNext() === '=') {
      operator = '$=';
      this.pos += 2;
      value = this.parseAttributeValue();
    } else if (this.peek() === '*' && this.peekNext() === '=') {
      operator = '*=';
      this.pos += 2;
      value = this.parseAttributeValue();
    }

    this.skipWhitespace();
    this.expect(']');

    return { type: 'attribute', name, operator, value };
  }

  private parsePseudo(): Selector {
    this.expect(':');
    const name = this.parseIdentifier();

    // Handle pseudo-selectors with arguments
    if (this.peek() === '(') {
      this.pos++;
      const value = this.parseBalanced(')');
      this.expect(')');
      return { type: 'pseudo', name, value };
    }

    return { type: 'pseudo', name };
  }

  private parseAttributeValue(): string {
    this.skipWhitespace();

    if (this.peek() === '"' || this.peek() === "'") {
      const quote = this.peek();
      this.pos++;
      const value = this.parseUntil(quote);
      this.expect(quote);
      return value;
    }

    return this.parseIdentifier();
  }

  private compilePredicate(selector: Selector): NodePredicate {
    switch (selector.type) {
      case 'type':
        // Check if this is an alias
        const typeValue = selector.value ?? '';
        const aliasedTypes = NODE_TYPE_ALIASES[typeValue];

        if (aliasedTypes) {
          // Match any of the aliased types
          return (node: NodeWrapper) => aliasedTypes.includes(node.type);
        } else {
          // Direct type match
          return (node: NodeWrapper) => node.type === typeValue;
        }

      case 'attribute':
        return this.compileAttributePredicate(selector);

      case 'pseudo':
        return this.compilePseudoPredicate(selector);

      case 'child':
        return (node: NodeWrapper) => {
          if (!selector.right || !selector.left) return false;
          const rightPred = this.compilePredicate(selector.right);
          if (!rightPred(node)) return false;

          const parent = node.parent;
          if (!parent) return false;

          const leftPred = this.compilePredicate(selector.left);
          return leftPred(parent);
        };

      case 'descendant':
        return (node: NodeWrapper) => {
          if (!selector.right || !selector.left) return false;
          const rightPred = this.compilePredicate(selector.right);
          if (!rightPred(node)) return false;

          const leftPred = this.compilePredicate(selector.left);
          let current = node.parent;
          while (current) {
            if (leftPred(current)) return true;
            current = current.parent;
          }
          return false;
        };

      case 'combination':
        if (!selector.selectors) return () => false;
        const predicates = selector.selectors.map(s => this.compilePredicate(s));
        return (node: NodeWrapper) => predicates.every(p => p(node));

      default:
        return () => false;
    }
  }

  private compileAttributePredicate(selector: Selector): NodePredicate {
    const { name, operator, value } = selector;

    return (node: NodeWrapper) => {
      // Special attributes
      if (name === 'name') {
        const nodeName = node.name;
        if (!nodeName) {
          // For jsx_attribute, the name is in property_identifier child
          if (node.type === 'jsx_attribute') {
            // The first child should be the property_identifier
            const firstChild = node.children[0];
            if (firstChild && firstChild.type === 'property_identifier') {
              return this.matchValue(firstChild.text, operator ?? '=', value);
            }
          }
          return false;
        }
        return this.matchValue(nodeName, operator ?? '=', value);
      }

      if (name === 'async') {
        return node.text.includes('async');
      }

      if (name === 'text') {
        return this.matchValue(node.text, operator ?? '=', value);
      }

      // Field-based attributes
      if (!name) return false;
      const field = node.node.childForFieldName?.(name);
      if (field) {
        const fieldText = node.sourceCode.slice(field.startIndex, field.endIndex);
        return this.matchValue(fieldText, operator ?? '=', value);
      }

      return false;
    };
  }

  private compilePseudoPredicate(selector: Selector): NodePredicate {
    const { name, value } = selector;

    switch (name) {
      case 'has':
        if (!value) return () => false;
        const innerPredicate = new PatternParser().parse(value);
        return (node: NodeWrapper) => {
          // Check if any descendant matches (not just direct children)
          const checkDescendants = (n: NodeWrapper): boolean => {
            if (innerPredicate(n)) return true;
            return n.children.some(child => checkDescendants(child));
          };
          return node.children.some(child => checkDescendants(child));
        };

      case 'not':
        if (!value) return () => false;
        const notPredicate = new PatternParser().parse(value);
        return (node: NodeWrapper) => !notPredicate(node);

      default:
        return () => false;
    }
  }

  private matchValue(actual: string | undefined, operator: string, expected?: string): boolean {
    if (!expected) return true;
    if (!actual) return false;

    switch (operator) {
      case '=':
        return actual === expected;
      case '~=':
        return actual.split(/\s+/).includes(expected);
      case '^=':
        return actual.startsWith(expected);
      case '$=':
        return actual.endsWith(expected);
      case '*=':
        return actual.includes(expected);
      default:
        return false;
    }
  }

  // Parsing helpers
  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private peek(): string {
    return this.input[this.pos] || '';
  }

  private peekNext(): string {
    return this.input[this.pos + 1] || '';
  }

  private expect(char: string): void {
    if (this.peek() !== char) {
      throw new Error(`Expected '${char}' but got '${this.peek()}'`);
    }
    this.pos++;
  }

  private isIdentifierStart(): boolean {
    const char = this.peek();
    return /[a-zA-Z_]/.test(char);
  }

  private parseIdentifier(): string {
    let result = '';
    while (this.pos < this.input.length && /[a-zA-Z0-9_-]/.test(this.peek())) {
      result += this.peek();
      this.pos++;
    }
    return result;
  }

  private parseUntil(char: string): string {
    let result = '';
    while (this.pos < this.input.length && this.peek() !== char) {
      if (this.peek() === '\\' && this.pos + 1 < this.input.length) {
        // Handle escaped characters
        this.pos++; // Skip backslash
        if (this.peek() === char) {
          // Escaped quote - add the quote character
          result += char;
        } else {
          // Other escaped characters - keep the backslash and character
          result += '\\' + this.peek();
        }
      } else {
        result += this.peek();
      }
      this.pos++;
    }
    return result;
  }

  private parseBalanced(closeChar: string): string {
    let result = '';
    let depth = 0;
    const openChar = closeChar === ')' ? '(' : closeChar === ']' ? '[' : closeChar;

    while (this.pos < this.input.length) {
      const current = this.peek();

      if (current === openChar) {
        depth++;
        result += current;
      } else if (current === closeChar) {
        if (depth === 0) {
          // Found the matching closing character
          break;
        } else {
          depth--;
          result += current;
        }
      } else {
        result += current;
      }

      this.pos++;
    }

    return result;
  }
}
