// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { maxSize, minSize, notSize, size } from './size'

describe('validators/size', () => {
	describe('size', () => {
		describe('with Blob', () => {
			test('validates Blob size', () => {
				const blob = new Blob(['hello']) // 5 bytes
				const validator = size(5)
				expect(validator(blob)).toBe(blob)
			})

			test('throws on wrong Blob size', () => {
				const blob = new Blob(['hello']) // 5 bytes
				const validator = size(10)
				expect(() => validator(blob)).toThrow('Must have size 10')
			})

			test('validates empty Blob', () => {
				const blob = new Blob([])
				const validator = size(0)
				expect(validator(blob)).toBe(blob)
			})

			test('rejects empty Blob when expecting non-zero size', () => {
				const blob = new Blob([])
				const validator = size(5)
				expect(() => validator(blob)).toThrow('Must have size 5')
			})

			test('validates large Blob', () => {
				const blob = new Blob(['x'.repeat(1000)])
				const validator = size(1000)
				expect(validator(blob)).toBe(blob)
			})

			test('validates Blob with binary data', () => {
				const buffer = new Uint8Array([1, 2, 3, 4, 5])
				const blob = new Blob([buffer])
				const validator = size(5)
				expect(validator(blob)).toBe(blob)
			})

			test('safe version returns success', () => {
				const blob = new Blob(['hello'])
				const validator = size(5)
				expect(validator.safe!(blob)).toEqual({ ok: true, value: blob })
			})

			test('safe version returns error', () => {
				const blob = new Blob(['hello'])
				const validator = size(10)
				expect(validator.safe!(blob)).toEqual({ ok: false, error: 'Must have size 10' })
			})
		})

		describe('with Set', () => {
			test('validates Set size', () => {
				const set = new Set([1, 2, 3])
				const validator = size(3)
				expect(validator(set)).toBe(set)
			})

			test('throws on wrong Set size', () => {
				const set = new Set([1, 2, 3])
				const validator = size(5)
				expect(() => validator(set)).toThrow('Must have size 5')
			})

			test('validates empty Set', () => {
				const set = new Set()
				const validator = size(0)
				expect(validator(set)).toBe(set)
			})

			test('validates Set with strings', () => {
				const set = new Set(['a', 'b', 'c'])
				const validator = size(3)
				expect(validator(set)).toBe(set)
			})

			test('validates Set with objects', () => {
				const set = new Set([{}, {}, {}])
				const validator = size(3)
				expect(validator(set)).toBe(set)
			})

			test('safe version with Set', () => {
				const set = new Set([1, 2])
				const validator = size(2)
				expect(validator.safe!(set)).toEqual({ ok: true, value: set })
			})
		})

		describe('with Map', () => {
			test('validates Map size', () => {
				const map = new Map([
					['a', 1],
					['b', 2],
				])
				const validator = size(2)
				expect(validator(map)).toBe(map)
			})

			test('throws on wrong Map size', () => {
				const map = new Map([['a', 1]])
				const validator = size(3)
				expect(() => validator(map)).toThrow('Must have size 3')
			})

			test('validates empty Map', () => {
				const map = new Map()
				const validator = size(0)
				expect(validator(map)).toBe(map)
			})

			test('validates Map with complex keys', () => {
				const obj1 = {}
				const obj2 = {}
				const map = new Map([
					[obj1, 1],
					[obj2, 2],
				])
				const validator = size(2)
				expect(validator(map)).toBe(map)
			})

			test('safe version with Map', () => {
				const map = new Map([['key', 'value']])
				const validator = size(1)
				expect(validator.safe!(map)).toEqual({ ok: true, value: map })
			})
		})

		describe('Standard Schema', () => {
			test('has ~standard property', () => {
				const validator = size(5)
				expect(validator['~standard']).toBeDefined()
				expect(validator['~standard']!.version).toBe(1)
				expect(validator['~standard']!.vendor).toBe('vex')
			})

			test('validate returns value on success', () => {
				const blob = new Blob(['hello'])
				const validator = size(5)
				const result = validator['~standard']!.validate(blob)
				expect(result.value).toBe(blob)
			})

			test('validate returns issues on failure', () => {
				const blob = new Blob(['hello'])
				const validator = size(10)
				const result = validator['~standard']!.validate(blob)
				expect(result.issues).toBeDefined()
				expect(result.issues![0].message).toBe('Must have size 10')
			})
		})

		describe('edge cases', () => {
			test('size 0 validation', () => {
				const validator = size(0)
				expect(validator(new Set())).toEqual(new Set())
				expect(validator(new Map())).toEqual(new Map())
				expect(validator(new Blob([]))).toEqual(new Blob([]))
			})

			test('large size values', () => {
				const validator = size(1000000)
				const set = new Set(Array.from({ length: 1000000 }, (_, i) => i))
				expect(validator(set)).toBe(set)
			})

			test('validates with exact match required', () => {
				const validator = size(3)
				expect(validator(new Set([1, 2, 3]))).toEqual(new Set([1, 2, 3]))
				expect(() => validator(new Set([1, 2]))).toThrow()
				expect(() => validator(new Set([1, 2, 3, 4]))).toThrow()
			})
		})
	})

	describe('minSize', () => {
		describe('with Blob', () => {
			test('validates minimum Blob size', () => {
				const blob = new Blob(['hello world']) // > 5 bytes
				const validator = minSize(5)
				expect(validator(blob)).toBe(blob)
			})

			test('validates exact minimum', () => {
				const blob = new Blob(['hello']) // 5 bytes
				const validator = minSize(5)
				expect(validator(blob)).toBe(blob)
			})

			test('throws when below minimum', () => {
				const blob = new Blob(['hi']) // < 5 bytes
				const validator = minSize(5)
				expect(() => validator(blob)).toThrow('Must have at least size 5')
			})

			test('validates empty Blob with minSize 0', () => {
				const blob = new Blob([])
				const validator = minSize(0)
				expect(validator(blob)).toBe(blob)
			})

			test('safe version returns success', () => {
				const blob = new Blob(['hello world'])
				const validator = minSize(5)
				expect(validator.safe!(blob)).toEqual({ ok: true, value: blob })
			})

			test('safe version returns error', () => {
				const blob = new Blob(['hi'])
				const validator = minSize(5)
				expect(validator.safe!(blob)).toEqual({ ok: false, error: 'Must have at least size 5' })
			})
		})

		describe('with Set', () => {
			test('validates Set minimum size', () => {
				const set = new Set([1, 2, 3])
				const validator = minSize(2)
				expect(validator(set)).toBe(set)
			})

			test('validates Set at exact minimum', () => {
				const set = new Set([1, 2])
				const validator = minSize(2)
				expect(validator(set)).toBe(set)
			})

			test('throws when Set below minimum', () => {
				const set = new Set([1])
				const validator = minSize(2)
				expect(() => validator(set)).toThrow('Must have at least size 2')
			})

			test('validates empty Set with minSize 0', () => {
				const set = new Set()
				const validator = minSize(0)
				expect(validator(set)).toBe(set)
			})
		})

		describe('with Map', () => {
			test('validates Map minimum size', () => {
				const map = new Map([
					['a', 1],
					['b', 2],
					['c', 3],
				])
				const validator = minSize(2)
				expect(validator(map)).toBe(map)
			})

			test('throws when Map below minimum', () => {
				const map = new Map([['a', 1]])
				const validator = minSize(3)
				expect(() => validator(map)).toThrow('Must have at least size 3')
			})
		})

		describe('Standard Schema', () => {
			test('has ~standard property', () => {
				const validator = minSize(5)
				expect(validator['~standard']).toBeDefined()
				expect(validator['~standard']!.version).toBe(1)
			})

			test('validate returns value on success', () => {
				const set = new Set([1, 2, 3])
				const validator = minSize(2)
				const result = validator['~standard']!.validate(set)
				expect(result.value).toBe(set)
			})

			test('validate returns issues on failure', () => {
				const set = new Set([1])
				const validator = minSize(5)
				const result = validator['~standard']!.validate(set)
				expect(result.issues![0].message).toBe('Must have at least size 5')
			})
		})

		describe('edge cases', () => {
			test('minSize 0 always passes for valid types', () => {
				const validator = minSize(0)
				expect(validator(new Set())).toEqual(new Set())
				expect(validator(new Map())).toEqual(new Map())
			})

			test('minSize with large values', () => {
				const validator = minSize(100)
				const largeSet = new Set(Array.from({ length: 200 }, (_, i) => i))
				expect(validator(largeSet)).toBe(largeSet)
			})
		})
	})

	describe('maxSize', () => {
		describe('with Blob', () => {
			test('validates maximum Blob size', () => {
				const blob = new Blob(['hi'])
				const validator = maxSize(10)
				expect(validator(blob)).toBe(blob)
			})

			test('validates exact maximum', () => {
				const blob = new Blob(['hello'])
				const validator = maxSize(5)
				expect(validator(blob)).toBe(blob)
			})

			test('throws when above maximum', () => {
				const blob = new Blob(['hello world this is long'])
				const validator = maxSize(5)
				expect(() => validator(blob)).toThrow('Must have at most size 5')
			})

			test('validates empty Blob', () => {
				const blob = new Blob([])
				const validator = maxSize(10)
				expect(validator(blob)).toBe(blob)
			})

			test('safe version returns success', () => {
				const blob = new Blob(['hi'])
				const validator = maxSize(10)
				expect(validator.safe!(blob)).toEqual({ ok: true, value: blob })
			})

			test('safe version returns error', () => {
				const blob = new Blob(['hello world this is long'])
				const validator = maxSize(5)
				expect(validator.safe!(blob)).toEqual({ ok: false, error: 'Must have at most size 5' })
			})
		})

		describe('with Set', () => {
			test('validates Set maximum size', () => {
				const set = new Set([1, 2])
				const validator = maxSize(5)
				expect(validator(set)).toBe(set)
			})

			test('validates Set at exact maximum', () => {
				const set = new Set([1, 2, 3])
				const validator = maxSize(3)
				expect(validator(set)).toBe(set)
			})

			test('throws when Set above maximum', () => {
				const set = new Set([1, 2, 3, 4, 5])
				const validator = maxSize(3)
				expect(() => validator(set)).toThrow('Must have at most size 3')
			})

			test('validates empty Set', () => {
				const set = new Set()
				const validator = maxSize(10)
				expect(validator(set)).toBe(set)
			})
		})

		describe('with Map', () => {
			test('validates Map maximum size', () => {
				const map = new Map([['a', 1]])
				const validator = maxSize(5)
				expect(validator(map)).toBe(map)
			})

			test('throws when Map above maximum', () => {
				const map = new Map([
					['a', 1],
					['b', 2],
					['c', 3],
				])
				const validator = maxSize(2)
				expect(() => validator(map)).toThrow('Must have at most size 2')
			})
		})

		describe('Standard Schema', () => {
			test('has ~standard property', () => {
				const validator = maxSize(5)
				expect(validator['~standard']).toBeDefined()
				expect(validator['~standard']!.version).toBe(1)
			})

			test('validate returns value on success', () => {
				const set = new Set([1, 2])
				const validator = maxSize(5)
				const result = validator['~standard']!.validate(set)
				expect(result.value).toBe(set)
			})

			test('validate returns issues on failure', () => {
				const set = new Set([1, 2, 3, 4, 5, 6])
				const validator = maxSize(3)
				const result = validator['~standard']!.validate(set)
				expect(result.issues![0].message).toBe('Must have at most size 3')
			})
		})

		describe('edge cases', () => {
			test('maxSize 0 only allows empty', () => {
				const validator = maxSize(0)
				expect(validator(new Set())).toEqual(new Set())
				expect(() => validator(new Set([1]))).toThrow()
			})

			test('maxSize with large value', () => {
				const validator = maxSize(1000000)
				const set = new Set([1, 2, 3])
				expect(validator(set)).toBe(set)
			})
		})
	})

	describe('notSize', () => {
		describe('with Blob', () => {
			test('passes when size is different', () => {
				const blob = new Blob(['hello']) // 5 bytes
				const validator = notSize(10)
				expect(validator(blob)).toBe(blob)
			})

			test('throws when size matches', () => {
				const blob = new Blob(['hello']) // 5 bytes
				const validator = notSize(5)
				expect(() => validator(blob)).toThrow('Must not have size 5')
			})

			test('passes with empty Blob when checking non-zero', () => {
				const blob = new Blob([])
				const validator = notSize(5)
				expect(validator(blob)).toBe(blob)
			})

			test('throws with empty Blob when checking zero', () => {
				const blob = new Blob([])
				const validator = notSize(0)
				expect(() => validator(blob)).toThrow('Must not have size 0')
			})

			test('safe version returns success', () => {
				const blob = new Blob(['hello'])
				const validator = notSize(10)
				expect(validator.safe!(blob)).toEqual({ ok: true, value: blob })
			})

			test('safe version returns error', () => {
				const blob = new Blob(['hello'])
				const validator = notSize(5)
				expect(validator.safe!(blob)).toEqual({ ok: false, error: 'Must not have size 5' })
			})
		})

		describe('with Set', () => {
			test('passes when Set size is different', () => {
				const set = new Set([1, 2, 3])
				const validator = notSize(5)
				expect(validator(set)).toBe(set)
			})

			test('throws when Set size matches', () => {
				const set = new Set([1, 2, 3])
				const validator = notSize(3)
				expect(() => validator(set)).toThrow('Must not have size 3')
			})

			test('passes with empty Set when checking non-zero', () => {
				const set = new Set()
				const validator = notSize(5)
				expect(validator(set)).toBe(set)
			})
		})

		describe('with Map', () => {
			test('passes when Map size is different', () => {
				const map = new Map([
					['a', 1],
					['b', 2],
				])
				const validator = notSize(5)
				expect(validator(map)).toBe(map)
			})

			test('throws when Map size matches', () => {
				const map = new Map([
					['a', 1],
					['b', 2],
				])
				const validator = notSize(2)
				expect(() => validator(map)).toThrow('Must not have size 2')
			})
		})

		describe('Standard Schema', () => {
			test('has ~standard property', () => {
				const validator = notSize(5)
				expect(validator['~standard']).toBeDefined()
				expect(validator['~standard']!.version).toBe(1)
			})

			test('validate returns value on success', () => {
				const set = new Set([1, 2, 3])
				const validator = notSize(5)
				const result = validator['~standard']!.validate(set)
				expect(result.value).toBe(set)
			})

			test('validate returns issues on failure', () => {
				const set = new Set([1, 2, 3])
				const validator = notSize(3)
				const result = validator['~standard']!.validate(set)
				expect(result.issues![0].message).toBe('Must not have size 3')
			})
		})

		describe('edge cases', () => {
			test('notSize 0 passes for non-empty collections', () => {
				const validator = notSize(0)
				expect(validator(new Set([1]))).toEqual(new Set([1]))
				expect(validator(new Map([['a', 1]]))).toEqual(new Map([['a', 1]]))
			})

			test('notSize with various forbidden sizes', () => {
				const set = new Set([1, 2, 3])
				expect(notSize(0)(set)).toBe(set)
				expect(notSize(1)(set)).toBe(set)
				expect(notSize(2)(set)).toBe(set)
				expect(() => notSize(3)(set)).toThrow()
				expect(notSize(4)(set)).toBe(set)
				expect(notSize(5)(set)).toBe(set)
			})
		})
	})

	describe('combining size validators', () => {
		test('minSize and maxSize can define a range', () => {
			const set = new Set([1, 2, 3])
			expect(minSize(2)(set)).toBe(set)
			expect(maxSize(5)(set)).toBe(set)
		})

		test('size is stricter than minSize/maxSize', () => {
			const set = new Set([1, 2, 3])
			expect(size(3)(set)).toBe(set)
			// minSize(3) and maxSize(3) together is equivalent to size(3)
			expect(minSize(3)(set)).toBe(set)
			expect(maxSize(3)(set)).toBe(set)
		})

		test('notSize can exclude specific size', () => {
			const set2 = new Set([1, 2])
			const set3 = new Set([1, 2, 3])
			const set4 = new Set([1, 2, 3, 4])

			// Pass all except size 3
			expect(notSize(3)(set2)).toBe(set2)
			expect(() => notSize(3)(set3)).toThrow()
			expect(notSize(3)(set4)).toBe(set4)
		})
	})

	describe('type preservation', () => {
		test('preserves Blob reference', () => {
			const blob = new Blob(['test'])
			expect(size(4)(blob)).toBe(blob)
			expect(minSize(1)(blob)).toBe(blob)
			expect(maxSize(10)(blob)).toBe(blob)
			expect(notSize(5)(blob)).toBe(blob)
		})

		test('preserves Set reference', () => {
			const set = new Set([1, 2, 3])
			expect(size(3)(set)).toBe(set)
			expect(minSize(1)(set)).toBe(set)
			expect(maxSize(10)(set)).toBe(set)
			expect(notSize(5)(set)).toBe(set)
		})

		test('preserves Map reference', () => {
			const map = new Map([['a', 1]])
			expect(size(1)(map)).toBe(map)
			expect(minSize(1)(map)).toBe(map)
			expect(maxSize(10)(map)).toBe(map)
			expect(notSize(5)(map)).toBe(map)
		})
	})

	describe('error messages', () => {
		test('size error message format', () => {
			expect(() => size(10)(new Set([1]))).toThrow('Must have size 10')
		})

		test('minSize error message format', () => {
			expect(() => minSize(10)(new Set([1]))).toThrow('Must have at least size 10')
		})

		test('maxSize error message format', () => {
			expect(() => maxSize(0)(new Set([1]))).toThrow('Must have at most size 0')
		})

		test('notSize error message format', () => {
			expect(() => notSize(1)(new Set([1]))).toThrow('Must not have size 1')
		})
	})
})
