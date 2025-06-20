import { createTree, testCode, expectTransform } from './helpers/test-utils';
import { TransformError } from '../src/errors';

describe('Transform', () => {
  describe('rename operations', () => {
    it('should rename identifiers', () => {
      expectTransform(
        'const oldName = 42; console.log(oldName);',
        tree => tree.transform().renameIdentifier('oldName', 'newName').toString(),
        'const newName = 42; console.log(newName);'
      );
    });

    it('should rename functions intelligently', () => {
      const code = `
function getData() { return data; }
const result = getData();
// getData is mentioned in a comment
const str = "getData should not change";
`;

      const tree = createTree(code);
      const result = tree.transform().rename('getData', 'fetchData').toString();

      expect(result).toContain('function fetchData()');
      expect(result).toContain('= fetchData()');
      expect(result).toContain('// getData is mentioned'); // Comments unchanged
      expect(result).toContain('"getData should not change"'); // Strings unchanged
    });

    it('should rename properties', () => {
      const code = 'const obj = { oldProp: 1 }; obj.oldProp = 2;';
      const tree = createTree(code);
      const result = tree.transform().rename('oldProp', 'newProp').toString();

      expect(result).toContain('{ newProp: 1 }');
      expect(result).toContain('obj.newProp = 2');
    });

    it('should rename variables in template literal expressions but not in string content', () => {
      const code = 'const name = "test"; const msg = `Hello ${name}`; const str = `name is name`;';
      const tree = createTree(code);
      const result = tree.transform().rename('name', 'userName').toString();

      expect(result).toContain('const userName = "test"');
      expect(result).toContain('`Hello ${userName}`'); // Variable renamed
      expect(result).toContain('`name is name`'); // String content unchanged
    });
  });

  describe('replaceIn operations', () => {
    it('should replace patterns in specific node types', () => {
      const code = 'const msg = "Hello World"; console.log("Hello World");';
      const tree = createTree(code);
      const result = tree.transform().replaceIn('string', /Hello/g, 'Hi').toString();

      expect(result).toContain('"Hi World"');
      expect(result.match(/Hi World/g)).toHaveLength(2);
    });

    it('should handle regex replacements', () => {
      const code = 'const url = "http://localhost:3000/api";';
      const tree = createTree(code);
      const result = tree
        .transform()
        .replaceIn('string', /localhost:\d+/g, 'api.example.com')
        .toString();

      expect(result).toContain('"http://api.example.com/api"');
    });
  });

  describe('remove operations', () => {
    it('should remove nodes by pattern', () => {
      const code = `
console.log("debug 1");
const x = 42;
console.log("debug 2");
const y = 24;
`;
      const tree = createTree(code);
      const result = tree.transform().remove('call_expression').toString();

      expect(result).not.toContain('console.log');
      expect(result).toContain('const x = 42');
      expect(result).toContain('const y = 24');
    });

    it('should remove entire lines for statements', () => {
      const code = `
const a = 1;
const b = 2;
const c = 3;`;
      const tree = createTree(code);

      // Find the second const statement
      const consts = tree.findAll('const');
      expect(consts).toHaveLength(3);

      // Remove by finding specific variable
      const result = tree.transform().remove('variable_declarator[name="b"]').toString().trim();

      const lines = result.split('\n').filter(l => l.trim());
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('const a = 1');
      expect(lines[1]).toContain('const c = 3');
    });
  });

  describe('removeUnusedImports', () => {
    it('should remove completely unused imports', () => {
      const tree = createTree(testCode.imports.withUnused);
      const result = tree.transform().removeUnusedImports().toString();

      expect(result).toContain("import React from 'react'");
      expect(result).toContain('import { useState, useEffect }');
      expect(result).toContain('import axios');
      expect(result).not.toContain("import _ from 'lodash'"); // Unused import removed
    });

    it('should keep all used imports', () => {
      const tree = createTree(testCode.imports.allUsed);
      const result = tree.transform().removeUnusedImports().toString();

      expect(result).toContain("import React from 'react'");
      expect(result).toContain('import { useState }');
    });

    it('should handle default imports', () => {
      const code = `
import DefaultExport from './module';
import { named } from './other';
const x = DefaultExport;
`;
      const tree = createTree(code);
      const result = tree.transform().removeUnusedImports().toString();

      expect(result).toContain('import DefaultExport');
      expect(result).not.toContain('import { named }'); // Unused
    });

    it('should handle namespace imports', () => {
      const code = `
import * as utils from './utils';
import * as unused from './unused';
console.log(utils.helper());
`;
      const tree = createTree(code);
      const result = tree.transform().removeUnusedImports().toString();

      expect(result).toContain('import * as utils');
      expect(result).not.toContain('import * as unused');
    });
  });

  describe('insert operations', () => {
    it('should insert before nodes', () => {
      const code = 'function test() { return 42; }';
      const tree = createTree(code);
      const result = tree
        .transform()
        .insertBefore('return_statement', 'console.log("returning"); ')
        .toString();

      expect(result).toContain('console.log("returning"); return 42');
    });

    it('should insert after nodes', () => {
      const code = 'const x = 42;';
      const tree = createTree(code);
      const result = tree.transform().insertAfter('const', ' console.log(x);').toString();

      expect(result).toContain('const x = 42; console.log(x);');
    });

    it('should handle multiple insertions', () => {
      const code = 'function a() {} function b() {}';
      const tree = createTree(code);
      const result = tree
        .transform()
        .insertBefore('function_declaration', '// Function: ')
        .toString();

      expect(result.match(/\/\/ Function:/g)).toHaveLength(2);
    });
  });

  describe('chained transformations', () => {
    it('should apply multiple transformations in order', () => {
      const code = `
function getData() {
  console.log("Getting data");
  return fetch('/api/data');
}
`;
      const tree = createTree(code);
      const result = tree
        .transform()
        .rename('getData', 'fetchData')
        .replaceIn('string', '/api/data', '/v2/api/data')
        .remove('console.log')
        .toString();

      expect(result).toContain('function fetchData()');
      expect(result).toContain('/v2/api/data');
      expect(result).not.toContain('console.log');
    });
  });

  describe('validation and error handling', () => {
    it('should detect overlapping edits', () => {
      const tree = createTree('const x = 42;');
      const transform = tree.transform();

      // Create overlapping edits by direct manipulation
      (transform as any).edits = [
        { start: 0, end: 10, text: 'let' },
        { start: 5, end: 15, text: 'var' },
      ];

      expect(() => transform.toString()).toThrow(TransformError);
    });

    it('should validate edit bounds', () => {
      const tree = createTree('const x = 42;');
      const transform = tree.transform();

      // Create out-of-bounds edit
      (transform as any).edits = [{ start: -1, end: 10, text: 'let' }];

      expect(() => transform.toString()).toThrow(TransformError);
    });

    it('should handle empty transformations', () => {
      const code = 'const x = 42;';
      const tree = createTree(code);
      const result = tree.transform().toString();

      expect(result).toBe(code);
    });
  });

  describe('unicode and special characters', () => {
    it('should handle unicode in transformations', () => {
      const code = 'const 你好 = "世界"; console.log(你好);';
      const tree = createTree(code);
      const result = tree.transform().rename('你好', 'hello').toString();

      expect(result).toContain('const hello = "世界"');
      expect(result).toContain('console.log(hello)');
    });

    it('should preserve emoji in transformations', () => {
      const code = 'const msg = "Hello 👋 World 🌍";';
      const tree = createTree(code);
      const result = tree.transform().replaceIn('string', 'Hello', 'Hi').toString();

      expect(result).toContain('"Hi 👋 World 🌍"');
    });
  });

  describe('real-world scenarios', () => {
    it('should refactor import statements', () => {
      const code = `
import { oldFunction } from './old-module';
import { helperA, helperB } from './helpers';

const result = oldFunction(helperA());
`;
      const tree = createTree(code);
      const result = tree
        .transform()
        .rename('oldFunction', 'newFunction')
        .replaceIn('string', './old-module', './new-module')
        .toString();

      expect(result).toContain("from './new-module'");
      expect(result).toContain('newFunction(helperA())');
    });

    it('should update React component props', () => {
      const code = `
const Button = ({ color, size, onClick }) => (
  <button className={\`btn btn-\${color} btn-\${size}\`} onClick={onClick}>
    Click me
  </button>
);

<Button color="primary" size="large" onClick={handleClick} />
`;
      const tree = createTree(code, 'tsx');
      const result = tree.transform().rename('color', 'variant').toString();

      expect(result).toContain('{ variant, size, onClick }');
      expect(result).toContain('btn-${variant}');
      expect(result).toContain('variant="primary"');
    });
  });
});
