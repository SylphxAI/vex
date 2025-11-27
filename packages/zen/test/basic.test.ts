import { describe, expect, it } from 'bun:test'
import { type Infer, z } from '../src'

describe('string schema', () => {
	it('should validate strings', () => {
		const schema = z.string()
		expect(schema.parse('hello')).toBe('hello')
	})

	it('should reject non-strings', () => {
		const schema = z.string()
		expect(() => schema.parse(123)).toThrow()
	})

	it('should validate min length', () => {
		const schema = z.string().min(3)
		expect(schema.parse('hello')).toBe('hello')
		expect(() => schema.parse('hi')).toThrow()
	})

	it('should validate max length', () => {
		const schema = z.string().max(5)
		expect(schema.parse('hello')).toBe('hello')
		expect(() => schema.parse('hello world')).toThrow()
	})

	it('should validate email', () => {
		const schema = z.string().email()
		expect(schema.parse('test@example.com')).toBe('test@example.com')
		expect(() => schema.parse('invalid')).toThrow()
	})

	it('should validate uuid', () => {
		const schema = z.string().uuid()
		expect(schema.parse('550e8400-e29b-41d4-a716-446655440000')).toBe(
			'550e8400-e29b-41d4-a716-446655440000'
		)
		expect(() => schema.parse('not-a-uuid')).toThrow()
	})

	it('should chain validators', () => {
		const schema = z.string().min(1).max(100).email()
		expect(schema.parse('test@example.com')).toBe('test@example.com')
	})
})

describe('number schema', () => {
	it('should validate numbers', () => {
		const schema = z.number()
		expect(schema.parse(42)).toBe(42)
	})

	it('should reject non-numbers', () => {
		const schema = z.number()
		expect(() => schema.parse('42')).toThrow()
	})

	it('should reject NaN', () => {
		const schema = z.number()
		expect(() => schema.parse(Number.NaN)).toThrow()
	})

	it('should validate min', () => {
		const schema = z.number().min(10)
		expect(schema.parse(15)).toBe(15)
		expect(() => schema.parse(5)).toThrow()
	})

	it('should validate int', () => {
		const schema = z.number().int()
		expect(schema.parse(42)).toBe(42)
		expect(() => schema.parse(3.14)).toThrow()
	})

	it('should validate positive', () => {
		const schema = z.number().positive()
		expect(schema.parse(1)).toBe(1)
		expect(() => schema.parse(0)).toThrow()
		expect(() => schema.parse(-1)).toThrow()
	})
})

describe('boolean schema', () => {
	it('should validate booleans', () => {
		const schema = z.boolean()
		expect(schema.parse(true)).toBe(true)
		expect(schema.parse(false)).toBe(false)
	})

	it('should reject non-booleans', () => {
		const schema = z.boolean()
		expect(() => schema.parse('true')).toThrow()
		expect(() => schema.parse(1)).toThrow()
	})
})

describe('object schema', () => {
	it('should validate objects', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		})

		const result = schema.parse({ name: 'John', age: 30 })
		expect(result).toEqual({ name: 'John', age: 30 })
	})

	it('should reject invalid objects', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		})

		expect(() => schema.parse({ name: 'John', age: 'thirty' })).toThrow()
	})

	it('should work with nested objects', () => {
		const schema = z.object({
			user: z.object({
				name: z.string(),
			}),
		})

		const result = schema.parse({ user: { name: 'John' } })
		expect(result).toEqual({ user: { name: 'John' } })
	})

	it('should support partial()', () => {
		const schema = z
			.object({
				name: z.string(),
				age: z.number(),
			})
			.partial()

		const result = schema.parse({ name: 'John' })
		expect(result).toEqual({ name: 'John', age: undefined })
	})
})

describe('array schema', () => {
	it('should validate arrays', () => {
		const schema = z.array(z.string())
		expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
	})

	it('should reject non-arrays', () => {
		const schema = z.array(z.string())
		expect(() => schema.parse('not an array')).toThrow()
	})

	it('should validate array elements', () => {
		const schema = z.array(z.number())
		expect(() => schema.parse([1, 2, 'three'])).toThrow()
	})

	it('should validate min length', () => {
		const schema = z.array(z.string()).min(2)
		expect(schema.parse(['a', 'b'])).toEqual(['a', 'b'])
		expect(() => schema.parse(['a'])).toThrow()
	})

	it('should validate nonempty', () => {
		const schema = z.array(z.string()).nonempty()
		expect(schema.parse(['a'])).toEqual(['a'])
		expect(() => schema.parse([])).toThrow()
	})
})

describe('union schema', () => {
	it('should validate unions', () => {
		const schema = z.union([z.string(), z.number()])
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(42)).toBe(42)
	})

	it('should reject non-matching values', () => {
		const schema = z.union([z.string(), z.number()])
		expect(() => schema.parse(true)).toThrow()
	})
})

describe('literal schema', () => {
	it('should validate literals', () => {
		const schema = z.literal('hello')
		expect(schema.parse('hello')).toBe('hello')
	})

	it('should reject non-matching values', () => {
		const schema = z.literal('hello')
		expect(() => schema.parse('world')).toThrow()
	})

	it('should work with union for enums', () => {
		const schema = z.union([z.literal('admin'), z.literal('user')])
		expect(schema.parse('admin')).toBe('admin')
		expect(schema.parse('user')).toBe('user')
		expect(() => schema.parse('guest')).toThrow()
	})
})

describe('type inference', () => {
	it('should infer types correctly', () => {
		const UserSchema = z.object({
			id: z.string().uuid(),
			name: z.string().min(1),
			email: z.string().email(),
			age: z.number().int().positive().optional(),
			role: z.union([z.literal('admin'), z.literal('user')]),
			tags: z.array(z.string()),
		})

		type User = Infer<typeof UserSchema>

		// This is a compile-time check - if types are wrong, TS will error
		const user: User = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'John',
			email: 'john@example.com',
			age: 30,
			role: 'admin',
			tags: ['developer'],
		}

		expect(UserSchema.parse(user)).toEqual(user)
	})
})

describe('safeParse', () => {
	it('should return success result', () => {
		const schema = z.string()
		const result = schema.safeParse('hello')
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe('hello')
		}
	})

	it('should return failure result', () => {
		const schema = z.string()
		const result = schema.safeParse(123)
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.issues.length).toBeGreaterThan(0)
		}
	})
})

describe('Standard Schema compatibility', () => {
	it('should have ~standard property', () => {
		const schema = z.string()
		expect(schema['~standard']).toBeDefined()
		expect(schema['~standard'].version).toBe(1)
		expect(schema['~standard'].vendor).toBe('zen')
	})

	it('should have validate function', () => {
		const schema = z.string()
		const result = schema['~standard'].validate('hello')
		expect('value' in result).toBe(true)
		if ('value' in result) {
			expect(result.value).toBe('hello')
		}
	})
})

// ============================================================
// Enum Schema
// ============================================================

describe('enum', () => {
	const status = z.enum(['pending', 'active', 'done'])

	it('should validate enum values', () => {
		expect(status.parse('pending')).toBe('pending')
		expect(status.parse('active')).toBe('active')
		expect(status.parse('done')).toBe('done')
	})

	it('should reject invalid values', () => {
		expect(() => status.parse('invalid')).toThrow()
		expect(() => status.parse(123)).toThrow()
	})

	it('should provide enum object for autocomplete', () => {
		expect(status.enum.pending).toBe('pending')
		expect(status.enum.active).toBe('active')
		expect(status.enum.done).toBe('done')
	})
})

// ============================================================
// Tuple Schema
// ============================================================

describe('tuple', () => {
	const point = z.tuple([z.number(), z.number()])

	it('should validate tuple', () => {
		expect(point.parse([1, 2])).toEqual([1, 2])
	})

	it('should reject wrong length', () => {
		expect(() => point.parse([1])).toThrow()
		expect(() => point.parse([1, 2, 3])).toThrow()
	})

	it('should reject wrong types', () => {
		expect(() => point.parse(['a', 'b'])).toThrow()
	})

	it('should work with mixed types', () => {
		const mixed = z.tuple([z.string(), z.number(), z.boolean()])
		expect(mixed.parse(['hello', 42, true])).toEqual(['hello', 42, true])
	})
})

// ============================================================
// Record Schema
// ============================================================

describe('record', () => {
	const scores = z.record(z.number())

	it('should validate record', () => {
		expect(scores.parse({ alice: 100, bob: 95 })).toEqual({ alice: 100, bob: 95 })
	})

	it('should reject invalid values', () => {
		expect(() => scores.parse({ alice: 'hundred' })).toThrow()
	})

	it('should accept empty object', () => {
		expect(scores.parse({})).toEqual({})
	})
})

// ============================================================
// Transform Utilities
// ============================================================

describe('refine', () => {
	it('should add custom validation', () => {
		const password = z.refine(z.string(), (val) => val.length >= 8, 'Password must be at least 8 characters')
		expect(password.parse('longpassword')).toBe('longpassword')
		expect(() => password.parse('short')).toThrow()
	})
})

describe('transform', () => {
	it('should transform output', () => {
		const upper = z.transform(z.string(), (val) => val.toUpperCase())
		expect(upper.parse('hello')).toBe('HELLO')
	})

	it('should chain with validation', () => {
		const parsed = z.transform(z.string(), (val) => parseInt(val, 10))
		expect(parsed.parse('42')).toBe(42)
	})
})

describe('default', () => {
	it('should provide default for undefined', () => {
		const name = z.default(z.string(), 'Anonymous')
		expect(name.parse(undefined)).toBe('Anonymous')
		expect(name.parse('John')).toBe('John')
	})

	it('should work with factory function', () => {
		const arr = z.default(z.array(z.number()), () => [])
		expect(arr.parse(undefined)).toEqual([])
	})
})

describe('coerce', () => {
	it('should coerce to number', () => {
		const num = z.coerce.number()
		expect(num.parse('42')).toBe(42)
		expect(num.parse(42)).toBe(42)
	})

	it('should coerce to string', () => {
		const str = z.coerce.string()
		expect(str.parse(42)).toBe('42')
		expect(str.parse(true)).toBe('true')
	})

	it('should coerce to boolean', () => {
		const bool = z.coerce.boolean()
		expect(bool.parse(1)).toBe(true)
		expect(bool.parse(0)).toBe(false)
		expect(bool.parse('')).toBe(false)
	})
})
