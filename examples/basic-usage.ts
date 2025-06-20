import { parse } from '../src';

// Example 1: Parse JavaScript code directly
const code = `
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

const add = (a, b) => a + b;

class Calculator {
  constructor() {
    this.result = 0;
  }
  
  add(value) {
    this.result += value;
    return this;
  }
}
`;

const tree = parse(code);

// Find all functions
console.log('Functions found:');
const functions = tree.functions();
functions.forEach(fn => {
  console.log(`- ${fn.name || 'anonymous'} at line ${fn.line}`);
});

// Find all classes
console.log('\nClasses found:');
const classes = tree.classes();
classes.forEach(cls => {
  console.log(`- ${cls.name} at line ${cls.line}`);
});

// Find specific patterns
console.log('\nArrow functions:');
const arrows = tree.findAll('arrow_function');
arrows.forEach(arrow => {
  console.log(`- Arrow function at line ${arrow.line}: ${arrow.text.slice(0, 30)}...`);
});

// Navigate the tree
const firstFunction = tree.find('function_declaration');
if (firstFunction) {
  console.log(`\nFirst function "${firstFunction.name}" has ${firstFunction.children.length} child nodes`);
}