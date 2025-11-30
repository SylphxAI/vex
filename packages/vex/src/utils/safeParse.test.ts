import { describe, expect, test } from 'bun:test'
import { positive } from '../validators/number'
import { num, str } from '../validators/primitives'
import { email, min } from '../validators/string'
import { assert, is, parser, safeParse, safeParser, tryParse } from './safeParse'

describe('Safe Parse Utilities', () => {
	describe('tryParse', () => {
		test('returns value on success', () => {
			const tryEmail = tryParse(str(email))
			expect(tryEmail('test@example.com')).toBe('test@example.com')
		})

		test('returns null on error', () => {
			const tryEmail = tryParse(str(email))
			expect(tryEmail('invalid')).toBeNull()
			expect(tryEmail(123 as unknown as string)).toBeNull()
		})

		test('works with simple validators', () => {
			const tryNum = tryParse(num())
			expect(tryNum(42)).toBe(42)
			expect(tryNum('not a number')).toBeNull()
		})

		test('works with string validators', () => {
			const tryStr = tryParse(str())
			expect(tryStr('hello')).toBe('hello')
			expect(tryStr(123)).toBeNull()
		})

		test('works with piped validators', () => {
			const tryPositive = tryParse(num(positive))
			expect(tryPositive(5)).toBe(5)
			expect(tryPositive(-5)).toBeNull()
		})

		test('returns null for undefined input', () => {
			const tryNum = tryParse(num())
			expect(tryNum(undefined)).toBeNull()
		})

		test('returns null for null input', () => {
			const tryNum = tryParse(num())
			expect(tryNum(null)).toBeNull()
		})

		test('falls back to try-catch when no safe method', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			const tryNoSafe = tryParse(noSafe)
			expect(tryNoSafe('hello')).toBe('hello')
			expect(tryNoSafe(123)).toBeNull()
		})

		test('handles validator that throws non-Error', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const tryNonError = tryParse(throwsNonError)
			expect(tryNonError('anything')).toBeNull()
		})

		test('preserves transformed values', () => {
			const transformer = ((v: string) => v.toUpperCase()) as any
			transformer.safe = (v: string) => ({ ok: true, value: v.toUpperCase() })
			const tryTransform = tryParse(transformer)
			expect(tryTransform('hello')).toBe('HELLO')
		})

		test('returns null for empty string when validation fails', () => {
			const tryNonEmpty = tryParse(str(min(1)))
			expect(tryNonEmpty('')).toBeNull()
		})
	})

	describe('safeParse', () => {
		test('returns success result', () => {
			const safeEmail = safeParse(str(email))
			const result = safeEmail('test@example.com')
			expect(result).toEqual({ success: true, data: 'test@example.com' })
		})

		test('returns error result', () => {
			const safeEmail = safeParse(str(email))
			const result = safeEmail('invalid')
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error).toBe('Invalid email')
			}
		})

		test('includes error message', () => {
			const safeNum = safeParse(num())
			const result = safeNum('not a number')
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error).toBe('Expected number')
			}
		})

		test('works with simple validators', () => {
			const safeStr = safeParse(str())
			expect(safeStr('hello')).toEqual({ success: true, data: 'hello' })
			expect(safeStr(123).success).toBe(false)
		})

		test('works with number validators', () => {
			const safeNum = safeParse(num())
			expect(safeNum(42)).toEqual({ success: true, data: 42 })
			expect(safeNum('42').success).toBe(false)
		})

		test('works with piped validators', () => {
			const safePositive = safeParse(num(positive))
			expect(safePositive(5)).toEqual({ success: true, data: 5 })
			expect(safePositive(-5).success).toBe(false)
		})

		test('handles null input', () => {
			const safeNum = safeParse(num())
			const result = safeNum(null)
			expect(result.success).toBe(false)
		})

		test('handles undefined input', () => {
			const safeNum = safeParse(num())
			const result = safeNum(undefined)
			expect(result.success).toBe(false)
		})

		test('falls back to try-catch when no safe method', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			const safeNoSafe = safeParse(noSafe)
			expect(safeNoSafe('hello')).toEqual({ success: true, data: 'hello' })
			expect(safeNoSafe(123)).toEqual({ success: false, error: 'Expected string' })
		})

		test('handles non-Error exception in fallback', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const safeNonError = safeParse(throwsNonError)
			expect(safeNonError('anything')).toEqual({ success: false, error: 'Unknown error' })
		})

		test('handles error with empty message', () => {
			const throwsEmpty = ((_v: unknown) => {
				throw new Error('')
			}) as any
			const safeEmpty = safeParse(throwsEmpty)
			expect(safeEmpty('anything')).toEqual({ success: false, error: '' })
		})

		test('preserves transformed values', () => {
			const transformer = ((v: string) => v.toUpperCase()) as any
			transformer.safe = (v: string) => ({ ok: true, value: v.toUpperCase() })
			const safeTransform = safeParse(transformer)
			expect(safeTransform('hello')).toEqual({ success: true, data: 'HELLO' })
		})
	})

	describe('is', () => {
		test('returns true for valid value', () => {
			const isStr = is(str())
			expect(isStr('hello')).toBe(true)
		})

		test('returns false for invalid value', () => {
			const isStr = is(str())
			expect(isStr(123)).toBe(false)
		})

		test('works with complex validators', () => {
			const isEmail = is(str(email))
			expect(isEmail('test@example.com')).toBe(true)
			expect(isEmail('invalid')).toBe(false)
		})

		test('works with number validators', () => {
			const isNum = is(num())
			expect(isNum(42)).toBe(true)
			expect(isNum('42')).toBe(false)
		})

		test('works with piped validators', () => {
			const isPositive = is(num(positive))
			expect(isPositive(5)).toBe(true)
			expect(isPositive(-5)).toBe(false)
		})

		test('returns false for null', () => {
			const isNum = is(num())
			expect(isNum(null)).toBe(false)
		})

		test('returns false for undefined', () => {
			const isNum = is(num())
			expect(isNum(undefined)).toBe(false)
		})

		test('falls back to try-catch when no safe method', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			const isNoSafe = is(noSafe)
			expect(isNoSafe('hello')).toBe(true)
			expect(isNoSafe(123)).toBe(false)
		})

		test('returns false for throwing validator', () => {
			const throws = ((_v: unknown) => {
				throw new Error('Always fails')
			}) as any
			const isThrows = is(throws)
			expect(isThrows('anything')).toBe(false)
		})

		test('can be used as type guard', () => {
			const isStr = is(str())
			const value: unknown = 'hello'
			if (isStr(value)) {
				// TypeScript should know value is string here
				expect(value.toUpperCase()).toBe('HELLO')
			}
		})
	})

	describe('assert', () => {
		test('does not throw for valid value', () => {
			expect(() => assert(str(), 'hello')).not.toThrow()
		})

		test('throws for invalid value', () => {
			expect(() => assert(str(), 123)).toThrow()
		})

		test('throws with error message', () => {
			expect(() => assert(str(), 123)).toThrow('Expected string')
		})

		test('throws for number validator', () => {
			expect(() => assert(num(), 'not a number')).toThrow('Expected number')
		})

		test('throws for piped validators', () => {
			expect(() => assert(num(positive), -5)).toThrow('Must be positive')
		})

		test('throws for null value', () => {
			expect(() => assert(num(), null)).toThrow()
		})

		test('throws for undefined value', () => {
			expect(() => assert(num(), undefined)).toThrow()
		})

		test('works with complex validators', () => {
			expect(() => assert(str(email), 'invalid')).toThrow('Invalid email')
		})

		test('does not throw for valid email', () => {
			expect(() => assert(str(email), 'test@example.com')).not.toThrow()
		})

		test('provides type narrowing', () => {
			const value: unknown = 'hello'
			assert(str(), value)
			// TypeScript should know value is string after assert
			expect(value.toUpperCase()).toBe('HELLO')
		})
	})

	describe('parser', () => {
		test('creates parser function', () => {
			const parseStr = parser(str())
			expect(parseStr('hello')).toBe('hello')
		})

		test('parser throws on invalid value', () => {
			const parseStr = parser(str())
			expect(() => parseStr(123)).toThrow('Expected string')
		})

		test('works with number validator', () => {
			const parseNum = parser(num())
			expect(parseNum(42)).toBe(42)
			expect(() => parseNum('42')).toThrow()
		})

		test('works with piped validators', () => {
			const parsePositive = parser(num(positive))
			expect(parsePositive(5)).toBe(5)
			expect(() => parsePositive(-5)).toThrow('Must be positive')
		})

		test('preserves transformed values', () => {
			const transformer = ((v: string) => v.toUpperCase()) as any
			transformer.safe = (v: string) => ({ ok: true, value: v.toUpperCase() })
			const parseTransform = parser(transformer)
			expect(parseTransform('hello')).toBe('HELLO')
		})

		test('throws for null input', () => {
			const parseNum = parser(num())
			expect(() => parseNum(null)).toThrow()
		})
	})

	describe('safeParser', () => {
		test('creates safe parser function', () => {
			const parseStr = safeParser(str())
			expect(parseStr('hello')).toEqual({ success: true, data: 'hello' })
		})

		test('returns error result for invalid value', () => {
			const parseStr = safeParser(str())
			const result = parseStr(123)
			expect(result.success).toBe(false)
		})

		test('uses schema safe method when available', () => {
			const parseStr = safeParser(str())
			expect(parseStr('hello')).toEqual({ success: true, data: 'hello' })
		})

		test('works with number validator', () => {
			const parseNum = safeParser(num())
			expect(parseNum(42)).toEqual({ success: true, data: 42 })
			expect(parseNum('42').success).toBe(false)
		})

		test('works with piped validators', () => {
			const parsePositive = safeParser(num(positive))
			expect(parsePositive(5)).toEqual({ success: true, data: 5 })
			expect(parsePositive(-5).success).toBe(false)
		})

		test('falls back to try-catch when no safe method', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as any
			const parseNoSafe = safeParser(noSafe)
			expect(parseNoSafe('hello')).toEqual({ success: true, data: 'hello' })
			expect(parseNoSafe(123).success).toBe(false)
		})

		test('preserves error messages', () => {
			const parseNum = safeParser(num())
			const result = parseNum('invalid')
			if (!result.success) {
				expect(result.error).toBe('Expected number')
			}
		})

		test('handles null input', () => {
			const parseNum = safeParser(num())
			const result = parseNum(null)
			expect(result.success).toBe(false)
		})
	})

	describe('edge cases', () => {
		test('all utilities handle empty string', () => {
			const tryStr = tryParse(str())
			const safeStr = safeParse(str())
			const isStr = is(str())
			const parseStr = parser(str())
			const safeParseStr = safeParser(str())

			expect(tryStr('')).toBe('')
			expect(safeStr('')).toEqual({ success: true, data: '' })
			expect(isStr('')).toBe(true)
			expect(parseStr('')).toBe('')
			expect(safeParseStr('')).toEqual({ success: true, data: '' })
		})

		test('all utilities handle zero', () => {
			const tryNum = tryParse(num())
			const safeNum = safeParse(num())
			const isNum = is(num())
			const parseNum = parser(num())
			const safeParseNum = safeParser(num())

			expect(tryNum(0)).toBe(0)
			expect(safeNum(0)).toEqual({ success: true, data: 0 })
			expect(isNum(0)).toBe(true)
			expect(parseNum(0)).toBe(0)
			expect(safeParseNum(0)).toEqual({ success: true, data: 0 })
		})

		test('all utilities handle false', () => {
			const tryStr = tryParse(str())
			expect(tryStr(false)).toBeNull()
		})

		test('all utilities handle objects', () => {
			const tryNum = tryParse(num())
			expect(tryNum({})).toBeNull()
			expect(tryNum([])).toBeNull()
		})
	})
})
