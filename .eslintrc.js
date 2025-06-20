module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  plugins: ['@typescript-eslint', 'jest', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jest/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ],
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    
    // Relax some rules that are problematic with tree-sitter and our use case
    '@typescript-eslint/no-require-imports': 'off', // tree-sitter modules use CommonJS
    '@typescript-eslint/no-unsafe-assignment': 'off', // tree-sitter uses any types
    '@typescript-eslint/no-unsafe-member-access': 'off', // tree-sitter uses any types
    '@typescript-eslint/no-unsafe-call': 'off', // tree-sitter uses any types
    '@typescript-eslint/no-unsafe-return': 'off', // tree-sitter uses any types
    
    // General ESLint rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'off', // Turned off in favor of @typescript-eslint version
    'prefer-const': 'error',
    'no-var': 'error',
    'no-case-declarations': 'off', // Allow lexical declarations in case blocks
    
    // Jest specific rules
    'jest/expect-expect': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    'jest/no-conditional-expect': 'off', // We have valid conditional expects in tests
    'jest/expect-expect': ['error', { 'assertFunctionNames': ['expect*'] }], // Allow expectPattern, expectTransform etc.
    
    // Prettier
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      // More lenient rules for test files
      files: ['**/*.test.ts', '**/*.test.js', '**/tests/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off',
      },
    },
    {
      // More lenient rules for debug files
      files: ['debug-*.js', '**/*.debug.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
    {
      // Ignore JS fixture files used for testing
      files: ['**/fixtures/**/*.js'],
      extends: ['eslint:recommended'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};