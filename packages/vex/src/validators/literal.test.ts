// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { enum_, literal, picklist } from './literal'

describe('Literal Validators', () => {
	describe('literal', () => {
		test('validates exact string value', () => {
			const validateAdmin = literal('admin')
			expect(validateAdmin('admin')).toBe('admin')
			expect(() => validateAdmin('user')).toThrow('Expected "admin"')
			expect(() => validateAdmin('Admin')).toThrow('Expected "admin"')
		})

		test('validates exact boolean value', () => {
			const validateTrue = literal(true)
			expect(validateTrue(true)).toBe(true)
			expect(() => validateTrue(false)).toThrow('Expected true')
			expect(() => validateTrue('true')).toThrow('Expected true')
		})

		test('validates exact number value', () => {
			const validate42 = literal(42)
			expect(validate42(42)).toBe(42)
			expect(() => validate42(43)).toThrow('Expected 42')
			expect(() => validate42('42')).toThrow('Expected 42')
		})

		test('validates negative number', () => {
			const validateNeg = literal(-10)
			expect(validateNeg(-10)).toBe(-10)
			expect(() => validateNeg(10)).toThrow('Expected -10')
		})

		test('validates zero', () => {
			const validateZero = literal(0)
			expect(validateZero(0)).toBe(0)
			expect(() => validateZero(1)).toThrow('Expected 0')
			expect(validateZero(-0)).toBe(0) // -0 === 0 in JavaScript
		})

		test('validates null', () => {
			const validateNull = literal(null)
			expect(validateNull(null)).toBe(null)
			expect(() => validateNull(undefined)).toThrow('Expected null')
			expect(() => validateNull(0)).toThrow('Expected null')
		})

		test('validates undefined', () => {
			const validateUndefined = literal(undefined)
			expect(validateUndefined(undefined)).toBe(undefined)
			expect(() => validateUndefined(null)).toThrow()
		})

		test('validates empty string', () => {
			const validateEmpty = literal('')
			expect(validateEmpty('')).toBe('')
			expect(() => validateEmpty(' ')).toThrow('Expected ""')
		})

		test('safe version returns success', () => {
			const validate = literal('admin')
			expect(validate.safe!('admin')).toEqual({ ok: true, value: 'admin' })
		})

		test('safe version returns error', () => {
			const validate = literal('admin')
			expect(validate.safe!('user')).toEqual({ ok: false, error: 'Expected "admin"' })
		})

		test('safe version for boolean', () => {
			const validate = literal(true)
			expect(validate.safe!(true)).toEqual({ ok: true, value: true })
			expect(validate.safe!(false)).toEqual({ ok: false, error: 'Expected true' })
		})

		test('safe version for number', () => {
			const validate = literal(42)
			expect(validate.safe!(42)).toEqual({ ok: true, value: 42 })
			expect(validate.safe!(0)).toEqual({ ok: false, error: 'Expected 42' })
		})

		test('safe version for null', () => {
			const validate = literal(null)
			expect(validate.safe!(null)).toEqual({ ok: true, value: null })
			expect(validate.safe!(undefined)).toEqual({ ok: false, error: 'Expected null' })
		})

		test('Standard Schema support', () => {
			const validate = literal('admin')
			expect(validate['~standard']).toBeDefined()
			expect(validate['~standard']!.version).toBe(1)
			expect(validate['~standard']!.vendor).toBe('vex')
		})

		test('Standard Schema validate returns value', () => {
			const validate = literal('admin')
			expect(validate['~standard']!.validate('admin')).toEqual({ value: 'admin' })
		})

		test('Standard Schema validate returns issues', () => {
			const validate = literal('admin')
			const result = validate['~standard']!.validate('user')
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toBe('Expected "admin"')
		})
	})
})

describe('Enum Validators', () => {
	describe('enum_', () => {
		test('validates one of values', () => {
			const validateRole = enum_(['admin', 'user', 'guest'] as const)
			expect(validateRole('admin')).toBe('admin')
			expect(validateRole('user')).toBe('user')
			expect(validateRole('guest')).toBe('guest')
			expect(() => validateRole('superuser')).toThrow('Expected one of:')
		})

		test('with numbers', () => {
			const validateStatus = enum_([200, 404, 500] as const)
			expect(validateStatus(200)).toBe(200)
			expect(validateStatus(404)).toBe(404)
			expect(() => validateStatus(201)).toThrow('Expected one of:')
		})

		test('with mixed types', () => {
			const validateMixed = enum_([1, 'two', true] as const)
			expect(validateMixed(1)).toBe(1)
			expect(validateMixed('two')).toBe('two')
			expect(validateMixed(true)).toBe(true)
			expect(() => validateMixed(false)).toThrow('Expected one of:')
		})

		test('with single value', () => {
			const validateSingle = enum_(['only'] as const)
			expect(validateSingle('only')).toBe('only')
			expect(() => validateSingle('other')).toThrow('Expected one of:')
		})

		test('with booleans', () => {
			const validateBool = enum_([true, false] as const)
			expect(validateBool(true)).toBe(true)
			expect(validateBool(false)).toBe(false)
			expect(() => validateBool('true')).toThrow()
		})

		test('with null and undefined', () => {
			const validateNullish = enum_([null, undefined] as const)
			expect(validateNullish(null)).toBe(null)
			expect(validateNullish(undefined)).toBe(undefined)
			expect(() => validateNullish(0)).toThrow()
		})

		test('safe version returns success', () => {
			const validateRole = enum_(['admin', 'user'] as const)
			expect(validateRole.safe!('admin')).toEqual({ ok: true, value: 'admin' })
		})

		test('safe version returns error', () => {
			const validateRole = enum_(['admin', 'user'] as const)
			const result = validateRole.safe!('invalid')
			expect(result.ok).toBe(false)
			expect((result as { ok: false; error: string }).error).toContain('Expected one of:')
		})

		test('safe version with number', () => {
			const validateStatus = enum_([200, 404] as const)
			expect(validateStatus.safe!(200)).toEqual({ ok: true, value: 200 })
			const result = validateStatus.safe!(500)
			expect(result.ok).toBe(false)
		})

		test('Standard Schema support', () => {
			const validate = enum_(['a', 'b'] as const)
			expect(validate['~standard']).toBeDefined()
			expect(validate['~standard']!.version).toBe(1)
			expect(validate['~standard']!.vendor).toBe('vex')
		})

		test('Standard Schema validate returns value', () => {
			const validate = enum_(['a', 'b'] as const)
			expect(validate['~standard']!.validate('a')).toEqual({ value: 'a' })
		})

		test('Standard Schema validate returns issues', () => {
			const validate = enum_(['a', 'b'] as const)
			const result = validate['~standard']!.validate('c')
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toContain('Expected one of:')
		})
	})

	describe('picklist', () => {
		test('is alias for enum_', () => {
			expect(picklist).toBe(enum_)
		})

		test('works the same as enum_', () => {
			const validate = picklist(['a', 'b', 'c'] as const)
			expect(validate('a')).toBe('a')
			expect(validate('b')).toBe('b')
			expect(() => validate('d')).toThrow('Expected one of:')
		})
	})
})
