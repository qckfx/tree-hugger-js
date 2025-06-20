// Jest setup file - can be used for global test configuration

// Extend Jest matchers if needed
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Matchers<R> {
    // Add custom matchers here if needed
  }
}

// Ensure tree-sitter is properly initialized
beforeAll(() => {
  // Any global setup needed before all tests
});

afterAll(() => {
  // Any global cleanup needed after all tests
});
