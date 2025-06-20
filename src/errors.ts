export class TreeHuggerError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: unknown
  ) {
    super(message);
    this.name = 'TreeHuggerError';
    Object.setPrototypeOf(this, TreeHuggerError.prototype);
  }
}

export class ParseError extends TreeHuggerError {
  constructor(
    message: string,
    public line?: number,
    public column?: number
  ) {
    super(message, 'PARSE_ERROR', { line, column });
    this.name = 'ParseError';
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

export class PatternError extends TreeHuggerError {
  constructor(
    message: string,
    public pattern: string
  ) {
    super(message, 'PATTERN_ERROR', { pattern });
    this.name = 'PatternError';
    Object.setPrototypeOf(this, PatternError.prototype);
  }
}

export class TransformError extends TreeHuggerError {
  constructor(
    message: string,
    public edit?: unknown
  ) {
    super(message, 'TRANSFORM_ERROR', edit);
    this.name = 'TransformError';
    Object.setPrototypeOf(this, TransformError.prototype);
  }
}

export class LanguageError extends TreeHuggerError {
  constructor(
    message: string,
    public filename?: string
  ) {
    super(message, 'LANGUAGE_ERROR', { filename });
    this.name = 'LanguageError';
    Object.setPrototypeOf(this, LanguageError.prototype);
  }
}
