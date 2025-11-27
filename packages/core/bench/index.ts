import { z } from 'zod'
import { z as zen } from '../src'

// ============================================================
// Benchmark: Zen vs Zod
// ============================================================

const ITERATIONS = 100_000

// Test data
const validUser = {
	id: '550e8400-e29b-41d4-a716-446655440000',
	name: 'John Doe',
	email: 'john@example.com',
	age: 30,
}

// Generate valid UUIDs (format: 8-4-4-4-12)
const generateUUID = (i: number) => {
	const hex = i.toString(16).padStart(12, '0')
	return `550e8400-e29b-41d4-a716-${hex}`
}

const validUsers = Array.from({ length: 100 }, (_, i) => ({
	id: generateUUID(i),
	name: `User ${i}`,
	email: `user${i}@example.com`,
	age: 20 + i,
}))

// ============================================================
// Schemas
// ============================================================

// Zen
const zenUserSchema = zen.object({
	id: zen.string().uuid(),
	name: zen.string().min(1).max(100),
	email: zen.string().email(),
	age: zen.number().int().positive(),
})

const zenUsersSchema = zen.array(zenUserSchema)

// Zod Schema
const zodUserSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100),
	email: z.string().email(),
	age: z.number().int().positive(),
})

const zodUsersSchema = z.array(zodUserSchema)

// ============================================================
// Benchmark Functions
// ============================================================

function bench(name: string, fn: () => void, iterations: number): number {
	// Warmup
	for (let i = 0; i < 1000; i++) {
		fn()
	}

	const start = performance.now()
	for (let i = 0; i < iterations; i++) {
		fn()
	}
	const end = performance.now()
	const duration = end - start
	const opsPerSec = (iterations / duration) * 1000

	console.log(
		`${name.padEnd(30)} ${opsPerSec.toFixed(0).padStart(10)} ops/sec  (${duration.toFixed(2)}ms)`
	)

	return opsPerSec
}

// ============================================================
// Run Benchmarks
// ============================================================

console.log('='.repeat(60))
console.log('Zen vs Zod Benchmark')
console.log('='.repeat(60))
console.log()

console.log('--- Single Object Validation ---')
const zenSingle = bench('Zen:  parse(user)', () => zenUserSchema.parse(validUser), ITERATIONS)
const zodSingle = bench('Zod:  parse(user)', () => zodUserSchema.parse(validUser), ITERATIONS)
console.log(`→ Pico is ${(zenSingle / zodSingle).toFixed(2)}x faster`)
console.log()

console.log('--- Single Object safeParse ---')
const zenSafe = bench(
	'Zen:  safeParse(user)',
	() => zenUserSchema.safeParse(validUser),
	ITERATIONS
)
const zodSafe = bench('Zod:  safeParse(user)', () => zodUserSchema.safeParse(validUser), ITERATIONS)
console.log(`→ Pico is ${(zenSafe / zodSafe).toFixed(2)}x faster`)
console.log()

console.log('--- Array Validation (100 items) ---')
const zenArray = bench(
	'Zen:  parse(users[])',
	() => zenUsersSchema.parse(validUsers),
	ITERATIONS / 10
)
const zodArray = bench(
	'Zod:  parse(users[])',
	() => zodUsersSchema.parse(validUsers),
	ITERATIONS / 10
)
console.log(`→ Pico is ${(zenArray / zodArray).toFixed(2)}x faster`)
console.log()

console.log('--- String Validation ---')
const zenString = bench(
	'Zen:  string().email()',
	() => zen.string().email().parse('test@example.com'),
	ITERATIONS
)
const zodString = bench(
	'Zod:  string().email()',
	() => z.string().email().parse('test@example.com'),
	ITERATIONS
)
console.log(`→ Pico is ${(zenString / zodString).toFixed(2)}x faster`)
console.log()

console.log('--- Schema Creation ---')
const zenCreate = bench(
	'Zen:  create schema',
	() => {
		zen.object({
			name: zen.string().min(1),
			age: zen.number().int(),
		})
	},
	ITERATIONS
)
const zodCreate = bench(
	'Zod:  create schema',
	() => {
		z.object({
			name: z.string().min(1),
			age: z.number().int(),
		})
	},
	ITERATIONS
)
console.log(`→ Pico is ${(zenCreate / zodCreate).toFixed(2)}x faster`)
console.log()

console.log('='.repeat(60))
console.log('Summary')
console.log('='.repeat(60))

const avgSpeedup =
	(zenSingle / zodSingle +
		zenSafe / zodSafe +
		zenArray / zodArray +
		zenString / zodString +
		zenCreate / zodCreate) /
	5

console.log(`Average speedup: ${avgSpeedup.toFixed(2)}x faster than Zod`)
