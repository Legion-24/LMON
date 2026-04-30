# LMON Specification v0.1.0

## Overview

**LMON** (Language Model Object Notation) is a structured data format designed for efficient LLM output. It combines the readability of YAML with the token efficiency of optimized binary formats, making it ideal for structured responses from large language models.

### Design Goals

- **Token efficiency**: Minimize tokens compared to JSON by expressing structure once (header) and repeating only data (rows)
- **LLM-friendly**: Human readable, easy for models to generate and parse
- **Round-trippable**: Lossless conversion to/from JSON
- **Simple grammar**: No complex escaping rules, minimal special syntax

### Motivation

JSON requires repeating keys for each object in an array. LMON defines a schema once and repeats only values, reducing tokens per record. For an array of 100 user objects with 5 keys each, LMON saves ~60% of JSON's token overhead.

---

## Macros (Text Preprocessing)

LMON supports an optional **macro pre-processor** that runs before parsing. Macros allow you to define reusable text fragments, parameterized templates, and inline arithmetic expressions, reducing repetition and enabling dynamic LMON generation.

**Note:** Macro expansion is a preprocessing step. Call `expand(input)` before `parse(expanded)` to use macros.

### Simple Variable Macros

Define a reusable text fragment on its own line, consumed during expansion:

```
%header = "(id,name,email)"
%admin = "true"

%header
emp1:{1,Alice,alice@example.com,{admin}}
```

Expands to:
```
(id,name,email)
emp1:{1,Alice,alice@example.com,true}
```

### Parameterized Macros

Define a template with placeholders:

```
%row(id,name,email) = "{id,name,email}"

data:%row(1,Alice,alice@example.com)
```

Expands to:
```
data:{1,Alice,alice@example.com}
```

Placeholders use `{param}` syntax and can be repeated or omitted (unused parameters are ignored).

### Expression Macros

Inline arithmetic expressions are evaluated safely:

```
%{2+3*4}      → 14
%{10/2}       → 5
%{10/4}       → 2.5
```

Integer results are displayed without decimals; float results show all significant digits. Operators are `+`, `-`, `*`, `/`, `%` (modulo) with standard precedence and support for parentheses and unary minus.

**Expressions can reference macros:**

```
%n = "5"
value:%{%n+1}  → value:6
```

### Spec-Defined Macros

Built-in macros prefixed with `_` are always available:

| Macro | Returns | Example |
|-------|---------|---------|
| `%_DATE_STR` | ISO 8601 date (YYYY-MM-DD) | `2026-04-30` |
| `%_TIME_STR` | Time in HH:MM:SS | `14:35:22` |
| `%_DATETIME_STR` | Full ISO 8601 datetime | `2026-04-30T14:35:22Z` |
| `%_TIMESTAMP` | Unix timestamp (seconds) | `1746057322` |
| `%_DAY_STR` | Day of week | `Wednesday` |
| `%_UUID` | UUID v4 | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `%_ENV(VAR)` | Environment variable | `%_ENV(HOME)` expands to env var value |

**Note:** Spec macros are evaluated at expansion time (not at parse time), so each invocation captures the current datetime or a freshly generated UUID.

### Macro Rules

1. **Definition line syntax:**
   - Simple: `%name = "body"`
   - Parameterized: `%name(p1,p2) = "body with {p1} and {p2}"`
   - Definition lines are consumed during expansion (not in output)

2. **Visibility:** Macros are only visible after their definition line. Pre-defined context (`initialContext`) is always visible from line 1.

3. **Nesting:** Macro expansions are re-expanded, enabling macro-refs-macro patterns. Depth is limited to 16 to prevent circular references.

4. **Forward references:** Referencing a macro before it's defined throws an error (unless `strict: false`).

5. **Undefined macros:** Unknown macros throw an error in strict mode; in non-strict mode they are left as-is for later processing.

6. **Circular detection:** If macro A references B and B references A, expansion throws an error.

---

## Format Structure

An LMON document consists of two optional parts:

1. **Header** (optional): First line defining the structure of all rows
2. **Body** (required): Rows of data following the header schema

```
HEADER
BODY_ROW
BODY_ROW
...
```

---

## Header Syntax

The header defines the schema for all documents in the body. It is optional.

### Format

```
(label,label,label,...)
```

- Starts with `(`
- Comma-separated list of **labels**
- Ends with `)`
- Must be the first non-empty line of the document

### Labels

A **label** is a field name. Labels may be:

- **Bare**: `name` (letters, digits, underscore; no spaces)
- **Quoted**: `"first name"` or `'full-name-with-dashes'` (if containing spaces, delimiters, or special chars)
- **Array marker**: Suffix `[]` indicates the field is an array: `tags[]`
- **Nested**: Suffix `(sub_label,...)` indicates nested structure: `address:(city,zip)`

### Escape Sequences in Labels

Inside quoted labels, use backslash to escape:
- `\"` → quote character
- `\\` → backslash
- `\n` → newline
- `\t` → tab

### Examples

**Simple header**:
```
(name,age,active)
```

**With arrays**:
```
(name,tags[],favorites[])
```

**With nested schema**:
```
(name,address:(street,city,zip))
```

**Complex nested**:
```
(id,name,tags[],address:(city,zip),metadata:(created,updated))
```

---

## Body Syntax

The body contains rows of data. Each row is optional in structure but at least one row is recommended.

### Row Format

```
[row_label:] document
```

- **row_label** (optional): Identifier preceding the colon. If present, becomes the key in output. If absent, document is positional.
- **document**: A `{}` block containing field values

### Documents

A document is a comma-separated list of field values enclosed in braces.

```
{value,value,value,...}
```

- Starts with `{`
- Contains zero or more **field values** separated by commas
- Ends with `}`
- Field values are matched **positionally** to header labels

### Field Values

A field value can be:

1. **Scalar value**: A bare word or quoted string
2. **Nested document**: A `{}` block
3. **Array**: An `[]` block

#### Scalar Values

Bare words are assumed to be strings unless they match a type literal:

- `null` → `null` (JSON null)
- `true`, `false` → boolean
- `123` → integer (regex: `-?\d+`)
- `123.45` → float (regex: `-?\d+\.\d+`)
- `hello` → string (anything else)

Empty string is represented by a missing value between commas or before the closing brace:

```
{,value}    # first field is empty string
{value,}    # second field is empty string (not allowed — trailing comma is error)
```

Whitespace inside `{}` and `[]` is stripped from the start and end of each value:

```
{ hello , world }  →  ["hello", "world"]
```

Whitespace inside quoted values is preserved:

```
{"  hello  "}  →  ["  hello  "]
```

#### Quoted Values

To include spaces, commas, or special characters in a scalar, use quotes:

```
"hello world"
'value with, comma'
"escaped \"quote\" inside"
```

Escape sequences inside quotes:
- `\"` → quote (in double-quoted strings)
- `\'` → quote (in single-quoted strings)
- `\\` → backslash
- `\n` → newline
- `\t` → tab

#### Nested Documents

A field can contain a nested document if the header specifies a nested schema:

```
(name,address:(city,zip))
user1:{John,{NYC,10001}}
```

The nested schema applies positionally to the nested document.

#### Arrays

A field can be an array if the header label ends in `[]`:

```
(name,tags[])
user1:{John,[admin,developer]}
```

Arrays contain zero or more comma-separated field values:

```
[]                # empty array
[item]            # single item
[item1,item2]     # multiple items
```

Items in an array follow the same rules as scalar values (type inference, escaping, etc.).

---

## Type Inference

When parsing a bare (unquoted) value, the type is inferred in this order:

1. If the value is exactly `null`, it is `null`
2. If the value is exactly `true` or `false`, it is a boolean
3. If the value matches `-?\d+` (optional sign + digits), it is an integer
4. If the value matches `-?\d+\.\d+` (optional sign + digits + dot + digits), it is a float
5. Otherwise, it is a string

**Note**: Scientific notation (e.g., `1e5`) is not recognized and is parsed as a string.

---

## Escape Sequences

Backslash `\` escapes the following character. The following escapes are recognized:

| Escape | Meaning |
|--------|---------|
| `\,` | Comma (field delimiter) |
| `\{` | Left brace |
| `\}` | Right brace |
| `\[` | Left bracket |
| `\]` | Right bracket |
| `\(` | Left paren |
| `\)` | Right paren |
| `\:` | Colon |
| `\\` | Backslash |
| `\n` | Newline (literal newline character, not allowed in values on same row) |
| `\t` | Tab |

Escaping is only necessary inside bare (unquoted) values. Inside quoted values, use `\"` or `\'` for quotes; other escapes are optional (literal backslash is safe).

---

## Output Semantics

### With Header + Row Labels

```
(name,age)
user1:{John,30}
user2:{Jane,25}
```

Output:
```json
{
  "user1": {"name": "John", "age": 30},
  "user2": {"name": "Jane", "age": 25}
}
```

### With Header + No Row Labels

```
(name,age)
{John,30}
{Jane,25}
```

Output:
```json
[
  {"name": "John", "age": 30},
  {"name": "Jane", "age": 25}
]
```

### No Header + Row Labels

```
user1:{John,30,admin}
user2:{Jane,25,user}
```

Output (each row is an array because no header defines keys):
```json
{
  "user1": ["John", 30, "admin"],
  "user2": ["Jane", 25, "user"]
}
```

### No Header + No Row Labels

```
{John,30,admin}
{Jane,25,user}
```

Output:
```json
[
  ["John", 30, "admin"],
  ["Jane", 25, "user"]
]
```

---

## Edge Cases & Decisions

### Empty Documents

```
{}
```

Produces an empty array (not `null`):
```json
[]
```

### Trailing Commas

Trailing commas are **not allowed** and cause a parse error:

```
{foo,bar,}  ← ERROR
```

### Duplicate Row Labels

If the same row label appears twice, the **last one wins** (overwrites):

```
user:{John,30}
user:{Jane,25}
```

Output: `{"user": {"name": "Jane", "age": 25}}`

### Mixed Labeled/Unlabeled Rows

**Not allowed**. All rows must be consistent:

- Either all rows have labels
- Or no rows have labels

Mixing causes a parse error.

### Whitespace Handling

- **Outside `{}` and `[]`**: Insignificant (can have spaces around `:` in row labels)
- **Inside `{}` and `[]`**: Leading and trailing whitespace around each value is stripped
- **Inside quotes**: All whitespace is preserved

```
{ foo , bar }     →  ["foo", "bar"]
{  " foo"  }      →  [" foo"]  (note: leading space inside quotes is preserved)
user1 : {val}     →  Same as: user1:{val}
```

### Number Edge Cases

- `-0` → parsed as integer `0` (JSON semantics)
- `1e5` → **not** parsed as scientific notation, parsed as string `"1e5"` (v1 limitation)
- `Infinity`, `NaN` → parsed as strings (not JSON native)
- Floats must have digits on both sides of decimal: `1.` is invalid, `.5` is invalid

### Empty Values

An empty value (nothing between delimiters) is an empty string:

```
{,bar}        # first field is ""
{"","bar"}    # same as above using quotes
```

### Whitespace in Row Labels

Spaces in row labels are not allowed unless quoted:

```
user1:{...}           ✓ Valid
"user 1":{...}        ✓ Valid
user 1:{...}          ✗ Invalid (parsed as label="user", then error at "1")
```

---

## Grammar (EBNF)

```ebnf
Document = [Header] Body

Header = "(" LabelList ")"

LabelList = Label ("," Label)*

Label = LabelName ArraySuffix? NestedSuffix?
LabelName = BareWord | QuotedString
ArraySuffix = "[]"
NestedSuffix = "(" LabelList ")"

Body = Row+

Row = [RowLabel ":"] LMONDocument

RowLabel = BareWord | QuotedString

LMONDocument = "{" FieldValueList? "}"

FieldValueList = FieldValue ("," FieldValue)*

FieldValue = Scalar | LMONDocument | Array

Scalar = BareWord | QuotedString | ""

Array = "[" FieldValueList? "]"

BareWord = /[a-zA-Z0-9_]+/ | TypeLiteral

TypeLiteral = "null" | "true" | "false"

QuotedString = '"' (EscapedChar | ~["\n])* '"'
             | "'" (EscapedChar | ~['\n])* "'"

EscapedChar = "\\" (. | "n" | "t")
```

---

## Version & Compatibility

**Current Version**: 0.1.0

This spec covers LMON v0.1.0. Future versions may add:
- Format versioning header (e.g., `!LMON 1.0`)
- Comments
- Streaming/incremental parsing

No backward compatibility is guaranteed for v0.x versions.

---

## Canonical Examples

### Example 1: Simple User List

**LMON**:
```
(name,age,active)
alice:{Alice,30,true}
bob:{Bob,25,false}
```

**JSON**:
```json
{
  "alice": {"name": "Alice", "age": 30, "active": true},
  "bob": {"name": "Bob", "age": 25, "active": false}
}
```

### Example 2: Array of Objects (No Row Labels)

**LMON**:
```
(name,role)
{Alice,admin}
{Bob,user}
```

**JSON**:
```json
[
  {"name": "Alice", "role": "admin"},
  {"name": "Bob", "role": "user"}
]
```

### Example 3: Arrays in Data

**LMON**:
```
(name,tags[],verified)
alice:{Alice,[admin,developer],true}
bob:{Bob,[user],false}
```

**JSON**:
```json
{
  "alice": {"name": "Alice", "tags": ["admin", "developer"], "verified": true},
  "bob": {"name": "Bob", "tags": ["user"], "verified": false}
}
```

### Example 4: Nested Objects

**LMON**:
```
(name,address:(city,zip))
alice:{Alice,{NYC,10001}}
bob:{Bob,{LA,90001}}
```

**JSON**:
```json
{
  "alice": {"name": "Alice", "address": {"city": "NYC", "zip": "10001"}},
  "bob": {"name": "Bob", "address": {"city": "LA", "zip": "90001"}}
}
```

### Example 5: No Header (Array of Arrays)

**LMON**:
```
{Alice,30,true}
{Bob,25,false}
```

**JSON**:
```json
[
  ["Alice", 30, true],
  ["Bob", 25, false]
]
```

### Example 6: Complex Nesting

**LMON**:
```
(id,name,profile:(bio,social:(twitter,github)),active)
user1:{1,Alice,{Senior Engineer,[twitter,github_user],true}
user2:{2,Bob,{Product Manager,[],[],false}
```

**JSON**:
```json
{
  "user1": {
    "id": 1,
    "name": "Alice",
    "profile": {
      "bio": "Senior Engineer",
      "social": ["twitter", "github_user"]
    },
    "active": true
  },
  "user2": {
    "id": 2,
    "name": "Bob",
    "profile": {
      "bio": "Product Manager",
      "social": [[], []]
    },
    "active": false
  }
}
```

### Example 7: Escaped Values

**LMON**:
```
(name,description)
item1:{Widget,"A \, B, and C"}
item2:{Gadget,"Quote: \"Hello\""}
```

**JSON**:
```json
{
  "item1": {"name": "Widget", "description": "A , B, and C"},
  "item2": {"name": "Gadget", "description": "Quote: \"Hello\""}
}
```

### Example 8: Empty Values

**LMON**:
```
(name,email,phone)
user1:{Alice,,555-1234}
user2:{Bob,bob@example.com,}
```

**JSON**:
```json
{
  "user1": {"name": "Alice", "email": "", "phone": "555-1234"},
  "user2": {"name": "Bob", "email": "bob@example.com", "phone": ""}
}
```

### Example 9: All Types

**LMON**:
```
(string,integer,float,boolean,null_val)
example:{hello,42,3.14,true,null}
```

**JSON**:
```json
{
  "example": {
    "string": "hello",
    "integer": 42,
    "float": 3.14,
    "boolean": true,
    "null_val": null
  }
}
```

### Example 10: Token Efficiency Comparison

**JSON (72 tokens)**:
```json
[
  {"name": "Alice", "age": 30, "role": "admin"},
  {"name": "Bob", "age": 25, "role": "user"},
  {"name": "Charlie", "age": 35, "role": "admin"}
]
```

**LMON (38 tokens - 47% savings)**:
```
(name,age,role)
{Alice,30,admin}
{Bob,25,user}
{Charlie,35,admin}
```

(Token count approximate; actual savings vary with tokenizer.)

---

## Implementation Notes

### Recommended Parser Architecture

1. **Tokenizer**: Cursor-based scanner, produces token stream
2. **Parser**: Recursive descent consumer of token stream, produces AST
3. **Evaluator**: Walks AST, applies header schema, infers types, produces final JS/Python object

This separation enables:
- Clear error messages with line/column info
- AST inspection and manipulation
- Custom transformers built on the AST
- Streaming parse support in future versions

### Error Reporting

Parsers MUST report:
- **Line and column** of the error
- **The offending token** or context
- **A human-readable message** explaining the issue

Example:

```
LMONParseError at line 2, column 5:
  Expected '}' to close document but found ','
  user1:{name,age,,30}
              ^^
```

---

## Design Rationale

### Why No Indentation Syntax?

LMON prioritizes compactness. Indentation adds minimal value for structured data and consumes tokens.

### Why Escape Instead of Unicode Escapes?

Backslash escaping is simpler and more efficient than Unicode escapes (`A`). It also mirrors common syntax in programming languages.

### Why Positional Header Application?

Headers define an ordered list of labels. Applying them positionally keeps the parser simple and the format predictable. Explicit inline keys (like `{name:Alice,age:30}`) would add verbosity and overhead.

### Why No Comments?

Comments would complicate the grammar and likely be unnecessary in LLM output. If tools need to annotate LMON, they can wrap it in a JSON object: `{"lmon": "...", "notes": "..."}`

---

## Appendix: Common Patterns

### Optional Fields (Using Null)

When a field may not have a value, use `null`:

```
(name,email,phone)
user1:{Alice,alice@example.com,null}
user2:{Bob,null,555-1234}
```

### Representing Empty Collections

Empty arrays are represented with `[]`:

```
(name,tags[])
user1:{Alice,[]}
user2:{Bob,[admin,user]}
```

### Dynamic Columns (No Header)

For data with variable schema, omit the header and use arrays:

```
{Alice,30}
{Bob,25,admin}
{Charlie,35,engineer,NYC}
```

Each row can have a different number of columns. Parse to array of arrays.

### Flattening Nested Data for Compression

For deeply nested data, consider flattening:

```
# Instead of:
(name,address:(city,address:(street,number)))

# Flatten to:
(name,address_city,address_street,address_number)
alice:{Alice,NYC,5th Ave,100}
```

This is less hierarchical but more token-efficient.
