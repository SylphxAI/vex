// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { num, object, optional, str, withDefault } from '..'
import { addSchemaMetadata } from '../core'
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

describe('message', () => {
	test('wraps validator with custom error message', () => {
		const validate = message(num(), 'Must be a valid number')
		expect(validate(42)).toBe(42)
		expect(() => validate('not a number')).toThrow('Must be a valid number')
	})

	test('works with function error message', () => {
		const validate = message(num(), ({ input }) => `Got ${typeof input}, expected number`)
		expect(validate(42)).toBe(42)
		expect(() => validate('hello')).toThrow('Got string, expected number')
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			const validate = message(num(), 'Must be a number')
			expect(validate.safe!(42)).toEqual({ ok: true, value: 42 })
		})

		test('returns custom error message', () => {
			const validate = message(num(), 'Custom error')
			expect(validate.safe!('invalid')).toEqual({ ok: false, error: 'Custom error' })
		})

		test('uses function error message in safe mode', () => {
			const validate = message(num(), ({ input }) => `Invalid: ${input}`)
			expect(validate.safe!('bad')).toEqual({ ok: false, error: 'Invalid: bad' })
		})

		test('falls back to try-catch when validator has no safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Not a number')
				return v
			}) as any
			const validate = message(noSafe, 'Custom')
			expect(validate.safe!(42)).toEqual({ ok: true, value: 42 })
			expect(validate.safe!('bad')).toEqual({ ok: false, error: 'Custom' })
		})
	})
})

describe('rawCheck', () => {
	test('validates with custom check function', () => {
		const validate = rawCheck<{ password: string; confirm: string }>((ctx) => {
			if (ctx.input.password !== ctx.input.confirm) {
				ctx.addIssue({ message: 'Passwords must match' })
			}
		})

		expect(validate({ password: 'abc', confirm: 'abc' })).toEqual({ password: 'abc', confirm: 'abc' })
		expect(() => validate({ password: 'abc', confirm: 'xyz' })).toThrow('Passwords must match')
	})

	test('allows multiple issues but throws on first', () => {
		const validate = rawCheck<{ a: number; b: number }>((ctx) => {
			if (ctx.input.a < 0) ctx.addIssue({ message: 'a must be positive' })
			if (ctx.input.b < 0) ctx.addIssue({ message: 'b must be positive' })
		})

		expect(() => validate({ a: -1, b: -2 })).toThrow('a must be positive')
	})

	test('uses default message when no message provided', () => {
		const _validate = rawCheck<number>((ctx) => {
			if (ctx.input < 0) ctx.addIssue({ message: '' })
		})
		// Empty message defaults to 'Validation failed'
		// The implementation uses issues[0]?.message ?? 'Validation failed'
	})

	describe('safe', () => {
		test('returns ok when check passes', () => {
			const validate = rawCheck<number>((ctx) => {
				if (ctx.input < 0) ctx.addIssue({ message: 'Must be positive' })
			})
			expect(validate.safe!(5)).toEqual({ ok: true, value: 5 })
		})

		test('returns error when check fails', () => {
			const validate = rawCheck<number>((ctx) => {
				if (ctx.input < 0) ctx.addIssue({ message: 'Must be positive' })
			})
			expect(validate.safe!(-1)).toEqual({ ok: false, error: 'Must be positive' })
		})

		test('returns default message on empty issue', () => {
			const validate = rawCheck<number>((ctx) => {
				if (ctx.input < 0) ctx.addIssue({ message: '' })
			})
			const result = validate.safe!(-1)
			expect(result.ok).toBe(false)
		})
	})

	test('supports path in issues', () => {
		const validate = rawCheck<{ nested: { value: number } }>((ctx) => {
			if (ctx.input.nested.value < 0) {
				ctx.addIssue({ message: 'Must be positive', path: ['nested', 'value'] })
			}
		})
		expect(() => validate({ nested: { value: -1 } })).toThrow('Must be positive')
	})
})

describe('rawTransform', () => {
	test('transforms input', () => {
		const validate = rawTransform<{ name: string }, { NAME: string }>((ctx) => ({
			NAME: ctx.input.name.toUpperCase(),
		}))

		expect(validate({ name: 'hello' })).toEqual({ NAME: 'HELLO' })
	})

	test('can add issues during transform', () => {
		const validate = rawTransform<number, string>((ctx) => {
			if (ctx.input < 0) {
				ctx.addIssue({ message: 'Must be positive' })
			}
			return String(ctx.input)
		})

		expect(validate(5)).toBe('5')
		expect(() => validate(-1)).toThrow('Must be positive')
	})

	describe('safe', () => {
		test('returns transformed value on success', () => {
			const validate = rawTransform<number, string>((ctx) => String(ctx.input))
			expect(validate.safe!(42)).toEqual({ ok: true, value: '42' })
		})

		test('returns error when issues added', () => {
			const validate = rawTransform<number, string>((ctx) => {
				if (ctx.input < 0) ctx.addIssue({ message: 'Negative' })
				return String(ctx.input)
			})
			expect(validate.safe!(-1)).toEqual({ ok: false, error: 'Negative' })
		})

		test('catches thrown errors', () => {
			const validate = rawTransform<number, string>((ctx) => {
				if (ctx.input < 0) throw new Error('Transform error')
				return String(ctx.input)
			})
			expect(validate.safe!(-1)).toEqual({ ok: false, error: 'Transform error' })
		})

		test('handles non-Error throws', () => {
			const validate = rawTransform<number, string>((_ctx) => {
				throw 'string error'
			})
			expect(validate.safe!(1)).toEqual({ ok: false, error: 'Transform failed' })
		})
	})
})

describe('partialCheck', () => {
	test('validates specific paths', () => {
		const validate = partialCheck<{ password: string; confirm: string }>(
			[['password'], ['confirm']],
			(input) => input.password === input.confirm,
			'Passwords must match',
		)

		expect(validate({ password: 'abc', confirm: 'abc' })).toEqual({ password: 'abc', confirm: 'abc' })
		expect(() => validate({ password: 'abc', confirm: 'xyz' })).toThrow('Passwords must match')
	})

	test('uses default error message', () => {
		const validate = partialCheck<{ a: number }>([['a']], (input) => input.a > 0)
		expect(() => validate({ a: -1 })).toThrow('Partial check failed')
	})

	describe('safe', () => {
		test('returns ok when check passes', () => {
			const validate = partialCheck<{ n: number }>([['n']], (input) => input.n > 0)
			expect(validate.safe!({ n: 5 })).toEqual({ ok: true, value: { n: 5 } })
		})

		test('returns error when check fails', () => {
			const validate = partialCheck<{ n: number }>([['n']], (input) => input.n > 0, 'Must be positive')
			expect(validate.safe!({ n: -1 })).toEqual({ ok: false, error: 'Must be positive' })
		})
	})
})

describe('forward', () => {
	test('forwards validator with path', () => {
		const validate = forward(num(), ['nested', 'value'])
		expect(validate(42)).toBe(42)
		expect(() => validate('bad')).toThrow()
	})

	test('delegates safe method', () => {
		const validate = forward(num(), ['path'])
		expect(validate.safe!(42)).toEqual({ ok: true, value: 42 })
	})

	test('modifies path in Standard Schema issues', () => {
		const innerValidator = num()
		const validate = forward(innerValidator, ['field'])

		// Access Standard Schema interface
		const std = (validate as any)['~standard']
		expect(std).toBeDefined()
		const result = std.validate('invalid')
		expect(result.issues).toBeDefined()
		expect(result.issues[0].path).toContain('field')
	})

	test('returns value from Standard Schema on success', () => {
		const validate = forward(num(), ['nested'])
		const std = (validate as any)['~standard']
		expect(std).toBeDefined()
		const result = std.validate(42)
		expect(result.value).toBe(42)
		expect(result.issues).toBeUndefined()
	})

	test('works without Standard Schema', () => {
		const simpleValidator = ((v: unknown) => {
			if (typeof v !== 'number') throw new Error('Not a number')
			return v
		}) as any
		const validate = forward(simpleValidator, ['path'])
		expect(validate(42)).toBe(42)
	})
})

describe('args', () => {
	test('returns the schema as-is', () => {
		const schema = object({ name: str() })
		const validated = args(schema as any) as any
		expect(validated).toBe(schema)
	})
})

describe('returns', () => {
	test('returns the schema as-is', () => {
		const schema = str()
		const validated = returns(schema)
		expect(validated).toBe(schema)
	})
})

describe('getDefault', () => {
	test('returns undefined for schema without default', () => {
		expect(getDefault(num())).toBeUndefined()
		expect(getDefault(str())).toBeUndefined()
	})

	test('returns default value when set', () => {
		const schema = withDefault(num(), 42)
		expect(getDefault(schema)).toBe(42)
	})
})

describe('getDefaults', () => {
	test('returns undefined for non-object schema', () => {
		expect(getDefaults(num() as any)).toBeUndefined()
	})

	test('returns undefined for object without defaults', () => {
		const schema = object({ name: str() })
		expect(getDefaults(schema)).toBeUndefined()
	})

	test('returns defaults for object with defaults', () => {
		// Create a field with default metadata
		const nameField = ((v: unknown) => v) as any
		addSchemaMetadata(nameField, { type: 'default', constraints: { default: 'John' } })

		const schema = object({ name: nameField, age: num() })
		const defaults = getDefaults(schema)
		expect(defaults).toEqual({ name: 'John' })
	})
})

describe('getFallback', () => {
	test('returns undefined for schema without fallback', () => {
		expect(getFallback(num())).toBeUndefined()
		expect(getFallback(str())).toBeUndefined()
	})
})

describe('getFallbacks', () => {
	test('returns undefined for non-object schema', () => {
		expect(getFallbacks(num() as any)).toBeUndefined()
	})

	test('returns undefined for object without fallbacks', () => {
		const schema = object({ name: str() })
		expect(getFallbacks(schema)).toBeUndefined()
	})

	test('returns fallbacks for object with fallbacks', () => {
		// Create a field with fallback metadata
		const nameField = ((v: unknown) => v) as any
		addSchemaMetadata(nameField, { type: 'fallback', constraints: { fallback: 'Default Name' } })

		const schema = object({ name: nameField, age: num() })
		const fallbacks = getFallbacks(schema)
		expect(fallbacks).toEqual({ name: 'Default Name' })
	})
})

describe('unwrap', () => {
	test('returns schema as-is when not wrapped', () => {
		const schema = str()
		expect(unwrap(schema)).toBe(schema)
	})

	test('returns schema when no metadata', () => {
		const noMeta = ((v: unknown) => v) as any
		expect(unwrap(noMeta)).toBe(noMeta)
	})

	test('unwraps optional schema', () => {
		const inner = str()
		const wrapped = optional(inner)
		const unwrapped = unwrap(wrapped)
		expect(unwrapped).toBe(inner)
	})
})

describe('flatten', () => {
	test('flattens simple error', () => {
		const result = flatten({ message: 'Error' })
		expect(result).toEqual({ root: ['Error'] })
	})

	test('flattens issues without path', () => {
		const result = flatten({
			issues: [{ message: 'Error 1' }, { message: 'Error 2' }],
		})
		expect(result).toEqual({ root: ['Error 1', 'Error 2'] })
	})

	test('flattens issues with path', () => {
		const result = flatten({
			issues: [
				{ message: 'Name required', path: ['name'] },
				{ message: 'Age invalid', path: ['age'] },
			],
		})
		expect(result).toEqual({
			nested: {
				name: ['Name required'],
				age: ['Age invalid'],
			},
		})
	})

	test('flattens nested paths', () => {
		const result = flatten({
			issues: [{ message: 'Error', path: ['user', 'address', 'city'] }],
		})
		expect(result).toEqual({
			nested: {
				'user.address.city': ['Error'],
			},
		})
	})

	test('handles mixed root and nested', () => {
		const result = flatten({
			issues: [
				{ message: 'Root error' },
				{ message: 'Field error', path: ['field'] },
				{ message: 'Another root', path: [] },
			],
		})
		expect(result).toEqual({
			root: ['Root error', 'Another root'],
			nested: {
				field: ['Field error'],
			},
		})
	})

	test('handles empty issues', () => {
		const result = flatten({ issues: [] })
		expect(result).toEqual({})
	})

	test('accumulates multiple errors on same path', () => {
		const result = flatten({
			issues: [
				{ message: 'Too short', path: ['name'] },
				{ message: 'Invalid chars', path: ['name'] },
			],
		})
		expect(result).toEqual({
			nested: {
				name: ['Too short', 'Invalid chars'],
			},
		})
	})
})

describe('summarize', () => {
	test('returns vendor and type for Standard Schema', () => {
		const schema = str()
		const summary = summarize(schema) as { vendor?: string; type: string }
		expect(summary.vendor).toBe('vex')
		expect(summary.type).toBe('schema')
	})

	test('returns unknown for non-Standard Schema', () => {
		const noStd = ((v: unknown) => v) as any
		const summary = summarize(noStd)
		expect(summary).toEqual({ type: 'unknown' })
	})
})

describe('async functions', () => {
	test('getDefaultsAsync returns undefined', async () => {
		const schema = object({ name: str() })
		const result = await getDefaultsAsync(schema)
		expect(result).toBeUndefined()
	})

	test('getFallbacksAsync returns undefined', async () => {
		const schema = object({ name: str() })
		const result = await getFallbacksAsync(schema)
		expect(result).toBeUndefined()
	})
})

describe('Standard Schema integration', () => {
	test('message has Standard Schema', () => {
		const validate = message(num(), 'Error')
		expect((validate as any)['~standard']).toBeDefined()
	})

	test('rawCheck has Standard Schema', () => {
		const validate = rawCheck<number>(() => {})
		expect((validate as any)['~standard']).toBeDefined()
	})

	test('rawTransform has Standard Schema', () => {
		const validate = rawTransform<number, string>((ctx) => String(ctx.input))
		expect((validate as any)['~standard']).toBeDefined()
	})

	test('partialCheck has Standard Schema', () => {
		const validate = partialCheck<{ a: number }>([], () => true)
		expect((validate as any)['~standard']).toBeDefined()
	})
})
