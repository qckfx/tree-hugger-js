import Parser from 'tree-sitter';
import { readFileSync } from 'fs';
import { TreeHuggerOptions } from './types';
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

      this.root = new TreeNode(this.tree.rootNode, sourceCode);
    } catch (error) {
      if (error instanceof ParseError || error instanceof LanguageError) throw error;
      throw new ParseError(
        `Failed to parse: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
