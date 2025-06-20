// Sample JavaScript file for testing
function greet(name) {
  console.log(`Hello, ${name}!`);
}

class Calculator {
  constructor() {
    this.result = 0;
  }

  add(value) {
    this.result += value;
    return this;
  }

  multiply(value) {
    this.result *= value;
    return this;
  }

  getResult() {
    return this.result;
  }
}

const calc = new Calculator();
calc.add(5).multiply(2);
console.log(calc.getResult()); // 10

// Async example
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    return null;
  }
}

export { greet, Calculator, fetchData };
