// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { num, str } from '..'
import { catchError, refine, transform } from './refine'

describe('refine', () => {
	test('adds custom validation check', () => {
		const positive = refine(num(), (n) => n > 0, 'Must be positive')
		expect(positive(5)).toBe(5)
		expect(() => positive(-1)).toThrow('Must be positive')
	})

	test('uses default message when not provided', () => {
		const even = refine(num(), (n) => n % 2 === 0)
		expect(even(4)).toBe(4)
		expect(() => even(3)).toThrow('Validation failed')
	})

	test('throws on inner validation failure', () => {
		const positive = refine(num(), (n) => n > 0, 'Must be positive')
		expect(() => positive('not a number' as any)).toThrow()
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			const positive = refine(num(), (n) => n > 0, 'Must be positive')
			expect(positive.safe!(5)).toEqual({ ok: true, value: 5 })
		})

		test('returns error for failed refinement', () => {
			const positive = refine(num(), (n) => n > 0, 'Must be positive')
			expect(positive.safe!(-1)).toEqual({ ok: false, error: 'Must be positive' })
		})

		test('returns error for inner validation failure', () => {
			const positive = refine(num(), (n) => n > 0, 'Must be positive')
			expect(positive.safe!('not a number')).toEqual({ ok: false, error: 'Expected number' })
		})

		test('falls back to try-catch when no inner safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const positive = refine(noSafe, (n: number) => n > 0, 'Must be positive')
			expect(positive.safe!(5)).toEqual({ ok: true, value: 5 })
			expect(positive.safe!(-1)).toEqual({ ok: false, error: 'Must be positive' })
		})

		test('handles inner throw when no safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const positive = refine(noSafe, (n: number) => n > 0, 'Must be positive')
			expect(positive.safe!('string')).toEqual({ ok: false, error: 'Must be number' })
		})

		test('handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const refined = refine(throwsNonError, () => true)
			expect(refined.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const positive = refine(num(), (n) => n > 0)
			expect(positive['~standard']).toBeDefined()
			expect(positive['~standard']?.version).toBe(1)
		})

		test('validate returns value on success', () => {
			const positive = refine(num(), (n) => n > 0)
			expect(positive['~standard']!.validate(5)).toEqual({ value: 5 })
		})

		test('validate returns issues on failure', () => {
			const positive = refine(num(), (n) => n > 0, 'Must be positive')
			const result = positive['~standard']!.validate(-1)
			expect(result.issues![0].message).toBe('Must be positive')
		})
	})
})

describe('transform', () => {
	test('transforms validated value', () => {
		const upper = transform(str(), (s) => s.toUpperCase())
		expect(upper('hello')).toBe('HELLO')
	})

	test('transforms with number', () => {
		const doubled = transform(num(), (n) => n * 2)
		expect(doubled(5)).toBe(10)
	})

	test('throws on inner validation failure', () => {
		const upper = transform(str(), (s) => s.toUpperCase())
		expect(() => upper(123 as any)).toThrow()
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			const upper = transform(str(), (s) => s.toUpperCase())
			expect(upper.safe!('hello')).toEqual({ ok: true, value: 'HELLO' })
		})

		test('returns error for inner validation failure', () => {
			const upper = transform(str(), (s) => s.toUpperCase())
			expect(upper.safe!(123)).toEqual({ ok: false, error: 'Expected string' })
		})

		test('handles transform that throws', () => {
			const throws = transform(str(), () => {
				throw new Error('Transform error')
			})
			expect(throws.safe!('hello')).toEqual({ ok: false, error: 'Transform error' })
		})

		test('handles transform that throws non-Error', () => {
			const throws = transform(str(), () => {
				throw 'string error'
			})
			expect(throws.safe!('hello')).toEqual({ ok: false, error: 'Transform failed' })
		})

		test('falls back to try-catch when no inner safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const upper = transform(noSafe, (s: string) => s.toUpperCase())
			expect(upper.safe!('hello')).toEqual({ ok: true, value: 'HELLO' })
		})

		test('handles inner throw when no safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const upper = transform(noSafe, (s: string) => s.toUpperCase())
			expect(upper.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('handles non-Error exception in inner when no safe', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const transformed = transform(throwsNonError, (v) => v)
			expect(transformed.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const upper = transform(str(), (s) => s.toUpperCase())
			expect(upper['~standard']).toBeDefined()
			expect(upper['~standard']?.version).toBe(1)
		})
	})
})

describe('catchError', () => {
	test('returns value on success', () => {
		const safeNum = catchError(num(), 0)
		expect(safeNum(5)).toBe(5)
	})

	test('returns default on error', () => {
		const safeNum = catchError(num(), 0)
		expect(safeNum('not a number' as any)).toBe(0)
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			const safeNum = catchError(num(), 0)
			expect(safeNum.safe!(5)).toEqual({ ok: true, value: 5 })
		})

		test('returns ok with default for invalid value', () => {
			const safeNum = catchError(num(), 0)
			expect(safeNum.safe!('not a number')).toEqual({ ok: true, value: 0 })
		})

		test('falls back to try-catch when no inner safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const safeNum = catchError(noSafe, 0)
			expect(safeNum.safe!(5)).toEqual({ ok: true, value: 5 })
			expect(safeNum.safe!('string')).toEqual({ ok: true, value: 0 })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const safeNum = catchError(num(), 0)
			expect(safeNum['~standard']).toBeDefined()
			expect(safeNum['~standard']?.version).toBe(1)
		})
	})
})
