import { TreeNode } from './node-wrapper';

export type VisitorFunction = (node: TreeNode, parent?: TreeNode) => void | boolean;

export interface Visitor {
  enter?: VisitorFunction;
  exit?: VisitorFunction;
}

export class TreeVisitor {
  visit(node: TreeNode, visitor: Visitor | VisitorFunction): void {
    // Handle simple function visitor
    if (typeof visitor === 'function') {
      visitor = { enter: visitor };
    }

    this.visitNode(node, visitor, undefined);
  }

  private visitNode(node: TreeNode, visitor: Visitor, parent?: TreeNode): boolean {
    // Call enter visitor
    if (visitor.enter) {
      const result = visitor.enter(node, parent);
      // If visitor returns false, stop entire traversal
      if (result === false) {
        return false;
      }
    }

    // Visit children
    for (const child of node.children) {
      const shouldContinue = this.visitNode(child, visitor, node);
      if (!shouldContinue) {
        return false;
      }
    }

    // Call exit visitor
    if (visitor.exit) {
      const result = visitor.exit(node, parent);
      if (result === false) {
        return false;
      }
    }

    return true;
  }

  // Utility method to collect nodes matching a condition
  collect(node: TreeNode, predicate: (node: TreeNode) => boolean): TreeNode[] {
    const results: TreeNode[] = [];

    this.visit(node, n => {
      if (predicate(n)) {
        results.push(n);
      }
    });

    return results;
  }

  // Find the first node matching a condition
  findFirst(node: TreeNode, predicate: (node: TreeNode) => boolean): TreeNode | null {
    let result: TreeNode | null = null;

    this.visit(node, n => {
      if (predicate(n)) {
        result = n;
        return false; // Stop traversal
      }
    });

    return result;
  }

  // Get the path from root to a specific node
  getPath(root: TreeNode, target: TreeNode): TreeNode[] {
    const path: TreeNode[] = [];
    let found = false;

    const traverse = (node: TreeNode, currentPath: TreeNode[]): boolean => {
      currentPath.push(node);

      if (node === target) {
        path.push(...currentPath);
        found = true;
        return false;
      }

      for (const child of node.children) {
        if (!traverse(child, currentPath)) {
          return false;
        }
      }

      currentPath.pop();
      return true;
    };

    traverse(root, []);
    return found ? path : [];
  }
}

// Convenience function for visiting
export function visit(node: TreeNode, visitor: Visitor | VisitorFunction): void {
  new TreeVisitor().visit(node, visitor);
}

// Scope tracking visitor
export interface Scope {
  node: TreeNode;
  bindings: Map<string, TreeNode>;
  parent?: Scope;
}

export class ScopeAnalyzer {
  private scopes = new Map<TreeNode, Scope>();
  private currentScope: Scope | null = null;

  analyze(root: TreeNode): Map<TreeNode, Scope> {
    this.scopes.clear();

    // Create root scope
    const rootScope: Scope = {
      node: root,
      bindings: new Map(),
      parent: undefined,
    };
    this.scopes.set(root, rootScope);
    this.currentScope = rootScope;

    visit(root, {
      enter: node => {
        if (this.createsScope(node)) {
          const scope: Scope = {
            node,
            bindings: new Map(),
            parent: this.currentScope ?? undefined,
          };
          this.scopes.set(node, scope);
          this.currentScope = scope;
        }

        // Track variable declarations
        if (node.type === 'variable_declarator') {
          const name = node.name;
          if (name && this.currentScope) {
            this.currentScope.bindings.set(name, node);
          }
        }

        // Track function parameters
        if (node.type === 'formal_parameters' && this.currentScope) {
          // Look for parameter nodes which might be identifiers or patterns
          const params = node.findAll('identifier');
          params.forEach(param => {
            if (param.text) {
              this.currentScope?.bindings.set(param.text, param);
            }
          });
        }
      },
      exit: node => {
        if (this.createsScope(node) && this.currentScope) {
          this.currentScope = this.currentScope.parent ?? null;
        }
      },
    });

    return this.scopes;
  }

  private createsScope(node: TreeNode): boolean {
    return [
      'function_declaration',
      'function_expression',
      'arrow_function',
      'method_definition',
      'class_declaration',
      'class_expression',
      'for_statement',
      'for_in_statement',
      'for_of_statement',
      'catch_clause',
    ].includes(node.type);
  }

  getScope(node: TreeNode): Scope | undefined {
    return this.scopes.get(node);
  }

  findBinding(node: TreeNode, name: string): TreeNode | null {
    let current = node;

    while (current) {
      const scope = this.scopes.get(current);
      if (scope?.bindings.has(name)) {
        return scope.bindings.get(name) ?? null;
      }

      // Move up to parent scope
      if (!current.parent) break;
      current = current.parent;
    }

    return null;
  }
}
