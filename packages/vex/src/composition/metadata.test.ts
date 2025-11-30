import { describe, expect, test } from 'bun:test'
import { email, str } from '..'
import {
	brand,
	description,
	examples,
	flavor,
	getDescription,
	getExamples,
	getMetadata,
	getTitle,
	metadata,
	readonly,
	title,
} from './metadata'

describe('Metadata Functions', () => {
	describe('metadata', () => {
		test('adds metadata to validator', () => {
			const validator = metadata(str(), { description: 'A string' })
			expect(validator('hello')).toBe('hello')
			expect(getMetadata(validator)?.description).toBe('A string')
		})

		test('merges metadata', () => {
			const v1 = metadata(str(), { description: 'A string' })
			const v2 = metadata(v1, { title: 'String' })
			const meta = getMetadata(v2)
			expect(meta?.description).toBe('A string')
			expect(meta?.title).toBe('String')
		})

		test('returns undefined for validators without metadata', () => {
			expect(getMetadata(str())).toBeUndefined()
		})

		test('safe version delegates to inner safe', () => {
			const validator = metadata(str(), { description: 'Test' })
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(validator.safe!(123)).toEqual({ ok: false, error: 'Expected string' })
		})

		test('safe version falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const validator = metadata(noSafe, { description: 'Test' })
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(validator.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('safe version handles non-Error exceptions', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const validator = metadata(throwsNonError, { description: 'Test' })
			expect(validator.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})

		test('supports custom metadata properties', () => {
			const validator = metadata(str(), { customProp: 'custom value' })
			expect(getMetadata(validator)?.customProp).toBe('custom value')
		})

		test('has Standard Schema support', () => {
			const validator = metadata(str(), { description: 'Test' })
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']?.version).toBe(1)
			expect(validator['~standard']?.vendor).toBe('vex')
		})

		test('Standard Schema validate returns value', () => {
			const validator = metadata(str(), { description: 'Test' })
			const result = validator['~standard']!.validate('hello')
			expect(result).toEqual({ value: 'hello' })
		})

		test('Standard Schema validate returns issues', () => {
			const validator = metadata(str(), { description: 'Test' })
			const result = validator['~standard']!.validate(123)
			expect(result.issues).toBeDefined()
		})
	})

	describe('description', () => {
		test('adds description to validator', () => {
			const validator = description(str(), 'User name')
			expect(validator('John')).toBe('John')
			expect(getMetadata(validator)?.description).toBe('User name')
		})

		test('getDescription retrieves description', () => {
			const validator = description(str(), 'User name')
			expect(getDescription(validator)).toBe('User name')
		})

		test('getDescription returns undefined when not set', () => {
			expect(getDescription(str())).toBeUndefined()
		})
	})

	describe('title', () => {
		test('adds title to validator', () => {
			const validator = title(str(), 'Name')
			expect(validator('John')).toBe('John')
			expect(getMetadata(validator)?.title).toBe('Name')
		})

		test('getTitle retrieves title', () => {
			const validator = title(str(), 'Name')
			expect(getTitle(validator)).toBe('Name')
		})

		test('getTitle returns undefined when not set', () => {
			expect(getTitle(str())).toBeUndefined()
		})
	})

	describe('examples', () => {
		test('adds examples to validator', () => {
			const validator = examples(str(), ['hello', 'world'])
			expect(validator('test')).toBe('test')
			expect(getMetadata(validator)?.examples).toEqual(['hello', 'world'])
		})

		test('getExamples retrieves examples', () => {
			const validator = examples(str(), ['example1', 'example2'])
			expect(getExamples(validator)).toEqual(['example1', 'example2'])
		})

		test('getExamples returns undefined when not set', () => {
			expect(getExamples(str())).toBeUndefined()
		})
	})

	describe('brand', () => {
		test('adds brand to validator', () => {
			const validateEmail = brand(str(email), 'Email')
			const result = validateEmail('test@example.com')
			expect(result as string).toBe('test@example.com')
			expect(getMetadata(validateEmail)?.brand).toBe('Email')
		})

		test('brand throws on invalid input', () => {
			const validateEmail = brand(str(email), 'Email')
			expect(() => validateEmail('invalid')).toThrow()
		})

		test('brand safe version delegates to inner safe', () => {
			const validateEmail = brand(str(email), 'Email')
			expect(validateEmail.safe!('test@example.com')).toEqual({
				ok: true,
				value: 'test@example.com',
			})
			expect(validateEmail.safe!('invalid')).toHaveProperty('ok', false)
		})

		test('brand safe version falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const branded = brand(noSafe, 'TestBrand')
			expect(branded.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(branded.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('brand safe handles non-Error exceptions', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const branded = brand(throwsNonError, 'TestBrand')
			expect(branded.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})

		test('brand preserves existing metadata', () => {
			const withDesc = description(str(), 'A string')
			const branded = brand(withDesc, 'TestBrand')
			const meta = getMetadata(branded)
			expect(meta?.description).toBe('A string')
			expect(meta?.brand).toBe('TestBrand')
		})

		test('brand has Standard Schema support', () => {
			const branded = brand(str(), 'TestBrand')
			expect(branded['~standard']).toBeDefined()
			expect(branded['~standard']?.version).toBe(1)
		})
	})

	describe('flavor', () => {
		test('adds flavor to validator', () => {
			const validateUserId = flavor(str(), 'UserId')
			expect(validateUserId('123')).toBe('123')
			expect(getMetadata(validateUserId)?.flavor).toBe('UserId')
		})

		test('flavor throws on invalid input', () => {
			const validateUserId = flavor(str(), 'UserId')
			expect(() => validateUserId(123 as any)).toThrow()
		})

		test('flavor safe version delegates to inner safe', () => {
			const validateUserId = flavor(str(), 'UserId')
			expect(validateUserId.safe!('123')).toEqual({ ok: true, value: '123' })
			expect(validateUserId.safe!(123)).toHaveProperty('ok', false)
		})

		test('flavor safe version falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const flavored = flavor(noSafe, 'TestFlavor')
			expect(flavored.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(flavored.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('flavor safe handles non-Error exceptions', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const flavored = flavor(throwsNonError, 'TestFlavor')
			expect(flavored.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})

		test('flavor preserves existing metadata', () => {
			const withDesc = description(str(), 'A string')
			const flavored = flavor(withDesc, 'TestFlavor')
			const meta = getMetadata(flavored)
			expect(meta?.description).toBe('A string')
			expect(meta?.flavor).toBe('TestFlavor')
		})

		test('flavor has Standard Schema support', () => {
			const flavored = flavor(str(), 'TestFlavor')
			expect(flavored['~standard']).toBeDefined()
			expect(flavored['~standard']?.version).toBe(1)
		})
	})

	describe('readonly', () => {
		test('wraps validator with readonly type', () => {
			const validator = readonly(str())
			expect(validator('hello')).toBe('hello')
		})

		test('readonly throws on invalid input', () => {
			const validator = readonly(str())
			expect(() => validator(123)).toThrow()
		})

		test('readonly safe version delegates to inner safe', () => {
			const validator = readonly(str())
			expect(validator.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(validator.safe!(123)).toHaveProperty('ok', false)
		})

		test('readonly safe version falls back to try-catch', () => {
			const noSafe = ((v: unknown) => {
				if (typeof v !== 'string') throw new Error('Must be string')
				return v
			}) as any
			const readonlyVal = readonly(noSafe)
			expect(readonlyVal.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(readonlyVal.safe!(123)).toEqual({ ok: false, error: 'Must be string' })
		})

		test('readonly safe handles non-Error exceptions', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const readonlyVal = readonly(throwsNonError)
			expect(readonlyVal.safe!('anything')).toEqual({ ok: false, error: 'Unknown error' })
		})

		test('readonly has Standard Schema support', () => {
			const validator = readonly(str())
			expect(validator['~standard']).toBeDefined()
			expect(validator['~standard']?.version).toBe(1)
		})
	})

	describe('combined metadata', () => {
		test('can combine multiple metadata functions', () => {
			const validator = title(description(examples(str(), ['hello']), 'A string value'), 'String')
			const meta = getMetadata(validator)
			expect(meta?.title).toBe('String')
			expect(meta?.description).toBe('A string value')
			expect(meta?.examples).toEqual(['hello'])
		})

		test('later metadata overrides earlier', () => {
			const v1 = description(str(), 'First description')
			const v2 = description(v1, 'Second description')
			expect(getDescription(v2)).toBe('Second description')
		})
	})
})
