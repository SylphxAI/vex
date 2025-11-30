import { describe, expect, test } from 'bun:test'
import { createAsyncValidator } from './core'
import {
	argsAsync,
	awaitAsync,
	checkAsync,
	checkItemsAsync,
	forwardAsync,
	parseAsync,
	parserAsync,
	partialCheckAsync,
	pipeAsync,
	rawCheckAsync,
	rawTransformAsync,
	returnsAsync,
	safeParseAsync,
	safeParserAsync,
	transformAsync,
} from './methods'

// Helper async validator
const strAsync = createAsyncValidator(
	async (v: unknown) => {
		if (typeof v !== 'string') throw new Error('Expected string')
		return v
	},
	async (v: unknown) => {
		if (typeof v !== 'string') return { ok: false, error: 'Expected string' }
		return { ok: true, value: v }
	}
)

const _numAsync = createAsyncValidator(
	async (v: unknown) => {
		if (typeof v !== 'number') throw new Error('Expected number')
		return v
	},
	async (v: unknown) => {
		if (typeof v !== 'number') return { ok: false, error: 'Expected number' }
		return { ok: true, value: v }
	}
)

describe('async/methods', () => {
	describe('parseAsync', () => {
		test('parses valid value', async () => {
			const result = await parseAsync(strAsync, 'hello')
			expect(result).toBe('hello')
		})

		test('throws on invalid value', async () => {
			await expect(parseAsync(strAsync, 123)).rejects.toThrow('Expected string')
		})
	})

	describe('safeParseAsync', () => {
		test('returns success for valid value', async () => {
			const result = await safeParseAsync(strAsync, 'hello')
			expect(result).toEqual({ success: true, data: 'hello' })
		})

		test('returns error for invalid value', async () => {
			const result = await safeParseAsync(strAsync, 123)
			expect(result).toEqual({ success: false, error: 'Expected string' })
		})

		test('handles validator without safe method', async () => {
			const validator = async (v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}
			const result = await safeParseAsync(validator as any, 123)
			expect(result).toEqual({ success: false, error: 'Expected string' })
		})
	})

	describe('parserAsync', () => {
		test('creates parser function', async () => {
			const parse = parserAsync(strAsync)
			expect(await parse('hello')).toBe('hello')
		})
	})

	describe('safeParserAsync', () => {
		test('creates safe parser function', async () => {
			const safeParse = safeParserAsync(strAsync)
			expect(await safeParse('hello')).toEqual({ success: true, data: 'hello' })
			expect(await safeParse(123)).toEqual({ success: false, error: 'Expected string' })
		})
	})

	describe('pipeAsync', () => {
		test('pipes multiple validators', async () => {
			const upperAsync = createAsyncValidator(
				async (v: string) => v.toUpperCase(),
				async (v: string) => ({ ok: true, value: v.toUpperCase() })
			)

			const piped = pipeAsync(strAsync, upperAsync)
			expect(await piped('hello')).toBe('HELLO')
		})

		test('safe version works', async () => {
			const upperAsync = createAsyncValidator(
				async (v: string) => v.toUpperCase(),
				async (v: string) => ({ ok: true, value: v.toUpperCase() })
			)

			const piped = pipeAsync(strAsync, upperAsync)
			expect(await piped.safe!('hello')).toEqual({ ok: true, value: 'HELLO' })
		})

		test('safe version returns error on failure', async () => {
			const piped = pipeAsync(strAsync)
			expect(await piped.safe!(123)).toEqual({ ok: false, error: 'Expected string' })
		})

		test('handles validator without safe method', async () => {
			const noSafe = async (v: string) => v.toUpperCase()
			const piped = pipeAsync(strAsync, noSafe as any)
			expect(await piped.safe!('hello')).toEqual({ ok: true, value: 'HELLO' })
		})

		test('catches errors in pipe', async () => {
			const throwsAsync = async (_v: string) => {
				throw new Error('Oops')
			}
			const piped = pipeAsync(strAsync, throwsAsync as any)
			expect(await piped.safe!('hello')).toEqual({ ok: false, error: 'Oops' })
		})
	})

	describe('transformAsync', () => {
		test('transforms value', async () => {
			const toUpper = transformAsync((v: string) => v.toUpperCase())
			expect(await toUpper('hello')).toBe('HELLO')
		})

		test('safe version works', async () => {
			const toUpper = transformAsync((v: string) => v.toUpperCase())
			expect(await toUpper.safe!('hello')).toEqual({ ok: true, value: 'HELLO' })
		})

		test('safe version catches errors', async () => {
			const throws = transformAsync(() => {
				throw new Error('Oops')
			})
			expect(await throws.safe!(null)).toEqual({ ok: false, error: 'Oops' })
		})

		test('handles async transform', async () => {
			const toUpper = transformAsync(async (v: string) => v.toUpperCase())
			expect(await toUpper('hello')).toBe('HELLO')
		})
	})

	describe('checkAsync', () => {
		test('passes when check returns true', async () => {
			const notEmpty = checkAsync((v: string) => v.length > 0, 'Cannot be empty')
			expect(await notEmpty('hello')).toBe('hello')
		})

		test('throws when check returns false', async () => {
			const notEmpty = checkAsync((v: string) => v.length > 0, 'Cannot be empty')
			await expect(notEmpty('')).rejects.toThrow('Cannot be empty')
		})

		test('safe version returns error', async () => {
			const notEmpty = checkAsync((v: string) => v.length > 0, 'Cannot be empty')
			expect(await notEmpty.safe!('')).toEqual({ ok: false, error: 'Cannot be empty' })
		})

		test('handles async check', async () => {
			const asyncCheck = checkAsync(async (v: string) => v.length > 0, 'Cannot be empty')
			expect(await asyncCheck('hello')).toBe('hello')
		})

		test('safe version catches exceptions', async () => {
			const throws = checkAsync(() => {
				throw new Error('Oops')
			}, 'Check failed')
			expect(await throws.safe!(null)).toEqual({ ok: false, error: 'Check failed' })
		})
	})

	describe('checkItemsAsync', () => {
		test('validates all items', async () => {
			const allPositive = checkItemsAsync((n: number) => n > 0, 'Must be positive')
			expect(await allPositive([1, 2, 3])).toEqual([1, 2, 3])
		})

		test('throws on invalid item', async () => {
			const allPositive = checkItemsAsync((n: number) => n > 0, 'Must be positive')
			await expect(allPositive([1, -1, 3])).rejects.toThrow('[1]: Must be positive')
		})

		test('safe version returns error with index', async () => {
			const allPositive = checkItemsAsync((n: number) => n > 0, 'Must be positive')
			expect(await allPositive.safe!([1, -1, 3])).toEqual({
				ok: false,
				error: '[1]: Must be positive',
			})
		})

		test('handles async check', async () => {
			const asyncCheck = checkItemsAsync(async (n: number) => n > 0, 'Must be positive')
			expect(await asyncCheck([1, 2, 3])).toEqual([1, 2, 3])
		})

		test('safe catches exceptions', async () => {
			const throws = checkItemsAsync(() => {
				throw new Error('Oops')
			}, 'Failed')
			expect(await throws.safe!([1])).toEqual({ ok: false, error: '[0]: Failed' })
		})
	})

	describe('rawCheckAsync', () => {
		test('passes when no issues added', async () => {
			const check = rawCheckAsync<{ a: number; b: number }>((_ctx) => {
				// No issues
			})
			expect(await check({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
		})

		test('throws when issue added', async () => {
			const check = rawCheckAsync<{ a: number; b: number }>((ctx) => {
				if (ctx.input.a > ctx.input.b) {
					ctx.addIssue({ message: 'a must be <= b' })
				}
			})
			await expect(check({ a: 5, b: 2 })).rejects.toThrow('a must be <= b')
		})

		test('safe version returns error', async () => {
			const check = rawCheckAsync<{ a: number; b: number }>((ctx) => {
				if (ctx.input.a > ctx.input.b) {
					ctx.addIssue({ message: 'a must be <= b' })
				}
			})
			expect(await check.safe!({ a: 5, b: 2 })).toEqual({
				ok: false,
				error: 'a must be <= b',
			})
		})

		test('handles async check', async () => {
			const check = rawCheckAsync<number>(async (ctx) => {
				if (ctx.input < 0) ctx.addIssue({ message: 'Must be positive' })
			})
			expect(await check(5)).toBe(5)
		})
	})

	describe('rawTransformAsync', () => {
		test('transforms value', async () => {
			const transform = rawTransformAsync<string, number>((ctx) => ctx.input.length)
			expect(await transform('hello')).toBe(5)
		})

		test('throws when issue added', async () => {
			const transform = rawTransformAsync<string, number>((ctx) => {
				if (ctx.input.length === 0) {
					ctx.addIssue({ message: 'Cannot be empty' })
				}
				return ctx.input.length
			})
			await expect(transform('')).rejects.toThrow('Cannot be empty')
		})

		test('safe version returns error', async () => {
			const transform = rawTransformAsync<string, number>((ctx) => {
				if (ctx.input.length === 0) {
					ctx.addIssue({ message: 'Cannot be empty' })
				}
				return ctx.input.length
			})
			expect(await transform.safe!('')).toEqual({ ok: false, error: 'Cannot be empty' })
		})

		test('safe version catches exceptions', async () => {
			const transform = rawTransformAsync(() => {
				throw new Error('Oops')
			})
			expect(await transform.safe!(null)).toEqual({ ok: false, error: 'Oops' })
		})

		test('handles async transform', async () => {
			const transform = rawTransformAsync<string, number>(async (ctx) => ctx.input.length)
			expect(await transform('hello')).toBe(5)
		})
	})

	describe('partialCheckAsync', () => {
		test('passes when check returns true', async () => {
			const check = partialCheckAsync<{ password: string; confirm: string }>(
				[['password'], ['confirm']],
				(input) => input.password === input.confirm,
				'Passwords must match'
			)
			expect(await check({ password: 'abc', confirm: 'abc' })).toEqual({
				password: 'abc',
				confirm: 'abc',
			})
		})

		test('throws when check returns false', async () => {
			const check = partialCheckAsync<{ password: string; confirm: string }>(
				[['password'], ['confirm']],
				(input) => input.password === input.confirm,
				'Passwords must match'
			)
			await expect(check({ password: 'abc', confirm: 'xyz' })).rejects.toThrow('Passwords must match')
		})

		test('safe version returns error', async () => {
			const check = partialCheckAsync<{ password: string; confirm: string }>(
				[['password'], ['confirm']],
				(input) => input.password === input.confirm,
				'Passwords must match'
			)
			expect(await check.safe!({ password: 'abc', confirm: 'xyz' })).toEqual({
				ok: false,
				error: 'Passwords must match',
			})
		})

		test('handles async check', async () => {
			const check = partialCheckAsync<{ a: number }>([['a']], async (input) => input.a > 0, 'Must be positive')
			expect(await check({ a: 5 })).toEqual({ a: 5 })
		})

		test('safe catches exceptions', async () => {
			const check = partialCheckAsync<{ a: number }>(
				[['a']],
				() => {
					throw new Error('Oops')
				},
				'Check failed'
			)
			expect(await check.safe!({ a: 5 })).toEqual({ ok: false, error: 'Check failed' })
		})
	})

	describe('forwardAsync', () => {
		test('forwards validator', async () => {
			const forwarded = forwardAsync(strAsync, ['field'])
			expect(await forwarded('hello')).toBe('hello')
		})

		test('preserves safe method', async () => {
			const forwarded = forwardAsync(strAsync, ['field'])
			expect(await forwarded.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})
	})

	describe('argsAsync', () => {
		test('returns schema as-is', async () => {
			const validator = createAsyncValidator(
				async (v: unknown) => v as [string, number],
				async (v: unknown) => ({ ok: true, value: v as [string, number] })
			)
			const result = argsAsync(validator)
			expect(result).toBe(validator)
		})
	})

	describe('returnsAsync', () => {
		test('returns schema as-is', async () => {
			const result = returnsAsync(strAsync)
			expect(result).toBe(strAsync)
		})
	})

	describe('awaitAsync', () => {
		test('awaits promise', async () => {
			const awaiter = awaitAsync<string>()
			expect(await awaiter(Promise.resolve('hello'))).toBe('hello')
		})

		test('safe version works', async () => {
			const awaiter = awaitAsync<string>()
			expect(await awaiter.safe!(Promise.resolve('hello'))).toEqual({
				ok: true,
				value: 'hello',
			})
		})

		test('safe version catches rejection', async () => {
			const awaiter = awaitAsync<string>()
			expect(await awaiter.safe!(Promise.reject(new Error('Oops')))).toEqual({
				ok: false,
				error: 'Oops',
			})
		})
	})
})
