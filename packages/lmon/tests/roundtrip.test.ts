import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../src/parser';
import { stringify } from '../src/stringifier';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

const fixtures = [
  'basic',
  'no-header',
  'arrays',
  'nested',
  'types',
  'escaped',
  'empty-values',
];

describe('Round-trip Integration Tests', () => {
  fixtures.forEach((fixture) => {
    it(`should round-trip fixture: ${fixture}`, () => {
      const lmonPath = join(fixturesDir, `${fixture}.lmon`);
      const jsonPath = join(fixturesDir, `${fixture}.json`);

      const lmonText = readFileSync(lmonPath, 'utf-8');
      const expectedJson = JSON.parse(readFileSync(jsonPath, 'utf-8'));

      const parsed = parse(lmonText);
      expect(parsed).toEqual(expectedJson);
    });

    it(`should stringify and re-parse fixture: ${fixture}`, () => {
      const lmonPath = join(fixturesDir, `${fixture}.lmon`);
      const jsonPath = join(fixturesDir, `${fixture}.json`);

      const lmonText = readFileSync(lmonPath, 'utf-8');
      const expectedJson = JSON.parse(readFileSync(jsonPath, 'utf-8'));

      const parsed = parse(lmonText);
      const stringified = stringify(parsed);
      const reparsed = parse(stringified);

      expect(reparsed).toEqual(parsed);
    });
  });
});
