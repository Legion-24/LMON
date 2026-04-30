import { XDONParseError, XDONStringifyError } from '../src/errors';

describe('XDONParseError', () => {
  it('should create an error with line and column', () => {
    const err = new XDONParseError('Test error', 5, 10);
    expect(err.message).toContain('Test error');
    expect(err.line).toBe(5);
    expect(err.column).toBe(10);
    expect(err.message).toContain('5:10');
  });

  it('should include source context if provided', () => {
    const err = new XDONParseError('Test error', 1, 1, '{hello}');
    expect(err.source).toBe('{hello}');
  });

  it('should be instanceof Error', () => {
    const err = new XDONParseError('Test', 1, 1);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('XDONStringifyError', () => {
  it('should create an error with message', () => {
    const err = new XDONStringifyError('Stringify failed');
    expect(err.message).toContain('Stringify failed');
  });

  it('should be instanceof Error', () => {
    const err = new XDONStringifyError('Test');
    expect(err).toBeInstanceOf(Error);
  });
});
