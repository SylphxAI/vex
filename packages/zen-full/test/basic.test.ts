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

// Note: Zod compatibility tests moved to @sylphx/zen-zod package

describe('enum schema', () => {
	it('should validate enum values', () => {
		const schema = z.enum(['apple', 'banana', 'cherry'])
		expect(schema.parse('apple')).toBe('apple')
		expect(schema.parse('banana')).toBe('banana')
	})

	it('should reject invalid enum values', () => {
		const schema = z.enum(['apple', 'banana', 'cherry'])
		expect(() => schema.parse('orange')).toThrow()
	})

	it('should have enum object', () => {
		const schema = z.enum(['apple', 'banana', 'cherry'])
		expect(schema.enum.apple).toBe('apple')
		expect(schema.enum.banana).toBe('banana')
	})
})

describe('tuple schema', () => {
	it('should validate tuple', () => {
		const schema = z.tuple([z.string(), z.number()])
		expect(schema.parse(['hello', 42])).toEqual(['hello', 42])
	})

	it('should reject wrong length', () => {
		const schema = z.tuple([z.string(), z.number()])
		expect(() => schema.parse(['hello'])).toThrow()
		expect(() => schema.parse(['hello', 42, 'extra'])).toThrow()
	})

	it('should reject wrong types', () => {
		const schema = z.tuple([z.string(), z.number()])
		expect(() => schema.parse([123, 'hello'])).toThrow()
	})
})

describe('record schema', () => {
	it('should validate record', () => {
		const schema = z.record(z.number())
		expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
	})

	it('should reject invalid values', () => {
		const schema = z.record(z.number())
		expect(() => schema.parse({ a: 'not a number' })).toThrow()
	})

	it('should reject non-objects', () => {
		const schema = z.record(z.string())
		expect(() => schema.parse('not an object')).toThrow()
		expect(() => schema.parse([1, 2, 3])).toThrow()
	})
})

describe('refine', () => {
	it('should add custom validation', () => {
		const schema = z.refine(z.number(), (n) => n % 2 === 0, 'Must be even')
		expect(schema.parse(4)).toBe(4)
		expect(() => schema.parse(3)).toThrow()
	})

	it('should chain refine', () => {
		const schema = z
			.refine(z.number(), (n) => n > 0, 'Must be positive')
			.refine((n) => n < 100, 'Must be less than 100')
		expect(schema.parse(50)).toBe(50)
		expect(() => schema.parse(-1)).toThrow()
		expect(() => schema.parse(200)).toThrow()
	})
})

describe('transform', () => {
	it('should transform value', () => {
		const schema = z.transform(z.string(), (s) => s.toUpperCase())
		expect(schema.parse('hello')).toBe('HELLO')
	})

	it('should chain transform', () => {
		const schema = z
			.transform(z.string(), (s) => s.trim())
			.transform((s) => s.toUpperCase())
		expect(schema.parse('  hello  ')).toBe('HELLO')
	})
})

describe('default', () => {
	it('should provide default value', () => {
		const schema = z.default(z.string(), 'default')
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(undefined)).toBe('default')
	})

	it('should work with function default', () => {
		let counter = 0
		const schema = z.default(z.number(), () => ++counter)
		expect(schema.parse(undefined)).toBe(1)
		expect(schema.parse(undefined)).toBe(2)
		expect(schema.parse(42)).toBe(42)
	})
})

describe('coerce', () => {
	it('should coerce to string', () => {
		const schema = z.coerce.string()
		expect(schema.parse(123)).toBe('123')
		expect(schema.parse(true)).toBe('true')
	})

	it('should coerce to number', () => {
		const schema = z.coerce.number()
		expect(schema.parse('42')).toBe(42)
		expect(schema.parse('3.14')).toBe(3.14)
	})

	it('should coerce to boolean', () => {
		const schema = z.coerce.boolean()
		expect(schema.parse('true')).toBe(true)
		expect(schema.parse('false')).toBe(false)
		expect(schema.parse(1)).toBe(true)
		expect(schema.parse(0)).toBe(false)
	})

	it('should coerce to date', () => {
		const schema = z.coerce.date()
		const date = schema.parse('2024-01-01')
		expect(date instanceof Date).toBe(true)
		expect(date.getFullYear()).toBe(2024)
	})
})

describe('discriminatedUnion', () => {
	it('should validate based on discriminator', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal('a'), value: z.string() }),
			z.object({ type: z.literal('b'), value: z.number() }),
		])

		expect(schema.parse({ type: 'a', value: 'hello' })).toEqual({ type: 'a', value: 'hello' })
		expect(schema.parse({ type: 'b', value: 42 })).toEqual({ type: 'b', value: 42 })
	})

	it('should reject invalid discriminator', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal('a'), value: z.string() }),
			z.object({ type: z.literal('b'), value: z.number() }),
		])

		expect(() => schema.parse({ type: 'c', value: 'test' })).toThrow()
	})

	it('should reject missing discriminator', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal('a'), value: z.string() }),
		])

		expect(() => schema.parse({ value: 'test' })).toThrow()
	})
})

describe('lazy', () => {
	it('should handle recursive types', () => {
		type TreeNode = {
			value: number
			children: TreeNode[]
		}

		const treeSchema: z.Infer<typeof treeSchemaLazy> = {} as TreeNode
		const treeSchemaLazy = z.lazy(() =>
			z.object({
				value: z.number(),
				children: z.array(treeSchemaLazy),
			})
		)

		const tree = {
			value: 1,
			children: [
				{ value: 2, children: [] },
				{ value: 3, children: [{ value: 4, children: [] }] },
			],
		}

		expect(treeSchemaLazy.parse(tree)).toEqual(tree)
	})
})

describe('primitive types', () => {
	it('should validate any', () => {
		const schema = z.any()
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(123)).toBe(123)
		expect(schema.parse(null)).toBe(null)
	})

	it('should validate unknown', () => {
		const schema = z.unknown()
		expect(schema.parse('hello')).toBe('hello')
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
		expect(() => schema.parse(null)).toThrow()
	})

	it('should reject never', () => {
		const schema = z.never()
		expect(() => schema.parse('anything')).toThrow()
		expect(() => schema.parse(null)).toThrow()
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
		expect(() => schema.parse('not a date')).toThrow()
	})

	it('should validate bigint', () => {
		const schema = z.bigint()
		expect(schema.parse(BigInt(123))).toBe(BigInt(123))
		expect(() => schema.parse(123)).toThrow()
	})

	it('should validate symbol', () => {
		const schema = z.symbol()
		const sym = Symbol('test')
		expect(schema.parse(sym)).toBe(sym)
		expect(() => schema.parse('not a symbol')).toThrow()
	})
})

describe('string validators', () => {
	it('should validate ipv4', () => {
		const schema = z.string().ipv4()
		expect(schema.parse('192.168.1.1')).toBe('192.168.1.1')
		expect(() => schema.parse('not an ip')).toThrow()
	})

	it('should validate datetime', () => {
		const schema = z.string().datetime()
		expect(schema.parse('2024-01-01T00:00:00Z')).toBe('2024-01-01T00:00:00Z')
		expect(() => schema.parse('not a date')).toThrow()
	})

	it('should validate base64', () => {
		const schema = z.string().base64()
		expect(schema.parse('SGVsbG8gV29ybGQ=')).toBe('SGVsbG8gV29ybGQ=')
		expect(() => schema.parse('not base64!')).toThrow()
	})

	it('should validate jwt', () => {
		const schema = z.string().jwt()
		expect(schema.parse('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature')).toBeTruthy()
		expect(() => schema.parse('not.a.jwt!')).toThrow()
	})

	it('should support nullish', () => {
		const schema = z.string().nullish()
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(null)).toBe(null)
		expect(schema.parse(undefined)).toBe(undefined)
	})
})

describe('object methods', () => {
	it('should support required', () => {
		const schema = z.object({ name: z.string().optional() }).required()
		expect(() => schema.parse({ name: undefined })).toThrow()
		expect(schema.parse({ name: 'test' })).toEqual({ name: 'test' })
	})

	it('should support keyof', () => {
		const schema = z.object({ name: z.string(), age: z.number() })
		const keySchema = schema.keyof()
		expect(keySchema.parse('name')).toBe('name')
		expect(keySchema.parse('age')).toBe('age')
		expect(() => keySchema.parse('unknown')).toThrow()
	})

	it('should support nullish', () => {
		const schema = z.object({ name: z.string() }).nullish()
		expect(schema.parse({ name: 'test' })).toEqual({ name: 'test' })
		expect(schema.parse(null)).toBe(null)
		expect(schema.parse(undefined)).toBe(undefined)
	})
})

describe('utilities', () => {
	it('should support preprocess', () => {
		const schema = z.preprocess((v) => String(v).trim(), z.string().min(1))
		expect(schema.parse('  hello  ')).toBe('hello')
		expect(() => schema.parse('   ')).toThrow()
	})

	it('should support intersection', () => {
		const schema = z.intersection(
			z.object({ name: z.string() }),
			z.object({ age: z.number() })
		)
		expect(schema.parse({ name: 'test', age: 25 })).toEqual({ name: 'test', age: 25 })
	})

	it('should support map', () => {
		const schema = z.map(z.string(), z.number())
		const map = new Map([['a', 1], ['b', 2]])
		expect(schema.parse(map)).toEqual(map)
		expect(() => schema.parse('not a map')).toThrow()
	})

	it('should support set', () => {
		const schema = z.set(z.number())
		const set = new Set([1, 2, 3])
		expect(schema.parse(set)).toEqual(set)
		expect(() => schema.parse('not a set')).toThrow()
	})

	it('should support instanceof', () => {
		class MyClass {}
		const schema = z.instanceof(MyClass)
		const instance = new MyClass()
		expect(schema.parse(instance)).toBe(instance)
		expect(() => schema.parse({})).toThrow()
	})

	it('should support pipe', () => {
		const schema = z.pipe(
			z.string(),
			z.transform(z.string(), (s) => s.length)
		)
		// Note: pipe chains validation, so we need proper setup
		const stringToNumber = z.pipe(
			z.coerce.string(),
			z.transform(z.string(), (s) => parseInt(s, 10))
		)
		expect(stringToNumber.parse(42)).toBe(42)
	})

	it('should support promise', () => {
		const schema = z.promise(z.string())
		const promise = Promise.resolve('hello')
		const result = schema.parse(promise)
		expect(result).toBeInstanceOf(Promise)
	})

	it('should support function', () => {
		const schema = z.function()
		expect(schema.parse(() => {})).toBeInstanceOf(Function)
		expect(() => schema.parse('not a function')).toThrow()
	})

	it('should support or (union shorthand)', () => {
		const schema = z.or(z.string(), z.number())
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(42)).toBe(42)
		expect(() => schema.parse(true)).toThrow()
	})

	it('should support and (intersection shorthand)', () => {
		const schema = z.and(
			z.object({ name: z.string() }),
			z.object({ age: z.number() })
		)
		expect(schema.parse({ name: 'test', age: 25 })).toEqual({ name: 'test', age: 25 })
	})
})

describe('new modifiers', () => {
	it('should support catch', () => {
		const schema = z.catch(z.string(), 'default')
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(123)).toBe('default')
		expect(schema.parse(null)).toBe('default')
	})

	it('should support catch with function', () => {
		const schema = z.catch(z.number(), ({ input }) => (typeof input === 'string' ? 0 : -1))
		expect(schema.parse(42)).toBe(42)
		expect(schema.parse('not a number')).toBe(0)
		expect(schema.parse(null)).toBe(-1)
	})

	it('should support superRefine', () => {
		const schema = z.superRefine(z.string(), (data, ctx) => {
			if (data.length < 3) {
				ctx.addIssue({ message: 'Too short' })
			}
			if (!data.includes('@')) {
				ctx.addIssue({ message: 'Must contain @' })
			}
		})
		expect(schema.parse('test@example')).toBe('test@example')
		expect(() => schema.parse('ab')).toThrow()
	})

	it('should support brand', () => {
		const UserId = z.brand(z.string(), 'UserId')
		const userId = UserId.parse('user123')
		expect(userId).toBe('user123')
		// TypeScript would enforce branded type
	})

	it('should support readonly', () => {
		const schema = z.readonly(z.object({ name: z.string() }))
		const result = schema.parse({ name: 'test' })
		expect(result).toEqual({ name: 'test' })
		// TypeScript would make result readonly
	})

	it('should support custom', () => {
		const isEven = (n: unknown): n is number => typeof n === 'number' && n % 2 === 0
		const schema = z.custom(isEven, 'Must be even')
		expect(schema.parse(4)).toBe(4)
		expect(() => schema.parse(3)).toThrow('Must be even')
	})

	it('should support stringbool', () => {
		const schema = z.stringbool()
		expect(schema.parse('true')).toBe(true)
		expect(schema.parse('false')).toBe(false)
		expect(schema.parse('yes')).toBe(true)
		expect(schema.parse('no')).toBe(false)
		expect(schema.parse('1')).toBe(true)
		expect(schema.parse('0')).toBe(false)
		expect(schema.parse('enabled')).toBe(true)
		expect(schema.parse('disabled')).toBe(false)
		expect(() => schema.parse('maybe')).toThrow()
	})
})

describe('additional utilities', () => {
	it('should support json schema', () => {
		const schema = z.json(z.object({ name: z.string(), age: z.number() }))
		expect(schema.parse('{"name":"test","age":25}')).toEqual({ name: 'test', age: 25 })
		expect(() => schema.parse('invalid json')).toThrow()
		expect(() => schema.parse('{"name":"test"}')).toThrow() // missing age
		expect(() => schema.parse(123)).toThrow() // not a string
	})

	it('should support int schema', () => {
		const schema = z.int()
		expect(schema.parse(42)).toBe(42)
		expect(schema.parse(-10)).toBe(-10)
		expect(() => schema.parse(3.14)).toThrow()
		expect(() => schema.parse('42')).toThrow()
	})

	it('should support int32 schema', () => {
		const schema = z.int32()
		expect(schema.parse(42)).toBe(42)
		expect(schema.parse(2147483647)).toBe(2147483647)
		expect(schema.parse(-2147483648)).toBe(-2147483648)
		expect(() => schema.parse(2147483648)).toThrow()
		expect(() => schema.parse(-2147483649)).toThrow()
		expect(() => schema.parse(3.14)).toThrow()
	})

	it('should support int with constraints', () => {
		const schema = z.int().min(0).max(100).multipleOf(5)
		expect(schema.parse(0)).toBe(0)
		expect(schema.parse(50)).toBe(50)
		expect(schema.parse(100)).toBe(100)
		expect(() => schema.parse(-5)).toThrow()
		expect(() => schema.parse(101)).toThrow()
		expect(() => schema.parse(7)).toThrow() // not multiple of 5
	})

	it('should support iso.datetime', () => {
		const schema = z.iso.datetime()
		expect(schema.parse('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z')
		expect(schema.parse('2024-01-15T10:30:00.123Z')).toBe('2024-01-15T10:30:00.123Z')
		expect(schema.parse('2024-01-15T10:30:00+05:00')).toBe('2024-01-15T10:30:00+05:00')
		expect(() => schema.parse('2024-01-15')).toThrow()
		expect(() => schema.parse('invalid')).toThrow()
	})

	it('should support iso.date', () => {
		const schema = z.iso.date()
		expect(schema.parse('2024-01-15')).toBe('2024-01-15')
		expect(() => schema.parse('2024-1-15')).toThrow()
		expect(() => schema.parse('2024-01-15T10:30:00Z')).toThrow()
	})

	it('should support iso.time', () => {
		const schema = z.iso.time()
		expect(schema.parse('10:30:00')).toBe('10:30:00')
		expect(schema.parse('10:30:00.123')).toBe('10:30:00.123')
		expect(() => schema.parse('10:30')).toThrow()
		expect(() => schema.parse('invalid')).toThrow()
	})

	it('should support prefault', () => {
		const schema = z.prefault(z.string(), 'default')
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(undefined)).toBe('default')
		expect(schema.parse(null)).toBe('default')
	})

	it('should support prefault with function', () => {
		let counter = 0
		const schema = z.prefault(z.number(), () => counter++)
		expect(schema.parse(undefined)).toBe(0)
		expect(schema.parse(undefined)).toBe(1)
		expect(schema.parse(42)).toBe(42)
	})

	it('should support check', () => {
		const schema = z.check(
			z.number(),
			(n) => n % 2 === 0,
			'Must be even'
		)
		expect(schema.parse(4)).toBe(4)
		expect(() => schema.parse(3)).toThrow('Must be even')
	})

	it('should support array unwrap', () => {
		const stringSchema = z.string().email()
		const arraySchema = z.array(stringSchema)
		const unwrapped = arraySchema.unwrap()
		expect(unwrapped.parse('test@example.com')).toBe('test@example.com')
		expect(() => unwrapped.parse('invalid')).toThrow()
	})

	it('should support set min/max/size', () => {
		const minSchema = z.set(z.number()).min(2)
		expect(minSchema.parse(new Set([1, 2]))).toEqual(new Set([1, 2]))
		expect(() => minSchema.parse(new Set([1]))).toThrow()

		const maxSchema = z.set(z.number()).max(2)
		expect(maxSchema.parse(new Set([1]))).toEqual(new Set([1]))
		expect(() => maxSchema.parse(new Set([1, 2, 3]))).toThrow()

		const sizeSchema = z.set(z.number()).size(2)
		expect(sizeSchema.parse(new Set([1, 2]))).toEqual(new Set([1, 2]))
		expect(() => sizeSchema.parse(new Set([1]))).toThrow()

		const nonemptySchema = z.set(z.number()).nonempty()
		expect(nonemptySchema.parse(new Set([1]))).toEqual(new Set([1]))
		expect(() => nonemptySchema.parse(new Set())).toThrow()
	})
})

describe('additional string validators', () => {
	it('should validate hex', () => {
		const schema = z.string().hex()
		expect(schema.parse('deadbeef')).toBe('deadbeef')
		expect(schema.parse('ABCD1234')).toBe('ABCD1234')
		expect(() => schema.parse('xyz')).toThrow()
	})

	it('should validate base64url', () => {
		const schema = z.string().base64url()
		expect(schema.parse('abc123_-')).toBe('abc123_-')
		expect(() => schema.parse('abc+/')).toThrow()
	})

	it('should validate hostname', () => {
		const schema = z.string().hostname()
		expect(schema.parse('example.com')).toBe('example.com')
		expect(schema.parse('sub.example.com')).toBe('sub.example.com')
		expect(() => schema.parse('-invalid.com')).toThrow()
	})

	it('should validate mac address', () => {
		const schema = z.string().mac()
		expect(schema.parse('00:1B:44:11:3A:B7')).toBe('00:1B:44:11:3A:B7')
		expect(schema.parse('00-1B-44-11-3A-B7')).toBe('00-1B-44-11-3A-B7')
		expect(() => schema.parse('invalid')).toThrow()
	})

	it('should validate cidrv4', () => {
		const schema = z.string().cidrv4()
		expect(schema.parse('192.168.1.0/24')).toBe('192.168.1.0/24')
		expect(schema.parse('10.0.0.0/8')).toBe('10.0.0.0/8')
		expect(() => schema.parse('192.168.1.0')).toThrow()
		expect(() => schema.parse('192.168.1.0/33')).toThrow()
	})

	it('should validate lowercase', () => {
		const schema = z.string().lowercase()
		expect(schema.parse('hello')).toBe('hello')
		expect(() => schema.parse('Hello')).toThrow()
	})

	it('should validate uppercase', () => {
		const schema = z.string().uppercase()
		expect(schema.parse('HELLO')).toBe('HELLO')
		expect(() => schema.parse('Hello')).toThrow()
	})
})

describe('top-level format validators', () => {
	it('should validate email', () => {
		const schema = z.email()
		expect(schema.parse('test@example.com')).toBe('test@example.com')
		expect(() => schema.parse('invalid')).toThrow()
	})

	it('should validate uuid', () => {
		const schema = z.uuid()
		expect(schema.parse('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000')
		expect(() => schema.parse('not-a-uuid')).toThrow()
	})

	it('should validate url', () => {
		const schema = z.url()
		expect(schema.parse('https://example.com')).toBe('https://example.com')
		expect(() => schema.parse('not-a-url')).toThrow()
	})

	it('should validate httpUrl', () => {
		const schema = z.httpUrl()
		expect(schema.parse('https://example.com/path')).toBe('https://example.com/path')
		expect(schema.parse('http://localhost:3000')).toBe('http://localhost:3000')
		expect(() => schema.parse('ftp://example.com')).toThrow()
	})

	it('should validate ipv4', () => {
		const schema = z.ipv4()
		expect(schema.parse('192.168.1.1')).toBe('192.168.1.1')
		expect(schema.parse('10.0.0.0')).toBe('10.0.0.0')
		expect(() => schema.parse('256.0.0.0')).toThrow()
		expect(() => schema.parse('invalid')).toThrow()
	})

	it('should validate ipv6', () => {
		const schema = z.ipv6()
		expect(schema.parse('::1')).toBe('::1')
		expect(schema.parse('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
		expect(() => schema.parse('invalid')).toThrow()
	})

	it('should validate hash', () => {
		const md5 = z.hash('md5')
		expect(md5.parse('d41d8cd98f00b204e9800998ecf8427e')).toBe('d41d8cd98f00b204e9800998ecf8427e')
		expect(() => md5.parse('invalid')).toThrow()

		const sha256 = z.hash('sha256')
		expect(sha256.parse('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
		expect(() => sha256.parse('tooshort')).toThrow()
	})
})

describe('object variants', () => {
	it('should support strictObject', () => {
		const schema = z.strictObject({ name: z.string() })
		expect(schema.parse({ name: 'test' })).toEqual({ name: 'test' })
		expect(() => schema.parse({ name: 'test', extra: 'field' })).toThrow()
	})

	it('should support looseObject', () => {
		const schema = z.looseObject({ name: z.string() })
		expect(schema.parse({ name: 'test', extra: 'field' })).toEqual({ name: 'test', extra: 'field' })
	})
})

describe('advanced utilities', () => {
	it('should support partialRecord', () => {
		const schema = z.partialRecord(z.string(), z.number())
		expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
		expect(schema.parse({})).toEqual({})
		expect(() => schema.parse({ a: 'string' })).toThrow()
	})

	it('should support codec', () => {
		const dateCodec = z.codec(
			z.transform(z.string(), (s) => new Date(s)),
			(d: Date) => d.toISOString()
		)
		const parsed = dateCodec.parse('2024-01-15T00:00:00.000Z')
		expect(parsed instanceof Date).toBe(true)
		expect(dateCodec.encode(parsed)).toBe('2024-01-15T00:00:00.000Z')
	})

	it('should support templateLiteral', () => {
		const schema = z.templateLiteral`user_${z.string()}`
		expect(schema.parse('user_123')).toBe('user_123')
		expect(schema.parse('user_abc')).toBe('user_abc')
		expect(() => schema.parse('admin_123')).toThrow()
	})

	it('should support file schema', () => {
		// Create a mock Blob for testing
		const blob = new Blob(['test content'], { type: 'text/plain' })
		const schema = z.file()
		expect(schema.parse(blob)).toBe(blob)
		expect(() => schema.parse('not a file')).toThrow()
	})

	it('should support file with constraints', () => {
		const schema = z.file().maxSize(1024).mimeType(['image/png', 'image/jpeg'])
		const validBlob = new Blob(['x'.repeat(100)], { type: 'image/png' })
		expect(schema.parse(validBlob)).toBe(validBlob)

		const tooLarge = new Blob(['x'.repeat(2000)], { type: 'image/png' })
		expect(() => schema.parse(tooLarge)).toThrow()

		const wrongType = new Blob(['test'], { type: 'text/plain' })
		expect(() => schema.parse(wrongType)).toThrow()
	})
})

describe('bigint validators', () => {
	it('should validate bigint', () => {
		const schema = z.bigint()
		expect(schema.parse(123n)).toBe(123n)
		expect(() => schema.parse(123)).toThrow()
	})

	it('should validate bigint min/max', () => {
		const schema = z.bigint().min(10n).max(100n)
		expect(schema.parse(50n)).toBe(50n)
		expect(() => schema.parse(5n)).toThrow()
		expect(() => schema.parse(200n)).toThrow()
	})

	it('should validate bigint positive/negative', () => {
		const positive = z.bigint().positive()
		expect(positive.parse(1n)).toBe(1n)
		expect(() => positive.parse(0n)).toThrow()
		expect(() => positive.parse(-1n)).toThrow()

		const negative = z.bigint().negative()
		expect(negative.parse(-1n)).toBe(-1n)
		expect(() => negative.parse(0n)).toThrow()
	})

	it('should validate bigint multipleOf', () => {
		const schema = z.bigint().multipleOf(5n)
		expect(schema.parse(10n)).toBe(10n)
		expect(schema.parse(0n)).toBe(0n)
		expect(() => schema.parse(7n)).toThrow()
	})
})

describe('date validators', () => {
	it('should validate date', () => {
		const schema = z.date()
		const now = new Date()
		expect(schema.parse(now)).toBe(now)
		expect(() => schema.parse('2024-01-01')).toThrow()
	})

	it('should validate date min/max', () => {
		const minDate = new Date('2024-01-01')
		const maxDate = new Date('2024-12-31')
		const schema = z.date().min(minDate).max(maxDate)

		expect(schema.parse(new Date('2024-06-15'))).toBeTruthy()
		expect(() => schema.parse(new Date('2023-06-15'))).toThrow()
		expect(() => schema.parse(new Date('2025-06-15'))).toThrow()
	})
})

describe('object safeExtend', () => {
	it('should extend without overriding existing keys', () => {
		const base = z.object({ name: z.string(), age: z.number() })
		const extended = base.safeExtend({ age: z.string(), email: z.string() })

		// age should still be number (not overridden), email should be added
		expect(extended.parse({ name: 'test', age: 25, email: 'test@example.com' })).toEqual({
			name: 'test',
			age: 25,
			email: 'test@example.com'
		})
		expect(() => extended.parse({ name: 'test', age: '25', email: 'test@example.com' })).toThrow()
	})
})

describe('unwrap methods', () => {
	it('should unwrap tuple', () => {
		const schema = z.tuple([z.string(), z.number()])
		const items = schema.unwrap()
		expect(items.length).toBe(2)
		expect(items[0]!.parse('hello')).toBe('hello')
		expect(items[1]!.parse(42)).toBe(42)
	})

	it('should unwrap record', () => {
		const schema = z.record(z.string(), z.number())
		const { key, value } = schema.unwrap()
		expect(key.parse('test')).toBe('test')
		expect(value.parse(42)).toBe(42)
	})

	it('should unwrap map', () => {
		const schema = z.map(z.string(), z.number())
		const { key, value } = schema.unwrap()
		expect(key.parse('test')).toBe('test')
		expect(value.parse(42)).toBe(42)
	})

	it('should unwrap set', () => {
		const schema = z.set(z.number())
		const valueSchema = schema.unwrap()
		expect(valueSchema.parse(42)).toBe(42)
	})
})

describe('z.interface (Zod v4)', () => {
	it('should validate required properties', () => {
		const schema = z.interface({
			name: z.string(),
			age: z.number(),
		})

		expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
		expect(() => schema.parse({ name: 'John' })).toThrow()
	})

	it('should validate optional properties with optionalProp', () => {
		const schema = z.interface({
			name: z.string(),
			email: z.optionalProp(z.string()),
		})

		expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' })
		expect(schema.parse({ name: 'John', email: 'john@example.com' })).toEqual({
			name: 'John',
			email: 'john@example.com'
		})
	})

	it('should support partial()', () => {
		const schema = z.interface({
			name: z.string(),
			age: z.number(),
		}).partial()

		expect(schema.parse({})).toEqual({})
		expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' })
	})

	it('should support required()', () => {
		const schema = z.interface({
			name: z.string(),
			email: z.optionalProp(z.string()),
		}).required()

		expect(() => schema.parse({ name: 'John' })).toThrow()
		expect(schema.parse({ name: 'John', email: 'test@example.com' })).toBeTruthy()
	})

	it('should support pick()', () => {
		const schema = z.interface({
			name: z.string(),
			age: z.number(),
			email: z.string(),
		}).pick(['name', 'email'])

		expect(schema.parse({ name: 'John', email: 'john@example.com' })).toBeTruthy()
	})

	it('should support omit()', () => {
		const schema = z.interface({
			name: z.string(),
			age: z.number(),
			email: z.string(),
		}).omit(['age'])

		expect(schema.parse({ name: 'John', email: 'john@example.com' })).toBeTruthy()
	})
})

describe('UUID versions', () => {
	it('should validate uuidv4', () => {
		const schema = z.uuidv4()
		expect(schema.parse('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
		// v1 UUID should fail v4 validation
		expect(() => schema.parse('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toThrow()
	})

	it('should validate uuidv7', () => {
		const schema = z.uuidv7()
		expect(schema.parse('01908c70-7a1a-7f28-8db5-5a7b9c4b1234')).toBe('01908c70-7a1a-7f28-8db5-5a7b9c4b1234')
	})
})

describe('number rejects Infinity (Zod v4)', () => {
	it('should reject Infinity', () => {
		const schema = z.number()
		expect(() => schema.parse(Infinity)).toThrow()
		expect(() => schema.parse(-Infinity)).toThrow()
	})

	it('should still accept regular numbers', () => {
		const schema = z.number()
		expect(schema.parse(42)).toBe(42)
		expect(schema.parse(-100)).toBe(-100)
		expect(schema.parse(0)).toBe(0)
	})
})

describe('int rejects unsafe integers (Zod v4)', () => {
	it('should reject unsafe integers', () => {
		const schema = z.int()
		// Numbers outside safe integer range
		expect(() => schema.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow()
		expect(() => schema.parse(Number.MIN_SAFE_INTEGER - 1)).toThrow()
	})

	it('should accept safe integers', () => {
		const schema = z.int()
		expect(schema.parse(42)).toBe(42)
		expect(schema.parse(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
		expect(schema.parse(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER)
	})
})

describe('nativeEnum', () => {
	enum Color {
		Red = 'RED',
		Green = 'GREEN',
		Blue = 'BLUE',
	}

	enum NumericEnum {
		One = 1,
		Two = 2,
		Three = 3,
	}

	it('should validate string enums', () => {
		const schema = z.nativeEnum(Color)
		expect(schema.parse('RED')).toBe('RED')
		expect(schema.parse('GREEN')).toBe('GREEN')
		expect(() => schema.parse('YELLOW')).toThrow()
	})

	it('should validate numeric enums', () => {
		const schema = z.nativeEnum(NumericEnum)
		expect(schema.parse(1)).toBe(1)
		expect(schema.parse(2)).toBe(2)
		expect(() => schema.parse(4)).toThrow()
	})

	it('should expose enum object', () => {
		const schema = z.nativeEnum(Color)
		expect(schema.enum).toBe(Color)
	})
})

describe('step alias', () => {
	it('should work as alias for multipleOf on number', () => {
		const schema = z.number().step(0.5)
		expect(schema.parse(1.5)).toBe(1.5)
		expect(schema.parse(2)).toBe(2)
		expect(() => schema.parse(1.3)).toThrow()
	})

	it('should work as alias for multipleOf on bigint', () => {
		const schema = z.bigint().step(5n)
		expect(schema.parse(10n)).toBe(10n)
		expect(() => schema.parse(7n)).toThrow()
	})
})

describe('enum values property', () => {
	it('should expose values array', () => {
		const schema = z.enum(['a', 'b', 'c'])
		expect(schema.values).toEqual(['a', 'b', 'c'])
		expect(schema.options).toEqual(['a', 'b', 'c'])
	})
})

describe('toJSONSchema', () => {
	it('should convert object schema', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		})
		const jsonSchema = z.toJSONSchema(schema)
		expect(jsonSchema).toEqual({
			type: 'object',
			properties: {
				name: { type: 'string' },
				age: { type: 'number' },
			},
			required: ['name', 'age'],
			additionalProperties: false,
		})
	})

	it('should convert array schema', () => {
		const schema = z.array(z.string())
		const jsonSchema = z.toJSONSchema(schema)
		expect(jsonSchema).toEqual({
			type: 'array',
			items: { type: 'string' },
		})
	})

	it('should convert enum schema', () => {
		const schema = z.enum(['a', 'b', 'c'])
		const jsonSchema = z.toJSONSchema(schema)
		expect(jsonSchema).toEqual({
			enum: ['a', 'b', 'c'],
		})
	})

	it('should convert union schema', () => {
		const schema = z.union([z.string(), z.number()])
		const jsonSchema = z.toJSONSchema(schema)
		expect(jsonSchema).toEqual({
			anyOf: [{ type: 'string' }, { type: 'number' }],
		})
	})

	it('should handle optional fields', () => {
		const schema = z.object({
			name: z.string(),
			email: z.string().optional(),
		})
		const jsonSchema = z.toJSONSchema(schema)
		expect((jsonSchema as { required?: string[] }).required).toEqual(['name'])
	})
})

describe('globalRegistry', () => {
	it('should register and retrieve schemas', () => {
		z.globalRegistry.clear()
		const userSchema = z.object({
			name: z.string(),
			age: z.number(),
		})
		z.globalRegistry.register('User', userSchema)

		expect(z.globalRegistry.has('User')).toBe(true)
		expect(z.globalRegistry.get('User')).toBe(userSchema)
	})

	it('should list all registered names', () => {
		z.globalRegistry.clear()
		z.globalRegistry.register('Schema1', z.string())
		z.globalRegistry.register('Schema2', z.number())

		const names = z.globalRegistry.names()
		expect(names).toContain('Schema1')
		expect(names).toContain('Schema2')
	})

	it('should get name of registered schema', () => {
		z.globalRegistry.clear()
		const schema = z.string()
		z.globalRegistry.register('MyString', schema)

		expect(z.globalRegistry.nameOf(schema)).toBe('MyString')
	})

	it('should clear all schemas', () => {
		z.globalRegistry.clear()
		z.globalRegistry.register('Test', z.string())
		expect(z.globalRegistry.has('Test')).toBe(true)

		z.globalRegistry.clear()
		expect(z.globalRegistry.has('Test')).toBe(false)
	})
})
