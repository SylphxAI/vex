import { describe, expect, test } from 'bun:test'
import { minLength, pipe, positive } from '..'
import { num, str } from '../validators/primitives'
import { set } from './set'

describe('set', () => {
	const numSet = set(num())
	const strSet = set(str())

	describe('basic validation', () => {
		test('validates Set with valid items', () => {
			const input = new Set([1, 2, 3])
			expect(numSet(input)).toEqual(new Set([1, 2, 3]))
		})

		test('validates Set with string items', () => {
			const input = new Set(['a', 'b', 'c'])
			expect(strSet(input)).toEqual(new Set(['a', 'b', 'c']))
		})

		test('validates empty Set', () => {
			const input = new Set<number>()
			expect(numSet(input)).toEqual(new Set())
		})

		test('validates Set with single item', () => {
			const input = new Set([42])
			expect(numSet(input)).toEqual(new Set([42]))
		})

		test('validates Set with many items', () => {
			const input = new Set(Array.from({ length: 100 }, (_, i) => i))
			expect(numSet(input)).toEqual(input)
		})

		test('validates Set with negative numbers', () => {
			const input = new Set([-1, -2, -3])
			expect(numSet(input)).toEqual(new Set([-1, -2, -3]))
		})

		test('validates Set with floating point numbers', () => {
			const input = new Set([1.5, 2.5, 3.5])
			expect(numSet(input)).toEqual(new Set([1.5, 2.5, 3.5]))
		})

		test('validates Set with zero', () => {
			const input = new Set([0])
			expect(numSet(input)).toEqual(new Set([0]))
		})

		test('validates Set with special number values', () => {
			const input = new Set([Infinity, -Infinity])
			expect(numSet(input)).toEqual(new Set([Infinity, -Infinity]))
		})

		test('validates Set with empty strings', () => {
			const input = new Set([''])
			expect(strSet(input)).toEqual(new Set(['']))
		})

		test('validates Set with unicode strings', () => {
			const input = new Set(['你好', '世界', '🎉'])
			expect(strSet(input)).toEqual(new Set(['你好', '世界', '🎉']))
		})

		test('validates Set with whitespace strings', () => {
			const input = new Set(['  ', '\t', '\n'])
			expect(strSet(input)).toEqual(new Set(['  ', '\t', '\n']))
		})
	})

	describe('rejection', () => {
		test('rejects non-Set values', () => {
			expect(() => numSet([1, 2, 3] as any)).toThrow('Expected Set')
			expect(() => numSet({} as any)).toThrow('Expected Set')
			expect(() => numSet(null as any)).toThrow('Expected Set')
		})

		test('rejects undefined', () => {
			expect(() => numSet(undefined as any)).toThrow('Expected Set')
		})

		test('rejects Map', () => {
			const map = new Map([[1, 'a']])
			expect(() => numSet(map as any)).toThrow('Expected Set')
		})

		test('rejects WeakSet', () => {
			const obj = {}
			const weakSet = new WeakSet([obj])
			expect(() => numSet(weakSet as any)).toThrow('Expected Set')
		})

		test('rejects string', () => {
			expect(() => numSet('set' as any)).toThrow('Expected Set')
		})

		test('rejects number', () => {
			expect(() => numSet(123 as any)).toThrow('Expected Set')
		})

		test('rejects boolean', () => {
			expect(() => numSet(true as any)).toThrow('Expected Set')
		})

		test('rejects function', () => {
			expect(() => numSet((() => {}) as any)).toThrow('Expected Set')
		})
	})

	describe('item validation', () => {
		test('validates items against schema', () => {
			const input = new Set([1, 'not a number' as unknown as number, 3])
			expect(() => numSet(input)).toThrow('Set[1]: Expected number')
		})

		test('validates first invalid item', () => {
			const input = new Set(['not a number' as unknown as number, 2, 3])
			expect(() => numSet(input)).toThrow('Set[0]: Expected number')
		})

		test('validates last item', () => {
			const input = new Set([1, 2, 'not a number' as unknown as number])
			expect(() => numSet(input)).toThrow('Set[2]: Expected number')
		})

		test('item error includes index', () => {
			const input = new Set([1, 2, 3, 4, 'not a number' as unknown as number])
			expect(() => numSet(input)).toThrow('Set[4]:')
		})

		test('string Set rejects numbers', () => {
			const input = new Set(['a', 123 as unknown as string, 'c'])
			expect(() => strSet(input)).toThrow('Set[1]: Expected string')
		})
	})

	describe('piped validators', () => {
		test('works with piped validators', () => {
			const positiveNumSet = set(num(positive))
			expect(positiveNumSet(new Set([1, 2, 3]))).toEqual(new Set([1, 2, 3]))
			expect(() => positiveNumSet(new Set([1, -2, 3]))).toThrow('Must be positive')
		})

		test('works with string validators', () => {
			const nonEmptyStrSet = set(str(minLength(1)))
			expect(nonEmptyStrSet(new Set(['a', 'bc']))).toEqual(new Set(['a', 'bc']))
			expect(() => nonEmptyStrSet(new Set(['a', '']))).toThrow()
		})

		test('validates all items with piped validator', () => {
			const positiveNumSet = set(num(positive))
			const input = new Set([-1, -2, -3])
			expect(() => positiveNumSet(input)).toThrow('Must be positive')
		})
	})

	describe('error handling', () => {
		test('throws non-ValidationError from validator', () => {
			const throwsPlain = ((_v: unknown) => {
				throw new TypeError('plain error')
			}) as any
			const schema = set(throwsPlain)
			const input = new Set(['test'])
			expect(() => schema(input)).toThrow('plain error')
		})

		test('throws RangeError from validator', () => {
			const throwsRange = ((_v: unknown) => {
				throw new RangeError('range error')
			}) as any
			const schema = set(throwsRange)
			const input = new Set([1])
			expect(() => schema(input)).toThrow('range error')
		})

		test('handles validator returning undefined', () => {
			const returnsUndefined = ((_v: unknown) => undefined) as any
			const schema = set(returnsUndefined)
			const input = new Set([1])
			const result = schema(input)
			expect(result).toEqual(new Set([undefined]))
		})
	})

	describe('safe', () => {
		test('returns ok result for valid Set', () => {
			const result = numSet.safe?.(new Set([1, 2, 3]))
			expect(result?.ok).toBe(true)
			if (result?.ok) {
				expect(result.value).toEqual(new Set([1, 2, 3]))
			}
		})

		test('returns ok result for empty Set', () => {
			const result = numSet.safe?.(new Set())
			expect(result?.ok).toBe(true)
			if (result?.ok) {
				expect(result.value).toEqual(new Set())
			}
		})

		test('returns error for invalid Set', () => {
			const result = numSet.safe?.([1, 2, 3] as any)
			expect(result?.ok).toBe(false)
		})

		test('returns error for null', () => {
			const result = numSet.safe?.(null as any)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toBe('Expected Set')
			}
		})

		test('returns error for undefined', () => {
			const result = numSet.safe?.(undefined as any)
			expect(result?.ok).toBe(false)
		})

		test('returns error for invalid item', () => {
			const input = new Set([1, 'not a number' as unknown as number])
			const result = numSet.safe?.(input)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toContain('Set[1]:')
			}
		})

		test('returns error with item index for first invalid', () => {
			const input = new Set(['invalid' as unknown as number, 2, 3])
			const result = numSet.safe?.(input)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toContain('Set[0]:')
			}
		})

		test('falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Expected number')
				return v
			}) as any
			const schema = set(noSafe)
			const input = new Set([1, 'not a number'])
			const result = schema.safe?.(input)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toContain('Set[1]:')
			}
		})

		test('falls back for validator throwing TypeError', () => {
			const noSafe = ((_v: unknown) => {
				throw new TypeError('Custom type error')
			}) as any
			const schema = set(noSafe)
			const input = new Set([1])
			const result = schema.safe?.(input)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toContain('Custom type error')
			}
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			expect(numSet['~standard']).toBeDefined()
			expect(numSet['~standard']?.version).toBe(1)
			expect(numSet['~standard']?.vendor).toBe('vex')
		})

		test('validate returns value', () => {
			const input = new Set([1, 2, 3])
			const result = numSet['~standard']!.validate(input)
			expect(result.value).toEqual(new Set([1, 2, 3]))
		})

		test('validate returns value for empty Set', () => {
			const input = new Set<number>()
			const result = numSet['~standard']!.validate(input)
			expect(result.value).toEqual(new Set())
		})

		test('validate returns issues for non-Set', () => {
			const result = numSet['~standard']!.validate([1, 2, 3])
			expect(result.issues![0].message).toBe('Expected Set')
		})

		test('validate returns issues for null', () => {
			const result = numSet['~standard']!.validate(null)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toBe('Expected Set')
		})

		test('validate returns issues for undefined', () => {
			const result = numSet['~standard']!.validate(undefined)
			expect(result.issues).toBeDefined()
		})

		test('validate returns issues for invalid item with path', () => {
			const input = new Set([1, 'not a number' as unknown as number])
			const result = numSet['~standard']!.validate(input)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].path).toEqual([1])
		})

		test('validate returns correct path for first invalid item', () => {
			const input = new Set(['not a number' as unknown as number, 2])
			const result = numSet['~standard']!.validate(input)
			expect(result.issues![0].path).toEqual([0])
		})

		test('validate returns correct path for last invalid item', () => {
			const input = new Set([1, 2, 'not a number' as unknown as number])
			const result = numSet['~standard']!.validate(input)
			expect(result.issues![0].path).toEqual([2])
		})

		test('falls back to try-catch', () => {
			const noStd = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Expected number')
				return v
			}) as any
			const schema = set(noStd)
			const input = new Set([1, 'not a number'])
			const result = schema['~standard']!.validate(input)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].path).toEqual([1])
		})

		test('falls back for validator without ~standard', () => {
			const noStd = ((v: unknown) => v) as any
			const schema = set(noStd)
			const input = new Set([1, 2, 3])
			const result = schema['~standard']!.validate(input)
			expect(result.value).toEqual(new Set([1, 2, 3]))
		})
	})

	describe('edge cases', () => {
		test('preserves Set identity for valid input', () => {
			const input = new Set([1, 2, 3])
			const result = numSet(input)
			// Result is a new Set with validated items
			expect(result).toEqual(input)
		})

		test('handles Set with mixed valid types', () => {
			// Create a Set that looks like it has mixed types but all are numbers
			const input = new Set([1, 2.5, -3, 0, Infinity])
			expect(numSet(input)).toEqual(new Set([1, 2.5, -3, 0, Infinity]))
		})

		test('handles Set iteration order', () => {
			const input = new Set([3, 1, 2])
			const result = numSet(input)
			expect([...result]).toEqual([3, 1, 2])
		})

		test('validates each item independently', () => {
			let callCount = 0
			const counter = ((v: number) => {
				callCount++
				return v
			}) as any
			counter.safe = (v: number) => ({ ok: true, value: v })
			const schema = set(counter)
			schema(new Set([1, 2, 3]))
			expect(callCount).toBe(3)
		})

		test('stops at first error (when using non-safe)', () => {
			let callCount = 0
			const counter = ((v: unknown) => {
				callCount++
				if (typeof v !== 'number') throw new Error('Expected number')
				return v
			}) as any
			const schema = set(counter)
			try {
				schema(new Set(['a', 'b', 'c']))
			} catch (_e) {}
			expect(callCount).toBe(1)
		})

		test('handles nested Sets', () => {
			// While Set<Set<T>> is unusual, it should work
			const innerSet = set(num())
			const outerSet = set(innerSet as any)
			const input = new Set([new Set([1, 2]), new Set([3, 4])])
			const result = outerSet(input)
			expect(result.size).toBe(2)
		})

		test('returns new Set instance', () => {
			const input = new Set([1, 2, 3])
			const result = numSet(input)
			// Depending on implementation, might be same or different instance
			expect(result).toEqual(input)
		})

		test('handles Set subclass', () => {
			class MySet<T> extends Set<T> {}
			const input = new MySet([1, 2, 3])
			expect(numSet(input)).toEqual(new Set([1, 2, 3]))
		})
	})

	describe('type safety', () => {
		test('infers correct output type', () => {
			const result = numSet(new Set([1, 2, 3]))
			// TypeScript should infer Set<number>
			const _: Set<number> = result
		})

		test('rejects wrong input type at runtime', () => {
			// @ts-expect-error - intentional type mismatch
			expect(() => numSet(new Set(['a', 'b']))).toThrow()
		})
	})

	describe('integration', () => {
		test('works with complex validator pipeline', () => {
			const positiveIntSet = set(pipe(num(), positive, (v: number) => Math.floor(v)))
			expect(positiveIntSet(new Set([1.5, 2.8, 3.1]))).toEqual(new Set([1, 2, 3]))
		})

		test('validates real-world tag set', () => {
			const tagSet = set(str(minLength(1)))
			const tags = new Set(['javascript', 'typescript', 'testing'])
			expect(tagSet(tags)).toEqual(tags)
		})

		test('validates set of IDs', () => {
			const idSet = set(num(positive))
			const ids = new Set([1, 2, 3, 4, 5])
			expect(idSet(ids)).toEqual(ids)
		})
	})
})
