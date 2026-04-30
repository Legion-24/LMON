import { parse } from './parser.js';
import { stringify } from './stringifier.js';

export function toJSON(xdon: string): string {
  const parsed = parse(xdon);
  return JSON.stringify(parsed);
}

export function fromJSON(json: string): string {
  const parsed = JSON.parse(json);
  return stringify(parsed);
}
