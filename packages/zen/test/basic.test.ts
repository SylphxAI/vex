import { describe, it, expect } from 'bun:test'
import { z, string, number, boolean, object, array, union, optional, nullable, transform, refine, minLength, maxLength, min, max, int, email } from '../src'

describe('zen-mini primitives', () => {
	it('should validate string', () => {
		const schema = z.string()
		expect(schema.parse('hello')).toBe('hello')
		expect(() => schema.parse(123)).toThrow()
	})

	it('should validate number', () => {
		const schema = z.number()
		expect(schema.parse(42)).toBe(42)
		expect(() => schema.parse('42')).toThrow()
		expect(() => schema.parse(Infinity)).toThrow()
	})

	it('should validate boolean', () => {
		const schema = z.boolean()
		expect(schema.parse(true)).toBe(true)
		expect(() => schema.parse('true')).toThrow()
	})
})

describe('zen-mini checks', () => {
	it('should apply string checks', () => {
		const schema = z.string().check(minLength(3), maxLength(10))
		expect(schema.parse('hello')).toBe('hello')
		expect(() => schema.parse('ab')).toThrow()
		expect(() => schema.parse('this is too long')).toThrow()
	})

	it('should apply number checks', () => {
		const schema = z.number().check(min(0), max(100), int())
		expect(schema.parse(50)).toBe(50)
		expect(() => schema.parse(-1)).toThrow()
		expect(() => schema.parse(101)).toThrow()
		expect(() => schema.parse(50.5)).toThrow()
	})

	it('should validate email', () => {
		const schema = z.string().check(email())
		expect(schema.parse('test@example.com')).toBe('test@example.com')
		expect(() => schema.parse('invalid')).toThrow()
	})
})

describe('zen-mini object', () => {
	it('should validate object', () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
		})
		expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
		expect(() => schema.parse({ name: 'John' })).toThrow()
	})
})

describe('zen-mini array', () => {
	it('should validate array', () => {
		const schema = z.array(z.number())
		expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3])
		expect(() => schema.parse([1, '2', 3])).toThrow()
	})
})

describe('zen-mini union', () => {
	it('should validate union', () => {
		const schema = z.union([z.string(), z.number()])
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(42)).toBe(42)
		expect(() => schema.parse(true)).toThrow()
	})
})

describe('zen-mini modifiers', () => {
	it('should handle optional', () => {
		const schema = z.optional(z.string())
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(undefined)).toBe(undefined)
	})

	it('should handle nullable', () => {
		const schema = z.nullable(z.string())
		expect(schema.parse('hello')).toBe('hello')
		expect(schema.parse(null)).toBe(null)
	})

	it('should handle transform', () => {
		const schema = z.transform(z.string(), (s) => s.toUpperCase())
		expect(schema.parse('hello')).toBe('HELLO')
	})

	it('should handle refine', () => {
		const schema = z.refine(z.number(), (n) => n % 2 === 0, 'Must be even')
		expect(schema.parse(4)).toBe(4)
		expect(() => schema.parse(3)).toThrow()
	})
})
