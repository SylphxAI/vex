import { describe, expect, test } from 'bun:test'
import { array, num, object, str } from '..'
import { lazy } from './lazy'

describe('lazy', () => {
	test('creates a lazy validator for recursive types', () => {
		type Node = { value: number; children: Node[] }
		const nodeValidator = lazy<Node>(() =>
			object({
				value: num(),
				children: array(nodeValidator),
			})
		)

		const input = {
			value: 1,
			children: [
				{ value: 2, children: [] },
				{ value: 3, children: [{ value: 4, children: [] }] },
			],
		}

		expect(nodeValidator(input)).toEqual(input)
	})

	test('validates simple recursive structure', () => {
		type LinkedList = { value: number; next: LinkedList | null }
		const linkedListValidator = lazy<LinkedList>(() =>
			object({
				value: num(),
				next: (v: unknown) => {
					if (v === null) return null
					return linkedListValidator(v)
				},
			})
		)

		const input = { value: 1, next: { value: 2, next: { value: 3, next: null } } }
		expect(linkedListValidator(input)).toEqual(input)
	})

	test('throws on invalid data', () => {
		type Node = { value: number; children: Node[] }
		const nodeValidator = lazy<Node>(() =>
			object({
				value: num(),
				children: array(nodeValidator),
			})
		)

		expect(() => nodeValidator({ value: 'not a number', children: [] })).toThrow()
	})

	test('caches the validator factory result', () => {
		let callCount = 0
		const validator = lazy(() => {
			callCount++
			return str()
		})

		validator('first')
		validator('second')
		validator('third')

		expect(callCount).toBe(1)
	})

	describe('safe', () => {
		test('returns ok result for valid data', () => {
			type Node = { value: number }
			const nodeValidator = lazy<Node>(() => object({ value: num() }))

			const result = nodeValidator.safe!({ value: 42 })
			expect(result).toEqual({ ok: true, value: { value: 42 } })
		})

		test('returns error for invalid data', () => {
			type Node = { value: number }
			const nodeValidator = lazy<Node>(() => object({ value: num() }))

			const result = nodeValidator.safe!({ value: 'not a number' })
			expect(result.ok).toBe(false)
		})

		test('delegates to inner safe when available', () => {
			const validator = lazy(() => str())
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(validator.safe!(123)).toEqual({ ok: false, error: 'Expected string' })
		})

		test('falls back to try-catch when no inner safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any

			const validator = lazy(() => noSafe)
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(validator.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('handles non-Error exceptions', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any

			const validator = lazy(() => throwsNonError)
			expect(validator.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const validator = lazy(() => str())
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']?.version).toBe(1)
			expect(validator['~standard']?.vendor).toBe('vex')
		})

		test('validate returns value on success', () => {
			const validator = lazy(() => str())
			const result = validator['~standard']!.validate('hello')
			expect(result).toEqual({ value: 'hello' })
		})

		test('validate returns issues on failure', () => {
			const validator = lazy(() => str())
			const result = validator['~standard']!.validate(123)
			expect(result.issues).toBeDefined()
		})

		test('delegates to inner ~standard when available', () => {
			type Node = { value: number }
			const nodeValidator = lazy<Node>(() => object({ value: num() }))

			const validResult = nodeValidator['~standard']!.validate({ value: 42 })
			expect(validResult).toEqual({ value: { value: 42 } })

			const invalidResult = nodeValidator['~standard']!.validate({ value: 'not a number' })
			expect(invalidResult.issues).toBeDefined()
		})

		test('falls back to safe method when no inner ~standard', () => {
			const withSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			withSafe.safe = (v: unknown) => {
				if (typeof v !== 'string') return { ok: false, error: 'Must be string' }
				return { ok: true, value: v }
			}

			const validator = lazy(() => withSafe)
			expect(validator['~standard']!.validate('hello')).toEqual({ value: 'hello' })
			expect(validator['~standard']!.validate(123).issues![0].message).toBe('Must be string')
		})

		test('falls back to try-catch when no ~standard or safe', () => {
			const noStd = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any

			const validator = lazy(() => noStd)
			expect(validator['~standard']!.validate('hello')).toEqual({ value: 'hello' })
			expect(validator['~standard']!.validate(123).issues![0].message).toBe('Must be string')
		})

		test('handles non-Error exceptions', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any

			const validator = lazy(() => throwsNonError)
			const result = validator['~standard']!.validate('anything')
			expect(result.issues![0].message).toBe('Unknown error')
		})
	})
})
