import { describe, expect, test } from 'bun:test'
import { addStandardSchema, createValidator } from './helpers'
import type { Validator } from './types'

describe('helpers', () => {
	describe('addStandardSchema', () => {
		test('adds ~standard property to validator', () => {
			const validator = ((v: string) => v.toUpperCase()) as Validator<string>
			validator.safe = (v) => ({ ok: true, value: v.toUpperCase() })
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']).toBeDefined()
			expect(withSchema['~standard']?.version).toBe(1)
			expect(withSchema['~standard']?.vendor).toBe('vex')
		})

		test('validate returns value on success', () => {
			const validator = ((v: string) => v.toUpperCase()) as Validator<string>
			validator.safe = (v) => ({ ok: true, value: v.toUpperCase() })
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']!.validate('hello')).toEqual({ value: 'HELLO' })
		})

		test('validate returns issues on failure', () => {
			const validator = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as Validator<unknown, string>
			validator.safe = (v) => {
				if (typeof v !== 'string') return { ok: false, error: 'Expected string' }
				return { ok: true, value: v }
			}
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate(123)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toBe('Expected string')
		})

		test('falls back to try-catch when no safe method', () => {
			const validator = ((v: string) => v.toUpperCase()) as Validator<string>
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']!.validate('hello')).toEqual({ value: 'HELLO' })
		})

		test('try-catch fallback handles error', () => {
			const validator = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Expected string')
				return v
			}) as Validator<unknown, string>
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate(123)
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toBe('Expected string')
		})

		test('try-catch fallback handles non-Error exception', () => {
			const validator = (() => {
				throw 'string error'
			}) as unknown as Validator<unknown, never>
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate('anything')
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toBe('Unknown error')
		})

		test('returns same validator instance', () => {
			const validator = ((v: string) => v) as Validator<string>
			const withSchema = addStandardSchema(validator)
			expect(withSchema).toBe(validator)
		})

		test('preserves original validator functionality', () => {
			const validator = ((v: number) => v * 2) as Validator<number>
			validator.safe = (v) => ({ ok: true, value: v * 2 })
			const withSchema = addStandardSchema(validator)

			expect(withSchema(5)).toBe(10)
			expect(withSchema.safe!(5)).toEqual({ ok: true, value: 10 })
		})

		test('validates null values', () => {
			const validator = ((v: unknown) => {
				if (v !== null) throw new Error('Expected null')
				return v
			}) as Validator<unknown, null>
			validator.safe = (v) => {
				if (v !== null) return { ok: false, error: 'Expected null' }
				return { ok: true, value: v as null }
			}
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']!.validate(null)).toEqual({ value: null })
			expect(withSchema['~standard']!.validate('not null').issues![0].message).toBe('Expected null')
		})

		test('validates undefined values', () => {
			const validator = ((v: unknown) => {
				if (v !== undefined) throw new Error('Expected undefined')
				return v
			}) as Validator<unknown, undefined>
			validator.safe = (v) => {
				if (v !== undefined) return { ok: false, error: 'Expected undefined' }
				return { ok: true, value: v as undefined }
			}
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']!.validate(undefined)).toEqual({ value: undefined })
		})

		test('handles empty error message', () => {
			const validator = ((_v: unknown) => {
				throw new Error('')
			}) as Validator<unknown, never>
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate('anything')
			expect(result.issues![0].message).toBe('')
		})

		test('handles error with special characters', () => {
			const validator = ((_v: unknown) => {
				throw new Error('<script>alert("xss")</script>')
			}) as Validator<unknown, never>
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate('anything')
			expect(result.issues![0].message).toBe('<script>alert("xss")</script>')
		})

		test('handles transforming validator', () => {
			const validator = ((v: string) => parseInt(v, 10)) as Validator<string, number>
			validator.safe = (v) => {
				const num = parseInt(v, 10)
				if (Number.isNaN(num)) return { ok: false, error: 'Not a number' }
				return { ok: true, value: num }
			}
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']!.validate('42')).toEqual({ value: 42 })
			expect(withSchema['~standard']!.validate('abc').issues![0].message).toBe('Not a number')
		})

		test('handles array values', () => {
			const validator = ((v: unknown) => {
				if (!Array.isArray(v)) throw new Error('Expected array')
				return v
			}) as Validator<unknown, unknown[]>
			validator.safe = (v) => {
				if (!Array.isArray(v)) return { ok: false, error: 'Expected array' }
				return { ok: true, value: v }
			}
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']!.validate([1, 2, 3])).toEqual({ value: [1, 2, 3] })
			expect(withSchema['~standard']!.validate({}).issues![0].message).toBe('Expected array')
		})

		test('handles object values', () => {
			const validator = ((v: unknown) => {
				if (typeof v !== 'object' || v === null || Array.isArray(v)) {
					throw new Error('Expected object')
				}
				return v
			}) as Validator<unknown, object>
			validator.safe = (v) => {
				if (typeof v !== 'object' || v === null || Array.isArray(v)) {
					return { ok: false, error: 'Expected object' }
				}
				return { ok: true, value: v }
			}
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']!.validate({ key: 'value' })).toEqual({ value: { key: 'value' } })
			expect(withSchema['~standard']!.validate([]).issues![0].message).toBe('Expected object')
		})

		test('handles number values including edge cases', () => {
			const validator = ((v: number) => v) as Validator<number>
			validator.safe = (v) => ({ ok: true, value: v })
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']!.validate(0)).toEqual({ value: 0 })
			expect(withSchema['~standard']!.validate(-0)).toEqual({ value: -0 })
			expect(withSchema['~standard']!.validate(Infinity)).toEqual({ value: Infinity })
			expect(withSchema['~standard']!.validate(-Infinity)).toEqual({ value: -Infinity })
		})

		test('issues array has single element on failure', () => {
			const validator = (() => {
				throw new Error('Test error')
			}) as unknown as Validator<unknown, never>
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate('anything')
			expect(result.issues).toHaveLength(1)
		})
	})

	describe('createValidator', () => {
		test('creates validator with safe method', () => {
			const validator = createValidator(
				(v: string) => v.toUpperCase(),
				(v) => ({ ok: true, value: v.toUpperCase() })
			)

			expect(validator('hello')).toBe('HELLO')
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'HELLO' })
		})

		test('adds Standard Schema support', () => {
			const validator = createValidator(
				(v: string) => v.toUpperCase(),
				(v) => ({ ok: true, value: v.toUpperCase() })
			)

			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.validate('hello')).toEqual({ value: 'HELLO' })
		})

		test('safe method returns errors correctly', () => {
			const validator = createValidator(
				(v: unknown) => {
					if (typeof v !== 'string') throw new Error('Expected string')
					return v
				},
				(v) => {
					if (typeof v !== 'string') return { ok: false, error: 'Expected string' }
					return { ok: true, value: v }
				}
			)

			expect(validator.safe!(123)).toEqual({ ok: false, error: 'Expected string' })
		})

		test('creates validator that transforms input', () => {
			const validator = createValidator(
				(v: string) => parseInt(v, 10),
				(v) => {
					const num = parseInt(v, 10)
					if (Number.isNaN(num)) return { ok: false, error: 'Not a number' }
					return { ok: true, value: num }
				}
			)

			expect(validator('42')).toBe(42)
			expect(validator.safe!('42')).toEqual({ ok: true, value: 42 })
			expect(validator.safe!('abc')).toEqual({ ok: false, error: 'Not a number' })
		})

		test('creates validator with validation logic', () => {
			const validator = createValidator(
				(v: number) => {
					if (v < 0) throw new Error('Must be positive')
					return v
				},
				(v) => {
					if (v < 0) return { ok: false, error: 'Must be positive' }
					return { ok: true, value: v }
				}
			)

			expect(validator(5)).toBe(5)
			expect(() => validator(-1)).toThrow('Must be positive')
			expect(validator.safe!(5)).toEqual({ ok: true, value: 5 })
			expect(validator.safe!(-1)).toEqual({ ok: false, error: 'Must be positive' })
		})

		test('Standard Schema validate uses safe method', () => {
			const validator = createValidator(
				(v: string) => v.toUpperCase(),
				(v) => ({ ok: true, value: v.toUpperCase() })
			)

			const result = validator['~standard']!.validate('hello')
			expect(result).toEqual({ value: 'HELLO' })
		})

		test('Standard Schema validate returns issues', () => {
			const validator = createValidator(
				(v: unknown) => {
					if (typeof v !== 'number') throw new Error('Expected number')
					return v
				},
				(v) => {
					if (typeof v !== 'number') return { ok: false, error: 'Expected number' }
					return { ok: true, value: v }
				}
			)

			const result = validator['~standard']!.validate('not a number')
			expect(result.issues![0].message).toBe('Expected number')
		})

		test('validator is callable', () => {
			const validator = createValidator(
				(v: string) => v,
				(v) => ({ ok: true, value: v })
			)

			expect(typeof validator).toBe('function')
		})

		test('validator has safe property', () => {
			const validator = createValidator(
				(v: string) => v,
				(v) => ({ ok: true, value: v })
			)

			expect(typeof validator.safe).toBe('function')
		})

		test('validator has ~standard property', () => {
			const validator = createValidator(
				(v: string) => v,
				(v) => ({ ok: true, value: v })
			)

			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']!.version).toBe(1)
			expect(validator['~standard']!.vendor).toBe('vex')
		})

		test('handles null return value', () => {
			const validator = createValidator(
				(_v: unknown) => null,
				(_v) => ({ ok: true, value: null })
			)

			expect(validator('anything')).toBe(null)
			expect(validator.safe!('anything')).toEqual({ ok: true, value: null })
		})

		test('handles undefined return value', () => {
			const validator = createValidator(
				(_v: unknown) => undefined,
				(_v) => ({ ok: true, value: undefined })
			)

			expect(validator('anything')).toBe(undefined)
			expect(validator.safe!('anything')).toEqual({ ok: true, value: undefined })
		})

		test('handles array return value', () => {
			const validator = createValidator(
				(v: string) => v.split(','),
				(v) => ({ ok: true, value: v.split(',') })
			)

			expect(validator('a,b,c')).toEqual(['a', 'b', 'c'])
			expect(validator.safe!('a,b,c')).toEqual({ ok: true, value: ['a', 'b', 'c'] })
		})

		test('handles object return value', () => {
			const validator = createValidator(
				(v: string) => ({ name: v }),
				(v) => ({ ok: true, value: { name: v } })
			)

			expect(validator('John')).toEqual({ name: 'John' })
			expect(validator.safe!('John')).toEqual({ ok: true, value: { name: 'John' } })
		})

		test('preserves input value when no transformation', () => {
			const validator = createValidator(
				(v: number) => v,
				(v) => ({ ok: true, value: v })
			)

			expect(validator(42)).toBe(42)
			expect(validator.safe!(42)).toEqual({ ok: true, value: 42 })
		})

		test('handles complex validation logic', () => {
			interface User {
				name: string
				age: number
			}

			const validator = createValidator<unknown, User>(
				(v) => {
					const obj = v as any
					if (!obj || typeof obj !== 'object') throw new Error('Expected object')
					if (typeof obj.name !== 'string') throw new Error('Name must be string')
					if (typeof obj.age !== 'number') throw new Error('Age must be number')
					if (obj.age < 0) throw new Error('Age must be positive')
					return { name: obj.name, age: obj.age }
				},
				(v) => {
					const obj = v as any
					if (!obj || typeof obj !== 'object') return { ok: false, error: 'Expected object' }
					if (typeof obj.name !== 'string') return { ok: false, error: 'Name must be string' }
					if (typeof obj.age !== 'number') return { ok: false, error: 'Age must be number' }
					if (obj.age < 0) return { ok: false, error: 'Age must be positive' }
					return { ok: true, value: { name: obj.name, age: obj.age } }
				}
			)

			expect(validator({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
			expect(validator.safe!({ name: 'John', age: 30 })).toEqual({
				ok: true,
				value: { name: 'John', age: 30 },
			})
			expect(validator.safe!({ name: 123, age: 30 })).toEqual({
				ok: false,
				error: 'Name must be string',
			})
			expect(validator.safe!({ name: 'John', age: -5 })).toEqual({
				ok: false,
				error: 'Age must be positive',
			})
		})
	})

	describe('edge cases', () => {
		test('validator with no safe method still works', () => {
			const validator = ((v: string) => v.toUpperCase()) as Validator<string>
			const withSchema = addStandardSchema(validator)

			expect(withSchema['~standard']!.validate('hello')).toEqual({ value: 'HELLO' })
		})

		test('validator throwing non-Error in try-catch', () => {
			const validator = (() => {
				throw 12345
			}) as unknown as Validator<unknown, never>
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate('anything')
			expect(result.issues![0].message).toBe('Unknown error')
		})

		test('validator throwing null', () => {
			const validator = (() => {
				throw null
			}) as unknown as Validator<unknown, never>
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate('anything')
			expect(result.issues![0].message).toBe('Unknown error')
		})

		test('validator throwing undefined', () => {
			const validator = (() => {
				throw undefined
			}) as unknown as Validator<unknown, never>
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate('anything')
			expect(result.issues![0].message).toBe('Unknown error')
		})

		test('validator throwing object', () => {
			const validator = (() => {
				throw { custom: 'error' }
			}) as unknown as Validator<unknown, never>
			const withSchema = addStandardSchema(validator)

			const result = withSchema['~standard']!.validate('anything')
			expect(result.issues![0].message).toBe('Unknown error')
		})
	})
})
