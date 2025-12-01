// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { literal, num, object, str } from '..'
import { intersect } from './intersect'
import { description } from './metadata'

describe('intersect', () => {
	const schema1 = object({ name: str() })
	const schema2 = object({ age: num() })
	const combined = intersect(schema1, schema2)

	test('throws when called with no schemas', () => {
		expect(() => (intersect as any)()).toThrow('intersect() requires at least one schema')
	})

	test('accepts MetaActions', () => {
		const withMeta = intersect(schema1, schema2, description('Combined schema'))
		expect(withMeta({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
	})

	test('validates value against all schemas', () => {
		const input = { name: 'John', age: 30 }
		const result = combined(input)
		expect(result.name).toBe('John')
		expect(result.age).toBe(30)
	})

	test('fails if value does not match first schema', () => {
		const input = { age: 30 }
		expect(() => combined(input)).toThrow()
	})

	test('fails if value does not match second schema', () => {
		const input = { name: 'John' }
		expect(() => combined(input)).toThrow()
	})

	test('merges object results', () => {
		const withRole = object({ role: literal('admin') })
		const merged = intersect(schema1, withRole)
		const result = merged({ name: 'Admin', role: 'admin' })
		expect(result.name).toBe('Admin')
		expect(result.role).toBe('admin')
	})

	test('handles non-object result', () => {
		const always42 = ((_v: unknown) => 42) as any
		const schema = intersect(always42, always42)
		expect(schema('anything')).toBe(42)
	})

	test('handles mixed object and non-object', () => {
		const objSchema = object({ name: str() })
		const passthrough = ((v: unknown) => v) as any
		const schema = intersect(objSchema, passthrough)
		expect(schema({ name: 'John' })).toEqual({ name: 'John' })
	})

	describe('safe', () => {
		test('returns ok result for valid value', () => {
			const result = combined.safe?.({ name: 'John', age: 30 })
			expect(result?.ok).toBe(true)
		})

		test('returns error for invalid value', () => {
			const result = combined.safe?.({ name: 'John' })
			expect(result?.ok).toBe(false)
		})

		test('returns error on first schema failure', () => {
			const result = combined.safe?.({ name: 123, age: 30 })
			expect(result?.ok).toBe(false)
		})

		test('returns error on second schema failure', () => {
			const result = combined.safe?.({ name: 'John', age: 'invalid' })
			expect(result?.ok).toBe(false)
		})

		test('handles non-object result', () => {
			const withSafe = ((_v: unknown) => 42) as any
			withSafe.safe = (_v: unknown) => ({ ok: true, value: 42 })
			const schema = intersect(withSafe, withSafe)
			expect(schema.safe!('anything')).toEqual({ ok: true, value: 42 })
		})

		test('falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'object') throw new Error('Expected object')
				return v
			}) as any
			const schema = intersect(noSafe, noSafe)
			expect(schema.safe!('not an object')).toEqual({ ok: false, error: 'Expected object' })
		})

		test('try-catch handles success', () => {
			const noSafe = ((v: unknown) => v) as any
			const schema = intersect(noSafe, noSafe)
			expect(schema.safe!({ a: 1 })).toEqual({ ok: true, value: { a: 1 } })
		})

		test('try-catch handles non-object result', () => {
			const noSafe = ((_v: unknown) => 42) as any
			const schema = intersect(noSafe)
			expect(schema.safe!('anything')).toEqual({ ok: true, value: 42 })
		})

		test('try-catch with two non-object schemas', () => {
			const noSafe1 = ((_v: unknown) => 'first') as any
			const noSafe2 = ((_v: unknown) => 'second') as any
			const schema = intersect(noSafe1, noSafe2)
			expect(schema.safe!('input')).toEqual({ ok: true, value: 'second' })
		})

		test('merges objects in safe mode', () => {
			const result = combined.safe!({ name: 'John', age: 30 })
			expect(result).toEqual({ ok: true, value: { name: 'John', age: 30 } })
		})

		test('merges with non-object safe result', () => {
			const withSafe = ((_v: unknown) => 'result') as any
			withSafe.safe = (_v: unknown) => ({ ok: true, value: 'result' })
			const schema = intersect(withSafe)
			expect(schema.safe!('anything')).toEqual({ ok: true, value: 'result' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			expect(combined['~standard']).toBeDefined()
			expect(combined['~standard']?.version).toBe(1)
			expect(combined['~standard']?.vendor).toBe('vex')
		})

		test('validate returns value', () => {
			const result = combined['~standard']!.validate({ name: 'John', age: 30 })
			expect(result).toEqual({ value: { name: 'John', age: 30 } })
		})

		test('validate returns issues', () => {
			const result = combined['~standard']!.validate({ name: 123 })
			expect(result.issues).toBeDefined()
		})

		test('uses safe method as fallback', () => {
			const withSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			withSafe.safe = (v: unknown) => {
				if (typeof v !== 'string') return { ok: false, error: 'Expected string' }
				return { ok: true, value: v }
			}
			const schema = intersect(withSafe)
			const result = schema['~standard']!.validate(123)
			expect(result.issues![0].message).toBe('Expected string')
		})

		test('safe fallback success', () => {
			const withSafe = ((v: unknown) => v) as any
			withSafe.safe = (v: unknown) => ({ ok: true, value: v })
			const schema = intersect(withSafe)
			const result = schema['~standard']!.validate('test')
			expect(result).toEqual({ value: 'test' })
		})

		test('safe fallback with non-object result', () => {
			const withSafe = ((_v: unknown) => 42) as any
			withSafe.safe = (_v: unknown) => ({ ok: true, value: 42 })
			const schema = intersect(withSafe)
			const result = schema['~standard']!.validate('anything')
			expect(result).toEqual({ value: 42 })
		})

		test('safe fallback with two non-object schemas', () => {
			const withSafe1 = ((_v: unknown) => 'first') as any
			withSafe1.safe = (_v: unknown) => ({ ok: true, value: 'first' })
			const withSafe2 = ((_v: unknown) => 'second') as any
			withSafe2.safe = (_v: unknown) => ({ ok: true, value: 'second' })
			const schema = intersect(withSafe1, withSafe2)
			const result = schema['~standard']!.validate('input')
			expect(result).toEqual({ value: 'second' })
		})

		test('safe fallback merges object results', () => {
			const withSafe1 = ((_v: unknown) => ({ a: 1 })) as any
			withSafe1.safe = (_v: unknown) => ({ ok: true, value: { a: 1 } })
			const withSafe2 = ((_v: unknown) => ({ b: 2 })) as any
			withSafe2.safe = (_v: unknown) => ({ ok: true, value: { b: 2 } })
			const schema = intersect(withSafe1, withSafe2)
			const result = schema['~standard']!.validate('input')
			expect(result).toEqual({ value: { a: 1, b: 2 } })
		})

		test('falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			const schema = intersect(noSafe)
			const result = schema['~standard']!.validate(123)
			expect(result.issues![0].message).toBe('Expected string')
		})

		test('try-catch handles success', () => {
			const noSafe = ((v: unknown) => v) as any
			const schema = intersect(noSafe, noSafe)
			const result = schema['~standard']!.validate({ a: 1 })
			expect(result).toEqual({ value: { a: 1 } })
		})

		test('try-catch merges object results', () => {
			const noSafe1 = ((_v: unknown) => ({ a: 1 })) as any
			const noSafe2 = ((_v: unknown) => ({ b: 2 })) as any
			const schema = intersect(noSafe1, noSafe2)
			const result = schema['~standard']!.validate('input')
			expect(result).toEqual({ value: { a: 1, b: 2 } })
		})

		test('try-catch uses default message', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'not an error'
			}) as any
			const schema = intersect(throwsNonError)
			const result = schema['~standard']!.validate('anything')
			expect(result.issues![0].message).toBe('Value does not match all schemas in intersect')
		})

		test('merges objects in Standard Schema', () => {
			const result = combined['~standard']!.validate({ name: 'John', age: 30 })
			expect(result.value).toEqual({ name: 'John', age: 30 })
		})

		test('handles non-object in Standard Schema', () => {
			const always42 = ((_v: unknown) => 42) as any
			always42['~standard'] = {
				version: 1,
				vendor: 'test',
				validate: (_v: unknown) => ({ value: 42 }),
			}
			const schema = intersect(always42)
			const result = schema['~standard']!.validate('anything')
			expect(result).toEqual({ value: 42 })
		})
	})
})
