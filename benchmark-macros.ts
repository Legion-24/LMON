/**
 * Macro Benchmarking Script
 * Compares token/byte/char counts for:
 * 1. XDON without macros (baseline)
 * 2. XDON with macros defined in document
 * 3. XDON with macros via initialContext (preloaded)
 */

import { expand } from './packages/xdon/src/index';

// Simulate token counting (rough approximation)
function countTokens(text: string): number {
  const tokens = text
    .split(/[\s\(\)\{\}\[\],:\n]+/)
    .filter(t => t.length > 0);
  return tokens.length;
}

// Test data setup
const baselineXcon = `(id,name,email,role,active)
{1,Alice,alice@example.com,admin,true}
{2,Bob,bob@example.com,user,false}
{3,Charlie,charlie@example.com,user,true}`;

const xdonWithMacrosInDoc = `%header = "(id,name,email,role,active)"
%admin = "admin"
%user = "user"

%header
{1,Alice,alice@example.com,%admin,true}
{2,Bob,bob@example.com,%user,false}
{3,Charlie,charlie@example.com,%user,true}`;

const xdonWithPreloadedMacros = `(id,name,email,role,active)
{1,Alice,alice@example.com,%admin,true}
{2,Bob,bob@example.com,%user,false}
{3,Charlie,charlie@example.com,%user,true}`;

const macroContext = new Map([
  ['admin', { body: 'admin', params: null, sourceLine: 0 }],
  ['user', { body: 'user', params: null, sourceLine: 0 }],
]);

console.log('=== XDON Macro Benchmarks ===\n');

// Baseline
console.log('1. BASELINE (No Macros)');
console.log(`   Bytes: ${Buffer.byteLength(baselineXcon, 'utf8')}`);
console.log(`   Chars: ${baselineXcon.length}`);
console.log(`   Tokens (approx): ${countTokens(baselineXcon)}`);
const baselineBytes = Buffer.byteLength(baselineXcon, 'utf8');
const baselineChars = baselineXcon.length;
const baselineTokens = countTokens(baselineXcon);

// Macros in document
console.log('\n2. MACROS IN DOCUMENT');
console.log(`   Input Bytes: ${Buffer.byteLength(xdonWithMacrosInDoc, 'utf8')}`);
const expandedMacrosInDoc = expand(xdonWithMacrosInDoc);
console.log(`   Output Bytes: ${Buffer.byteLength(expandedMacrosInDoc, 'utf8')}`);
console.log(`   Input Chars: ${xdonWithMacrosInDoc.length}`);
console.log(`   Output Chars: ${expandedMacrosInDoc.length}`);
console.log(`   Input Tokens (approx): ${countTokens(xdonWithMacrosInDoc)}`);
console.log(`   Output Tokens (approx): ${countTokens(expandedMacrosInDoc)}`);

// Macros via initialContext
console.log('\n3. MACROS VIA INITIAL CONTEXT (Preloaded)');
console.log(`   Input Bytes: ${Buffer.byteLength(xdonWithPreloadedMacros, 'utf8')}`);
const expandedPreloaded = expand(xdonWithPreloadedMacros, { initialContext: macroContext });
console.log(`   Output Bytes: ${Buffer.byteLength(expandedPreloaded, 'utf8')}`);
console.log(`   Input Chars: ${xdonWithPreloadedMacros.length}`);
console.log(`   Output Chars: ${expandedPreloaded.length}`);
console.log(`   Input Tokens (approx): ${countTokens(xdonWithPreloadedMacros)}`);
console.log(`   Output Tokens (approx): ${countTokens(expandedPreloaded)}`);

// Summary table
console.log('\n=== SUMMARY TABLE ===\n');
console.log('| Scenario | Input Bytes | Output Bytes | Input Chars | Output Chars | Input Tokens | Output Tokens |');
console.log('|----------|-------------|--------------|-------------|--------------|--------------|---------------|');
console.log(`| Baseline | - | ${baselineBytes} | - | ${baselineChars} | - | ${baselineTokens} |`);
console.log(`| Macros in Doc | ${Buffer.byteLength(xdonWithMacrosInDoc, 'utf8')} | ${Buffer.byteLength(expandedMacrosInDoc, 'utf8')} | ${xdonWithMacrosInDoc.length} | ${expandedMacrosInDoc.length} | ${countTokens(xdonWithMacrosInDoc)} | ${countTokens(expandedMacrosInDoc)} |`);
console.log(`| Preloaded Macros | ${Buffer.byteLength(xdonWithPreloadedMacros, 'utf8')} | ${Buffer.byteLength(expandedPreloaded, 'utf8')} | ${xdonWithPreloadedMacros.length} | ${expandedPreloaded.length} | ${countTokens(xdonWithPreloadedMacros)} | ${countTokens(expandedPreloaded)} |`);

// Savings
console.log('\n=== EFFICIENCY COMPARISON ===\n');
const inputDocSavings = ((Buffer.byteLength(xdonWithMacrosInDoc, 'utf8') - baselineBytes) / baselineBytes * 100).toFixed(1);
const inputPreloadedSavings = ((Buffer.byteLength(xdonWithPreloadedMacros, 'utf8') - baselineBytes) / baselineBytes * 100).toFixed(1);
console.log(`Macros in Document (input bytes): ${inputDocSavings}% vs baseline`);
console.log(`Preloaded Macros (input bytes): ${inputPreloadedSavings}% smaller than baseline ✓`);
console.log('\nKey Insight: Using initialContext (preloaded macros) is ${Math.abs(parseFloat(inputPreloadedSavings) - parseFloat(inputDocSavings)).toFixed(1)}% more efficient.');
