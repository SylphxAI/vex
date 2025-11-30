import { describe, expect, test } from 'bun:test'
import { str } from '../validators/primitives'
import { email } from '../validators/string'
import {
	exactOptional,
	fallback,
	nonNullable,
	nonNullish,
	nonOptional,
	nullable,
	nullish,
	optional,
	undefinedable,
	withDefault,
} from './optional'

describe('Optional Modifiers', () => {
	describe('optional', () => {
		test('allows undefined', () => {
			const optionalEmail = optional(str(email))
			expect(optionalEmail('test@example.com')).toBe('test@example.com')
			expect(optionalEmail(undefined)).toBeUndefined()
		})

		test('validates non-undefined values', () => {
			const optionalEmail = optional(str(email))
			expect(() => optionalEmail('invalid' as unknown)).toThrow()
		})

		test('safe version works', () => {
			const optionalStr = optional(str())
			expect(optionalStr.safe!(undefined)).toEqual({ ok: true, value: undefined })
			expect(optionalStr.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(optionalStr.safe!(123 as unknown)).toHaveProperty('ok', false)
		})

		test('safe version falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const optionalNoSafe = optional(noSafe)
			expect(optionalNoSafe.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(optionalNoSafe.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('safe version handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const optionalThrows = optional(throwsNonError)
			expect(optionalThrows.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})

		test('Standard Schema support', () => {
			const optionalStr = optional(str())
			expect(optionalStr['~standard']).toBeDefined()

			const result = optionalStr['~standard']!.validate(undefined)
			expect(result).toEqual({ value: undefined })
		})
	})

	describe('nullable', () => {
		test('allows null', () => {
			const nullableEmail = nullable(str(email))
			expect(nullableEmail('test@example.com')).toBe('test@example.com')
			expect(nullableEmail(null)).toBeNull()
		})

		test('validates non-null values', () => {
			const nullableEmail = nullable(str(email))
			expect(() => nullableEmail('invalid' as unknown)).toThrow()
		})

		test('safe version works', () => {
			const nullableStr = nullable(str())
			expect(nullableStr.safe!(null)).toEqual({ ok: true, value: null })
			expect(nullableStr.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const nullableNoSafe = nullable(noSafe)
			expect(nullableNoSafe.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(nullableNoSafe.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('safe version handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const nullableThrows = nullable(throwsNonError)
			expect(nullableThrows.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('withDefault', () => {
		test('provides default for undefined', () => {
			const emailWithDefault = withDefault(str(email), 'default@example.com')
			expect(emailWithDefault('test@example.com')).toBe('test@example.com')
			expect(emailWithDefault(undefined)).toBe('default@example.com')
		})

		test('validates non-undefined values', () => {
			const emailWithDefault = withDefault(str(email), 'default@example.com')
			expect(() => emailWithDefault('invalid' as unknown)).toThrow()
		})

		test('safe version works', () => {
			const strWithDefault = withDefault(str(), 'fallback')
			expect(strWithDefault.safe!(undefined)).toEqual({ ok: true, value: 'fallback' })
			expect(strWithDefault.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('uses static default value', () => {
			const strWithDefault = withDefault(str(), 'static')
			expect(strWithDefault(undefined)).toBe('static')
		})

		test('safe returns error on invalid value', () => {
			const strWithDefault = withDefault(str(), 'fallback')
			expect(strWithDefault.safe!(123 as unknown)).toHaveProperty('ok', false)
		})

		test('safe version falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const withDefaultNoSafe = withDefault(noSafe, 'default')
			expect(withDefaultNoSafe.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(withDefaultNoSafe.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('safe version handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const withDefaultThrows = withDefault(throwsNonError, 'default')
			expect(withDefaultThrows.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('nullish', () => {
		test('allows null', () => {
			const nullishStr = nullish(str())
			expect(nullishStr(null)).toBeNull()
		})

		test('allows undefined', () => {
			const nullishStr = nullish(str())
			expect(nullishStr(undefined)).toBeUndefined()
		})

		test('validates non-nullish values', () => {
			const nullishStr = nullish(str())
			expect(nullishStr('hello')).toBe('hello')
		})

		test('throws on invalid value', () => {
			const nullishStr = nullish(str())
			expect(() => nullishStr(123 as unknown)).toThrow()
		})

		test('safe version with null', () => {
			const nullishStr = nullish(str())
			expect(nullishStr.safe!(null)).toEqual({ ok: true, value: null })
		})

		test('safe version with undefined', () => {
			const nullishStr = nullish(str())
			expect(nullishStr.safe!(undefined)).toEqual({ ok: true, value: undefined })
		})

		test('safe version with valid value', () => {
			const nullishStr = nullish(str())
			expect(nullishStr.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const nullishNoSafe = nullish(noSafe)
			expect(nullishNoSafe.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(nullishNoSafe.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('safe version handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const nullishThrows = nullish(throwsNonError)
			expect(nullishThrows.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('undefinedable', () => {
		test('is alias for optional', () => {
			expect(undefinedable).toBe(optional)
		})
	})

	describe('exactOptional', () => {
		test('allows undefined', () => {
			const exactOptionalStr = exactOptional(str())
			expect(exactOptionalStr(undefined)).toBeUndefined()
		})

		test('validates defined values', () => {
			const exactOptionalStr = exactOptional(str())
			expect(exactOptionalStr('hello')).toBe('hello')
		})

		test('safe version works', () => {
			const exactOptionalStr = exactOptional(str())
			expect(exactOptionalStr.safe!(undefined)).toEqual({ ok: true, value: undefined })
			expect(exactOptionalStr.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const exactOptionalNoSafe = exactOptional(noSafe)
			expect(exactOptionalNoSafe.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(exactOptionalNoSafe.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('safe version handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const exactOptionalThrows = exactOptional(throwsNonError)
			expect(exactOptionalThrows.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('nonNullable', () => {
		test('throws on null result', () => {
			const maybeNull = ((v: unknown) => (v === 'null' ? null : v)) as any
			const validator = nonNullable(maybeNull)
			expect(() => validator('null')).toThrow('Value cannot be null')
		})

		test('passes non-null value', () => {
			const maybeNull = ((v: unknown) => v) as any
			const validator = nonNullable(maybeNull)
			expect(validator('hello')).toBe('hello')
		})

		test('safe version returns error on null', () => {
			const maybeNull = ((v: unknown) => (v === 'null' ? null : v)) as any
			maybeNull.safe = (v: unknown) => ({ ok: true, value: v === 'null' ? null : v })
			const validator = nonNullable(maybeNull)
			expect(validator.safe!('null')).toEqual({ ok: false, error: 'Value cannot be null' })
		})

		test('safe passes through underlying error', () => {
			const failing = ((_v: unknown) => {
				throw new Error('fail')
			}) as any
			failing.safe = (_v: unknown) => ({ ok: false, error: 'fail' })
			const validator = nonNullable(failing)
			expect(validator.safe!('test')).toEqual({ ok: false, error: 'fail' })
		})

		test('safe falls back to try-catch', () => {
			const maybeNull = ((v: unknown) => (v === 'null' ? null : v)) as any
			const validator = nonNullable(maybeNull)
			expect(validator.safe!('null')).toEqual({ ok: false, error: 'Value cannot be null' })
		})

		test('safe falls back with success result', () => {
			const maybeNull = ((v: unknown) => v) as any
			const validator = nonNullable(maybeNull)
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const validator = nonNullable(throwsNonError)
			expect(validator.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('nonNullish', () => {
		test('throws on null result', () => {
			const maybeNullish = ((v: unknown) => (v === 'null' ? null : v)) as any
			const validator = nonNullish(maybeNullish)
			expect(() => validator('null')).toThrow('Value cannot be null or undefined')
		})

		test('throws on undefined result', () => {
			const maybeNullish = ((v: unknown) => (v === 'undef' ? undefined : v)) as any
			const validator = nonNullish(maybeNullish)
			expect(() => validator('undef')).toThrow('Value cannot be null or undefined')
		})

		test('passes valid value', () => {
			const maybeNullish = ((v: unknown) => v) as any
			const validator = nonNullish(maybeNullish)
			expect(validator('hello')).toBe('hello')
		})

		test('safe version returns error on null', () => {
			const maybeNullish = ((v: unknown) => (v === 'null' ? null : v)) as any
			maybeNullish.safe = (v: unknown) => ({ ok: true, value: v === 'null' ? null : v })
			const validator = nonNullish(maybeNullish)
			expect(validator.safe!('null')).toEqual({ ok: false, error: 'Value cannot be null or undefined' })
		})

		test('safe version returns error on undefined', () => {
			const maybeNullish = ((v: unknown) => (v === 'undef' ? undefined : v)) as any
			maybeNullish.safe = (v: unknown) => ({ ok: true, value: v === 'undef' ? undefined : v })
			const validator = nonNullish(maybeNullish)
			expect(validator.safe!('undef')).toEqual({ ok: false, error: 'Value cannot be null or undefined' })
		})

		test('safe falls back to try-catch', () => {
			const maybeNullish = ((v: unknown) => (v === 'null' ? null : v)) as any
			const validator = nonNullish(maybeNullish)
			expect(validator.safe!('null')).toEqual({ ok: false, error: 'Value cannot be null or undefined' })
		})

		test('safe falls back with success result', () => {
			const maybeNullish = ((v: unknown) => v) as any
			const validator = nonNullish(maybeNullish)
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const validator = nonNullish(throwsNonError)
			expect(validator.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('nonOptional', () => {
		test('throws on undefined result', () => {
			const maybeUndef = ((v: unknown) => (v === 'undef' ? undefined : v)) as any
			const validator = nonOptional(maybeUndef)
			expect(() => validator('undef')).toThrow('Value cannot be undefined')
		})

		test('passes defined value', () => {
			const maybeUndef = ((v: unknown) => v) as any
			const validator = nonOptional(maybeUndef)
			expect(validator('hello')).toBe('hello')
		})

		test('safe version returns error on undefined', () => {
			const maybeUndef = ((v: unknown) => (v === 'undef' ? undefined : v)) as any
			maybeUndef.safe = (v: unknown) => ({ ok: true, value: v === 'undef' ? undefined : v })
			const validator = nonOptional(maybeUndef)
			expect(validator.safe!('undef')).toEqual({ ok: false, error: 'Value cannot be undefined' })
		})

		test('safe passes through underlying error', () => {
			const failing = ((_v: unknown) => {
				throw new Error('fail')
			}) as any
			failing.safe = (_v: unknown) => ({ ok: false, error: 'fail' })
			const validator = nonOptional(failing)
			expect(validator.safe!('test')).toEqual({ ok: false, error: 'fail' })
		})

		test('safe falls back to try-catch', () => {
			const maybeUndef = ((v: unknown) => (v === 'undef' ? undefined : v)) as any
			const validator = nonOptional(maybeUndef)
			expect(validator.safe!('undef')).toEqual({ ok: false, error: 'Value cannot be undefined' })
		})

		test('safe falls back with success result', () => {
			const maybeUndef = ((v: unknown) => v) as any
			const validator = nonOptional(maybeUndef)
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const validator = nonOptional(throwsNonError)
			expect(validator.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('fallback', () => {
		test('returns value on success', () => {
			const validator = fallback(str(), 'default')
			expect(validator('hello')).toBe('hello')
		})

		test('returns fallback on error', () => {
			const validator = fallback(str(), 'default')
			expect(validator(123 as unknown)).toBe('default')
		})

		test('uses static fallback value', () => {
			const validator = fallback(str(), 'static')
			expect(validator(123 as unknown)).toBe('static')
		})

		test('safe version returns value on success', () => {
			const validator = fallback(str(), 'default')
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version returns fallback on error', () => {
			const validator = fallback(str(), 'default')
			expect(validator.safe!(123 as unknown)).toEqual({ ok: true, value: 'default' })
		})

		test('safe uses underlying safe method', () => {
			const validator = fallback(str(), 'default')
			const result = validator.safe!(123 as unknown)
			expect(result).toEqual({ ok: true, value: 'default' })
		})

		test('safe falls back to try-catch on success', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const validator = fallback(noSafe, 'default')
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe falls back to try-catch on failure', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const validator = fallback(noSafe, 'default')
			expect(validator.safe!(123)).toEqual({ ok: true, value: 'default' })
		})
	})
})
