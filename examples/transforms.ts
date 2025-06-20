import { parse } from '../src';

const code = `
import { useState, useEffect } from 'react';
import axios from 'axios';
import _ from 'lodash';

const API_URL = 'https://api.example.com';

function fetchData(userId) {
  const url = API_URL + '/users/' + userId;
  return axios.get(url);
}

const getUserInfo = async (userId) => {
  const response = await fetchData(userId);
  return response.data;
};

function processData(data) {
  // Process the data
  const filtered = _.filter(data, item => item.active);
  return filtered;
}

export { fetchData, getUserInfo };
`;

console.log('=== Transform Examples ===\n');

const tree = parse(code);

// Example 1: Rename a function
console.log('1. Renaming fetchData to fetchUserData:');
const renamed = tree.transform()
  .rename('fetchData', 'fetchUserData')
  .toString();
console.log(renamed.slice(150, 350) + '...\n');

// Example 2: Rename identifier (more specific)
console.log('2. Renaming all userId to userID:');
const renamedId = tree.transform()
  .renameIdentifier('userId', 'userID')
  .toString();
console.log(renamedId.slice(150, 350) + '...\n');

// Example 3: Replace in specific node types
console.log('3. Replace string concatenation in binary expressions:');
const replaced = tree.transform()
  .replaceIn('binary_expression', /\+/g, '+ " " +')
  .toString();
console.log('URL construction becomes:', replaced.match(/const url = .+;/)?.[0]);

// Example 4: Remove unused imports
console.log('\n4. Remove unused imports:');
const cleaned = tree.transform()
  .removeUnusedImports()
  .toString();
console.log('Imports after cleanup:');
console.log(cleaned.split('\n').filter(line => line.includes('import')).join('\n'));

// Example 5: Chain multiple transformations
console.log('\n5. Chain multiple operations:');
const transformed = tree.transform()
  .rename('fetchData', 'fetchUserData')
  .rename('getUserInfo', 'fetchUserInfo')
  .rename('processData', 'transformData')
  .removeUnusedImports()
  .toString();

console.log('Final export statement:');
console.log(transformed.match(/export {[^}]+}/)?.[0]);

// Example 6: Insert logging
console.log('\n6. Insert console.log before function calls:');
const withLogging = tree.transform()
  .insertBefore('call_expression', 'console.log("Calling function"); ')
  .toString();
console.log('First few lines with logging:');
console.log(withLogging.slice(200, 400) + '...');