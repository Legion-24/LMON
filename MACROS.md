# LMON Macros — Text Preprocessing

LMON macros are a text-level preprocessing system that runs **before** LMON parsing. Macros enable text substitution, parameterized templates, arithmetic evaluation, and access to system information (date, time, UUID, environment variables).

---

## Quick Start

**TypeScript / JavaScript:**
```typescript
import { expand, parse } from 'lmon';

const lmonWithMacros = `
%header = "(name,age)"
%header
alice:{Alice,30}
`;

const expanded = expand(lmonWithMacros);
const data = parse(expanded);
```

**Python:**
```python
from lmon import expand, parse

lmon_with_macros = '''
%header = "(name,age)"
%header
alice:{Alice,30}
'''

expanded = expand(lmon_with_macros)
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
import { expand, ExpandOptions } from 'lmon';

const ctx = new Map([
  ['env', { body: 'prod', params: null, sourceLine: 0 }],
]);

const expanded = expand(lmon, { initialContext: ctx });
```

**Python:**
```python
from lmon import expand, ExpandOptions, MacroDefinition

ctx = {
    'env': MacroDefinition(body='prod', params=None, source_line=0)
}

expanded = expand(lmon, ExpandOptions(initial_context=ctx))
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
const expanded = expand(lmon, { maxDepth: 32 });
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
LMONMacroError at line 2, column 5:
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

## Integration with LMON Parsing

Macros are a preprocessing step. Always expand before parsing:

```typescript
const lmonWithMacros = `
%header = "(name,age)"
%header
alice:{Alice,30}
`;

const expanded = expand(lmonWithMacros);
const data = parse(expanded);
```

The macro system is **format-agnostic**: it transforms raw text to raw text, making it suitable for other formats too.

---

## Design Decisions

### Why Text-Level?

Macros operate on raw text before tokenization. This keeps the macro system independent of LMON's grammar and makes macros reusable for other formats.

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
A: The default depth limit is 16; most real macros expand in 1–3 passes. Linear in input size; no performance issues for typical LMON documents.

---

## See Also

- [SPEC.md](./SPEC.md) — Full LMON format specification
- [README.md](./README.md) — Quick-start guide
