import { parse } from '../src';

const complexCode = `
class UserService {
  constructor(private db: Database) {
    this.cache = new Map();
  }
  
  async getUser(id: string): Promise<User> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    const user = await this.db.users.findOne({ id });
    if (!user) {
      throw new Error('User not found');
    }
    
    this.cache.set(id, user);
    return user;
  }
  
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    Object.assign(user, data);
    
    await this.db.users.updateOne({ id }, user);
    this.cache.set(id, user);
    
    return user;
  }
  
  clearCache() {
    this.cache.clear();
  }
}

function validateEmail(email: string): boolean {
  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return re.test(email);
}

const processUsers = async (users: User[]) => {
  const results = await Promise.all(
    users.map(async (user) => {
      if (!validateEmail(user.email)) {
        return { ...user, valid: false };
      }
      
      try {
        const enriched = await enrichUserData(user);
        return { ...enriched, valid: true };
      } catch (error) {
        console.error(\`Failed to process user \${user.id}\`, error);
        return { ...user, valid: false, error: error.message };
      }
    })
  );
  
  return results.filter(r => r.valid);
};
`;

const tree = parse(complexCode, { language: 'typescript' });

console.log('=== Advanced Query Examples ===\n');

// Find all async functions
console.log('Async Functions:');
const asyncFuncs = tree.functions().filter(fn => 
  fn.node.children.some(child => child.type === 'async')
);
asyncFuncs.forEach(fn => {
  console.log(`- ${fn.name || 'anonymous'} at line ${fn.line}`);
});

// Find methods that throw errors
console.log('\nMethods that throw:');
const throwingMethods = tree.findAll('throw_statement');
throwingMethods.forEach(throwStmt => {
  const method = throwStmt.getParent('method_definition');
  if (method) {
    const name = method.name;
    console.log(`- ${name} throws at line ${throwStmt.line}`);
  }
});

// Find all await expressions
console.log('\nAwait expressions:');
const awaits = tree.findAll('await_expression');
awaits.forEach(await => {
  const func = await.getParent('function_declaration') || 
               await.getParent('method_definition') ||
               await.getParent('arrow_function');
  const funcName = func?.name || '<anonymous>';
  console.log(`- In ${funcName} at line ${await.line}: ${await.text.slice(0, 40)}...`);
});

// Find all method calls on 'this'
console.log('\nMethod calls on this:');
const thisCalls = tree.findAll('call_expression').filter(call => {
  const func = call.node.childForFieldName('function');
  return func && func.text.startsWith('this.');
});
thisCalls.forEach(call => {
  console.log(`- ${call.text.split('(')[0]} at line ${call.line}`);
});

// Analyze error handling
console.log('\nError Handling:');
const tryCatches = tree.findAll('try_statement');
console.log(`- Try-catch blocks: ${tryCatches.length}`);
const catchClauses = tree.findAll('catch_clause');
catchClauses.forEach(catchClause => {
  const param = catchClause.node.childForFieldName('parameter');
  console.log(`  Catch at line ${catchClause.line} with param: ${param?.text || 'none'}`);
});