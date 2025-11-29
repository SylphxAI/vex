import { z } from 'zod'
import { z as zen } from '../src'

// ============================================================
// 🧘 Zen vs Zod Benchmark
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

// Pre-created schemas (for validation-only benchmarks)
const zenUserSchema = zen.object({
	id: zen.string().uuid(),
	name: zen.string().min(1).max(100),
	email: zen.string().email(),
	age: zen.number().int().positive(),
})

const zenUsersSchema = zen.array(zenUserSchema)

const zenSimpleSchema = zen.object({
	name: zen.string(),
	value: zen.number(),
})

const zenStringSchema = zen.string().email()
const zenNumberSchema = zen.number().int().positive()

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
		`${name.padEnd(35)} ${opsPerSec.toFixed(0).padStart(12)} ops/sec  (${duration.toFixed(2)}ms)`
	)

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
console.log('🧘 Zen vs Zod Benchmark')
console.log('='.repeat(70))
console.log()

// 1. Pre-created schema validation (most common use case)
console.log('━━━ Validation (pre-created schema) ━━━')
runBench('parse simple object', () => zenSimpleSchema.parse(simpleData), () => zodSimpleSchema.parse(simpleData), ITERATIONS)
runBench('parse complex object', () => zenUserSchema.parse(validUser), () => zodUserSchema.parse(validUser), ITERATIONS)
runBench('safeParse object', () => zenUserSchema.safeParse(validUser), () => zodUserSchema.safeParse(validUser), ITERATIONS)
runBench('parse array (100 items)', () => zenUsersSchema.parse(validUsers), () => zodUsersSchema.parse(validUsers), ITERATIONS / 10)

// 2. Primitive validation
console.log('━━━ Primitive Validation ━━━')
runBench('string.email (pre-created)', () => zenStringSchema.parse('test@example.com'), () => zodStringSchema.parse('test@example.com'), ITERATIONS)
runBench('number.int.positive (pre-created)', () => zenNumberSchema.parse(42), () => zodNumberSchema.parse(42), ITERATIONS)

// 3. Schema creation + validation (measures schema creation overhead)
console.log('━━━ Schema Creation + Validation ━━━')
runBench('create + parse string', () => zen.string().email().parse('test@example.com'), () => z.string().email().parse('test@example.com'), ITERATIONS)
runBench('create + parse object', () => {
	zen.object({ name: zen.string(), value: zen.number() }).parse(simpleData)
}, () => {
	z.object({ name: z.string(), value: z.number() }).parse(simpleData)
}, ITERATIONS / 2)

// 4. Schema creation only
console.log('━━━ Schema Creation Only ━━━')
runBench('create string schema', () => { zen.string().min(1).max(100).email() }, () => { z.string().min(1).max(100).email() }, ITERATIONS)
runBench('create object schema', () => {
	zen.object({ name: zen.string().min(1), age: zen.number().int() })
}, () => {
	z.object({ name: z.string().min(1), age: z.number().int() })
}, ITERATIONS)

// ============================================================
// Summary
// ============================================================

console.log('='.repeat(70))
console.log('📊 Summary')
console.log('='.repeat(70))
console.log()

// Table header
console.log('| Benchmark                          | Zen ops/s    | Zod ops/s    | Ratio  |')
console.log('|------------------------------------|--------------|--------------|--------|')

for (const r of results) {
	const indicator = r.ratio >= 1 ? '🟢' : '🔴'
	console.log(
		`| ${r.name.padEnd(34)} | ${r.zen.toFixed(0).padStart(12)} | ${r.zod.toFixed(0).padStart(12)} | ${indicator} ${r.ratio.toFixed(2)}x |`
	)
}

console.log()

// Calculate averages
const validationResults = results.filter(r => r.name.includes('parse') || r.name.includes('Parse'))
const creationResults = results.filter(r => r.name.includes('create'))

const avgValidation = validationResults.reduce((a, b) => a + b.ratio, 0) / validationResults.length
const avgCreation = creationResults.reduce((a, b) => a + b.ratio, 0) / creationResults.length
const avgOverall = results.reduce((a, b) => a + b.ratio, 0) / results.length

console.log(`📈 Validation average:    ${avgValidation.toFixed(2)}x`)
console.log(`📈 Schema creation avg:   ${avgCreation.toFixed(2)}x`)
console.log(`📈 Overall average:       ${avgOverall.toFixed(2)}x`)
console.log()

if (avgOverall >= 1) {
	console.log(`✅ Zen is ${avgOverall.toFixed(2)}x faster than Zod on average`)
} else {
	console.log(`⚠️  Zen is ${(1/avgOverall).toFixed(2)}x slower than Zod on average`)
}
