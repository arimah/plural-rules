/**
 * An error that occurs during parsing; a syntax error.
 */
export default class ParseError extends Error {
  public constructor(message = 'Syntax error') {
    super(message);
    this.name = 'ParseError';
  }
}
