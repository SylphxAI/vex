// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { check, custom, customAsync } from './custom'
import { num, str } from './primitives'

describe('validators/custom', () => {
	describe('custom', () => {
		test('passes when predicate returns true', () => {
			const isPositive = custom<number>((v) => v > 0, 'Must be positive')
			expect(isPositive(5)).toBe(5)
			expect(isPositive(100)).toBe(100)
			expect(isPositive(0.1)).toBe(0.1)
		})

		test('throws when predicate returns false', () => {
			const isPositive = custom<number>((v) => v > 0, 'Must be positive')
			expect(() => isPositive(-1)).toThrow('Must be positive')
			expect(() => isPositive(0)).toThrow('Must be positive')
			expect(() => isPositive(-100)).toThrow('Must be positive')
		})

		test('validates strings', () => {
			const isCapitalized = custom<string>((v) => v[0] === v[0].toUpperCase(), 'Must be capitalized')
			expect(isCapitalized('Hello')).toBe('Hello')
			expect(() => isCapitalized('hello')).toThrow('Must be capitalized')
		})

		test('validates complex objects', () => {
			const hasName = custom<{ name: string }>((v) => v.name.length > 0, 'Must have name')
			expect(hasName({ name: 'John' })).toEqual({ name: 'John' })
			expect(() => hasName({ name: '' })).toThrow('Must have name')
		})

		test('validates arrays', () => {
			const hasItems = custom<number[]>((v) => v.length > 0, 'Must have items')
			expect(hasItems([1, 2, 3])).toEqual([1, 2, 3])
			expect(() => hasItems([])).toThrow('Must have items')
		})

		test('safe version returns success', () => {
			const isPositive = custom<number>((v) => v > 0, 'Must be positive')
			expect(isPositive.safe!(5)).toEqual({ ok: true, value: 5 })
		})

		test('safe version returns error', () => {
			const isPositive = custom<number>((v) => v > 0, 'Must be positive')
			expect(isPositive.safe!(-1)).toEqual({ ok: false, error: 'Must be positive' })
		})

		test('uses default message', () => {
			const isPositive = custom<number>((v) => v > 0)
			expect(() => isPositive(-1)).toThrow('Validation failed')
		})

		test('handles predicate that throws', () => {
			const throws = custom<number>(() => {
				throw new Error('inner error')
			}, 'Custom message')
			// Safe method catches and returns the preset message
			expect(throws.safe!(1)).toEqual({ ok: false, error: 'Custom message' })
		})

		test('Standard Schema support', () => {
			const isPositive = custom<number>((v) => v > 0, 'Must be positive')
			expect(isPositive['~standard']).toBeDefined()
			expect(isPositive['~standard']!.version).toBe(1)
			expect(isPositive['~standard']!.vendor).toBe('vex')
		})

		test('Standard Schema validate success', () => {
			const isPositive = custom<number>((v) => v > 0, 'Must be positive')
			expect(isPositive['~standard']!.validate(5)).toEqual({ value: 5 })
		})

		test('Standard Schema validate failure', () => {
			const isPositive = custom<number>((v) => v > 0, 'Must be positive')
			const result = isPositive['~standard']!.validate(-1)
			expect(result.issues![0].message).toBe('Must be positive')
		})

		test('works in pipe with primitive validator', () => {
			const isPositive = custom<number>((v) => v > 0, 'Must be positive')
			const validate = num(isPositive)
			expect(validate(5)).toBe(5)
			expect(() => validate(-1)).toThrow('Must be positive')
			expect(() => validate('5' as any)).toThrow('Expected number')
		})

		test('works in pipe with string validator', () => {
			const isEmail = custom<string>((v) => v.includes('@'), 'Must contain @')
			const validate = str(isEmail)
			expect(validate('test@example.com')).toBe('test@example.com')
			expect(() => validate('test')).toThrow('Must contain @')
		})

		test('multiple custom validators in pipe', () => {
			const isPositive = custom<number>((v) => v > 0, 'Must be positive')
			const isEven = custom<number>((v) => v % 2 === 0, 'Must be even')
			const validate = num(isPositive, isEven)
			expect(validate(2)).toBe(2)
			expect(validate(4)).toBe(4)
			expect(() => validate(-2)).toThrow('Must be positive')
			expect(() => validate(3)).toThrow('Must be even')
		})

		test('predicate receives correct value', () => {
			let received: unknown
			const capture = custom<number>((v) => {
				received = v
				return true
			})
			capture(42)
			expect(received).toBe(42)
		})

		test('handles edge case values', () => {
			const isNotNaN = custom<number>((v) => !Number.isNaN(v), 'Must not be NaN')
			expect(isNotNaN(0)).toBe(0)
			expect(isNotNaN(Infinity)).toBe(Infinity)
			expect(isNotNaN(-0)).toBe(-0)
		})

		test('validates with regex', () => {
			const matchesPattern = custom<string>((v) => /^\d{3}-\d{4}$/.test(v), 'Invalid format')
			expect(matchesPattern('123-4567')).toBe('123-4567')
			expect(() => matchesPattern('1234567')).toThrow('Invalid format')
		})
	})

	describe('check', () => {
		test('is alias for custom', () => {
			expect(check).toBe(custom)
		})

		test('passes when predicate returns true', () => {
			const isPositive = check<number>((v) => v > 0, 'Must be positive')
			expect(isPositive(5)).toBe(5)
		})

		test('throws when predicate returns false', () => {
			const isPositive = check<number>((v) => v > 0, 'Must be positive')
			expect(() => isPositive(-1)).toThrow('Must be positive')
		})

		test('safe version returns success', () => {
			const isPositive = check<number>((v) => v > 0, 'Must be positive')
			expect(isPositive.safe!(5)).toEqual({ ok: true, value: 5 })
		})

		test('safe version returns error', () => {
			const isPositive = check<number>((v) => v > 0, 'Must be positive')
			expect(isPositive.safe!(-1)).toEqual({ ok: false, error: 'Must be positive' })
		})

		test('uses default message', () => {
			const isPositive = check<number>((v) => v > 0)
			expect(() => isPositive(-1)).toThrow('Validation failed')
		})

		test('Standard Schema support', () => {
			const isPositive = check<number>((v) => v > 0, 'Must be positive')
			expect(isPositive['~standard']).toBeDefined()
			expect(isPositive['~standard']!.validate(5)).toEqual({ value: 5 })
		})

		test('Standard Schema returns issues', () => {
			const isPositive = check<number>((v) => v > 0, 'Must be positive')
			const result = isPositive['~standard']!.validate(-1)
			expect(result.issues![0].message).toBe('Must be positive')
		})

		test('works in pipe', () => {
			const isEven = check<number>((v) => v % 2 === 0, 'Must be even')
			const validate = num(isEven)
			expect(validate(2)).toBe(2)
			expect(() => validate(3)).toThrow('Must be even')
		})
	})

	describe('customAsync', () => {
		test('passes when predicate resolves true', async () => {
			const isPositive = customAsync<number>(async (v) => v > 0, 'Must be positive')
			expect(await isPositive(5)).toBe(5)
		})

		test('throws when predicate resolves false', async () => {
			const isPositive = customAsync<number>(async (v) => v > 0, 'Must be positive')
			await expect(isPositive(-1)).rejects.toThrow('Must be positive')
		})

		test('uses default message', async () => {
			const isPositive = customAsync<number>(async (v) => v > 0)
			await expect(isPositive(-1)).rejects.toThrow('Validation failed')
		})

		test('handles async predicate with delay', async () => {
			const asyncCheck = customAsync<string>(async (v) => {
				await new Promise((r) => setTimeout(r, 1))
				return v.length > 0
			}, 'Must not be empty')
			expect(await asyncCheck('hello')).toBe('hello')
			await expect(asyncCheck('')).rejects.toThrow('Must not be empty')
		})

		test('validates complex async logic', async () => {
			const isUniqueName = customAsync<string>(async (v) => {
				// Simulate database lookup
				await new Promise((r) => setTimeout(r, 1))
				const existingNames = ['admin', 'root', 'system']
				return !existingNames.includes(v)
			}, 'Name already exists')
			expect(await isUniqueName('newuser')).toBe('newuser')
			await expect(isUniqueName('admin')).rejects.toThrow('Name already exists')
		})

		test('returns value directly on success', async () => {
			const isPositive = customAsync<number>(async (v) => v > 0, 'Must be positive')
			const result = await isPositive(5)
			expect(result).toBe(5)
		})

		test('throws directly on failure', async () => {
			const isPositive = customAsync<number>(async (v) => v > 0, 'Must be positive')
			try {
				await isPositive(-1)
				expect(true).toBe(false) // should not reach here
			} catch (e) {
				expect((e as Error).message).toBe('Must be positive')
			}
		})

		test('predicate receives correct value', async () => {
			let received: unknown
			const capture = customAsync<number>(async (v) => {
				received = v
				return true
			})
			await capture(42)
			expect(received).toBe(42)
		})

		test('handles predicate that throws', async () => {
			const throws = customAsync<number>(async () => {
				throw new Error('inner error')
			}, 'Custom message')
			// Throwing in async validator propagates the error
			await expect(throws(1)).rejects.toThrow('inner error')
		})

		test('handles promises that reject', async () => {
			const rejects = customAsync<number>(async () => {
				return Promise.reject(new Error('rejected'))
			}, 'Custom message')
			await expect(rejects(1)).rejects.toThrow('rejected')
		})

		test('multiple async validators', async () => {
			const checkA = customAsync<string>(async (v) => v.includes('a'), 'Must include a')
			const checkB = customAsync<string>(async (v) => v.includes('b'), 'Must include b')
			expect(await checkA('ab')).toBe('ab')
			expect(await checkB('ab')).toBe('ab')
		})

		test('validates with async regex match', async () => {
			const matchesPattern = customAsync<string>(async (v) => {
				await new Promise((r) => setTimeout(r, 1))
				return /^\d{3}-\d{4}$/.test(v)
			}, 'Invalid format')
			expect(await matchesPattern('123-4567')).toBe('123-4567')
			await expect(matchesPattern('1234567')).rejects.toThrow('Invalid format')
		})
	})

	describe('edge cases', () => {
		test('custom with always true predicate', () => {
			const alwaysPass = custom<unknown>(() => true)
			expect(alwaysPass(null)).toBe(null)
			expect(alwaysPass(undefined)).toBe(undefined)
			expect(alwaysPass({})).toEqual({})
		})

		test('custom with always false predicate', () => {
			const alwaysFail = custom<unknown>(() => false, 'Always fails')
			expect(() => alwaysFail(1)).toThrow('Always fails')
			expect(() => alwaysFail('test')).toThrow('Always fails')
		})

		test('custom preserves value identity', () => {
			const obj = { key: 'value' }
			const passthrough = custom<typeof obj>(() => true)
			expect(passthrough(obj)).toBe(obj)
		})

		test('custom with undefined message uses default', () => {
			const validator = custom<number>((v) => v > 0, undefined)
			expect(() => validator(-1)).toThrow('Validation failed')
		})

		test('customAsync preserves value identity', async () => {
			const obj = { key: 'value' }
			const passthrough = customAsync<typeof obj>(async () => true)
			expect(await passthrough(obj)).toBe(obj)
		})

		test('custom works with type narrowing', () => {
			type Status = 'active' | 'inactive'
			const isStatus = custom<string>((v): v is Status => v === 'active' || v === 'inactive', 'Invalid status')
			expect(isStatus('active')).toBe('active')
			expect(isStatus('inactive')).toBe('inactive')
			expect(() => isStatus('pending')).toThrow('Invalid status')
		})
	})

	describe('integration scenarios', () => {
		test('credit card validation', () => {
			const isValidCreditCard = custom<string>((v) => {
				const digits = v.replace(/\D/g, '')
				return digits.length >= 13 && digits.length <= 19
			}, 'Invalid credit card number')
			expect(isValidCreditCard('4111111111111111')).toBe('4111111111111111')
			expect(isValidCreditCard('4111-1111-1111-1111')).toBe('4111-1111-1111-1111')
			expect(() => isValidCreditCard('123')).toThrow('Invalid credit card number')
		})

		test('password strength validation', () => {
			const isStrongPassword = custom<string>((v) => {
				const hasUpper = /[A-Z]/.test(v)
				const hasLower = /[a-z]/.test(v)
				const hasNumber = /\d/.test(v)
				const hasSpecial = /[!@#$%^&*]/.test(v)
				return v.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial
			}, 'Password not strong enough')
			expect(isStrongPassword('MyP@ss1!')).toBe('MyP@ss1!')
			expect(() => isStrongPassword('weak')).toThrow('Password not strong enough')
		})

		test('phone number validation', () => {
			const isPhoneNumber = custom<string>((v) => /^\+?[\d\s-()]{10,}$/.test(v), 'Invalid phone number')
			expect(isPhoneNumber('+1-555-123-4567')).toBe('+1-555-123-4567')
			expect(isPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567')
			expect(() => isPhoneNumber('123')).toThrow('Invalid phone number')
		})

		test('IP address validation', () => {
			const isIPv4 = custom<string>((v) => {
				const parts = v.split('.')
				if (parts.length !== 4) return false
				return parts.every((p) => {
					const n = parseInt(p, 10)
					return n >= 0 && n <= 255 && String(n) === p
				})
			}, 'Invalid IPv4 address')
			expect(isIPv4('192.168.1.1')).toBe('192.168.1.1')
			expect(isIPv4('0.0.0.0')).toBe('0.0.0.0')
			expect(isIPv4('255.255.255.255')).toBe('255.255.255.255')
			expect(() => isIPv4('256.1.1.1')).toThrow('Invalid IPv4 address')
			expect(() => isIPv4('1.2.3')).toThrow('Invalid IPv4 address')
		})

		test('async email domain validation', async () => {
			const hasValidDomain = customAsync<string>(async (email) => {
				const domain = email.split('@')[1]
				// Simulate DNS lookup
				await new Promise((r) => setTimeout(r, 1))
				const validDomains = ['gmail.com', 'yahoo.com', 'example.com']
				return validDomains.includes(domain)
			}, 'Email domain not allowed')
			expect(await hasValidDomain('user@gmail.com')).toBe('user@gmail.com')
			await expect(hasValidDomain('user@invalid.com')).rejects.toThrow('Email domain not allowed')
		})
	})
})
