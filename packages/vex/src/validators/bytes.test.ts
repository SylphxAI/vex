import { describe, expect, test } from 'bun:test'
import { bytes, maxBytes, minBytes, notBytes } from './bytes'
import { str } from './primitives'

describe('Bytes Validators', () => {
	describe('bytes', () => {
		test('validates exact byte length', () => {
			expect(bytes(5)('hello')).toBe('hello')
			expect(() => bytes(5)('hi')).toThrow('Must be 5 bytes')
			expect(() => bytes(5)('hello!')).toThrow('Must be 5 bytes')
		})

		test('handles multi-byte characters', () => {
			// '你好' is 6 bytes in UTF-8
			expect(bytes(6)('你好')).toBe('你好')
			expect(() => bytes(2)('你好')).toThrow('Must be 2 bytes')
		})

		test('validates empty string with zero bytes', () => {
			expect(bytes(0)('')).toBe('')
			expect(() => bytes(0)('a')).toThrow('Must be 0 bytes')
		})

		test('handles emoji characters', () => {
			// '👋' is 4 bytes in UTF-8
			expect(bytes(4)('👋')).toBe('👋')
			expect(() => bytes(1)('👋')).toThrow('Must be 1 bytes')
		})

		test('handles combining characters', () => {
			// 'é' as e + combining acute is 3 bytes
			const combined = 'e\u0301'
			expect(bytes(3)(combined)).toBe(combined)
		})

		test('validates various unicode characters', () => {
			// '€' is 3 bytes in UTF-8
			expect(bytes(3)('€')).toBe('€')
			// '¢' is 2 bytes
			expect(bytes(2)('¢')).toBe('¢')
		})

		test('safe version returns success', () => {
			expect(bytes(5).safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version returns error', () => {
			expect(bytes(5).safe!('hi')).toEqual({ ok: false, error: 'Must be 5 bytes' })
		})

		test('safe version with multi-byte', () => {
			expect(bytes(6).safe!('你好')).toEqual({ ok: true, value: '你好' })
			expect(bytes(2).safe!('你好')).toEqual({ ok: false, error: 'Must be 2 bytes' })
		})

		test('Standard Schema support', () => {
			const validator = bytes(5)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.version).toBe(1)
			expect(validator['~standard']!.vendor).toBe('vex')
		})

		test('Standard Schema validate success', () => {
			const validator = bytes(5)
			expect(validator['~standard']!.validate('hello')).toEqual({ value: 'hello' })
		})

		test('Standard Schema validate failure', () => {
			const validator = bytes(5)
			const result = validator['~standard']!.validate('hi')
			expect(result.issues![0].message).toBe('Must be 5 bytes')
		})

		test('works in pipe', () => {
			const validate = str(bytes(5))
			expect(validate('hello')).toBe('hello')
			expect(() => validate('hi')).toThrow('Must be 5 bytes')
		})
	})

	describe('minBytes', () => {
		test('validates minimum byte length', () => {
			expect(minBytes(3)('hello')).toBe('hello')
			expect(minBytes(3)('abc')).toBe('abc')
			expect(() => minBytes(3)('ab')).toThrow('Must be at least 3 bytes')
		})

		test('validates exactly at minimum', () => {
			expect(minBytes(5)('hello')).toBe('hello')
		})

		test('validates above minimum', () => {
			expect(minBytes(3)('hello world')).toBe('hello world')
		})

		test('validates with zero minimum', () => {
			expect(minBytes(0)('')).toBe('')
			expect(minBytes(0)('a')).toBe('a')
		})

		test('handles multi-byte characters', () => {
			expect(minBytes(6)('你好')).toBe('你好')
			expect(() => minBytes(7)('你好')).toThrow('Must be at least 7 bytes')
		})

		test('safe version returns success', () => {
			expect(minBytes(3).safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version returns error', () => {
			expect(minBytes(3).safe!('ab')).toEqual({ ok: false, error: 'Must be at least 3 bytes' })
		})

		test('Standard Schema support', () => {
			const validator = minBytes(3)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate('hello')).toEqual({ value: 'hello' })
		})

		test('Standard Schema returns issues', () => {
			const validator = minBytes(5)
			const result = validator['~standard']!.validate('ab')
			expect(result.issues![0].message).toBe('Must be at least 5 bytes')
		})

		test('works in pipe', () => {
			const validate = str(minBytes(3))
			expect(validate('hello')).toBe('hello')
			expect(() => validate('ab')).toThrow('Must be at least 3 bytes')
		})
	})

	describe('maxBytes', () => {
		test('validates maximum byte length', () => {
			expect(maxBytes(10)('hello')).toBe('hello')
			expect(() => maxBytes(3)('hello')).toThrow('Must be at most 3 bytes')
		})

		test('validates exactly at maximum', () => {
			expect(maxBytes(5)('hello')).toBe('hello')
		})

		test('validates below maximum', () => {
			expect(maxBytes(10)('hi')).toBe('hi')
		})

		test('validates empty string', () => {
			expect(maxBytes(5)('')).toBe('')
			expect(maxBytes(0)('')).toBe('')
		})

		test('handles multi-byte characters', () => {
			expect(maxBytes(6)('你好')).toBe('你好')
			expect(() => maxBytes(5)('你好')).toThrow('Must be at most 5 bytes')
		})

		test('handles emoji', () => {
			expect(() => maxBytes(3)('👋')).toThrow('Must be at most 3 bytes')
			expect(maxBytes(4)('👋')).toBe('👋')
		})

		test('safe version returns success', () => {
			expect(maxBytes(10).safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version returns error', () => {
			expect(maxBytes(3).safe!('hello')).toEqual({ ok: false, error: 'Must be at most 3 bytes' })
		})

		test('Standard Schema support', () => {
			const validator = maxBytes(10)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate('hello')).toEqual({ value: 'hello' })
		})

		test('Standard Schema returns issues', () => {
			const validator = maxBytes(3)
			const result = validator['~standard']!.validate('hello')
			expect(result.issues![0].message).toBe('Must be at most 3 bytes')
		})

		test('works in pipe', () => {
			const validate = str(maxBytes(10))
			expect(validate('hello')).toBe('hello')
			expect(() => validate('hello world!')).toThrow('Must be at most 10 bytes')
		})
	})

	describe('notBytes', () => {
		test('validates byte length is not n', () => {
			expect(notBytes(5)('hi')).toBe('hi')
			expect(notBytes(5)('hello!')).toBe('hello!')
			expect(() => notBytes(5)('hello')).toThrow('Must not be 5 bytes')
		})

		test('validates empty string is not zero', () => {
			expect(() => notBytes(0)('')).toThrow('Must not be 0 bytes')
			expect(notBytes(0)('a')).toBe('a')
		})

		test('handles multi-byte characters', () => {
			expect(notBytes(6)('hello')).toBe('hello')
			expect(() => notBytes(6)('你好')).toThrow('Must not be 6 bytes')
		})

		test('safe version returns success', () => {
			expect(notBytes(5).safe!('hi')).toEqual({ ok: true, value: 'hi' })
		})

		test('safe version returns error', () => {
			expect(notBytes(5).safe!('hello')).toEqual({ ok: false, error: 'Must not be 5 bytes' })
		})

		test('Standard Schema support', () => {
			const validator = notBytes(5)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate('hi')).toEqual({ value: 'hi' })
		})

		test('Standard Schema returns issues', () => {
			const validator = notBytes(5)
			const result = validator['~standard']!.validate('hello')
			expect(result.issues![0].message).toBe('Must not be 5 bytes')
		})

		test('works in pipe', () => {
			const validate = str(notBytes(0))
			expect(validate('hello')).toBe('hello')
			expect(() => validate('')).toThrow('Must not be 0 bytes')
		})
	})

	describe('combined validators', () => {
		test('minBytes and maxBytes together', () => {
			const validate = str(minBytes(3), maxBytes(10))
			expect(validate('hello')).toBe('hello')
			expect(() => validate('ab')).toThrow('Must be at least 3 bytes')
			expect(() => validate('hello world!')).toThrow('Must be at most 10 bytes')
		})

		test('bytes with notBytes', () => {
			const validate = str(minBytes(1), notBytes(5))
			expect(validate('hi')).toBe('hi')
			expect(validate('hello!')).toBe('hello!')
			expect(() => validate('hello')).toThrow('Must not be 5 bytes')
		})
	})

	describe('edge cases', () => {
		test('handles very long strings', () => {
			const longString = 'a'.repeat(1000)
			expect(bytes(1000)(longString)).toBe(longString)
			expect(minBytes(500)(longString)).toBe(longString)
			expect(maxBytes(1500)(longString)).toBe(longString)
		})

		test('handles strings with null characters', () => {
			const withNull = 'a\0b'
			expect(bytes(3)(withNull)).toBe(withNull)
		})

		test('handles newlines and tabs', () => {
			expect(bytes(2)('\n\t')).toBe('\n\t')
		})

		test('handles mixed ascii and unicode', () => {
			const mixed = 'hi你好' // 2 + 6 = 8 bytes
			expect(bytes(8)(mixed)).toBe(mixed)
		})
	})
})
