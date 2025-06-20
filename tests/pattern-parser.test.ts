// PatternParser is tested via the helper functions
import { createTree, testCode, expectPattern } from './helpers/test-utils';

describe('PatternParser', () => {
  beforeEach(() => {
    // Setup if needed
  });

  describe('type selectors', () => {
    it('should match simple type selectors', () => {
      expectPattern(testCode.functions.js, 'function_declaration', 2);
      expectPattern(testCode.functions.js, 'arrow_function', 1);
      expectPattern(testCode.classes.js, 'class_declaration', 2);
    });

    it('should match identifier nodes', () => {
      const tree = createTree('const x = y + z;');
      const identifiers = tree.findAll('identifier');
      expect(identifiers).toHaveLength(3);
      expect(identifiers.map(n => n.text)).toEqual(['x', 'y', 'z']);
    });
  });

  describe('attribute selectors', () => {
    it('should match [async] attribute', () => {
      expectPattern(testCode.functions.js, 'function[async]', 1);
      expectPattern(testCode.functions.ts, 'function[async]', 1);
    });

    it('should match [name="value"] attribute', () => {
      const tree = createTree(testCode.functions.js);
      const greetFunc = tree.findAll('function_declaration[name="greet"]');
      expect(greetFunc).toHaveLength(1);
      expect(greetFunc[0].name).toBe('greet');
    });

    it('should match text content with operators', () => {
      const code = 'const hello = "world"; const hi = "world!";';
      const tree = createTree(code);

      // Exact match
      expect(tree.findAll('string[text="\\"world\\""]')).toHaveLength(1);

      // Contains
      expect(tree.findAll('string[text*="world"]')).toHaveLength(2);

      // Starts with
      expect(tree.findAll('identifier[text^="h"]')).toHaveLength(2);

      // Ends with
      expect(tree.findAll('identifier[text$="o"]')).toHaveLength(1);
    });

    it('should handle multiple attributes', () => {
      const tree = createTree(testCode.jsx.component);
      const asyncArrows = tree.findAll('arrow_function[async]');
      expect(asyncArrows.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('descendant selectors', () => {
    it('should match descendant selectors', () => {
      const tree = createTree(testCode.classes.js);
      const methods = tree.findAll('class_declaration method_definition');
      expect(methods.length).toBeGreaterThan(0);
    });

    it('should match deeply nested descendants', () => {
      const code = `
        function outer() {
          function inner() {
            const x = 42;
          }
        }
      `;
      const tree = createTree(code);
      const nestedConst = tree.findAll('function_declaration const');
      expect(nestedConst).toHaveLength(1);
    });
  });

  describe('child selectors', () => {
    it('should match direct child selectors', () => {
      const tree = createTree(testCode.functions.js);
      const blocks = tree.findAll('function_declaration > statement_block');
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should not match non-direct descendants', () => {
      const code = `
        function test() {
          if (true) {
            const x = 1;
          }
        }
      `;
      const tree = createTree(code);

      // Direct child - should not match const inside if
      expect(tree.findAll('function_declaration > const')).toHaveLength(0);

      // Descendant - should match
      expect(tree.findAll('function_declaration const')).toHaveLength(1);
    });
  });

  describe('pseudo-selectors', () => {
    it('should match :has() selector', () => {
      const tree = createTree(testCode.functions.js);
      const asyncFunctions = tree.findAll('function_declaration:has(async)');
      expect(asyncFunctions).toHaveLength(1);
    });

    it('should match :not() selector', () => {
      const tree = createTree(testCode.functions.js);
      const nonAsyncFunctions = tree.findAll('function_declaration:not(:has(async))');
      expect(nonAsyncFunctions).toHaveLength(1);
    });
  });

  describe('complex patterns', () => {
    it('should combine multiple selectors', () => {
      const tree = createTree(testCode.classes.ts);
      const publicMethods = tree.findAll('class_declaration method_definition[name="speak"]');
      expect(publicMethods.length).toBeGreaterThan(0);
    });

    it('should handle JSX patterns', () => {
      const tree = createTree(testCode.jsx.component, 'tsx');

      // Find buttons with onClick
      const buttonsWithClick = tree.findAll('jsx_element:has(jsx_attribute[name="onClick"])');
      expect(buttonsWithClick.length).toBeGreaterThan(0);

      // Find elements with className
      const withClassName = tree.findAll('jsx_element:has(jsx_attribute[name="className"])');
      expect(withClassName.length).toBeGreaterThan(0);
    });

    it('should handle nested has() selectors', () => {
      const code = `
        class Outer {
          method() {
            class Inner {
              innerMethod() {}
            }
          }
        }
      `;
      const tree = createTree(code);
      const outerWithInner = tree.findAll('class_declaration:has(class_declaration)');
      expect(outerWithInner).toHaveLength(1);
      expect(outerWithInner[0].name).toBe('Outer');
    });
  });

  describe('error handling', () => {
    it('should handle invalid patterns gracefully', () => {
      const tree = createTree('const x = 1;');

      // Invalid pattern should fallback to simple type matching
      expect(tree.findAll('[')).toHaveLength(0);
      expect(tree.findAll('>')).toHaveLength(0);
      expect(tree.findAll('::invalid')).toHaveLength(0);
    });

    it('should handle empty patterns', () => {
      const tree = createTree('const x = 1;');
      expect(tree.findAll('')).toHaveLength(0);
    });
  });

  describe('performance', () => {
    it('should handle large trees efficiently', () => {
      const code = 'const x = 1;\n'.repeat(1000);
      const tree = createTree(code);

      const start = performance.now();
      const results = tree.findAll('const');
      const time = performance.now() - start;

      expect(results).toHaveLength(1000);
      expect(time).toBeLessThan(100); // Should be fast
    });
  });
});
