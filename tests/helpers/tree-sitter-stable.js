/**
 * Stable tree-sitter module loader for Jest testing environments
 *
 * This module works around the race condition documented in tree-sitter/node-tree-sitter#181
 * where tree.rootNode becomes undefined during concurrent Jest test execution.
 *
 * The workaround uses Node.js's native module caching mechanism to ensure
 * tree-sitter modules are loaded once and cached properly.
 */

// Use Node's internal module loader to prevent Jest from reloading tree-sitter
const Module = require('module');

// Cache for tree-sitter instances to prevent race conditions
const treeSitterCache = new Map();

// Original require function
// eslint-disable-next-line @typescript-eslint/unbound-method
const originalRequire = Module.prototype.require;

// Override require for tree-sitter to use cached instances
Module.prototype.require = function (id) {
  if (id === 'tree-sitter') {
    const cacheKey = 'tree-sitter-main';

    if (!treeSitterCache.has(cacheKey)) {
      // Load tree-sitter only once and cache it
      const TreeSitter = originalRequire.call(this, id);
      treeSitterCache.set(cacheKey, TreeSitter);

      // Warm up the native bindings
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const parser = new TreeSitter();
        // This initialization helps prevent race conditions
        treeSitterCache.set('initialized', true);
      } catch (error) {
        console.warn('Tree-sitter initialization warning:', error.message);
      }
    }

    return treeSitterCache.get(cacheKey);
  }

  // For all other modules, use original require
  return originalRequire.call(this, id);
};

// Export the cached tree-sitter module
module.exports = originalRequire.call(module, 'tree-sitter');
