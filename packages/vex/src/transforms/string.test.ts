import { describe, expect, test } from 'bun:test'
import { str } from '../validators/primitives'
import { email, max, min } from '../validators/string'
import { lower, normalize, trim, trimEnd, trimStart, upper } from './string'

describe('String Transforms', () => {
	describe('trim', () => {
		test('removes whitespace from both ends', () => {
			expect(trim('  hello  ')).toBe('hello')
			expect(trim('\n\thello\n\t')).toBe('hello')
			expect(trim('hello')).toBe('hello')
		})

		test('removes various whitespace characters', () => {
			expect(trim(' \t\n\r\f\v hello \t\n\r\f\v ')).toBe('hello')
		})

		test('handles empty string', () => {
			expect(trim('')).toBe('')
		})

		test('handles string with only whitespace', () => {
			expect(trim('   ')).toBe('')
		})

		test('handles unicode whitespace', () => {
			expect(trim('\u00A0hello\u00A0')).toBe('hello') // non-breaking space
		})

		test('safe version works', () => {
			expect(trim.safe!('  hello  ')).toEqual({ ok: true, value: 'hello' })
		})

		test('Standard Schema support', () => {
			expect(trim['~standard']).toBeDefined()
			expect(trim['~standard']!.validate('  test  ')).toEqual({ value: 'test' })
		})
	})

	describe('trimStart', () => {
		test('removes whitespace from start', () => {
			expect(trimStart('  hello  ')).toBe('hello  ')
			expect(trimStart('\n\thello')).toBe('hello')
			expect(trimStart('hello')).toBe('hello')
		})

		test('preserves trailing whitespace', () => {
			expect(trimStart('  hello world  ')).toBe('hello world  ')
		})

		test('handles empty string', () => {
			expect(trimStart('')).toBe('')
		})

		test('handles string with only leading whitespace', () => {
			expect(trimStart('   hello')).toBe('hello')
		})

		test('safe version works', () => {
			expect(trimStart.safe!('  hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('Standard Schema support', () => {
			expect(trimStart['~standard']).toBeDefined()
			expect(trimStart['~standard']!.validate('  test')).toEqual({ value: 'test' })
		})
	})

	describe('trimEnd', () => {
		test('removes whitespace from end', () => {
			expect(trimEnd('  hello  ')).toBe('  hello')
			expect(trimEnd('hello\n\t')).toBe('hello')
			expect(trimEnd('hello')).toBe('hello')
		})

		test('preserves leading whitespace', () => {
			expect(trimEnd('  hello world  ')).toBe('  hello world')
		})

		test('handles empty string', () => {
			expect(trimEnd('')).toBe('')
		})

		test('handles string with only trailing whitespace', () => {
			expect(trimEnd('hello   ')).toBe('hello')
		})

		test('safe version works', () => {
			expect(trimEnd.safe!('hello  ')).toEqual({ ok: true, value: 'hello' })
		})

		test('Standard Schema support', () => {
			expect(trimEnd['~standard']).toBeDefined()
			expect(trimEnd['~standard']!.validate('test  ')).toEqual({ value: 'test' })
		})
	})

	describe('lower', () => {
		test('converts to lowercase', () => {
			expect(lower('HELLO')).toBe('hello')
			expect(lower('HeLLo WoRLd')).toBe('hello world')
			expect(lower('hello')).toBe('hello')
		})

		test('handles numbers and symbols', () => {
			expect(lower('HELLO123!')).toBe('hello123!')
			expect(lower('ABC@DEF.COM')).toBe('abc@def.com')
		})

		test('handles empty string', () => {
			expect(lower('')).toBe('')
		})

		test('handles unicode characters', () => {
			expect(lower('ÄÖÜÉ')).toBe('äöüé')
		})

		test('safe version works', () => {
			expect(lower.safe!('HELLO')).toEqual({ ok: true, value: 'hello' })
		})

		test('Standard Schema support', () => {
			expect(lower['~standard']).toBeDefined()
			expect(lower['~standard']!.validate('TEST')).toEqual({ value: 'test' })
		})
	})

	describe('upper', () => {
		test('converts to uppercase', () => {
			expect(upper('hello')).toBe('HELLO')
			expect(upper('HeLLo WoRLd')).toBe('HELLO WORLD')
			expect(upper('HELLO')).toBe('HELLO')
		})

		test('handles numbers and symbols', () => {
			expect(upper('hello123!')).toBe('HELLO123!')
			expect(upper('abc@def.com')).toBe('ABC@DEF.COM')
		})

		test('handles empty string', () => {
			expect(upper('')).toBe('')
		})

		test('handles unicode characters', () => {
			expect(upper('äöüé')).toBe('ÄÖÜÉ')
		})

		test('safe version works', () => {
			expect(upper.safe!('hello')).toEqual({ ok: true, value: 'HELLO' })
		})

		test('Standard Schema support', () => {
			expect(upper['~standard']).toBeDefined()
			expect(upper['~standard']!.validate('test')).toEqual({ value: 'TEST' })
		})
	})

	describe('normalize', () => {
		test('normalizes unicode to NFC by default', () => {
			// é can be represented as single char (U+00E9) or combining (e + U+0301)
			const combined = 'e\u0301' // e + combining acute
			const precomposed = '\u00e9' // single char é
			const normalizer = normalize()
			expect(normalizer(combined)).toBe(precomposed)
		})

		test('normalizes to NFD', () => {
			const precomposed = '\u00e9' // single char é
			const normalizer = normalize('NFD')
			expect(normalizer(precomposed)).toBe('e\u0301')
		})

		test('normalizes to NFKC', () => {
			const normalizer = normalize('NFKC')
			// ﬁ ligature becomes fi
			expect(normalizer('\ufb01')).toBe('fi')
		})

		test('normalizes to NFKD', () => {
			const normalizer = normalize('NFKD')
			expect(normalizer('\ufb01')).toBe('fi')
		})

		test('handles already normalized strings', () => {
			const normalizer = normalize()
			expect(normalizer('hello')).toBe('hello')
		})

		test('handles empty string', () => {
			const normalizer = normalize()
			expect(normalizer('')).toBe('')
		})

		test('safe version works', () => {
			const normalizer = normalize()
			expect(normalizer.safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('Standard Schema support', () => {
			const normalizer = normalize()
			expect(normalizer['~standard']).toBeDefined()
			expect(normalizer['~standard']!.validate('test')).toEqual({ value: 'test' })
		})

		test('NFC and NFD roundtrip', () => {
			const nfc = normalize('NFC')
			const nfd = normalize('NFD')
			const original = 'café'
			expect(nfc(nfd(original))).toBe(original)
		})
	})

	describe('transforms in pipe', () => {
		test('can be chained with email validation', () => {
			const normalizeEmail = str(trim, lower, email)
			expect(normalizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com')
		})

		test('can be chained with length validation', () => {
			const trimmedName = str(trim, min(2), max(50))
			expect(trimmedName('  John  ')).toBe('John')
			expect(() => trimmedName('  J  ')).toThrow('Min 2')
		})

		test('can combine trim and normalize', () => {
			const cleanInput = str(trim, normalize())
			expect(cleanInput('  hello  ')).toBe('hello')
		})

		test('can combine trim and case transforms', () => {
			const cleanInput = str(trim, lower)
			expect(cleanInput('  HELLO  ')).toBe('hello')
		})

		test('multiple transforms in sequence', () => {
			const pipeline = str(trimStart, trimEnd, lower)
			expect(pipeline('  HELLO  ')).toBe('hello')
		})

		test('safe version of piped transforms', () => {
			const pipeline = str(trim, lower)
			expect(pipeline.safe!('  HELLO  ')).toEqual({ ok: true, value: 'hello' })
		})

		test('piped transforms with validation failure', () => {
			const pipeline = str(trim, min(5))
			expect(pipeline.safe!('  Hi  ')).toEqual({ ok: false, error: 'Min 5 chars' })
		})
	})

	describe('edge cases', () => {
		test('transforms preserve whitespace in middle', () => {
			expect(trim('  hello   world  ')).toBe('hello   world')
		})

		test('lower handles mixed case with numbers', () => {
			expect(lower('HeLLo123WoRLd456')).toBe('hello123world456')
		})

		test('upper handles mixed case with symbols', () => {
			expect(upper('hello_WORLD-Test')).toBe('HELLO_WORLD-TEST')
		})

		test('transforms are idempotent', () => {
			const text = 'hello world'
			expect(lower(lower(text))).toBe(lower(text))
			expect(upper(upper(text))).toBe(upper(text))
			expect(trim(trim(text))).toBe(trim(text))
		})

		test('transforms handle newlines', () => {
			expect(trim('line1\nline2')).toBe('line1\nline2')
			expect(lower('LINE1\nLINE2')).toBe('line1\nline2')
			expect(upper('line1\nline2')).toBe('LINE1\nLINE2')
		})

		test('transforms handle tabs', () => {
			expect(trim('\thello\t')).toBe('hello')
			expect(lower('\tHELLO\t')).toBe('\thello\t')
		})
	})
})
