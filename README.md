# XCON

> eXtensible Compact Object Notation — the universal data format for the schema-known world

XCON is a schema-ambient structured data format. Because the schema is declared once and shared, payloads carry only values — no repeated keys, no structural overhead. This makes XCON 30–40% smaller than JSON as text and up to 72% smaller in binary (BXCON).

XCON spans the full data stack: a compact text format, a binary wire encoding, schema declaration and versioning, a macro system with cross-language callback bindings, a streaming protocol, and a federation layer for cross-server queries.

---

## Why XCON?

JSON repeats keys for every object in an array. XCON declares the schema once in a header and repeats only values, saving bytes (and tokens) on every record.

**JSON** (107 tokens):
```json
[
  {"id": 1, "name": "Alice", "role": "admin", "active": true},
  {"id": 2, "name": "Bob",   "role": "user",  "active": false},
  {"id": 3, "name": "Carol", "role": "user",  "active": true}
]
```

**XCON** (74 tokens — 31% fewer):
```
(id,name,role,active)
{1,Alice,admin,true}
{2,Bob,user,false}
{3,Carol,user,true}
```

See [benchmarks.md](./benchmarks.md) for the full methodology and cost analysis.

---

## Layer Specification

XCON is a stack of cooperating layers, each replacing existing technologies:

| Layer | Replaces |
|-------|----------|
| **XCON/text** | JSON, CSV, TOML |
| **BXCON** (binary) | BSON, Protobuf, MessagePack |
| **XCON/schema** | JSON Schema, Avro IDL |
| **XCON/macros** | GraphQL resolvers, stored procedures, dbt |
| **XCON/stream** | NDJSON, SSE, chunked JSON |
| **XCON/lazy** | REST pagination, ORM lazy loading |
| **XCON/fed** | Presto, Trino, ETL pipelines |

---

## Use Cases

### REST API payloads
Schema declared at endpoint root, responses carry only values. Cuts payload size 30–40% and removes per-row JSON parsing overhead.
*Replaces:* JSON-over-REST.

### SQL result sets
The query columns *are* the XCON header — a database result is XCON natively, no transcoding to JSON object-per-row.
*Replaces:* JSON serialization of cursor results.

### LLM tool calls and context
Schemas declared in the system prompt, tool calls and structured outputs encode only values. Reduces tokens per call by 20–35% and replaces verbose semi-XML system prompts.
*Replaces:* JSON tool call format, ad-hoc XML-tagged context.

### MCP protocol payloads
Tool definitions and results travel as XCON. Header negotiation happens once at session start.
*Replaces:* JSON-RPC body in MCP.

### Binary wire encoding (BXCON)
Header-prefix byte stream — type tags, varint lengths, no field names. 60–72% smaller than JSON, faster to decode than Protobuf when the schema is shared out-of-band.
*Replaces:* BSON, Protobuf, MessagePack.

### Streaming result sets
Header sent once, rows stream with row labels for out-of-order reassembly. Pause/resume without resync.
*Replaces:* NDJSON, SSE-with-JSON-payloads, chunked JSON.

### Database storage format
Document + relational hybrid: rows share a schema header, sub-documents nest under field declarations. Sharding works via root metadata + `@ref` expansion.
*Replaces:* BSON in document stores; row-format in relational stores.

### Server-driven UI / component trees
A component tree is just a typed tree. XCON encodes it with the schema as the component registry.
*Replaces:* JSON component descriptors.

### Federated cross-database queries
A query result from one server can `@ref` another server. Macros compose across federation boundaries — the client lazily expands references on demand.
*Replaces:* Presto, Trino, custom ETL.

---

## Format at a Glance

```
(name,tags[],address:(city,zip))
alice:{Alice,[admin,developer],{NYC,10001}}
bob:{Bob,[user],{LA,90001}}
```

- **Header** `(...)` — declares field names and types once
- **Row label** `alice:` — optional key; produces an object if present, array if absent
- **Arrays** `[...]` — declared with `[]` suffix in the header
- **Nested objects** `(sub,fields)` — sub-schemas declared inline
- **Types** — inferred from bare values: `true`/`false`, integers, floats, `null`, strings

See [SPEC.md](./SPEC.md) for the full grammar.

---

## Installation

**JavaScript / TypeScript**
```bash
npm install @legion24/xcon
```

**Python**
```bash
pip install xcon
```

---

## Usage

### JavaScript / TypeScript

```ts
import { parse, stringify } from '@legion24/xcon';

const data = [
  { name: 'Alice', role: 'admin', active: true },
  { name: 'Bob',   role: 'user',  active: false },
];

const xcon = stringify(data);
// (name,role,active)
// {Alice,admin,true}
// {Bob,user,false}

const parsed = parse(xcon);
```

### Python

```python
from xcon import parse, stringify

data = [
    {"name": "Alice", "role": "admin", "active": True},
    {"name": "Bob",   "role": "user",  "active": False},
]

xcon = stringify(data)
parsed = parse(xcon)
```

---

## JSON Adapter

XCON ships with a bidirectional JSON bridge. The adapter guarantees:

```ts
XCON.toJSON(XCON.fromJSON(x)) deepEquals x   // round-trip safe
```

- **Schema inference** — first JSON response infers an XCON schema and caches it for the endpoint
- **Content-type negotiation** — clients send `Accept: application/xcon, application/json;q=0.9`; servers fall back to JSON when XCON isn't supported
- **Drop-in adapters** — wrappers for `fetch`, `express`, `axios`, and `prisma` make XCON adoption a one-line change at the I/O boundary

```ts
// fetch
import { xconFetch } from '@legion24/xcon/adapters/fetch';
const users = await xconFetch('/api/users').then(r => r.json());

// express
import { xcon } from '@legion24/xcon/adapters/express';
app.use(xcon());   // negotiates content-type, transcodes responses

// axios
import { xconAxios } from '@legion24/xcon/adapters/axios';
const client = xconAxios.create({ baseURL: '/api' });

// prisma
import { xconResults } from '@legion24/xcon/adapters/prisma';
const rows = xconResults(await prisma.user.findMany());
```

---

## Macros

Macros run before parsing and bind to callbacks across JS, Python, and Rust. The full reference is in [MACROS.md](./MACROS.md).

| Macro | Purpose |
|-------|---------|
| `@ref` | Lazy field references |
| `@lazy` | Deferred expansion strategies |
| `@fn` | Function definitions, callback binding |
| `@sql` | SQL source macros |
| `@rest` | REST source macros |
| `@cache` | Caching decorator macros |
| `@macro` | Ambient context injection |

```ts
const x = `
%row(id,name,email) = "{id,name,email}"

(id,name,email)
emp1:%row(1,Alice,alice@example.com)
emp2:%row(2,Bob,bob@example.com)
`;
const expanded = expand(x);
```

---

## Packages

| Package | Language | Path |
|---------|----------|------|
| `@legion24/xcon` | TypeScript / JavaScript | [`packages/xcon`](./packages/xcon) |
| `xcon` | Python | [`packages/xcon-python`](./packages/xcon-python) |

---

## Contributing

Issues and PRs are welcome. Read [SPEC.md](./SPEC.md) before contributing to the parser — the spec is the source of truth.

---

## License

MIT — see [LICENSE](./LICENSE)
