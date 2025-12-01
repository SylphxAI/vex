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

		test('uses default error message', () => {
			const allPositive = everyItem((n: number) => n > 0)
			expect(() => allPositive([1, -2, 3])).toThrow('Not all items passed validation')
		})

		test('safe method returns success', () => {
			const allPositive = everyItem((n: number) => n > 0)
			expect(allPositive.safe!([1, 2, 3])).toEqual({ ok: true, value: [1, 2, 3] })
		})

		test('safe method returns error', () => {
			const allPositive = everyItem((n: number) => n > 0, 'All must be positive')
			expect(allPositive.safe!([1, -2, 3])).toEqual({ ok: false, error: 'All must be positive' })
		})

		test('provides index to predicate', () => {
			const indexCheck = everyItem((n: number, i: number) => n === i + 1)
			expect(indexCheck([1, 2, 3])).toEqual([1, 2, 3])
			expect(() => indexCheck([1, 3, 3])).toThrow()
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

		test('uses default error message', () => {
			const hasPositive = someItem((n: number) => n > 0)
			expect(() => hasPositive([-1, -2, -3])).toThrow('No items passed validation')
		})

		test('safe method returns success', () => {
			const hasPositive = someItem((n: number) => n > 0)
			expect(hasPositive.safe!([-1, 2, -3])).toEqual({ ok: true, value: [-1, 2, -3] })
		})

		test('safe method returns error', () => {
			const hasPositive = someItem((n: number) => n > 0, 'Need positive')
			expect(hasPositive.safe!([-1, -2, -3])).toEqual({ ok: false, error: 'Need positive' })
		})

		test('provides index to predicate', () => {
			const indexCheck = someItem((n: number, i: number) => n === i)
			expect(indexCheck([5, 1, 7])).toEqual([5, 1, 7]) // index 1 equals value 1
			expect(() => indexCheck([5, 6, 7])).toThrow()
		})
	})

	describe('checkItems', () => {
		test('validates with custom function', () => {
			const startsWithOne = checkItems((arr: number[]) => arr[0] === 1, 'Must start with 1')
			expect(startsWithOne([1, 2, 3])).toEqual([1, 2, 3])
			expect(() => startsWithOne([2, 3, 4])).toThrow('Must start with 1')
		})

		test('uses default error message', () => {
			const startsWithOne = checkItems((arr: number[]) => arr[0] === 1)
			expect(() => startsWithOne([2, 3, 4])).toThrow('Items validation failed')
		})

		test('safe method returns success', () => {
			const startsWithOne = checkItems((arr: number[]) => arr[0] === 1)
			expect(startsWithOne.safe!([1, 2, 3])).toEqual({ ok: true, value: [1, 2, 3] })
		})

		test('safe method returns error', () => {
			const startsWithOne = checkItems((arr: number[]) => arr[0] === 1, 'Must start with 1')
			expect(startsWithOne.safe!([2, 3, 4])).toEqual({ ok: false, error: 'Must start with 1' })
		})
	})

	describe('filterItems', () => {
		test('filters items by predicate', () => {
			const onlyPositive = filterItems((n: number) => n > 0)
			expect(onlyPositive([1, -2, 3, -4])).toEqual([1, 3])
		})

		test('safe method always succeeds', () => {
			const onlyPositive = filterItems((n: number) => n > 0)
			expect(onlyPositive.safe!([1, -2, 3, -4])).toEqual({ ok: true, value: [1, 3] })
		})

		test('provides index to predicate', () => {
			const evenIndexes = filterItems((_n: number, i: number) => i % 2 === 0)
			expect(evenIndexes([1, 2, 3, 4, 5])).toEqual([1, 3, 5])
		})

		test('returns empty array when no matches', () => {
			const onlyPositive = filterItems((n: number) => n > 0)
			expect(onlyPositive([-1, -2, -3])).toEqual([])
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

		test('safe method returns found item', () => {
			const findPositive = findItem((n: number) => n > 0)
			expect(findPositive.safe!([-1, 2, 3])).toEqual({ ok: true, value: 2 })
		})

		test('safe method returns undefined when not found', () => {
			const findPositive = findItem((n: number) => n > 0)
			expect(findPositive.safe!([-1, -2, -3])).toEqual({ ok: true, value: undefined })
		})

		test('provides index to predicate', () => {
			const findAtIndex2 = findItem((_n: number, i: number) => i === 2)
			expect(findAtIndex2([10, 20, 30, 40])).toBe(30)
		})
	})

	describe('mapItems', () => {
		test('transforms items', () => {
			const doubled = mapItems((n: number) => n * 2)
			expect(doubled([1, 2, 3])).toEqual([2, 4, 6])
		})

		test('safe method returns transformed items', () => {
			const doubled = mapItems((n: number) => n * 2)
			expect(doubled.safe!([1, 2, 3])).toEqual({ ok: true, value: [2, 4, 6] })
		})

		test('provides index to mapper', () => {
			const withIndex = mapItems((n: number, i: number) => `${i}:${n}`)
			expect(withIndex([10, 20, 30])).toEqual(['0:10', '1:20', '2:30'])
		})

		test('can change item types', () => {
			const numToStr = mapItems((n: number) => String(n))
			expect(numToStr([1, 2, 3])).toEqual(['1', '2', '3'])
		})
	})

	describe('reduceItems', () => {
		test('reduces items', () => {
			const sum = reduceItems((acc: number, n: number) => acc + n, 0)
			expect(sum([1, 2, 3])).toBe(6)
		})

		test('safe method returns reduced value', () => {
			const sum = reduceItems((acc: number, n: number) => acc + n, 0)
			expect(sum.safe!([1, 2, 3])).toEqual({ ok: true, value: 6 })
		})

		test('provides index to reducer', () => {
			const sumWithIndex = reduceItems((acc: number, n: number, i: number) => acc + n + i, 0)
			expect(sumWithIndex([10, 20, 30])).toBe(63) // (10+0) + (20+1) + (30+2) = 63
		})

		test('can reduce to different type', () => {
			const join = reduceItems((acc: string, n: number) => acc + n.toString(), '')
			expect(join([1, 2, 3])).toBe('123')
		})

		test('works with empty array', () => {
			const sum = reduceItems((acc: number, n: number) => acc + n, 0)
			expect(sum([])).toBe(0)
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

		test('safe method returns sorted items', () => {
			const sorted = sortItems((a: number, b: number) => a - b)
			expect(sorted.safe!([3, 1, 2])).toEqual({ ok: true, value: [1, 2, 3] })
		})

		test('uses default sort when no compareFn provided', () => {
			const sorted = sortItems<string>()
			expect(sorted(['c', 'a', 'b'])).toEqual(['a', 'b', 'c'])
		})

		test('safe method with default sort', () => {
			const sorted = sortItems<number>()
			expect(sorted.safe!([10, 2, 1])).toEqual({ ok: true, value: [1, 10, 2] }) // Default sort is lexicographic
		})

		test('sorts in descending order', () => {
			const sorted = sortItems((a: number, b: number) => b - a)
			expect(sorted([1, 3, 2])).toEqual([3, 2, 1])
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
