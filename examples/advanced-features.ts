import { parse } from '../src';

const reactCode = `
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './components/Button';
import axios from 'axios';

export const UserProfile = ({ userId, onUpdate }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser();
  }, [userId]);
  
  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(\`/api/users/\${userId}\`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;
  
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <Button onClick={() => onUpdate(user)}>
        Update Profile
      </Button>
    </div>
  );
};

export default UserProfile;
`;

console.log('=== Advanced Pattern Matching ===\n');

const tree = parse(reactCode, { language: 'tsx' });

// CSS-like selectors
console.log('1. Find all async arrow functions:');
const asyncArrows = tree.findAll('arrow_function[async]');
asyncArrows.forEach(fn => {
  console.log(`- Line ${fn.line}: ${fn.text.slice(0, 50)}...`);
});

console.log('\n2. Find JSX elements with className:');
const elementsWithClass = tree.findAll('jsx_element:has(jsx_attribute[name="className"])');
elementsWithClass.forEach(el => {
  const tag = el.find('jsx_opening_element > identifier')?.text;
  console.log(`- <${tag}> at line ${el.line}`);
});

console.log('\n3. Find useState calls:');
const useStates = tree.findAll('call_expression > identifier[text="useState"]');
console.log(`Found ${useStates.length} useState calls`);

console.log('\n=== Visitor Pattern ===\n');

// Count node types
const typeCounts = new Map<string, number>();
tree.visit((node) => {
  const count = typeCounts.get(node.type) || 0;
  typeCounts.set(node.type, count + 1);
});

console.log('Top 5 most common node types:');
Array.from(typeCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`);
  });

console.log('\n=== Scope Analysis ===\n');

const scopes = tree.analyzeScopes();
tree.visit((node) => {
  if (node.type === 'identifier' && node.text === 'userId') {
    const scope = scopes.getScope(node);
    if (scope) {
      console.log(`userId at line ${node.line} is in scope: ${scope.node.type}`);
    }
  }
});

console.log('\n=== JSX Analysis ===\n');

console.log('React hooks used:');
const hooks = tree.hooks();
hooks.forEach(hook => {
  const name = hook.node.childForFieldName('function')?.text;
  console.log(`- ${name} at line ${hook.line}`);
});

console.log('\nJSX Components:');
const components = tree.jsxComponents();
components.forEach(comp => {
  const name = comp.find('identifier')?.text || comp.find('member_expression')?.text;
  console.log(`- <${name}> at line ${comp.line}`);
});

console.log('\nButton props:');
const buttonProps = tree.jsxProps('Button');
buttonProps.forEach(prop => {
  const name = prop.node.childForFieldName('name')?.text;
  console.log(`- ${name} at line ${prop.line}`);
});

console.log('\n=== Export Analysis ===\n');

const exportNodes = tree.exports();
exportNodes.forEach(exp => {
  const isDefault = exp.text.includes('default');
  const exported = exp.find('identifier')?.text || exp.find('function')?.name;
  console.log(`- ${isDefault ? 'default' : 'named'} export: ${exported}`);
});

console.log('\n=== Position-based Queries ===\n');

// Find node at specific position
const nodeAtLine15 = tree.nodeAt(15, 10);
if (nodeAtLine15) {
  console.log(`Node at line 15, col 10: ${nodeAtLine15.type} "${nodeAtLine15.text.slice(0, 20)}..."`);
  console.log('Path to root:', nodeAtLine15.getPath().map(n => n.type).join(' > '));
}