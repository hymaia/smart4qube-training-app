import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { findDuplicate, validateFinding, type Issue } from './reviewer.js';

// A tiny fake RocketNouilles repo: one 3-line file.
const repo = mkdtempSync(path.join(tmpdir(), 'rn-'));
mkdirSync(path.join(repo, 'server/src/promo'), { recursive: true });
writeFileSync(path.join(repo, 'server/src/promo/engine.ts'), 'const a = 1;\nconst total = price - discount;\nexport { a };\n');

const finding = {
  filePath: 'server/src/promo/engine.ts',
  line: 2,
  snippet: 'price - discount',
  rule: 'S100',
};

const rejected = (input: Partial<typeof finding>) => {
  const error = validateFinding(repo, { ...finding, ...input });
  assert.notEqual(error, null, 'expected the finding to be rejected');
  return error ?? '';
};

test('accepts a valid finding', () => {
  assert.equal(validateFinding(repo, finding), null);
});

test('rejects a line beyond the end of the file with the file length', () => {
  assert.match(rejected({ line: 42 }), /line 42 is outside .* 3 lines/);
});

test('rejects unknown files, absolute paths and traversal', () => {
  assert.match(rejected({ filePath: 'promo/engine.ts' }), /does not exist/);
  assert.match(rejected({ filePath: '/abs/engine.ts' }), /relative/);
  assert.match(rejected({ filePath: '../x.ts' }), /relative/);
});

test('rejects a snippet that is not on the given line and points to the right one', () => {
  assert.match(rejected({ line: 1 }), /appears on line\(s\) 2/);
});

test('rejects a rule outside the catalog', () => {
  assert.match(rejected({ rule: 'S999' }), /not in the catalog/);
});

test('duplicates: same file and rule within 3 lines', () => {
  const existing = [{ id: 'iss-1', filePath: 'a.ts', line: 10, rule: 'S100' }] as Issue[];
  assert.equal(findDuplicate(existing, { filePath: 'a.ts', line: 12, rule: 'S100' })?.id, 'iss-1');
  assert.equal(findDuplicate(existing, { filePath: 'a.ts', line: 14, rule: 'S100' }), undefined);
  assert.equal(findDuplicate(existing, { filePath: 'a.ts', line: 10, rule: 'S300' }), undefined);
});
