// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { num, str } from '..'
import { gte, int, positive } from '../validators/number'
import { datetime, email, nonempty } from '../validators/string'
import { pipe } from './pipe'
import { catchError, codec, overwrite, preprocess, refine, to, transform, tryTransform } from './refine'

describe('refine', () => {
	test('adds custom validation check', () => {
		const positive = refine(num(), (n) => n > 0, 'Must be positive')
		expect(positive(5)).toBe(5)
		expect(() => positive(-1)).toThrow('Must be positive')
	})

	test('uses default message when not provided', () => {
		const even = refine(num(), (n) => n % 2 === 0)
		expect(even(4)).toBe(4)
		expect(() => even(3)).toThrow('Validation failed')
	})

	test('throws on inner validation failure', () => {
		const positive = refine(num(), (n) => n > 0, 'Must be positive')
		expect(() => positive('not a number' as any)).toThrow()
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			const positive = refine(num(), (n) => n > 0, 'Must be positive')
			expect(positive.safe!(5)).toEqual({ ok: true, value: 5 })
		})

		test('returns error for failed refinement', () => {
			const positive = refine(num(), (n) => n > 0, 'Must be positive')
			expect(positive.safe!(-1)).toEqual({ ok: false, error: 'Must be positive' })
		})

		test('returns error for inner validation failure', () => {
			const positive = refine(num(), (n) => n > 0, 'Must be positive')
			expect(positive.safe!('not a number')).toEqual({ ok: false, error: 'Expected number' })
		})

		test('falls back to try-catch when no inner safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const positive = refine(noSafe, (n: number) => n > 0, 'Must be positive')
			expect(positive.safe!(5)).toEqual({ ok: true, value: 5 })
			expect(positive.safe!(-1)).toEqual({ ok: false, error: 'Must be positive' })
		})

		test('handles inner throw when no safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const positive = refine(noSafe, (n: number) => n > 0, 'Must be positive')
			expect(positive.safe!('string')).toEqual({ ok: false, error: 'Must be number' })
		})

		test('handles non-Error exception', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const refined = refine(throwsNonError, () => true)
			expect(refined.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const positive = refine(num(), (n) => n > 0)
			expect(positive['~standard']).toBeDefined()
			expect(positive['~standard']?.version).toBe(1)
		})

		test('validate returns value on success', () => {
			const positive = refine(num(), (n) => n > 0)
			expect(positive['~standard']!.validate(5)).toEqual({ value: 5 })
		})

		test('validate returns issues on failure', () => {
			const positive = refine(num(), (n) => n > 0, 'Must be positive')
			const result = positive['~standard']!.validate(-1)
			expect(result.issues![0].message).toBe('Must be positive')
		})
	})
})

describe('transform', () => {
	test('transforms validated value', () => {
		const upper = transform(str(), (s) => s.toUpperCase())
		expect(upper('hello')).toBe('HELLO')
	})

	test('transforms with number', () => {
		const doubled = transform(num(), (n) => n * 2)
		expect(doubled(5)).toBe(10)
	})

	test('throws on inner validation failure', () => {
		const upper = transform(str(), (s) => s.toUpperCase())
		expect(() => upper(123 as any)).toThrow()
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			const upper = transform(str(), (s) => s.toUpperCase())
			expect(upper.safe!('hello')).toEqual({ ok: true, value: 'HELLO' })
		})

		test('returns error for inner validation failure', () => {
			const upper = transform(str(), (s) => s.toUpperCase())
			expect(upper.safe!(123)).toEqual({ ok: false, error: 'Expected string' })
		})

		test('handles transform that throws', () => {
			const throws = transform(str(), () => {
				throw new Error('Transform error')
			})
			expect(throws.safe!('hello')).toEqual({ ok: false, error: 'Transform error' })
		})

		test('handles transform that throws non-Error', () => {
			const throws = transform(str(), () => {
				throw 'string error'
			})
			expect(throws.safe!('hello')).toEqual({ ok: false, error: 'Transform failed' })
		})

		test('falls back to try-catch when no inner safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const upper = transform(noSafe, (s: string) => s.toUpperCase())
			expect(upper.safe!('hello')).toEqual({ ok: true, value: 'HELLO' })
		})

		test('handles inner throw when no safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const upper = transform(noSafe, (s: string) => s.toUpperCase())
			expect(upper.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('handles non-Error exception in inner when no safe', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const transformed = transform(throwsNonError, (v) => v)
			expect(transformed.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const upper = transform(str(), (s) => s.toUpperCase())
			expect(upper['~standard']).toBeDefined()
			expect(upper['~standard']?.version).toBe(1)
		})
	})
})

describe('catchError', () => {
	test('returns value on success', () => {
		const safeNum = catchError(num(), 0)
		expect(safeNum(5)).toBe(5)
	})

	test('returns default on error', () => {
		const safeNum = catchError(num(), 0)
		expect(safeNum('not a number' as any)).toBe(0)
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			const safeNum = catchError(num(), 0)
			expect(safeNum.safe!(5)).toEqual({ ok: true, value: 5 })
		})

		test('returns ok with default for invalid value', () => {
			const safeNum = catchError(num(), 0)
			expect(safeNum.safe!('not a number')).toEqual({ ok: true, value: 0 })
		})

		test('falls back to try-catch when no inner safe', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'number') throw new Error('Must be number')
				return v
			}) as any
			const safeNum = catchError(noSafe, 0)
			expect(safeNum.safe!(5)).toEqual({ ok: true, value: 5 })
			expect(safeNum.safe!('string')).toEqual({ ok: true, value: 0 })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const safeNum = catchError(num(), 0)
			expect(safeNum['~standard']).toBeDefined()
			expect(safeNum['~standard']?.version).toBe(1)
		})
	})
})

// ============================================================
// New Advanced Transform Functions (Zod Parity)
// ============================================================

describe('preprocess', () => {
	test('transforms before validation', () => {
		const trimmedStr = preprocess((v) => String(v).trim(), str(nonempty))
		expect(trimmedStr('  hello  ')).toBe('hello')
	})

	test('validation fails after preprocess', () => {
		const trimmedStr = preprocess((v) => String(v).trim(), str(nonempty))
		expect(() => trimmedStr('   ')).toThrow()
	})

	test('coerces to number then validates', () => {
		const coercedNum = preprocess((v) => Number(v), num(positive))
		expect(coercedNum('123')).toBe(123)
		expect(() => coercedNum('-5')).toThrow()
	})

	test('accepts any input type', () => {
		const toStr = preprocess((v) => String(v), str())
		expect(toStr(123)).toBe('123')
		expect(toStr(true)).toBe('true')
		expect(toStr(null)).toBe('null')
	})

	describe('safe', () => {
		test('returns ok for valid value', () => {
			const trimmedStr = preprocess((v) => String(v).trim(), str(nonempty))
			expect(trimmedStr.safe!('  hello  ')).toEqual({ ok: true, value: 'hello' })
		})

		test('returns error for invalid value', () => {
			const trimmedStr = preprocess((v) => String(v).trim(), str(nonempty))
			expect(trimmedStr.safe!('   ')).toHaveProperty('ok', false)
		})

		test('handles preprocess errors', () => {
			const failing = preprocess(() => {
				throw new Error('Preprocess failed')
			}, str())
			expect(failing.safe!('test')).toEqual({ ok: false, error: 'Preprocess failed' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const trimmedStr = preprocess((v) => String(v).trim(), str())
			expect(trimmedStr['~standard']).toBeDefined()
		})
	})
})

describe('to', () => {
	test('converts anything to string', () => {
		const toStr = to((v) => String(v))
		expect(toStr(123)).toBe('123')
		expect(toStr(true)).toBe('true')
		expect(toStr(null)).toBe('null')
	})

	test('converts to number', () => {
		const toNum = to((v) => Number(v))
		expect(toNum('123')).toBe(123)
		expect(toNum('3.14')).toBe(3.14)
	})

	test('parses JSON', () => {
		const parseJson = to((v) => JSON.parse(v as string))
		expect(parseJson('{"a":1}')).toEqual({ a: 1 })
		expect(parseJson('[1,2,3]')).toEqual([1, 2, 3])
	})

	test('can be chained with pipe', () => {
		const toPositiveNum = pipe(to(Number), num(positive))
		expect(toPositiveNum('123')).toBe(123)
		expect(() => toPositiveNum('-5')).toThrow()
	})

	test('can chain multiple transforms', () => {
		const pipeline = pipe(
			to((v) => String(v).trim()),
			to((v) => (v as string).toUpperCase()),
		)
		expect(pipeline('  hello  ')).toBe('HELLO')
	})

	describe('safe', () => {
		test('returns ok for successful transform', () => {
			const toStr = to((v) => String(v))
			expect(toStr.safe!(123)).toEqual({ ok: true, value: '123' })
		})

		test('handles transform errors', () => {
			const parseJson = to((v) => JSON.parse(v as string))
			expect(parseJson.safe!('invalid json')).toHaveProperty('ok', false)
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const toStr = to((v) => String(v))
			expect(toStr['~standard']).toBeDefined()
		})
	})
})

describe('overwrite', () => {
	test('type-preserving transform', () => {
		const normalized = pipe(
			str(),
			overwrite((s) => s.trim().toLowerCase()),
		)
		expect(normalized('  HELLO  ')).toBe('hello')
	})

	test('clamps number in range', () => {
		const clamped = pipe(
			num(),
			overwrite((n) => Math.max(0, Math.min(100, n))),
		)
		expect(clamped(150)).toBe(100)
		expect(clamped(-10)).toBe(0)
		expect(clamped(50)).toBe(50)
	})

	describe('safe', () => {
		test('returns ok for successful overwrite', () => {
			const normalized = pipe(
				str(),
				overwrite((s) => s.trim()),
			)
			expect(normalized.safe!('  hello  ')).toEqual({ ok: true, value: 'hello' })
		})

		test('handles overwrite errors', () => {
			const failing = overwrite<string>(() => {
				throw new Error('Overwrite failed')
			})
			expect(failing.safe!('test')).toEqual({ ok: false, error: 'Overwrite failed' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const normalized = overwrite((s: string) => s.trim())
			expect(normalized['~standard']).toBeDefined()
		})
	})
})

describe('codec', () => {
	test('decodes during parse', () => {
		const dateCodec = codec(str(), {
			decode: (s) => new Date(s),
			encode: (d) => d.toISOString(),
		})

		const result = dateCodec('2024-01-15T00:00:00.000Z')
		expect(result).toBeInstanceOf(Date)
		expect(result.getFullYear()).toBe(2024)
	})

	test('encodes back to string', () => {
		const dateCodec = codec(str(), {
			decode: (s) => new Date(s),
			encode: (d) => d.toISOString(),
		})

		const date = new Date('2024-01-15T00:00:00.000Z')
		expect(dateCodec.encode(date)).toBe('2024-01-15T00:00:00.000Z')
	})

	test('validates intermediate type', () => {
		const dateCodec = codec(str(datetime), {
			decode: (s) => new Date(s),
			encode: (d) => d.toISOString(),
		})

		expect(() => dateCodec('invalid-date')).toThrow()
	})

	test('exposes schema property', () => {
		const dateCodec = codec(str(), {
			decode: (s) => new Date(s),
			encode: (d) => d.toISOString(),
		})

		expect(dateCodec.schema).toBeDefined()
		expect(dateCodec.schema('test')).toBe('test')
	})

	test('number codec example', () => {
		const percentCodec = codec(num(gte(0)), {
			decode: (n) => n / 100,
			encode: (n) => n * 100,
		})

		expect(percentCodec(50)).toBe(0.5)
		expect(percentCodec.encode(0.5)).toBe(50)
	})

	test('JSON codec example', () => {
		const jsonCodec = codec(str(), {
			decode: (s) => JSON.parse(s) as unknown,
			encode: (v) => JSON.stringify(v),
		})

		expect(jsonCodec('{"a":1}')).toEqual({ a: 1 })
		expect(jsonCodec.encode({ a: 1 })).toBe('{"a":1}')
	})

	test('round-trip encoding', () => {
		const dateCodec = codec(str(), {
			decode: (s) => new Date(s),
			encode: (d) => d.toISOString(),
		})

		const original = '2024-01-15T00:00:00.000Z'
		const decoded = dateCodec(original)
		const encoded = dateCodec.encode(decoded)
		expect(encoded).toBe(original)
	})

	describe('safe', () => {
		test('returns ok for valid decode', () => {
			const dateCodec = codec(str(), {
				decode: (s) => new Date(s),
				encode: (d) => d.toISOString(),
			})

			const result = dateCodec.safe!('2024-01-15T00:00:00.000Z')
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toBeInstanceOf(Date)
			}
		})

		test('handles decode errors', () => {
			const failingCodec = codec(str(), {
				decode: () => {
					throw new Error('Decode failed')
				},
				encode: (v) => String(v),
			})

			expect(failingCodec.safe!('test')).toEqual({ ok: false, error: 'Decode failed' })
		})

		test('handles validation errors', () => {
			const dateCodec = codec(num(), {
				decode: (n) => new Date(n),
				encode: (d) => d.getTime(),
			})

			expect(dateCodec.safe!('not a number')).toHaveProperty('ok', false)
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const dateCodec = codec(str(), {
				decode: (s) => new Date(s),
				encode: (d) => d.toISOString(),
			})
			expect(dateCodec['~standard']).toBeDefined()
		})
	})
})

describe('tryTransform', () => {
	test('transforms successfully', () => {
		const parseNum = tryTransform<string, number>((value) => {
			return parseInt(value, 10)
		})
		expect(parseNum('123')).toBe(123)
	})

	test('can fail with custom error', () => {
		const parseDate = tryTransform<string, Date>((value, ctx) => {
			const date = new Date(value)
			if (Number.isNaN(date.getTime())) {
				ctx.fail('Invalid date format')
			}
			return date
		})

		expect(() => parseDate('invalid')).toThrow('Invalid date format')
	})

	test('complex validation in transform', () => {
		const parseEmail = tryTransform<unknown, { local: string; domain: string }>((value, ctx) => {
			const str = String(value)
			const parts = str.split('@')
			if (parts.length !== 2) {
				ctx.fail('Invalid email format')
			}
			return { local: parts[0]!, domain: parts[1]! }
		})

		expect(parseEmail('user@example.com')).toEqual({ local: 'user', domain: 'example.com' })
		expect(() => parseEmail('invalid')).toThrow('Invalid email format')
	})

	describe('safe', () => {
		test('returns ok for successful transform', () => {
			const parseNum = tryTransform<string, number>((value) => {
				return parseInt(value, 10)
			})

			expect(parseNum.safe!('123')).toEqual({ ok: true, value: 123 })
		})

		test('returns error on fail', () => {
			const parseDate = tryTransform<string, Date>((value, ctx) => {
				const date = new Date(value)
				if (Number.isNaN(date.getTime())) {
					ctx.fail('Invalid date format')
				}
				return date
			})

			expect(parseDate.safe!('invalid')).toEqual({ ok: false, error: 'Invalid date format' })
		})

		test('handles thrown errors', () => {
			const failing = tryTransform<string, number>(() => {
				throw new Error('Unexpected error')
			})

			expect(failing.safe!('test')).toEqual({ ok: false, error: 'Unexpected error' })
		})
	})

	describe('Standard Schema', () => {
		test('has ~standard property', () => {
			const parseNum = tryTransform<string, number>((value) => parseInt(value, 10))
			expect(parseNum['~standard']).toBeDefined()
		})
	})
})

// ============================================================
// Integration Tests
// ============================================================

describe('transform integration', () => {
	test('preprocess + validate + transform chain', () => {
		// preprocess → validate email → extract domain with 'to'
		const emailDomain = pipe(
			preprocess((v) => String(v).trim().toLowerCase(), str(email)),
			to((s) => (s as string).split('@')[1]),
		)

		expect(emailDomain('  USER@EXAMPLE.COM  ')).toBe('example.com')
	})

	test('to + validate chain', () => {
		// Using Number() so 3.14 stays as float and fails int check
		const toIntPositive = pipe(
			to((v) => Number(v)),
			num(int, positive),
		)

		expect(toIntPositive('42')).toBe(42)
		expect(() => toIntPositive('-5')).toThrow()
		expect(() => toIntPositive('3.14')).toThrow()
	})

	test('multiple overwrites', () => {
		const normalized = pipe(
			str(),
			overwrite((s) => s.trim()),
			overwrite((s) => s.toLowerCase()),
			overwrite((s) => s.replace(/\s+/g, '-')),
		)

		expect(normalized('  Hello World  ')).toBe('hello-world')
	})

	test('tryTransform with URL parsing', () => {
		interface ParsedUrl {
			protocol: string
			host: string
			path: string
		}

		const parseUrl = tryTransform<string, ParsedUrl>((value, ctx) => {
			try {
				const url = new URL(value)
				return {
					protocol: url.protocol,
					host: url.host,
					path: url.pathname,
				}
			} catch {
				ctx.fail('Invalid URL')
				return { protocol: '', host: '', path: '' }
			}
		})

		expect(parseUrl('https://example.com/path')).toEqual({
			protocol: 'https:',
			host: 'example.com',
			path: '/path',
		})

		expect(() => parseUrl('invalid')).toThrow('Invalid URL')
	})
})
