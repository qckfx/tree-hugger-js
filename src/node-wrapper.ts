import { SyntaxNode } from 'tree-sitter';
import { NodeWrapper, NodePredicate } from './types';
import { PatternParser } from './pattern-parser';
import { visit, Visitor, VisitorFunction } from './visitor';
import { ParseError } from './errors';

export class TreeNode implements NodeWrapper {
  private _children?: TreeNode[];

  constructor(
    public node: SyntaxNode,
    public sourceCode: string,
    public parent?: TreeNode
  ) {
    // Defensive check for undefined node - addresses tree-sitter race condition in CI environments
    if (!node) {
      throw new ParseError(
        'TreeNode constructor received undefined SyntaxNode. This may be caused by a race condition in tree-sitter native bindings, commonly seen in CI environments with concurrent test execution.'
      );
    }

    // Validate that the node has required properties
    if (typeof node.type === 'undefined') {
      throw new ParseError(
        'TreeNode constructor received invalid SyntaxNode - missing type property. This indicates a problem with tree-sitter native binding initialization.'
      );
    }
  }

  get text(): string {
    return this.sourceCode.slice(this.node.startIndex, this.node.endIndex);
  }

  get type(): string {
    return this.node.type;
  }

  get startPosition() {
    return this.node.startPosition;
  }

  get endPosition() {
    return this.node.endPosition;
  }

  get children(): TreeNode[] {
    this._children ??= this.node.children.map(child => new TreeNode(child, this.sourceCode, this));
    return this._children;
  }

  get line(): number {
    return this.startPosition.row + 1;
  }

  get column(): number {
    return this.startPosition.column + 1;
  }

  get hasError(): boolean {
    return this.node.hasError;
  }

  get name(): string | undefined {
    const nameNode = this.node.childForFieldName('name');
    return nameNode ? this.sourceCode.slice(nameNode.startIndex, nameNode.endIndex) : undefined;
  }

  // Navigation methods
  find(pattern: string): TreeNode | null {
    const predicate = this.parsePattern(pattern);
    return this.findNode(predicate);
  }

  findAll(pattern: string): TreeNode[] {
    const predicate = this.parsePattern(pattern);
    return this.findAllNodes(predicate);
  }

  private findNode(predicate: NodePredicate): TreeNode | null {
    if (predicate(this)) return this;

    for (const child of this.children) {
      const result = child.findNode(predicate);
      if (result) return result;
    }

    return null;
  }

  private findAllNodes(predicate: NodePredicate): TreeNode[] {
    const results: TreeNode[] = [];

    if (predicate(this)) {
      results.push(this);
    }

    for (const child of this.children) {
      results.push(...child.findAllNodes(predicate));
    }

    return results;
  }

  private parsePattern(pattern: string): NodePredicate {
    try {
      return new PatternParser().parse(pattern);
    } catch {
      // Fallback to simple type matching for backward compatibility
      return (node: NodeWrapper) => node.type === pattern;
    }
  }

  // Common queries
  functions(): TreeNode[] {
    return this.findAll('function_declaration')
      .concat(this.findAll('function_expression'))
      .concat(this.findAll('arrow_function'));
  }

  classes(): TreeNode[] {
    return this.findAll('class_declaration').concat(this.findAll('class_expression'));
  }

  imports(): TreeNode[] {
    return this.findAll('import_statement');
  }

  variables(): TreeNode[] {
    return this.findAll('variable_declarator');
  }

  comments(): TreeNode[] {
    return this.findAll('comment');
  }

  // Export analysis
  exports(): TreeNode[] {
    return this.findAll('export_statement').concat(this.findAll('export_specifier'));
  }

  // JSX-specific helpers
  jsxComponents(): TreeNode[] {
    return this.findAll('jsx_element').concat(this.findAll('jsx_self_closing_element'));
  }

  jsxProps(componentName?: string): TreeNode[] {
    const components = componentName
      ? this.jsxComponents().filter(c => {
          const opening = c.find('jsx_opening_element');
          const name =
            opening?.find('identifier')?.text ?? opening?.find('member_expression')?.text;
          return name === componentName;
        })
      : this.jsxComponents();

    const props: TreeNode[] = [];
    components.forEach(component => {
      props.push(...component.findAll('jsx_attribute'));
    });
    return props;
  }

  // React hooks
  hooks(): TreeNode[] {
    return this.findAll('call_expression').filter(call => {
      const func = call.node.childForFieldName('function');
      return func && func.text.startsWith('use') && /^use[A-Z]/.test(func.text);
    });
  }

  // Parent/sibling navigation
  getParent(type?: string): TreeNode | null {
    let current = this.parent;
    while (current) {
      if (!type || current.type === type) return current;
      current = current.parent;
    }
    return null;
  }

  siblings(): TreeNode[] {
    if (!this.parent) return [];
    return this.parent.children.filter(child => child !== this);
  }

  ancestors(): TreeNode[] {
    const result: TreeNode[] = [];
    let current = this.parent;
    while (current) {
      result.push(current);
      current = current.parent;
    }
    return result;
  }

  descendants(type?: string): TreeNode[] {
    return type ? this.findAll(type) : this.getAllDescendants();
  }

  private getAllDescendants(): TreeNode[] {
    const result: TreeNode[] = [];
    for (const child of this.children) {
      result.push(child);
      result.push(...child.getAllDescendants());
    }
    return result;
  }

  // Visitor pattern support
  visit(visitor: Visitor | VisitorFunction): void {
    visit(this, visitor);
  }

  // Get path from this node to root
  getPath(): TreeNode[] {
    const path: TreeNode[] = [this];
    let current = this.parent;
    while (current) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  }

  // Find node at specific position
  nodeAt(line: number, column: number): TreeNode | null {
    const pos = { row: line - 1, column: column - 1 };

    if (
      this.startPosition.row > pos.row ||
      (this.startPosition.row === pos.row && this.startPosition.column > pos.column) ||
      this.endPosition.row < pos.row ||
      (this.endPosition.row === pos.row && this.endPosition.column < pos.column)
    ) {
      return null;
    }

    // Check children first (more specific)
    for (const child of this.children) {
      const found = child.nodeAt(line, column);
      if (found) return found;
    }

    // This node contains the position
    return this;
  }
}
