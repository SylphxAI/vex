import { describe, expect, test } from 'bun:test'
import { fallback, num, object, str, withDefault } from '../index'
import {
	args,
	flatten,
	forward,
	getDefault,
	getDefaults,
	getDefaultsAsync,
	getFallback,
	getFallbacks,
	getFallbacksAsync,
	message,
	partialCheck,
	rawCheck,
	rawTransform,
	returns,
	summarize,
	unwrap,
} from './advanced'

describe('composition/advanced', () => {
	describe('message', () => {
		test('wraps validator with custom message', () => {
			const validator = message(num(), 'Must be a number')
			expect(() => validator('not a number')).toThrow('Must be a number')
		})

		test('passes through valid values', () => {
			const validator = message(num(), 'Must be a number')
			expect(validator(42)).toBe(42)
		})

		test('supports function message', () => {
			const validator = message(num(), ({ input }) => `${input} is not a number`)
			expect(() => validator('hello')).toThrow('hello is not a number')
		})

		test('safe version works', () => {
			const validator = message(num(), 'Must be a number')
			expect(validator.safe!('bad')).toEqual({ ok: false, error: 'Must be a number' })
		})

		test('safe version passes valid values', () => {
			const validator = message(num(), 'Must be a number')
			expect(validator.safe!(42)).toEqual({ ok: true, value: 42 })
		})

		test('safe falls back to try-catch', () => {
			const noSafe = (v: unknown) => {
				if (typeof v !== 'number') throw new Error('Bad')
				return v
			}
			const validator = message(noSafe as any, 'Custom error')
			expect(validator.safe!('bad')).toEqual({ ok: false, error: 'Custom error' })
		})
	})

	describe('rawCheck', () => {
		test('passes when no issues added', () => {
			const check = rawCheck<{ a: number; b: number }>((_ctx) => {
				// No issues
			})
			expect(check({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
		})

		test('throws when issue added', () => {
			const check = rawCheck<{ a: number; b: number }>((ctx) => {
				if (ctx.input.a > ctx.input.b) {
					ctx.addIssue({ message: 'a must be <= b' })
				}
			})
			expect(() => check({ a: 5, b: 2 })).toThrow('a must be <= b')
		})

		test('safe version returns error', () => {
			const check = rawCheck<{ a: number; b: number }>((ctx) => {
				if (ctx.input.a > ctx.input.b) {
					ctx.addIssue({ message: 'a must be <= b' })
				}
			})
			expect(check.safe!({ a: 5, b: 2 })).toEqual({ ok: false, error: 'a must be <= b' })
		})

		test('safe version passes valid input', () => {
			const check = rawCheck<{ a: number; b: number }>((ctx) => {
				if (ctx.input.a > ctx.input.b) {
					ctx.addIssue({ message: 'a must be <= b' })
				}
			})
			expect(check.safe!({ a: 1, b: 2 })).toEqual({ ok: true, value: { a: 1, b: 2 } })
		})

		test('uses default message when no issues', () => {
			const check = rawCheck<number>((ctx) => {
				if (ctx.input < 0) ctx.addIssue({} as any)
			})
			expect(() => check(-1)).toThrow('Validation failed')
		})
	})

	describe('rawTransform', () => {
		test('transforms value', () => {
			const transform = rawTransform<string, number>((ctx) => ctx.input.length)
			expect(transform('hello')).toBe(5)
		})

		test('throws when issue added', () => {
			const transform = rawTransform<string, number>((ctx) => {
				if (ctx.input.length === 0) {
					ctx.addIssue({ message: 'Cannot be empty' })
				}
				return ctx.input.length
			})
			expect(() => transform('')).toThrow('Cannot be empty')
		})

		test('safe version returns error', () => {
			const transform = rawTransform<string, number>((ctx) => {
				if (ctx.input.length === 0) {
					ctx.addIssue({ message: 'Cannot be empty' })
				}
				return ctx.input.length
			})
			expect(transform.safe!('')).toEqual({ ok: false, error: 'Cannot be empty' })
		})

		test('safe version returns transformed value', () => {
			const transform = rawTransform<string, number>((ctx) => ctx.input.length)
			expect(transform.safe!('hello')).toEqual({ ok: true, value: 5 })
		})

		test('safe version catches exceptions', () => {
			const transform = rawTransform(() => {
				throw new Error('Oops')
			})
			expect(transform.safe!(null)).toEqual({ ok: false, error: 'Oops' })
		})

		test('uses default message when no issues', () => {
			const transform = rawTransform<number, number>((ctx) => {
				if (ctx.input < 0) ctx.addIssue({} as any)
				return ctx.input
			})
			expect(() => transform(-1)).toThrow('Transform failed')
		})
	})

	describe('partialCheck', () => {
		test('passes when check returns true', () => {
			const check = partialCheck<{ password: string; confirm: string }>(
				[['password'], ['confirm']],
				(input) => input.password === input.confirm,
				'Passwords must match'
			)
			expect(check({ password: 'abc', confirm: 'abc' })).toEqual({
				password: 'abc',
				confirm: 'abc',
			})
		})

		test('throws when check returns false', () => {
			const check = partialCheck<{ password: string; confirm: string }>(
				[['password'], ['confirm']],
				(input) => input.password === input.confirm,
				'Passwords must match'
			)
			expect(() => check({ password: 'abc', confirm: 'xyz' })).toThrow('Passwords must match')
		})

		test('safe version returns error', () => {
			const check = partialCheck<{ password: string; confirm: string }>(
				[['password'], ['confirm']],
				(input) => input.password === input.confirm,
				'Passwords must match'
			)
			expect(check.safe!({ password: 'abc', confirm: 'xyz' })).toEqual({
				ok: false,
				error: 'Passwords must match',
			})
		})

		test('uses default message', () => {
			const check = partialCheck<{ a: number }>([['a']], (input) => input.a > 0)
			expect(() => check({ a: -1 })).toThrow('Partial check failed')
		})
	})

	describe('forward', () => {
		test('forwards validator', () => {
			const forwarded = forward(num(), ['field'])
			expect(forwarded(42)).toBe(42)
		})

		test('preserves safe method', () => {
			const forwarded = forward(num(), ['field'])
			expect(forwarded.safe!(42)).toEqual({ ok: true, value: 42 })
		})

		test('works without safe method', () => {
			const noSafe = (v: unknown) => v as number
			const forwarded = forward(noSafe as any, ['field'])
			expect(forwarded(42)).toBe(42)
		})

		test('Standard Schema forwards path on success', () => {
			const forwarded = forward(num(), ['field'])
			expect(forwarded['~standard']).toBeDefined()
			const result = forwarded['~standard']!.validate(42)
			expect(result.value).toBe(42)
		})

		test('Standard Schema prepends path on failure', () => {
			const forwarded = forward(num(), ['field'])
			const result = forwarded['~standard']!.validate('not a number')
			expect(result.issues).toBeDefined()
			expect(result.issues![0].path).toEqual(['field'])
		})

		test('Standard Schema preserves nested paths', () => {
			const schema = object({ a: num() })
			const forwarded = forward(schema, ['outer'])
			const result = forwarded['~standard']!.validate({ a: 'bad' })
			expect(result.issues).toBeDefined()
			expect(result.issues![0].path).toEqual(['outer', 'a'])
		})
	})

	describe('args', () => {
		test('returns schema as-is', () => {
			const schema = str()
			const result = args(schema as any)
			expect(result).toBe(schema)
		})
	})

	describe('returns', () => {
		test('returns schema as-is', () => {
			const schema = str()
			const result = returns(schema)
			expect(result).toBe(schema)
		})
	})

	describe('getDefault', () => {
		test('returns undefined for schema without default', () => {
			expect(getDefault(str())).toBe(undefined)
		})

		test('returns stored default from withDefault wrapper', () => {
			const schema = withDefault(str(), 'test')
			expect(getDefault(schema)).toBe('test')
		})

		test('returns default for number schema', () => {
			const schema = withDefault(num(), 42)
			expect(getDefault(schema)).toBe(42)
		})
	})

	describe('getDefaults', () => {
		test('returns undefined for schema without defaults', () => {
			const schema = object({ name: str() })
			expect(getDefaults(schema)).toBe(undefined)
		})

		test('returns defaults from object with withDefault fields', () => {
			const schema = object({
				name: withDefault(str(), 'anonymous'),
				age: withDefault(num(), 0),
			})
			expect(getDefaults(schema)).toEqual({ name: 'anonymous', age: 0 })
		})

		test('returns partial defaults for mixed fields', () => {
			const schema = object({
				name: withDefault(str(), 'anonymous'),
				age: num(),
			})
			expect(getDefaults(schema)).toEqual({ name: 'anonymous' })
		})

		test('returns undefined for non-object schema', () => {
			expect(getDefaults(str() as any)).toBe(undefined)
		})
	})

	describe('getFallback', () => {
		test('returns undefined for schema without fallback', () => {
			expect(getFallback(str())).toBe(undefined)
		})

		test('returns stored fallback from fallback wrapper', () => {
			const schema = fallback(str(), 'test')
			expect(getFallback(schema)).toBe('test')
		})

		test('returns fallback for number schema', () => {
			const schema = fallback(num(), 0)
			expect(getFallback(schema)).toBe(0)
		})
	})

	describe('getFallbacks', () => {
		test('returns undefined for schema without fallbacks', () => {
			const schema = object({ name: str() })
			expect(getFallbacks(schema)).toBe(undefined)
		})

		test('returns fallbacks from object with fallback fields', () => {
			const schema = object({
				name: fallback(str(), 'unknown'),
				age: fallback(num(), -1),
			})
			expect(getFallbacks(schema)).toEqual({ name: 'unknown', age: -1 })
		})

		test('returns partial fallbacks for mixed fields', () => {
			const schema = object({
				name: fallback(str(), 'unknown'),
				age: num(),
			})
			expect(getFallbacks(schema)).toEqual({ name: 'unknown' })
		})

		test('returns undefined for non-object schema', () => {
			expect(getFallbacks(str() as any)).toBe(undefined)
		})
	})

	describe('unwrap', () => {
		test('returns schema as-is', () => {
			const schema = str()
			const result = unwrap(schema)
			expect(result).toBe(schema)
		})
	})

	describe('flatten', () => {
		test('flattens simple error', () => {
			expect(flatten({ message: 'Error' })).toEqual({ root: ['Error'] })
		})

		test('flattens issues without path', () => {
			expect(flatten({ issues: [{ message: 'Error 1' }, { message: 'Error 2' }] })).toEqual({
				root: ['Error 1', 'Error 2'],
			})
		})

		test('flattens issues with path', () => {
			expect(
				flatten({
					issues: [
						{ message: 'Error 1', path: ['name'] },
						{ message: 'Error 2', path: ['age'] },
					],
				})
			).toEqual({
				nested: {
					name: ['Error 1'],
					age: ['Error 2'],
				},
			})
		})

		test('handles empty path', () => {
			expect(flatten({ issues: [{ message: 'Error', path: [] }] })).toEqual({
				root: ['Error'],
			})
		})

		test('handles multiple errors for same path', () => {
			expect(
				flatten({
					issues: [
						{ message: 'Error 1', path: ['name'] },
						{ message: 'Error 2', path: ['name'] },
					],
				})
			).toEqual({
				nested: {
					name: ['Error 1', 'Error 2'],
				},
			})
		})

		test('handles empty issues array', () => {
			expect(flatten({ issues: [] })).toEqual({})
		})

		test('handles nested paths', () => {
			expect(
				flatten({
					issues: [{ message: 'Error', path: ['user', 'name'] }],
				})
			).toEqual({
				nested: {
					'user.name': ['Error'],
				},
			})
		})
	})

	describe('summarize', () => {
		test('returns vendor info for standard schema', () => {
			const result = summarize(str())
			expect(result.vendor).toBe('vex')
			expect(result.type).toBe('schema')
		})

		test('returns unknown for non-standard schema', () => {
			const noStandard = ((v: unknown) => v) as any
			expect(summarize(noStandard)).toEqual({ type: 'unknown' })
		})
	})

	describe('getDefaultsAsync', () => {
		test('returns undefined', async () => {
			const schema = object({ name: str() })
			expect(await getDefaultsAsync(schema as any)).toBe(undefined)
		})
	})

	describe('getFallbacksAsync', () => {
		test('returns undefined', async () => {
			const schema = object({ name: str() })
			expect(await getFallbacksAsync(schema as any)).toBe(undefined)
		})
	})
})
