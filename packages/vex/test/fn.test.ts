import { describe, expect, test } from 'bun:test'
import {
	arr,
	array,
	bool,
	email,
	endsWith,
	gt,
	gte,
	includes,
	int,
	len,
	lower,
	lt,
	lte,
	max,
	min,
	negative,
	nonempty,
	nullable,
	num,
	obj,
	object,
	optional,
	pattern,
	pipe,
	positive,
	type StandardSchemaV1,
	safeParse,
	startsWith,
	str,
	toDate,
	toFloat,
	toInt,
	trim,
	tryParse,
	upper,
	url,
	uuid,
	ValidationError,
	withDefault,
} from '../src/fn'

describe('Functional API', () => {
	describe('Type Validators', () => {
		test('str', () => {
			expect(str('hello')).toBe('hello')
			expect(() => str(123)).toThrow(ValidationError)
		})

		test('num', () => {
			expect(num(42)).toBe(42)
			expect(() => num('42')).toThrow(ValidationError)
			expect(() => num(NaN)).toThrow(ValidationError)
		})

		test('bool', () => {
			expect(bool(true)).toBe(true)
			expect(() => bool('true')).toThrow(ValidationError)
		})

		test('obj', () => {
			expect(obj({ a: 1 })).toEqual({ a: 1 })
			expect(() => obj(null)).toThrow(ValidationError)
			expect(() => obj([])).toThrow(ValidationError)
		})

		test('arr', () => {
			expect(arr([1, 2, 3])).toEqual([1, 2, 3])
			expect(() => arr({})).toThrow(ValidationError)
		})
	})

	describe('String Validators', () => {
		test('min/max/len', () => {
			expect(min(3)('abc')).toBe('abc')
			expect(() => min(3)('ab')).toThrow()

			expect(max(3)('abc')).toBe('abc')
			expect(() => max(3)('abcd')).toThrow()

			expect(len(3)('abc')).toBe('abc')
			expect(() => len(3)('ab')).toThrow()
		})

		test('email/uuid/url', () => {
			expect(email('test@example.com')).toBe('test@example.com')
			expect(() => email('invalid')).toThrow()

			expect(uuid('123e4567-e89b-12d3-a456-426614174000')).toBeTruthy()
			expect(() => uuid('invalid')).toThrow()

			expect(url('https://example.com')).toBe('https://example.com')
			expect(() => url('not-a-url')).toThrow()
		})

		test('pattern/startsWith/endsWith/includes', () => {
			expect(pattern(/^[A-Z]+$/)('ABC')).toBe('ABC')
			expect(() => pattern(/^[A-Z]+$/)('abc')).toThrow()

			expect(startsWith('hello')('hello world')).toBe('hello world')
			expect(() => startsWith('hello')('hi world')).toThrow()

			expect(endsWith('world')('hello world')).toBe('hello world')
			expect(() => endsWith('world')('hello there')).toThrow()

			expect(includes('o w')('hello world')).toBe('hello world')
			expect(() => includes('xyz')('hello world')).toThrow()
		})
	})

	describe('Number Validators', () => {
		test('int/positive/negative', () => {
			expect(int(42)).toBe(42)
			expect(() => int(3.14)).toThrow()

			expect(positive(1)).toBe(1)
			expect(() => positive(-1)).toThrow()

			expect(negative(-1)).toBe(-1)
			expect(() => negative(1)).toThrow()
		})

		test('gte/lte/gt/lt', () => {
			expect(gte(5)(5)).toBe(5)
			expect(() => gte(5)(4)).toThrow()

			expect(lte(5)(5)).toBe(5)
			expect(() => lte(5)(6)).toThrow()

			expect(gt(5)(6)).toBe(6)
			expect(() => gt(5)(5)).toThrow()

			expect(lt(5)(4)).toBe(4)
			expect(() => lt(5)(5)).toThrow()
		})
	})

	describe('Composition', () => {
		test('pipe combines validators', () => {
			const validateEmail = pipe(str, email)
			expect(validateEmail('test@example.com')).toBe('test@example.com')
			expect(() => validateEmail(123)).toThrow()
			expect(() => validateEmail('invalid')).toThrow()

			const validateAge = pipe(num, int, gte(0), lte(150))
			expect(validateAge(25)).toBe(25)
			expect(() => validateAge(-1)).toThrow()
			expect(() => validateAge(200)).toThrow()
			expect(() => validateAge(25.5)).toThrow()
		})

		test('tryParse returns null on error', () => {
			const tryEmail = tryParse(pipe(str, email))
			expect(tryEmail('test@example.com')).toBe('test@example.com')
			expect(tryEmail('invalid')).toBeNull()
			expect(tryEmail(123)).toBeNull()
		})

		test('safeParse returns result object', () => {
			const safeEmail = safeParse(pipe(str, email))
			expect(safeEmail('test@example.com')).toEqual({ success: true, data: 'test@example.com' })
			expect(safeEmail('invalid').success).toBe(false)
		})

		test('optional allows undefined', () => {
			const optionalEmail = optional(pipe(str, email))
			expect(optionalEmail('test@example.com')).toBe('test@example.com')
			expect(optionalEmail(undefined)).toBeUndefined()
		})

		test('nullable allows null', () => {
			const nullableEmail = nullable(pipe(str, email))
			expect(nullableEmail('test@example.com')).toBe('test@example.com')
			expect(nullableEmail(null)).toBeNull()
		})

		test('withDefault provides fallback', () => {
			const emailWithDefault = withDefault(pipe(str, email), 'default@example.com')
			expect(emailWithDefault('test@example.com')).toBe('test@example.com')
			expect(emailWithDefault(undefined)).toBe('default@example.com')
		})
	})

	describe('Object Validation', () => {
		test('object validates shape', () => {
			const validateUser = object({
				name: pipe(str, nonempty),
				age: pipe(num, int, gte(0)),
				email: pipe(str, email),
			})

			const user = validateUser({ name: 'Alice', age: 30, email: 'alice@example.com' })
			expect(user).toEqual({ name: 'Alice', age: 30, email: 'alice@example.com' })
		})

		test('object throws with path', () => {
			const validateUser = object({
				name: pipe(str, nonempty),
				age: pipe(num, int),
			})

			expect(() => validateUser({ name: '', age: 30 })).toThrow('name: Required')
			expect(() => validateUser({ name: 'Alice', age: '30' })).toThrow('age: Expected number')
		})

		test('array validates items', () => {
			const validateNumbers = array(pipe(num, int))
			expect(validateNumbers([1, 2, 3])).toEqual([1, 2, 3])
			expect(() => validateNumbers([1, 'two', 3])).toThrow('[1]: Expected number')
		})
	})

	describe('Transforms', () => {
		test('trim/lower/upper', () => {
			expect(trim('  hello  ')).toBe('hello')
			expect(lower('HELLO')).toBe('hello')
			expect(upper('hello')).toBe('HELLO')
		})

		test('toInt/toFloat/toDate', () => {
			expect(toInt('42')).toBe(42)
			expect(() => toInt('abc')).toThrow()

			expect(toFloat('3.14')).toBe(3.14)
			expect(() => toFloat('abc')).toThrow()

			expect(toDate('2024-01-15').toISOString().startsWith('2024-01-15')).toBe(true)
			expect(() => toDate('invalid')).toThrow()
		})

		test('pipe with transforms', () => {
			const parseAndValidate = pipe(str, trim, lower, email)
			expect(parseAndValidate('  TEST@EXAMPLE.COM  ')).toBe('test@example.com')
		})
	})

	describe('Standard Schema', () => {
		test('validators have ~standard property', () => {
			expect(str['~standard']).toBeDefined()
			expect(str['~standard']!.version).toBe(1)
			expect(str['~standard']!.vendor).toBe('vex')
			expect(typeof str['~standard']!.validate).toBe('function')
		})

		test('str validates via Standard Schema', () => {
			const result = str['~standard']!.validate('hello')
			expect(result).toEqual({ value: 'hello' })

			const error = str['~standard']!.validate(123)
			expect(error).toHaveProperty('issues')
			expect((error as StandardSchemaV1.FailureResult).issues[0]?.message).toBe('Expected string')
		})

		test('pipe creates Standard Schema compliant validator', () => {
			const validateEmail = pipe(str, email)
			expect(validateEmail['~standard']).toBeDefined()

			const result = validateEmail['~standard']!.validate('test@example.com')
			expect(result).toEqual({ value: 'test@example.com' })

			const error = validateEmail['~standard']!.validate('invalid')
			expect(error).toHaveProperty('issues')
		})

		test('object includes path in issues', () => {
			const validateUser = object({
				name: str,
				age: num,
			})

			const error = validateUser['~standard']!.validate({ name: 'Alice', age: 'not a number' })
			expect(error).toHaveProperty('issues')
			const issues = (error as StandardSchemaV1.FailureResult).issues
			expect(issues[0]?.path).toEqual(['age'])
			expect(issues[0]?.message).toBe('Expected number')
		})

		test('array includes path in issues', () => {
			const validateNumbers = array(num)

			const error = validateNumbers['~standard']!.validate([1, 2, 'three', 4])
			expect(error).toHaveProperty('issues')
			const issues = (error as StandardSchemaV1.FailureResult).issues
			expect(issues[0]?.path).toEqual([2])
			expect(issues[0]?.message).toBe('Expected number')
		})

		test('nested object/array path', () => {
			const validateData = object({
				users: array(
					object({
						email: pipe(str, email),
					})
				),
			})

			const error = validateData['~standard']!.validate({
				users: [{ email: 'valid@test.com' }, { email: 'invalid' }],
			})
			expect(error).toHaveProperty('issues')
			const issues = (error as StandardSchemaV1.FailureResult).issues
			expect(issues[0]?.path).toEqual(['users', 1, 'email'])
		})

		test('optional has Standard Schema', () => {
			const optionalStr = optional(str)
			expect(optionalStr['~standard']).toBeDefined()

			const result1 = optionalStr['~standard']!.validate(undefined)
			expect(result1).toEqual({ value: undefined })

			const result2 = optionalStr['~standard']!.validate('hello')
			expect(result2).toEqual({ value: 'hello' })
		})
	})

	describe('Performance', () => {
		const ITERATIONS = 100_000

		test('functional validators are fast', () => {
			const validateUser = object({
				name: pipe(str, nonempty),
				age: pipe(num, int, gte(0)),
				email: pipe(str, email),
			})

			const testData = { name: 'Alice', age: 30, email: 'alice@example.com' }

			// Warmup
			for (let i = 0; i < 1000; i++) {
				validateUser(testData)
			}

			const start = performance.now()
			for (let i = 0; i < ITERATIONS; i++) {
				validateUser(testData)
			}
			const time = performance.now() - start
			const opsPerSec = (ITERATIONS / time) * 1000

			console.log(`Object validation: ${(opsPerSec / 1e6).toFixed(1)}M ops/sec`)
			expect(opsPerSec).toBeGreaterThan(1_000_000) // At least 1M ops/sec
		})
	})
})
