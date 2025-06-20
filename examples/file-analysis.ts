import { parse } from '../src';
import { writeFileSync } from 'fs';

// Create a sample JavaScript file to analyze
const sampleCode = `
import React from 'react';
import { useState, useEffect } from 'react';
import './styles.css';

// TODO: Add proper error handling
export function TodoList({ initialItems = [] }) {
  const [items, setItems] = useState(initialItems);
  const [newItem, setNewItem] = useState('');
  
  // TODO: Persist to localStorage
  useEffect(() => {
    console.log('Items updated:', items);
  }, [items]);
  
  const addItem = async () => {
    if (!newItem.trim()) return;
    
    setItems([...items, {
      id: Date.now(),
      text: newItem,
      completed: false
    }]);
    setNewItem('');
  };
  
  const toggleItem = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };
  
  return (
    <div className="todo-list">
      <input 
        value={newItem}
        onChange={(e) => setNewItem(e.target.value)}
        placeholder="Add new item..."
      />
      <button onClick={addItem}>Add</button>
      
      <ul>
        {items.map(item => (
          <li key={item.id} className={item.completed ? 'completed' : ''}>
            <input 
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleItem(item.id)}
            />
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoList;
`;

// Save as a file
writeFileSync('examples/sample.jsx', sampleCode);

// Parse the file
const tree = parse('examples/sample.jsx');

console.log('=== File Analysis ===\n');

// Extract imports
console.log('Imports:');
const imports = tree.imports();
imports.forEach(imp => {
  const source = imp.node.childForFieldName('source');
  if (source) {
    console.log(`- ${source.text}`);
  }
});

// Find all TODOs
console.log('\nTODO Comments:');
const todos = tree.comments().filter(comment => 
  comment.text.includes('TODO')
);
todos.forEach(todo => {
  console.log(`- Line ${todo.line}: ${todo.text.trim()}`);
});

// Analyze function complexity
console.log('\nFunction Analysis:');
const funcs = tree.functions();
funcs.forEach(func => {
  const name = func.name || '<anonymous>';
  const isAsync = func.text.includes('async');
  const params = func.node.childForFieldName('parameters');
  const paramCount = params ? params.children.filter(n => n.type === 'identifier').length : 0;
  
  console.log(`- ${name}:`);
  console.log(`  Async: ${isAsync}`);
  console.log(`  Parameters: ${paramCount}`);
  console.log(`  Lines: ${func.endPosition.row - func.startPosition.row + 1}`);
});

// Find state hooks
console.log('\nReact Hooks Usage:');
const hookCalls = tree.findAll('call_expression').filter(call => {
  const name = call.node.childForFieldName('function');
  return name && name.text.startsWith('use');
});
hookCalls.forEach(hook => {
  const name = hook.node.childForFieldName('function');
  console.log(`- ${name?.text} at line ${hook.line}`);
});