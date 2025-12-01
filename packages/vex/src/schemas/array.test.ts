// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { pipe } from '../composition/pipe'
import type { StandardSchemaV1 } from '../core'
import { int } from '../validators/number'
import { num } from '../validators/primitives'
import { array, exactLength, maxLength, minLength, nonemptyArray } from './array'

describe('Array Schema', () => {
	test('array validates items', () => {
		const validateNumbers = array(num())
		expect(validateNumbers([1, 2, 3])).toEqual([1, 2, 3])
		expect(validateNumbers([])).toEqual([])
	})

	test('array with composed validators', () => {
		const validateIntegers = array(num(int))
		expect(validateIntegers([1, 2, 3])).toEqual([1, 2, 3])
		expect(() => validateIntegers([1, 2.5, 3])).toThrow('[1]: Must be integer')
	})

	test('array throws on invalid input', () => {
		const validateNumbers = array(num())
		expect(() => validateNumbers({})).toThrow('Expected array')
		expect(() => validateNumbers('string')).toThrow('Expected array')
		expect(() => validateNumbers(null)).toThrow('Expected array')
	})

	test('array throws with path', () => {
		const validateNumbers = array(num())
		expect(() => validateNumbers([1, 'two', 3])).toThrow('[1]: Expected number')
	})

	test('array rethrows non-ValidationError', () => {
		const throwsTypeError = ((_v: unknown) => {
			throw new TypeError('Type error')
		}) as any
		const validateItems = array(throwsTypeError)
		expect(() => validateItems([1])).toThrow('Type error')
	})

	test('array safe version', () => {
		const validateNumbers = array(num())
		expect(validateNumbers.safe!([1, 2, 3])).toEqual({ ok: true, value: [1, 2, 3] })
		expect(validateNumbers.safe!([1, 'two', 3])).toHaveProperty('ok', false)
		expect(validateNumbers.safe!({})).toEqual({ ok: false, error: 'Expected array' })
	})

	test('array safe fallback when item has no safe method', () => {
		const noSafe = ((v: unknown) => {
			if (typeof v !== 'number') throw new Error('Must be number')
			return v
		}) as any
		const validateItems = array(noSafe)
		expect(validateItems.safe!([1, 2, 3])).toEqual({ ok: true, value: [1, 2, 3] })
		expect(validateItems.safe!([1, 'two', 3])).toEqual({ ok: false, error: '[1]: Must be number' })
	})

	test('array safe fallback handles non-Error exception', () => {
		const throwsNonError = ((_v: unknown) => {
			throw 'string error'
		}) as any
		const validateItems = array(throwsNonError)
		expect(validateItems.safe!([1])).toEqual({ ok: false, error: '[0]: Unknown error' })
	})

	test('Standard Schema with path', () => {
		const validateNumbers = array(num())

		const error = validateNumbers['~standard']!.validate([1, 2, 'three', 4])
		expect(error).toHaveProperty('issues')
		const issues = (error as StandardSchemaV1.FailureResult).issues
		expect(issues[0]?.path).toEqual([2])
		expect(issues[0]?.message).toBe('Expected number')
	})

	test('nested array Standard Schema path', () => {
		const validateNestedNumbers = array(array(num()))

		const error = validateNestedNumbers['~standard']!.validate([
			[1, 2],
			[3, 'four'],
		])
		expect(error).toHaveProperty('issues')
		const issues = (error as StandardSchemaV1.FailureResult).issues
		expect(issues[0]?.path).toEqual([1, 1])
	})

	test('Standard Schema fallback when item has no ~standard', () => {
		const noStd = ((v: unknown) => {
			if (typeof v !== 'number') throw new Error('Must be number')
			return v
		}) as any
		const validateItems = array(noStd)
		expect(validateItems['~standard']!.validate([1, 2, 3])).toEqual({ value: [1, 2, 3] })
		const result = validateItems['~standard']!.validate([1, 'two', 3])
		expect(result.issues![0].message).toBe('Must be number')
		expect(result.issues![0].path).toEqual([1])
	})

	test('Standard Schema fallback handles non-Error exception', () => {
		const throwsNonError = ((_v: unknown) => {
			throw 'string error'
		}) as any
		const validateItems = array(throwsNonError)
		const result = validateItems['~standard']!.validate([1])
		expect(result.issues![0].message).toBe('Unknown error')
		expect(result.issues![0].path).toEqual([0])
	})

	test('Standard Schema returns issues for non-array', () => {
		const validateNumbers = array(num())
		const result = validateNumbers['~standard']!.validate('not array')
		expect(result.issues![0].message).toBe('Expected array')
	})
})

describe('Array Length Validators', () => {
	test('minLength validates minimum array length', () => {
		const validate = pipe(array(num()), minLength(2))
		expect(validate([1, 2])).toEqual([1, 2])
		expect(validate([1, 2, 3])).toEqual([1, 2, 3])
		expect(() => validate([1])).toThrow('Array must have at least 2 items')
		expect(() => validate([])).toThrow()
	})

	test('maxLength validates maximum array length', () => {
		const validate = pipe(array(num()), maxLength(3))
		expect(validate([1, 2, 3])).toEqual([1, 2, 3])
		expect(validate([1, 2])).toEqual([1, 2])
		expect(validate([])).toEqual([])
		expect(() => validate([1, 2, 3, 4])).toThrow('Array must have at most 3 items')
	})

	test('exactLength validates exact array length', () => {
		const validate = pipe(array(num()), exactLength(3))
		expect(validate([1, 2, 3])).toEqual([1, 2, 3])
		expect(() => validate([1, 2])).toThrow('Array must have exactly 3 items')
		expect(() => validate([1, 2, 3, 4])).toThrow()
	})

	test('nonemptyArray validates non-empty arrays', () => {
		const validate = pipe(array(num()), nonemptyArray())
		expect(validate([1])).toEqual([1])
		expect(validate([1, 2, 3])).toEqual([1, 2, 3])
		expect(() => validate([])).toThrow('Array must not be empty')
	})

	test('safe versions work', () => {
		const validate = pipe(array(num()), minLength(2))
		expect(validate.safe!([1, 2])).toEqual({ ok: true, value: [1, 2] })
		expect(validate.safe!([1])).toHaveProperty('ok', false)
	})

	describe('minLength', () => {
		test('validates exact minimum', () => {
			const validate = minLength(3)
			expect(validate([1, 2, 3])).toEqual([1, 2, 3])
		})

		test('validates above minimum', () => {
			const validate = minLength(2)
			expect(validate([1, 2, 3, 4])).toEqual([1, 2, 3, 4])
		})

		test('throws on below minimum', () => {
			const validate = minLength(3)
			expect(() => validate([1, 2])).toThrow('Array must have at least 3 items')
		})

		test('validates empty array with min 0', () => {
			const validate = minLength(0)
			expect(validate([])).toEqual([])
		})

		test('safe version returns success', () => {
			const validate = minLength(2)
			expect(validate.safe!([1, 2, 3])).toEqual({ ok: true, value: [1, 2, 3] })
		})

		test('safe version returns error', () => {
			const validate = minLength(3)
			expect(validate.safe!([1, 2])).toEqual({
				ok: false,
				error: 'Array must have at least 3 items',
			})
		})

		test('Standard Schema support', () => {
			const validate = minLength(2)
			expect(validate['~standard']).toBeDefined()
			expect(validate['~standard']!.validate([1, 2])).toEqual({ value: [1, 2] })
		})

		test('Standard Schema returns issues', () => {
			const validate = minLength(2)
			const result = validate['~standard']!.validate([1])
			expect(result.issues![0].message).toBe('Array must have at least 2 items')
		})
	})

	describe('maxLength', () => {
		test('validates exact maximum', () => {
			const validate = maxLength(3)
			expect(validate([1, 2, 3])).toEqual([1, 2, 3])
		})

		test('validates below maximum', () => {
			const validate = maxLength(5)
			expect(validate([1, 2])).toEqual([1, 2])
		})

		test('throws on above maximum', () => {
			const validate = maxLength(2)
			expect(() => validate([1, 2, 3])).toThrow('Array must have at most 2 items')
		})

		test('validates empty array', () => {
			const validate = maxLength(5)
			expect(validate([])).toEqual([])
		})

		test('safe version returns success', () => {
			const validate = maxLength(3)
			expect(validate.safe!([1, 2])).toEqual({ ok: true, value: [1, 2] })
		})

		test('safe version returns error', () => {
			const validate = maxLength(2)
			expect(validate.safe!([1, 2, 3])).toEqual({
				ok: false,
				error: 'Array must have at most 2 items',
			})
		})

		test('Standard Schema support', () => {
			const validate = maxLength(3)
			expect(validate['~standard']).toBeDefined()
			expect(validate['~standard']!.validate([1, 2])).toEqual({ value: [1, 2] })
		})

		test('Standard Schema returns issues', () => {
			const validate = maxLength(2)
			const result = validate['~standard']!.validate([1, 2, 3])
			expect(result.issues![0].message).toBe('Array must have at most 2 items')
		})
	})

	describe('exactLength', () => {
		test('validates exact length', () => {
			const validate = exactLength(3)
			expect(validate([1, 2, 3])).toEqual([1, 2, 3])
		})

		test('throws on different length', () => {
			const validate = exactLength(3)
			expect(() => validate([1, 2])).toThrow('Array must have exactly 3 items')
			expect(() => validate([1, 2, 3, 4])).toThrow('Array must have exactly 3 items')
		})

		test('validates empty array with exact 0', () => {
			const validate = exactLength(0)
			expect(validate([])).toEqual([])
		})

		test('safe version returns success', () => {
			const validate = exactLength(2)
			expect(validate.safe!([1, 2])).toEqual({ ok: true, value: [1, 2] })
		})

		test('safe version returns error for too few', () => {
			const validate = exactLength(3)
			expect(validate.safe!([1, 2])).toEqual({
				ok: false,
				error: 'Array must have exactly 3 items',
			})
		})

		test('safe version returns error for too many', () => {
			const validate = exactLength(2)
			expect(validate.safe!([1, 2, 3])).toEqual({
				ok: false,
				error: 'Array must have exactly 2 items',
			})
		})

		test('Standard Schema support', () => {
			const validate = exactLength(2)
			expect(validate['~standard']).toBeDefined()
			expect(validate['~standard']!.validate([1, 2])).toEqual({ value: [1, 2] })
		})

		test('Standard Schema returns issues', () => {
			const validate = exactLength(2)
			const result = validate['~standard']!.validate([1])
			expect(result.issues![0].message).toBe('Array must have exactly 2 items')
		})
	})

	describe('nonemptyArray', () => {
		test('validates non-empty arrays', () => {
			const validate = nonemptyArray()
			expect(validate([1])).toEqual([1])
			expect(validate([1, 2, 3])).toEqual([1, 2, 3])
		})

		test('throws on empty array', () => {
			const validate = nonemptyArray()
			expect(() => validate([])).toThrow('Array must not be empty')
		})

		test('safe version returns success', () => {
			const validate = nonemptyArray()
			expect(validate.safe!([1])).toEqual({ ok: true, value: [1] })
		})

		test('safe version returns error', () => {
			const validate = nonemptyArray()
			expect(validate.safe!([])).toEqual({ ok: false, error: 'Array must not be empty' })
		})

		test('Standard Schema support', () => {
			const validate = nonemptyArray()
			expect(validate['~standard']).toBeDefined()
			expect(validate['~standard']!.validate([1])).toEqual({ value: [1] })
		})

		test('Standard Schema returns issues', () => {
			const validate = nonemptyArray()
			const result = validate['~standard']!.validate([])
			expect(result.issues![0].message).toBe('Array must not be empty')
		})
	})
})

describe('Array edge cases', () => {
	test('handles array with mixed types', () => {
		const validateMixed = array((v) => v)
		expect(validateMixed([1, 'two', true, null])).toEqual([1, 'two', true, null])
	})

	test('handles nested arrays', () => {
		const validateNested = array(array(num()))
		expect(
			validateNested([
				[1, 2],
				[3, 4],
			]),
		).toEqual([
			[1, 2],
			[3, 4],
		])
		expect(validateNested([])).toEqual([])
		expect(validateNested([[]])).toEqual([[]])
	})

	test('handles deeply nested arrays', () => {
		const validateDeep = array(array(array(num())))
		expect(validateDeep([[[1, 2]], [[3, 4]]])).toEqual([[[1, 2]], [[3, 4]]])
	})

	test('handles array with undefined items', () => {
		const validateAny = array((v) => v)
		expect(validateAny([undefined, undefined])).toEqual([undefined, undefined])
	})

	test('preserves array reference on pass-through', () => {
		const validateAny = array((v) => v)
		const input = [1, 2, 3]
		const result = validateAny(input)
		expect(result).toEqual(input)
	})

	test('Standard Schema with complex nested structure', () => {
		const validateNested = array(array(num()))
		const error = validateNested['~standard']!.validate([
			[1, 2],
			[3, 'four'],
			[5, 6],
		])
		expect(error.issues![0].path).toEqual([1, 1])
		expect(error.issues![0].message).toBe('Expected number')
	})
})
