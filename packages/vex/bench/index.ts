import * as v from 'valibot'
import { z } from 'zod'
import { array, email, int, max, min, num, object, positive, safeParse, str, uuid } from '../src'

// ============================================================
// ⚡ Vex vs Valibot vs Zod Benchmark
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

// Vex
const vexUserValidator = object({
	id: str(uuid),
	name: str(min(1), max(100)),
	email: str(email),
	age: num(int, positive),
})

const vexUsersValidator = array(vexUserValidator)

const vexSimpleValidator = object({
	name: str(),
	value: num(),
})

const vexEmailValidator = str(email)
const vexNumberValidator = num(int, positive)

// Valibot
const valibotUserSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	email: v.pipe(v.string(), v.email()),
	age: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

const valibotUsersSchema = v.array(valibotUserSchema)

const valibotSimpleSchema = v.object({
	name: v.string(),
	value: v.number(),
})

const valibotEmailSchema = v.pipe(v.string(), v.email())
const valibotNumberSchema = v.pipe(v.number(), v.integer(), v.minValue(1))

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
	vex: number
	valibot: number
	zod: number
}

const results: BenchResult[] = []

function bench(name: string, fn: () => void, iterations: number): number {
	// Warmup - important for JIT
	for (let i = 0; i < 5000; i++) fn()

	const start = performance.now()
	for (let i = 0; i < iterations; i++) fn()
	const duration = performance.now() - start
	const opsPerSec = (iterations / duration) * 1000

	console.log(`${name.padEnd(40)} ${(opsPerSec / 1e6).toFixed(1).padStart(7)}M ops/sec`)
	return opsPerSec
}

function runBench(
	category: string,
	vexFn: () => void,
	valibotFn: () => void,
	zodFn: () => void,
	iterations: number
) {
	const vexOps = bench(`Vex:      ${category}`, vexFn, iterations)
	const valibotOps = bench(`Valibot:  ${category}`, valibotFn, iterations)
	const zodOps = bench(`Zod:      ${category}`, zodFn, iterations)

	const vsValibot = vexOps / valibotOps
	const vsZod = vexOps / zodOps

	console.log(`  → Vex is ${vsValibot.toFixed(2)}x vs Valibot, ${vsZod.toFixed(2)}x vs Zod`)
	console.log()

	results.push({ name: category, vex: vexOps, valibot: valibotOps, zod: zodOps })
}

// ============================================================
// Run Benchmarks
// ============================================================

console.log('='.repeat(70))
console.log('⚡ Vex vs Valibot vs Zod Benchmark')
console.log('='.repeat(70))
console.log()

// 1. Direct validation (throws on error)
console.log('━━━ Direct Validation (throws) ━━━')
runBench(
	'simple object',
	() => vexSimpleValidator(simpleData),
	() => v.parse(valibotSimpleSchema, simpleData),
	() => zodSimpleSchema.parse(simpleData),
	ITERATIONS
)
runBench(
	'complex object',
	() => vexUserValidator(validUser),
	() => v.parse(valibotUserSchema, validUser),
	() => zodUserSchema.parse(validUser),
	ITERATIONS
)
runBench(
	'array (100 items)',
	() => vexUsersValidator(validUsers),
	() => v.parse(valibotUsersSchema, validUsers),
	() => zodUsersSchema.parse(validUsers),
	ITERATIONS / 10
)

// 2. SafeParse (returns Result)
console.log('━━━ SafeParse ━━━')
runBench(
	'safeParse object (valid)',
	() => safeParse(vexUserValidator)(validUser),
	() => v.safeParse(valibotUserSchema, validUser),
	() => zodUserSchema.safeParse(validUser),
	ITERATIONS
)
runBench(
	'safeParse object (invalid)',
	() => safeParse(vexUserValidator)({ name: '', age: -1, email: 'bad', id: 'x' }),
	() => v.safeParse(valibotUserSchema, { name: '', age: -1, email: 'bad', id: 'x' }),
	() => zodUserSchema.safeParse({ name: '', age: -1, email: 'bad', id: 'x' }),
	ITERATIONS
)

// 3. Primitive validation
console.log('━━━ Primitive Validation ━━━')
runBench(
	'string.email',
	() => vexEmailValidator('test@example.com'),
	() => v.parse(valibotEmailSchema, 'test@example.com'),
	() => zodStringSchema.parse('test@example.com'),
	ITERATIONS
)
runBench(
	'number.int.positive',
	() => vexNumberValidator(42),
	() => v.parse(valibotNumberSchema, 42),
	() => zodNumberSchema.parse(42),
	ITERATIONS
)

// 4. Schema creation
console.log('━━━ Schema Creation ━━━')
runBench(
	'create email validator',
	() => str(email),
	() => v.pipe(v.string(), v.email()),
	() => z.string().email(),
	ITERATIONS
)
runBench(
	'create object validator',
	() => object({ name: str(), value: num() }),
	() => v.object({ name: v.string(), value: v.number() }),
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

console.log(
	'| Benchmark                    | Vex        | Valibot    | Zod        | vs Valibot | vs Zod  |'
)
console.log(
	'|------------------------------|------------|------------|------------|------------|---------|'
)

for (const r of results) {
	const vsV = r.vex / r.valibot
	const vsZ = r.vex / r.zod
	const indV = vsV >= 1 ? '🟢' : '🔴'
	const indZ = vsZ >= 1 ? '🟢' : '🔴'
	console.log(
		`| ${r.name.padEnd(28)} | ${(r.vex / 1e6).toFixed(1).padStart(8)}M | ${(r.valibot / 1e6).toFixed(1).padStart(8)}M | ${(r.zod / 1e6).toFixed(1).padStart(8)}M | ${indV} ${vsV.toFixed(2).padStart(5)}x | ${indZ} ${vsZ.toFixed(2).padStart(4)}x |`
	)
}

console.log()

const avgVsValibot = results.reduce((a, b) => a + b.vex / b.valibot, 0) / results.length
const avgVsZod = results.reduce((a, b) => a + b.vex / b.zod, 0) / results.length

console.log(`✅ Vex is ${avgVsValibot.toFixed(2)}x faster than Valibot on average`)
console.log(`✅ Vex is ${avgVsZod.toFixed(2)}x faster than Zod on average`)
