import { parse, TreeHugger, TreeNode } from '../../src';
import { readFileSync } from 'fs';
import { join } from 'path';

export function loadFixture(filename: string): string {
  const fixturePath = join(__dirname, '..', 'fixtures', filename);
  return readFileSync(fixturePath, 'utf-8');
}

export function createTree(code: string, language?: string): TreeHugger {
  return parse(code, language ? { language } : undefined);
}

export function expectNode(node: TreeNode | null, type?: string): asserts node is TreeNode {
  expect(node).not.toBeNull();
  if (type) {
    expect(node!.type).toBe(type);
  }
}

export function getNodeText(nodes: TreeNode[]): string[] {
  return nodes.map(n => n.text);
}

export function getNodeTypes(nodes: TreeNode[]): string[] {
  return nodes.map(n => n.type);
}

// Helper to create test code snippets
export const testCode = {
  simple: {
    js: 'const x = 42;',
    ts: 'const x: number = 42;',
    jsx: '<div>Hello</div>',
    tsx: '<div className="test">Hello</div>',
  },

  functions: {
    js: `
function greet(name) {
  console.log("Hello " + name);
}

const add = (a, b) => a + b;

async function fetchData() {
  return await fetch('/api');
}
`,
    ts: `
function greet(name: string): void {
  console.log(\`Hello \${name}\`);
}

const add = (a: number, b: number): number => a + b;

async function fetchData<T>(): Promise<T> {
  const response = await fetch('/api');
  return response.json();
}
`,
  },

  classes: {
    js: `
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  speak() {
    console.log(this.name + ' makes a sound');
  }
}

class Dog extends Animal {
  bark() {
    console.log('Woof!');
  }
}
`,
    ts: `
class Animal {
  constructor(public name: string) {}
  
  speak(): void {
    console.log(\`\${this.name} makes a sound\`);
  }
}

class Dog extends Animal {
  bark(): void {
    console.log('Woof!');
  }
}
`,
  },

  imports: {
    withUnused: `
import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import _ from 'lodash';

const Component = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Only using axios, not lodash
    axios.get('/api').then(setData);
  }, []);
  
  return React.createElement('div', null, data);
};
`,
    allUsed: `
import React from 'react';
import { useState } from 'react';

export function Component() {
  const [count, setCount] = useState(0);
  return React.createElement('div', null, count);
}
`,
  },

  jsx: {
    component: `
import React from 'react';

export const Button = ({ onClick, disabled, children, className = 'btn' }) => {
  return (
    <button 
      className={className}
      onClick={onClick}
      disabled={disabled}
      data-testid="button"
    >
      {children}
    </button>
  );
};

export const Card = () => (
  <div className="card">
    <h2>Title</h2>
    <Button onClick={() => alert('Clicked')}>
      Click me
    </Button>
  </div>
);
`,
  },

  withErrors: {
    syntax: 'const x = ;',
    incomplete: 'function test() {',
    invalid: 'class { constructor() {} }',
  },
};

// Test assertion helpers
export function expectTransform(
  code: string,
  transform: (tree: TreeHugger) => string,
  expected: string
): void {
  const tree = createTree(code);
  const result = transform(tree);
  expect(result).toBe(expected);
}

export function expectPattern(code: string, pattern: string, expectedCount: number): void {
  const tree = createTree(code);
  const nodes = tree.findAll(pattern);
  expect(nodes).toHaveLength(expectedCount);
}

// Performance testing helper
export function measureTime<T>(fn: () => T): { result: T; time: number } {
  const start = performance.now();
  const result = fn();
  const time = performance.now() - start;
  return { result, time };
}
