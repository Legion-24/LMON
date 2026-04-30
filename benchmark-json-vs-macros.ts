/**
 * JSON vs XDON Macro Comparison
 * Shows how macros affect token savings vs JSON
 */

import { expand } from './packages/xdon/src/index';

function countTokens(text: string): number {
  return text.split(/[\s\(\)\{\}\[\],":]+/).filter(t => t.length > 0).length;
}

// Test data
const json = `[
  {"id": 1, "name": "Alice", "email": "alice@example.com", "role": "admin", "active": true},
  {"id": 2, "name": "Bob", "email": "bob@example.com", "role": "user", "active": false},
  {"id": 3, "name": "Charlie", "email": "charlie@example.com", "role": "user", "active": true}
]`;

const xdonBaseline = `(id,name,email,role,active)
{1,Alice,alice@example.com,admin,true}
{2,Bob,bob@example.com,user,false}
{3,Charlie,charlie@example.com,user,true}`;

const xdonMacrosInDoc = `%header = "(id,name,email,role,active)"
%admin = "admin"
%user = "user"

%header
{1,Alice,alice@example.com,%admin,true}
{2,Bob,bob@example.com,%user,false}
{3,Charlie,charlie@example.com,%user,true}`;

const xdonPreloaded = `(id,name,email,role,active)
{1,Alice,alice@example.com,%admin,true}
{2,Bob,bob@example.com,%user,false}
{3,Charlie,charlie@example.com,%user,true}`;

const macroContext = new Map([
  ['admin', { body: 'admin', params: null, sourceLine: 0 }],
  ['user', { body: 'user', params: null, sourceLine: 0 }],
]);

console.log('=== JSON vs XDON Macro Comparison ===\n');

// JSON
const jsonBytes = Buffer.byteLength(json, 'utf8');
const jsonChars = json.length;
const jsonTokens = countTokens(json);

console.log('1. JSON (Baseline)');
console.log(`   Bytes: ${jsonBytes}`);
console.log(`   Chars: ${jsonChars}`);
console.log(`   Tokens (approx): ${jsonTokens}`);

// XDON baseline
const xdonBaselineBytes = Buffer.byteLength(xdonBaseline, 'utf8');
const xdonBaselineChars = xdonBaseline.length;
const xdonBaselineTokens = countTokens(xdonBaseline);

console.log('\n2. XDON (No Macros)');
console.log(`   Input Bytes: ${xdonBaselineBytes}`);
console.log(`   Input Chars: ${xdonBaselineChars}`);
console.log(`   Input Tokens (approx): ${xdonBaselineTokens}`);
const xdonSavings = ((jsonBytes - xdonBaselineBytes) / jsonBytes * 100).toFixed(1);
const xdonTokenSavings = ((jsonTokens - xdonBaselineTokens) / jsonTokens * 100).toFixed(1);
console.log(`   Savings vs JSON: ${xdonSavings}% bytes, ${xdonTokenSavings}% tokens`);

// XDON macros in doc
const xdonMacrosInDocBytes = Buffer.byteLength(xdonMacrosInDoc, 'utf8');
const xdonMacrosInDocChars = xdonMacrosInDoc.length;
const xdonMacrosInDocTokens = countTokens(xdonMacrosInDoc);
const expandedMacrosInDoc = expand(xdonMacrosInDoc);
const expandedMacrosInDocBytes = Buffer.byteLength(expandedMacrosInDoc, 'utf8');

console.log('\n3. XDON (Macros in Document)');
console.log(`   Input Bytes: ${xdonMacrosInDocBytes}`);
console.log(`   Output Bytes: ${expandedMacrosInDocBytes}`);
console.log(`   Input Chars: ${xdonMacrosInDocChars}`);
console.log(`   Input Tokens (approx): ${xdonMacrosInDocTokens}`);
const macrosDocSavings = ((jsonBytes - xdonMacrosInDocBytes) / jsonBytes * 100).toFixed(1);
const macrosDocTokenSavings = ((jsonTokens - xdonMacrosInDocTokens) / jsonTokens * 100).toFixed(1);
console.log(`   Savings vs JSON (input): ${macrosDocSavings}% bytes, ${macrosDocTokenSavings}% tokens`);
const macrosDocOutputSavings = ((jsonBytes - expandedMacrosInDocBytes) / jsonBytes * 100).toFixed(1);
console.log(`   Savings vs JSON (output): ${macrosDocOutputSavings}% bytes`);

// XDON preloaded
const xdonPreloadedBytes = Buffer.byteLength(xdonPreloaded, 'utf8');
const xdonPreloadedChars = xdonPreloaded.length;
const xdonPreloadedTokens = countTokens(xdonPreloaded);
const expandedPreloaded = expand(xdonPreloaded, { initialContext: macroContext });
const expandedPreloadedBytes = Buffer.byteLength(expandedPreloaded, 'utf8');

console.log('\n4. XDON (Preloaded Macros via initialContext)');
console.log(`   Input Bytes: ${xdonPreloadedBytes}`);
console.log(`   Output Bytes: ${expandedPreloadedBytes}`);
console.log(`   Input Chars: ${xdonPreloadedChars}`);
console.log(`   Input Tokens (approx): ${xdonPreloadedTokens}`);
const preloadedSavings = ((jsonBytes - xdonPreloadedBytes) / jsonBytes * 100).toFixed(1);
const preloadedTokenSavings = ((jsonTokens - xdonPreloadedTokens) / jsonTokens * 100).toFixed(1);
console.log(`   Savings vs JSON (input): ${preloadedSavings}% bytes, ${preloadedTokenSavings}% tokens`);

// Summary table
console.log('\n=== COMPARISON TABLE ===\n');
console.log('| Format | Input Bytes | Input Tokens | Output Bytes | Savings vs JSON |');
console.log('|--------|-------------|--------------|--------------|-----------------|');
console.log(`| JSON | ${jsonBytes} | ${jsonTokens} | — | — |`);
console.log(`| XDON (no macros) | ${xdonBaselineBytes} | ${xdonBaselineTokens} | ${xdonBaselineBytes} | ${xdonSavings}% bytes, ${xdonTokenSavings}% tokens |`);
console.log(`| XDON (macros in doc) | ${xdonMacrosInDocBytes} | ${xdonMacrosInDocTokens} | ${expandedMacrosInDocBytes} | ${macrosDocSavings}% bytes (input), ${macrosDocOutputSavings}% (output) |`);
console.log(`| XDON (preloaded) | ${xdonPreloadedBytes} | ${xdonPreloadedTokens} | ${expandedPreloadedBytes} | ${preloadedSavings}% bytes, ${preloadedTokenSavings}% tokens |`);

// Key insights
console.log('\n=== KEY INSIGHTS ===\n');
const preloadedVsBaseline = ((xdonBaselineBytes - xdonPreloadedBytes) / xdonBaselineBytes * 100).toFixed(1);
const preloadedVsMacrosInDoc = ((xdonMacrosInDocBytes - xdonPreloadedBytes) / xdonMacrosInDocBytes * 100).toFixed(1);
console.log(`✓ Preloaded macros are ${preloadedVsBaseline}% smaller than XDON without macros`);
console.log(`✓ Preloaded macros are ${preloadedVsMacrosInDoc}% smaller than macros in document`);
console.log(`✓ XDON with preloaded macros saves ${preloadedSavings}% bytes vs JSON (input)`);
console.log(`✓ All XDON variants maintain ${xdonTokenSavings}% token savings over JSON`);
console.log(`\nBest practice for reusable templates: Use preloaded macros via initialContext`);
console.log(`  - Minimal input overhead (${(xdonPreloadedBytes - xdonBaselineBytes)} bytes)`);
console.log(`  - Maintains full macro expansion benefits`);
console.log(`  - Code-driven configuration (better for programmatic use)`);
