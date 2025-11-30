# @sylphx/vex

> ⚡ Ultra-fast schema validation - 4.5x faster than Valibot, 24x faster than Zod

## Installation

```bash
npm install @sylphx/vex
# or
bun add @sylphx/vex
# or
pnpm add @sylphx/vex
```

## Basic Usage

```typescript
import { str, num, pipe, email, int, positive, object, safeParse } from '@sylphx/vex'

// 1. Create a schema
const userSchema = object({
  name: str,
  email: pipe(str, email),
  age: pipe(num, int, positive),
})

// 2. Validate data (throws on error)
const user = userSchema({ name: 'Alice', email: 'alice@example.com', age: 30 })

// 3. Or use safeParse (returns result object)
const result = safeParse(userSchema)({ name: 'Bob', email: 'invalid', age: -1 })
if (result.success) {
  console.log(result.data)
} else {
  console.log(result.error) // "email: Invalid email"
}
```

## Core Concepts

### 1. Primitive Validators

Vex provides built-in validators for primitive types:

```typescript
import { str, num, bool, arr, obj, bigInt, date } from '@sylphx/vex'

str('hello')     // ✅ returns 'hello'
str(123)         // ❌ throws "Expected string"

num(42)          // ✅ returns 42
num('42')        // ❌ throws "Expected number"

bool(true)       // ✅ returns true
```

### 2. Composing with `pipe()`

Use `pipe()` to chain validators together (left to right):

```typescript
import { pipe, str, num, email, int, positive, min, max } from '@sylphx/vex'

// String validations
const emailValidator = pipe(str, email)
const usernameValidator = pipe(str, min(3), max(20))

// Number validations
const ageValidator = pipe(num, int, positive)
const scoreValidator = pipe(num, int, min(0), max(100))

// Usage
emailValidator('test@example.com')  // ✅ 'test@example.com'
emailValidator('invalid')           // ❌ throws "Invalid email"

ageValidator(25)                    // ✅ 25
ageValidator(-5)                    // ❌ throws "Must be positive"
```

### 3. Object Schemas

```typescript
import { object, str, num, pipe, email, int, positive, optional } from '@sylphx/vex'

const userSchema = object({
  id: str,
  name: str,
  email: pipe(str, email),
  age: pipe(num, int, positive),
  bio: optional(str),  // optional field
})

// TypeScript infers the type automatically
type User = ReturnType<typeof userSchema>
// { id: string; name: string; email: string; age: number; bio?: string }

const user = userSchema({
  id: '123',
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
})
```

### 4. Array Schemas

```typescript
import { array, str, num, pipe, nonempty, int } from '@sylphx/vex'

const tagsSchema = array(pipe(str, nonempty))
const scoresSchema = array(pipe(num, int))

tagsSchema(['a', 'b', 'c'])  // ✅ ['a', 'b', 'c']
tagsSchema(['a', '', 'c'])   // ❌ throws "[1]: Required"

scoresSchema([1, 2, 3])      // ✅ [1, 2, 3]
```

### 5. Error Handling

Three ways to handle validation errors:

```typescript
import { safeParse, tryParse, ValidationError } from '@sylphx/vex'

const schema = pipe(str, email)

// Method 1: Direct call (throws on error)
try {
  schema('invalid')
} catch (e) {
  if (e instanceof ValidationError) {
    console.log(e.message) // "Invalid email"
  }
}

// Method 2: safeParse (returns result object)
const result = safeParse(schema)('invalid')
if (!result.success) {
  console.log(result.error) // "Invalid email"
}

// Method 3: tryParse (returns null on error)
const value = tryParse(schema)('invalid') // null
```

## Common Patterns

### Form Validation

```typescript
import { object, str, num, pipe, email, min, max, int, positive, safeParse } from '@sylphx/vex'

const signupSchema = object({
  username: pipe(str, min(3), max(20)),
  email: pipe(str, email),
  password: pipe(str, min(8)),
  age: pipe(num, int, positive),
})

function handleSubmit(formData: unknown) {
  const result = safeParse(signupSchema)(formData)

  if (!result.success) {
    return { error: result.error }
  }

  // result.data is fully typed
  return { user: result.data }
}
```

### API Response Validation

```typescript
import { object, array, str, num, pipe, int, positive } from '@sylphx/vex'

const apiResponseSchema = object({
  status: str,
  data: array(object({
    id: pipe(num, int, positive),
    title: str,
    completed: bool,
  })),
})

async function fetchTodos() {
  const response = await fetch('/api/todos')
  const json = await response.json()

  // Throws if response doesn't match schema
  return apiResponseSchema(json)
}
```

### Optional & Nullable

```typescript
import { optional, nullable, nullish, withDefault, str, pipe, email } from '@sylphx/vex'

// optional - allows undefined
const optionalEmail = optional(pipe(str, email))
optionalEmail(undefined)           // ✅ undefined
optionalEmail('test@example.com')  // ✅ 'test@example.com'

// nullable - allows null
const nullableEmail = nullable(pipe(str, email))
nullableEmail(null)                // ✅ null

// nullish - allows null or undefined
const nullishEmail = nullish(pipe(str, email))

// withDefault - provides default value
const emailWithDefault = withDefault(pipe(str, email), 'default@example.com')
emailWithDefault(undefined)        // ✅ 'default@example.com'
```

### Union Types

```typescript
import { union, str, num, bool, literal } from '@sylphx/vex'

// Union of types
const stringOrNumber = union([str, num])
stringOrNumber('hello')  // ✅ 'hello'
stringOrNumber(42)       // ✅ 42
stringOrNumber(true)     // ❌ throws

// Literal union (like TypeScript union of strings)
const status = union([literal('pending'), literal('active'), literal('done')])
status('active')         // ✅ 'active'
status('invalid')        // ❌ throws
```

### Transforms

```typescript
import { pipe, str, trim, lower, upper, toInt, toFloat, toDate } from '@sylphx/vex'

// String transforms
const normalizedEmail = pipe(str, trim, lower)
normalizedEmail('  ALICE@EXAMPLE.COM  ')  // 'alice@example.com'

// Parse string to number
const parseAge = pipe(str, toInt)
parseAge('42')  // 42

// Parse string to Date
const parseDate = pipe(str, toDate)
parseDate('2024-01-15')  // Date object
```

## API Reference

### Primitive Types
| Validator | Description |
|-----------|-------------|
| `str` | Validates string |
| `num` | Validates number (excludes NaN) |
| `bool` | Validates boolean |
| `arr` | Validates array |
| `obj` | Validates object |
| `bigInt` | Validates bigint |
| `date` | Validates Date |

### String Validators
| Validator | Description |
|-----------|-------------|
| `email` | Email format |
| `url` | URL format |
| `uuid` | UUID format |
| `min(n)` | Minimum length |
| `max(n)` | Maximum length |
| `len(n)` | Exact length |
| `nonempty` | Non-empty string |
| `pattern(regex)` | Regex pattern |
| `startsWith(s)` | Starts with string |
| `endsWith(s)` | Ends with string |
| `includes(s)` | Contains string |

### Number Validators
| Validator | Description |
|-----------|-------------|
| `int` | Integer |
| `positive` | > 0 |
| `negative` | < 0 |
| `finite` | Finite number |
| `gte(n)` | >= n |
| `lte(n)` | <= n |
| `gt(n)` | > n |
| `lt(n)` | < n |
| `multipleOf(n)` | Divisible by n |

### Transforms
| Transform | Description |
|-----------|-------------|
| `trim` | Trim whitespace |
| `lower` | Lowercase |
| `upper` | Uppercase |
| `toInt` | Parse to integer |
| `toFloat` | Parse to float |
| `toDate` | Parse to Date |

### Composition
| Function | Description |
|----------|-------------|
| `pipe(...validators)` | Chain validators left to right |
| `object(shape)` | Object schema |
| `array(schema)` | Array schema |
| `tuple([...schemas])` | Tuple schema |
| `union([...schemas])` | Union type |
| `optional(schema)` | Allow undefined |
| `nullable(schema)` | Allow null |
| `nullish(schema)` | Allow null or undefined |
| `withDefault(schema, value)` | Default value |

### Utilities
| Function | Description |
|----------|-------------|
| `safeParse(schema)(data)` | Returns `{ success, data/error }` |
| `tryParse(schema)(data)` | Returns data or null |
| `toJsonSchema(schema)` | Convert to JSON Schema |

## Standard Schema

Vex implements [Standard Schema](https://standardschema.dev/) v1, compatible with:
- tRPC
- TanStack Form/Router
- Hono
- Remix
- And more...

```typescript
// All validators expose ~standard property
const schema = object({ email: pipe(str, email) })
schema['~standard'].validate(data)
```

## JSON Schema

Convert Vex schemas to JSON Schema (draft-07, draft-2019-09, draft-2020-12):

```typescript
import { object, str, num, pipe, email, int, positive, optional, toJsonSchema } from '@sylphx/vex'

const userSchema = object({
  name: str,
  email: pipe(str, email),
  age: pipe(num, int, positive),
  bio: optional(str),
})

// Convert to JSON Schema
const jsonSchema = toJsonSchema(userSchema)
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "type": "object",
//   "properties": {
//     "name": { "type": "string" },
//     "email": { "type": "string", "format": "email" },
//     "age": { "type": "integer", "exclusiveMinimum": 0 },
//     "bio": { "type": "string" }
//   },
//   "required": ["name", "email", "age"]
// }
```

### Options

```typescript
// Choose JSON Schema draft version
toJsonSchema(schema, { draft: 'draft-2020-12' })

// Without $schema property
toJsonSchema(schema, { $schema: false })

// With named definitions
toJsonSchema(schema, {
  definitions: {
    User: userSchema,
    Post: postSchema,
  }
})
```

### Use Cases

- **OpenAPI/Swagger**: Generate API documentation
- **Form builders**: Auto-generate forms from schemas
- **Code generation**: Generate types for other languages
- **Validation interop**: Share schemas with non-JS systems

## Performance

| Benchmark | Vex | Valibot | Zod | vs Valibot | vs Zod |
|-----------|-----|---------|-----|------------|--------|
| Simple object | 38.4M | 16.0M | 16.1M | 2.4x | 2.4x |
| Complex object | 9.2M | 3.1M | 3.3M | 3.0x | 2.8x |
| Array (100 items) | 0.1M | 0.03M | 0.04M | 3.6x | 2.9x |
| string.email | 54.6M | 11.9M | 8.3M | 4.6x | 6.6x |
| number.int.positive | 94.1M | 16.4M | 12.3M | 5.7x | 7.7x |

**Average: 4.5x faster than Valibot, 24x faster than Zod**

## License

MIT
