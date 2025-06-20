import { Language } from './types';

// Tree-sitter language modules - these don't have ES6 exports
const JavaScript = require('tree-sitter-javascript');
const TypeScript = require('tree-sitter-typescript').typescript;
const TSX = require('tree-sitter-typescript').tsx;

export const LANGUAGES: Language[] = [
  {
    name: 'javascript',
    extensions: ['.js', '.mjs', '.cjs'],
    parser: JavaScript,
  },
  {
    name: 'typescript',
    extensions: ['.ts'],
    parser: TypeScript,
  },
  {
    name: 'tsx',
    extensions: ['.tsx', '.jsx'],
    parser: TSX,
  },
];

export function detectLanguage(filenameOrCode: string): Language | null {
  // Check if it's a filename with extension
  const ext = filenameOrCode.match(/\.[^.]+$/)?.[0];
  if (ext) {
    const langByExt = LANGUAGES.find(lang => lang.extensions.includes(ext));
    if (langByExt) return langByExt;
  }

  // Try to detect from code content
  if (filenameOrCode.includes('import React') || filenameOrCode.includes('jsx')) {
    return LANGUAGES.find(lang => lang.name === 'tsx') ?? null;
  }

  if (
    filenameOrCode.includes(': ') ||
    filenameOrCode.includes('interface ') ||
    filenameOrCode.includes('type ')
  ) {
    return LANGUAGES.find(lang => lang.name === 'typescript') ?? null;
  }

  // Some basic JavaScript detection
  if (
    filenameOrCode.includes('function ') ||
    filenameOrCode.includes('const ') ||
    filenameOrCode.includes('let ') ||
    filenameOrCode.includes('var ') ||
    filenameOrCode.includes('=>') ||
    filenameOrCode.includes('console.') ||
    filenameOrCode.includes('class ')
  ) {
    return LANGUAGES.find(lang => lang.name === 'javascript') ?? null;
  }

  // Return null if we can't detect the language
  return null;
}

export function getLanguageByName(name: string): Language | null {
  return LANGUAGES.find(lang => lang.name === name) ?? null;
}
