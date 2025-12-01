// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { toDate, toFloat, toInt, toMaxValue, toMinValue } from './parse'

describe('Parse Transforms', () => {
	describe('toInt', () => {
		test('parses valid integers', () => {
			expect(toInt('42')).toBe(42)
			expect(toInt('-10')).toBe(-10)
			expect(toInt('0')).toBe(0)
		})

		test('parses positive integers', () => {
			expect(toInt('1')).toBe(1)
			expect(toInt('100')).toBe(100)
			expect(toInt('999999')).toBe(999999)
		})

		test('parses negative integers', () => {
			expect(toInt('-1')).toBe(-1)
			expect(toInt('-100')).toBe(-100)
			expect(toInt('-999999')).toBe(-999999)
		})

		test('truncates decimals', () => {
			expect(toInt('3.14')).toBe(3)
			expect(toInt('3.99')).toBe(3)
		})

		test('truncates negative decimals', () => {
			expect(toInt('-3.14')).toBe(-3)
			expect(toInt('-3.99')).toBe(-3)
		})

		test('handles decimal with many places', () => {
			expect(toInt('3.14159265359')).toBe(3)
		})

		test('throws on invalid', () => {
			expect(() => toInt('abc')).toThrow('Invalid integer')
			expect(() => toInt('')).toThrow('Invalid integer')
		})

		test('throws on whitespace only', () => {
			expect(() => toInt('   ')).toThrow('Invalid integer')
		})

		test('throws on special values', () => {
			expect(() => toInt('NaN')).toThrow('Invalid integer')
			expect(() => toInt('Infinity')).toThrow('Invalid integer')
			expect(() => toInt('-Infinity')).toThrow('Invalid integer')
		})

		test('parses with leading/trailing spaces', () => {
			expect(toInt('  42  ')).toBe(42)
			expect(toInt('\t100\t')).toBe(100)
		})

		test('parses with plus sign', () => {
			expect(toInt('+42')).toBe(42)
		})

		test('handles very large numbers', () => {
			expect(toInt('9007199254740991')).toBe(9007199254740991) // Number.MAX_SAFE_INTEGER
		})

		test('handles edge case strings', () => {
			// parseInt stops at non-numeric characters, so '1e5' parses as 1
			expect(toInt('1e5')).toBe(1)
		})

		test('safe version success', () => {
			expect(toInt.safe!('42')).toEqual({ ok: true, value: 42 })
			expect(toInt.safe!('0')).toEqual({ ok: true, value: 0 })
			expect(toInt.safe!('-10')).toEqual({ ok: true, value: -10 })
		})

		test('safe version error', () => {
			expect(toInt.safe!('abc')).toEqual({ ok: false, error: 'Invalid integer' })
			expect(toInt.safe!('')).toEqual({ ok: false, error: 'Invalid integer' })
		})

		test('Standard Schema support', () => {
			expect(toInt['~standard']).toBeDefined()
			expect(toInt['~standard']!.version).toBe(1)
			expect(toInt['~standard']!.vendor).toBe('vex')
		})

		test('Standard Schema validate success', () => {
			const result = toInt['~standard']!.validate('42')
			expect(result.value).toBe(42)
		})

		test('Standard Schema validate failure', () => {
			const result = toInt['~standard']!.validate('abc')
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toBe('Invalid integer')
		})
	})

	describe('toFloat', () => {
		test('parses valid floats', () => {
			expect(toFloat('3.14')).toBe(3.14)
			expect(toFloat('42')).toBe(42)
			expect(toFloat('-0.5')).toBe(-0.5)
		})

		test('parses integers as floats', () => {
			expect(toFloat('100')).toBe(100)
			expect(toFloat('-100')).toBe(-100)
		})

		test('parses small decimals', () => {
			expect(toFloat('0.001')).toBe(0.001)
			expect(toFloat('0.0001')).toBe(0.0001)
		})

		test('parses large decimals', () => {
			expect(toFloat('123456.789')).toBe(123456.789)
		})

		test('parses with many decimal places', () => {
			expect(toFloat('3.14159265359')).toBeCloseTo(Math.PI)
		})

		test('throws on invalid', () => {
			expect(() => toFloat('abc')).toThrow('Invalid number')
			expect(() => toFloat('')).toThrow('Invalid number')
		})

		test('throws on whitespace only', () => {
			expect(() => toFloat('   ')).toThrow('Invalid number')
		})

		test('parses with leading/trailing spaces', () => {
			expect(toFloat('  3.14  ')).toBe(3.14)
		})

		test('parses with plus sign', () => {
			expect(toFloat('+3.14')).toBe(3.14)
		})

		test('handles zero', () => {
			expect(toFloat('0')).toBe(0)
			expect(toFloat('0.0')).toBe(0)
			expect(toFloat('-0')).toBe(-0)
		})

		test('handles scientific notation', () => {
			expect(toFloat('1e5')).toBe(100000)
			expect(toFloat('1e-5')).toBe(0.00001)
			expect(toFloat('1.5e2')).toBe(150)
		})

		test('safe version success', () => {
			expect(toFloat.safe!('3.14')).toEqual({ ok: true, value: 3.14 })
			expect(toFloat.safe!('42')).toEqual({ ok: true, value: 42 })
		})

		test('safe version error', () => {
			expect(toFloat.safe!('abc')).toEqual({ ok: false, error: 'Invalid number' })
			expect(toFloat.safe!('')).toEqual({ ok: false, error: 'Invalid number' })
		})

		test('Standard Schema support', () => {
			expect(toFloat['~standard']).toBeDefined()
			expect(toFloat['~standard']!.version).toBe(1)
		})

		test('Standard Schema validate success', () => {
			const result = toFloat['~standard']!.validate('3.14')
			expect(result.value).toBe(3.14)
		})

		test('Standard Schema validate failure', () => {
			const result = toFloat['~standard']!.validate('abc')
			expect(result.issues![0].message).toBe('Invalid number')
		})
	})

	describe('toDate', () => {
		test('parses valid dates', () => {
			const date = toDate('2024-01-15')
			expect(date.toISOString().startsWith('2024-01-15')).toBe(true)
		})

		test('parses ISO dates', () => {
			const date = toDate('2024-01-15T10:30:00Z')
			expect(date instanceof Date).toBe(true)
		})

		test('parses ISO dates with timezone', () => {
			const date = toDate('2024-01-15T10:30:00+05:00')
			expect(date instanceof Date).toBe(true)
		})

		test('parses date with time', () => {
			const date = toDate('2024-06-15T14:30:00')
			expect(date instanceof Date).toBe(true)
		})

		test('parses date with milliseconds', () => {
			const date = toDate('2024-01-15T10:30:00.123Z')
			expect(date instanceof Date).toBe(true)
			expect(date.getMilliseconds()).toBe(123)
		})

		test('throws on invalid', () => {
			expect(() => toDate('invalid')).toThrow('Invalid date')
			expect(() => toDate('not-a-date')).toThrow('Invalid date')
		})

		test('throws on empty string', () => {
			expect(() => toDate('')).toThrow('Invalid date')
		})

		test('throws on random text', () => {
			expect(() => toDate('hello world')).toThrow('Invalid date')
		})

		test('parses various date formats', () => {
			// Different valid formats
			expect(toDate('2024-01-01') instanceof Date).toBe(true)
			expect(toDate('2024/01/01') instanceof Date).toBe(true)
		})

		test('parses edge dates', () => {
			expect(toDate('1970-01-01') instanceof Date).toBe(true)
			expect(toDate('2099-12-31') instanceof Date).toBe(true)
		})

		test('handles leap year date', () => {
			const date = toDate('2024-02-29')
			expect(date instanceof Date).toBe(true)
		})

		test('safe version success', () => {
			const result = toDate.safe!('2024-01-15')
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value instanceof Date).toBe(true)
			}
		})

		test('safe version error', () => {
			expect(toDate.safe!('invalid')).toEqual({ ok: false, error: 'Invalid date' })
		})

		test('Standard Schema support', () => {
			expect(toDate['~standard']).toBeDefined()
			expect(toDate['~standard']!.version).toBe(1)
		})

		test('Standard Schema validate success', () => {
			const result = toDate['~standard']!.validate('2024-01-15')
			expect(result.value instanceof Date).toBe(true)
		})

		test('Standard Schema validate failure', () => {
			const result = toDate['~standard']!.validate('invalid')
			expect(result.issues![0].message).toBe('Invalid date')
		})
	})

	describe('toMaxValue', () => {
		describe('with numbers', () => {
			test('clamps values greater than max', () => {
				const clampTo100 = toMaxValue(100)
				expect(clampTo100(150)).toBe(100)
				expect(clampTo100(200)).toBe(100)
			})

			test('passes values less than or equal to max', () => {
				const clampTo100 = toMaxValue(100)
				expect(clampTo100(50)).toBe(50)
				expect(clampTo100(100)).toBe(100)
			})

			test('passes values less than max', () => {
				const clampTo100 = toMaxValue(100)
				expect(clampTo100(0)).toBe(0)
				expect(clampTo100(-50)).toBe(-50)
			})

			test('handles zero max', () => {
				const clampTo0 = toMaxValue(0)
				expect(clampTo0(100)).toBe(0)
				expect(clampTo0(-100)).toBe(-100)
			})

			test('handles negative max', () => {
				const clampToNeg10 = toMaxValue(-10)
				expect(clampToNeg10(0)).toBe(-10)
				expect(clampToNeg10(-5)).toBe(-10)
				expect(clampToNeg10(-20)).toBe(-20)
			})

			test('handles decimal max', () => {
				const clampTo3_5 = toMaxValue(3.5)
				expect(clampTo3_5(4)).toBe(3.5)
				expect(clampTo3_5(3)).toBe(3)
			})

			test('safe version works', () => {
				const clampTo100 = toMaxValue(100)
				expect(clampTo100.safe!(150)).toEqual({ ok: true, value: 100 })
				expect(clampTo100.safe!(50)).toEqual({ ok: true, value: 50 })
			})
		})

		describe('with bigint', () => {
			test('works with bigint', () => {
				const clampTo100n = toMaxValue(100n)
				expect(clampTo100n(150n)).toBe(100n)
				expect(clampTo100n(50n)).toBe(50n)
			})

			test('handles large bigints', () => {
				const max = BigInt('9007199254740991')
				const clamp = toMaxValue(max)
				expect(clamp(BigInt('9007199254740992'))).toBe(max)
			})

			test('safe version with bigint', () => {
				const clampTo100n = toMaxValue(100n)
				expect(clampTo100n.safe!(150n)).toEqual({ ok: true, value: 100n })
			})
		})

		describe('with Date', () => {
			test('works with Date', () => {
				const maxDate = new Date('2024-12-31')
				const clampDate = toMaxValue(maxDate)
				const futureDate = new Date('2025-06-15')
				const pastDate = new Date('2024-01-15')
				expect(clampDate(futureDate)).toBe(maxDate)
				expect(clampDate(pastDate)).toBe(pastDate)
			})

			test('handles exact max date', () => {
				const maxDate = new Date('2024-12-31')
				const clampDate = toMaxValue(maxDate)
				const sameDate = new Date('2024-12-31')
				expect(clampDate(sameDate)).toBe(sameDate)
			})

			test('safe version with Date', () => {
				const maxDate = new Date('2024-12-31')
				const clampDate = toMaxValue(maxDate)
				const result = clampDate.safe!(new Date('2025-01-01'))
				expect(result.ok).toBe(true)
				if (result.ok) {
					expect(result.value).toBe(maxDate)
				}
			})
		})

		describe('Standard Schema', () => {
			test('has ~standard property', () => {
				const clamp = toMaxValue(100)
				expect(clamp['~standard']).toBeDefined()
				expect(clamp['~standard']!.version).toBe(1)
			})

			test('validate returns clamped value', () => {
				const clamp = toMaxValue(100)
				const result = clamp['~standard']!.validate(150)
				expect(result.value).toBe(100)
			})

			test('validate returns original value when within max', () => {
				const clamp = toMaxValue(100)
				const result = clamp['~standard']!.validate(50)
				expect(result.value).toBe(50)
			})
		})
	})

	describe('toMinValue', () => {
		describe('with numbers', () => {
			test('clamps values less than min', () => {
				const clampTo0 = toMinValue(0)
				expect(clampTo0(-50)).toBe(0)
				expect(clampTo0(-100)).toBe(0)
			})

			test('passes values greater than or equal to min', () => {
				const clampTo0 = toMinValue(0)
				expect(clampTo0(50)).toBe(50)
				expect(clampTo0(0)).toBe(0)
			})

			test('handles positive min', () => {
				const clampTo10 = toMinValue(10)
				expect(clampTo10(5)).toBe(10)
				expect(clampTo10(15)).toBe(15)
			})

			test('handles negative min', () => {
				const clampToNeg10 = toMinValue(-10)
				expect(clampToNeg10(-20)).toBe(-10)
				expect(clampToNeg10(-5)).toBe(-5)
			})

			test('handles decimal min', () => {
				const clampTo0_5 = toMinValue(0.5)
				expect(clampTo0_5(0.3)).toBe(0.5)
				expect(clampTo0_5(0.7)).toBe(0.7)
			})

			test('safe version works', () => {
				const clampTo0 = toMinValue(0)
				expect(clampTo0.safe!(-50)).toEqual({ ok: true, value: 0 })
				expect(clampTo0.safe!(50)).toEqual({ ok: true, value: 50 })
			})
		})

		describe('with bigint', () => {
			test('works with bigint', () => {
				const clampTo0n = toMinValue(0n)
				expect(clampTo0n(-50n)).toBe(0n)
				expect(clampTo0n(50n)).toBe(50n)
			})

			test('handles large bigints', () => {
				const min = BigInt('-9007199254740991')
				const clamp = toMinValue(min)
				expect(clamp(BigInt('-9007199254740992'))).toBe(min)
			})

			test('safe version with bigint', () => {
				const clampTo0n = toMinValue(0n)
				expect(clampTo0n.safe!(-50n)).toEqual({ ok: true, value: 0n })
			})
		})

		describe('with Date', () => {
			test('works with Date', () => {
				const minDate = new Date('2024-01-01')
				const clampDate = toMinValue(minDate)
				const pastDate = new Date('2023-06-15')
				const futureDate = new Date('2024-06-15')
				expect(clampDate(pastDate)).toBe(minDate)
				expect(clampDate(futureDate)).toBe(futureDate)
			})

			test('handles exact min date', () => {
				const minDate = new Date('2024-01-01')
				const clampDate = toMinValue(minDate)
				const sameDate = new Date('2024-01-01')
				expect(clampDate(sameDate)).toBe(sameDate)
			})

			test('safe version with Date', () => {
				const minDate = new Date('2024-01-01')
				const clampDate = toMinValue(minDate)
				const result = clampDate.safe!(new Date('2023-01-01'))
				expect(result.ok).toBe(true)
				if (result.ok) {
					expect(result.value).toBe(minDate)
				}
			})
		})

		describe('Standard Schema', () => {
			test('has ~standard property', () => {
				const clamp = toMinValue(0)
				expect(clamp['~standard']).toBeDefined()
				expect(clamp['~standard']!.version).toBe(1)
			})

			test('validate returns clamped value', () => {
				const clamp = toMinValue(0)
				const result = clamp['~standard']!.validate(-50)
				expect(result.value).toBe(0)
			})

			test('validate returns original value when within min', () => {
				const clamp = toMinValue(0)
				const result = clamp['~standard']!.validate(50)
				expect(result.value).toBe(50)
			})
		})
	})

	describe('combining min and max', () => {
		test('can clamp to range', () => {
			const clampMin = toMinValue(0)
			const clampMax = toMaxValue(100)

			// Clamp to range [0, 100]
			expect(clampMax(clampMin(-50))).toBe(0)
			expect(clampMax(clampMin(50))).toBe(50)
			expect(clampMax(clampMin(150))).toBe(100)
		})

		test('order matters for edge cases', () => {
			const clampMin = toMinValue(100)
			const clampMax = toMaxValue(0)

			// If min > max, result depends on order
			expect(clampMax(clampMin(50))).toBe(0) // Clamped to min (100), then max (0)
			expect(clampMin(clampMax(50))).toBe(100) // Clamped to max (0), then min (100)
		})
	})

	describe('edge cases', () => {
		test('toInt with leading zeros', () => {
			expect(toInt('007')).toBe(7)
			expect(toInt('0042')).toBe(42)
		})

		test('toFloat with leading zeros', () => {
			expect(toFloat('007.5')).toBe(7.5)
		})

		test('toMaxValue preserves exact match', () => {
			const clamp = toMaxValue(100)
			expect(clamp(100)).toBe(100)
		})

		test('toMinValue preserves exact match', () => {
			const clamp = toMinValue(0)
			expect(clamp(0)).toBe(0)
		})

		test('toDate with timestamps', () => {
			const timestamp = Date.now()
			const date = toDate(new Date(timestamp).toISOString())
			expect(date instanceof Date).toBe(true)
		})

		test('toInt with unicode digits', () => {
			// Implementation may or may not handle this
			expect(() => toInt('１２３')).toThrow()
		})
	})

	describe('type preservation', () => {
		test('toMaxValue preserves number type', () => {
			const result = toMaxValue(100)(50)
			expect(typeof result).toBe('number')
		})

		test('toMaxValue preserves bigint type', () => {
			const result = toMaxValue(100n)(50n)
			expect(typeof result).toBe('bigint')
		})

		test('toMinValue preserves number type', () => {
			const result = toMinValue(0)(50)
			expect(typeof result).toBe('number')
		})

		test('toMinValue preserves bigint type', () => {
			const result = toMinValue(0n)(50n)
			expect(typeof result).toBe('bigint')
		})
	})
})
