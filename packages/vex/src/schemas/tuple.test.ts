// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import type { StandardSchemaV1 } from '../core'
import { bool, num, str } from '../validators/primitives'
import { looseTuple, strictTuple, tuple, tupleWithRest } from './tuple'

describe('Tuple Schema', () => {
	test('tuple validates fixed-length array', () => {
		const validatePoint = tuple(num(), num())
		expect(validatePoint([1, 2])).toEqual([1, 2])
		expect(validatePoint([0, 0])).toEqual([0, 0])
	})

	test('tuple validates different types', () => {
		const validateEntry = tuple(str(), num(), bool())
		expect(validateEntry(['name', 42, true])).toEqual(['name', 42, true])
	})

	test('tuple throws on wrong length', () => {
		const validatePoint = tuple(num(), num())
		expect(() => validatePoint([1])).toThrow('Expected 2 items, got 1')
		expect(() => validatePoint([1, 2, 3])).toThrow('Expected 2 items, got 3')
	})

	test('tuple throws on invalid types', () => {
		const validatePoint = tuple(num(), num())
		expect(() => validatePoint(['1', 2])).toThrow('[0]: Expected number')
		expect(() => validatePoint([1, '2'])).toThrow('[1]: Expected number')
	})

	test('tuple throws on non-array', () => {
		const validatePoint = tuple(num(), num())
		expect(() => validatePoint({})).toThrow('Expected array')
		expect(() => validatePoint(null)).toThrow('Expected array')
	})

	test('tuple throws non-ValidationError', () => {
		const throwsPlain = ((_v: unknown) => {
			throw new TypeError('plain error')
		}) as any
		const schema = tuple(throwsPlain)
		expect(() => schema(['test'])).toThrow('plain error')
	})

	test('tuple safe version', () => {
		const validatePoint = tuple(num(), num())
		expect(validatePoint.safe!([1, 2])).toEqual({ ok: true, value: [1, 2] })
		expect(validatePoint.safe!([1])).toHaveProperty('ok', false)
		expect(validatePoint.safe!([1, 'two'])).toHaveProperty('ok', false)
	})

	test('safe version returns error on non-array', () => {
		const schema = tuple(str())
		expect(schema.safe!('not an array')).toEqual({ ok: false, error: 'Expected array' })
	})

	test('safe version returns error on wrong length', () => {
		const schema = tuple(str(), num())
		expect(schema.safe!(['hello'])).toEqual({ ok: false, error: 'Expected 2 items, got 1' })
	})

	test('safe falls back to try-catch', () => {
		const noSafe = ((v: unknown) => {
			if (typeof v !== 'string') throw new Error('Expected string')
			return v
		}) as any
		const schema = tuple(noSafe)
		expect(schema.safe!([123])).toEqual({ ok: false, error: '[0]: Expected string' })
	})

	test('Standard Schema with path', () => {
		const validateEntry = tuple(str(), num(), bool())

		const error = validateEntry['~standard']!.validate(['name', 'not a number', true])
		expect(error).toHaveProperty('issues')
		const issues = (error as StandardSchemaV1.FailureResult).issues
		expect(issues[0]?.path).toEqual([1])
		expect(issues[0]?.message).toBe('Expected number')
	})

	test('Standard Schema returns issues on non-array', () => {
		const schema = tuple(str())
		const result = schema['~standard']!.validate('not an array')
		expect(result).toEqual({ issues: [{ message: 'Expected array' }] })
	})

	test('Standard Schema returns issues on wrong length', () => {
		const schema = tuple(str(), num())
		const result = schema['~standard']!.validate(['hello'])
		expect(result.issues![0].message).toBe('Expected 2 items, got 1')
	})

	test('Standard Schema nested path', () => {
		const inner = tuple(num())
		const outer = tuple(inner)
		const result = outer['~standard']!.validate([['invalid']])
		expect(result.issues).toBeDefined()
		expect(result.issues![0].path).toEqual([0, 0])
	})

	test('Standard Schema falls back to try-catch', () => {
		const noStd = ((v: unknown) => {
			if (typeof v !== 'string') throw new Error('Expected string')
			return v
		}) as any
		const schema = tuple(noStd)
		const result = schema['~standard']!.validate([123])
		expect(result.issues).toBeDefined()
		expect(result.issues![0].message).toBe('Expected string')
		expect(result.issues![0].path).toEqual([0])
	})
})

describe('strictTuple', () => {
	test('is alias for tuple', () => {
		expect(strictTuple).toBe(tuple)
	})
})

describe('looseTuple', () => {
	test('allows extra elements', () => {
		const schema = looseTuple([str(), num()])
		expect(schema(['hello', 42, 'extra'])).toEqual(['hello', 42])
	})

	test('throws on non-array', () => {
		const schema = looseTuple([str()])
		expect(() => schema('not an array')).toThrow('Expected array')
	})

	test('throws on too few elements', () => {
		const schema = looseTuple([str(), num()])
		expect(() => schema(['hello'])).toThrow('Expected at least 2 items, got 1')
	})

	test('throws on invalid item', () => {
		const schema = looseTuple([str(), num()])
		expect(() => schema(['hello', 'not a number'])).toThrow('[1]: Expected number')
	})

	test('throws non-ValidationError', () => {
		const throwsPlain = ((_v: unknown) => {
			throw new TypeError('plain error')
		}) as any
		const schema = looseTuple([throwsPlain])
		expect(() => schema(['test'])).toThrow('plain error')
	})

	test('safe version returns success', () => {
		const schema = looseTuple([str(), num()])
		expect(schema.safe!(['hello', 42, 'extra'])).toEqual({ ok: true, value: ['hello', 42] })
	})

	test('safe version returns error on non-array', () => {
		const schema = looseTuple([str()])
		expect(schema.safe!('not an array')).toEqual({ ok: false, error: 'Expected array' })
	})

	test('safe version returns error on too few', () => {
		const schema = looseTuple([str(), num()])
		expect(schema.safe!(['hello'])).toEqual({
			ok: false,
			error: 'Expected at least 2 items, got 1',
		})
	})

	test('safe version returns error on invalid item', () => {
		const schema = looseTuple([str(), num()])
		expect(schema.safe!(['hello', 'invalid'])).toEqual({
			ok: false,
			error: '[1]: Expected number',
		})
	})

	test('safe falls back to try-catch', () => {
		const noSafe = ((v: unknown) => {
			if (typeof v !== 'string') throw new Error('Expected string')
			return v
		}) as any
		const schema = looseTuple([noSafe])
		expect(schema.safe!([123])).toEqual({ ok: false, error: '[0]: Expected string' })
	})

	test('Standard Schema support', () => {
		const schema = looseTuple([str()])
		expect(schema['~standard']).toBeDefined()
	})

	test('Standard Schema validate returns issues on non-array', () => {
		const schema = looseTuple([str()])
		const result = schema['~standard']!.validate('not an array')
		expect(result.issues![0].message).toBe('Expected array')
	})

	test('Standard Schema validate returns issues on too few', () => {
		const schema = looseTuple([str(), num()])
		const result = schema['~standard']!.validate(['hello'])
		expect(result.issues![0].message).toContain('Expected at least 2 items')
	})

	test('Standard Schema validate with path', () => {
		const inner = tuple(num())
		const outer = looseTuple([inner])
		const result = outer['~standard']!.validate([['invalid']])
		expect(result.issues![0].path).toEqual([0, 0])
	})

	test('Standard Schema falls back to try-catch', () => {
		const noStd = ((v: unknown) => {
			if (typeof v !== 'string') throw new Error('Expected string')
			return v
		}) as any
		const schema = looseTuple([noStd])
		const result = schema['~standard']!.validate([123])
		expect(result.issues![0].path).toEqual([0])
	})
})

describe('tupleWithRest', () => {
	test('validates fixed and rest items', () => {
		const schema = tupleWithRest([str(), num()], str())
		expect(schema(['hello', 42, 'a', 'b'])).toEqual(['hello', 42, 'a', 'b'])
	})

	test('validates with only fixed items', () => {
		const schema = tupleWithRest([str(), num()], str())
		expect(schema(['hello', 42])).toEqual(['hello', 42])
	})

	test('throws on non-array', () => {
		const schema = tupleWithRest([str()], num())
		expect(() => schema('not an array')).toThrow('Expected array')
	})

	test('throws on too few elements', () => {
		const schema = tupleWithRest([str(), num()], str())
		expect(() => schema(['hello'])).toThrow('Expected at least 2 items, got 1')
	})

	test('throws on invalid fixed item', () => {
		const schema = tupleWithRest([str(), num()], str())
		expect(() => schema(['hello', 'not a number'])).toThrow('[1]: Expected number')
	})

	test('throws on invalid rest item', () => {
		const schema = tupleWithRest([str()], num())
		expect(() => schema(['hello', 'not a number'])).toThrow('[1]: Expected number')
	})

	test('throws non-ValidationError from fixed validator', () => {
		const throwsPlain = ((_v: unknown) => {
			throw new TypeError('plain error')
		}) as any
		const schema = tupleWithRest([throwsPlain], num())
		expect(() => schema(['test'])).toThrow('plain error')
	})

	test('throws non-ValidationError from rest validator', () => {
		const throwsPlain = ((_v: unknown) => {
			throw new TypeError('plain rest error')
		}) as any
		const schema = tupleWithRest([str()], throwsPlain)
		expect(() => schema(['hello', 'extra'])).toThrow('plain rest error')
	})

	test('safe version returns success', () => {
		const schema = tupleWithRest([str(), num()], str())
		expect(schema.safe!(['hello', 42, 'extra'])).toEqual({
			ok: true,
			value: ['hello', 42, 'extra'],
		})
	})

	test('safe version returns error on non-array', () => {
		const schema = tupleWithRest([str()], num())
		expect(schema.safe!('not an array')).toEqual({ ok: false, error: 'Expected array' })
	})

	test('safe version returns error on too few', () => {
		const schema = tupleWithRest([str(), num()], str())
		expect(schema.safe!(['hello'])).toEqual({
			ok: false,
			error: 'Expected at least 2 items, got 1',
		})
	})

	test('safe version returns error on invalid fixed', () => {
		const schema = tupleWithRest([str(), num()], str())
		expect(schema.safe!(['hello', 'invalid'])).toEqual({
			ok: false,
			error: '[1]: Expected number',
		})
	})

	test('safe version returns error on invalid rest', () => {
		const schema = tupleWithRest([str()], num())
		expect(schema.safe!(['hello', 'not a number'])).toEqual({
			ok: false,
			error: '[1]: Expected number',
		})
	})

	test('safe falls back to try-catch for fixed', () => {
		const noSafe = ((v: unknown) => {
			if (typeof v !== 'string') throw new Error('Expected string')
			return v
		}) as any
		const schema = tupleWithRest([noSafe], num())
		expect(schema.safe!([123])).toEqual({ ok: false, error: '[0]: Expected string' })
	})

	test('safe falls back to try-catch for rest', () => {
		const noSafe = ((v: unknown) => {
			if (typeof v !== 'number') throw new Error('Expected number')
			return v
		}) as any
		const schema = tupleWithRest([str()], noSafe)
		expect(schema.safe!(['hello', 'not a number'])).toEqual({
			ok: false,
			error: '[1]: Expected number',
		})
	})

	test('Standard Schema support', () => {
		const schema = tupleWithRest([str()], num())
		expect(schema['~standard']).toBeDefined()
	})

	test('Standard Schema validate returns value', () => {
		const schema = tupleWithRest([str()], num())
		const result = schema['~standard']!.validate(['hello', 42, 100])
		expect(result).toEqual({ value: ['hello', 42, 100] })
	})

	test('Standard Schema validate returns issues on non-array', () => {
		const schema = tupleWithRest([str()], num())
		const result = schema['~standard']!.validate('not an array')
		expect(result.issues![0].message).toBe('Expected array')
	})

	test('Standard Schema validate returns issues on too few', () => {
		const schema = tupleWithRest([str(), num()], str())
		const result = schema['~standard']!.validate(['hello'])
		expect(result.issues![0].message).toContain('Expected at least 2 items')
	})

	test('Standard Schema validate with fixed path', () => {
		const inner = tuple(num())
		const outer = tupleWithRest([inner], str())
		const result = outer['~standard']!.validate([['invalid']])
		expect(result.issues![0].path).toEqual([0, 0])
	})

	test('Standard Schema falls back to try-catch for fixed', () => {
		const noStd = ((v: unknown) => {
			if (typeof v !== 'string') throw new Error('Expected string')
			return v
		}) as any
		const schema = tupleWithRest([noStd], num())
		const result = schema['~standard']!.validate([123])
		expect(result.issues![0].path).toEqual([0])
	})

	test('Standard Schema validate with rest path', () => {
		const inner = tuple(num())
		const outer = tupleWithRest([str()], inner)
		const result = outer['~standard']!.validate(['hello', ['invalid']])
		expect(result.issues![0].path).toEqual([1, 0])
	})

	test('Standard Schema falls back to try-catch for rest', () => {
		const noStd = ((v: unknown) => {
			if (typeof v !== 'number') throw new Error('Expected number')
			return v
		}) as any
		const schema = tupleWithRest([str()], noStd)
		const result = schema['~standard']!.validate(['hello', 'invalid'])
		expect(result.issues![0].path).toEqual([1])
	})
})
