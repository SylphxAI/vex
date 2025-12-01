// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import {
	finite,
	gt,
	gte,
	int,
	integer,
	lt,
	lte,
	multipleOf,
	negative,
	nonnegative,
	nonpositive,
	positive,
	safe,
	safeInteger,
	step,
} from './number'

describe('Number Validators', () => {
	describe('type validators', () => {
		test('int validates integers', () => {
			expect(int(42)).toBe(42)
			expect(int(-10)).toBe(-10)
			expect(int(0)).toBe(0)
			expect(() => int(3.14)).toThrow('Must be integer')
			expect(() => int(1.1)).toThrow()
		})

		test('int safe version', () => {
			expect(int.safe!(42)).toEqual({ ok: true, value: 42 })
			expect(int.safe!(3.14)).toEqual({ ok: false, error: 'Must be integer' })
		})

		test('integer is alias for int', () => {
			expect(integer).toBe(int)
		})

		test('positive validates positive numbers', () => {
			expect(positive(1)).toBe(1)
			expect(positive(0.1)).toBe(0.1)
			expect(() => positive(0)).toThrow('Must be positive')
			expect(() => positive(-1)).toThrow()
		})

		test('positive safe version', () => {
			expect(positive.safe!(1)).toEqual({ ok: true, value: 1 })
			expect(positive.safe!(0)).toEqual({ ok: false, error: 'Must be positive' })
		})

		test('negative validates negative numbers', () => {
			expect(negative(-1)).toBe(-1)
			expect(negative(-0.1)).toBe(-0.1)
			expect(() => negative(0)).toThrow('Must be negative')
			expect(() => negative(1)).toThrow()
		})

		test('negative safe version', () => {
			expect(negative.safe!(-1)).toEqual({ ok: true, value: -1 })
			expect(negative.safe!(0)).toEqual({ ok: false, error: 'Must be negative' })
		})

		test('nonnegative validates >= 0', () => {
			expect(nonnegative(0)).toBe(0)
			expect(nonnegative(1)).toBe(1)
			expect(nonnegative(0.1)).toBe(0.1)
			expect(() => nonnegative(-1)).toThrow('Must be non-negative')
			expect(() => nonnegative(-0.1)).toThrow()
		})

		test('nonnegative safe version', () => {
			expect(nonnegative.safe!(0)).toEqual({ ok: true, value: 0 })
			expect(nonnegative.safe!(-1)).toEqual({ ok: false, error: 'Must be non-negative' })
		})

		test('nonpositive validates <= 0', () => {
			expect(nonpositive(0)).toBe(0)
			expect(nonpositive(-1)).toBe(-1)
			expect(nonpositive(-0.1)).toBe(-0.1)
			expect(() => nonpositive(1)).toThrow('Must be non-positive')
			expect(() => nonpositive(0.1)).toThrow()
		})

		test('nonpositive safe version', () => {
			expect(nonpositive.safe!(0)).toEqual({ ok: true, value: 0 })
			expect(nonpositive.safe!(1)).toEqual({ ok: false, error: 'Must be non-positive' })
		})

		test('finite validates finite numbers', () => {
			expect(finite(42)).toBe(42)
			expect(finite(0)).toBe(0)
			expect(() => finite(Infinity)).toThrow('Must be finite')
			expect(() => finite(-Infinity)).toThrow()
		})

		test('finite safe version', () => {
			expect(finite.safe!(42)).toEqual({ ok: true, value: 42 })
			expect(finite.safe!(Infinity)).toEqual({ ok: false, error: 'Must be finite' })
		})

		test('safe validates safe integers', () => {
			expect(safe(42)).toBe(42)
			expect(safe(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
			expect(safe(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER)
			expect(() => safe(Number.MAX_SAFE_INTEGER + 1)).toThrow('Must be safe integer')
			expect(() => safe(3.14)).toThrow()
		})

		test('safe validator safe version', () => {
			expect(safe.safe!(42)).toEqual({ ok: true, value: 42 })
			expect(safe.safe!(Number.MAX_SAFE_INTEGER + 1)).toEqual({ ok: false, error: 'Must be safe integer' })
		})

		test('safeInteger is alias for safe', () => {
			expect(safeInteger).toBe(safe)
		})
	})

	describe('comparison validators', () => {
		test('gte validates >= n', () => {
			expect(gte(5)(5)).toBe(5)
			expect(gte(5)(10)).toBe(10)
			expect(() => gte(5)(4)).toThrow('Min 5')
		})

		test('gte safe version', () => {
			expect(gte(5).safe!(5)).toEqual({ ok: true, value: 5 })
			expect(gte(5).safe!(4)).toEqual({ ok: false, error: 'Min 5' })
		})

		test('lte validates <= n', () => {
			expect(lte(5)(5)).toBe(5)
			expect(lte(5)(0)).toBe(0)
			expect(() => lte(5)(6)).toThrow('Max 5')
		})

		test('lte safe version', () => {
			expect(lte(5).safe!(5)).toEqual({ ok: true, value: 5 })
			expect(lte(5).safe!(6)).toEqual({ ok: false, error: 'Max 5' })
		})

		test('gt validates > n', () => {
			expect(gt(5)(6)).toBe(6)
			expect(() => gt(5)(5)).toThrow('Must be > 5')
			expect(() => gt(5)(4)).toThrow()
		})

		test('gt safe version', () => {
			expect(gt(5).safe!(6)).toEqual({ ok: true, value: 6 })
			expect(gt(5).safe!(5)).toEqual({ ok: false, error: 'Must be > 5' })
		})

		test('lt validates < n', () => {
			expect(lt(5)(4)).toBe(4)
			expect(() => lt(5)(5)).toThrow('Must be < 5')
			expect(() => lt(5)(6)).toThrow()
		})

		test('lt safe version', () => {
			expect(lt(5).safe!(4)).toEqual({ ok: true, value: 4 })
			expect(lt(5).safe!(5)).toEqual({ ok: false, error: 'Must be < 5' })
		})

		test('multipleOf validates divisibility', () => {
			expect(multipleOf(5)(10)).toBe(10)
			expect(multipleOf(5)(0)).toBe(0)
			expect(multipleOf(3)(9)).toBe(9)
			expect(() => multipleOf(5)(7)).toThrow('Must be multiple of 5')
		})

		test('multipleOf safe version', () => {
			expect(multipleOf(5).safe!(10)).toEqual({ ok: true, value: 10 })
			expect(multipleOf(5).safe!(7)).toEqual({ ok: false, error: 'Must be multiple of 5' })
		})

		test('step is alias for multipleOf', () => {
			expect(step).toBe(multipleOf)
		})
	})

	describe('Standard Schema support', () => {
		test('int has ~standard property', () => {
			expect(int['~standard']).toBeDefined()
			expect(int['~standard']!.validate(42)).toEqual({ value: 42 })
			expect(int['~standard']!.validate(3.14).issues![0].message).toBe('Must be integer')
		})

		test('positive has ~standard property', () => {
			expect(positive['~standard']).toBeDefined()
			expect(positive['~standard']!.validate(1)).toEqual({ value: 1 })
			expect(positive['~standard']!.validate(0).issues![0].message).toBe('Must be positive')
		})

		test('gte has ~standard property', () => {
			expect(gte(5)['~standard']).toBeDefined()
			expect(gte(5)['~standard']!.validate(5)).toEqual({ value: 5 })
			expect(gte(5)['~standard']!.validate(4).issues![0].message).toBe('Min 5')
		})
	})
})
