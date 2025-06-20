# Tree Hugger JS 🌳🤗

[![CI](https://github.com/username/tree-hugger/actions/workflows/ci.yml/badge.svg)](https://github.com/username/tree-hugger/actions/workflows/ci.yml)
[![Cross-Platform](https://github.com/username/tree-hugger/actions/workflows/cross-platform.yml/badge.svg)](https://github.com/username/tree-hugger/actions/workflows/cross-platform.yml)
[![npm version](https://badge.fury.io/js/tree-hugger-js.svg)](https://badge.fury.io/js/tree-hugger-js)
[![codecov](https://codecov.io/gh/username/tree-hugger/branch/main/graph/badge.svg)](https://codecov.io/gh/username/tree-hugger)

A friendly tree-sitter wrapper for JavaScript and TypeScript that eliminates boilerplate and makes AST parsing a breeze. Write patterns using natural terms like `function`, `class`, and `string` instead of tree-sitter's verbose node types.

## Quick Start

```typescript
import { parse } from 'tree-hugger-js';

// Parse a file
const tree = parse('app.js');

// Or parse code directly  
const tree = parse(`
  function hello() {
    console.log('Hello, World!');
  }
`);

// Find all functions (any type - declaration, expression, arrow)
const functions = tree.findAll('function');

// Find async functions with our intuitive syntax
const asyncFuncs = tree.findAll('function[async]');

// Find classes and their methods
const firstClass = tree.find('class');
const methods = firstClass?.findAll('method');
```

## Features

- 🚀 **Zero Configuration** - Auto-detects JS, TS, JSX, and TSX
- 🎯 **Intuitive Patterns** - Use `function` instead of `function_declaration`, `class` instead of `class_declaration`
- 🔍 **Smart Queries** - Pattern matching with CSS-like selectors and helpful error messages
- 🏷️ **Built-in Queries** - Common patterns like `functions()`, `classes()`, `imports()`
- 🧭 **Easy Navigation** - Parent, sibling, and ancestor traversal
- ✨ **Context-Aware Transforms** - Operations understand context (e.g., removing a variable removes the declaration)
- 💪 **TypeScript First** - Full type safety and IntelliSense support
- 📦 **Lightweight** - Only includes JavaScript/TypeScript parsers

## Installation

```bash
npm install tree-hugger-js
```

## Language Support

Tree Hugger JS is specifically designed for the JavaScript/TypeScript ecosystem:
- ✅ JavaScript (.js, .mjs, .cjs)
- ✅ TypeScript (.ts)
- ✅ JSX (.jsx)
- ✅ TSX (.tsx)

For other languages, consider using tree-sitter directly or look for language-specific wrappers.

## Examples

### Find all TODO comments
```typescript
const todos = tree.comments()
  .filter(c => c.text.includes('TODO'))
  .map(c => ({ text: c.text, line: c.line }));
```

### Extract all imports
```typescript
const imports = tree.imports().map(imp => imp.name);
```

### Find async functions
```typescript
const asyncFuncs = tree.functions()
  .filter(fn => fn.text.includes('async'));
```

### Navigate to parent
```typescript
const method = tree.find('method');
const parentClass = method?.getParent('class');
```

## API

### Pattern Matching

Tree Hugger JS supports intuitive patterns with CSS-like selectors:

#### Intuitive Node Types
Instead of tree-sitter's verbose names, use natural terms:
- `function` - matches all function types (declaration, expression, arrow, method)
- `class` - matches class declarations and expressions
- `string` - matches string and template literals
- `loop` - matches for, while, do-while loops
- `import`/`export` - matches import/export statements
- `jsx` - matches JSX elements and fragments
- `call` - matches function calls
- And many more!

#### Selectors
- **Type selectors**: `function`, `class`, `string`
- **Attribute selectors**: `[name="foo"]`, `[async]`, `[text*="test"]`
- **Descendant selectors**: `class method`, `function call`
- **Child selectors**: `function > return`
- **Pseudo-selectors**: `:has()`, `:not()`

### Core Methods
- `parse(filenameOrCode, options?)` - Parse a file or code string
- `find(pattern)` - Find first matching node
- `findAll(pattern)` - Find all matching nodes
- `visit(visitor)` - Visit nodes with enter/exit callbacks
- `nodeAt(line, col)` - Find node at position
- `analyzeScopes()` - Analyze variable scopes

### Built-in Queries
- `functions()` - All function declarations/expressions
- `classes()` - All class declarations
- `imports()` - All import statements
- `exports()` - All export statements
- `variables()` - All variable declarations
- `comments()` - All comments
- `jsxComponents()` - All JSX elements
- `jsxProps(name?)` - JSX attributes/props
- `hooks()` - React hooks usage

### Navigation
- `getParent(type?)` - Get parent node
- `siblings()` - Get sibling nodes
- `ancestors()` - Get all ancestors
- `descendants(type?)` - Get all descendants

### Transformations
- `transform()` - Start a transformation chain
- `rename(oldName, newName)` - Intelligently rename identifiers (skips strings, comments)
- `renameIdentifier(old, new)` - Simple identifier replacement
- `replaceIn(nodeType, pattern, replacement)` - Replace in specific nodes
- `remove(pattern)` - Remove nodes (understands context, e.g., `remove('console.log')` works!)
- `removeUnusedImports()` - Clean up imports
- `insertBefore(pattern, text)` - Insert before nodes
- `insertAfter(pattern, text)` - Insert after nodes (smart context awareness)

## Advanced Features

### Visitor Pattern
```typescript
tree.visit({
  enter(node) {
    console.log('Entering:', node.type);
  },
  exit(node) {
    console.log('Exiting:', node.type);
  }
});
```

### Scope Analysis
```typescript
const scopes = tree.analyzeScopes();
const binding = scopes.findBinding(node, 'variableName');
```

### Pattern Examples
```typescript
// Find async functions (works with any function type)
tree.findAll('function[async]');

// Find JSX elements with className prop
tree.findAll('jsx:has(jsx-attribute[name="className"])');

// Find async methods in classes
tree.findAll('class method[async]');

// Find functions that call console.log
tree.findAll('function:has(call[text*="console.log"])');

// Find all loops
tree.findAll('loop');

// Find all string literals containing "TODO"
tree.findAll('string[text*="TODO"]');
```

## Transform Examples

### Rename functions and variables
```typescript
const transformed = tree.transform()
  .rename('oldFunction', 'newFunction')
  .rename('oldVar', 'newVar')
  .toString();
```

### Remove unused imports
```typescript
const cleaned = tree.transform()
  .removeUnusedImports()
  .toString();
```

### Complex refactoring
```typescript
const refactored = tree.transform()
  .rename('getData', 'fetchData')
  .replaceIn('string', /localhost/g, 'api.example.com')
  .remove('console.log')  // Removes all console.log calls
  .removeUnusedImports()
  .toString();
```

### Smart context-aware operations
```typescript
// Insert after a const declaration (not just the keyword!)
const withLogs = tree.transform()
  .insertAfter('const', ' console.log(x);')
  .toString();
// Result: const x = 42; console.log(x);

// Remove a variable (removes the whole declaration if it's the only one)
const cleaned = tree.transform()
  .remove('variable[name="tempVar"]')
  .toString();
```

## Why Tree Hugger JS?

Tree-sitter is powerful but requires learning its specific node types and APIs. Tree Hugger JS bridges this gap by:

1. **Intuitive Patterns**: Write `function` instead of memorizing `function_declaration` vs `function_expression`
2. **Smart Operations**: Transformations understand context and do what you expect
3. **Better Errors**: Get helpful suggestions when patterns don't match
4. **Type Safety**: Full TypeScript support with great IntelliSense
5. **Focused Scope**: Optimized specifically for JavaScript/TypeScript workflows

## Contributing

### Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the project
npm run build

# Watch mode for development
npm run dev
```

### CI/CD

This project uses GitHub Actions for continuous integration:

- **CI Pipeline**: Runs tests on Node.js 18.x, 20.x, and 22.x for every PR and push
- **Cross-Platform Tests**: Ensures compatibility across Ubuntu, Windows, and macOS
- **Automated Publishing**: Publishes to NPM when releases are created
- **Code Coverage**: Uploads coverage reports to Codecov

All PRs must pass the full test suite before merging.

## License

MIT