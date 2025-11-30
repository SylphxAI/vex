import * as v from 'valibot'
import { z } from 'zod'
import {
	array,
	email,
	int,
	max,
	min,
	num,
	object,
	pipe,
	positive,
	safeParse,
	str,
	uuid,
} from '../src'

// ============================================================
// ⚡ Vex vs Zod vs Valibot - Full Benchmark
// ============================================================

const ITERATIONS = 100_000

interface BenchResult {
	name: string
	vex: number
	zod: number
	valibot: number
}

const results: BenchResult[] = []

function bench(_name: string, fn: () => void, iterations: number): number {
	// Warmup
	for (let i = 0; i < 1000; i++) fn()

	const start = performance.now()
	for (let i = 0; i < iterations; i++) fn()
	const duration = performance.now() - start
	return (iterations / duration) * 1000
}

function runBench(
	name: string,
	vexFn: () => void,
	zodFn: () => void,
	valibotFn: () => void,
	iterations = ITERATIONS
) {
	const vexOps = bench('vex', vexFn, iterations)
	const zodOps = bench('zod', zodFn, iterations)
	const valibotOps = bench('valibot', valibotFn, iterations)

	results.push({ name, vex: vexOps, zod: zodOps, valibot: valibotOps })

	const _vexVsZod = vexOps / zodOps
	const _vexVsValibot = vexOps / valibotOps

	console.log(
		`${name.padEnd(30)} Vex: ${(vexOps / 1e6).toFixed(1).padStart(5)}M  Zod: ${(zodOps / 1e6).toFixed(1).padStart(5)}M  Valibot: ${(valibotOps / 1e6).toFixed(1).padStart(5)}M`
	)
}

// ============================================================
// Test Data
// ============================================================

const validUser = {
	id: '550e8400-e29b-41d4-a716-446655440000',
	name: 'John Doe',
	email: 'john@example.com',
	age: 30,
}

const invalidUser = { id: 'x', name: '', email: 'bad', age: -1 }

const simpleData = { name: 'test', value: 42 }

const users100 = Array.from({ length: 100 }, (_, i) => ({
	id: `550e8400-e29b-41d4-a716-${i.toString(16).padStart(12, '0')}`,
	name: `User ${i}`,
	email: `user${i}@example.com`,
	age: 20 + i,
}))

// ============================================================
// Schemas
// ============================================================

// Vex
const vexUser = object({
	id: pipe(str, uuid),
	name: pipe(str, min(1), max(100)),
	email: pipe(str, email),
	age: pipe(num, int, positive),
})
const vexUsers = array(vexUser)
const vexSimple = object({ name: str, value: num })
const vexEmail = pipe(str, email)
const vexNumber = pipe(num, int, positive)

// Zod
const zodUser = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100),
	email: z.string().email(),
	age: z.number().int().positive(),
})
const zodUsers = z.array(zodUser)
const zodSimple = z.object({ name: z.string(), value: z.number() })
const zodEmail = z.string().email()
const zodNumber = z.number().int().positive()

// Valibot
const valUser = v.object({
	id: v.pipe(v.string(), v.uuid()),
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	email: v.pipe(v.string(), v.email()),
	age: v.pipe(v.number(), v.integer(), v.minValue(1)),
})
const valUsers = v.array(valUser)
const valSimple = v.object({ name: v.string(), value: v.number() })
const valEmail = v.pipe(v.string(), v.email())
const valNumber = v.pipe(v.number(), v.integer(), v.minValue(1))

// ============================================================
// Run Benchmarks
// ============================================================

console.log('='.repeat(90))
console.log(
	`⚡ Vex vs Zod vs Valibot Benchmark (${typeof Bun !== 'undefined' ? 'Bun' : 'Node.js'})`
)
console.log('='.repeat(90))
console.log()

console.log('━━━ Schema Creation ━━━')
runBench(
	'create string',
	() => str,
	() => z.string(),
	() => v.string()
)
runBench(
	'create string + email',
	() => pipe(str, email),
	() => z.string().email(),
	() => v.pipe(v.string(), v.email())
)
runBench(
	'create number + int + positive',
	() => pipe(num, int, positive),
	() => z.number().int().positive(),
	() => v.pipe(v.number(), v.integer(), v.minValue(1))
)
runBench(
	'create object (4 fields)',
	() =>
		object({
			id: pipe(str, uuid),
			name: pipe(str, min(1)),
			email: pipe(str, email),
			age: pipe(num, int),
		}),
	() =>
		z.object({
			id: z.string().uuid(),
			name: z.string().min(1),
			email: z.string().email(),
			age: z.number().int(),
		}),
	() =>
		v.object({
			id: v.pipe(v.string(), v.uuid()),
			name: v.pipe(v.string(), v.minLength(1)),
			email: v.pipe(v.string(), v.email()),
			age: v.pipe(v.number(), v.integer()),
		})
)

console.log()
console.log('━━━ Validation (valid input) ━━━')
runBench(
	'parse string',
	() => str('hello'),
	() => z.string().parse('hello'),
	() => v.parse(v.string(), 'hello')
)
runBench(
	'parse email',
	() => vexEmail('test@example.com'),
	() => zodEmail.parse('test@example.com'),
	() => v.parse(valEmail, 'test@example.com')
)
runBench(
	'parse number.int.positive',
	() => vexNumber(42),
	() => zodNumber.parse(42),
	() => v.parse(valNumber, 42)
)
runBench(
	'parse simple object',
	() => vexSimple(simpleData),
	() => zodSimple.parse(simpleData),
	() => v.parse(valSimple, simpleData)
)
runBench(
	'parse complex object',
	() => vexUser(validUser),
	() => zodUser.parse(validUser),
	() => v.parse(valUser, validUser)
)
runBench(
	'parse array (100 objects)',
	() => vexUsers(users100),
	() => zodUsers.parse(users100),
	() => v.parse(valUsers, users100),
	ITERATIONS / 10
)

console.log()
console.log('━━━ SafeParse ━━━')
runBench(
	'safeParse valid',
	() => safeParse(vexUser)(validUser),
	() => zodUser.safeParse(validUser),
	() => v.safeParse(valUser, validUser)
)
runBench(
	'safeParse invalid',
	() => safeParse(vexUser)(invalidUser),
	() => zodUser.safeParse(invalidUser),
	() => v.safeParse(valUser, invalidUser)
)

// ============================================================
// Summary
// ============================================================

console.log()
console.log('='.repeat(90))
console.log('📊 Summary')
console.log('='.repeat(90))
console.log()

console.log(
	'| Benchmark                      | Vex        | Zod        | Valibot    | Vex/Zod | Vex/Val |'
)
console.log(
	'|--------------------------------|------------|------------|------------|---------|---------|'
)

for (const r of results) {
	const vexVsZod = r.vex / r.zod
	const vexVsVal = r.vex / r.valibot
	console.log(
		`| ${r.name.padEnd(30)} | ${(r.vex / 1e6).toFixed(1).padStart(8)}M | ${(r.zod / 1e6).toFixed(1).padStart(8)}M | ${(r.valibot / 1e6).toFixed(1).padStart(8)}M | ${vexVsZod.toFixed(1).padStart(5)}x | ${vexVsVal.toFixed(1).padStart(5)}x |`
	)
}

console.log()

const avgVsZod = results.reduce((a, r) => a + r.vex / r.zod, 0) / results.length
const avgVsValibot = results.reduce((a, r) => a + r.vex / r.valibot, 0) / results.length

console.log(`✅ Vex is ${avgVsZod.toFixed(1)}x faster than Zod on average`)
console.log(`✅ Vex is ${avgVsValibot.toFixed(1)}x faster than Valibot on average`)
console.log()

// Output JSON for README
console.log('='.repeat(90))
console.log('📋 Data for README')
console.log('='.repeat(90))
console.log(
	JSON.stringify(
		{ avgVsZod: avgVsZod.toFixed(1), avgVsValibot: avgVsValibot.toFixed(1), results },
		null,
		2
	)
)
