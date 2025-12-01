// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { pipe } from '../composition/pipe'
import { int, positive } from '../validators/number'
import {
	coerce,
	coerceBigInt,
	coerceBoolean,
	coerceDate,
	coerceNumber,
	coerceString,
	toBigint,
	toBoolean,
	toNumber,
	toString_,
} from './coerce'

describe('Coerce Transforms', () => {
	describe('coerceString', () => {
		test('coerces number to string', () => {
			expect(coerceString(123)).toBe('123')
			expect(coerceString(0)).toBe('0')
			expect(coerceString(-42)).toBe('-42')
			expect(coerceString(3.14)).toBe('3.14')
		})

		test('coerces boolean to string', () => {
			expect(coerceString(true)).toBe('true')
			expect(coerceString(false)).toBe('false')
		})

		test('coerces null to string', () => {
			expect(coerceString(null)).toBe('null')
		})

		test('coerces undefined to string', () => {
			expect(coerceString(undefined)).toBe('undefined')
		})

		test('coerces object to string', () => {
			expect(coerceString({})).toBe('[object Object]')
		})

		test('coerces array to string', () => {
			expect(coerceString([1, 2, 3])).toBe('1,2,3')
			expect(coerceString([])).toBe('')
		})

		test('passes through string', () => {
			expect(coerceString('hello')).toBe('hello')
			expect(coerceString('')).toBe('')
		})

		test('coerces bigint to string', () => {
			expect(coerceString(BigInt(123))).toBe('123')
		})

		test('coerces Infinity', () => {
			expect(coerceString(Infinity)).toBe('Infinity')
			expect(coerceString(-Infinity)).toBe('-Infinity')
		})

		test('coerces NaN', () => {
			expect(coerceString(NaN)).toBe('NaN')
		})

		test('safe version returns success', () => {
			expect(coerceString.safe!(123)).toEqual({ ok: true, value: '123' })
			expect(coerceString.safe!(true)).toEqual({ ok: true, value: 'true' })
			expect(coerceString.safe!(null)).toEqual({ ok: true, value: 'null' })
		})

		test('Standard Schema support', () => {
			expect(coerceString['~standard']).toBeDefined()
			expect(coerceString['~standard']!.version).toBe(1)
			expect(coerceString['~standard']!.validate(123)).toEqual({ value: '123' })
		})

		test('works in pipe', () => {
			const validate = pipe(coerceString)
			expect(validate(42)).toBe('42')
		})
	})

	describe('coerceNumber', () => {
		test('coerces string to number', () => {
			expect(coerceNumber('42')).toBe(42)
			expect(coerceNumber('3.14')).toBe(3.14)
			expect(coerceNumber('-100')).toBe(-100)
			expect(coerceNumber('0')).toBe(0)
		})

		test('coerces boolean to number', () => {
			expect(coerceNumber(true)).toBe(1)
			expect(coerceNumber(false)).toBe(0)
		})

		test('coerces null to number', () => {
			expect(coerceNumber(null)).toBe(0)
		})

		test('coerces empty string to number', () => {
			expect(coerceNumber('')).toBe(0)
		})

		test('coerces string with whitespace', () => {
			expect(coerceNumber('  42  ')).toBe(42)
		})

		test('coerces scientific notation', () => {
			expect(coerceNumber('1e10')).toBe(1e10)
			expect(coerceNumber('1.5e-3')).toBe(0.0015)
		})

		test('coerces hexadecimal strings', () => {
			expect(coerceNumber('0xFF')).toBe(255)
		})

		test('throws on invalid string', () => {
			expect(() => coerceNumber('abc')).toThrow('Cannot coerce to number')
			expect(() => coerceNumber('12abc')).toThrow('Cannot coerce to number')
		})

		test('throws on object', () => {
			expect(() => coerceNumber({})).toThrow('Cannot coerce to number')
		})

		test('throws on undefined', () => {
			expect(() => coerceNumber(undefined)).toThrow('Cannot coerce to number')
		})

		test('safe version returns success', () => {
			expect(coerceNumber.safe!('42')).toEqual({ ok: true, value: 42 })
			expect(coerceNumber.safe!(true)).toEqual({ ok: true, value: 1 })
		})

		test('safe version returns error', () => {
			expect(coerceNumber.safe!('abc')).toEqual({ ok: false, error: 'Cannot coerce to number' })
			expect(coerceNumber.safe!({})).toEqual({ ok: false, error: 'Cannot coerce to number' })
		})

		test('Standard Schema support', () => {
			expect(coerceNumber['~standard']).toBeDefined()
			expect(coerceNumber['~standard']!.validate('42')).toEqual({ value: 42 })
		})

		test('Standard Schema returns issues', () => {
			const result = coerceNumber['~standard']!.validate('abc')
			expect(result.issues![0].message).toBe('Cannot coerce to number')
		})

		test('works in pipe with validators', () => {
			const validate = pipe(coerceNumber, positive, int)
			expect(validate('42')).toBe(42)
			expect(() => validate('-5')).toThrow()
		})
	})

	describe('coerceBoolean', () => {
		test('coerces truthy numbers', () => {
			expect(coerceBoolean(1)).toBe(true)
			expect(coerceBoolean(-1)).toBe(true)
			expect(coerceBoolean(100)).toBe(true)
		})

		test('coerces falsy numbers', () => {
			expect(coerceBoolean(0)).toBe(false)
			expect(coerceBoolean(-0)).toBe(false)
		})

		test('coerces NaN', () => {
			expect(coerceBoolean(NaN)).toBe(false)
		})

		test('coerces truthy strings', () => {
			expect(coerceBoolean('hello')).toBe(true)
			expect(coerceBoolean('false')).toBe(true) // non-empty string is truthy
			expect(coerceBoolean('0')).toBe(true) // non-empty string is truthy
		})

		test('coerces empty string', () => {
			expect(coerceBoolean('')).toBe(false)
		})

		test('coerces null', () => {
			expect(coerceBoolean(null)).toBe(false)
		})

		test('coerces undefined', () => {
			expect(coerceBoolean(undefined)).toBe(false)
		})

		test('coerces objects (truthy)', () => {
			expect(coerceBoolean({})).toBe(true)
			expect(coerceBoolean([])).toBe(true)
		})

		test('passes through booleans', () => {
			expect(coerceBoolean(true)).toBe(true)
			expect(coerceBoolean(false)).toBe(false)
		})

		test('safe version always succeeds', () => {
			expect(coerceBoolean.safe!(1)).toEqual({ ok: true, value: true })
			expect(coerceBoolean.safe!(0)).toEqual({ ok: true, value: false })
			expect(coerceBoolean.safe!(null)).toEqual({ ok: true, value: false })
			expect(coerceBoolean.safe!({})).toEqual({ ok: true, value: true })
		})

		test('Standard Schema support', () => {
			expect(coerceBoolean['~standard']).toBeDefined()
			expect(coerceBoolean['~standard']!.validate(1)).toEqual({ value: true })
			expect(coerceBoolean['~standard']!.validate(0)).toEqual({ value: false })
		})

		test('works in pipe', () => {
			const validate = pipe(coerceBoolean)
			expect(validate('yes')).toBe(true)
			expect(validate('')).toBe(false)
		})
	})

	describe('coerceDate', () => {
		test('coerces ISO string to Date', () => {
			const date = coerceDate('2024-01-15')
			expect(date instanceof Date).toBe(true)
			expect(date.toISOString().startsWith('2024-01-15')).toBe(true)
		})

		test('coerces date-time string', () => {
			const date = coerceDate('2024-01-15T10:30:00Z')
			expect(date instanceof Date).toBe(true)
			expect(date.getUTCHours()).toBe(10)
		})

		test('passes through Date', () => {
			const original = new Date()
			const result = coerceDate(original)
			expect(result).toBe(original)
		})

		test('coerces timestamp number', () => {
			const timestamp = 1705276800000
			const date = coerceDate(timestamp)
			expect(date instanceof Date).toBe(true)
			expect(date.getTime()).toBe(timestamp)
		})

		test('coerces zero timestamp', () => {
			const date = coerceDate(0)
			expect(date.getTime()).toBe(0)
		})

		test('coerces negative timestamp', () => {
			const date = coerceDate(-86400000) // one day before epoch
			expect(date.getTime()).toBe(-86400000)
		})

		test('throws on invalid string', () => {
			expect(() => coerceDate('invalid')).toThrow('Cannot coerce to Date')
			expect(() => coerceDate('not-a-date')).toThrow('Cannot coerce to Date')
		})

		test('throws on invalid date format', () => {
			expect(() => coerceDate('99-99-9999')).toThrow('Cannot coerce to Date')
		})

		test('safe version returns success', () => {
			const result = coerceDate.safe!('2024-01-15')
			expect(result.ok).toBe(true)
			expect((result as any).value instanceof Date).toBe(true)
		})

		test('safe version returns error', () => {
			expect(coerceDate.safe!('invalid')).toEqual({ ok: false, error: 'Cannot coerce to Date' })
		})

		test('Standard Schema support', () => {
			expect(coerceDate['~standard']).toBeDefined()
			const result = coerceDate['~standard']!.validate('2024-01-15')
			expect('value' in result).toBe(true)
		})

		test('Standard Schema returns issues', () => {
			const result = coerceDate['~standard']!.validate('invalid')
			expect(result.issues![0].message).toBe('Cannot coerce to Date')
		})

		test('works in pipe', () => {
			const validate = pipe(coerceDate)
			const result = validate('2024-06-15')
			expect(result instanceof Date).toBe(true)
		})

		test('handles various date formats', () => {
			// Month/Day/Year format
			const date1 = coerceDate('01/15/2024')
			expect(date1 instanceof Date).toBe(true)

			// Full date string
			const date2 = coerceDate('January 15, 2024')
			expect(date2 instanceof Date).toBe(true)
		})
	})

	describe('coerceBigInt', () => {
		test('coerces number to BigInt', () => {
			expect(coerceBigInt(123)).toBe(BigInt(123))
			expect(coerceBigInt(0)).toBe(BigInt(0))
			expect(coerceBigInt(-456)).toBe(BigInt(-456))
		})

		test('coerces string to BigInt', () => {
			expect(coerceBigInt('456')).toBe(BigInt(456))
			expect(coerceBigInt('0')).toBe(BigInt(0))
			expect(coerceBigInt('-789')).toBe(BigInt(-789))
		})

		test('coerces boolean to BigInt', () => {
			expect(coerceBigInt(true)).toBe(BigInt(1))
			expect(coerceBigInt(false)).toBe(BigInt(0))
		})

		test('passes through BigInt', () => {
			const original = BigInt(999)
			expect(coerceBigInt(original)).toBe(original)
		})

		test('coerces large number strings', () => {
			const large = '9007199254740991'
			expect(coerceBigInt(large)).toBe(BigInt(large))
		})

		test('throws on non-integer string', () => {
			expect(() => coerceBigInt('abc')).toThrow('Cannot coerce to BigInt')
			expect(() => coerceBigInt('12.5')).toThrow('Cannot coerce to BigInt')
		})

		test('throws on float number', () => {
			expect(() => coerceBigInt(3.14)).toThrow('Cannot coerce to BigInt')
			expect(() => coerceBigInt(-2.5)).toThrow('Cannot coerce to BigInt')
		})

		test('throws on NaN', () => {
			expect(() => coerceBigInt(NaN)).toThrow('Cannot coerce to BigInt')
		})

		test('throws on Infinity', () => {
			expect(() => coerceBigInt(Infinity)).toThrow('Cannot coerce to BigInt')
			expect(() => coerceBigInt(-Infinity)).toThrow('Cannot coerce to BigInt')
		})

		test('throws on null', () => {
			expect(() => coerceBigInt(null)).toThrow('Cannot coerce to BigInt')
		})

		test('throws on undefined', () => {
			expect(() => coerceBigInt(undefined)).toThrow('Cannot coerce to BigInt')
		})

		test('throws on object', () => {
			expect(() => coerceBigInt({} as any)).toThrow('Cannot coerce to BigInt')
		})

		test('safe version returns success', () => {
			expect(coerceBigInt.safe!(123)).toEqual({ ok: true, value: BigInt(123) })
			expect(coerceBigInt.safe!('456')).toEqual({ ok: true, value: BigInt(456) })
			expect(coerceBigInt.safe!(true)).toEqual({ ok: true, value: BigInt(1) })
		})

		test('safe version returns error', () => {
			expect(coerceBigInt.safe!('abc')).toEqual({ ok: false, error: 'Cannot coerce to BigInt' })
			expect(coerceBigInt.safe!(3.14)).toEqual({ ok: false, error: 'Cannot coerce to BigInt' })
		})

		test('Standard Schema support', () => {
			expect(coerceBigInt['~standard']).toBeDefined()
			expect(coerceBigInt['~standard']!.validate(123)).toEqual({ value: BigInt(123) })
		})

		test('Standard Schema returns issues', () => {
			const result = coerceBigInt['~standard']!.validate('abc')
			expect(result.issues![0].message).toBe('Cannot coerce to BigInt')
		})

		test('works in pipe', () => {
			const validate = pipe(coerceBigInt)
			expect(validate('999')).toBe(BigInt(999))
		})
	})

	describe('coerce namespace', () => {
		test('has all coercions', () => {
			expect(coerce.string).toBe(coerceString)
			expect(coerce.number).toBe(coerceNumber)
			expect(coerce.boolean).toBe(coerceBoolean)
			expect(coerce.date).toBe(coerceDate)
			expect(coerce.bigint).toBe(coerceBigInt)
		})

		test('coerce.string works', () => {
			expect(coerce.string(123)).toBe('123')
		})

		test('coerce.number works', () => {
			expect(coerce.number('42')).toBe(42)
		})

		test('coerce.boolean works', () => {
			expect(coerce.boolean(1)).toBe(true)
		})

		test('coerce.date works', () => {
			const date = coerce.date('2024-01-15')
			expect(date instanceof Date).toBe(true)
		})

		test('coerce.bigint works', () => {
			expect(coerce.bigint(123)).toBe(BigInt(123))
		})
	})

	describe('Valibot-style aliases', () => {
		test('toString_ is alias for coerceString', () => {
			expect(toString_).toBe(coerceString)
			expect(toString_(123)).toBe('123')
		})

		test('toNumber is alias for coerceNumber', () => {
			expect(toNumber).toBe(coerceNumber)
			expect(toNumber('42')).toBe(42)
		})

		test('toBoolean is alias for coerceBoolean', () => {
			expect(toBoolean).toBe(coerceBoolean)
			expect(toBoolean(1)).toBe(true)
		})

		test('toBigint is alias for coerceBigInt', () => {
			expect(toBigint).toBe(coerceBigInt)
			expect(toBigint(123)).toBe(BigInt(123))
		})
	})

	describe('edge cases', () => {
		test('coerceString with Symbol', () => {
			// String(Symbol) returns 'Symbol(description)'
			expect(coerceString(Symbol('test'))).toBe('Symbol(test)')
		})

		test('coerceNumber with array', () => {
			expect(coerceNumber([])).toBe(0) // [] coerces to '' then 0
			expect(coerceNumber([5])).toBe(5) // [5] coerces to '5' then 5
			expect(() => coerceNumber([1, 2])).toThrow() // [1,2] coerces to '1,2' which is NaN
		})

		test('coerceBoolean preserves same type', () => {
			expect(typeof coerceBoolean(42)).toBe('boolean')
			expect(typeof coerceBoolean('hello')).toBe('boolean')
		})

		test('coerceDate with Date.now()', () => {
			const now = Date.now()
			const date = coerceDate(now)
			expect(date.getTime()).toBe(now)
		})

		test('coerceBigInt with negative zero', () => {
			expect(coerceBigInt(-0)).toBe(BigInt(0))
		})

		test('multiple coercions in sequence', () => {
			// String -> Number -> String
			const asNum = coerceNumber('42')
			const asStr = coerceString(asNum)
			expect(asStr).toBe('42')
		})
	})
})
