// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { literal, num, object, str } from '..'
import { discriminatedUnion, union } from './union'

describe('union', () => {
	const strOrNum = union(str(), num())

	test('validates first matching schema', () => {
		expect(strOrNum('hello')).toBe('hello')
	})

	test('validates second matching schema', () => {
		expect(strOrNum(42)).toBe(42)
	})

	test('throws when no schema matches', () => {
		expect(() => strOrNum(true as any)).toThrow('Value does not match any type in union')
	})

	test('works with schema without safe', () => {
		const noSafe = ((v: unknown) => {
			if (typeof v !== 'boolean') throw new Error('Must be boolean')
			return v
		}) as any
		const unionWithNoSafe = union(noSafe, str())
		expect(unionWithNoSafe(true)).toBe(true)
		expect(unionWithNoSafe('hello')).toBe('hello')
	})

	test('continues when schema without safe throws', () => {
		const throwsFirst = ((_v: unknown) => {
			throw new Error('First fails')
		}) as any
		const unionSchema = union(throwsFirst, str())
		expect(unionSchema('hello')).toBe('hello')
	})

	describe('safe', () => {
		test('returns ok for first matching schema', () => {
			expect(strOrNum.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('returns ok for second matching schema', () => {
			expect(strOrNum.safe!(42)).toEqual({ ok: true, value: 42 })
		})

		test('returns error when no schema matches', () => {
			expect(strOrNum.safe!(true)).toEqual({
				ok: false,
				error: 'Value does not match any type in union',
			})
		})

		test('works with schema without safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'boolean') throw new Error('Must be boolean')
				return v
			}) as any
			const unionWithNoSafe = union(noSafe, str())
			expect(unionWithNoSafe.safe!(true)).toEqual({ ok: true, value: true })
			expect(unionWithNoSafe.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('continues when schema without safe throws', () => {
			const throwsFirst = ((_v: unknown) => {
				throw new Error('First fails')
			}) as any
			const unionSchema = union(throwsFirst, str())
			expect(unionSchema.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			expect(strOrNum['~standard']).toBeDefined()
			expect(strOrNum['~standard']?.version).toBe(1)
			expect(strOrNum['~standard']?.vendor).toBe('vex')
		})

		test('validate returns value on success', () => {
			expect(strOrNum['~standard']!.validate('hello')).toEqual({ value: 'hello' })
			expect(strOrNum['~standard']!.validate(42)).toEqual({ value: 42 })
		})

		test('validate returns issues on failure', () => {
			const result = strOrNum['~standard']!.validate(true)
			expect(result.issues![0].message).toBe('Value does not match any type in union')
		})

		test('uses safe method as fallback', () => {
			const withSafe = ((v: unknown) => {
				if (typeof v !== 'boolean') throw new Error('Must be boolean')
				return v
			}) as any
			withSafe.safe = (v: unknown) => {
				if (typeof v !== 'boolean') return { ok: false, error: 'Must be boolean' }
				return { ok: true, value: v }
			}
			const unionSchema = union(withSafe, str())
			expect(unionSchema['~standard']!.validate(true)).toEqual({ value: true })
		})

		test('falls back to try-catch', () => {
			const noStd = ((v: unknown) => {
				if (typeof v !== 'boolean') throw new Error('Must be boolean')
				return v
			}) as any
			const unionSchema = union(noStd, str())
			expect(unionSchema['~standard']!.validate(true)).toEqual({ value: true })
			expect(unionSchema['~standard']!.validate('hello')).toEqual({ value: 'hello' })
		})

		test('try-catch continues on throw', () => {
			const alwaysThrows = ((_v: unknown) => {
				throw new Error('Always fails')
			}) as any
			const unionSchema = union(alwaysThrows, str())
			expect(unionSchema['~standard']!.validate('hello')).toEqual({ value: 'hello' })
		})
	})
})

describe('discriminatedUnion', () => {
	const shapeSchema = discriminatedUnion('type', [
		object({ type: literal('circle'), radius: num() }),
		object({ type: literal('square'), side: num() }),
	])

	test('validates matching discriminator', () => {
		const circle = shapeSchema({ type: 'circle', radius: 5 })
		expect(circle).toEqual({ type: 'circle', radius: 5 })

		const square = shapeSchema({ type: 'square', side: 10 })
		expect(square).toEqual({ type: 'square', side: 10 })
	})

	test('throws for non-object', () => {
		expect(() => shapeSchema(null as any)).toThrow('Expected object')
		expect(() => shapeSchema([] as any)).toThrow('Expected object')
		expect(() => shapeSchema('string' as any)).toThrow('Expected object')
	})

	test('throws for invalid discriminator', () => {
		expect(() => shapeSchema({ type: 'triangle', sides: 3 } as any)).toThrow('Invalid discriminator value')
	})

	test('works with schema without safe', () => {
		const noSafe = ((v: unknown) => {
			const obj = v as { type: string; value: number }
			if (obj.type !== 'custom') throw new Error('Not custom')
			return obj
		}) as any
		const unionSchema = discriminatedUnion('type', [noSafe, object({ type: literal('other') })])
		expect(unionSchema({ type: 'custom', value: 1 })).toEqual({ type: 'custom', value: 1 })
	})

	test('continues when schema without safe throws', () => {
		const throwsFirst = ((_v: unknown) => {
			throw new Error('First fails')
		}) as any
		const unionSchema = discriminatedUnion('type', [throwsFirst, object({ type: literal('ok') })])
		expect(unionSchema({ type: 'ok' })).toEqual({ type: 'ok' })
	})

	describe('safe', () => {
		test('returns ok for matching discriminator', () => {
			expect(shapeSchema.safe!({ type: 'circle', radius: 5 })).toEqual({
				ok: true,
				value: { type: 'circle', radius: 5 },
			})
		})

		test('returns error for non-object', () => {
			expect(shapeSchema.safe!(null)).toEqual({ ok: false, error: 'Expected object' })
			expect(shapeSchema.safe!([])).toEqual({ ok: false, error: 'Expected object' })
		})

		test('returns error for invalid discriminator', () => {
			expect(shapeSchema.safe!({ type: 'triangle' })).toEqual({
				ok: false,
				error: 'Invalid discriminator value',
			})
		})

		test('works with schema without safe', () => {
			const noSafe = ((v: unknown) => {
				const obj = v as { type: string }
				if (obj.type !== 'custom') throw new Error('Not custom')
				return obj
			}) as any
			const unionSchema = discriminatedUnion('type', [noSafe, object({ type: literal('other') })])
			expect(unionSchema.safe!({ type: 'custom' })).toEqual({
				ok: true,
				value: { type: 'custom' },
			})
		})

		test('continues when schema without safe throws', () => {
			const throwsFirst = ((_v: unknown) => {
				throw new Error('First fails')
			}) as any
			const unionSchema = discriminatedUnion('type', [throwsFirst, object({ type: literal('ok') })])
			expect(unionSchema.safe!({ type: 'ok' })).toEqual({ ok: true, value: { type: 'ok' } })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			expect(shapeSchema['~standard']).toBeDefined()
			expect(shapeSchema['~standard']?.version).toBe(1)
		})
	})
})
