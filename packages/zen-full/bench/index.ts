import { z } from 'zod'
import { pipe, str, num, int, positive, email, uuid, min, max, object, array, safeParse } from '../src'

// ============================================================
// 🧘 Zen (Functional) vs Zod Benchmark
// ============================================================

const ITERATIONS = 100_000

// Test data
const validUser = {
	id: '550e8400-e29b-41d4-a716-446655440000',
	name: 'John Doe',
	email: 'john@example.com',
	age: 30,
}

const simpleData = { name: 'test', value: 42 }

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

// Zen (functional)
const zenUserValidator = object({
	id: pipe(str, uuid),
	name: pipe(str, min(1), max(100)),
	email: pipe(str, email),
	age: pipe(num, int, positive),
})

const zenUsersValidator = array(zenUserValidator)

const zenSimpleValidator = object({
	name: str,
	value: num,
})

const zenEmailValidator = pipe(str, email)
const zenNumberValidator = pipe(num, int, positive)

// Zod
const zodUserSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100),
	email: z.string().email(),
	age: z.number().int().positive(),
})

const zodUsersSchema = z.array(zodUserSchema)

const zodSimpleSchema = z.object({
	name: z.string(),
	value: z.number(),
})

const zodStringSchema = z.string().email()
const zodNumberSchema = z.number().int().positive()

// ============================================================
// Benchmark Functions
// ============================================================

interface BenchResult {
	name: string
	zen: number
	zod: number
	ratio: number
}

const results: BenchResult[] = []

function bench(name: string, fn: () => void, iterations: number): number {
	// Warmup
	for (let i = 0; i < 1000; i++) fn()

	const start = performance.now()
	for (let i = 0; i < iterations; i++) fn()
	const duration = performance.now() - start
	const opsPerSec = (iterations / duration) * 1000

	console.log(`${name.padEnd(35)} ${(opsPerSec / 1e6).toFixed(1).padStart(6)}M ops/sec`)
	return opsPerSec
}

function runBench(category: string, zenFn: () => void, zodFn: () => void, iterations: number) {
	const zenOps = bench(`Zen:  ${category}`, zenFn, iterations)
	const zodOps = bench(`Zod:  ${category}`, zodFn, iterations)
	const ratio = zenOps / zodOps
	const indicator = ratio >= 1 ? '🟢' : '🔴'
	console.log(`${indicator} Zen is ${ratio.toFixed(2)}x ${ratio >= 1 ? 'faster' : 'slower'}`)
	console.log()
	results.push({ name: category, zen: zenOps, zod: zodOps, ratio })
}

// ============================================================
// Run Benchmarks
// ============================================================

console.log('='.repeat(70))
console.log('🧘 Zen (Functional) vs Zod Benchmark')
console.log('='.repeat(70))
console.log()

// 1. Direct validation (throws on error)
console.log('━━━ Direct Validation (throws) ━━━')
runBench(
	'simple object',
	() => zenSimpleValidator(simpleData),
	() => zodSimpleSchema.parse(simpleData),
	ITERATIONS
)
runBench(
	'complex object',
	() => zenUserValidator(validUser),
	() => zodUserSchema.parse(validUser),
	ITERATIONS
)
runBench(
	'array (100 items)',
	() => zenUsersValidator(validUsers),
	() => zodUsersSchema.parse(validUsers),
	ITERATIONS / 10
)

// 2. SafeParse (returns Result)
console.log('━━━ SafeParse ━━━')
runBench(
	'safeParse object (valid)',
	() => safeParse(zenUserValidator)(validUser),
	() => zodUserSchema.safeParse(validUser),
	ITERATIONS
)
runBench(
	'safeParse object (invalid)',
	() => safeParse(zenUserValidator)({ name: '', age: -1, email: 'bad', id: 'x' }),
	() => zodUserSchema.safeParse({ name: '', age: -1, email: 'bad', id: 'x' }),
	ITERATIONS
)

// 3. Primitive validation
console.log('━━━ Primitive Validation ━━━')
runBench(
	'string.email',
	() => zenEmailValidator('test@example.com'),
	() => zodStringSchema.parse('test@example.com'),
	ITERATIONS
)
runBench(
	'number.int.positive',
	() => zenNumberValidator(42),
	() => zodNumberSchema.parse(42),
	ITERATIONS
)

// 4. Schema creation
console.log('━━━ Schema Creation ━━━')
runBench(
	'create email validator',
	() => pipe(str, email),
	() => z.string().email(),
	ITERATIONS
)
runBench(
	'create object validator',
	() => object({ name: str, value: num }),
	() => z.object({ name: z.string(), value: z.number() }),
	ITERATIONS
)

// ============================================================
// Summary
// ============================================================

console.log('='.repeat(70))
console.log('📊 Summary')
console.log('='.repeat(70))
console.log()

console.log('| Benchmark                    | Zen        | Zod        | Ratio  |')
console.log('|------------------------------|------------|------------|--------|')

for (const r of results) {
	const indicator = r.ratio >= 1 ? '🟢' : '🔴'
	console.log(
		`| ${r.name.padEnd(28)} | ${(r.zen / 1e6).toFixed(1).padStart(8)}M | ${(r.zod / 1e6).toFixed(1).padStart(8)}M | ${indicator} ${r.ratio.toFixed(2)}x |`
	)
}

console.log()

const avgOverall = results.reduce((a, b) => a + b.ratio, 0) / results.length

if (avgOverall >= 1) {
	console.log(`✅ Zen is ${avgOverall.toFixed(2)}x faster than Zod on average`)
} else {
	console.log(`⚠️  Zen is ${(1 / avgOverall).toFixed(2)}x slower than Zod on average`)
}
