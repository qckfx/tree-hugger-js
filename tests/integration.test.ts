import { parse } from '../src';
import { measureTime } from './helpers/test-utils';

describe('Integration Tests', () => {
  describe('real-world refactoring', () => {
    it('should refactor a React component', () => {
      const code = `
import React, { useState, useEffect } from 'react';
import { fetchUserData } from './api';

const UserProfile = ({ userId }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUserData(userId).then(data => {
      setUserData(data);
      setLoading(false);
    });
  }, [userId]);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="user-profile">
      <h1>{userData.name}</h1>
      <p>{userData.email}</p>
    </div>
  );
};

export default UserProfile;
`;

      const tree = parse(code, { language: 'tsx' });

      // 1. Find all hooks
      const hooks = tree.hooks();
      expect(hooks).toHaveLength(3); // useState x2, useEffect

      // 2. Find JSX elements
      const jsxElements = tree.jsxComponents();
      expect(jsxElements.length).toBeGreaterThan(0);

      // 3. Rename component
      const refactored = tree
        .transform()
        .rename('UserProfile', 'UserCard')
        .rename('userData', 'user')
        .rename('fetchUserData', 'getUser')
        .toString();

      expect(refactored).toContain('const UserCard = ');
      expect(refactored).toContain('export default UserCard');
      expect(refactored).toContain('user.name');
      expect(refactored).toContain('getUser(userId)');

      // 4. Analyze scope
      const scopes = tree.analyzeScopes();
      tree.visit(node => {
        if (node.type === 'arrow_function') {
          const scope = scopes.getScope(node);
          expect(scope).toBeDefined();
        }
      });
    });

    it('should analyze and transform an Express route', () => {
      const code = `
const express = require('express');
const router = express.Router();
const { validateUser, checkAuth } = require('./middleware');
const UserService = require('./services/user');

router.get('/users/:id', checkAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await UserService.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
`;

      const tree = parse(code);

      // Find all route handlers (router.get, router.post, etc.)
      const routeHandlers = tree
        .findAll('call_expression')
        .filter(node => {
          const memberExpr = node.find('member_expression');
          return memberExpr?.text.includes('.get');
        })
        .filter(node => node.find('string'));

      expect(routeHandlers.length).toBeGreaterThan(0);

      // Find error handling
      const tryCatches = tree.findAll('try_statement');
      expect(tryCatches).toHaveLength(1);

      // Transform to use modern syntax
      const modernized = tree
        .transform()
        .replaceIn('call_expression', /require/g, 'import')
        .rename('findById', 'getById')
        .toString();

      // Note: Full ES6 module transformation would be more complex
      expect(modernized).toContain('getById');
    });
  });

  describe('code analysis', () => {
    it('should analyze code complexity', () => {
      const complexCode = `
function complexFunction(data) {
  if (!data) return null;
  
  for (let i = 0; i < data.length; i++) {
    if (data[i].type === 'A') {
      if (data[i].value > 10) {
        for (let j = 0; j < data[i].items.length; j++) {
          if (data[i].items[j].active) {
            console.log(data[i].items[j]);
          }
        }
      } else {
        console.log('Low value');
      }
    } else if (data[i].type === 'B') {
      switch (data[i].status) {
        case 'pending':
          processPending(data[i]);
          break;
        case 'active':
          processActive(data[i]);
          break;
        default:
          console.log('Unknown status');
      }
    }
  }
  
  return data.filter(d => d.processed);
}
`;

      const tree = parse(complexCode);

      // Count control flow statements
      const ifStatements = tree.findAll('if_statement');
      const forLoops = tree.findAll('for_statement');
      const switchStatements = tree.findAll('switch_statement');

      expect(ifStatements.length).toBeGreaterThan(3);
      expect(forLoops).toHaveLength(2);
      expect(switchStatements).toHaveLength(1);

      // Measure nesting depth
      let maxDepth = 0;
      tree.visit({
        enter(node, parent) {
          if (node.type === 'statement_block') {
            let depth = 0;
            let current = parent;
            while (current) {
              if (current.type === 'statement_block') depth++;
              current = current.parent;
            }
            maxDepth = Math.max(maxDepth, depth);
          }
        },
      });

      expect(maxDepth).toBeGreaterThan(2);
    });

    it('should find code duplication', () => {
      const code = `
function processUser(user) {
  if (!user.id) {
    console.error('Invalid user: missing id');
    return null;
  }
  if (!user.email) {
    console.error('Invalid user: missing email');
    return null;
  }
  return transformUser(user);
}

function processOrder(order) {
  if (!order.id) {
    console.error('Invalid order: missing id');
    return null;
  }
  if (!order.items) {
    console.error('Invalid order: missing items');
    return null;
  }
  return transformOrder(order);
}
`;

      const tree = parse(code);

      // Find similar patterns
      const validationPatterns = tree.findAll('if_statement:has(unary_expression[operator="!"])');
      expect(validationPatterns).toHaveLength(4);

      // Find console.error calls
      const errorLogs = tree.findAll(
        'call_expression:has(member_expression[text*="console.error"])'
      );
      expect(errorLogs).toHaveLength(4);

      // Extract similar structure
      const functions = tree.functions();
      const structures = functions.map(fn => {
        const ifs = fn.findAll('if_statement').length;
        const returns = fn.findAll('return_statement').length;
        return { name: fn.name, ifs, returns };
      });

      // Both functions have similar structure
      expect(structures[0].ifs).toBe(structures[1].ifs);
      expect(structures[0].returns).toBe(structures[1].returns);
    });
  });

  describe('performance', () => {
    it('should handle large files efficiently', () => {
      // Generate a large file
      const functions = Array.from(
        { length: 100 },
        (_, i) => `
        function func${i}(param${i}) {
          const result${i} = param${i} * 2;
          if (result${i} > 100) {
            return result${i} / 2;
          }
          return result${i};
        }
      `
      ).join('\n');

      const classes = Array.from(
        { length: 50 },
        (_, i) => `
        class Class${i} {
          constructor() {
            this.value = ${i};
          }
          method${i}() {
            return this.value * 2;
          }
        }
      `
      ).join('\n');

      const largeCode = functions + '\n' + classes;

      // Measure parse time
      const { result: tree, time: parseTime } = measureTime(() => parse(largeCode));
      expect(parseTime).toBeLessThan(1000); // Should parse in under 1 second

      // Measure query time
      const { time: queryTime } = measureTime(() => {
        const allFunctions = tree.functions();
        const allClasses = tree.classes();
        expect(allFunctions).toHaveLength(200); // 100 standalone + 50 constructors + 50 methods
        expect(allClasses).toHaveLength(50);
      });
      expect(queryTime).toBeLessThan(200); // Queries should be reasonably fast

      // Measure transform time
      const { time: transformTime } = measureTime(() => {
        tree.transform().rename('func0', 'function0').rename('Class0', 'MyClass0').toString();
      });
      expect(transformTime).toBeLessThan(500); // Transforms should be reasonable
    });

    it('should handle deeply nested code', () => {
      let code = 'function outer() {';
      for (let i = 0; i < 20; i++) {
        code += `\n${'  '.repeat(i + 1)}if (condition${i}) {`;
      }
      code += '\n' + '  '.repeat(21) + 'return true;';
      for (let i = 19; i >= 0; i--) {
        code += `\n${'  '.repeat(i + 1)}}`;
      }
      code += '\n}';

      const tree = parse(code);
      const ifStatements = tree.findAll('if_statement');
      expect(ifStatements).toHaveLength(20);

      // Should handle deep nesting in visitor
      let visited = 0;
      tree.visit(() => {
        visited++;
      });
      expect(visited).toBeGreaterThan(40); // Many nodes in deeply nested structure
    });
  });

  describe('error recovery', () => {
    it('should partially parse code with syntax errors', () => {
      const codeWithErrors = `
function validFunction() {
  return 42;
}

// Missing closing brace
function broken() {
  const x = 1;
  return x * 2

function anotherValid() {
  return 24;
}
`;

      const tree = parse(codeWithErrors);

      // Should still find valid functions
      const functions = tree.functions();
      expect(functions.length).toBeGreaterThan(0);

      // First function should be complete
      const validFunc = functions.find(f => f.name === 'validFunction');
      expect(validFunc).toBeDefined();

      // Should detect error
      expect(tree.root.hasError).toBe(true);
    });
  });
});
