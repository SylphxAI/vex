// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { graphemes, maxGraphemes, maxWords, minGraphemes, minWords, notGraphemes, notWords, words } from './text'

describe('validators/text', () => {
	describe('graphemes', () => {
		test('validates exact grapheme count', () => {
			const validator = graphemes(5)
			expect(validator('hello')).toBe('hello')
		})

		test('throws on wrong grapheme count', () => {
			const validator = graphemes(5)
			expect(() => validator('hi')).toThrow('Must have exactly 5 graphemes')
		})

		test('safe version returns success', () => {
			const validator = graphemes(5)
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version returns error', () => {
			const validator = graphemes(5)
			expect(validator.safe!('hi')).toEqual({ ok: false, error: 'Must have exactly 5 graphemes' })
		})

		test('handles emoji correctly', () => {
			// '👨‍👩‍👧‍👦' is 1 grapheme (family emoji)
			const validator = graphemes(1)
			expect(validator('👨‍👩‍👧‍👦')).toBe('👨‍👩‍👧‍👦')
		})
	})

	describe('minGraphemes', () => {
		test('validates minimum grapheme count', () => {
			const validator = minGraphemes(3)
			expect(validator('hello')).toBe('hello')
		})

		test('throws when below minimum', () => {
			const validator = minGraphemes(5)
			expect(() => validator('hi')).toThrow('Must have at least 5 graphemes')
		})

		test('safe version returns success', () => {
			const validator = minGraphemes(3)
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version returns error', () => {
			const validator = minGraphemes(5)
			expect(validator.safe!('hi')).toEqual({ ok: false, error: 'Must have at least 5 graphemes' })
		})
	})

	describe('maxGraphemes', () => {
		test('validates maximum grapheme count', () => {
			const validator = maxGraphemes(10)
			expect(validator('hello')).toBe('hello')
		})

		test('throws when above maximum', () => {
			const validator = maxGraphemes(3)
			expect(() => validator('hello')).toThrow('Must have at most 3 graphemes')
		})

		test('safe version returns success', () => {
			const validator = maxGraphemes(10)
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version returns error', () => {
			const validator = maxGraphemes(3)
			expect(validator.safe!('hello')).toEqual({ ok: false, error: 'Must have at most 3 graphemes' })
		})
	})

	describe('notGraphemes', () => {
		test('passes when grapheme count is different', () => {
			const validator = notGraphemes(3)
			expect(validator('hello')).toBe('hello')
		})

		test('throws when grapheme count matches', () => {
			const validator = notGraphemes(5)
			expect(() => validator('hello')).toThrow('Must not have 5 graphemes')
		})

		test('safe version returns success', () => {
			const validator = notGraphemes(3)
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version returns error', () => {
			const validator = notGraphemes(5)
			expect(validator.safe!('hello')).toEqual({ ok: false, error: 'Must not have 5 graphemes' })
		})
	})

	describe('words', () => {
		test('validates exact word count', () => {
			const validator = words(3)
			expect(validator('hello world foo')).toBe('hello world foo')
		})

		test('throws on wrong word count', () => {
			const validator = words(3)
			expect(() => validator('hello world')).toThrow('Must have exactly 3 words')
		})

		test('safe version returns success', () => {
			const validator = words(2)
			expect(validator.safe!('hello world')).toEqual({ ok: true, value: 'hello world' })
		})

		test('safe version returns error', () => {
			const validator = words(3)
			expect(validator.safe!('hello')).toEqual({ ok: false, error: 'Must have exactly 3 words' })
		})
	})

	describe('minWords', () => {
		test('validates minimum word count', () => {
			const validator = minWords(2)
			expect(validator('hello world foo')).toBe('hello world foo')
		})

		test('throws when below minimum', () => {
			const validator = minWords(3)
			expect(() => validator('hello')).toThrow('Must have at least 3 words')
		})

		test('safe version returns success', () => {
			const validator = minWords(2)
			expect(validator.safe!('hello world')).toEqual({ ok: true, value: 'hello world' })
		})

		test('safe version returns error', () => {
			const validator = minWords(3)
			expect(validator.safe!('hello')).toEqual({ ok: false, error: 'Must have at least 3 words' })
		})
	})

	describe('maxWords', () => {
		test('validates maximum word count', () => {
			const validator = maxWords(5)
			expect(validator('hello world')).toBe('hello world')
		})

		test('throws when above maximum', () => {
			const validator = maxWords(2)
			expect(() => validator('hello world foo bar')).toThrow('Must have at most 2 words')
		})

		test('safe version returns success', () => {
			const validator = maxWords(5)
			expect(validator.safe!('hello world')).toEqual({ ok: true, value: 'hello world' })
		})

		test('safe version returns error', () => {
			const validator = maxWords(2)
			expect(validator.safe!('hello world foo')).toEqual({ ok: false, error: 'Must have at most 2 words' })
		})
	})

	describe('notWords', () => {
		test('passes when word count is different', () => {
			const validator = notWords(3)
			expect(validator('hello world')).toBe('hello world')
		})

		test('throws when word count matches', () => {
			const validator = notWords(2)
			expect(() => validator('hello world')).toThrow('Must not have 2 words')
		})

		test('safe version returns success', () => {
			const validator = notWords(3)
			expect(validator.safe!('hello world')).toEqual({ ok: true, value: 'hello world' })
		})

		test('safe version returns error', () => {
			const validator = notWords(2)
			expect(validator.safe!('hello world')).toEqual({ ok: false, error: 'Must not have 2 words' })
		})
	})
})
