import { TreeNode } from './node-wrapper';
import { TransformError } from './errors';

export interface Edit {
  start: number;
  end: number;
  text: string;
}

export class Transform {
  private edits: Edit[] = [];
  private sourceCode: string;

  constructor(
    private root: TreeNode,
    sourceCode: string
  ) {
    this.sourceCode = sourceCode;
  }

  // Replace all occurrences of a specific identifier
  renameIdentifier(oldName: string, newName: string): Transform {
    const identifiers = this.root.findAll('identifier').filter(node => node.text === oldName);

    identifiers.forEach(node => {
      this.edits.push({
        start: node.node.startIndex,
        end: node.node.endIndex,
        text: newName,
      });
    });

    return this;
  }

  // Replace function/variable names intelligently (not in strings/comments)
  rename(oldName: string, newName: string): Transform {
    // Find all identifiers that match
    const nodes = this.root.descendants().filter(node => {
      // Check if it's an identifier and matches our name
      if (node.type === 'identifier' && node.text === oldName) {
        // Make sure it's not inside a string or comment
        let ancestor = node.parent;
        while (ancestor) {
          if (
            ancestor.type === 'string' ||
            ancestor.type === 'comment' ||
            ancestor.type === 'string_fragment' || // Template literal text content
            ancestor.type === 'regex'
          ) {
            return false;
          }
          ancestor = ancestor.parent;
        }
        return true;
      }

      // Also check property identifiers (e.g., obj.method)
      if (node.type === 'property_identifier' && node.text === oldName) {
        return true;
      }

      // Also check shorthand property patterns in destructuring
      if (node.type === 'shorthand_property_identifier_pattern' && node.text === oldName) {
        return true;
      }

      return false;
    });

    nodes.forEach(node => {
      this.edits.push({
        start: node.node.startIndex,
        end: node.node.endIndex,
        text: newName,
      });
    });

    return this;
  }

  // Replace text in specific node types
  replaceIn(nodeType: string, pattern: string | RegExp, replacement: string): Transform {
    const nodes = this.root.findAll(nodeType);

    nodes.forEach(node => {
      const newText = node.text.replace(pattern, replacement);
      if (newText !== node.text) {
        this.edits.push({
          start: node.node.startIndex,
          end: node.node.endIndex,
          text: newText,
        });
      }
    });

    return this;
  }

  // Remove nodes matching a pattern
  remove(pattern: string): Transform {
    // Handle common text patterns by converting to proper selectors
    let actualPattern = pattern;

    // If pattern looks like a method call (contains dot), convert to call_expression search
    if (pattern.includes('.') && !pattern.includes('[') && !pattern.includes(' ')) {
      actualPattern = `call_expression[text*="${pattern}"]`;
    }
    // If pattern looks like a function call (ends with parentheses), search for it
    else if (pattern.endsWith('()')) {
      const funcName = pattern.slice(0, -2);
      actualPattern = `call_expression[text*="${funcName}("]`;
    }

    const nodes = this.root.findAll(actualPattern);

    nodes.forEach(node => {
      // For statements, remove the entire line including newline
      let start = node.node.startIndex;
      let end = node.node.endIndex;
      let nodeToRemove = node;

      // Special case: if removing a variable_declarator that's the only one
      // in its declaration, remove the whole declaration
      if (node.type === 'variable_declarator' && node.parent) {
        const declaration = node.parent;
        const declarators = declaration.findAll('variable_declarator');
        if (declarators.length === 1) {
          // Remove the entire declaration instead
          nodeToRemove = declaration;
          start = declaration.node.startIndex;
          end = declaration.node.endIndex;
        }
      }

      // Check if we should remove the whole line
      if (this.isStatement(nodeToRemove)) {
        // Find start of line
        while (start > 0 && this.sourceCode[start - 1] !== '\n') {
          start--;
        }
        // Find end of line including newline
        while (end < this.sourceCode.length && this.sourceCode[end] !== '\n') {
          end++;
        }
        if (end < this.sourceCode.length && this.sourceCode[end] === '\n') {
          end++;
        }
      }

      this.edits.push({
        start,
        end,
        text: '',
      });
    });

    return this;
  }

  // Remove unused imports
  removeUnusedImports(): Transform {
    const imports = this.root.findAll('import_statement');

    // Get all identifiers except those in import statements
    const allIdentifiers = new Set(
      this.root
        .findAll('identifier')
        .filter(id => {
          // Check if this identifier is part of an import statement
          let parent = id.parent;
          while (parent) {
            if (parent.type === 'import_statement') {
              return false;
            }
            parent = parent.parent;
          }
          return true;
        })
        .map(n => n.text)
    );

    imports.forEach(importNode => {
      let hasUsedImport = false;

      // Check default import
      const defaultImport = importNode.find('import_clause > identifier');
      if (defaultImport && allIdentifiers.has(defaultImport.text)) {
        hasUsedImport = true;
      }

      // Check named imports
      const namedImports = importNode.findAll('import_specifier');
      namedImports.forEach(spec => {
        const imported =
          spec.node.childForFieldName('name') ?? spec.node.childForFieldName('alias');
        if (
          imported &&
          allIdentifiers.has(this.sourceCode.slice(imported.startIndex, imported.endIndex))
        ) {
          hasUsedImport = true;
        }
      });

      // Check namespace import
      const namespaceImport = importNode.find('namespace_import > identifier');
      if (namespaceImport && allIdentifiers.has(namespaceImport.text)) {
        hasUsedImport = true;
      }

      if (!hasUsedImport) {
        // Remove this specific import statement
        const start = importNode.node.startIndex;
        let end = importNode.node.endIndex;

        // Include the newline after the import
        if (end < this.sourceCode.length && this.sourceCode[end] === '\n') {
          end++;
        }

        this.edits.push({
          start,
          end,
          text: '',
        });
      }
    });

    return this;
  }

  // Insert text before/after nodes
  insertBefore(pattern: string, text: string): Transform {
    const nodes = this.root.findAll(pattern);
    nodes.forEach(node => {
      this.edits.push({
        start: node.node.startIndex,
        end: node.node.startIndex,
        text: text,
      });
    });
    return this;
  }

  insertAfter(pattern: string, text: string): Transform {
    const nodes = this.root.findAll(pattern);
    nodes.forEach(node => {
      let targetNode = node;

      // For keywords, find the parent statement to insert after
      const keywordTypes = ['const', 'let', 'var', 'return', 'if', 'for', 'while'];
      if (keywordTypes.includes(node.type)) {
        // Find the containing statement
        let parent = node.parent;
        while (parent && !this.isStatement(parent)) {
          parent = parent.parent;
        }
        if (parent) {
          targetNode = parent;
        }
      }

      this.edits.push({
        start: targetNode.node.endIndex,
        end: targetNode.node.endIndex,
        text: text,
      });
    });
    return this;
  }

  // Apply all edits and return the transformed code
  toString(): string {
    // Validate edits first
    this.validateEdits();

    // Sort edits by position (reverse order to apply from end to start)
    const sortedEdits = [...this.edits].sort((a, b) => b.start - a.start);

    let result = this.sourceCode;

    // Apply each edit
    sortedEdits.forEach(edit => {
      if (edit.start < 0 || edit.end > this.sourceCode.length) {
        throw new TransformError(
          `Edit out of bounds: ${edit.start}-${edit.end} in source of length ${this.sourceCode.length}`,
          edit
        );
      }
      result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    });

    return result;
  }

  private validateEdits(): void {
    // Check for overlapping edits
    const sortedEdits = [...this.edits].sort((a, b) => a.start - b.start);

    for (let i = 0; i < sortedEdits.length - 1; i++) {
      const current = sortedEdits[i];
      const next = sortedEdits[i + 1];

      if (current.end > next.start) {
        throw new TransformError(
          `Overlapping edits detected: [${current.start}-${current.end}] overlaps with [${next.start}-${next.end}]`,
          { current, next }
        );
      }
    }
  }

  // Get the edits without applying them
  getEdits(): Edit[] {
    return [...this.edits];
  }

  private isStatement(node: TreeNode): boolean {
    const statementTypes = [
      'expression_statement',
      'variable_declaration',
      'lexical_declaration',
      'import_statement',
      'export_statement',
      'return_statement',
      'if_statement',
      'for_statement',
      'while_statement',
      'function_declaration',
      'class_declaration',
    ];

    return statementTypes.includes(node.type);
  }
}
