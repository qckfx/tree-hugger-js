import Parser from 'tree-sitter';
import { readFileSync } from 'fs';
import { TreeHuggerOptions, FunctionInfo, ClassInfo } from './types';
import { detectLanguage, getLanguageByName } from './languages';
import { TreeNode } from './node-wrapper';
import { Transform } from './transform';
import { ParseError, LanguageError } from './errors';
import { ScopeAnalyzer, Visitor, VisitorFunction } from './visitor';

export class TreeHugger {
  private parser: Parser;
  private tree: Parser.Tree;
  private sourceCode: string;
  public root: TreeNode;

  constructor(sourceCode: string, options: TreeHuggerOptions = {}) {
    this.parser = new Parser();
    this.sourceCode = sourceCode;

    // Detect or use specified language
    const language = options.language
      ? getLanguageByName(options.language)
      : detectLanguage(sourceCode);

    if (!language) {
      const message = options.language
        ? `Unknown language: ${options.language}`
        : 'Could not detect language. Please specify language option.';
      throw new LanguageError(message, sourceCode.slice(0, 100));
    }

    try {
      this.parser.setLanguage(language.parser);
      this.tree = this.parser.parse(sourceCode);

      // Don't throw on syntax errors - tree-sitter can handle partial parsing
      // Users can check tree.root.hasError if they want to know about errors

      // Robust rootNode initialization with retry mechanism for CI environments
      const rootNode = this.getRootNodeWithRetry(this.tree, 3);
      this.root = new TreeNode(rootNode, sourceCode);
    } catch (error) {
      if (error instanceof ParseError || error instanceof LanguageError) throw error;
      throw new ParseError(
        `Failed to parse: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Robust rootNode getter with retry mechanism to handle race conditions in CI environments
   * Addresses the known issue where tree.rootNode can be undefined in concurrent testing scenarios
   */
  private getRootNodeWithRetry(tree: Parser.Tree, maxRetries: number = 3): Parser.SyntaxNode {
    let attempts = 0;

    while (attempts < maxRetries) {
      const rootNode = tree.rootNode;

      if (typeof rootNode?.type !== 'undefined') {
        return rootNode;
      }

      attempts++;

      if (attempts < maxRetries) {
        // Short delay to allow native binding to stabilize
        // This addresses the race condition documented in tree-sitter/node-tree-sitter#181
        const delay = Math.min(10 * attempts, 50); // Progressive delay: 10ms, 20ms, 50ms

        // Use synchronous delay to avoid async complications in constructor
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Busy wait for very short delays
        }
      }
    }

    throw new ParseError(
      `Failed to get valid rootNode after ${maxRetries} attempts. This is likely caused by a race condition in tree-sitter native bindings. ` +
        'Consider running tests serially or using a Jest moduleNameMapper workaround for tree-sitter.'
    );
  }

  private findFirstError(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
    if (node.type === 'ERROR') return node;
    for (const child of node.children) {
      const error = this.findFirstError(child);
      if (error) return error;
    }
    return null;
  }

  // Delegate common methods to root
  find(pattern: string): TreeNode | null {
    return this.root.find(pattern);
  }

  findAll(pattern: string): TreeNode[] {
    return this.root.findAll(pattern);
  }

  functions(): TreeNode[] {
    return this.root.functions();
  }

  classes(): TreeNode[] {
    return this.root.classes();
  }

  imports(): TreeNode[] {
    return this.root.imports();
  }

  variables(): TreeNode[] {
    return this.root.variables();
  }

  comments(): TreeNode[] {
    return this.root.comments();
  }

  exports(): TreeNode[] {
    return this.root.exports();
  }

  // JSX helpers
  jsxComponents(): TreeNode[] {
    return this.root.jsxComponents();
  }

  jsxProps(componentName?: string): TreeNode[] {
    return this.root.jsxProps(componentName);
  }

  hooks(): TreeNode[] {
    return this.root.hooks();
  }

  // Visitor pattern
  visit(visitor: Visitor | VisitorFunction): void {
    this.root.visit(visitor);
  }

  // Scope analysis
  analyzeScopes(): ScopeAnalyzer {
    const analyzer = new ScopeAnalyzer();
    analyzer.analyze(this.root);
    return analyzer;
  }

  // Find node at position
  nodeAt(line: number, column: number): TreeNode | null {
    return this.root.nodeAt(line, column);
  }

  // Enhanced analysis methods that return structured data
  /**
   * Get detailed function information with parameters and body ranges
   */
  getFunctionDetails(): FunctionInfo[] {
    const functions = this.functions();
    return functions.map(fn => ({
      name: fn.name,
      type: fn.type,
      async: fn.isAsync(),
      parameters: fn.extractParameters(),
      startLine: fn.line,
      endLine: fn.endLine,
      text: fn.text,
      bodyRange: fn.getBodyRange() ?? undefined,
    }));
  }

  /**
   * Get detailed class information with methods and body ranges
   */
  getClassDetails(): ClassInfo[] {
    const classes = this.classes();
    return classes.map(cls => {
      const methods = cls.findAll('method_definition');
      const methodDetails = methods.map(method => ({
        name: method.name,
        type: method.type,
        async: method.isAsync(),
        parameters: method.extractParameters(),
        startLine: method.line,
        endLine: method.endLine,
        text: method.text,
        bodyRange: method.getBodyRange() ?? undefined,
      }));

      return {
        name: cls.name,
        methods: methodDetails,
        properties: cls.findAll('field_definition').map(prop => prop.name ?? 'unknown'),
        startLine: cls.line,
        endLine: cls.endLine,
        text: cls.text,
        bodyRange: cls.getBodyRange() ?? undefined,
      };
    });
  }

  // Transform API
  transform(): Transform {
    return new Transform(this.root, this.sourceCode);
  }
}

// Main entry point functions
export function parse(filenameOrCode: string, options?: TreeHuggerOptions): TreeHugger {
  let sourceCode: string;

  // Check if it's a file path or raw code
  if (
    filenameOrCode.endsWith('.js') ||
    filenameOrCode.endsWith('.ts') ||
    filenameOrCode.endsWith('.jsx') ||
    filenameOrCode.endsWith('.tsx') ||
    filenameOrCode.endsWith('.mjs') ||
    filenameOrCode.endsWith('.cjs')
  ) {
    try {
      sourceCode = readFileSync(filenameOrCode, 'utf-8');
      // Use filename for better language detection
      if (!options?.language) {
        const lang = detectLanguage(filenameOrCode);
        if (lang) {
          options = { ...options, language: lang.name };
        }
      }
    } catch {
      // If file read fails, treat as source code
      sourceCode = filenameOrCode;
    }
  } else {
    sourceCode = filenameOrCode;
  }

  return new TreeHugger(sourceCode, options);
}

export { TreeNode } from './node-wrapper';
export * from './types';
