/**
 * Complex Objects: JSON vs LMON with Preloaded Headers
 * 
 * Scenario: Single complex object repeated multiple times
 * e.g., user profiles sent via API, each call sends 1-5 records
 * 
 * Key insight: Preload the header once, then each record is just data
 */

import { expand } from './packages/lmon/src/index';

function countTokens(text: string): number {
  return text.split(/[\s\(\)\{\}\[\],":]+/).filter(t => t.length > 0).length;
}

// COMPLEX NESTED SCHEMA: user profile
// id, name, email, role, active, tags[], profile:(bio, social:(twitter, github, linkedin)), metadata:(department, location, created_at)

const complexUserJSON = {
  id: 1,
  name: "Alice Chen",
  email: "alice.chen@example.com",
  role: "senior_engineer",
  active: true,
  tags: ["backend", "devops", "mentor"],
  profile: {
    bio: "Full-stack engineer with 8 years experience",
    social: {
      twitter: "@alicechen",
      github: "alicechen",
      linkedin: "alice-chen-12345"
    }
  },
  metadata: {
    department: "engineering",
    location: "San Francisco",
    created_at: "2020-01-15"
  }
};

const jsonSingle = JSON.stringify(complexUserJSON, null, 2);

const lmonHeader = `(id,name,email,role,active,tags[],profile:(bio,social:(twitter,github,linkedin)),metadata:(department,location,created_at))`;

const lmonSingleRecord = `${lmonHeader}
{1,Alice Chen,alice.chen@example.com,senior_engineer,true,[backend,devops,mentor],{Full-stack engineer with 8 years experience,{@alicechen,alicechen,alice-chen-12345}},{engineering,San Francisco,2020-01-15}}`;

// Test: 5 users (simulating batch API calls with same schema)
const jsonMultiple = JSON.stringify([
  complexUserJSON,
  { ...complexUserJSON, id: 2, name: "Bob Smith", email: "bob@example.com", tags: ["frontend", "ui"], profile: { bio: "React specialist", social: { twitter: "@bobsmith", github: "bobsmith", linkedin: "bob-smith" } }, metadata: { department: "frontend", location: "NYC", created_at: "2021-03-20" } },
  { ...complexUserJSON, id: 3, name: "Carol Davis", email: "carol@example.com", tags: ["data", "ml"], profile: { bio: "ML engineer", social: { twitter: "@caroldavis", github: "caroldavis", linkedin: "carol-davis" } }, metadata: { department: "ml", location: "Boston", created_at: "2019-06-10" } },
  { ...complexUserJSON, id: 4, name: "David Lee", email: "david@example.com", tags: ["devops", "infra"], profile: { bio: "Infrastructure expert", social: { twitter: "@davidlee", github: "davidlee", linkedin: "david-lee" } }, metadata: { department: "infra", location: "Seattle", created_at: "2021-09-01" } },
  { ...complexUserJSON, id: 5, name: "Emma Wilson", email: "emma@example.com", tags: ["product", "pm"], profile: { bio: "Product manager", social: { twitter: "@emmaw", github: "emmaw", linkedin: "emma-wilson" } }, metadata: { department: "product", location: "LA", created_at: "2022-02-14" } }
], null, 2);

const lmonMultipleRecords = `${lmonHeader}
{1,Alice Chen,alice.chen@example.com,senior_engineer,true,[backend,devops,mentor],{Full-stack engineer with 8 years experience,{@alicechen,alicechen,alice-chen-12345}},{engineering,San Francisco,2020-01-15}}
{2,Bob Smith,bob@example.com,senior_engineer,true,[frontend,ui],{React specialist,{@bobsmith,bobsmith,bob-smith}},{frontend,NYC,2021-03-20}}
{3,Carol Davis,carol@example.com,senior_engineer,true,[data,ml],{ML engineer,{@caroldavis,caroldavis,carol-davis}},{ml,Boston,2019-06-10}}
{4,David Lee,david@example.com,senior_engineer,true,[devops,infra],{Infrastructure expert,{@davidlee,davidlee,david-lee}},{infra,Seattle,2021-09-01}}
{5,Emma Wilson,emma@example.com,senior_engineer,true,[product,pm],{Product manager,{@emmaw,emmaw,emma-wilson}},{product,LA,2022-02-14}}`;

// Preloaded header (API server caches this, clients just send data rows)
const headerMacro = `%h = "${lmonHeader}"`;
const lmonWithHeaderMacro = `%h = "${lmonHeader}"

%h
{1,Alice Chen,alice.chen@example.com,senior_engineer,true,[backend,devops,mentor],{Full-stack engineer with 8 years experience,{@alicechen,alicechen,alice-chen-12345}},{engineering,San Francisco,2020-01-15}}
{2,Bob Smith,bob@example.com,senior_engineer,true,[frontend,ui],{React specialist,{@bobsmith,bobsmith,bob-smith}},{frontend,NYC,2021-03-20}}
{3,Carol Davis,carol@example.com,senior_engineer,true,[data,ml],{ML engineer,{@caroldavis,caroldavis,carol-davis}},{ml,Boston,2019-06-10}}
{4,David Lee,david@example.com,senior_engineer,true,[devops,infra],{Infrastructure expert,{@davidlee,davidlee,david-lee}},{infra,Seattle,2021-09-01}}
{5,Emma Wilson,emma@example.com,senior_engineer,true,[product,pm],{Product manager,{@emmaw,emmaw,emma-wilson}},{product,LA,2022-02-14}}`;

// With preloaded header via initialContext
const lmonDataRowsOnly = `%h
{1,Alice Chen,alice.chen@example.com,senior_engineer,true,[backend,devops,mentor],{Full-stack engineer with 8 years experience,{@alicechen,alicechen,alice-chen-12345}},{engineering,San Francisco,2020-01-15}}
{2,Bob Smith,bob@example.com,senior_engineer,true,[frontend,ui],{React specialist,{@bobsmith,bobsmith,bob-smith}},{frontend,NYC,2021-03-20}}
{3,Carol Davis,carol@example.com,senior_engineer,true,[data,ml],{ML engineer,{@caroldavis,caroldavis,carol-davis}},{ml,Boston,2019-06-10}}
{4,David Lee,david@example.com,senior_engineer,true,[devops,infra],{Infrastructure expert,{@davidlee,davidlee,david-lee}},{infra,Seattle,2021-09-01}}
{5,Emma Wilson,emma@example.com,senior_engineer,true,[product,pm],{Product manager,{@emmaw,emmaw,emma-wilson}},{product,LA,2022-02-14}}`;

const headerContext = new Map([
  ['h', { body: lmonHeader, params: null, sourceLine: 0 }],
]);

console.log('=== Complex Nested Objects: JSON vs LMON with Preloaded Headers ===\n');
console.log('Schema: User Profile with nested social links and metadata\n');

// Single record comparison
console.log('--- SCENARIO 1: SINGLE COMPLEX RECORD ---\n');
const jsonSingleBytes = Buffer.byteLength(jsonSingle, 'utf8');
const jsonSingleTokens = countTokens(jsonSingle);
const lmonSingleBytes = Buffer.byteLength(lmonSingleRecord, 'utf8');
const lmonSingleTokens = countTokens(lmonSingleRecord);

console.log(`JSON (single record):`);
console.log(`  Bytes: ${jsonSingleBytes}`);
console.log(`  Tokens: ${jsonSingleTokens}`);

console.log(`\nLMON (single record, no preloading):`);
console.log(`  Bytes: ${lmonSingleBytes}`);
console.log(`  Tokens: ${lmonSingleTokens}`);
const singleSavings = ((jsonSingleBytes - lmonSingleBytes) / jsonSingleBytes * 100).toFixed(1);
const singleTokenSavings = ((jsonSingleTokens - lmonSingleTokens) / jsonSingleTokens * 100).toFixed(1);
console.log(`  Savings: ${singleSavings}% bytes, ${singleTokenSavings}% tokens`);

// Multiple records comparison
console.log('\n--- SCENARIO 2: FIVE RECORDS (BATCH API) ---\n');
const jsonMultipleBytes = Buffer.byteLength(jsonMultiple, 'utf8');
const jsonMultipleTokens = countTokens(jsonMultiple);
const lmonMultipleBytes = Buffer.byteLength(lmonMultipleRecords, 'utf8');
const lmonMultipleTokens = countTokens(lmonMultipleRecords);

console.log(`JSON (5 records):`);
console.log(`  Bytes: ${jsonMultipleBytes}`);
console.log(`  Tokens: ${jsonMultipleTokens}`);

console.log(`\nLMON (5 records, header inline):`);
console.log(`  Bytes: ${lmonMultipleBytes}`);
console.log(`  Tokens: ${lmonMultipleTokens}`);
const multipleSavings = ((jsonMultipleBytes - lmonMultipleBytes) / jsonMultipleBytes * 100).toFixed(1);
const multipleTokenSavings = ((jsonMultipleTokens - lmonMultipleTokens) / jsonMultipleTokens * 100).toFixed(1);
console.log(`  Savings: ${multipleSavings}% bytes, ${multipleTokenSavings}% tokens`);

// Preloaded header scenario
const lmonDataOnlyBytes = Buffer.byteLength(lmonDataRowsOnly, 'utf8');
const expandedDataOnly = expand(lmonDataRowsOnly, { initialContext: headerContext });
const expandedDataOnlyBytes = Buffer.byteLength(expandedDataOnly, 'utf8');
const lmonDataOnlyTokens = countTokens(lmonDataRowsOnly);

console.log(`\nLMON (5 records, header PRELOADED via initialContext):`);
console.log(`  Input bytes (just data rows): ${lmonDataOnlyBytes}`);
console.log(`  Output bytes (after expansion): ${expandedDataOnlyBytes}`);
console.log(`  Input tokens: ${lmonDataOnlyTokens}`);
const preloadedSavings = ((jsonMultipleBytes - lmonDataOnlyBytes) / jsonMultipleBytes * 100).toFixed(1);
const preloadedTokenSavings = ((jsonMultipleTokens - lmonDataOnlyTokens) / jsonMultipleTokens * 100).toFixed(1);
console.log(`  Savings vs JSON (input): ${preloadedSavings}% bytes, ${preloadedTokenSavings}% tokens`);

// Per-record analysis
console.log('\n--- PER-RECORD COST ANALYSIS ---\n');
const headerSize = Buffer.byteLength(lmonHeader, 'utf8');
const jsonPerRecord = jsonMultipleBytes / 5;
const lmonPerRecordWithHeader = lmonMultipleBytes / 5;
const lmonPerRecordDataOnly = lmonDataOnlyBytes / 5;

console.log(`Header size: ${headerSize} bytes`);
console.log(`Average record size (JSON): ${jsonPerRecord.toFixed(1)} bytes`);
console.log(`Average record size (LMON with header): ${lmonPerRecordWithHeader.toFixed(1)} bytes`);
console.log(`Average record size (LMON data rows only): ${lmonPerRecordDataOnly.toFixed(1)} bytes`);

const perRecordSavings = ((jsonPerRecord - lmonPerRecordDataOnly) / jsonPerRecord * 100).toFixed(1);
console.log(`\n✓ Per-record savings with preloaded header: ${perRecordSavings}%`);

// Long-term savings (10+ API calls)
console.log('\n--- CUMULATIVE SAVINGS (10 API CALLS, 5 RECORDS EACH) ---\n');
const totalRecords = 50;
const jsonTotal = jsonMultipleBytes * 10;
const lmonWithHeaderTotal = lmonMultipleBytes * 10;
const lmonPreloadedTotal = (headerSize + lmonDataOnlyBytes) + (lmonDataOnlyBytes * 9); // header once, then 9 more calls

console.log(`JSON (50 records across 10 calls): ${jsonTotal} bytes`);
console.log(`LMON with inline header (10 calls): ${lmonWithHeaderTotal} bytes`);
console.log(`LMON with preloaded header (header once, 9 data calls): ${lmonPreloadedTotal} bytes`);
console.log(`\nSavings with preload: ${((lmonWithHeaderTotal - lmonPreloadedTotal) / lmonWithHeaderTotal * 100).toFixed(1)}% of LMON size`);
console.log(`                      ${((jsonTotal - lmonPreloadedTotal) / jsonTotal * 100).toFixed(1)}% vs JSON total`);

// Summary table
console.log('\n=== SUMMARY TABLE ===\n');
console.log('| Scenario | Bytes | Tokens | Savings vs JSON |');
console.log('|----------|-------|--------|-----------------|');
console.log(`| JSON (single) | ${jsonSingleBytes} | ${jsonSingleTokens} | — |`);
console.log(`| LMON (single) | ${lmonSingleBytes} | ${lmonSingleTokens} | ${singleSavings}%, ${singleTokenSavings}% |`);
console.log(`| JSON (5 records) | ${jsonMultipleBytes} | ${jsonMultipleTokens} | — |`);
console.log(`| LMON (5 records, header inline) | ${lmonMultipleBytes} | ${lmonMultipleTokens} | ${multipleSavings}%, ${multipleTokenSavings}% |`);
console.log(`| LMON (5 records, header preloaded) | ${lmonDataOnlyBytes} | ${lmonDataOnlyTokens} | ${preloadedSavings}%, ${preloadedTokenSavings}% |`);

console.log('\n=== KEY INSIGHTS ===\n');
console.log(`✓ Single record: Only ${singleSavings}% savings (headers not amortized)`);
console.log(`✓ Batch (5 records): ${multipleSavings}% savings with inline header`);
console.log(`✓ Batch with preloaded header: ${preloadedSavings}% savings (best case)`);
console.log(`✓ Per-record cost reduction: ${perRecordSavings}% with preloading`);
console.log(`\nWinner for APIs: LMON with preloaded headers`);
console.log(`  - Server caches complex header once`);
console.log(`  - Clients send only data rows`);
console.log(`  - ${preloadedSavings}% bytes savings across all records`);
console.log(`  - Scales better as complexity increases`);
