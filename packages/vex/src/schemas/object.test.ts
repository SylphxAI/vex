// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { optional } from '../composition/optional'
import type { StandardSchemaV1 } from '../core'
import { literal } from '../validators/literal'
import { gte, int } from '../validators/number'
import { num, str } from '../validators/primitives'
import { email, nonempty } from '../validators/string'
import {
	extend,
	keyof,
	looseObject,
	merge,
	object,
	objectWithRest,
	omit,
	partial,
	passthrough,
	pick,
	required,
	strict,
	strictObject,
	strip,
	variant,
} from './object'

describe('Object Schema', () => {
	test('object validates shape', () => {
		const validateUser = object({
			name: str(nonempty),
			age: num(int, gte(0)),
			email: str(email),
		})

		const user = validateUser({ name: 'Alice', age: 30, email: 'alice@example.com' })
		expect(user).toEqual({ name: 'Alice', age: 30, email: 'alice@example.com' })
	})

	test('object throws on invalid input', () => {
		const validateUser = object({
			name: str(),
			age: num(),
		})

		expect(() => validateUser(null)).toThrow('Expected object')
		expect(() => validateUser([])).toThrow('Expected object')
		expect(() => validateUser('string')).toThrow('Expected object')
	})

	test('object throws with path', () => {
		const validateUser = object({
			name: str(nonempty),
			age: num(int),
		})

		expect(() => validateUser({ name: '', age: 30 })).toThrow('name: Required')
		expect(() => validateUser({ name: 'Alice', age: '30' })).toThrow('age: Expected number')
	})

	test('object with optional fields', () => {
		const validateUser = object({
			name: str(),
			nickname: optional(str()),
		})

		expect(validateUser({ name: 'Alice' })).toEqual({ name: 'Alice', nickname: undefined })
		expect(validateUser({ name: 'Alice', nickname: 'Ali' })).toEqual({
			name: 'Alice',
			nickname: 'Ali',
		})
	})

	test('object safe version', () => {
		const validateUser = object({ name: str() })
		expect(validateUser.safe!({ name: 'Alice' })).toEqual({ ok: true, value: { name: 'Alice' } })
		expect(validateUser.safe!({ name: 123 })).toHaveProperty('ok', false)
	})

	test('object throws non-ValidationError', () => {
		const throwsPlain = ((_v: unknown) => {
			throw new TypeError('plain error')
		}) as any
		const schema = object({ name: throwsPlain })
		expect(() => schema({ name: 'test' })).toThrow('plain error')
	})

	test('safe version returns error on non-object', () => {
		const schema = object({ name: str() })
		expect(schema.safe!('not an object')).toEqual({ ok: false, error: 'Expected object' })
		expect(schema.safe!(null)).toEqual({ ok: false, error: 'Expected object' })
		expect(schema.safe!([])).toEqual({ ok: false, error: 'Expected object' })
	})

	test('safe falls back to try-catch when no safe method', () => {
		const noSafe = ((v: unknown) => {
			if (typeof v !== 'string') throw new Error('Expected string')
			return v
		}) as any
		const schema = object({ name: noSafe })
		expect(schema.safe!({ name: 123 })).toEqual({ ok: false, error: 'name: Expected string' })
	})

	test('Standard Schema with path', () => {
		const validateUser = object({
			name: str(),
			age: num(),
		})

		const error = validateUser['~standard']!.validate({ name: 'Alice', age: 'not a number' })
		expect(error).toHaveProperty('issues')
		const issues = (error as StandardSchemaV1.FailureResult).issues
		expect(issues[0]?.path).toEqual(['age'])
		expect(issues[0]?.message).toBe('Expected number')
	})

	test('Standard Schema returns issues on non-object', () => {
		const schema = object({ name: str() })
		const result = schema['~standard']!.validate('not an object')
		expect(result).toEqual({ issues: [{ message: 'Expected object' }] })
	})

	test('Standard Schema nested path', () => {
		const inner = object({ value: num() })
		const outer = object({ nested: inner })
		const result = outer['~standard']!.validate({ nested: { value: 'invalid' } })
		expect(result.issues).toBeDefined()
		expect(result.issues![0].path).toEqual(['nested', 'value'])
	})

	test('Standard Schema falls back to try-catch', () => {
		const noStd = ((v: unknown) => {
			if (typeof v !== 'string') throw new Error('Expected string')
			return v
		}) as any
		const schema = object({ name: noStd })
		const result = schema['~standard']!.validate({ name: 123 })
		expect(result.issues).toBeDefined()
		expect(result.issues![0].message).toBe('Expected string')
		expect(result.issues![0].path).toEqual(['name'])
	})
})

describe('Object Utilities', () => {
	test('partial makes properties optional', () => {
		const validateUser = object({ name: str(), age: num() })
		const validatePartialUser = partial(validateUser)

		expect(validatePartialUser({})).toEqual({})
		expect(validatePartialUser({ name: 'Alice' })).toEqual({ name: 'Alice' })
	})

	test('partial throws on non-object', () => {
		const schema = partial(object({ name: str() }))
		expect(() => schema('not an object')).toThrow('Expected object')
	})

	test('partial safe version returns success', () => {
		const schema = partial(object({ name: str() }))
		expect(schema.safe!({})).toEqual({ ok: true, value: {} })
	})

	test('partial safe version returns error on non-object', () => {
		const schema = partial(object({ name: str() }))
		expect(schema.safe!('not an object')).toEqual({ ok: false, error: 'Expected object' })
	})

	test('passthrough allows extra properties', () => {
		const validateUser = object({ name: str() })
		const validateLooseUser = passthrough(validateUser)

		expect(validateLooseUser({ name: 'Alice', extra: 'data' })).toEqual({
			name: 'Alice',
			extra: 'data',
		})
	})

	test('passthrough throws on non-object', () => {
		const schema = passthrough(object({ name: str() }))
		expect(() => schema('not an object')).toThrow('Expected object')
	})

	test('passthrough safe version returns success', () => {
		const schema = passthrough(object({ name: str() }))
		expect(schema.safe!({ name: 'John', extra: 123 })).toEqual({
			ok: true,
			value: { name: 'John', extra: 123 },
		})
	})

	test('passthrough safe version returns error on non-object', () => {
		const schema = passthrough(object({ name: str() }))
		expect(schema.safe!('not an object')).toEqual({ ok: false, error: 'Expected object' })
	})

	test('passthrough safe version returns error on invalid property', () => {
		const schema = passthrough(object({ name: str() }))
		expect(schema.safe!({ name: 123 })).toHaveProperty('ok', false)
	})

	test('passthrough safe falls back to try-catch', () => {
		const noSafe = ((v: unknown) => {
			if (typeof v !== 'object') throw new Error('fail')
			return v
		}) as any
		noSafe.safe = undefined
		const schema = passthrough(noSafe)
		expect(schema.safe!({ a: 1 })).toEqual({ ok: true, value: { a: 1 } })
	})

	test('passthrough safe try-catch catches errors', () => {
		const throwsAlways = ((_v: unknown) => {
			throw new Error('always fails')
		}) as any
		const schema = passthrough(throwsAlways)
		expect(schema.safe!({ a: 1 })).toEqual({ ok: false, error: 'always fails' })
	})

	test('strict is same as base validator', () => {
		const validateUser = object({ name: str() })
		const validateStrictUser = strict(validateUser)

		expect(validateStrictUser({ name: 'Alice' })).toEqual({ name: 'Alice' })
	})

	test('strict is alias for strip', () => {
		expect(strict).toBe(strip)
	})

	describe('pick', () => {
		test('picks specified properties', () => {
			const shape = { name: str(), age: num(), email: str() }
			const picked = pick(shape, ['name', 'age'])
			expect(Object.keys(picked)).toEqual(['name', 'age'])
		})

		test('ignores non-existent keys', () => {
			const shape = { name: str() } as Record<string, any>
			const picked = pick(shape, ['name', 'nonexistent'] as any)
			expect(Object.keys(picked)).toEqual(['name'])
		})
	})

	describe('omit', () => {
		test('omits specified properties', () => {
			const shape = { name: str(), age: num(), email: str() }
			const omitted = omit(shape, ['email'])
			expect(Object.keys(omitted)).toEqual(['name', 'age'])
		})
	})

	describe('extend / merge', () => {
		test('extends shape with additional properties', () => {
			const base = { name: str() }
			const extended = extend(base, { age: num() })
			expect(Object.keys(extended)).toEqual(['name', 'age'])
		})

		test('merge is alias for extend', () => {
			expect(merge).toBe(extend)
		})
	})

	describe('required', () => {
		const optionalStr = ((v: unknown) => v) as any
		optionalStr.safe = (v: unknown) => ({ ok: true, value: v })

		test('throws on undefined property', () => {
			const schema = required(object({ name: optionalStr }))
			expect(() => schema({ name: undefined })).toThrow('name: Required')
		})

		test('passes when all defined', () => {
			const schema = required(object({ name: optionalStr }))
			expect(schema({ name: 'John' })).toEqual({ name: 'John' })
		})

		test('throws on non-object', () => {
			const schema = required(object({ name: optionalStr }))
			expect(() => schema('not an object')).toThrow('Expected object')
		})

		test('safe version returns error on undefined', () => {
			const schema = required(object({ name: optionalStr }))
			expect(schema.safe!({ name: undefined })).toEqual({ ok: false, error: 'name: Required' })
		})

		test('safe version returns success when all defined (with inner safe)', () => {
			const schema = required(object({ name: optionalStr }))
			expect(schema.safe!({ name: 'John' })).toEqual({ ok: true, value: { name: 'John' } })
		})

		test('safe version returns error on non-object', () => {
			const schema = required(object({ name: optionalStr }))
			expect(schema.safe!('not an object')).toEqual({ ok: false, error: 'Expected object' })
		})

		test('safe passes through underlying error', () => {
			const failing = (() => {
				throw new Error('fail')
			}) as any
			failing.safe = () => ({ ok: false, error: 'inner error' })
			const schema = required(failing)
			expect(schema.safe!({ name: 'test' })).toEqual({ ok: false, error: 'inner error' })
		})

		test('safe falls back to try-catch', () => {
			const noSafe = ((v: unknown) => v) as any
			const schema = required(noSafe)
			expect(schema.safe!({ name: 'John' })).toEqual({ ok: true, value: { name: 'John' } })
		})

		test('safe try-catch catches errors', () => {
			const throwsAlways = (() => {
				throw new Error('always fails')
			}) as any
			const schema = required(throwsAlways)
			expect(schema.safe!({ name: 'test' })).toEqual({ ok: false, error: 'always fails' })
		})

		test('safe try-catch detects undefined', () => {
			const returnsUndefined = ((v: unknown) => ({ ...(v as object), name: undefined })) as any
			const schema = required(returnsUndefined)
			expect(schema.safe!({ name: 'test' })).toEqual({ ok: false, error: 'name: Required' })
		})
	})

	describe('keyof', () => {
		test('validates valid key', () => {
			const shape = { name: str(), age: num() }
			const schema = keyof(shape)
			expect(schema('name')).toBe('name')
			expect(schema('age')).toBe('age')
		})

		test('throws on invalid key', () => {
			const shape = { name: str(), age: num() }
			const schema = keyof(shape)
			expect(() => schema('invalid')).toThrow('Expected one of: name, age')
		})

		test('throws on non-string', () => {
			const shape = { name: str() }
			const schema = keyof(shape)
			expect(() => schema(123)).toThrow('Expected one of: name')
		})

		test('safe version returns success', () => {
			const shape = { name: str() }
			const schema = keyof(shape)
			expect(schema.safe!('name')).toEqual({ ok: true, value: 'name' })
		})

		test('safe version returns error', () => {
			const shape = { name: str() }
			const schema = keyof(shape)
			expect(schema.safe!('invalid')).toEqual({ ok: false, error: 'Expected one of: name' })
		})
	})

	describe('strictObject', () => {
		test('is alias for object', () => {
			expect(strictObject).toBe(object)
		})
	})

	describe('looseObject', () => {
		test('preserves extra properties', () => {
			const schema = looseObject({ name: str() })
			expect(schema({ name: 'John', extra: 123 })).toEqual({ name: 'John', extra: 123 })
		})

		test('validates known properties', () => {
			const schema = looseObject({ name: str(), age: num() })
			expect(() => schema({ name: 123, age: 30 })).toThrow('name: Expected string')
		})

		test('throws on non-object', () => {
			const schema = looseObject({ name: str() })
			expect(() => schema('not an object')).toThrow('Expected object')
		})

		test('throws non-ValidationError from validator', () => {
			const throwsPlain = ((_v: unknown) => {
				throw new TypeError('plain error')
			}) as any
			const schema = looseObject({ name: throwsPlain })
			expect(() => schema({ name: 'test' })).toThrow('plain error')
		})

		test('safe version returns success', () => {
			const schema = looseObject({ name: str() })
			expect(schema.safe!({ name: 'John', extra: 123 })).toEqual({
				ok: true,
				value: { name: 'John', extra: 123 },
			})
		})

		test('safe version returns error on non-object', () => {
			const schema = looseObject({ name: str() })
			expect(schema.safe!('not an object')).toEqual({ ok: false, error: 'Expected object' })
		})

		test('safe version returns error on invalid property', () => {
			const schema = looseObject({ name: str() })
			expect(schema.safe!({ name: 123 })).toEqual({ ok: false, error: 'name: Expected string' })
		})

		test('safe falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			const schema = looseObject({ name: noSafe })
			expect(schema.safe!({ name: 123 })).toEqual({ ok: false, error: 'name: Expected string' })
		})
	})

	describe('objectWithRest', () => {
		test('validates known and rest properties', () => {
			const schema = objectWithRest({ name: str() }, num())
			expect(schema({ name: 'John', count: 42, value: 100 })).toEqual({
				name: 'John',
				count: 42,
				value: 100,
			})
		})

		test('throws on invalid known property', () => {
			const schema = objectWithRest({ name: str() }, num())
			expect(() => schema({ name: 123 })).toThrow('name: Expected string')
		})

		test('throws on invalid rest property', () => {
			const schema = objectWithRest({ name: str() }, num())
			expect(() => schema({ name: 'John', extra: 'not a number' })).toThrow('extra: Expected number')
		})

		test('throws on non-object', () => {
			const schema = objectWithRest({ name: str() }, num())
			expect(() => schema('not an object')).toThrow('Expected object')
		})

		test('throws non-ValidationError from validator', () => {
			const throwsPlain = ((_v: unknown) => {
				throw new TypeError('plain error')
			}) as any
			const schema = objectWithRest({ name: throwsPlain }, num())
			expect(() => schema({ name: 'test' })).toThrow('plain error')
		})

		test('throws non-ValidationError from rest validator', () => {
			const throwsPlain = ((_v: unknown) => {
				throw new TypeError('plain rest error')
			}) as any
			const schema = objectWithRest({ name: str() }, throwsPlain)
			expect(() => schema({ name: 'test', extra: 1 })).toThrow('plain rest error')
		})

		test('safe version returns success', () => {
			const schema = objectWithRest({ name: str() }, num())
			expect(schema.safe!({ name: 'John', count: 42 })).toEqual({
				ok: true,
				value: { name: 'John', count: 42 },
			})
		})

		test('safe version returns error on non-object', () => {
			const schema = objectWithRest({ name: str() }, num())
			expect(schema.safe!('not an object')).toEqual({ ok: false, error: 'Expected object' })
		})

		test('safe version returns error on invalid known', () => {
			const schema = objectWithRest({ name: str() }, num())
			expect(schema.safe!({ name: 123 })).toEqual({ ok: false, error: 'name: Expected string' })
		})

		test('safe version returns error on invalid rest', () => {
			const schema = objectWithRest({ name: str() }, num())
			expect(schema.safe!({ name: 'John', extra: 'invalid' })).toEqual({
				ok: false,
				error: 'extra: Expected number',
			})
		})

		test('safe falls back to try-catch for known', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			const schema = objectWithRest({ name: noSafe }, num())
			expect(schema.safe!({ name: 123 })).toEqual({ ok: false, error: 'name: Expected string' })
		})

		test('safe falls back to try-catch for rest', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Expected number')
				return v
			}) as any
			const schema = objectWithRest({ name: str() }, noSafe)
			expect(schema.safe!({ name: 'John', extra: 'invalid' })).toEqual({
				ok: false,
				error: 'extra: Expected number',
			})
		})
	})

	describe('variant', () => {
		test('matches first matching variant', () => {
			const schema = variant('type', [
				object({ type: literal('a'), value: num() }),
				object({ type: literal('b'), name: str() }),
			])
			expect(schema({ type: 'a', value: 42 })).toEqual({ type: 'a', value: 42 })
			expect(schema({ type: 'b', name: 'John' })).toEqual({ type: 'b', name: 'John' })
		})

		test('throws on no match', () => {
			const schema = variant('type', [object({ type: literal('a'), value: num() })])
			expect(() => schema({ type: 'b' })).toThrow('No matching variant for type="b"')
		})

		test('throws on non-object', () => {
			const schema = variant('type', [object({ type: literal('a') })])
			expect(() => schema('not an object')).toThrow('Expected object')
		})

		test('safe version returns success', () => {
			const schema = variant('type', [object({ type: literal('a'), value: num() })])
			expect(schema.safe!({ type: 'a', value: 42 })).toEqual({
				ok: true,
				value: { type: 'a', value: 42 },
			})
		})

		test('safe version returns error on non-object', () => {
			const schema = variant('type', [object({ type: literal('a') })])
			expect(schema.safe!('not an object')).toEqual({ ok: false, error: 'Expected object' })
		})

		test('safe version returns error on no match', () => {
			const schema = variant('type', [object({ type: literal('a') })])
			expect(schema.safe!({ type: 'b' })).toEqual({
				ok: false,
				error: 'No matching variant for type="b"',
			})
		})

		test('safe tries without safe method', () => {
			const noSafe = ((v: unknown) => {
				const obj = v as { type: string }
				if (obj.type !== 'a') throw new Error('no match')
				return v
			}) as any
			const schema = variant('type', [noSafe])
			expect(schema.safe!({ type: 'a' })).toEqual({ ok: true, value: { type: 'a' } })
		})

		test('throwing tries without safe method', () => {
			const noSafe = ((v: unknown) => {
				const obj = v as { type: string }
				if (obj.type !== 'a') throw new Error('no match')
				return v
			}) as any
			const schema = variant('type', [noSafe])
			expect(schema({ type: 'a' })).toEqual({ type: 'a' })
		})

		test('Standard Schema support', () => {
			const schema = variant('type', [
				object({ type: literal('a'), value: num() }),
				object({ type: literal('b'), name: str() }),
			])
			expect(schema['~standard']).toBeDefined()
			expect(schema['~standard']!.validate({ type: 'a', value: 42 })).toEqual({
				value: { type: 'a', value: 42 },
			})
		})

		test('Standard Schema returns issues on no match', () => {
			const schema = variant('type', [object({ type: literal('a') })])
			const result = schema['~standard']!.validate({ type: 'z' })
			expect(result.issues![0].message).toBe('No matching variant for type="z"')
		})
	})
})

describe('Object Schema edge cases', () => {
	describe('nested objects', () => {
		test('validates deeply nested objects', () => {
			const inner = object({ value: num() })
			const middle = object({ inner })
			const outer = object({ middle })
			expect(outer({ middle: { inner: { value: 42 } } })).toEqual({
				middle: { inner: { value: 42 } },
			})
		})

		test('throws with full path for deeply nested errors', () => {
			const inner = object({ value: num() })
			const middle = object({ inner })
			const outer = object({ middle })
			expect(() => outer({ middle: { inner: { value: 'invalid' } } })).toThrow('middle: inner: value: Expected number')
		})

		test('safe returns deeply nested path', () => {
			const inner = object({ value: num() })
			const outer = object({ nested: inner })
			const result = outer.safe!({ nested: { value: 'invalid' } })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain('nested')
			}
		})
	})

	describe('empty objects', () => {
		test('validates empty object', () => {
			const schema = object({})
			expect(schema({})).toEqual({})
		})

		test('strips extra properties from empty schema', () => {
			const schema = object({})
			expect(schema({ extra: 'ignored' })).toEqual({})
		})
	})

	describe('arrays as object values', () => {
		const { array } = require('./array')

		test('validates object with array property', () => {
			const schema = object({ items: array(num()) })
			expect(schema({ items: [1, 2, 3] })).toEqual({ items: [1, 2, 3] })
		})

		test('throws for invalid array item', () => {
			const schema = object({ items: array(num()) })
			expect(() => schema({ items: [1, 'two', 3] })).toThrow('items: [1]: Expected number')
		})
	})

	describe('object with all optional fields', () => {
		test('allows empty object', () => {
			const schema = object({
				name: optional(str()),
				age: optional(num()),
			})
			expect(schema({})).toEqual({ name: undefined, age: undefined })
		})

		test('allows partial data', () => {
			const schema = object({
				name: optional(str()),
				age: optional(num()),
			})
			expect(schema({ name: 'John' })).toEqual({ name: 'John', age: undefined })
		})
	})

	describe('object shape immutability', () => {
		test('modifications to shape do not affect validator', () => {
			const shape = { name: str() }
			const schema = object(shape)
			;(shape as any).extra = num()
			expect(schema({ name: 'John' })).toEqual({ name: 'John' })
		})
	})
})
