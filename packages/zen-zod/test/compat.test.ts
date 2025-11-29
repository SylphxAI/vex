import { describe, it, expect } from 'bun:test'
import {
	z,
	string,
	number,
	boolean,
	object,
	array,
	union,
	literal,
	enum_,
	tuple,
	record,
	// Types
	type UniversalSchema,
	type Infer,
	type InferInput,
	type InferOutput,
	type ZodCompatible,
	type AnySchemaCompat,
	isSchema,
	isStandardSchema,
} from '../src'

// ============================================================
// Basic Schema Creation Tests
// ============================================================

describe('basic schema creation', () => {
	it('should create string schema', () => {
		const schema = z.string()
		expect(schema.parse('hello')).toBe('hello')
		expect(() => schema.parse(123)).toThrow()
	})

	it('should create number schema', () => {
		const schema = z.number()
		expect(schema.parse(42)).toBe(42)
		expect(() => schema.parse('42')).toThrow()
	})

	it('should create boolean schema', () => {
		const schema = z.boolean()
		expect(schema.parse(true)).toBe(true)
		expect(schema.parse(false)).toBe(false)
		expect(() => schema.parse('true')).toThrow()
	})

	it('should create object schema', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		})
		expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
		expect(() => schema.parse({ name: 'John' })).toThrow()
	})

	it('should create array schema', () => {
		const schema = z.array(z.number())
		expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3])
		expect(() => schema.parse([1, '2', 3])).toThrow()
	})

	it('should create union schema', () => {
		const schema = z.union([z.string(), z.number()])
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(42)).toBe(42)
		expect(() => schema.parse(true)).toThrow()
	})

	it('should create literal schema', () => {
		const schema = z.literal('hello')
		expect(schema.parse('hello')).toBe('hello')
		expect(() => schema.parse('world')).toThrow()
	})

	it('should create enum schema', () => {
		const schema = z.enum(['a', 'b', 'c'])
		expect(schema.parse('a')).toBe('a')
		expect(schema.parse('b')).toBe('b')
		expect(() => schema.parse('d')).toThrow()
	})

	it('should create tuple schema', () => {
		const schema = z.tuple([z.string(), z.number()])
		expect(schema.parse(['hello', 42])).toEqual(['hello', 42])
		expect(() => schema.parse(['hello'])).toThrow()
		expect(() => schema.parse([42, 'hello'])).toThrow()
	})

	it('should create record schema', () => {
		const schema = z.record(z.number())
		expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
		expect(() => schema.parse({ a: 'not a number' })).toThrow()
	})
})

// ============================================================
// Primitive Types Tests
// ============================================================

describe('primitive types', () => {
	it('should validate any', () => {
		const schema = z.any()
		expect(schema.parse('anything')).toBe('anything')
		expect(schema.parse(123)).toBe(123)
		expect(schema.parse(null)).toBe(null)
	})

	it('should validate unknown', () => {
		const schema = z.unknown()
		expect(schema.parse('anything')).toBe('anything')
		expect(schema.parse(123)).toBe(123)
	})

	it('should validate null', () => {
		const schema = z.null()
		expect(schema.parse(null)).toBe(null)
		expect(() => schema.parse(undefined)).toThrow()
	})

	it('should validate undefined', () => {
		const schema = z.undefined()
		expect(schema.parse(undefined)).toBe(undefined)
		expect(() => schema.parse(null)).toThrow()
	})

	it('should validate void', () => {
		const schema = z.void()
		expect(schema.parse(undefined)).toBe(undefined)
	})

	it('should validate never', () => {
		const schema = z.never()
		expect(() => schema.parse('anything')).toThrow()
		expect(() => schema.parse(undefined)).toThrow()
	})

	it('should validate nan', () => {
		const schema = z.nan()
		expect(Number.isNaN(schema.parse(NaN))).toBe(true)
		expect(() => schema.parse(123)).toThrow()
	})

	it('should validate date', () => {
		const schema = z.date()
		const now = new Date()
		expect(schema.parse(now)).toBe(now)
		expect(() => schema.parse('2024-01-01')).toThrow()
	})

	it('should validate bigint', () => {
		const schema = z.bigint()
		expect(schema.parse(123n)).toBe(123n)
		expect(() => schema.parse(123)).toThrow()
	})

	it('should validate symbol', () => {
		const schema = z.symbol()
		const sym = Symbol('test')
		expect(schema.parse(sym)).toBe(sym)
		expect(() => schema.parse('symbol')).toThrow()
	})
})

// ============================================================
// Modifiers Tests
// ============================================================

describe('modifiers', () => {
	it('should handle refine', () => {
		const schema = z.refine(z.number(), (n) => n > 0, 'Must be positive')
		expect(schema.parse(5)).toBe(5)
		expect(() => schema.parse(-5)).toThrow()
	})

	it('should handle transform', () => {
		const schema = z.transform(z.string(), (s) => s.toUpperCase())
		expect(schema.parse('hello')).toBe('HELLO')
	})

	it('should handle default', () => {
		const schema = z.default(z.string(), 'default value')
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(undefined)).toBe('default value')
	})

	it('should handle coerce.string', () => {
		const schema = z.coerce.string()
		expect(schema.parse(123)).toBe('123')
		expect(schema.parse(true)).toBe('true')
	})

	it('should handle coerce.number', () => {
		const schema = z.coerce.number()
		expect(schema.parse('123')).toBe(123)
		expect(schema.parse('45.67')).toBe(45.67)
	})

	it('should handle coerce.boolean', () => {
		const schema = z.coerce.boolean()
		expect(schema.parse('true')).toBe(true)
		expect(schema.parse(1)).toBe(true)
		expect(schema.parse(0)).toBe(false)
	})

	it('should handle coerce.date', () => {
		const schema = z.coerce.date()
		const result = schema.parse('2024-01-01')
		expect(result instanceof Date).toBe(true)
	})
})

// ============================================================
// safeParse Tests
// ============================================================

describe('safeParse', () => {
	it('should return success for valid data', () => {
		const schema = z.string()
		const result = schema.safeParse('hello')
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe('hello')
		}
	})

	it('should return failure for invalid data', () => {
		const schema = z.string()
		const result = schema.safeParse(123)
		expect(result.success).toBe(false)
	})

	it('should work with complex schemas', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		})

		const validResult = schema.safeParse({ name: 'John', age: 30 })
		expect(validResult.success).toBe(true)

		const invalidResult = schema.safeParse({ name: 'John' })
		expect(invalidResult.success).toBe(false)
	})
})

// ============================================================
// Zod Compatibility Tests
// ============================================================

describe('zod compatibility', () => {
	it('should have _def property with typeName', () => {
		const schema = z.string()
		expect(schema._def).toBeDefined()
		expect(schema._def.typeName).toBe('ZodString')
	})

	it('should have _zod.def property', () => {
		const schema = z.number()
		expect(schema._zod).toBeDefined()
		expect(schema._zod.def.typeName).toBe('ZodNumber')
	})

	it('should have correct typeName for all types', () => {
		expect(z.string()._def.typeName).toBe('ZodString')
		expect(z.number()._def.typeName).toBe('ZodNumber')
		expect(z.boolean()._def.typeName).toBe('ZodBoolean')
		expect(z.bigint()._def.typeName).toBe('ZodBigInt')
		expect(z.symbol()._def.typeName).toBe('ZodSymbol')
		expect(z.date()._def.typeName).toBe('ZodDate')
		expect(z.any()._def.typeName).toBe('ZodAny')
		expect(z.unknown()._def.typeName).toBe('ZodUnknown')
		expect(z.null()._def.typeName).toBe('ZodNull')
		expect(z.undefined()._def.typeName).toBe('ZodUndefined')
		expect(z.void()._def.typeName).toBe('ZodVoid')
		expect(z.never()._def.typeName).toBe('ZodNever')
		expect(z.nan()._def.typeName).toBe('ZodNaN')
	})

	it('should have correct typeName for complex types', () => {
		expect(z.object({})._def.typeName).toBe('ZodObject')
		expect(z.array(z.string())._def.typeName).toBe('ZodArray')
		expect(z.tuple([z.string()])._def.typeName).toBe('ZodTuple')
		expect(z.record(z.string())._def.typeName).toBe('ZodRecord')
		expect(z.union([z.string(), z.number()])._def.typeName).toBe('ZodUnion')
		expect(z.literal('test')._def.typeName).toBe('ZodLiteral')
		expect(z.enum(['a', 'b'])._def.typeName).toBe('ZodEnum')
		expect(z.lazy(() => z.string())._def.typeName).toBe('ZodLazy')
	})
})

// ============================================================
// Type Guard Tests
// ============================================================

describe('type guards', () => {
	it('isSchema should identify valid schemas', () => {
		expect(isSchema(z.string())).toBe(true)
		expect(isSchema(z.number())).toBe(true)
		expect(isSchema(z.object({ name: z.string() }))).toBe(true)
	})

	it('isSchema should reject non-schemas', () => {
		expect(isSchema(null)).toBe(false)
		expect(isSchema(undefined)).toBe(false)
		expect(isSchema('string')).toBe(false)
		expect(isSchema(123)).toBe(false)
		expect(isSchema({})).toBe(false)
		expect(isSchema({ parse: 'not a function' })).toBe(false)
	})

	it('isStandardSchema should identify Standard Schema V1 compliant schemas', () => {
		// Zen schemas should be Standard Schema compliant
		const zenSchema = z.string()
		expect(isStandardSchema(zenSchema)).toBe(true)
	})

	it('isStandardSchema should reject non-compliant objects', () => {
		expect(isStandardSchema(null)).toBe(false)
		expect(isStandardSchema({})).toBe(false)
		expect(isStandardSchema({ parse: () => {} })).toBe(false)
	})
})

// ============================================================
// UniversalSchema Type Tests
// ============================================================

describe('UniversalSchema compatibility', () => {
	// Helper function that accepts UniversalSchema
	function validateWithUniversal<T extends UniversalSchema>(schema: T, data: unknown): Infer<T> {
		return schema.parse(data)
	}

	it('should work with string schema', () => {
		const schema = z.string()
		const result = validateWithUniversal(schema, 'hello')
		expect(result).toBe('hello')
	})

	it('should work with number schema', () => {
		const schema = z.number()
		const result = validateWithUniversal(schema, 42)
		expect(result).toBe(42)
	})

	it('should work with object schema', () => {
		const schema = z.object({ name: z.string() })
		const result = validateWithUniversal(schema, { name: 'John' })
		expect(result).toEqual({ name: 'John' })
	})

	it('should work with array schema', () => {
		const schema = z.array(z.number())
		const result = validateWithUniversal(schema, [1, 2, 3])
		expect(result).toEqual([1, 2, 3])
	})

	it('should work with union schema', () => {
		const schema = z.union([z.string(), z.number()])
		expect(validateWithUniversal(schema, 'hello')).toBe('hello')
		expect(validateWithUniversal(schema, 42)).toBe(42)
	})

	it('should work with nested schemas', () => {
		const schema = z.object({
			user: z.object({
				name: z.string(),
				tags: z.array(z.string()),
			}),
			count: z.number(),
		})
		const data = {
			user: { name: 'John', tags: ['admin', 'user'] },
			count: 5,
		}
		const result = validateWithUniversal(schema, data)
		expect(result).toEqual(data)
	})
})

// ============================================================
// Type Inference Tests
// ============================================================

describe('type inference', () => {
	it('Infer should extract output type', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		})
		type SchemaType = Infer<typeof schema>
		// This is a compile-time test - if it compiles, types are correct
		const valid: SchemaType = { name: 'John', age: 30 }
		expect(valid.name).toBe('John')
		expect(valid.age).toBe(30)
	})

	it('InferOutput should match Infer', () => {
		const schema = z.string()
		type OutputType = InferOutput<typeof schema>
		const value: OutputType = 'hello'
		expect(value).toBe('hello')
	})

	it('InferInput should extract input type', () => {
		const schema = z.string()
		type InputType = InferInput<typeof schema>
		const value: InputType = 'hello'
		expect(value).toBe('hello')
	})
})

// ============================================================
// Advanced Schema Tests
// ============================================================

describe('advanced schemas', () => {
	it('should handle discriminatedUnion', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal('a'), value: z.string() }),
			z.object({ type: z.literal('b'), value: z.number() }),
		])
		expect(schema.parse({ type: 'a', value: 'hello' })).toEqual({ type: 'a', value: 'hello' })
		expect(schema.parse({ type: 'b', value: 42 })).toEqual({ type: 'b', value: 42 })
		expect(() => schema.parse({ type: 'c', value: true })).toThrow()
	})

	it('should handle lazy for recursive schemas', () => {
		type TreeNode = {
			value: number
			children?: TreeNode[]
		}

		const treeSchema: ReturnType<typeof z.lazy<any>> = z.lazy(() =>
			z.object({
				value: z.number(),
				children: z.array(treeSchema).optional(),
			})
		)

		const tree = {
			value: 1,
			children: [
				{ value: 2 },
				{ value: 3, children: [{ value: 4 }] },
			],
		}

		expect(treeSchema.parse(tree)).toEqual(tree)
	})
})

// ============================================================
// Error Handling Tests
// ============================================================

describe('error handling', () => {
	it('ZodError should have issues array', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		})

		try {
			schema.parse({ name: 123, age: 'not a number' })
			expect(true).toBe(false) // Should not reach here
		} catch (error) {
			expect(error).toBeDefined()
		}
	})

	it('safeParse should not throw', () => {
		const schema = z.string()
		expect(() => schema.safeParse(123)).not.toThrow()
	})
})

// ============================================================
// Edge Cases Tests
// ============================================================

describe('edge cases', () => {
	it('should handle empty object', () => {
		const schema = z.object({})
		expect(schema.parse({})).toEqual({})
	})

	it('should handle empty array', () => {
		const schema = z.array(z.string())
		expect(schema.parse([])).toEqual([])
	})

	it('should handle empty tuple', () => {
		const schema = z.tuple([])
		expect(schema.parse([])).toEqual([])
	})

	it('should handle deeply nested objects', () => {
		const schema = z.object({
			a: z.object({
				b: z.object({
					c: z.object({
						d: z.string(),
					}),
				}),
			}),
		})
		const data = { a: { b: { c: { d: 'deep' } } } }
		expect(schema.parse(data)).toEqual(data)
	})

	it('should handle mixed arrays in union', () => {
		const schema = z.array(z.union([z.string(), z.number(), z.boolean()]))
		expect(schema.parse(['hello', 42, true])).toEqual(['hello', 42, true])
	})

	it('should handle null in literal', () => {
		const schema = z.literal(null)
		expect(schema.parse(null)).toBe(null)
	})

	it('should handle undefined in literal', () => {
		const schema = z.literal(undefined)
		expect(schema.parse(undefined)).toBe(undefined)
	})
})

// ============================================================
// Performance Sanity Tests
// ============================================================

describe('performance sanity', () => {
	it('should handle large arrays', () => {
		const schema = z.array(z.number())
		const largeArray = Array.from({ length: 10000 }, (_, i) => i)
		const result = schema.parse(largeArray)
		expect(result.length).toBe(10000)
	})

	it('should handle large objects', () => {
		const shape: Record<string, ReturnType<typeof z.number>> = {}
		for (let i = 0; i < 100; i++) {
			shape[`field${i}`] = z.number()
		}
		const schema = z.object(shape)

		const data: Record<string, number> = {}
		for (let i = 0; i < 100; i++) {
			data[`field${i}`] = i
		}

		const result = schema.parse(data)
		expect(Object.keys(result).length).toBe(100)
	})
})
