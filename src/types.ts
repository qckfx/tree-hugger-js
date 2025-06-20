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
}

export interface QueryResult extends NodeWrapper {
  captures?: Record<string, NodeWrapper>;
}

export type NodePredicate = (node: NodeWrapper) => boolean;
export type NodeTransformer = (node: NodeWrapper) => NodeWrapper | null;
