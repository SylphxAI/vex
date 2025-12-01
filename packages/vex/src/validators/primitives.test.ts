// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { pipe } from '../composition/pipe'
import { createMetaAction, getMeta, ValidationError } from '../core'
import { gte, int, lte, positive } from './number'
import { arr, bigInt, bool, date, func, num, obj, str, sym } from './primitives'
import { email, max, min, nonempty } from './string'

describe('Primitive Validators (Factory Pattern)', () => {
	describe('str', () => {
		test('str() validates strings', () => {
			expect(str()('hello')).toBe('hello')
			expect(str()('')).toBe('')
			expect(str()('   ')).toBe('   ')
		})

		test('str() throws on non-strings', () => {
			expect(() => str()(123)).toThrow(ValidationError)
			expect(() => str()(null)).toThrow(ValidationError)
			expect(() => str()(undefined)).toThrow(ValidationError)
			expect(() => str()({})).toThrow(ValidationError)
			expect(() => str()([])).toThrow(ValidationError)
			expect(() => str()(true)).toThrow(ValidationError)
		})

		test('str() safe version returns success', () => {
			expect(str().safe!('hello')).toEqual({ ok: true, value: 'hello' })
		})

		test('str() safe version returns error', () => {
			expect(str().safe!(123)).toEqual({ ok: false, error: 'Expected string' })
		})

		test('str() Standard Schema support', () => {
			expect(str()['~standard']).toBeDefined()
			expect(str()['~standard']!.version).toBe(1)
			expect(str()['~standard']!.vendor).toBe('vex')
		})

		test('str() Standard Schema validate', () => {
			expect(str()['~standard']!.validate('hello')).toEqual({ value: 'hello' })
			const result = str()['~standard']!.validate(123)
			expect(result.issues![0].message).toBe('Expected string')
		})

		test('str(email) validates email format', () => {
			expect(str(email)('test@example.com')).toBe('test@example.com')
			expect(() => str(email)('invalid')).toThrow()
		})

		test('str(min, max) validates length', () => {
			expect(str(min(3), max(10))('hello')).toBe('hello')
			expect(() => str(min(3), max(10))('ab')).toThrow()
			expect(() => str(min(3), max(10))('12345678901')).toThrow()
		})

		test('str() works in pipe', () => {
			const pipeline = pipe(str())
			expect(pipeline('hello')).toBe('hello')
			expect(() => pipeline(123)).toThrow()
		})

		test('handles unicode strings', () => {
			expect(str()('你好')).toBe('你好')
			expect(str()('👋')).toBe('👋')
		})
	})

	describe('num', () => {
		test('num() validates numbers', () => {
			expect(num()(42)).toBe(42)
			expect(num()(3.14)).toBe(3.14)
			expect(num()(-42)).toBe(-42)
			expect(num()(0)).toBe(0)
		})

		test('num() throws on NaN', () => {
			expect(() => num()(NaN)).toThrow(ValidationError)
		})

		test('num() throws on non-numbers', () => {
			expect(() => num()('42')).toThrow(ValidationError)
			expect(() => num()(null)).toThrow(ValidationError)
			expect(() => num()(undefined)).toThrow(ValidationError)
		})

		test('num() accepts Infinity', () => {
			expect(num()(Infinity)).toBe(Infinity)
			expect(num()(-Infinity)).toBe(-Infinity)
		})

		test('num() safe version', () => {
			expect(num().safe!(42)).toEqual({ ok: true, value: 42 })
			expect(num().safe!(NaN)).toEqual({ ok: false, error: 'Expected number' })
			expect(num().safe!('42')).toEqual({ ok: false, error: 'Expected number' })
		})

		test('num() Standard Schema support', () => {
			expect(num()['~standard']).toBeDefined()
			expect(num()['~standard']!.validate(42)).toEqual({ value: 42 })
		})

		test('num(int) validates integer', () => {
			expect(num(int)(42)).toBe(42)
			expect(() => num(int)(3.14)).toThrow()
		})

		test('num(int, positive) validates positive integer', () => {
			expect(num(int, positive)(42)).toBe(42)
			expect(() => num(int, positive)(-1)).toThrow()
			expect(() => num(int, positive)(3.14)).toThrow()
		})

		test('num() works in pipe', () => {
			const validate = pipe(num(), positive, int)
			expect(validate(42)).toBe(42)
			expect(() => validate(-1)).toThrow()
		})
	})

	describe('bool', () => {
		test('bool() validates booleans', () => {
			expect(bool()(true)).toBe(true)
			expect(bool()(false)).toBe(false)
		})

		test('bool() throws on non-booleans', () => {
			expect(() => bool()('true')).toThrow(ValidationError)
			expect(() => bool()(1)).toThrow(ValidationError)
			expect(() => bool()(0)).toThrow(ValidationError)
			expect(() => bool()(null)).toThrow(ValidationError)
		})

		test('bool() safe version', () => {
			expect(bool().safe!(true)).toEqual({ ok: true, value: true })
			expect(bool().safe!(false)).toEqual({ ok: true, value: false })
			expect(bool().safe!('true')).toEqual({ ok: false, error: 'Expected boolean' })
		})

		test('bool() Standard Schema support', () => {
			expect(bool()['~standard']).toBeDefined()
			expect(bool()['~standard']!.validate(true)).toEqual({ value: true })
		})

		test('bool() works in pipe', () => {
			const validate = pipe(bool())
			expect(validate(true)).toBe(true)
			expect(() => validate('true')).toThrow()
		})
	})

	describe('bigInt', () => {
		test('bigInt() validates bigints', () => {
			expect(bigInt()(BigInt(123))).toBe(BigInt(123))
			expect(bigInt()(BigInt(-123))).toBe(BigInt(-123))
			expect(bigInt()(BigInt(0))).toBe(BigInt(0))
		})

		test('bigInt() throws on non-bigints', () => {
			expect(() => bigInt()(123)).toThrow(ValidationError)
			expect(() => bigInt()('123')).toThrow(ValidationError)
			expect(() => bigInt()(null)).toThrow(ValidationError)
		})

		test('bigInt() safe version', () => {
			expect(bigInt().safe!(BigInt(123))).toEqual({ ok: true, value: BigInt(123) })
			expect(bigInt().safe!(123)).toEqual({ ok: false, error: 'Expected bigint' })
		})

		test('bigInt() Standard Schema support', () => {
			expect(bigInt()['~standard']).toBeDefined()
			expect(bigInt()['~standard']!.validate(BigInt(123))).toEqual({ value: BigInt(123) })
		})

		test('bigInt() works in pipe', () => {
			const validate = pipe(bigInt())
			expect(validate(BigInt(42))).toBe(BigInt(42))
			expect(() => validate(42)).toThrow()
		})
	})

	describe('date', () => {
		test('date() validates Date objects', () => {
			const d = new Date()
			expect(date()(d)).toBe(d)
		})

		test('date() validates specific dates', () => {
			const d = new Date('2024-01-01')
			expect(date()(d)).toBe(d)
		})

		test('date() throws on invalid Date', () => {
			expect(() => date()(new Date('invalid'))).toThrow(ValidationError)
		})

		test('date() throws on non-Date', () => {
			expect(() => date()('2024-01-01')).toThrow(ValidationError)
			expect(() => date()(Date.now())).toThrow(ValidationError)
			expect(() => date()(null)).toThrow(ValidationError)
		})

		test('date() safe version', () => {
			const d = new Date()
			expect(date().safe!(d)).toEqual({ ok: true, value: d })
			expect(date().safe!('2024-01-01')).toEqual({ ok: false, error: 'Expected Date' })
			expect(date().safe!(new Date('invalid'))).toEqual({ ok: false, error: 'Expected Date' })
		})

		test('date() Standard Schema support', () => {
			expect(date()['~standard']).toBeDefined()
			const d = new Date()
			expect(date()['~standard']!.validate(d)).toEqual({ value: d })
		})

		test('date() works in pipe', () => {
			const validate = pipe(date())
			const d = new Date()
			expect(validate(d)).toBe(d)
			expect(() => validate('2024-01-01')).toThrow()
		})
	})

	describe('arr', () => {
		test('arr() validates arrays', () => {
			expect(arr()([1, 2, 3])).toEqual([1, 2, 3])
			expect(arr()([])).toEqual([])
			expect(arr()(['a', 'b'])).toEqual(['a', 'b'])
		})

		test('arr() throws on non-arrays', () => {
			expect(() => arr()({})).toThrow(ValidationError)
			expect(() => arr()(null)).toThrow(ValidationError)
			expect(() => arr()(undefined)).toThrow(ValidationError)
			expect(() => arr()('array')).toThrow(ValidationError)
		})

		test('arr() safe version', () => {
			expect(arr().safe!([1, 2])).toEqual({ ok: true, value: [1, 2] })
			expect(arr().safe!({})).toEqual({ ok: false, error: 'Expected array' })
			expect(arr().safe!(null)).toEqual({ ok: false, error: 'Expected array' })
		})

		test('arr() Standard Schema support', () => {
			expect(arr()['~standard']).toBeDefined()
			expect(arr()['~standard']!.validate([1, 2])).toEqual({ value: [1, 2] })
		})

		test('arr() works in pipe', () => {
			const validate = pipe(arr())
			expect(validate([1, 2, 3])).toEqual([1, 2, 3])
			expect(() => validate({})).toThrow()
		})

		test('handles nested arrays', () => {
			expect(
				arr()([
					[1, 2],
					[3, 4],
				]),
			).toEqual([
				[1, 2],
				[3, 4],
			])
		})
	})

	describe('obj', () => {
		test('obj() validates objects', () => {
			expect(obj()({ a: 1 })).toEqual({ a: 1 })
			expect(obj()({})).toEqual({})
			expect(obj()({ nested: { value: true } })).toEqual({ nested: { value: true } })
		})

		test('obj() throws on null', () => {
			expect(() => obj()(null)).toThrow(ValidationError)
		})

		test('obj() throws on arrays', () => {
			expect(() => obj()([])).toThrow(ValidationError)
		})

		test('obj() throws on primitives', () => {
			expect(() => obj()('string')).toThrow(ValidationError)
			expect(() => obj()(123)).toThrow(ValidationError)
			expect(() => obj()(true)).toThrow(ValidationError)
		})

		test('obj() safe version', () => {
			expect(obj().safe!({ a: 1 })).toEqual({ ok: true, value: { a: 1 } })
			expect(obj().safe!(null)).toEqual({ ok: false, error: 'Expected object' })
			expect(obj().safe!([])).toEqual({ ok: false, error: 'Expected object' })
		})

		test('obj() Standard Schema support', () => {
			expect(obj()['~standard']).toBeDefined()
			expect(obj()['~standard']!.validate({ a: 1 })).toEqual({ value: { a: 1 } })
		})

		test('obj() works in pipe', () => {
			const validate = pipe(obj())
			expect(validate({ a: 1 })).toEqual({ a: 1 })
			expect(() => validate(null)).toThrow()
		})
	})

	describe('cross-type interactions', () => {
		test('string looks like number', () => {
			expect(() => num()('42')).toThrow()
			expect(str()('42')).toBe('42')
		})

		test('boolean looks like string', () => {
			expect(() => str()(true)).toThrow()
			expect(bool()(true)).toBe(true)
		})

		test('array vs object', () => {
			expect(() => obj()([1, 2, 3])).toThrow()
			expect(arr()([1, 2, 3])).toEqual([1, 2, 3])
		})

		test('null vs object', () => {
			expect(() => obj()(null)).toThrow()
		})

		test('date vs string', () => {
			expect(() => str()(new Date())).toThrow()
			expect(date()(new Date())).toBeInstanceOf(Date)
		})
	})

	describe('sym', () => {
		test('sym() validates symbols', () => {
			const s = Symbol('test')
			expect(sym()(s)).toBe(s)
		})

		test('sym() validates Symbol.for', () => {
			const s = Symbol.for('global')
			expect(sym()(s)).toBe(s)
		})

		test('sym() throws on non-symbols', () => {
			expect(() => sym()('symbol')).toThrow(ValidationError)
			expect(() => sym()(123)).toThrow(ValidationError)
			expect(() => sym()(null)).toThrow(ValidationError)
			expect(() => sym()(undefined)).toThrow(ValidationError)
			expect(() => sym()({})).toThrow(ValidationError)
		})

		test('sym() safe version', () => {
			const s = Symbol('test')
			expect(sym().safe!(s)).toEqual({ ok: true, value: s })
			expect(sym().safe!('symbol')).toEqual({ ok: false, error: 'Expected symbol' })
		})

		test('sym() Standard Schema support', () => {
			expect(sym()['~standard']).toBeDefined()
			const s = Symbol('test')
			expect(sym()['~standard']!.validate(s)).toEqual({ value: s })
		})

		test('sym() works in pipe', () => {
			const validate = pipe(sym())
			const s = Symbol('test')
			expect(validate(s)).toBe(s)
			expect(() => validate('symbol')).toThrow()
		})
	})

	describe('func', () => {
		test('func() validates functions', () => {
			const fn = () => {}
			expect(func()(fn)).toBe(fn)
		})

		test('func() validates arrow functions', () => {
			const fn = (x: number) => x * 2
			expect(func()(fn)).toBe(fn)
		})

		test('func() validates regular functions', () => {
			function namedFn() {
				return 'test'
			}
			expect(func()(namedFn)).toBe(namedFn)
		})

		test('func() validates async functions', () => {
			const asyncFn = async () => {}
			expect(func()(asyncFn)).toBe(asyncFn)
		})

		test('func() validates class constructors', () => {
			class TestClass {}
			expect(func()(TestClass)).toBe(TestClass)
		})

		test('func() throws on non-functions', () => {
			expect(() => func()('function')).toThrow(ValidationError)
			expect(() => func()(123)).toThrow(ValidationError)
			expect(() => func()(null)).toThrow(ValidationError)
			expect(() => func()(undefined)).toThrow(ValidationError)
			expect(() => func()({})).toThrow(ValidationError)
			expect(() => func()([])).toThrow(ValidationError)
		})

		test('func() safe version', () => {
			const fn = () => {}
			expect(func().safe!(fn)).toEqual({ ok: true, value: fn })
			expect(func().safe!('function')).toEqual({ ok: false, error: 'Expected function' })
		})

		test('func() Standard Schema support', () => {
			expect(func()['~standard']).toBeDefined()
			const fn = () => {}
			expect(func()['~standard']!.validate(fn)).toEqual({ value: fn })
		})

		test('func() works in pipe', () => {
			const validate = pipe(func())
			const fn = () => {}
			expect(validate(fn)).toBe(fn)
			expect(() => validate('function')).toThrow()
		})
	})

	describe('multi-constraint compositions', () => {
		test('str with 4+ constraints (generic fallback path)', () => {
			const validate = str(nonempty, min(2), max(10), email)
			expect(validate('ab@c.co')).toBe('ab@c.co')
			expect(() => validate('')).toThrow() // nonempty fails
			expect(() => validate('a')).toThrow() // min fails
			expect(() => validate(`${'a'.repeat(11)}@example.com`)).toThrow() // max fails
		})

		test('str with 4+ constraints safe mode', () => {
			const validate = str(nonempty, min(2), max(10), email)
			expect(validate.safe!('ab@c.co')).toEqual({ ok: true, value: 'ab@c.co' })
			expect(validate.safe!('')).toEqual({ ok: false, error: 'Required' })
			expect(validate.safe!('a')).toEqual({ ok: false, error: 'Min 2 chars' })
			expect(validate.safe!('valid@example.com')).toHaveProperty('ok', false) // too long
		})

		test('num with 4+ constraints', () => {
			const validate = num(int, positive, gte(1), lte(100))
			expect(validate(50)).toBe(50)
			expect(() => validate(3.14)).toThrow() // int fails
			expect(() => validate(-5)).toThrow() // positive fails
			expect(() => validate(0)).toThrow() // gte(1) fails
			expect(() => validate(101)).toThrow() // lte(100) fails
		})

		test('num with 4+ constraints safe mode', () => {
			const validate = num(int, positive, gte(1), lte(100))
			expect(validate.safe!(50)).toEqual({ ok: true, value: 50 })
			expect(validate.safe!(3.14)).toEqual({ ok: false, error: 'Must be integer' })
			expect(validate.safe!(-5)).toEqual({ ok: false, error: 'Must be positive' })
			// 0 fails positive check first (before gte(1))
			expect(validate.safe!(0)).toEqual({ ok: false, error: 'Must be positive' })
			expect(validate.safe!(101)).toEqual({ ok: false, error: 'Max 100' })
		})

		test('constraint without safe method uses try-catch', () => {
			const customConstraint = ((v: number) => {
				if (v < 10) throw new Error('Custom: too small')
				return v
			}) as any
			const validate = num(int, positive, gte(1), customConstraint)
			expect(validate(50)).toBe(50)
			expect(validate.safe!(50)).toEqual({ ok: true, value: 50 })
			expect(validate.safe!(5)).toEqual({ ok: false, error: 'Custom: too small' })
		})

		test('constraint throws non-Error uses Unknown error', () => {
			const throwsString = ((_v: number) => {
				throw 'not an Error'
			}) as any
			const validate = num(int, positive, gte(1), throwsString)
			expect(validate.safe!(50)).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('MetaAction support', () => {
		test('str with MetaAction only', () => {
			const desc = createMetaAction({ description: 'A test string' })
			const validate = str(desc)
			expect(validate('hello')).toBe('hello')
			const meta = getMeta(validate)
			expect(meta?.description).toBe('A test string')
		})

		test('str with constraints and MetaAction', () => {
			const desc = createMetaAction({ description: 'An email' })
			const validate = str(email, desc)
			expect(validate('test@example.com')).toBe('test@example.com')
			const meta = getMeta(validate)
			expect(meta?.description).toBe('An email')
		})

		test('num with MetaAction only', () => {
			const desc = createMetaAction({ description: 'A number' })
			const validate = num(desc)
			expect(validate(42)).toBe(42)
			const meta = getMeta(validate)
			expect(meta?.description).toBe('A number')
		})

		test('num with constraints and MetaAction', () => {
			const desc = createMetaAction({ title: 'Age' })
			const validate = num(int, positive, desc)
			expect(validate(25)).toBe(25)
			const meta = getMeta(validate)
			expect(meta?.title).toBe('Age')
		})

		test('MetaAction preserves base type metadata', () => {
			const desc = createMetaAction({ description: 'Test' })
			const validate = str(desc)
			const meta = getMeta(validate)
			expect(meta?.type).toBe('string')
		})
	})
})
