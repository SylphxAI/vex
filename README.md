# @sylphx/vex

> ⚡ Ultra-fast schema validation - 90x faster than Zod, 6x faster than Valibot

## Packages

| Package | Description |
|---------|-------------|
| [@sylphx/vex](./packages/vex) | Schema validation library |

## Quick Start

```bash
npm install @sylphx/vex
```

```typescript
import { pipe, str, num, int, email, positive, object, safeParse } from '@sylphx/vex'

const validateUser = object({
  name: pipe(str, nonempty),
  email: pipe(str, email),
  age: pipe(num, int, positive),
})

// Throws on error
const user = validateUser(data)

// Returns result
const result = safeParse(validateUser)(data)
```

## Why Vex?

**Pure functional design** - validators are constants, not factory functions:

```typescript
// Vex - zero allocation
str                  // constant
pipe(str, email)     // compose constants

// Others - allocates every call
z.string().email()   // Zod
v.string()           // Valibot
```

## Performance

| | Vex | Zod | Valibot |
|--|-----|-----|---------|
| Speed | ⚡ 90x | 1x | ~15x |
| Schema creation | Zero overhead | Slow | Medium |
| Tree-shakeable | ✅ | ❌ | ✅ |

### Benchmarks (Bun)

| Operation | Vex | Zod | Valibot | Vex/Zod |
|-----------|-----|-----|---------|---------|
| create string | 390M | 1.0M | 43M | 375x |
| create object (4 fields) | 6.7M | 0.1M | 1.0M | 84x |
| parse complex object | 7.8M | 4.2M | 3.4M | 1.9x |
| safeParse invalid | 15.6M | 0.2M | 1.9M | 70x |

**Average: 93x faster than Zod, 6x faster than Valibot**

## Development

```bash
# Install
bun install

# Test
bun test

# Benchmark
bun run bench

# Build
bun run build
```

## License

MIT
