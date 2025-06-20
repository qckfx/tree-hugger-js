// Jest setup file - can be used for global test configuration

// Extend Jest matchers if needed
export {};
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Matchers<R> {
    // Add custom matchers here if needed
  }
}

// Setup to handle tree-sitter race conditions in CI environments
// This addresses the known issue documented in tree-sitter/node-tree-sitter#181

// Pre-load tree-sitter module to prevent race conditions during concurrent test execution
let treeSitterPreloaded = false;

beforeAll(() => {
  if (!treeSitterPreloaded) {
    // Pre-load tree-sitter and language parsers to avoid race conditions
    try {
      const Parser = require('tree-sitter');
      const JavaScript = require('tree-sitter-javascript');
      const TypeScript = require('tree-sitter-typescript').typescript;
      const TSX = require('tree-sitter-typescript').tsx;

      // Initialize parsers for all supported languages to ensure native bindings are stable
      const jsParser = new Parser();
      jsParser.setLanguage(JavaScript);

      const tsParser = new Parser();
      tsParser.setLanguage(TypeScript);

      const tsxParser = new Parser();
      tsxParser.setLanguage(TSX);

      // Parse minimal code samples to warm up all native modules
      const jsTree = jsParser.parse('const x = 1;');
      const tsTree = tsParser.parse('const x: number = 1;');
      const tsxTree = tsxParser.parse('const el = <div>Hello</div>;');

      // Verify rootNodes are accessible to catch initialization issues early
      if (
        !jsTree.rootNode ||
        typeof jsTree.rootNode.type === 'undefined' ||
        !tsTree.rootNode ||
        typeof tsTree.rootNode.type === 'undefined' ||
        !tsxTree.rootNode ||
        typeof tsxTree.rootNode.type === 'undefined'
      ) {
        console.warn('Warning: tree-sitter rootNode initialization issue detected during setup');
      }

      treeSitterPreloaded = true;
    } catch (error) {
      console.error('Failed to pre-load tree-sitter modules:', error);
      // Don't fail the test suite, but log the warning
    }
  }
});

afterAll(() => {
  // Any global cleanup needed after all tests
});
