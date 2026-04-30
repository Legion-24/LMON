export class XDONParseError extends Error {
  public readonly line: number;

  public readonly column: number;

  public readonly source: string | undefined;

  constructor(
    message: string,
    line: number,
    column: number,
    source?: string,
  ) {
    super(`[XDON ParseError at ${line}:${column}] ${message}`);
    this.line = line;
    this.column = column;
    this.source = source;
    this.name = 'XDONParseError';
    Object.setPrototypeOf(this, XDONParseError.prototype);
  }
}

export class XDONStringifyError extends Error {
  constructor(message: string) {
    super(`[XDON StringifyError] ${message}`);
    this.name = 'XDONStringifyError';
    Object.setPrototypeOf(this, XDONStringifyError.prototype);
  }
}

export class XDONMacroError extends Error {
  public readonly line: number;

  public readonly column: number;

  public readonly macroName: string | undefined;

  constructor(
    message: string,
    line: number,
    column: number,
    macroName?: string,
  ) {
    super(`[XDON MacroError at ${line}:${column}] ${message}`);
    this.line = line;
    this.column = column;
    this.macroName = macroName;
    this.name = 'XDONMacroError';
    Object.setPrototypeOf(this, XDONMacroError.prototype);
  }
}
