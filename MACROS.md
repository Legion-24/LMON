# XCON Macros

XCON has two macro layers:

1. **Decorator macros** (`@ref`, `@lazy`, `@fn`, `@sql`, `@rest`, `@cache`, `@macro`) — declarative annotations on schema fields and values that bind to callbacks across JS, Python, and Rust. Used for lazy loading, federation, computed fields, and ambient context.
2. **Text-preprocessing macros** (`%`-prefixed) — a text-level substitution system that runs **before** XCON parsing. Used for templating, parameterized fragments, and built-in values (date, UUID, env vars).

This document covers both. Decorator macros first; text macros from [Quick Start](#quick-start) onward.

---

## Decorator Macros

Decorator macros are written inline in the schema or value position and resolve via host-language callbacks. They are **declarative** — the parser records the annotation; expansion happens on demand at evaluation time.

Callback bindings are supported in **JavaScript / TypeScript**, **Python**, and **Rust**. Each runtime registers handler functions against the macro name; the parser invokes them when the document is evaluated.

### `@ref` — lazy field references

A pointer to data living elsewhere (another row, another document, another server). The reference is opaque until resolved.

```
(id,name,manager)
{1,Alice,@ref(employees,7)}
{7,Bob,@ref(employees,12)}
```

**Resolution:** the host registers a resolver keyed on the table/document name. The reference is fetched only when the field is accessed.

```ts
import { registerRef } from '@legion24/xcon';
registerRef('employees', async (id) => db.employees.findOne({ id }));
```

**Languages:** JS/TS, Python, Rust.

### `@lazy` — deferred expansion strategies

Marks a field as not-yet-loaded with a strategy hint (`stream`, `paginate`, `on-demand`).

```
(id,name,attachments)
{1,Alice,@lazy(stream,/api/users/1/attachments)}
```

**Resolution:** the runtime defers fetching until the consumer iterates the field. Streaming strategies wire into the XCON/stream layer; pagination strategies issue follow-up requests.

**Languages:** JS/TS, Python, Rust.

### `@fn` — function definitions and callback binding

Defines a callable inline; the body is evaluated by the host language.

```
%define
@fn(double,x) = "x * 2"
@fn(greet,name) = "`hello ${name}`"

(id,score)
{1,@fn:double(21)}
```

**Resolution:** the host language compiles the body and binds it under the function name. Bodies are sandboxed per-runtime (Function constructor in JS, restricted `eval` in Python, dynamic dispatch in Rust).

**Languages:** JS/TS (Function), Python (sandboxed), Rust (compile-time registration).

### `@sql` — SQL source macros

Annotates a value or row as the result of a SQL query.

```
(id,name,orders)
{1,Alice,@sql("SELECT id,total FROM orders WHERE user_id=1")}
```

**Resolution:** the registered SQL backend executes the query lazily; the result becomes a nested XCON document with the query columns as its header.

**Languages:** JS/TS, Python, Rust.

### `@rest` — REST source macros

Annotates a value as the result of an HTTP fetch.

```
(id,name,profile)
{1,Alice,@rest(GET,/api/users/1/profile)}
```

**Resolution:** the registered HTTP client issues the request when the field is accessed; the response (XCON or JSON via the adapter) is folded in.

**Languages:** JS/TS, Python, Rust.

### `@cache` — caching decorator macros

Wraps another macro with a cache policy.

```
{1,Alice,@cache(ttl=60,@rest(GET,/api/users/1/profile))}
```

**Resolution:** the runtime keys the cache on the wrapped macro's resolved arguments; subsequent reads within the TTL skip the underlying call.

**Languages:** JS/TS, Python, Rust.

### `@macro` — ambient context injection

Pulls a value from the document's ambient context (set by the caller / server / session).

```
(id,name,tenant)
{1,Alice,@macro(tenant_id)}
```

**Resolution:** the runtime looks up the name in the active `MacroContext`; LLM contexts, DB sessions, and HTTP middlewares can populate ambient values without modifying the document body.

**Languages:** JS/TS, Python, Rust.

---

## Text-Preprocessing Macros (`%`)

The `%`-prefixed text-level macro system runs **before** XCON parsing. It enables text substitution, parameterized templates, arithmetic evaluation, and access to system information (date, time, UUID, environment variables).

---

## Quick Start

**TypeScript / JavaScript:**
```typescript
import { expand, parse } from 'xcon';

const xconWithMacros = `
%header = "(name,age)"
%header
alice:{Alice,30}
`;

const expanded = expand(xconWithMacros);
const data = parse(expanded);
```

**Python:**
```python
from xcon import expand, parse

xcon_with_macros = '''
%header = "(name,age)"
%header
alice:{Alice,30}
'''

expanded = expand(xcon_with_macros)
data = parse(expanded)
```

---

## Syntax

### Definition Line

Macro definitions are single-line, consumed during expansion:

```
%name = "body"
```

- Must start with `%` followed by a valid identifier (`[a-zA-Z_][a-zA-Z0-9_]*`)
- Name is **case-sensitive**: `%X` and `%x` are different macros
- Body is a quoted string with optional escape sequences:
  - `\"` → quote
  - `\\` → backslash
  - `\n` → newline
  - `\t` → tab

**Example:**
```
%greeting = "hello\nworld"
```

### Simple Macro (No Parameters)

Expand by name:

```
%greeting = "hello"
Say %greeting
```

Result: `Say hello`

### Parameterized Macro

Define with parameters; arguments substitute into placeholders:

```
%greet(name) = "hello {name}!"
%greet(Alice)
```

Result: `hello Alice!`

**Multiple parameters:**
```
%pair(a,b) = "{a} and {b}"
%pair(x,y)
```

Result: `x and y`

**Placeholders can be repeated or unused:**
```
%dup(x) = "{x}-{x}"
%dup(foo)

%template(a,b) = "{a}"
%template(1,2)
```

Results: `foo-foo` and `1`

**Arguments can contain spaces:**
```
%greet(name) = "hello {name}"
%greet(Alice Smith)
```

Result: `hello Alice Smith`

### Expression Macro

Evaluate arithmetic inline:

```
%{2+3}
%{10-4}
%{3*4}
%{10/2}
%{10%3}
%{(2+3)*4}
%{-5+2}
```

Results: `5`, `6`, `12`, `5`, `1`, `20`, `-3`

**Type handling:**
- Integer results display without decimals: `%{10/2}` → `5`
- Float results show all significant digits: `%{10/4}` → `2.5`

**Macros inside expressions:**
```
%n = "5"
%{%n+10}
```

Result: `15`

---

## Built-In Macros (Spec-Defined)

Always available without definition. Prefixed with `_`.

| Macro | Returns | Example |
|-------|---------|---------|
| `%_DATE_STR` | ISO 8601 date | `2026-04-30` |
| `%_TIME_STR` | HH:MM:SS | `14:35:22` |
| `%_DATETIME_STR` | ISO 8601 datetime | `2026-04-30T14:35:22Z` |
| `%_TIMESTAMP` | Unix seconds | `1746057322` |
| `%_DAY_STR` | Day name | `Wednesday` |
| `%_UUID` | UUID v4 | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `%_ENV(VAR)` | Env variable | `%_ENV(HOME)` |

**Examples:**
```
log:%_TIMESTAMP
date:%_DATE_STR
id:%_UUID
user:%_ENV(USER)
```

**Override built-ins:**
```
%_DATE_STR = "custom-date"
Date: %_DATE_STR
```

Result: `Date: custom-date`

---

## Visibility & Scoping

### Forward References Not Allowed

Macros are only visible after their definition:

```
%x
%x = "hello"
```

Error: `undefined macro 'x'`

### Pre-defined Context

You can provide pre-defined macros that are visible from line 1:

**TypeScript:**
```typescript
import { expand, ExpandOptions } from 'xcon';

const ctx = new Map([
  ['env', { body: 'prod', params: null, sourceLine: 0 }],
]);

const expanded = expand(xcon, { initialContext: ctx });
```

**Python:**
```python
from xcon import expand, ExpandOptions, MacroDefinition

ctx = {
    'env': MacroDefinition(body='prod', params=None, source_line=0)
}

expanded = expand(xcon, ExpandOptions(initial_context=ctx))
```

### Redefinition Overwrites

Last definition wins:

```
%x = "a"
%x = "b"
%x
```

Result: `b`

---

## Nesting & Recursion

### Macro-Refs-Macro

A macro body can reference other macros:

```
%sep = ","
%row(a,b) = "{a}%sep{b}"
%row(x,y)
```

Result: `x,y`

### Circular Detection

Circular references are detected and throw an error:

```
%a = "%b"
%b = "%a"
%a
```

Error: `macro expansion depth exceeded`

### Depth Limit

Expansion is limited to depth 16 by default (prevents runaway recursion):

```typescript
// Customize the limit:
const expanded = expand(xcon, { maxDepth: 32 });
```

---

## Strict vs. Non-Strict Mode

### Strict Mode (Default)

Unknown macros throw an error:

```typescript
const expanded = expand('%unknown', { strict: true });
// Error: undefined macro 'unknown'
```

### Non-Strict Mode

Unknown macros are left as-is:

```typescript
const expanded = expand('value: %unknown', { strict: false });
// Result: value: %unknown

// Defined macros still expand:
const expanded = expand(
  '%x = "hello"\nval: %x and %unknown',
  { strict: false }
);
// Result: val: hello and %unknown
```

Use non-strict mode to leave macro-like syntax for other tools to process.

---

## Error Handling

Macros report line and column information:

```
XCONMacroError at line 2, column 5:
  Undefined macro 'missing'
  row:{1,%missing,value}
         ^
```

Common errors:

| Error | Cause |
|-------|-------|
| `Undefined macro 'name'` | Macro used before definition (strict mode) |
| `Macro 'name' expects N arguments, got M` | Wrong argument count |
| `Macro 'name' takes no parameters, but M provided` | Simple macro called with args |
| `Unclosed parameter list for macro` | Unclosed `(` in call |
| `Division by zero in expression` | `%{10/0}` |
| `Macro expansion depth exceeded` | Circular or overly nested expansion |

---

## Practical Examples

### Example 1: DRY Headers

```
%header = "(id,name,email,role,active)"

%header
emp1:{1,Alice,alice@example.com,admin,true}
emp2:{2,Bob,bob@example.com,user,false}
```

### Example 2: Parameterized Rows

```
%emp(id,name,email,role) = "{id,name,email,role,true}"

(id,name,email,role,active)
emp1:%emp(1,Alice,alice@example.com,admin)
emp2:%emp(2,Bob,bob@example.com,user)
```

### Example 3: Dynamic IDs with UUID

```
(id,name,created)
alice:%{%_UUID},%Alice,%_DATE_STR}
bob:{%_UUID,Bob,%_DATE_STR}
```

### Example 4: Computed Values

```
%num = "100"
(value,doubled)
result:{%num,%{%num*2}}
```

### Example 5: Environment-Driven Config

```
%env = "%_ENV(NODE_ENV)"
(env,host,debug)
config:{%env,localhost,false}
```

---

## API Reference

### `expand(input, options?)`

Expands macros in the input string.

**TypeScript:**
```typescript
function expand(input: string, options?: ExpandOptions): string;

interface ExpandOptions {
  initialContext?: MacroContext;
  strict?: boolean;      // default: true
  maxDepth?: number;     // default: 16
}

interface MacroDefinition {
  body: string;
  params: string[] | null;
  sourceLine: number;
}

type MacroContext = Map<string, MacroDefinition>;
```

**Python:**
```python
def expand(input_text: str, options: Optional[ExpandOptions] = None) -> str:
    ...

@dataclass
class ExpandOptions:
    initial_context: Optional[MacroContext] = None
    strict: bool = True
    max_depth: int = 16

@dataclass
class MacroDefinition:
    body: str
    params: Optional[list[str]]
    source_line: int

MacroContext = dict[str, MacroDefinition]
```

### Options

- **`initialContext`** — Pre-defined macros visible from line 1
- **`strict`** — If `true` (default), undefined macros throw an error; if `false`, they are left as-is
- **`maxDepth`** — Maximum nesting depth (default 16); prevents infinite recursion

---

## Integration with XCON Parsing

Macros are a preprocessing step. Always expand before parsing:

```typescript
const xconWithMacros = `
%header = "(name,age)"
%header
alice:{Alice,30}
`;

const expanded = expand(xconWithMacros);
const data = parse(expanded);
```

The macro system is **format-agnostic**: it transforms raw text to raw text, making it suitable for other formats too.

---

## Design Decisions

### Why Text-Level?

Macros operate on raw text before tokenization. This keeps the macro system independent of XCON's grammar and makes macros reusable for other formats.

### Why Positional Parameters?

Positional parameters (`{a}`, `{b}`) are simpler and more efficient than named parameters. Unnamed parameters are common in template systems (C preprocessor, shell `$1`, etc.).

### Why Limit Depth?

A depth limit of 16 prevents accidental infinite recursion without banning legitimate use cases (most real macros are 3–5 levels deep). You can increase it if needed.

### Why No Variable Assignment?

Macros are functional: each expansion is independent. Variables would require mutable state, complicating the model. Use pre-defined context (`initialContext`) for parameterized inputs instead.

---

## FAQ

**Q: Can macros span multiple lines?**
A: No, definition lines are single-line. If you need multi-line content, escape newlines: `%x = "line1\nline2"`

**Q: Can I nest parameterized calls?**
A: Yes: `%f(%g(x))` works if both are defined.

**Q: What if a macro definition is malformed?**
A: Malformed definitions (missing quotes, unclosed parens) are left as-is and don't define a macro.

**Q: Can I use macros in macro names?**
A: No. Macro names are fixed identifiers; you can't substitute them. (Only bodies and arguments are expanded.)

**Q: Performance?**
A: The default depth limit is 16; most real macros expand in 1–3 passes. Linear in input size; no performance issues for typical XCON documents.

---

## See Also

- [SPEC.md](./SPEC.md) — Full XCON format specification
- [README.md](./README.md) — Quick-start guide
