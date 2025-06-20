
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
