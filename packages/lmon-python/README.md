# lmon — Python

LMON parser and stringifier for Python. Includes optional macro preprocessing.

---

## Installation

```bash
pip install lmon
```

Requires Python 3.10+.

---

## Quick Start

### Parsing LMON

```python
from lmon import parse

lmon_text = """(name,age,active)
alice:{Alice,30,true}
bob:{Bob,25,false}"""

result = parse(lmon_text)
# {
#   'alice': {'name': 'Alice', 'age': 30, 'active': True},
#   'bob': {'name': 'Bob', 'age': 25, 'active': False}
# }
```

### Stringifying to LMON

```python
from lmon import stringify

obj = {
    'user1': {'name': 'Alice', 'age': 30},
    'user2': {'name': 'Bob', 'age': 25}
}

lmon = stringify(obj)
# (name,age)
# user1:{Alice,30}
# user2:{Bob,25}
```

### Macros (Preprocessing)

Use macros to reduce repetition and add dynamic values:

```python
from lmon import expand, parse

lmon_with_macros = """
%header = "(id,name,email)"
%admin = "true"

%header
emp1:{1,Alice,alice@example.com,%admin}
emp2:{2,Bob,bob@example.com,false}
"""

expanded = expand(lmon_with_macros)
data = parse(expanded)
```

**Macro features:**
- **Simple macros** — `%name = "value"` defines a variable, `%name` expands it
- **Parameterized macros** — `%row(a,b) = "{a},{b}"` with `%row(x,y)` expanding
- **Expression macros** — `%{2+3*4}` evaluates arithmetic (14)
- **Built-in macros** — `%_DATE_STR`, `%_TIME_STR`, `%_UUID`, `%_ENV(VAR)`, etc.

See [MACROS.md](../../MACROS.md) for full documentation.

### JSON Conversion

```python
from lmon import to_json, from_json

# LMON to JSON
lmon_str = '(name)\nalice:{Alice}'
json_str = to_json(lmon_str)

# JSON to LMON
json_str = '{"user1": {"name": "Alice"}}'
lmon_str = from_json(json_str)
```

---

## Format Overview

LMON has two optional parts:

1. **Header** (optional): Defines structure
   ```
   (field1,field2[],nested:(subfield1,subfield2))
   ```

2. **Body**: Data rows
   ```
   row_label:{value1,[array,items],{nested,object}}
   ```

### Complete Example

```
(name,tags[],address:(city,zip))
alice:{Alice,[admin,dev],{NYC,10001}}
bob:{Bob,[user],{LA,90001}}
```

Parse result:
```python
{
    'alice': {
        'name': 'Alice',
        'tags': ['admin', 'dev'],
        'address': {'city': 'NYC', 'zip': '10001'}
    },
    'bob': {
        'name': 'Bob',
        'tags': ['user'],
        'address': {'city': 'LA', 'zip': '90001'}
    }
}
```

## Type Inference

Values are automatically typed:

- `null` → None
- `true`, `false` → bool
- `123` → int
- `3.14` → float
- `hello` → str

## API Reference

### Parsing

#### `parse(input: str, options: Optional[ParseOptions] = None) -> Any`

Parse LMON text to Python object.

```python
from lmon import parse

data = parse(lmon_text)
```

#### `parse_to_ast(input: str) -> LMONDocument`

Parse LMON text to AST (for advanced usage).

### Stringification

#### `stringify(data: Any, options: Optional[StringifyOptions] = None) -> str`

Convert Python object to LMON text.

```python
from lmon import stringify

lmon = stringify(data)
```

### Macros

#### `expand(input_text: str, options: Optional[ExpandOptions] = None) -> str`

Expand macros in LMON text (preprocessing step).

```python
from lmon import expand, ExpandOptions

expanded = expand(lmon_with_macros, ExpandOptions(strict=True, max_depth=16))
```

**Options:**
- `initial_context` — Pre-defined macros visible from line 1
- `strict` — If `True` (default), undefined macros throw an error
- `max_depth` — Maximum nesting depth (default 16)

### JSON Bridge

#### `to_json(lmon: str) -> str`

Convert LMON to JSON string.

#### `from_json(json_str: str) -> str`

Convert JSON string to LMON.

---

## Error Handling

Exceptions include line/column information for debugging:

```python
from lmon import parse, expand
from lmon.errors import LMONParseError, LMONMacroError

try:
    data = parse(malformed)
except LMONParseError as err:
    print(f"Parse error at {err.line}:{err.column}: {err.message}")

try:
    expanded = expand(lmon_with_macros)
except LMONMacroError as err:
    print(f"Macro error at {err.line}:{err.column}: {err.message}")
```

### LMONParseError

Raised on LMON syntax errors with line/column information.

### LMONMacroError

Raised on macro expansion errors (undefined macro, circular reference, etc.).

### LMONStringifyError

Raised on stringification errors.

## Testing

```bash
pytest tests/
pytest tests/ --cov=lmon
```

## See Also

- [SPEC.md](../../SPEC.md) - Formal LMON specification
- [JS/TS implementation](../lmon/) - TypeScript reference implementation
