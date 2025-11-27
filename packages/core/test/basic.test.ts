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

describe('Zod compatibility', () => {
	it('should have _def property', () => {
		const schema = z.string()
		expect(schema._def).toBeDefined()
		expect(schema._def.typeName).toBe('ZodString')
	})

	it('should have _zod property', () => {
		const schema = z.string()
		expect(schema._zod).toBeDefined()
		expect(schema._zod.def.typeName).toBe('ZodString')
	})
})
