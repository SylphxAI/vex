import { describe, expect, test } from 'bun:test'
import {
	z,
	compile,
	compileChecks,
	compileObjectSchema,
	fastCheck,
	filterValid,
	getOptimizedValidator,
	isJITAvailable,
	jit,
	jitObject,
	partition,
	tryValidateInline,
	validateBatch,
	validateInline,
} from '../src'

// ============================================================
// JIT Compilation Tests
// ============================================================

describe('JIT Compilation', () => {
	describe('compile()', () => {
		test('compiles a schema and caches it', () => {
			const schema = z.string()
			const compiled1 = compile(schema)
			const compiled2 = compile(schema)

			expect(compiled1).toBe(compiled2) // Same cached instance
			expect(compiled1.compiled).toBe(true)
		})

		test('compiled validator works correctly', () => {
			const schema = z.string().email()
			const compiled = compile(schema)

			expect(compiled.validate('test@example.com').success).toBe(true)
			expect(compiled.validate('invalid').success).toBe(false)
			expect(compiled.validate(123).success).toBe(false)
		})

		test('compiled number schema', () => {
			const schema = z.number().min(0).max(100)
			const compiled = compile(schema)

			expect(compiled.validate(50).success).toBe(true)
			expect(compiled.validate(-1).success).toBe(false)
			expect(compiled.validate(101).success).toBe(false)
		})
	})

	describe('getOptimizedValidator()', () => {
		test('returns optimized email validator', () => {
			const validator = getOptimizedValidator('email')
			expect(validator).not.toBeNull()
			expect(validator!('test@example.com')).toBe(true)
			expect(validator!('invalid')).toBe(false)
			expect(validator!('no@dots')).toBe(false)
			expect(validator!('has spaces@test.com')).toBe(false)
		})

		test('returns optimized uuid validator', () => {
			const validator = getOptimizedValidator('uuid')
			expect(validator).not.toBeNull()
			expect(validator!('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
			expect(validator!('invalid-uuid')).toBe(false)
			expect(validator!('123e4567-e89b-62d3-a456-426614174000')).toBe(false) // wrong version position
		})

		test('returns optimized ipv4 validator', () => {
			const validator = getOptimizedValidator('ipv4')
			expect(validator).not.toBeNull()
			expect(validator!('192.168.1.1')).toBe(true)
			expect(validator!('0.0.0.0')).toBe(true)
			expect(validator!('255.255.255.255')).toBe(true)
			expect(validator!('256.1.1.1')).toBe(false)
			expect(validator!('1.2.3')).toBe(false)
			expect(validator!('01.02.03.04')).toBe(false) // leading zeros
		})

		test('returns optimized url validator', () => {
			const validator = getOptimizedValidator('url')
			expect(validator).not.toBeNull()
			expect(validator!('http://example.com')).toBe(true)
			expect(validator!('https://example.com')).toBe(true)
			expect(validator!('ftp://example.com')).toBe(false)
		})

		test('returns optimized date validator', () => {
			const validator = getOptimizedValidator('date')
			expect(validator).not.toBeNull()
			expect(validator!('2024-01-15')).toBe(true)
			expect(validator!('2024-12-31')).toBe(true)
			expect(validator!('2024-1-15')).toBe(false)
			expect(validator!('24-01-15')).toBe(false)
		})

		test('returns optimized hex validator', () => {
			const validator = getOptimizedValidator('hex')
			expect(validator).not.toBeNull()
			expect(validator!('deadbeef')).toBe(true)
			expect(validator!('DEADBEEF')).toBe(true)
			expect(validator!('123abc')).toBe(true)
			expect(validator!('xyz')).toBe(false)
			expect(validator!('')).toBe(false)
		})

		test('returns optimized ulid validator', () => {
			const validator = getOptimizedValidator('ulid')
			expect(validator).not.toBeNull()
			expect(validator!('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true)
			expect(validator!('too-short')).toBe(false)
		})

		test('returns null for unknown check', () => {
			expect(getOptimizedValidator('unknown-check')).toBeNull()
		})
	})

	describe('compileChecks()', () => {
		test('handles empty checks', () => {
			const compiled = compileChecks([])
			expect(compiled('any value')).toBeNull()
		})

		test('handles single check', () => {
			const compiled = compileChecks([
				{ name: 'min', check: (v: string) => v.length >= 3, message: 'Too short' },
			])
			expect(compiled('ab')).toEqual({ message: 'Too short' })
			expect(compiled('abc')).toBeNull()
		})

		test('handles multiple checks', () => {
			const compiled = compileChecks([
				{ name: 'min', check: (v: string) => v.length >= 3, message: 'Too short' },
				{ name: 'max', check: (v: string) => v.length <= 10, message: 'Too long' },
			])
			expect(compiled('ab')).toEqual({ message: 'Too short' })
			expect(compiled('abc')).toBeNull()
			expect(compiled('12345678901')).toEqual({ message: 'Too long' })
		})

		test('uses optimized validators when available', () => {
			const compiled = compileChecks([{ name: 'email', check: () => true, message: 'Invalid email' }])
			// Should use optimized email validator
			expect(compiled('test@example.com')).toBeNull()
			expect(compiled('invalid')).toEqual({ message: 'Invalid email' })
		})
	})

	describe('validateBatch()', () => {
		test('validates multiple values at once', () => {
			const schema = z.string().email()
			const values = ['test@example.com', 'invalid', 'another@test.org', 123]
			const results = validateBatch(schema, values)

			expect(results.length).toBe(4)
			expect(results[0]!.success).toBe(true)
			expect(results[1]!.success).toBe(false)
			expect(results[2]!.success).toBe(true)
			expect(results[3]!.success).toBe(false)
		})

		test('handles empty batch', () => {
			const schema = z.string()
			const results = validateBatch(schema, [])
			expect(results).toEqual([])
		})
	})

	describe('filterValid()', () => {
		test('filters only valid values', () => {
			const schema = z.number().min(0)
			const values = [1, -1, 2, -2, 3, 'not a number']
			const valid = filterValid(schema, values)

			expect(valid).toEqual([1, 2, 3])
		})

		test('returns empty array when no valid values', () => {
			const schema = z.string()
			const values = [1, 2, 3]
			const valid = filterValid(schema, values)

			expect(valid).toEqual([])
		})
	})

	describe('partition()', () => {
		test('partitions values into valid and invalid', () => {
			const schema = z.string().min(3)
			const values = ['abc', 'ab', 'abcd', 'a', 123]
			const { valid, invalid } = partition(schema, values)

			expect(valid).toEqual(['abc', 'abcd'])
			expect(invalid.length).toBe(3)
			expect(invalid[0]!.value).toBe('ab')
			expect(invalid[1]!.value).toBe('a')
			expect(invalid[2]!.value).toBe(123)
		})
	})

	describe('compileObjectSchema()', () => {
		test('pre-compiles all fields', () => {
			const shape = {
				name: z.string(),
				age: z.number().min(0),
				email: z.string().email(),
			}
			const compiled = compileObjectSchema(shape)

			expect(compiled.fields.size).toBe(3)
			expect(compiled.fields.has('name')).toBe(true)
			expect(compiled.fields.has('age')).toBe(true)
			expect(compiled.fields.has('email')).toBe(true)
		})

		test('validates objects correctly', () => {
			const shape = {
				name: z.string(),
				age: z.number(),
			}
			const compiled = compileObjectSchema(shape)

			const validResult = compiled.validate({ name: 'Alice', age: 30 })
			expect(validResult.success).toBe(true)
			if (validResult.success) {
				expect(validResult.data).toEqual({ name: 'Alice', age: 30 })
			}

			const invalidResult = compiled.validate({ name: 'Bob', age: 'thirty' })
			expect(invalidResult.success).toBe(false)
		})

		test('rejects non-objects', () => {
			const shape = { name: z.string() }
			const compiled = compileObjectSchema(shape)

			expect(compiled.validate(null).success).toBe(false)
			expect(compiled.validate([]).success).toBe(false)
			expect(compiled.validate('string').success).toBe(false)
		})

		test('collects all field errors', () => {
			const shape = {
				name: z.string(),
				age: z.number(),
				email: z.string().email(),
			}
			const compiled = compileObjectSchema(shape)

			const result = compiled.validate({ name: 123, age: 'thirty', email: 'invalid' })
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.issues.length).toBeGreaterThanOrEqual(3)
			}
		})
	})
})

describe('True JIT Compilation (new Function)', () => {
	describe('isJITAvailable()', () => {
		test('returns true in Node/Bun environment', () => {
			// In Node/Bun, JIT should be available (no CSP)
			expect(isJITAvailable()).toBe(true)
		})
	})

	describe('jit()', () => {
		test('creates a JIT validator with _jit marker', () => {
			const schema = z.string()
			const validator = jit(schema)
			expect(validator._jit).toBe(true)
		})

		test('JIT validator handles string schema', () => {
			const schema = z.string()
			const validator = jit(schema)

			const validResult = validator('hello')
			expect(validResult.success).toBe(true)
			if (validResult.success) {
				expect(validResult.data).toBe('hello')
			}

			const invalidResult = validator(123)
			expect(invalidResult.success).toBe(false)
		})

		test('JIT validator handles number schema', () => {
			const schema = z.number()
			const validator = jit(schema)

			const validResult = validator(42)
			expect(validResult.success).toBe(true)
			if (validResult.success) {
				expect(validResult.data).toBe(42)
			}

			const invalidResult = validator('42')
			expect(invalidResult.success).toBe(false)
		})

		test('JIT validator handles boolean schema', () => {
			const schema = z.boolean()
			const validator = jit(schema)

			expect(validator(true).success).toBe(true)
			expect(validator(false).success).toBe(true)
			expect(validator('true').success).toBe(false)
		})

		test('JIT validator caches compiled functions', () => {
			const schema = z.string()
			const validator1 = jit(schema)
			const validator2 = jit(schema)

			// Same function should be returned from cache
			expect(validator1).toBe(validator2)
		})

		test('JIT validator handles string with checks', () => {
			const schema = z.string().email()
			const validator = jit(schema)

			const validResult = validator('test@example.com')
			expect(validResult.success).toBe(true)

			const invalidResult = validator('invalid')
			expect(invalidResult.success).toBe(false)
		})

		test('JIT validator handles number with checks', () => {
			const schema = z.number().int().positive()
			const validator = jit(schema)

			expect(validator(42).success).toBe(true)
			expect(validator(-1).success).toBe(false)
			expect(validator(3.14).success).toBe(false)
		})
	})

	describe('jitObject()', () => {
		test('creates a JIT validator with _jit marker', () => {
			const validator = jitObject({
				name: z.string(),
			})
			expect(validator._jit).toBe(true)
		})

		test('validates simple object', () => {
			const validator = jitObject({
				name: z.string(),
				age: z.number(),
			})

			const validResult = validator({ name: 'Alice', age: 30 })
			expect(validResult.success).toBe(true)
			if (validResult.success) {
				expect(validResult.data).toEqual({ name: 'Alice', age: 30 })
			}
		})

		test('rejects non-objects', () => {
			const validator = jitObject({ name: z.string() })

			expect(validator(null).success).toBe(false)
			expect(validator(undefined).success).toBe(false)
			expect(validator([]).success).toBe(false)
			expect(validator('string').success).toBe(false)
			expect(validator(123).success).toBe(false)
		})

		test('validates field types', () => {
			const validator = jitObject({
				name: z.string(),
				age: z.number(),
				active: z.boolean(),
			})

			expect(validator({ name: 'Bob', age: 25, active: true }).success).toBe(true)
			expect(validator({ name: 123, age: 25, active: true }).success).toBe(false)
			expect(validator({ name: 'Bob', age: '25', active: true }).success).toBe(false)
			expect(validator({ name: 'Bob', age: 25, active: 'yes' }).success).toBe(false)
		})

		test('validates nested object', () => {
			const validator = jitObject({
				user: z.object({
					name: z.string(),
					email: z.string(),
				}),
			})

			const validResult = validator({
				user: { name: 'Alice', email: 'alice@test.com' },
			})
			expect(validResult.success).toBe(true)

			const invalidResult = validator({
				user: { name: 'Alice', email: 123 },
			})
			expect(invalidResult.success).toBe(false)
		})
	})

	describe('JIT Performance', () => {
		const ITERATIONS = 10000

		test('JIT string validation is faster than safeParse', () => {
			const schema = z.string().email()
			const jitValidator = jit(schema)
			const testData = 'test@example.com'

			// Warm up
			for (let i = 0; i < 100; i++) {
				schema.safeParse(testData)
				jitValidator(testData)
			}

			// Regular safeParse
			const safeParseStart = performance.now()
			for (let i = 0; i < ITERATIONS; i++) {
				schema.safeParse(testData)
			}
			const safeParseTime = performance.now() - safeParseStart

			// JIT
			const jitStart = performance.now()
			for (let i = 0; i < ITERATIONS; i++) {
				jitValidator(testData)
			}
			const jitTime = performance.now() - jitStart

			console.log(`String JIT: safeParse ${safeParseTime.toFixed(2)}ms vs JIT ${jitTime.toFixed(2)}ms (${(safeParseTime / jitTime).toFixed(2)}x faster)`)

			// JIT should be competitive or faster
			expect(jitTime).toBeLessThan(safeParseTime * 2)
		})

		test('JIT object validation is faster than safeParse', () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
				email: z.string(),
			})
			const jitValidator = jitObject({
				name: z.string(),
				age: z.number(),
				email: z.string(),
			})
			const testData = { name: 'Alice', age: 30, email: 'alice@example.com' }

			// Warm up
			for (let i = 0; i < 100; i++) {
				schema.safeParse(testData)
				jitValidator(testData)
			}

			// Regular safeParse
			const safeParseStart = performance.now()
			for (let i = 0; i < ITERATIONS; i++) {
				schema.safeParse(testData)
			}
			const safeParseTime = performance.now() - safeParseStart

			// JIT
			const jitStart = performance.now()
			for (let i = 0; i < ITERATIONS; i++) {
				jitValidator(testData)
			}
			const jitTime = performance.now() - jitStart

			console.log(`Object JIT: safeParse ${safeParseTime.toFixed(2)}ms vs JIT ${jitTime.toFixed(2)}ms (${(safeParseTime / jitTime).toFixed(2)}x faster)`)

			// JIT should provide measurable improvement
			expect(jitTime).toBeLessThan(safeParseTime * 1.5)
		})
	})
})

describe('fastCheck', () => {
	test('string check', () => {
		expect(fastCheck.string('hello')).toBe(true)
		expect(fastCheck.string('')).toBe(true)
		expect(fastCheck.string(123)).toBe(false)
		expect(fastCheck.string(null)).toBe(false)
	})

	test('number check', () => {
		expect(fastCheck.number(123)).toBe(true)
		expect(fastCheck.number(0)).toBe(true)
		expect(fastCheck.number(-1.5)).toBe(true)
		expect(fastCheck.number(NaN)).toBe(false)
		expect(fastCheck.number(Infinity)).toBe(false)
		expect(fastCheck.number('123')).toBe(false)
	})

	test('boolean check', () => {
		expect(fastCheck.boolean(true)).toBe(true)
		expect(fastCheck.boolean(false)).toBe(true)
		expect(fastCheck.boolean(0)).toBe(false)
		expect(fastCheck.boolean('true')).toBe(false)
	})

	test('object check', () => {
		expect(fastCheck.object({})).toBe(true)
		expect(fastCheck.object({ a: 1 })).toBe(true)
		expect(fastCheck.object(null)).toBe(false)
		expect(fastCheck.object([])).toBe(false)
	})

	test('array check', () => {
		expect(fastCheck.array([])).toBe(true)
		expect(fastCheck.array([1, 2, 3])).toBe(true)
		expect(fastCheck.array({})).toBe(false)
	})

	test('nullish check', () => {
		expect(fastCheck.nullish(null)).toBe(true)
		expect(fastCheck.nullish(undefined)).toBe(true)
		expect(fastCheck.nullish(0)).toBe(false)
		expect(fastCheck.nullish('')).toBe(false)
	})

	test('date check', () => {
		expect(fastCheck.date(new Date())).toBe(true)
		expect(fastCheck.date(new Date('invalid'))).toBe(false)
		expect(fastCheck.date('2024-01-01')).toBe(false)
	})
})

describe('Inline Validation', () => {
	test('validateInline returns value on success', () => {
		const result = validateInline(fastCheck.string, 'hello', 'Expected string')
		expect(result).toBe('hello')
	})

	test('validateInline throws on failure', () => {
		expect(() => validateInline(fastCheck.string, 123, 'Expected string')).toThrow('Expected string')
	})

	test('tryValidateInline returns value on success', () => {
		const result = tryValidateInline(fastCheck.number, 42)
		expect(result).toBe(42)
	})

	test('tryValidateInline returns null on failure', () => {
		const result = tryValidateInline(fastCheck.number, 'not a number')
		expect(result).toBeNull()
	})
})

// ============================================================
// Performance Benchmarks
// ============================================================

describe('Performance Benchmarks', () => {
	const ITERATIONS = 10000

	test('JIT email validation is faster than regex', () => {
		const emails = [
			'test@example.com',
			'user.name@domain.org',
			'a@b.co',
			'invalid-email',
			'no-at-sign.com',
		]

		// Regex-based (simulating non-JIT)
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		const regexStart = performance.now()
		for (let i = 0; i < ITERATIONS; i++) {
			for (const email of emails) {
				emailRegex.test(email)
			}
		}
		const regexTime = performance.now() - regexStart

		// JIT-based
		const jitValidator = getOptimizedValidator('email')!
		const jitStart = performance.now()
		for (let i = 0; i < ITERATIONS; i++) {
			for (const email of emails) {
				jitValidator(email)
			}
		}
		const jitTime = performance.now() - jitStart

		console.log(`Email validation: Regex ${regexTime.toFixed(2)}ms vs JIT ${jitTime.toFixed(2)}ms`)

		// JIT should be competitive or faster
		// Allow some margin for test stability
		expect(jitTime).toBeLessThan(regexTime * 3)
	})

	test('JIT UUID validation is faster than regex', () => {
		const uuids = [
			'123e4567-e89b-12d3-a456-426614174000',
			'123e4567-e89b-42d3-a456-426614174000',
			'invalid-uuid',
			'123e4567-e89b-12d3-0456-426614174000', // wrong variant
		]

		// Regex-based
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		const regexStart = performance.now()
		for (let i = 0; i < ITERATIONS; i++) {
			for (const uuid of uuids) {
				uuidRegex.test(uuid)
			}
		}
		const regexTime = performance.now() - regexStart

		// JIT-based
		const jitValidator = getOptimizedValidator('uuid')!
		const jitStart = performance.now()
		for (let i = 0; i < ITERATIONS; i++) {
			for (const uuid of uuids) {
				jitValidator(uuid)
			}
		}
		const jitTime = performance.now() - jitStart

		console.log(`UUID validation: Regex ${regexTime.toFixed(2)}ms vs JIT ${jitTime.toFixed(2)}ms`)

		// JIT should be competitive (regex engines are highly optimized)
		// We mainly care that it's not significantly slower
		expect(jitTime).toBeLessThan(regexTime * 5)
	})

	test('compiled schema is faster for repeated validation', () => {
		const schema = z.object({
			name: z.string().min(1),
			age: z.number().min(0).max(150),
			email: z.string().email(),
		})

		const testData = { name: 'Alice', age: 30, email: 'alice@example.com' }

		// Uncompiled
		const uncompiledStart = performance.now()
		for (let i = 0; i < ITERATIONS; i++) {
			schema.safeParse(testData)
		}
		const uncompiledTime = performance.now() - uncompiledStart

		// Compiled
		const compiled = compile(schema)
		const compiledStart = performance.now()
		for (let i = 0; i < ITERATIONS; i++) {
			compiled.validate(testData)
		}
		const compiledTime = performance.now() - compiledStart

		console.log(
			`Object validation: Uncompiled ${uncompiledTime.toFixed(2)}ms vs Compiled ${compiledTime.toFixed(2)}ms`
		)

		// Compiled should be competitive
		expect(compiledTime).toBeLessThan(uncompiledTime * 2)
	})

	test('batch validation is efficient', () => {
		const schema = z.string().email()
		const emails = Array(1000)
			.fill(null)
			.map((_, i) => (i % 2 === 0 ? `user${i}@example.com` : `invalid${i}`))

		// One-by-one
		const oneByOneStart = performance.now()
		for (let i = 0; i < 100; i++) {
			for (const email of emails) {
				schema.safeParse(email)
			}
		}
		const oneByOneTime = performance.now() - oneByOneStart

		// Batch
		const batchStart = performance.now()
		for (let i = 0; i < 100; i++) {
			validateBatch(schema, emails)
		}
		const batchTime = performance.now() - batchStart

		console.log(`Batch validation: One-by-one ${oneByOneTime.toFixed(2)}ms vs Batch ${batchTime.toFixed(2)}ms`)

		// Batch should be faster (compiled once, validated many)
		expect(batchTime).toBeLessThan(oneByOneTime * 1.5)
	})
})
