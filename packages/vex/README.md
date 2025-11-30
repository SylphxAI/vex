# @sylphx/vex

> ⚡ Ultra-fast schema validation - 90x faster than Zod, 6x faster than Valibot

## Features

- ⚡ **Blazing Fast** - Constant validators, zero allocation
- 🌳 **Tree-shakeable** - Only bundle what you use
- 🔷 **TypeScript-first** - Full type inference
- 📦 **Tiny** - ~8KB (min+gzip)
- 0️⃣ **Zero dependencies**

## Why Vex?

| Library | Design | Schema Creation | Validation |
|---------|--------|-----------------|------------|
| **Vex** | Constants | Zero overhead | Fastest |
| Valibot | Factory functions | Allocates objects | Fast |
| Zod | Builder pattern | Allocates chains | Slowest |

```typescript
// Vex - constants (zero allocation)
str                    // already a validator function
pipe(str, email)       // compose existing functions

// Valibot - factory functions (allocates each call)
v.string()             // creates new object
v.pipe(v.string(), v.email())

// Zod - builder pattern (allocates chain)
z.string().email()     // creates new objects
```

## Installation

```bash
npm install @sylphx/vex
# or
bun add @sylphx/vex
```

## Quick Start

```typescript
import { pipe, str, num, int, email, positive, nonempty, object, safeParse } from '@sylphx/vex'

// Compose validators with pipe()
const validateEmail = pipe(str, email)
const validateAge = pipe(num, int, positive)

// Object validation
const validateUser = object({
  name: pipe(str, nonempty),
  email: pipe(str, email),
  age: pipe(num, int, positive),
})

// Direct validation (throws on error)
const user = validateUser({ name: 'Alice', email: 'alice@example.com', age: 30 })

// Safe validation (returns result)
const result = safeParse(validateUser)(data)
if (result.success) {
  console.log(result.data)
} else {
  console.log(result.error)
}
```

## API

### Type Validators

```typescript
str      // string
num      // number (excludes NaN)
bool     // boolean
arr      // array
obj      // object
bigInt   // bigint
date     // Date
```

### String Validators

```typescript
pipe(str, min(1))           // minimum length
pipe(str, max(100))         // maximum length
pipe(str, len(10))          // exact length
pipe(str, nonempty)         // non-empty (min 1)
pipe(str, email)            // email format
pipe(str, url)              // URL format
pipe(str, uuid)             // UUID format
pipe(str, pattern(/regex/)) // custom regex
pipe(str, startsWith('x'))  // starts with
pipe(str, endsWith('x'))    // ends with
pipe(str, includes('x'))    // contains
```

### Number Validators

```typescript
pipe(num, int)           // integer
pipe(num, positive)      // > 0
pipe(num, negative)      // < 0
pipe(num, finite)        // finite
pipe(num, gte(0))        // >= 0
pipe(num, lte(100))      // <= 100
pipe(num, gt(0))         // > 0
pipe(num, lt(100))       // < 100
pipe(num, multipleOf(5)) // divisible by
```

### Transforms

```typescript
pipe(str, trim)      // trim whitespace
pipe(str, lower)     // lowercase
pipe(str, upper)     // uppercase
pipe(str, toInt)     // parse to integer
pipe(str, toFloat)   // parse to float
pipe(str, toDate)    // parse to Date
```

### Composition

```typescript
// pipe() - compose validators left to right
const validateEmail = pipe(str, trim, lower, email)

// optional() - allows undefined
const optionalEmail = optional(pipe(str, email))

// nullable() - allows null
const nullableEmail = nullable(pipe(str, email))

// withDefault() - provide default value
const emailWithDefault = withDefault(pipe(str, email), 'default@example.com')
```

### Objects & Arrays

```typescript
// object() - validate object shape
const validateUser = object({
  name: pipe(str, nonempty),
  age: pipe(num, int, positive),
  email: optional(pipe(str, email)),
})

// array() - validate array items
const validateTags = array(pipe(str, nonempty))
const validateUsers = array(validateUser)
```

### Error Handling

```typescript
import { safeParse, tryParse, ValidationError } from '@sylphx/vex'

// safeParse - returns result object
const result = safeParse(validateUser)(data)
if (result.success) {
  console.log(result.data)
} else {
  console.log(result.error)
}

// tryParse - returns null on error
const data = tryParse(validateUser)(input)

// Direct validation throws ValidationError
try {
  validateUser(invalidData)
} catch (e) {
  if (e instanceof ValidationError) {
    console.log(e.message)
  }
}
```

## Type Inference

```typescript
const validateUser = object({
  id: pipe(str, uuid),
  email: pipe(str, email),
  age: pipe(num, int, positive),
})

// Infer type from validator
type User = ReturnType<typeof validateUser>
// { id: string; email: string; age: number }
```

## Performance

Benchmarks (Bun, ops/sec, higher is better):

| Operation | Vex | Zod | Valibot | Vex/Zod | Vex/Val |
|-----------|-----|-----|---------|---------|---------|
| create string | 390M | 1.0M | 43M | 375x | 9x |
| create string + email | 69M | 0.4M | 4.4M | 194x | 16x |
| create object (4 fields) | 6.7M | 0.1M | 1.0M | 84x | 6x |
| parse string | 246M | 1.2M | 31M | 206x | 8x |
| parse email | 51M | 12M | 18M | 4x | 3x |
| parse simple object | 23M | 21M | 25M | 1.1x | 0.9x |
| parse complex object | 7.8M | 4.2M | 3.4M | 1.9x | 2.3x |
| safeParse valid | 6.5M | 4.9M | 4.0M | 1.3x | 1.6x |
| safeParse invalid | 15.6M | 0.2M | 1.9M | 70x | 8x |

**Average: 93x faster than Zod, 6x faster than Valibot**

Run benchmarks:
```bash
bun run bench
```

## License

MIT
