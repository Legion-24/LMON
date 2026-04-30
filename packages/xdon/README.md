# @legion24/xdon — JavaScript/TypeScript

XDON parser and stringifier for Node.js and browsers. Includes optional macro preprocessing.

---

## Installation

```bash
npm install @legion24/xdon
```

---

## Usage

### Parse XDON

```typescript
import { parse } from '@legion24/xdon';

const xdon = `
(name,age,role)
alice:{Alice,30,admin}
bob:{Bob,25,user}
`;

const data = parse(xdon);
// {
//   alice: { name: 'Alice', age: 30, role: 'admin' },
//   bob: { name: 'Bob', age: 25, role: 'user' }
// }
```

### Stringify to XDON

```typescript
import { stringify } from '@legion24/xdon';

const data = [
  { name: 'Alice', role: 'admin', active: true },
  { name: 'Bob', role: 'user', active: false },
];

const xdon = stringify(data);
// (name,role,active)
// {Alice,admin,true}
// {Bob,user,false}
```

### Macros (Preprocessing)

Use macros to reduce repetition and add dynamic values:

```typescript
import { expand, parse } from '@legion24/xdon';

const xdonWithMacros = `
%header = "(id,name,email)"
%admin = "true"

%header
emp1:{1,Alice,alice@example.com,%admin}
emp2:{2,Bob,bob@example.com,false}
`;

const expanded = expand(xdonWithMacros);
const data = parse(expanded);
```

**Simple macros:**
- `%name = "value"` — define a variable
- `%name` — expand the variable

**Parameterized macros:**
- `%row(a,b) = "{a},{b}"` — template with placeholders
- `%row(x,y)` — expand with arguments

**Expression macros:**
- `%{2+3*4}` — evaluate arithmetic (14)

**Built-in macros:**
- `%_DATE_STR` — current date
- `%_TIME_STR` — current time
- `%_UUID` — random UUID v4
- `%_ENV(VAR)` — environment variable

See [MACROS.md](../../MACROS.md) for full documentation.

---

## API

### `parse(input, options?)`

Parse XDON and return a JavaScript object.

```typescript
parse(input: string, options?: ParseOptions): unknown;

interface ParseOptions {
  strict?: boolean; // default: true
}
```

### `stringify(data, options?)`

Convert a JavaScript object to XDON.

```typescript
stringify(data: unknown, options?: StringifyOptions): string;

interface StringifyOptions {
  // (future options for formatting, etc.)
}
```

### `expand(input, options?)`

Expand macros in XDON text (preprocessing step).

```typescript
expand(input: string, options?: ExpandOptions): string;

interface ExpandOptions {
  initialContext?: MacroContext;
  strict?: boolean;  // default: true
  maxDepth?: number; // default: 16
}

type MacroContext = Map<string, MacroDefinition>;

interface MacroDefinition {
  body: string;
  params: string[] | null;
  sourceLine: number;
}
```

### `parseToAST(input)`

Parse XDON and return the raw AST (for advanced use).

```typescript
parseToAST(input: string): XDONDocument;
```

---

## Error Handling

Both parse and expand throw typed errors:

```typescript
import { XDONParseError, XDONMacroError } from '@legion24/xdon';

try {
  const data = parse(malformed);
} catch (err) {
  if (err instanceof XDONParseError) {
    console.error(`Parse error at ${err.line}:${err.column}: ${err.message}`);
  }
}

try {
  const expanded = expand(xdonWithMacros);
} catch (err) {
  if (err instanceof XDONMacroError) {
    console.error(`Macro error at ${err.line}:${err.column}: ${err.message}`);
  }
}
```

---

## Examples

### Dynamic Data with Macros

```typescript
const xdon = `
%count = "5"
(id,value,generated)
{1,%{%count*10},%_DATE_STR}
{2,%{%count*20},%_DATE_STR}
`;

const expanded = expand(xdon);
const data = parse(expanded);
// [
//   { id: 1, value: 50, generated: '2026-04-30' },
//   { id: 2, value: 100, generated: '2026-04-30' }
// ]
```

### Pre-defined Macros

```typescript
const ctx = new Map([
  ['env', { body: 'production', params: null, sourceLine: 0 }],
  ['timeout', { body: '30000', params: null, sourceLine: 0 }],
]);

const xdon = `(env,timeout)
config:{%env,%timeout}`;

const expanded = expand(xdon, { initialContext: ctx });
const data = parse(expanded);
// { config: { env: 'production', timeout: 30000 } }
```

### Round-Trip (Parse → Stringify → Parse)

```typescript
const original = `(name,age)\nalice:{Alice,30}`;
const parsed = parse(original);
const stringified = stringify(parsed);
const reparsed = parse(stringified);

console.log(JSON.stringify(parsed) === JSON.stringify(reparsed)); // true
```

---

## Format Overview

XDON is a token-efficient alternative to JSON. It defines structure once in a header, then repeats only data:

```
(name,age,role)
alice:{Alice,30,admin}
bob:{Bob,25,user}
```

Parse to:
```json
{
  "alice": { "name": "Alice", "age": 30, "role": "admin" },
  "bob": { "name": "Bob", "age": 25, "role": "user" }
}
```

Features:
- **Token efficient** — 20–35% fewer tokens vs JSON for multi-record data
- **Type inference** — `null`, `true`/`false`, integers, floats, strings
- **Arrays & nesting** — full support for `[]` and nested `{}` blocks
- **Macros** — optional preprocessing for DRY, dynamic, and parameterized content

See [SPEC.md](../../SPEC.md) for full grammar.

---

## Packages

| Package | Language |
|---------|----------|
| `@legion24/xdon` | JavaScript / TypeScript (this) |
| `xdon` | Python |

---

## License

MIT
