# @pico-schema/core

> Ultra-fast, tiny schema validation library with full TypeScript inference

## Features

- 🚀 **Fast** - 2-5x faster than Zod
- 📦 **Tiny** - < 2KB core (min+gzip)
- 🔷 **TypeScript-first** - Full type inference
- 🔌 **Compatible** - Standard Schema + Zod API
- 🌳 **Tree-shakeable** - Only bundle what you use
- 0️⃣ **Zero dependencies**

## Installation

```bash
bun add @pico-schema/core
# or
npm install @pico-schema/core
```

## Quick Start

```typescript
import { s, type Infer } from '@pico-schema/core'

// Define a schema
const UserSchema = s.object({
  id: s.string().uuid(),
  name: s.string().min(1).max(100),
  email: s.string().email(),
  age: s.number().int().positive().optional(),
  role: s.union([s.literal('admin'), s.literal('user')]),
  tags: s.array(s.string()),
})

// Infer TypeScript type
type User = Infer<typeof UserSchema>

// Validate data
const user = UserSchema.parse(data) // throws on error
const result = UserSchema.safeParse(data) // returns { success, data } or { success, issues }
```

## API

### Primitives

```typescript
s.string()     // string
s.number()     // number (excludes NaN)
s.boolean()    // boolean
s.literal('x') // literal value
```

### String validators

```typescript
s.string()
  .min(1)           // minimum length
  .max(100)         // maximum length
  .length(10)       // exact length
  .email()          // email format
  .url()            // URL format
  .uuid()           // UUID format
  .regex(/pattern/) // custom regex
  .startsWith('x')  // starts with prefix
  .endsWith('x')    // ends with suffix
  .includes('x')    // contains substring
  .nonempty()       // alias for min(1)
```

### Number validators

```typescript
s.number()
  .min(0)         // minimum value
  .max(100)       // maximum value
  .int()          // integer only
  .positive()     // > 0
  .negative()     // < 0
  .nonnegative()  // >= 0
  .multipleOf(5)  // divisible by
  .finite()       // finite number
  .safe()         // safe integer
```

### Objects

```typescript
s.object({
  name: s.string(),
  age: s.number(),
})
  .partial()      // all fields optional
  .pick(['name']) // pick specific fields
  .omit(['age'])  // omit specific fields
  .extend({})     // add more fields
  .passthrough()  // allow extra keys
  .strict()       // reject extra keys
```

### Arrays

```typescript
s.array(s.string())
  .min(1)       // minimum length
  .max(10)      // maximum length
  .length(5)    // exact length
  .nonempty()   // alias for min(1)
```

### Unions

```typescript
s.union([s.string(), s.number()])
s.union([s.literal('a'), s.literal('b')]) // enum-like
```

### Modifiers

```typescript
s.string().optional()  // string | undefined
s.string().nullable()  // string | null
```

## Framework Compatibility

### Standard Schema

Pico Schema implements [Standard Schema v1](https://standardschema.dev/), making it compatible with:

- tRPC
- TanStack Form
- Hono
- And more...

```typescript
// Works directly with Standard Schema compatible frameworks
trpc.procedure.input(UserSchema)
```

### Zod Compatibility

Pico Schema includes Zod-compatible properties (`_def`, `_zod`) for frameworks that detect Zod:

```typescript
// Works with Zod resolvers
import { zodResolver } from '@hookform/resolvers/zod'

useForm({
  resolver: zodResolver(UserSchema), // ✅ Works!
})
```

### Zod Drop-in Replacement

```typescript
// Replace this:
import { z } from 'zod'

// With this:
import { z } from '@pico-schema/core/zod'

// Same API!
const schema = z.object({
  name: z.string().min(1),
})
```

## Type Inference

```typescript
import { type Infer, type Input } from '@pico-schema/core'

const Schema = s.object({
  name: s.string(),
})

type SchemaType = Infer<typeof Schema>   // output type
type SchemaInput = Input<typeof Schema>  // input type
```

## Error Handling

```typescript
import { SchemaError } from '@pico-schema/core'

try {
  schema.parse(data)
} catch (error) {
  if (error instanceof SchemaError) {
    console.log(error.issues)   // array of issues
    console.log(error.flatten()) // { formErrors, fieldErrors }
    console.log(error.format())  // formatted string
  }
}
```

## Performance

Benchmarks (ops/sec, higher is better):

| Operation | Pico Schema | Zod | Speedup |
|-----------|-------------|-----|---------|
| parse(object) | 2,500,000 | 800,000 | 3.1x |
| safeParse(object) | 2,400,000 | 750,000 | 3.2x |
| parse(array[100]) | 25,000 | 8,000 | 3.1x |
| string().email() | 3,000,000 | 1,200,000 | 2.5x |

Run benchmarks:
```bash
bun run bench
```

## License

MIT
