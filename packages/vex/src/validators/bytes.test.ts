// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { bytes, maxBytes, minBytes, notBytes } from './bytes'

describe('bytes', () => {
	const validate4Bytes = bytes(4)

	test('accepts string with exact byte length', () => {
		expect(validate4Bytes('abcd')).toBe('abcd')
		expect(validate4Bytes('test')).toBe('test')
	})

	test('rejects string with different byte length', () => {
		expect(() => validate4Bytes('abc')).toThrow('Must be 4 bytes')
		expect(() => validate4Bytes('abcde')).toThrow('Must be 4 bytes')
		expect(() => validate4Bytes('')).toThrow('Must be 4 bytes')
	})

	test('handles multi-byte characters correctly', () => {
		// "日" is 3 bytes in UTF-8
		const validate3Bytes = bytes(3)
		expect(validate3Bytes('日')).toBe('日')

		// emoji is 4 bytes
		expect(validate4Bytes('😀')).toBe('😀')
	})

	describe('safe', () => {
		test('returns ok result for valid byte length', () => {
			expect(validate4Bytes.safe!('abcd')).toEqual({ ok: true, value: 'abcd' })
		})

		test('returns error for invalid byte length', () => {
			expect(validate4Bytes.safe!('abc')).toEqual({ ok: false, error: 'Must be 4 bytes' })
			expect(validate4Bytes.safe!('abcde')).toEqual({ ok: false, error: 'Must be 4 bytes' })
		})

		test('handles multi-byte characters', () => {
			const validate3Bytes = bytes(3)
			expect(validate3Bytes.safe!('日')).toEqual({ ok: true, value: '日' })
			expect(validate3Bytes.safe!('a')).toEqual({ ok: false, error: 'Must be 3 bytes' })
		})
	})

	test('zero bytes', () => {
		const validate0Bytes = bytes(0)
		expect(validate0Bytes('')).toBe('')
		expect(() => validate0Bytes('a')).toThrow('Must be 0 bytes')
	})
})

describe('minBytes', () => {
	const validateMinBytes = minBytes(3)

	test('accepts string with at least n bytes', () => {
		expect(validateMinBytes('abc')).toBe('abc')
		expect(validateMinBytes('abcd')).toBe('abcd')
		expect(validateMinBytes('abcdefgh')).toBe('abcdefgh')
	})

	test('rejects string with fewer bytes', () => {
		expect(() => validateMinBytes('ab')).toThrow('Must be at least 3 bytes')
		expect(() => validateMinBytes('a')).toThrow('Must be at least 3 bytes')
		expect(() => validateMinBytes('')).toThrow('Must be at least 3 bytes')
	})

	test('handles multi-byte characters', () => {
		// "日" is 3 bytes in UTF-8
		expect(validateMinBytes('日')).toBe('日')
		expect(() => validateMinBytes('a')).toThrow() // 1 byte
	})

	describe('safe', () => {
		test('returns ok result for valid byte length', () => {
			expect(validateMinBytes.safe!('abc')).toEqual({ ok: true, value: 'abc' })
			expect(validateMinBytes.safe!('abcd')).toEqual({ ok: true, value: 'abcd' })
		})

		test('returns error for insufficient bytes', () => {
			expect(validateMinBytes.safe!('ab')).toEqual({ ok: false, error: 'Must be at least 3 bytes' })
		})
	})

	test('minBytes(0) accepts empty string', () => {
		const validate = minBytes(0)
		expect(validate('')).toBe('')
		expect(validate('a')).toBe('a')
	})
})

describe('maxBytes', () => {
	const validateMaxBytes = maxBytes(5)

	test('accepts string with at most n bytes', () => {
		expect(validateMaxBytes('')).toBe('')
		expect(validateMaxBytes('a')).toBe('a')
		expect(validateMaxBytes('abcde')).toBe('abcde')
	})

	test('rejects string with too many bytes', () => {
		expect(() => validateMaxBytes('abcdef')).toThrow('Must be at most 5 bytes')
		expect(() => validateMaxBytes('abcdefghij')).toThrow('Must be at most 5 bytes')
	})

	test('handles multi-byte characters', () => {
		// "日" is 3 bytes, so 2 of them = 6 bytes
		expect(() => validateMaxBytes('日日')).toThrow('Must be at most 5 bytes')
		expect(validateMaxBytes('日')).toBe('日') // 3 bytes
	})

	describe('safe', () => {
		test('returns ok result for valid byte length', () => {
			expect(validateMaxBytes.safe!('')).toEqual({ ok: true, value: '' })
			expect(validateMaxBytes.safe!('abc')).toEqual({ ok: true, value: 'abc' })
		})

		test('returns error for too many bytes', () => {
			expect(validateMaxBytes.safe!('abcdef')).toEqual({ ok: false, error: 'Must be at most 5 bytes' })
		})
	})

	test('maxBytes(0) only accepts empty string', () => {
		const validate = maxBytes(0)
		expect(validate('')).toBe('')
		expect(() => validate('a')).toThrow('Must be at most 0 bytes')
	})
})

describe('notBytes', () => {
	const validateNotBytes = notBytes(0)

	test('accepts string with different byte length', () => {
		expect(validateNotBytes('a')).toBe('a')
		expect(validateNotBytes('abc')).toBe('abc')
		expect(validateNotBytes('日')).toBe('日')
	})

	test('rejects string with exact byte length', () => {
		expect(() => validateNotBytes('')).toThrow('Must not be 0 bytes')
	})

	test('notBytes(5) rejects 5-byte strings', () => {
		const validateNot5 = notBytes(5)
		expect(validateNot5('abcd')).toBe('abcd') // 4 bytes
		expect(validateNot5('abcdef')).toBe('abcdef') // 6 bytes
		expect(() => validateNot5('abcde')).toThrow('Must not be 5 bytes')
	})

	describe('safe', () => {
		test('returns ok result for different byte length', () => {
			expect(validateNotBytes.safe!('a')).toEqual({ ok: true, value: 'a' })
		})

		test('returns error for exact byte length', () => {
			expect(validateNotBytes.safe!('')).toEqual({ ok: false, error: 'Must not be 0 bytes' })
		})
	})
})

describe('edge cases', () => {
	test('combining byte validators', () => {
		// String must be between 2 and 5 bytes
		const minV = minBytes(2)
		const maxV = maxBytes(5)

		const validate = (s: string) => maxV(minV(s))

		expect(validate('ab')).toBe('ab')
		expect(validate('abcde')).toBe('abcde')
		expect(() => validate('a')).toThrow()
		expect(() => validate('abcdef')).toThrow()
	})

	test('various multi-byte unicode', () => {
		// Different UTF-8 byte lengths:
		// ASCII: 1 byte each
		// Latin extended: 2 bytes (e.g., "é")
		// CJK: 3 bytes (e.g., "日")
		// Emoji: 4 bytes (e.g., "😀")

		expect(bytes(1)('a')).toBe('a') // ASCII
		expect(bytes(2)('é')).toBe('é') // 2-byte char
		expect(bytes(3)('日')).toBe('日') // 3-byte char
		expect(bytes(4)('😀')).toBe('😀') // 4-byte emoji
	})
})
