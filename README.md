# LMON — Language Model Object Notation

A token-efficient structured data format designed for LLM output. Define your schema once, repeat only values — not keys.

---

## Why LMON?

JSON repeats keys for every object in an array. LMON defines the schema once in a header and repeats only the data, saving tokens on every record.

**JSON** (107 tokens):
```json
[
  {"id": 1, "name": "Alice", "role": "admin", "active": true},
  {"id": 2, "name": "Bob",   "role": "user",  "active": false},
  {"id": 3, "name": "Carol", "role": "user",  "active": true}
]
```

**LMON** (74 tokens — 31% fewer):
```
(id,name,role,active)
{1,Alice,admin,true}
{2,Bob,user,false}
{3,Carol,user,true}
```

### Benchmark Results

| Dataset | GPT-4 savings | Claude savings |
|---------|--------------|----------------|
| 1 record  | 19%  | 9%  |
| 3 records | 31%  | 31% |
| 20 records | 35% | —   |

Token savings improve with dataset size. For batched, multi-record workloads the gains are significant. See [benchmarks.md](./benchmarks.md) for the full methodology and cost analysis.

---

## Features

- **Token efficient** — 20–35% fewer tokens vs JSON for repeated-schema data
- **Round-trippable** — lossless conversion to and from JSON
- **Type inference** — bare values are typed automatically (`true`/`false`, integers, floats, `null`)
- **Arrays & nesting** — full support for array fields and nested objects
- **Simple grammar** — no complex escaping, easy for LLMs to generate reliably

---

## Installation

**JavaScript / TypeScript**
```bash
npm install lmon
```

**Python**
```bash
pip install lmon
```

---

## Usage

### JavaScript / TypeScript

```ts
import { parseLMON, stringifyLMON } from 'lmon';

// Stringify
const data = [
  { name: 'Alice', role: 'admin', active: true },
  { name: 'Bob',   role: 'user',  active: false },
];

const lmon = stringifyLMON(data);
// (name,role,active)
// {Alice,admin,true}
// {Bob,user,false}

// Parse
const parsed = parseLMON(lmon);
// [ { name: 'Alice', role: 'admin', active: true }, ... ]
```

### Python

```python
from lmon import parse, stringify

data = [
    {"name": "Alice", "role": "admin", "active": True},
    {"name": "Bob",   "role": "user",  "active": False},
]

lmon = stringify(data)
# (name,role,active)
# {Alice,admin,true}
# {Bob,user,false}

parsed = parse(lmon)
# [{'name': 'Alice', 'role': 'admin', 'active': True}, ...]
```

---

## Format at a Glance

```
(name,tags[],address:(city,zip))
alice:{Alice,[admin,developer],{NYC,10001}}
bob:{Bob,[user],{LA,90001}}
```

- **Header** `(...)` — defines field names and types once
- **Row label** `alice:` — optional key; produces an object if present, array if absent
- **Arrays** `[...]` — declared with `[]` suffix in the header
- **Nested objects** `{...}` — declared with `(sub,fields)` suffix in the header
- **Types** — inferred from bare values: `true`/`false`, integers, floats, `null`, strings

See [SPEC.md](./SPEC.md) for the full grammar and edge cases.

---

## Macros (Optional Preprocessing — [Full Docs](./MACROS.md))

LMON supports optional **text-level macros** that run before parsing. Use macros to reduce repetition, define reusable fragments, and dynamically generate LMON.

### Simple Macros

```typescript
import { expand, parse } from 'lmon';

const lmonWithMacros = `
%header = "(id,name,email)"
%admin = "true"

%header
emp1:{1,Alice,alice@example.com,%admin}
`;

const expanded = expand(lmonWithMacros);
// (id,name,email)
// emp1:{1,Alice,alice@example.com,true}

const parsed = parse(expanded);
// { emp1: { id: 1, name: "Alice", email: "alice@example.com", admin: true } }
```

### Parameterized Macros

```typescript
const lmonWithMacros = `
%row(id,name,email) = "{id,name,email}"

(id,name,email)
emp1:%row(1,Alice,alice@example.com)
emp2:%row(2,Bob,bob@example.com)
`;

const expanded = expand(lmonWithMacros);
// (id,name,email)
// emp1:{1,Alice,alice@example.com}
// emp2:{2,Bob,bob@example.com}
```

### Expressions & Built-In Macros

```typescript
const lmonWithMacros = `
%count = "3"
(id,name,count,date)
{1,Alice,%{%count+10},%_DATE_STR}
{2,Bob,%{%count+20},%_DATE_STR}
`;

const expanded = expand(lmonWithMacros);
// (id,name,count,date)
// {1,Alice,13,2026-04-30}
// {2,Bob,23,2026-04-30}
```

**Built-in macros** (always available):
- `%_DATE_STR` — current date (YYYY-MM-DD)
- `%_TIME_STR` — current time (HH:MM:SS)
- `%_DATETIME_STR` — full ISO 8601 datetime
- `%_TIMESTAMP` — Unix timestamp in seconds
- `%_DAY_STR` — day of week name
- `%_UUID` — random UUID v4
- `%_ENV(VAR)` — environment variable value

See [SPEC.md](./SPEC.md) for complete macro syntax and rules.

---

## LLM Integration

To get LMON output from an LLM, include the schema and a short example in your system prompt:

```
Respond using LMON format. Define the schema in a header on the first line, then one record per line.

Example:
(name,age,role)
{Alice,30,admin}
{Bob,25,user}
```

Parse the response with this library and convert to JSON for downstream use. If the model produces malformed output, fall back to JSON parsing with a warning.

---

## When to Use LMON

**Good fit:**
- Batched structured output (3+ records per call)
- Cost-sensitive, high-volume pipelines
- Context-window-constrained workloads

**Not ideal:**
- Single-record responses (savings are modest)
- Deeply nested, sparse, or irregular data
- Human-facing APIs where JSON familiarity matters

---

## Packages

| Package | Language | Path |
|---------|----------|------|
| `lmon` | TypeScript / JavaScript | [`packages/lmon-ts`](./packages/lmon-ts) |
| `lmon` | Python | [`packages/lmon-py`](./packages/lmon-py) |

---

## Contributing

Issues and PRs are welcome. Please read [SPEC.md](./SPEC.md) before contributing to the parser — the spec is the source of truth.

---

## License

MIT — see [LICENSE](./LICENSE)
