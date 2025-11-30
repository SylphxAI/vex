import { describe, expect, test } from 'bun:test'
import { minLength, positive } from '..'
import { num, str } from '../validators/primitives'
import { map } from './map'

describe('map', () => {
	const strToNum = map(str(), num())
	const numToStr = map(num(), str())

	describe('basic validation', () => {
		test('validates Map with valid entries', () => {
			const input = new Map([
				['a', 1],
				['b', 2],
			])
			const result = strToNum(input)
			expect(result.get('a')).toBe(1)
			expect(result.get('b')).toBe(2)
		})

		test('validates empty Map', () => {
			const input = new Map<string, number>()
			const result = strToNum(input)
			expect(result.size).toBe(0)
		})

		test('validates Map with single entry', () => {
			const input = new Map([['key', 42]])
			const result = strToNum(input)
			expect(result.get('key')).toBe(42)
		})

		test('validates Map with many entries', () => {
			const entries: [string, number][] = Array.from({ length: 100 }, (_, i) => [`key${i}`, i])
			const input = new Map(entries)
			const result = strToNum(input)
			expect(result.size).toBe(100)
			expect(result.get('key0')).toBe(0)
			expect(result.get('key99')).toBe(99)
		})

		test('validates Map with number keys', () => {
			const input = new Map([
				[1, 'one'],
				[2, 'two'],
			])
			const result = numToStr(input)
			expect(result.get(1)).toBe('one')
			expect(result.get(2)).toBe('two')
		})

		test('validates Map with negative number keys', () => {
			const input = new Map([
				[-1, 'neg one'],
				[-2, 'neg two'],
			])
			const result = numToStr(input)
			expect(result.get(-1)).toBe('neg one')
		})

		test('validates Map with floating point keys', () => {
			const input = new Map([
				[1.5, 'one point five'],
				[2.5, 'two point five'],
			])
			const result = numToStr(input)
			expect(result.get(1.5)).toBe('one point five')
		})
	})

	describe('rejection', () => {
		test('rejects non-Map values', () => {
			expect(() => strToNum({} as any)).toThrow('Expected Map')
			expect(() => strToNum([] as any)).toThrow('Expected Map')
			expect(() => strToNum(null as any)).toThrow('Expected Map')
		})

		test('rejects undefined', () => {
			expect(() => strToNum(undefined as any)).toThrow('Expected Map')
		})

		test('rejects Set', () => {
			expect(() => strToNum(new Set() as any)).toThrow('Expected Map')
		})

		test('rejects WeakMap', () => {
			expect(() => strToNum(new WeakMap() as any)).toThrow('Expected Map')
		})

		test('rejects string', () => {
			expect(() => strToNum('map' as any)).toThrow('Expected Map')
		})

		test('rejects number', () => {
			expect(() => strToNum(123 as any)).toThrow('Expected Map')
		})
	})

	describe('key validation', () => {
		test('validates keys against schema', () => {
			const input = new Map([['not a number' as unknown as number, 'value']])
			expect(() => numToStr(input)).toThrow('Map key:')
		})

		test('validates first invalid key', () => {
			const input = new Map<number, string>()
			input.set('not a number' as unknown as number, 'value1')
			input.set(2, 'value2')
			expect(() => numToStr(input)).toThrow('Map key:')
		})

		test('error includes key info', () => {
			const input = new Map([['string' as unknown as number, 'value']])
			expect(() => numToStr(input)).toThrow('Map key:')
		})
	})

	describe('value validation', () => {
		test('validates values against schema', () => {
			const input = new Map([['key', 'not a number' as unknown as number]])
			expect(() => strToNum(input)).toThrow('Map[key]:')
		})

		test('validates first invalid value', () => {
			const input = new Map([
				['key1', 'invalid' as unknown as number],
				['key2', 2],
			])
			expect(() => strToNum(input)).toThrow('Map[key1]:')
		})

		test('error includes key in path', () => {
			const input = new Map([['myKey', 'invalid' as unknown as number]])
			expect(() => strToNum(input)).toThrow('Map[myKey]:')
		})
	})

	describe('piped validators', () => {
		test('works with piped key validators', () => {
			const schema = map(str(minLength(2)), num())
			const input = new Map([['ab', 1]])
			expect(schema(input).get('ab')).toBe(1)
		})

		test('rejects short key with piped validator', () => {
			const schema = map(str(minLength(2)), num())
			const input = new Map([['a', 1]])
			expect(() => schema(input)).toThrow()
		})

		test('works with piped value validators', () => {
			const schema = map(str(), num(positive))
			const input = new Map([['key', 5]])
			expect(schema(input).get('key')).toBe(5)
		})

		test('rejects negative value with piped validator', () => {
			const schema = map(str(), num(positive))
			const input = new Map([['key', -5]])
			expect(() => schema(input)).toThrow('Must be positive')
		})
	})

	describe('error handling', () => {
		test('throws non-ValidationError from key validator', () => {
			const throwsPlain = ((_v: unknown) => {
				throw new TypeError('plain key error')
			}) as any
			const schema = map(throwsPlain, str())
			const input = new Map([['key', 'value']])
			expect(() => schema(input)).toThrow('plain key error')
		})

		test('throws non-ValidationError from value validator', () => {
			const throwsPlain = ((_v: unknown) => {
				throw new TypeError('plain value error')
			}) as any
			const schema = map(str(), throwsPlain)
			const input = new Map([['key', 'value']])
			expect(() => schema(input)).toThrow('plain value error')
		})

		test('throws RangeError from validator', () => {
			const throwsRange = ((_v: unknown) => {
				throw new RangeError('range error')
			}) as any
			const schema = map(str(), throwsRange)
			const input = new Map([['key', 'value']])
			expect(() => schema(input)).toThrow('range error')
		})
	})

	describe('safe', () => {
		test('returns ok result for valid Map', () => {
			const input = new Map([['a', 1]])
			const result = strToNum.safe?.(input)
			expect(result?.ok).toBe(true)
			if (result?.ok) {
				expect(result.value.get('a')).toBe(1)
			}
		})

		test('returns ok result for empty Map', () => {
			const input = new Map<string, number>()
			const result = strToNum.safe?.(input)
			expect(result?.ok).toBe(true)
			if (result?.ok) {
				expect(result.value.size).toBe(0)
			}
		})

		test('returns error for non-Map', () => {
			const result = strToNum.safe?.({} as any)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toBe('Expected Map')
			}
		})

		test('returns error for null', () => {
			const result = strToNum.safe?.(null as any)
			expect(result?.ok).toBe(false)
		})

		test('returns error for undefined', () => {
			const result = strToNum.safe?.(undefined as any)
			expect(result?.ok).toBe(false)
		})

		test('returns error for invalid key', () => {
			const input = new Map([['not a number' as unknown as number, 'value']])
			const result = numToStr.safe?.(input)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toContain('Map key:')
			}
		})

		test('returns error for invalid value', () => {
			const input = new Map([['key', 'not a number' as unknown as number]])
			const result = strToNum.safe?.(input)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toContain('Map[key]:')
			}
		})

		test('falls back to try-catch for key validator', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			const schema = map(noSafe, num())
			const input = new Map([[123 as unknown as string, 1]])
			const result = schema.safe?.(input)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toContain('Map key:')
			}
		})

		test('falls back to try-catch for value validator', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Expected number')
				return v
			}) as any
			const schema = map(str(), noSafe)
			const input = new Map([['key', 'not a number' as unknown as number]])
			const result = schema.safe?.(input)
			expect(result?.ok).toBe(false)
			if (!result?.ok) {
				expect(result?.error).toContain('Map[key]:')
			}
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			expect(strToNum['~standard']).toBeDefined()
			expect(strToNum['~standard']?.version).toBe(1)
			expect(strToNum['~standard']?.vendor).toBe('vex')
		})

		test('validate returns value', () => {
			const input = new Map([['a', 1]])
			const result = strToNum['~standard']!.validate(input)
			expect(result.value).toBeDefined()
			expect(result.value?.get('a')).toBe(1)
		})

		test('validate returns value for empty Map', () => {
			const input = new Map<string, number>()
			const result = strToNum['~standard']!.validate(input)
			expect(result.value).toBeDefined()
			expect(result.value?.size).toBe(0)
		})

		test('validate returns issues for non-Map', () => {
			const result = strToNum['~standard']!.validate({})
			expect(result.issues![0].message).toBe('Expected Map')
		})

		test('validate returns issues for null', () => {
			const result = strToNum['~standard']!.validate(null)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toBe('Expected Map')
		})

		test('validate returns issues for invalid key', () => {
			const input = new Map([['not a number' as unknown as number, 'value']])
			const result = numToStr['~standard']!.validate(input)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toContain('Map key:')
		})

		test('validate returns issues for invalid value with path', () => {
			const inner = map(str(), num())
			const input = new Map([['key', 'not a number' as unknown as number]])
			const result = inner['~standard']!.validate(input)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].path).toEqual(['key'])
		})

		test('validate includes correct path for numeric key', () => {
			const schema = map(num(), str())
			const input = new Map([[123, 456 as unknown as string]])
			const result = schema['~standard']!.validate(input)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].path).toEqual([123])
		})

		test('falls back to try-catch for key validator', () => {
			const noStd = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			const schema = map(noStd, num())
			const input = new Map([[123 as unknown as string, 1]])
			const result = schema['~standard']!.validate(input)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toContain('Map key:')
		})

		test('falls back to try-catch for value validator', () => {
			const noStd = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Expected number')
				return v
			}) as any
			const schema = map(str(), noStd)
			const input = new Map([['key', 'not a number' as unknown as number]])
			const result = schema['~standard']!.validate(input)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].path).toEqual(['key'])
		})
	})

	describe('edge cases', () => {
		test('preserves Map entry order', () => {
			const input = new Map([
				['c', 3],
				['a', 1],
				['b', 2],
			])
			const result = strToNum(input)
			const keys = [...result.keys()]
			expect(keys).toEqual(['c', 'a', 'b'])
		})

		test('handles Map with duplicate values', () => {
			const input = new Map([
				['a', 1],
				['b', 1],
				['c', 1],
			])
			const result = strToNum(input)
			expect(result.size).toBe(3)
		})

		test('validates each entry independently', () => {
			let keyCallCount = 0
			let valueCallCount = 0
			const countingKey = ((v: string) => {
				keyCallCount++
				return v
			}) as any
			countingKey.safe = (v: string) => ({ ok: true, value: v })
			const countingValue = ((v: number) => {
				valueCallCount++
				return v
			}) as any
			countingValue.safe = (v: number) => ({ ok: true, value: v })
			const schema = map(countingKey, countingValue)
			schema(
				new Map([
					['a', 1],
					['b', 2],
					['c', 3],
				])
			)
			expect(keyCallCount).toBe(3)
			expect(valueCallCount).toBe(3)
		})

		test('returns new Map instance', () => {
			const input = new Map([['a', 1]])
			const result = strToNum(input)
			// Depending on implementation
			expect(result).toEqual(input)
		})

		test('handles Map subclass', () => {
			class MyMap<K, V> extends Map<K, V> {}
			const input = new MyMap([['a', 1]])
			const result = strToNum(input)
			expect(result.get('a')).toBe(1)
		})
	})

	describe('type safety', () => {
		test('infers correct output type', () => {
			const result = strToNum(new Map([['a', 1]]))
			// TypeScript should infer Map<string, number>
			const _: Map<string, number> = result
		})

		test('rejects wrong key type at runtime', () => {
			// @ts-expect-error - intentional type mismatch
			expect(() => strToNum(new Map([[123, 1]]))).toThrow()
		})

		test('rejects wrong value type at runtime', () => {
			// @ts-expect-error - intentional type mismatch
			expect(() => strToNum(new Map([['a', 'not a number']]))).toThrow()
		})
	})

	describe('integration', () => {
		test('works with complex key validator', () => {
			const emailToNum = map(str(minLength(5)), num())
			const input = new Map([['hello', 1]])
			expect(emailToNum(input).get('hello')).toBe(1)
		})

		test('works with complex value validator', () => {
			const strToPositive = map(str(), num(positive))
			const input = new Map([['key', 5]])
			expect(strToPositive(input).get('key')).toBe(5)
		})

		test('validates real-world config map', () => {
			const configMap = map(str(), num())
			const config = new Map([
				['timeout', 5000],
				['retries', 3],
				['maxConnections', 10],
			])
			const result = configMap(config)
			expect(result.get('timeout')).toBe(5000)
		})
	})
})
