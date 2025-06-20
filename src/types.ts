import { SyntaxNode, Point } from 'tree-sitter';

export interface Language {
  name: string;
  extensions: string[];
  parser: unknown;
}

export interface TreeHuggerOptions {
  language?: string;
  autoDetect?: boolean;
}

export interface NodeWrapper {
  node: SyntaxNode;
  text: string;
  type: string;
  startPosition: Point;
  endPosition: Point;
  children: NodeWrapper[];
  parent?: NodeWrapper;
  sourceCode: string;
  name?: string;
  line: number;
  column: number;
  endLine: number;
  hasError: boolean;
}

export interface QueryResult extends NodeWrapper {
  captures?: Record<string, NodeWrapper>;
}

export type NodePredicate = (node: NodeWrapper) => boolean;
export type NodeTransformer = (node: NodeWrapper) => NodeWrapper | null;

// Standard data structures returned by analysis methods
export interface FunctionInfo {
  name: string | null;
  type: string;
  async: boolean;
  parameters: string[];
  startLine: number;
  endLine: number;
  text: string;
  bodyRange?: { startLine: number; endLine: number };
}

export interface ClassInfo {
  name: string | null;
  methods: FunctionInfo[];
  properties: string[];
  startLine: number;
  endLine: number;
  text: string;
  bodyRange?: { startLine: number; endLine: number };
}

export interface ImportInfo {
  module: string;
  specifiers: string[];
  default?: string;
  namespace?: string;
  isTypeOnly: boolean;
  text: string;
}

export interface NodeInfo {
  type: string;
  text: string;
  startLine: number;
  endLine: number;
  [key: string]: unknown;
}

export interface TransformOperation {
  type: 'rename' | 'removeUnusedImports' | 'replaceIn' | 'insertBefore' | 'insertAfter';
  parameters: {
    oldName?: string;
    newName?: string;
    nodeType?: string;
    pattern?: string | RegExp;
    replacement?: string;
    text?: string;
  };
}
