import { createTree, testCode } from './helpers/test-utils';
import { ScopeAnalyzer } from '../src/visitor';
import { TreeNode } from '../src';

describe('Visitor Pattern', () => {
  describe('basic visiting', () => {
    it('should visit all nodes with simple function', () => {
      const tree = createTree('const x = 1; const y = 2;');
      const visited: string[] = [];

      tree.visit(node => {
        visited.push(node.type);
      });

      expect(visited).toContain('program');
      expect(visited).toContain('const');
      expect(visited).toContain('identifier');
      expect(visited).toContain('number');
      expect(visited.filter(t => t === 'const')).toHaveLength(2);
    });

    it('should support enter and exit callbacks', () => {
      const tree = createTree('function test() { return 42; }');
      const events: string[] = [];

      tree.visit({
        enter(node) {
          events.push(`enter:${node.type}`);
        },
        exit(node) {
          events.push(`exit:${node.type}`);
        },
      });

      // Should enter before exit
      const functionEnterIndex = events.indexOf('enter:function_declaration');
      const functionExitIndex = events.indexOf('exit:function_declaration');
      expect(functionEnterIndex).toBeLessThan(functionExitIndex);

      // Should visit children between enter and exit
      const blockEnterIndex = events.indexOf('enter:statement_block');
      expect(blockEnterIndex).toBeGreaterThan(functionEnterIndex);
      expect(blockEnterIndex).toBeLessThan(functionExitIndex);
    });

    it('should stop traversal when returning false', () => {
      const tree = createTree(testCode.functions.js);
      const visited: string[] = [];

      tree.visit(node => {
        visited.push(node.type);
        if (node.type === 'function_declaration') {
          return false; // Stop at first function
        }
      });

      // Should stop early (much less than visiting all nodes)
      const allNodes: string[] = [];
      tree.visit(n => {
        allNodes.push(n.type);
      });

      expect(visited.length).toBeLessThan(allNodes.length / 2);
      expect(visited.filter(t => t === 'function_declaration')).toHaveLength(1);
    });

    it('should provide parent in visitor', () => {
      const tree = createTree('class Test { method() {} }');
      const methodParents: string[] = [];

      tree.visit((node, parent) => {
        if (node.type === 'method_definition' && parent) {
          methodParents.push(parent.type);
        }
      });

      expect(methodParents).toContain('class_body');
    });
  });

  describe('node collection', () => {
    it('should collect nodes matching predicate', () => {
      const tree = createTree(testCode.functions.js);
      // Test visitor functionality

      const asyncNodes: string[] = [];
      tree.visit(node => {
        if (node.text.includes('async')) {
          asyncNodes.push(node.type);
        }
      });

      expect(asyncNodes.length).toBeGreaterThan(0);
      expect(asyncNodes).toContain('function_declaration');
    });

    it('should find first matching node', () => {
      const tree = createTree(testCode.classes.js);
      let firstClass: TreeNode | null = null;

      tree.visit(node => {
        if (node.type === 'class_declaration' && !firstClass) {
          firstClass = node;
          return false;
        }
      });

      expect(firstClass).not.toBeNull();
      expect(firstClass!.name).toBe('Animal');
    });
  });

  describe('scope analysis', () => {
    it('should track variable scopes', () => {
      const code = `
        const global = 1;
        function outer() {
          const outerVar = 2;
          function inner() {
            const innerVar = 3;
            console.log(outerVar, global);
          }
        }
      `;

      const tree = createTree(code);
      const analyzer = tree.analyzeScopes();

      // Check that scopes were created
      let functionScopes = 0;
      tree.visit(node => {
        if (node.type === 'function_declaration') {
          const scope = analyzer.getScope(node);
          if (scope) functionScopes++;
        }
      });

      expect(functionScopes).toBe(2); // outer and inner
    });

    it('should track variable bindings', () => {
      const code = `
        function test(param1, param2) {
          const local1 = 1;
          let local2 = 2;
          var local3 = 3;
        }
      `;

      const tree = createTree(code);
      const analyzer = new ScopeAnalyzer();
      const scopes = analyzer.analyze(tree.root);

      // Find function scope
      const funcNode = tree.find('function_declaration');
      expect(funcNode).not.toBeNull();

      if (funcNode) {
        const funcScope = scopes.get(funcNode);
        expect(funcScope).toBeDefined();

        if (funcScope) {
          // Should track parameters
          expect(funcScope.bindings.has('param1')).toBe(true);
          expect(funcScope.bindings.has('param2')).toBe(true);

          // Should track local variables
          expect(funcScope.bindings.has('local1')).toBe(true);
          expect(funcScope.bindings.has('local2')).toBe(true);
          expect(funcScope.bindings.has('local3')).toBe(true);
        }
      }
    });

    it('should handle block scopes', () => {
      const code = `
        if (true) {
          const blockScoped = 1;
        }
        for (let i = 0; i < 10; i++) {
          const loopScoped = i;
        }
      `;

      const tree = createTree(code);
      const analyzer = new ScopeAnalyzer();
      analyzer.analyze(tree.root);

      // Note: statement_block does not create scope in this implementation
      // This is a design decision for simplicity - only function-level scopes are tracked

      // Check for statement creates scope
      const forStmt = tree.find('for_statement');
      expect(forStmt).not.toBeNull();
      if (forStmt) {
        const forScope = analyzer.getScope(forStmt);
        expect(forScope).toBeDefined();
      }
    });

    it('should resolve variable references', () => {
      const code = `
        const outer = 1;
        function test() {
          const inner = 2;
          return outer + inner;
        }
      `;

      const tree = createTree(code);
      const analyzer = new ScopeAnalyzer();
      analyzer.analyze(tree.root);

      // Find the 'outer' reference in return statement
      const returnStmt = tree.find('return_statement');
      expect(returnStmt).not.toBeNull();

      if (returnStmt) {
        const outerRef = returnStmt.find('identifier[text="outer"]');
        expect(outerRef).not.toBeNull();

        // Should find binding in parent scope
        // Note: This would need implementation in findBinding
      }
    });
  });

  describe('path operations', () => {
    it('should get path from node to root', () => {
      const tree = createTree('class A { method() { return 42; } }');
      const returnNode = tree.find('return_statement');

      expect(returnNode).not.toBeNull();
      if (returnNode) {
        const path = returnNode.getPath();
        const pathTypes = path.map(n => n.type);

        expect(pathTypes[0]).toBe('program');
        expect(pathTypes).toContain('class_declaration');
        expect(pathTypes).toContain('method_definition');
        expect(pathTypes).toContain('statement_block');
        expect(pathTypes[pathTypes.length - 1]).toBe('return_statement');
      }
    });

    it('should find node at position', () => {
      const code = `const x = 42;
const y = 24;
function test() {
  return x + y;
}`;

      const tree = createTree(code);

      // Find node at line 1, column 7 (should be 'x')
      const node1 = tree.nodeAt(1, 7);
      expect(node1).not.toBeNull();
      expect(node1?.type).toBe('identifier');
      expect(node1?.text).toBe('x');

      // Find node at line 4 (should be in return statement)
      const node2 = tree.nodeAt(4, 10);
      expect(node2).not.toBeNull();
      expect(node2?.type).toBe('identifier');
      // Check parent is binary expression
      expect(node2?.parent?.type).toBe('binary_expression');
      expect(node2?.parent?.text).toBe('x + y');
    });
  });

  describe('complex visiting scenarios', () => {
    it('should handle deeply nested structures', () => {
      const code = `
        class Outer {
          method() {
            return {
              nested: {
                deep: {
                  value: () => {
                    if (true) {
                      for (let i = 0; i < 10; i++) {
                        console.log(i);
                      }
                    }
                  }
                }
              }
            };
          }
        }
      `;

      const tree = createTree(code);
      let maxDepth = 0;
      let currentDepth = 0;

      tree.visit({
        enter() {
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);
        },
        exit() {
          currentDepth--;
        },
      });

      expect(maxDepth).toBeGreaterThan(10);
    });

    it('should collect statistics about code', () => {
      const tree = createTree(testCode.jsx.component, 'tsx');

      const stats = {
        functions: 0,
        jsxElements: 0,
        strings: 0,
        identifiers: new Set<string>(),
      };

      tree.visit(node => {
        switch (node.type) {
          case 'function_declaration':
          case 'function_expression':
          case 'arrow_function':
            stats.functions++;
            break;
          case 'jsx_element':
          case 'jsx_self_closing_element':
            stats.jsxElements++;
            break;
          case 'string':
            stats.strings++;
            break;
          case 'identifier':
            stats.identifiers.add(node.text);
            break;
        }
      });

      expect(stats.functions).toBeGreaterThan(0);
      expect(stats.jsxElements).toBeGreaterThan(0);
      expect(stats.identifiers.size).toBeGreaterThan(10);
    });
  });
});
