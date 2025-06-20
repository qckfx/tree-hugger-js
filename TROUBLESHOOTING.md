# Troubleshooting Tree-Sitter Issues

This document provides solutions for common tree-sitter related issues, particularly those encountered in CI environments.

## "Cannot read properties of undefined (reading 'type')" Error

### Problem
You may encounter an error like:
```
Cannot read properties of undefined (reading 'type')
```
This error occurs at `src/node-wrapper.ts:20:22` where `this.node.type` is being accessed, but `this.node` is undefined.

### Root Cause
This issue is caused by a race condition in tree-sitter's native Node.js bindings, particularly common in:
- GitHub Actions CI environments
- Jest test suites running with concurrent workers
- Multi-threaded Node.js applications
- Different Node.js versions (18.x, 20.x, 22.x) across platforms (Ubuntu, Windows, macOS)

The race condition is documented in [tree-sitter/node-tree-sitter#181](https://github.com/tree-sitter/node-tree-sitter/issues/181).

### Solutions

#### 1. Use the Built-in Retry Mechanism (Recommended)
Tree Hugger now includes a built-in retry mechanism that handles this race condition automatically. The error should be rare, but if it occurs, Tree Hugger will:
- Retry getting the rootNode up to 3 times
- Use progressive delays to allow native bindings to stabilize
- Provide clear error messages with next steps

#### 2. Configure Jest for Serial Test Execution
If you're using Jest and still encounter issues, run tests serially:

```json
// jest.config.js
{
  "maxWorkers": 1
}
```

Or use the provided CI-specific configuration:
```bash
npm test -- --config=jest.config.ci.js
```

#### 3. Native Module Rebuild in CI
Ensure native modules are rebuilt for the target Node.js version in your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Rebuild native modules for current Node.js version
  run: npm rebuild
```

#### 4. Environment Variables for Debugging
Set these environment variables to get more information:
```bash
export NODE_ENV=test
export TREE_SITTER_DEBUG=1
```

## Native Module Version Mismatches

### Problem
Errors like:
```
The module was compiled against a different Node.js version
```

### Solution
1. Rebuild native modules: `npm rebuild`
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules and reinstall: `rm -rf node_modules && npm install`

## CI-Specific Configurations

### GitHub Actions
The project includes updated CI workflows that:
- Rebuild native modules for each Node.js version
- Run tests with appropriate timeouts
- Handle cross-platform compatibility

### Node.js Version Support
Tree Hugger is tested on:
- Node.js 18.x, 20.x, 22.x
- Ubuntu, Windows, macOS
- Both CommonJS and ES modules

## Performance Considerations

### Large Files
For very large files (>1MB):
- Increase Jest timeout: `testTimeout: 15000`
- Consider parsing in chunks for extremely large codebases
- Monitor memory usage in long-running processes

### Memory Leaks
Tree-sitter parsers hold references to native resources:
- Create new parser instances when switching between many different languages
- In long-running processes, consider periodically recreating parsers
- Monitor memory usage in production applications

## Getting Help

If you continue to experience issues:

1. **Check the error message**: Tree Hugger provides specific guidance for different error types
2. **Enable debug logging**: Set `TREE_SITTER_DEBUG=1`
3. **Try the alternative Jest config**: Use `jest.config.ci.js` for CI environments
4. **Check Node.js version compatibility**: Ensure you're using a supported Node.js version
5. **Rebuild native modules**: Run `npm rebuild` to ensure compatibility

## Contributing

If you discover new tree-sitter related issues or solutions:
1. Check existing issues in [tree-sitter/node-tree-sitter](https://github.com/tree-sitter/node-tree-sitter/issues)
2. Document the problem and solution
3. Consider contributing improvements to the retry mechanism or error handling