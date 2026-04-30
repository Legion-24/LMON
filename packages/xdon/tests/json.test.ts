import { toJSON, fromJSON } from '../src/json';
import { parse } from '../src/parser';

describe('JSON Bridge', () => {
  it('should convert XDON to JSON', () => {
    const xdon = '(name,age)\nalice:{Alice,30}';
    const json = toJSON(xdon);
    const parsed = JSON.parse(json);
    expect(parsed.alice.name).toBe('Alice');
    expect(parsed.alice.age).toBe(30);
  });

  it('should convert JSON to XDON', () => {
    const json = JSON.stringify({ user1: { name: 'Alice', age: 30 } });
    const xdon = fromJSON(json);
    expect(xdon).toContain('(name,age)');
    expect(xdon).toContain('user1:');
  });

  it('should round-trip via toJSON', () => {
    const xdon = '(name,age)\nalice:{Alice,30}';
    const json = toJSON(xdon);
    const reparsed = JSON.parse(json);
    expect(reparsed.alice.name).toBe('Alice');
  });

  it('should round-trip via fromJSON', () => {
    const obj = { user1: { name: 'Alice', age: 30 } };
    const json = JSON.stringify(obj);
    const xdon = fromJSON(json);
    const parsed = parse(xdon) as Record<string, unknown>;
    expect((parsed.user1 as Record<string, unknown>).name).toBe('Alice');
  });

  it('should handle arrays in JSON', () => {
    const json = JSON.stringify({
      user1: { name: 'Alice', tags: ['admin', 'user'] },
    });
    const xdon = fromJSON(json);
    expect(xdon).toContain('tags[]');
  });

  it('should handle null in JSON', () => {
    const json = JSON.stringify({
      user1: { name: 'Alice', age: null },
    });
    const xdon = fromJSON(json);
    expect(xdon).toContain('null');
  });
});
