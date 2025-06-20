# Tree Hugger Test Suite

This directory contains the comprehensive test suite for the tree-hugger-js library.

## Structure

```
tests/
├── fixtures/          # Sample code files for testing
│   ├── sample.js     # JavaScript test fixture
│   └── sample.ts     # TypeScript test fixture
├── helpers/          # Test utilities and helpers
│   ├── test-utils.ts # Common test utilities
│   └── setup.ts      # Jest setup file
├── mocks/            # Mock implementations (currently empty)
├── *.test.ts         # Test files for each module
└── README.md         # This file
```

## Test Files

- **tree-hugger.test.ts** - Core parsing and tree navigation functionality
- **languages.test.ts** - Language detection and configuration
- **visitor.test.ts** - Tree visitor patterns and scope analysis
- **transform.test.ts** - AST transformation utilities
- **pattern-parser.test.ts** - Pattern matching functionality
- **node-wrapper.test.ts** - TreeNode wrapper functionality
- **errors.test.ts** - Error handling and custom error types

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test tree-hugger.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="parse function"
```

## Writing Tests

### Test Utilities

The `helpers/test-utils.ts` file provides common utilities:

```typescript
import { createTreeHugger, loadFixture, expectNodeType } from './helpers/test-utils';

// Create a tree hugger instance
const tree = createTreeHugger('const x = 42;', Language.JavaScript);

// Load a fixture file
const code = loadFixture('sample.js');

// Assert node type
expectNodeType(node, 'identifier');
```

### Test Structure

Each test file follows this general structure:

```typescript
import { ModuleToTest } from '../src/module';
import { loadFixture } from './helpers/test-utils';

describe('ModuleName', () => {
  describe('feature group', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test input';
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

## Coverage Goals

The test suite aims for high coverage of:
- All public API methods
- Edge cases and error conditions
- Different language variants (JS, TS, TSX)
- Complex nested structures
- Performance with large files

## Adding New Tests

1. Create a new test file following the naming convention: `module-name.test.ts`
2. Import the module to test and any necessary helpers
3. Write descriptive test cases covering:
   - Happy path scenarios
   - Error cases
   - Edge cases
   - Integration with other modules
4. Run tests to ensure they pass
5. Check coverage with `npm run test:coverage`

## Common Test Patterns

### Testing Tree Queries
```typescript
const tree = parse(code, Language.JavaScript);
const matches = tree.query('(function_declaration) @func');
expect(matches).toHaveLength(1);
```

### Testing Transformations
```typescript
const transform = new Transform();
transform.renameIdentifier('oldName', 'newName');
const result = transform.apply(tree);
expect(result).toContain('newName');
```

### Testing Error Handling
```typescript
expect(() => {
  parse('invalid {{', Language.JavaScript);
}).toThrow(ParseError);
```