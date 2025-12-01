// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { gtValue, ltValue, maxValue, minValue, notValue, notValues, value, values } from './value'

describe('value', () => {
	test('accepts exact value match', () => {
		const isZero = value(0)
		expect(isZero(0)).toBe(0)

		const isHello = value('hello')
		expect(isHello('hello')).toBe('hello')

		const isTrue = value(true)
		expect(isTrue(true)).toBe(true)
	})

	test('rejects different values', () => {
		const isZero = value(0)
		expect(() => isZero(1)).toThrow('Expected 0')
		expect(() => isZero(-1)).toThrow('Expected 0')

		const isHello = value('hello')
		expect(() => isHello('world')).toThrow('Expected "hello"')
	})

	test('handles null and undefined', () => {
		const isNull = value(null)
		expect(isNull(null)).toBe(null)
		expect(() => isNull(undefined)).toThrow('Expected null')

		const isUndefined = value(undefined)
		expect(isUndefined(undefined)).toBe(undefined)
		expect(() => isUndefined(null)).toThrow('Expected undefined')
	})

	describe('safe', () => {
		test('returns ok for matching value', () => {
			expect(value(42).safe!(42)).toEqual({ ok: true, value: 42 })
		})

		test('returns error for non-matching value', () => {
			expect(value(42).safe!(0)).toEqual({ ok: false, error: 'Expected 42' })
		})
	})
})

describe('values', () => {
	test('accepts values in the set', () => {
		const isStatus = values(['active', 'inactive', 'pending'] as const)
		expect(isStatus('active')).toBe('active')
		expect(isStatus('inactive')).toBe('inactive')
		expect(isStatus('pending')).toBe('pending')
	})

	test('rejects values not in the set', () => {
		const isStatus = values(['active', 'inactive'] as const)
		expect(() => isStatus('pending' as any)).toThrow('Expected one of: "active", "inactive"')
	})

	test('works with numbers', () => {
		const isValidCode = values([1, 2, 3])
		expect(isValidCode(1)).toBe(1)
		expect(isValidCode(2)).toBe(2)
		expect(() => isValidCode(4)).toThrow('Expected one of: 1, 2, 3')
	})

	test('works with single value', () => {
		const isSingle = values([42])
		expect(isSingle(42)).toBe(42)
		expect(() => isSingle(0)).toThrow('Expected one of: 42')
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			const isStatus = values(['a', 'b'] as const)
			expect(isStatus.safe!('a')).toEqual({ ok: true, value: 'a' })
		})

		test('returns error for invalid value', () => {
			const isStatus = values(['a', 'b'] as const)
			expect(isStatus.safe!('c' as any)).toEqual({ ok: false, error: 'Expected one of: "a", "b"' })
		})
	})
})

describe('notValue', () => {
	test('accepts values different from excluded', () => {
		const notZero = notValue(0)
		expect(notZero(1)).toBe(1)
		expect(notZero(-1)).toBe(-1)
		expect(notZero(100)).toBe(100)
	})

	test('rejects excluded value', () => {
		const notZero = notValue(0)
		expect(() => notZero(0)).toThrow('Value must not be 0')

		const notHello = notValue('hello')
		expect(() => notHello('hello')).toThrow('Value must not be "hello"')
	})

	test('handles null and undefined', () => {
		const notNull = notValue(null)
		expect(notNull(undefined)).toBe(undefined)
		expect(() => notNull(null)).toThrow('Value must not be null')
	})

	describe('safe', () => {
		test('returns ok for different value', () => {
			expect(notValue(0).safe!(1)).toEqual({ ok: true, value: 1 })
		})

		test('returns error for excluded value', () => {
			expect(notValue(0).safe!(0)).toEqual({ ok: false, error: 'Value must not be 0' })
		})
	})
})

describe('notValues', () => {
	test('accepts values not in the set', () => {
		const notSpecial = notValues([0, -1])
		expect(notSpecial(1)).toBe(1)
		expect(notSpecial(100)).toBe(100)
	})

	test('rejects values in the set', () => {
		const notSpecial = notValues([0, -1])
		expect(() => notSpecial(0)).toThrow('Value must not be one of: 0, -1')
		expect(() => notSpecial(-1)).toThrow('Value must not be one of: 0, -1')
	})

	test('works with strings', () => {
		const notReserved = notValues(['admin', 'root'])
		expect(notReserved('user')).toBe('user')
		expect(() => notReserved('admin')).toThrow('Value must not be one of: "admin", "root"')
	})

	describe('safe', () => {
		test('returns ok for allowed value', () => {
			expect(notValues([0]).safe!(1)).toEqual({ ok: true, value: 1 })
		})

		test('returns error for excluded value', () => {
			expect(notValues([0, 1]).safe!(0)).toEqual({ ok: false, error: 'Value must not be one of: 0, 1' })
		})
	})
})

describe('gtValue', () => {
	test('accepts values greater than min', () => {
		const gt0 = gtValue(0)
		expect(gt0(1)).toBe(1)
		expect(gt0(100)).toBe(100)
		expect(gt0(0.001)).toBe(0.001)
	})

	test('rejects values less than or equal to min', () => {
		const gt0 = gtValue(0)
		expect(() => gt0(0)).toThrow('Must be greater than 0')
		expect(() => gt0(-1)).toThrow('Must be greater than 0')
	})

	test('works with bigint', () => {
		const gt100n = gtValue(100n)
		expect(gt100n(101n)).toBe(101n)
		expect(() => gt100n(100n)).toThrow('Must be greater than 100')
	})

	test('works with Date', () => {
		const date = new Date('2024-01-01')
		const afterDate = gtValue(date)
		const later = new Date('2024-06-01')
		expect(afterDate(later)).toEqual(later)
		expect(() => afterDate(date)).toThrow()
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			expect(gtValue(0).safe!(1)).toEqual({ ok: true, value: 1 })
		})

		test('returns error for invalid value', () => {
			expect(gtValue(0).safe!(0)).toEqual({ ok: false, error: 'Must be greater than 0' })
		})
	})
})

describe('ltValue', () => {
	test('accepts values less than max', () => {
		const lt100 = ltValue(100)
		expect(lt100(99)).toBe(99)
		expect(lt100(0)).toBe(0)
		expect(lt100(-100)).toBe(-100)
	})

	test('rejects values greater than or equal to max', () => {
		const lt100 = ltValue(100)
		expect(() => lt100(100)).toThrow('Must be less than 100')
		expect(() => lt100(101)).toThrow('Must be less than 100')
	})

	test('works with bigint', () => {
		const lt100n = ltValue(100n)
		expect(lt100n(99n)).toBe(99n)
		expect(() => lt100n(100n)).toThrow('Must be less than 100')
	})

	test('works with Date', () => {
		const date = new Date('2024-06-01')
		const beforeDate = ltValue(date)
		const earlier = new Date('2024-01-01')
		expect(beforeDate(earlier)).toEqual(earlier)
		expect(() => beforeDate(date)).toThrow()
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			expect(ltValue(100).safe!(99)).toEqual({ ok: true, value: 99 })
		})

		test('returns error for invalid value', () => {
			expect(ltValue(100).safe!(100)).toEqual({ ok: false, error: 'Must be less than 100' })
		})
	})
})

describe('minValue', () => {
	test('accepts values at least min', () => {
		const min0 = minValue(0)
		expect(min0(0)).toBe(0)
		expect(min0(1)).toBe(1)
		expect(min0(100)).toBe(100)
	})

	test('rejects values less than min', () => {
		const min0 = minValue(0)
		expect(() => min0(-1)).toThrow('Must be at least 0')
		expect(() => min0(-100)).toThrow('Must be at least 0')
	})

	test('works with bigint', () => {
		const min100n = minValue(100n)
		expect(min100n(100n)).toBe(100n)
		expect(min100n(101n)).toBe(101n)
		expect(() => min100n(99n)).toThrow('Must be at least 100')
	})

	test('works with Date', () => {
		const date = new Date('2024-01-01')
		const afterOrEqual = minValue(date)
		expect(afterOrEqual(date)).toEqual(date)
		const later = new Date('2024-06-01')
		expect(afterOrEqual(later)).toEqual(later)
		const earlier = new Date('2023-01-01')
		expect(() => afterOrEqual(earlier)).toThrow()
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			expect(minValue(0).safe!(0)).toEqual({ ok: true, value: 0 })
			expect(minValue(0).safe!(1)).toEqual({ ok: true, value: 1 })
		})

		test('returns error for invalid value', () => {
			expect(minValue(0).safe!(-1)).toEqual({ ok: false, error: 'Must be at least 0' })
		})
	})
})

describe('maxValue', () => {
	test('accepts values at most max', () => {
		const max100 = maxValue(100)
		expect(max100(100)).toBe(100)
		expect(max100(50)).toBe(50)
		expect(max100(0)).toBe(0)
	})

	test('rejects values greater than max', () => {
		const max100 = maxValue(100)
		expect(() => max100(101)).toThrow('Must be at most 100')
		expect(() => max100(200)).toThrow('Must be at most 100')
	})

	test('works with bigint', () => {
		const max100n = maxValue(100n)
		expect(max100n(100n)).toBe(100n)
		expect(max100n(99n)).toBe(99n)
		expect(() => max100n(101n)).toThrow('Must be at most 100')
	})

	test('works with Date', () => {
		const date = new Date('2024-06-01')
		const beforeOrEqual = maxValue(date)
		expect(beforeOrEqual(date)).toEqual(date)
		const earlier = new Date('2024-01-01')
		expect(beforeOrEqual(earlier)).toEqual(earlier)
		const later = new Date('2024-12-01')
		expect(() => beforeOrEqual(later)).toThrow()
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			expect(maxValue(100).safe!(100)).toEqual({ ok: true, value: 100 })
			expect(maxValue(100).safe!(50)).toEqual({ ok: true, value: 50 })
		})

		test('returns error for invalid value', () => {
			expect(maxValue(100).safe!(101)).toEqual({ ok: false, error: 'Must be at most 100' })
		})
	})
})

describe('edge cases', () => {
	test('value with object uses reference equality', () => {
		const obj = { a: 1 }
		const isObj = value(obj)
		expect(isObj(obj)).toBe(obj)
		expect(() => isObj({ a: 1 })).toThrow() // Different reference
	})

	test('empty values array', () => {
		const isEmpty = values([])
		expect(() => isEmpty('anything' as never)).toThrow('Expected one of: ')
	})

	test('empty notValues array accepts everything', () => {
		const notEmpty = notValues([])
		expect(notEmpty(0)).toBe(0)
		expect(notEmpty('anything')).toBe('anything')
	})

	test('NaN handling', () => {
		// NaN !== NaN, so this is tricky
		const validateNaN = value(Number.NaN)
		// This will fail because NaN !== NaN
		expect(() => validateNaN(Number.NaN)).toThrow()
	})

	test('floating point comparison', () => {
		const gt = gtValue(0.1 + 0.2) // 0.30000000000000004
		expect(gt(0.4)).toBe(0.4)
		expect(() => gt(0.3)).toThrow() // 0.3 < 0.30000000000000004
	})

	test('negative zero', () => {
		const isZero = value(0)
		expect(isZero(-0)).toBe(-0) // -0 === 0 in JS
	})
})
