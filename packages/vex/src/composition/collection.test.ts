// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import {
	checkItems,
	entries,
	everyItem,
	excludes,
	filterItems,
	findItem,
	mapItems,
	maxEntries,
	minEntries,
	notEntries,
	reduceItems,
	someItem,
	sortItems,
} from './collection'

describe('Collection Actions', () => {
	describe('everyItem', () => {
		test('passes when all items match', () => {
			const allPositive = everyItem((n: number) => n > 0, 'All must be positive')
			expect(allPositive([1, 2, 3])).toEqual([1, 2, 3])
		})

		test('fails when any item does not match', () => {
			const allPositive = everyItem((n: number) => n > 0, 'All must be positive')
			expect(() => allPositive([1, -2, 3])).toThrow('All must be positive')
		})
	})

	describe('someItem', () => {
		test('passes when at least one item matches', () => {
			const hasPositive = someItem((n: number) => n > 0, 'Need at least one positive')
			expect(hasPositive([-1, 2, -3])).toEqual([-1, 2, -3])
		})

		test('fails when no items match', () => {
			const hasPositive = someItem((n: number) => n > 0, 'Need at least one positive')
			expect(() => hasPositive([-1, -2, -3])).toThrow('Need at least one positive')
		})
	})

	describe('checkItems', () => {
		test('validates with custom function', () => {
			const startsWithOne = checkItems((arr: number[]) => arr[0] === 1, 'Must start with 1')
			expect(startsWithOne([1, 2, 3])).toEqual([1, 2, 3])
			expect(() => startsWithOne([2, 3, 4])).toThrow('Must start with 1')
		})
	})

	describe('filterItems', () => {
		test('filters items by predicate', () => {
			const onlyPositive = filterItems((n: number) => n > 0)
			expect(onlyPositive([1, -2, 3, -4])).toEqual([1, 3])
		})
	})

	describe('findItem', () => {
		test('finds first matching item', () => {
			const findPositive = findItem((n: number) => n > 0)
			expect(findPositive([-1, -2, 3, 4])).toBe(3)
		})

		test('returns undefined when no match', () => {
			const findPositive = findItem((n: number) => n > 0)
			expect(findPositive([-1, -2, -3])).toBeUndefined()
		})
	})

	describe('mapItems', () => {
		test('transforms items', () => {
			const doubled = mapItems((n: number) => n * 2)
			expect(doubled([1, 2, 3])).toEqual([2, 4, 6])
		})
	})

	describe('reduceItems', () => {
		test('reduces items', () => {
			const sum = reduceItems((acc: number, n: number) => acc + n, 0)
			expect(sum([1, 2, 3])).toBe(6)
		})
	})

	describe('sortItems', () => {
		test('sorts items', () => {
			const sorted = sortItems((a: number, b: number) => a - b)
			expect(sorted([3, 1, 2])).toEqual([1, 2, 3])
		})

		test('does not mutate original', () => {
			const sorted = sortItems((a: number, b: number) => a - b)
			const original = [3, 1, 2]
			sorted(original)
			expect(original).toEqual([3, 1, 2])
		})
	})

	describe('excludes', () => {
		test('passes when no excluded values present', () => {
			const noZeros = excludes([0], 'No zeros allowed')
			expect(noZeros([1, 2, 3])).toEqual([1, 2, 3])
		})

		test('fails when excluded value present', () => {
			const noZeros = excludes([0], 'No zeros allowed')
			expect(() => noZeros([1, 0, 3])).toThrow('No zeros allowed')
		})

		test('safe version passes when no excluded values', () => {
			const noZeros = excludes([0], 'No zeros allowed')
			expect(noZeros.safe!([1, 2, 3])).toEqual({ ok: true, value: [1, 2, 3] })
		})

		test('safe version fails when excluded value present', () => {
			const noZeros = excludes([0], 'No zeros allowed')
			expect(noZeros.safe!([1, 0, 3])).toEqual({ ok: false, error: 'No zeros allowed' })
		})
	})

	describe('entries', () => {
		test('validates exact entry count', () => {
			expect(entries(2)({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
			expect(() => entries(2)({ a: 1 })).toThrow('Must have exactly 2 entries')
		})

		test('safe version passes with exact count', () => {
			expect(entries(2).safe!({ a: 1, b: 2 })).toEqual({ ok: true, value: { a: 1, b: 2 } })
		})

		test('safe version fails with wrong count', () => {
			expect(entries(2).safe!({ a: 1 })).toEqual({ ok: false, error: 'Must have exactly 2 entries' })
		})
	})

	describe('minEntries', () => {
		test('validates minimum entries', () => {
			expect(minEntries(2)({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
			expect(() => minEntries(2)({ a: 1 })).toThrow('Must have at least 2 entries')
		})

		test('safe version passes with enough entries', () => {
			expect(minEntries(2).safe!({ a: 1, b: 2 })).toEqual({ ok: true, value: { a: 1, b: 2 } })
		})

		test('safe version fails with too few entries', () => {
			expect(minEntries(2).safe!({ a: 1 })).toEqual({ ok: false, error: 'Must have at least 2 entries' })
		})
	})

	describe('maxEntries', () => {
		test('validates maximum entries', () => {
			expect(maxEntries(2)({ a: 1 })).toEqual({ a: 1 })
			expect(() => maxEntries(2)({ a: 1, b: 2, c: 3 })).toThrow('Must have at most 2 entries')
		})

		test('safe version passes with few enough entries', () => {
			expect(maxEntries(2).safe!({ a: 1, b: 2 })).toEqual({ ok: true, value: { a: 1, b: 2 } })
		})

		test('safe version fails with too many entries', () => {
			expect(maxEntries(2).safe!({ a: 1, b: 2, c: 3 })).toEqual({ ok: false, error: 'Must have at most 2 entries' })
		})
	})

	describe('notEntries', () => {
		test('validates entry count is not n', () => {
			expect(notEntries(0)({ a: 1 })).toEqual({ a: 1 })
			expect(() => notEntries(1)({ a: 1 })).toThrow('Must not have 1 entries')
		})

		test('safe version passes with different count', () => {
			expect(notEntries(2).safe!({ a: 1 })).toEqual({ ok: true, value: { a: 1 } })
		})

		test('safe version fails with exact count', () => {
			expect(notEntries(1).safe!({ a: 1 })).toEqual({ ok: false, error: 'Must not have 1 entries' })
		})
	})

	test('safe versions work correctly', () => {
		const allPositive = everyItem((n: number) => n > 0)
		expect(allPositive.safe!([1, 2, 3])).toEqual({ ok: true, value: [1, 2, 3] })
		expect(allPositive.safe!([1, -2, 3])).toHaveProperty('ok', false)
	})

	describe('Standard Schema support', () => {
		test('everyItem has Standard Schema', () => {
			const allPositive = everyItem((n: number) => n > 0)
			expect(allPositive['~standard']).toBeDefined()
			expect(allPositive['~standard']!.validate([1, 2, 3])).toEqual({ value: [1, 2, 3] })
		})

		test('entries has Standard Schema', () => {
			expect(entries(2)['~standard']).toBeDefined()
			expect(entries(2)['~standard']!.validate({ a: 1, b: 2 })).toEqual({ value: { a: 1, b: 2 } })
		})

		test('excludes has Standard Schema', () => {
			const noZeros = excludes([0])
			expect(noZeros['~standard']).toBeDefined()
			expect(noZeros['~standard']!.validate([1, 2, 3])).toEqual({ value: [1, 2, 3] })
		})
	})
})
