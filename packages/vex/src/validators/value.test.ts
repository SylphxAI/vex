import { describe, expect, test } from 'bun:test'
import { bigInt, date, num, str } from './primitives'
import { gtValue, ltValue, maxValue, minValue, notValue, notValues, value, values } from './value'

describe('Value Validators', () => {
	describe('value', () => {
		test('validates exact number value', () => {
			expect(value(42)(42)).toBe(42)
			expect(() => value(42)(43)).toThrow('Expected 42')
		})

		test('validates exact string value', () => {
			expect(value('hello')('hello')).toBe('hello')
			expect(() => value('hello')('world')).toThrow('Expected "hello"')
		})

		test('validates null', () => {
			expect(value(null)(null)).toBe(null)
			expect(() => value(null)(undefined)).toThrow('Expected null')
		})

		test('validates undefined', () => {
			expect(value(undefined)(undefined)).toBe(undefined)
			expect(() => value(undefined)(null)).toThrow('Expected undefined')
		})

		test('validates boolean true', () => {
			expect(value(true)(true)).toBe(true)
			expect(() => value(true)(false)).toThrow('Expected true')
		})

		test('validates boolean false', () => {
			expect(value(false)(false)).toBe(false)
			expect(() => value(false)(true)).toThrow('Expected false')
		})

		test('validates zero', () => {
			expect(value(0)(0)).toBe(0)
			expect(() => value(0)(1)).toThrow('Expected 0')
		})

		test('validates negative numbers', () => {
			expect(value(-1)(-1)).toBe(-1)
			expect(() => value(-1)(1)).toThrow('Expected -1')
		})

		test('validates empty string', () => {
			expect(value('')('')).toBe('')
			expect(() => value('')('a')).toThrow('Expected ""')
		})

		test('safe version returns success', () => {
			expect(value(42).safe!(42)).toEqual({ ok: true, value: 42 })
		})

		test('safe version returns error', () => {
			expect(value(42).safe!(43)).toEqual({ ok: false, error: 'Expected 42' })
		})

		test('safe version with string', () => {
			expect(value('test').safe!('test')).toEqual({ ok: true, value: 'test' })
			expect(value('test').safe!('other')).toEqual({ ok: false, error: 'Expected "test"' })
		})

		test('Standard Schema support', () => {
			const validator = value(42)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.version).toBe(1)
			expect(validator['~standard']!.vendor).toBe('vex')
		})

		test('Standard Schema validate success', () => {
			const validator = value(42)
			expect(validator['~standard']!.validate(42)).toEqual({ value: 42 })
		})

		test('Standard Schema validate failure', () => {
			const validator = value(42)
			const result = validator['~standard']!.validate(43)
			expect(result.issues![0].message).toBe('Expected 42')
		})

		test('works in pipe', () => {
			const validate = num(value(42))
			expect(validate(42)).toBe(42)
			expect(() => validate(43)).toThrow('Expected 42')
		})
	})

	describe('values', () => {
		test('validates one of string values', () => {
			const status = values(['active', 'inactive', 'pending'] as const)
			expect(status('active')).toBe('active')
			expect(status('inactive')).toBe('inactive')
			expect(status('pending')).toBe('pending')
			expect(() => status('unknown' as any)).toThrow('Expected one of')
		})

		test('validates one of number values', () => {
			const priority = values([1, 2, 3] as const)
			expect(priority(1)).toBe(1)
			expect(priority(2)).toBe(2)
			expect(priority(3)).toBe(3)
			expect(() => priority(4 as any)).toThrow('Expected one of')
		})

		test('validates with mixed types', () => {
			const mixed = values([1, 'one', true] as const)
			expect(mixed(1)).toBe(1)
			expect(mixed('one')).toBe('one')
			expect(mixed(true)).toBe(true)
		})

		test('validates single value array', () => {
			const single = values(['only'] as const)
			expect(single('only')).toBe('only')
			expect(() => single('other' as any)).toThrow('Expected one of')
		})

		test('safe version returns success', () => {
			const status = values(['active', 'inactive'] as const)
			expect(status.safe!('active')).toEqual({ ok: true, value: 'active' })
		})

		test('safe version returns error', () => {
			const status = values(['active', 'inactive'] as const)
			const result = status.safe!('unknown' as any)
			expect(result.ok).toBe(false)
			expect(result.error).toContain('Expected one of')
		})

		test('Standard Schema support', () => {
			const validator = values(['a', 'b'] as const)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate('a')).toEqual({ value: 'a' })
		})

		test('Standard Schema returns issues', () => {
			const validator = values(['a', 'b'] as const)
			const result = validator['~standard']!.validate('c')
			expect(result.issues![0].message).toContain('Expected one of')
		})

		test('works in pipe', () => {
			const validate = str(values(['yes', 'no'] as const))
			expect(validate('yes')).toBe('yes')
			expect(() => validate('maybe')).toThrow('Expected one of')
		})
	})

	describe('notValue', () => {
		test('validates value is not excluded', () => {
			const notZero = notValue(0)
			expect(notZero(1)).toBe(1)
			expect(notZero(-1)).toBe(-1)
			expect(() => notZero(0)).toThrow('Value must not be 0')
		})

		test('validates string not excluded', () => {
			const notEmpty = notValue('')
			expect(notEmpty('hello')).toBe('hello')
			expect(() => notEmpty('')).toThrow('Value must not be ""')
		})

		test('validates null not excluded', () => {
			const notNull = notValue(null)
			expect(notNull(undefined)).toBe(undefined)
			expect(() => notNull(null)).toThrow('Value must not be null')
		})

		test('validates undefined not excluded', () => {
			const notUndefined = notValue(undefined)
			expect(notUndefined(null)).toBe(null)
			expect(() => notUndefined(undefined)).toThrow('Value must not be undefined')
		})

		test('safe version returns success', () => {
			const notZero = notValue(0)
			expect(notZero.safe!(1)).toEqual({ ok: true, value: 1 })
		})

		test('safe version returns error', () => {
			const notZero = notValue(0)
			expect(notZero.safe!(0)).toEqual({ ok: false, error: 'Value must not be 0' })
		})

		test('Standard Schema support', () => {
			const validator = notValue(0)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate(1)).toEqual({ value: 1 })
		})

		test('Standard Schema returns issues', () => {
			const validator = notValue(0)
			const result = validator['~standard']!.validate(0)
			expect(result.issues![0].message).toBe('Value must not be 0')
		})

		test('works in pipe', () => {
			const validate = num(notValue(0))
			expect(validate(1)).toBe(1)
			expect(() => validate(0)).toThrow('Value must not be 0')
		})
	})

	describe('notValues', () => {
		test('validates value is not one of excluded', () => {
			const notSpecial = notValues([0, -1])
			expect(notSpecial(1)).toBe(1)
			expect(notSpecial(100)).toBe(100)
			expect(() => notSpecial(0)).toThrow('Value must not be one of')
			expect(() => notSpecial(-1)).toThrow('Value must not be one of')
		})

		test('validates strings not excluded', () => {
			const notReserved = notValues(['admin', 'root'])
			expect(notReserved('user')).toBe('user')
			expect(() => notReserved('admin')).toThrow('Value must not be one of')
		})

		test('validates with mixed types', () => {
			const notSpecial = notValues([0, '', null])
			expect(notSpecial(1)).toBe(1)
			expect(notSpecial('hello')).toBe('hello')
			expect(() => notSpecial(0)).toThrow('Value must not be one of')
			expect(() => notSpecial('')).toThrow('Value must not be one of')
			expect(() => notSpecial(null)).toThrow('Value must not be one of')
		})

		test('safe version returns success', () => {
			const notSpecial = notValues([0, -1])
			expect(notSpecial.safe!(1)).toEqual({ ok: true, value: 1 })
		})

		test('safe version returns error', () => {
			const notSpecial = notValues([0, -1])
			const result = notSpecial.safe!(0)
			expect(result.ok).toBe(false)
			expect(result.error).toContain('Value must not be one of')
		})

		test('Standard Schema support', () => {
			const validator = notValues([0, -1])
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate(1)).toEqual({ value: 1 })
		})

		test('Standard Schema returns issues', () => {
			const validator = notValues([0, -1])
			const result = validator['~standard']!.validate(0)
			expect(result.issues![0].message).toContain('Value must not be one of')
		})

		test('works in pipe', () => {
			const validate = num(notValues([0, -1]))
			expect(validate(1)).toBe(1)
			expect(() => validate(0)).toThrow('Value must not be one of')
		})
	})

	describe('gtValue', () => {
		test('validates greater than number', () => {
			expect(gtValue(0)(1)).toBe(1)
			expect(gtValue(0)(100)).toBe(100)
			expect(() => gtValue(0)(0)).toThrow('Must be greater than 0')
			expect(() => gtValue(0)(-1)).toThrow('Must be greater than 0')
		})

		test('validates greater than negative', () => {
			expect(gtValue(-10)(-5)).toBe(-5)
			expect(gtValue(-10)(0)).toBe(0)
			expect(() => gtValue(-10)(-10)).toThrow('Must be greater than -10')
			expect(() => gtValue(-10)(-20)).toThrow('Must be greater than -10')
		})

		test('validates greater than bigint', () => {
			expect(gtValue(BigInt(100))(BigInt(101))).toBe(BigInt(101))
			expect(() => gtValue(BigInt(100))(BigInt(100))).toThrow()
		})

		test('validates greater than Date', () => {
			const now = new Date()
			const later = new Date(now.getTime() + 1000)
			expect(gtValue(now)(later)).toBe(later)
			expect(() => gtValue(now)(now)).toThrow()
		})

		test('safe version returns success', () => {
			expect(gtValue(0).safe!(1)).toEqual({ ok: true, value: 1 })
		})

		test('safe version returns error', () => {
			expect(gtValue(0).safe!(0)).toEqual({ ok: false, error: 'Must be greater than 0' })
		})

		test('Standard Schema support', () => {
			const validator = gtValue(0)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate(1)).toEqual({ value: 1 })
		})

		test('Standard Schema returns issues', () => {
			const validator = gtValue(0)
			const result = validator['~standard']!.validate(0)
			expect(result.issues![0].message).toBe('Must be greater than 0')
		})

		test('works in pipe', () => {
			const validate = num(gtValue(0))
			expect(validate(1)).toBe(1)
			expect(() => validate(0)).toThrow('Must be greater than 0')
		})
	})

	describe('ltValue', () => {
		test('validates less than number', () => {
			expect(ltValue(0)(-1)).toBe(-1)
			expect(ltValue(0)(-100)).toBe(-100)
			expect(() => ltValue(0)(0)).toThrow('Must be less than 0')
			expect(() => ltValue(0)(1)).toThrow('Must be less than 0')
		})

		test('validates less than positive', () => {
			expect(ltValue(10)(5)).toBe(5)
			expect(ltValue(10)(0)).toBe(0)
			expect(() => ltValue(10)(10)).toThrow('Must be less than 10')
			expect(() => ltValue(10)(20)).toThrow('Must be less than 10')
		})

		test('validates less than bigint', () => {
			expect(ltValue(BigInt(100))(BigInt(99))).toBe(BigInt(99))
			expect(() => ltValue(BigInt(100))(BigInt(100))).toThrow()
		})

		test('validates less than Date', () => {
			const now = new Date()
			const earlier = new Date(now.getTime() - 1000)
			expect(ltValue(now)(earlier)).toBe(earlier)
			expect(() => ltValue(now)(now)).toThrow()
		})

		test('safe version returns success', () => {
			expect(ltValue(0).safe!(-1)).toEqual({ ok: true, value: -1 })
		})

		test('safe version returns error', () => {
			expect(ltValue(0).safe!(0)).toEqual({ ok: false, error: 'Must be less than 0' })
		})

		test('Standard Schema support', () => {
			const validator = ltValue(0)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate(-1)).toEqual({ value: -1 })
		})

		test('Standard Schema returns issues', () => {
			const validator = ltValue(0)
			const result = validator['~standard']!.validate(0)
			expect(result.issues![0].message).toBe('Must be less than 0')
		})

		test('works in pipe', () => {
			const validate = num(ltValue(0))
			expect(validate(-1)).toBe(-1)
			expect(() => validate(0)).toThrow('Must be less than 0')
		})
	})

	describe('minValue', () => {
		test('validates at least number', () => {
			expect(minValue(0)(0)).toBe(0)
			expect(minValue(0)(1)).toBe(1)
			expect(minValue(0)(100)).toBe(100)
			expect(() => minValue(0)(-1)).toThrow('Must be at least 0')
		})

		test('validates at least negative', () => {
			expect(minValue(-10)(-10)).toBe(-10)
			expect(minValue(-10)(-5)).toBe(-5)
			expect(() => minValue(-10)(-20)).toThrow('Must be at least -10')
		})

		test('validates at least bigint', () => {
			expect(minValue(BigInt(100))(BigInt(100))).toBe(BigInt(100))
			expect(minValue(BigInt(100))(BigInt(200))).toBe(BigInt(200))
			expect(() => minValue(BigInt(100))(BigInt(99))).toThrow()
		})

		test('validates at least Date', () => {
			const now = new Date()
			const later = new Date(now.getTime() + 1000)
			expect(minValue(now)(now)).toEqual(now)
			expect(minValue(now)(later)).toBe(later)
		})

		test('safe version returns success', () => {
			expect(minValue(0).safe!(0)).toEqual({ ok: true, value: 0 })
		})

		test('safe version returns error', () => {
			expect(minValue(0).safe!(-1)).toEqual({ ok: false, error: 'Must be at least 0' })
		})

		test('Standard Schema support', () => {
			const validator = minValue(0)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate(0)).toEqual({ value: 0 })
		})

		test('Standard Schema returns issues', () => {
			const validator = minValue(0)
			const result = validator['~standard']!.validate(-1)
			expect(result.issues![0].message).toBe('Must be at least 0')
		})

		test('works in pipe', () => {
			const validate = num(minValue(0))
			expect(validate(0)).toBe(0)
			expect(() => validate(-1)).toThrow('Must be at least 0')
		})
	})

	describe('maxValue', () => {
		test('validates at most number', () => {
			expect(maxValue(100)(100)).toBe(100)
			expect(maxValue(100)(50)).toBe(50)
			expect(maxValue(100)(0)).toBe(0)
			expect(() => maxValue(100)(101)).toThrow('Must be at most 100')
		})

		test('validates at most negative', () => {
			expect(maxValue(-10)(-10)).toBe(-10)
			expect(maxValue(-10)(-20)).toBe(-20)
			expect(() => maxValue(-10)(-5)).toThrow('Must be at most -10')
		})

		test('validates at most bigint', () => {
			expect(maxValue(BigInt(100))(BigInt(100))).toBe(BigInt(100))
			expect(maxValue(BigInt(100))(BigInt(50))).toBe(BigInt(50))
			expect(() => maxValue(BigInt(100))(BigInt(101))).toThrow()
		})

		test('validates at most Date', () => {
			const now = new Date()
			const earlier = new Date(now.getTime() - 1000)
			expect(maxValue(now)(now)).toEqual(now)
			expect(maxValue(now)(earlier)).toBe(earlier)
		})

		test('safe version returns success', () => {
			expect(maxValue(100).safe!(100)).toEqual({ ok: true, value: 100 })
		})

		test('safe version returns error', () => {
			expect(maxValue(100).safe!(101)).toEqual({ ok: false, error: 'Must be at most 100' })
		})

		test('Standard Schema support', () => {
			const validator = maxValue(100)
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate(100)).toEqual({ value: 100 })
		})

		test('Standard Schema returns issues', () => {
			const validator = maxValue(100)
			const result = validator['~standard']!.validate(101)
			expect(result.issues![0].message).toBe('Must be at most 100')
		})

		test('works in pipe', () => {
			const validate = num(maxValue(100))
			expect(validate(100)).toBe(100)
			expect(() => validate(101)).toThrow('Must be at most 100')
		})
	})

	describe('combined validators', () => {
		test('minValue and maxValue together (range)', () => {
			const validate = num(minValue(0), maxValue(100))
			expect(validate(0)).toBe(0)
			expect(validate(50)).toBe(50)
			expect(validate(100)).toBe(100)
			expect(() => validate(-1)).toThrow('Must be at least 0')
			expect(() => validate(101)).toThrow('Must be at most 100')
		})

		test('gtValue and ltValue together (exclusive range)', () => {
			const validate = num(gtValue(0), ltValue(100))
			expect(validate(1)).toBe(1)
			expect(validate(50)).toBe(50)
			expect(validate(99)).toBe(99)
			expect(() => validate(0)).toThrow('Must be greater than 0')
			expect(() => validate(100)).toThrow('Must be less than 100')
		})

		test('values with notValue', () => {
			const validate = num(notValue(0), minValue(-100), maxValue(100))
			expect(validate(1)).toBe(1)
			expect(validate(-50)).toBe(-50)
			expect(() => validate(0)).toThrow('Value must not be 0')
		})

		test('bigint range validation', () => {
			const validate = bigInt(minValue(BigInt(0)), maxValue(BigInt(1000)))
			expect(validate(BigInt(500))).toBe(BigInt(500))
		})

		test('date range validation', () => {
			const start = new Date('2024-01-01')
			const end = new Date('2024-12-31')
			const validate = date(minValue(start), maxValue(end))
			const mid = new Date('2024-06-15')
			expect(validate(mid)).toEqual(mid)
		})
	})

	describe('edge cases', () => {
		test('value with NaN (uses strict equality)', () => {
			// NaN !== NaN in JavaScript
			const validateNaN = value(NaN)
			expect(() => validateNaN(NaN)).toThrow()
		})

		test('notValue with -0 and 0', () => {
			// -0 === 0 in JavaScript
			const notZero = notValue(0)
			expect(() => notZero(-0)).toThrow('Value must not be 0')
		})

		test('values with empty array', () => {
			const validator = values([] as const)
			expect(() => (validator as any)('anything')).toThrow('Expected one of')
		})

		test('gtValue with Infinity', () => {
			expect(() => gtValue(Infinity)(1)).toThrow()
			expect(gtValue(0)(Infinity)).toBe(Infinity)
		})

		test('ltValue with -Infinity', () => {
			expect(() => ltValue(-Infinity)(1)).toThrow()
			expect(ltValue(0)(-Infinity)).toBe(-Infinity)
		})

		test('preserves value identity', () => {
			const obj = { key: 'value' }
			// Note: value() uses strict equality, so objects must be same reference
			const validateObj = value(obj)
			expect(validateObj(obj)).toBe(obj)
		})
	})
})
