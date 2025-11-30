import { describe, expect, test } from 'bun:test'
import { num, str } from '..'
import { record } from './record'

describe('record', () => {
	const strToNum = record(str(), num())

	test('validates record with valid entries', () => {
		const input = { a: 1, b: 2, c: 3 }
		expect(strToNum(input)).toEqual(input)
	})

	test('validates empty record', () => {
		expect(strToNum({})).toEqual({})
	})

	test('rejects non-object values', () => {
		expect(() => strToNum(null as any)).toThrow('Expected object')
		expect(() => strToNum([] as any)).toThrow('Expected object')
		expect(() => strToNum('string' as any)).toThrow('Expected object')
		expect(() => strToNum(123 as any)).toThrow('Expected object')
	})

	test('validates keys against schema', () => {
		const numKeyRecord = record(num() as any, str())
		// String keys that are valid numbers should work
		const input = { '1': 'a', '2': 'b' }
		expect(() => numKeyRecord(input)).toThrow()
	})

	test('validates values against schema', () => {
		const input = { a: 'not a number' as unknown as number }
		expect(() => strToNum(input)).toThrow('[a]:')
	})

	test('throws non-ValidationError from key validator', () => {
		const throwsPlain = ((_v: unknown) => {
			throw new TypeError('plain key error')
		}) as any
		const schema = record(throwsPlain, str())
		expect(() => schema({ key: 'value' })).toThrow('plain key error')
	})

	test('throws non-ValidationError from value validator', () => {
		const throwsPlain = ((_v: unknown) => {
			throw new TypeError('plain value error')
		}) as any
		const schema = record(str(), throwsPlain)
		expect(() => schema({ key: 'value' })).toThrow('plain value error')
	})

	describe('safe', () => {
		test('returns ok result for valid record', () => {
			const result = strToNum.safe!({ a: 1, b: 2 })
			expect(result).toEqual({ ok: true, value: { a: 1, b: 2 } })
		})

		test('returns error for non-object', () => {
			expect(strToNum.safe!(null as any)).toEqual({ ok: false, error: 'Expected object' })
			expect(strToNum.safe!([] as any)).toEqual({ ok: false, error: 'Expected object' })
		})

		test('returns error for invalid key', () => {
			const numKey = record(
				str((v) => {
					if (!/^\d+$/.test(v)) throw new Error('Must be numeric')
					return v
				}),
				str()
			)
			const result = numKey.safe!({ abc: 'value' })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain('Invalid key')
			}
		})

		test('returns error for invalid value', () => {
			const result = strToNum.safe!({ a: 'not a number' })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain('[a]:')
			}
		})

		test('handles key validator without safe', () => {
			const noSafeKey = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const schema = record(noSafeKey, num())
			expect(schema.safe!({ a: 1 })).toEqual({ ok: true, value: { a: 1 } })
		})

		test('handles value validator without safe', () => {
			const noSafeVal = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const schema = record(str(), noSafeVal)
			expect(schema.safe!({ a: 1 })).toEqual({ ok: true, value: { a: 1 } })
			const result = schema.safe!({ a: 'string' })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain('[a]:')
			}
		})

		test('handles both validators without safe', () => {
			const noSafeKey = ((v: unknown) => v) as any
			const noSafeVal = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const schema = record(noSafeKey, noSafeVal)
			expect(schema.safe!({ a: 1 })).toEqual({ ok: true, value: { a: 1 } })
		})

		test('handles key validator without safe that throws', () => {
			const noSafeKey = ((_v: unknown) => {
				throw new Error('Invalid key')
			}) as any
			const schema = record(noSafeKey, num())
			const result = schema.safe!({ a: 1 })
			expect(result.ok).toBe(false)
		})

		test('handles value validator without safe with key having safe', () => {
			const noSafeVal = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const schema = record(str(), noSafeVal)
			expect(schema.safe!({ a: 1 })).toEqual({ ok: true, value: { a: 1 } })
			const result = schema.safe!({ a: 'string' })
			expect(result.ok).toBe(false)
		})

		test('handles key validator with safe but value without safe', () => {
			const noSafeVal = ((v: unknown) => v) as any
			const schema = record(str(), noSafeVal)
			expect(schema.safe!({ a: 1 })).toEqual({ ok: true, value: { a: 1 } })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			expect(strToNum['~standard']).toBeDefined()
			expect(strToNum['~standard']?.version).toBe(1)
			expect(strToNum['~standard']?.vendor).toBe('vex')
		})

		test('validate returns value on success', () => {
			const result = strToNum['~standard']!.validate({ a: 1, b: 2 })
			expect(result).toEqual({ value: { a: 1, b: 2 } })
		})

		test('validate returns issues for non-object', () => {
			const result = strToNum['~standard']!.validate(null)
			expect(result.issues![0].message).toBe('Expected object')
		})

		test('validate returns issues for invalid key', () => {
			const numKey = record(
				str((v) => {
					if (!/^\d+$/.test(v)) throw new Error('Must be numeric')
					return v
				}),
				str()
			)
			const result = numKey['~standard']!.validate({ abc: 'value' })
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toContain('Invalid key')
		})

		test('validate returns issues with path for invalid value', () => {
			const result = strToNum['~standard']!.validate({ a: 'not a number' })
			expect(result.issues).toBeDefined()
			expect(result.issues![0].path).toEqual(['a'])
		})

		test('handles value validator without ~standard', () => {
			const noStd = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const schema = record(str(), noStd)
			expect(schema['~standard']!.validate({ a: 1 })).toEqual({ value: { a: 1 } })

			const result = schema['~standard']!.validate({ a: 'string' })
			expect(result.issues![0].message).toBe('Must be number')
			expect(result.issues![0].path).toEqual(['a'])
		})

		test('handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const schema = record(str(), throwsNonError)
			const result = schema['~standard']!.validate({ a: 1 })
			expect(result.issues![0].message).toBe('Unknown error')
		})

		test('propagates nested path', () => {
			const innerRecord = record(str(), num())
			const outerRecord = record(str(), innerRecord)
			const result = outerRecord['~standard']!.validate({
				outer: { inner: 'not a number' },
			})
			expect(result.issues![0].path).toEqual(['outer', 'inner'])
		})
	})
})
