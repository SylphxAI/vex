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
