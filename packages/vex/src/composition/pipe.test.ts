import { describe, expect, test } from 'bun:test'
import { finite, gte, int, lte, positive } from '../validators/number'
import { bool, date, num, str } from '../validators/primitives'
import { email, endsWith, max, min, nonempty, startsWith, url } from '../validators/string'
import { pipe } from './pipe'

describe('Pipe Composition', () => {
	describe('basic chaining', () => {
		test('combines two validators', () => {
			const validateEmail = str(email)
			expect(validateEmail('test@example.com')).toBe('test@example.com')
			expect(() => validateEmail(123)).toThrow()
			expect(() => validateEmail('invalid')).toThrow()
		})

		test('chains multiple validators', () => {
			const validateAge = num(int, gte(0), lte(150))
			expect(validateAge(25)).toBe(25)
			expect(validateAge(0)).toBe(0)
			expect(validateAge(150)).toBe(150)
			expect(() => validateAge(-1)).toThrow()
			expect(() => validateAge(200)).toThrow()
			expect(() => validateAge(25.5)).toThrow()
		})

		test('with single validator', () => {
			const validateStr = str()
			expect(validateStr('hello')).toBe('hello')
			expect(() => validateStr(123)).toThrow()
		})

		test('with three validators', () => {
			const validateUrl = str(url, nonempty)
			expect(validateUrl('https://example.com')).toBe('https://example.com')
			expect(() => validateUrl('invalid')).toThrow()
		})

		test('with string length validators', () => {
			const validateName = str(nonempty, min(2), max(50))
			expect(validateName('John')).toBe('John')
			expect(() => validateName('')).toThrow('Required')
			expect(() => validateName('J')).toThrow('Min 2')
			expect(() => validateName('J'.repeat(51))).toThrow('Max 50')
		})

		test('with string prefix/suffix validators', () => {
			const validateProtocol = str(startsWith('https://'), endsWith('.com'))
			expect(validateProtocol('https://example.com')).toBe('https://example.com')
			expect(() => validateProtocol('http://example.com')).toThrow()
			expect(() => validateProtocol('https://example.org')).toThrow()
		})

		test('with number validators', () => {
			const validatePositiveInt = num(positive, int)
			expect(validatePositiveInt(1)).toBe(1)
			expect(validatePositiveInt(100)).toBe(100)
			expect(() => validatePositiveInt(0)).toThrow()
			expect(() => validatePositiveInt(-1)).toThrow()
			expect(() => validatePositiveInt(1.5)).toThrow()
		})

		test('with finite number validator', () => {
			const validateFinite = num(finite)
			expect(validateFinite(0)).toBe(0)
			expect(validateFinite(-999)).toBe(-999)
			expect(() => validateFinite(Infinity)).toThrow()
			expect(() => validateFinite(-Infinity)).toThrow()
		})
	})

	describe('safe version', () => {
		test('returns ok for valid value', () => {
			const validateEmail = str(email)
			expect(validateEmail.safe!('test@example.com')).toEqual({
				ok: true,
				value: 'test@example.com',
			})
		})

		test('returns error for invalid format', () => {
			const validateEmail = str(email)
			expect(validateEmail.safe!('invalid')).toHaveProperty('ok', false)
		})

		test('returns error for wrong type', () => {
			const validateEmail = str(email)
			expect(validateEmail.safe!(123)).toHaveProperty('ok', false)
		})

		test('returns error at first failure', () => {
			const validateAge = num(int, gte(0))
			expect(validateAge.safe!('not a number')).toHaveProperty('ok', false)
			expect(validateAge.safe!(3.14)).toEqual({ ok: false, error: 'Must be integer' })
			expect(validateAge.safe!(-1)).toEqual({ ok: false, error: 'Min 0' })
		})

		test('works with multiple validators in sequence', () => {
			const validateName = str(nonempty, min(2), max(50))
			expect(validateName.safe!('John')).toEqual({ ok: true, value: 'John' })
			expect(validateName.safe!('')).toEqual({ ok: false, error: 'Required' })
		})

		test('falls back to try-catch when no safe method', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const piped = pipe(noSafe, nonempty)
			expect(piped.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(piped.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const piped = pipe(throwsNonError)
			expect(piped.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const validateEmail = str(email)
			expect(validateEmail['~standard']).toBeDefined()
			expect(validateEmail['~standard']!.version).toBe(1)
			expect(validateEmail['~standard']!.vendor).toBe('vex')
		})

		test('validate returns value on success', () => {
			const validateEmail = str(email)
			const result = validateEmail['~standard']!.validate('test@example.com')
			expect(result).toEqual({ value: 'test@example.com' })
		})

		test('validate returns issues on format failure', () => {
			const validateEmail = str(email)
			const error = validateEmail['~standard']!.validate('invalid')
			expect(error).toHaveProperty('issues')
			expect(error.issues![0].message).toBe('Invalid email')
		})

		test('validate returns issues on type failure', () => {
			const validateNum = num(positive)
			const error = validateNum['~standard']!.validate('not a number')
			expect(error).toHaveProperty('issues')
			expect(error.issues![0].message).toBe('Expected number')
		})

		test('validate returns first issue in chain', () => {
			const validateAge = num(int, gte(0))
			const error1 = validateAge['~standard']!.validate(3.14)
			expect(error1.issues![0].message).toBe('Must be integer')

			const error2 = validateAge['~standard']!.validate(-5)
			expect(error2.issues![0].message).toBe('Min 0')
		})

		test('falls back to try-catch', () => {
			const noStandard = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const piped = pipe(noStandard)
			const result = piped['~standard']!.validate(123)
			expect(result.issues![0].message).toBe('Must be string')
		})
	})

	describe('edge cases', () => {
		test('handles undefined input', () => {
			const validate = str()
			expect(() => validate(undefined)).toThrow()
		})

		test('handles null input', () => {
			const validate = str()
			expect(() => validate(null)).toThrow()
		})

		test('handles empty string', () => {
			const validate = str()
			expect(validate('')).toBe('')
		})

		test('handles zero', () => {
			const validate = num(gte(0))
			expect(validate(0)).toBe(0)
		})

		test('handles negative zero', () => {
			const validate = num(gte(-1))
			expect(validate(-0)).toBe(-0)
		})

		test('handles boolean input', () => {
			const validate = bool()
			expect(validate(true)).toBe(true)
			expect(validate(false)).toBe(false)
		})

		test('handles date input', () => {
			const d = new Date()
			const validate = date()
			expect(validate(d)).toBe(d)
		})

		test('preserves object identity', () => {
			const validateNum = num(positive)
			const input = 42
			const result = validateNum(input)
			expect(result).toBe(input)
		})
	})

	describe('pipe for transforms', () => {
		test('pipe still works with factory functions', () => {
			// pipe() is still useful when you need to compose with transforms
			const validateNum = pipe(num(), int)
			expect(validateNum(42)).toBe(42)
			expect(() => validateNum(3.14)).toThrow()
		})
	})
})
