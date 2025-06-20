import { parse } from '../src';
import { LanguageError } from '../src/errors';
import { createTree, testCode } from './helpers/test-utils';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('parse function', () => {
  describe('language detection', () => {
    it('should auto-detect JavaScript from code content', () => {
      const tree = parse('const x = 42; console.log(x);');
      expect(tree.root.type).toBe('program');
      expect(tree.findAll('const').length).toBeGreaterThan(0);
    });

    it('should auto-detect TypeScript from type annotations', () => {
      const tree = parse('const x: number = 42;');
      expect(tree.root.type).toBe('program');
      expect(tree.findAll('type_annotation').length).toBeGreaterThan(0);
    });

    it('should auto-detect JSX from JSX elements', () => {
      const tree = parse('const el = <div>Hello</div>;');
      expect(tree.root.type).toBe('program');
      expect(tree.findAll('jsx_element').length).toBeGreaterThan(0);
    });

    it('should detect language from file extension', () => {
      const testFile = join(__dirname, 'test.ts');
      writeFileSync(testFile, 'const x: number = 42;');

      try {
        const tree = parse(testFile);
        expect(tree.findAll('type_annotation').length).toBeGreaterThan(0);
      } finally {
        unlinkSync(testFile);
      }
    });

    it('should throw LanguageError when language cannot be detected', () => {
      // Pass code that doesn't have obvious language markers
      expect(() => parse('$$$ unknown syntax $$$')).toThrow(LanguageError);

      // Should include helpful context
      expect(() => parse('hello world without code markers')).toThrow(/Could not detect language/);
    });

    it('should detect JavaScript from common patterns', () => {
      const patterns = [
        'var x = 1',
        'const y = 2',
        'let z = 3',
        'function test() {}',
        '() => {}',
        'console.log("test")',
      ];

      patterns.forEach(code => {
        const tree = parse(code);
        expect(tree.root.type).toBe('program');
      });
    });

    it('should detect TypeScript from type annotations', () => {
      const patterns = [
        'const x: number = 42',
        'let y: string = "hello"',
        'interface User { name: string }',
        'type ID = string | number',
        'function greet(name: string): void {}',
        'const arr: number[] = [1, 2, 3]',
      ];

      patterns.forEach(code => {
        const tree = parse(code);
        expect(tree.root.type).toBe('program');
        // Verify it actually parsed as TypeScript by checking for type annotations
        const hasTypeAnnotations =
          tree.findAll('type_annotation').length > 0 ||
          tree.findAll('interface_declaration').length > 0 ||
          tree.findAll('type_alias_declaration').length > 0;
        expect(hasTypeAnnotations).toBe(true);
      });
    });

    it('should throw LanguageError when explicitly requesting unknown language', () => {
      expect(() => parse('const x = 1', { language: 'unknown-language' })).toThrow(LanguageError);
    });

    it('should allow explicit language override', () => {
      const tree = parse('const x = 42', { language: 'typescript' });
      expect(tree.root.type).toBe('program');
    });
  });

  describe('parsing different languages', () => {
    it('should parse JavaScript', () => {
      const tree = createTree(testCode.functions.js, 'javascript');
      const functions = tree.functions();
      expect(functions).toHaveLength(3);
      expect(functions[0].name).toBe('greet');
    });

    it('should parse TypeScript', () => {
      const tree = createTree(testCode.functions.ts, 'typescript');
      const functions = tree.functions();
      expect(functions).toHaveLength(3);

      // Check for TypeScript-specific nodes
      expect(tree.findAll('type_annotation').length).toBeGreaterThan(0);
      expect(tree.findAll('type_parameters').length).toBeGreaterThan(0);
    });

    it('should parse JSX', () => {
      const tree = createTree(testCode.jsx.component, 'tsx');
      const components = tree.jsxComponents();
      expect(components.length).toBeGreaterThan(0);

      const buttons = components.filter(c => {
        const name = c.find('jsx_opening_element > identifier');
        return name?.text === 'Button';
      });
      expect(buttons).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle syntax errors gracefully', () => {
      const tree = createTree(testCode.withErrors.syntax);
      expect(tree.root.hasError).toBe(true);
    });

    it('should parse incomplete code', () => {
      const tree = createTree(testCode.withErrors.incomplete);
      expect(tree.root.type).toBe('program');
      // Tree-sitter can handle incomplete code
    });

    it('should handle empty input', () => {
      // Empty string doesn't have language markers, so should throw
      expect(() => parse('')).toThrow(LanguageError);

      // But with explicit language, it should work
      const tree = parse('', { language: 'javascript' });
      expect(tree.root.type).toBe('program');
      expect(tree.root.children).toHaveLength(0);
    });

    it('should handle very large input', () => {
      const largeCode = 'const x = 1;\n'.repeat(1000);
      const tree = parse(largeCode);
      expect(tree.findAll('const')).toHaveLength(1000);
    });
  });

  describe('file vs code parsing', () => {
    it('should parse from file path', () => {
      const testFile = join(__dirname, 'test-parse.js');
      writeFileSync(testFile, testCode.functions.js);

      try {
        const tree = parse(testFile);
        expect(tree.functions()).toHaveLength(3);
      } finally {
        unlinkSync(testFile);
      }
    });

    it('should handle non-existent file gracefully', () => {
      // When file doesn't exist, it treats the path as code
      const tree = parse('/non/existent/file.js');
      expect(tree.root.type).toBe('program');
    });

    it('should detect .mjs and .cjs extensions', () => {
      const mjsFile = join(__dirname, 'test.mjs');
      const cjsFile = join(__dirname, 'test.cjs');

      writeFileSync(mjsFile, 'export const x = 42;');
      writeFileSync(cjsFile, 'module.exports = { x: 42 };');

      try {
        const mjsTree = parse(mjsFile);
        const cjsTree = parse(cjsFile);

        expect(mjsTree.exports()).toHaveLength(1);
        expect(cjsTree.findAll('member_expression')).toHaveLength(1);
      } finally {
        unlinkSync(mjsFile);
        unlinkSync(cjsFile);
      }
    });
  });

  describe('unicode and special characters', () => {
    it('should handle unicode identifiers', () => {
      const tree = parse('const 你好 = "world"; const café = "coffee";');
      const variables = tree.variables();
      expect(variables).toHaveLength(2);
    });

    it('should handle emoji in strings', () => {
      const tree = parse('const emoji = "Hello 👋 World 🌍";');
      const strings = tree.findAll('string');
      expect(strings[0].text).toContain('👋');
    });

    it('should handle mixed line endings', () => {
      const code = 'const a = 1;\r\nconst b = 2;\nconst c = 3;\r\n';
      const tree = parse(code);
      expect(tree.variables()).toHaveLength(3);
    });
  });
});
