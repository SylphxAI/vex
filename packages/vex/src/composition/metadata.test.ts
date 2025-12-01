// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { array, email, int, lower, min, num, object, optional, str, trim, union } from '..'
import {
	brand,
	deprecated,
	description,
	examples,
	flavor,
	getBrand,
	getDescription,
	getExamples,
	getFlavor,
	getMetadata,
	getTitle,
	isMetaAction,
	metadata,
	readonly,
	title,
} from './metadata'

describe('MetaAction System', () => {
	describe('isMetaAction', () => {
		test('returns true for MetaActions', () => {
			expect(isMetaAction(description('Test'))).toBe(true)
			expect(isMetaAction(title('Title'))).toBe(true)
			expect(isMetaAction(examples(['a', 'b']))).toBe(true)
			expect(isMetaAction(deprecated())).toBe(true)
			expect(isMetaAction(metadata({ description: 'Test' }))).toBe(true)
		})

		test('returns false for non-MetaActions', () => {
			expect(isMetaAction(str())).toBe(false)
			expect(isMetaAction(null)).toBe(false)
			expect(isMetaAction(undefined)).toBe(false)
			expect(isMetaAction({})).toBe(false)
			expect(isMetaAction('string')).toBe(false)
			expect(isMetaAction(123)).toBe(false)
		})
	})

	describe('description', () => {
		test('returns MetaAction', () => {
			const action = description('User name')
			expect(isMetaAction(action)).toBe(true)
		})

		test('adds description via str()', () => {
			const validator = str(description('User name'))
			expect(validator('John')).toBe('John')
			expect(getDescription(validator)).toBe('User name')
		})

		test('adds description via num()', () => {
			const validator = num(description('Age value'))
			expect(validator(25)).toBe(25)
			expect(getDescription(validator)).toBe('Age value')
		})

		test('adds description via union()', () => {
			const validator = union(str(), num(), description('String or number'))
			expect(validator('hello')).toBe('hello')
			expect(validator(42)).toBe(42)
			expect(getDescription(validator)).toBe('String or number')
		})

		test('adds description via object()', () => {
			const validator = object({ name: str() }, description('User object'))
			expect(validator({ name: 'John' })).toEqual({ name: 'John' })
			expect(getDescription(validator)).toBe('User object')
		})

		test('adds description via array()', () => {
			const validator = array(num(), description('List of numbers'))
			expect(validator([1, 2, 3])).toEqual([1, 2, 3])
			expect(getDescription(validator)).toBe('List of numbers')
		})

		test('getDescription returns undefined when not set', () => {
			expect(getDescription(str())).toBeUndefined()
		})
	})

	describe('title', () => {
		test('returns MetaAction', () => {
			const action = title('Name')
			expect(isMetaAction(action)).toBe(true)
		})

		test('adds title via str()', () => {
			const validator = str(title('Name'))
			expect(validator('John')).toBe('John')
			expect(getTitle(validator)).toBe('Name')
		})

		test('getTitle returns undefined when not set', () => {
			expect(getTitle(str())).toBeUndefined()
		})
	})

	describe('examples', () => {
		test('returns MetaAction', () => {
			const action = examples(['hello', 'world'])
			expect(isMetaAction(action)).toBe(true)
		})

		test('adds examples via str()', () => {
			const validator = str(examples(['hello', 'world']))
			expect(validator('test')).toBe('test')
			expect(getExamples(validator)).toEqual(['hello', 'world'])
		})

		test('getExamples returns undefined when not set', () => {
			expect(getExamples(str())).toBeUndefined()
		})
	})

	describe('deprecated', () => {
		test('returns MetaAction', () => {
			const action = deprecated()
			expect(isMetaAction(action)).toBe(true)
		})

		test('adds deprecated flag', () => {
			const validator = str(deprecated())
			expect(getMetadata(validator)?.deprecated).toBe(true)
		})
	})

	describe('metadata', () => {
		test('returns MetaAction', () => {
			const action = metadata({ description: 'Test' })
			expect(isMetaAction(action)).toBe(true)
		})

		test('adds multiple metadata fields', () => {
			const validator = str(
				metadata({
					description: 'A string',
					title: 'String',
					examples: ['hello'],
				}),
			)
			expect(validator('hello')).toBe('hello')
			const meta = getMetadata(validator)
			expect(meta?.description).toBe('A string')
			expect(meta?.title).toBe('String')
			expect(meta?.examples).toEqual(['hello'])
		})
	})

	describe('combining MetaActions', () => {
		test('multiple MetaActions in str()', () => {
			const validator = str(min(1), description('Name'), title('User Name'))
			expect(validator('John')).toBe('John')
			expect(getDescription(validator)).toBe('Name')
			expect(getTitle(validator)).toBe('User Name')
		})

		test('multiple MetaActions in union()', () => {
			const validator = union(str(), num(), description('String or number'), title('Value'), examples(['hello', 42]))
			expect(validator('hello')).toBe('hello')
			expect(getDescription(validator)).toBe('String or number')
			expect(getTitle(validator)).toBe('Value')
			expect(getExamples(validator)).toEqual(['hello', 42])
		})

		test('later MetaActions override earlier ones', () => {
			const validator = str(description('First'), description('Second'))
			expect(getDescription(validator)).toBe('Second')
		})
	})
})

describe('Type-Affecting Functions', () => {
	describe('brand', () => {
		test('adds brand to validator', () => {
			const validateEmail = brand(str(email), 'Email')
			const result = validateEmail('test@example.com')
			expect(result as string).toBe('test@example.com')
			expect(getBrand(validateEmail)).toBe('Email')
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
			const withDesc = str(description('A string'))
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
			expect(getFlavor(validateUserId)).toBe('UserId')
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
			const withDesc = str(description('A string'))
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
})

describe('Complex Validators with MetaAction', () => {
	test('object with nested descriptions', () => {
		const userSchema = object(
			{
				name: str(description('User name')),
				age: num(int, description('User age')),
			},
			description('User object'),
		)
		expect(getDescription(userSchema)).toBe('User object')
		expect(userSchema({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
	})

	test('array with description', () => {
		const numbersSchema = array(num(), description('List of numbers'))
		expect(getDescription(numbersSchema)).toBe('List of numbers')
		expect(numbersSchema([1, 2, 3])).toEqual([1, 2, 3])
	})

	test('pipe with description', () => {
		// Demonstrates that str() with transforms works the same as pipe()
		const describedEmail = str(trim, lower, email, description('Valid email address'))
		expect(getDescription(describedEmail)).toBe('Valid email address')
		expect(describedEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com')
	})

	test('optional with description', () => {
		const optionalName = optional(str(description('Optional name field')))
		expect(optionalName(undefined)).toBeUndefined()
		expect(optionalName('John')).toBe('John')
	})

	test('constrained validators with description', () => {
		const nameValidator = str(min(2), description('Name must be at least 2 characters'))
		expect(getDescription(nameValidator)).toBe('Name must be at least 2 characters')
		expect(nameValidator('Jo')).toBe('Jo')
		expect(() => nameValidator('J')).toThrow()
	})
})

describe('Edge Cases', () => {
	test('empty string description', () => {
		const validator = str(description(''))
		expect(getDescription(validator)).toBe('')
	})

	test('description with special characters', () => {
		const validator = str(description('Description with "quotes" and \'apostrophes\''))
		expect(getDescription(validator)).toBe('Description with "quotes" and \'apostrophes\'')
	})

	test('description with unicode', () => {
		const validator = str(description('描述 📝 Описание'))
		expect(getDescription(validator)).toBe('描述 📝 Описание')
	})

	test('description with newlines', () => {
		const validator = str(description('Line 1\nLine 2\nLine 3'))
		expect(getDescription(validator)).toBe('Line 1\nLine 2\nLine 3')
	})

	test('very long description', () => {
		const longDesc = 'A'.repeat(10000)
		const validator = str(description(longDesc))
		expect(getDescription(validator)).toBe(longDesc)
	})
})

describe('Metadata Getter Functions', () => {
	test('getMetadata returns full metadata', () => {
		const validator = str(description('Test'), title('Title'))
		const meta = getMetadata(validator)
		expect(meta?.type).toBe('string')
		expect(meta?.description).toBe('Test')
		expect(meta?.title).toBe('Title')
	})

	test('getMetadata returns undefined for validators without metadata', () => {
		const customValidator = ((v: unknown) => v) as any
		expect(getMetadata(customValidator)).toBeUndefined()
	})

	test('str() has type metadata', () => {
		expect(getMetadata(str())?.type).toBe('string')
	})

	test('num() has type metadata', () => {
		expect(getMetadata(num())?.type).toBe('number')
	})
})

describe('Type Safety', () => {
	test('description preserves input/output types', () => {
		const validator = str(description('A string'))
		const result: string = validator('test')
		expect(result).toBe('test')
	})

	test('brand adds type brand', () => {
		type Email = string & { __brand: 'Email' }
		const validateEmail = brand(str(email), 'Email')
		const result: Email = validateEmail('test@example.com')
		expect(result).toBe('test@example.com')
	})

	test('flavor adds optional flavor type', () => {
		type UserId = string & { __flavor?: 'UserId' }
		const validateUserId = flavor(str(), 'UserId')
		const result: UserId = validateUserId('123')
		expect(result).toBe('123')
	})

	test('readonly makes output readonly', () => {
		const validator = readonly(
			object({
				name: str(),
			}),
		)
		const result: Readonly<{ name: string }> = validator({ name: 'John' })
		expect(result.name).toBe('John')
	})
})

describe('applyMetaActionsToValidator', () => {
	const { applyMetaActionsToValidator } = require('./metadata')

	test('returns validator unchanged when no actions', () => {
		const validator = str()
		const result = applyMetaActionsToValidator(validator, [])
		expect(result).toBe(validator)
	})

	test('applies actions when validator has existing metadata', () => {
		const validator = str(description('Original'))
		const result = applyMetaActionsToValidator(validator, [title('Title')])
		expect(result).toBe(validator)
		expect(getTitle(result)).toBe('Title')
	})

	test('does nothing when validator has no metadata', () => {
		// Create a plain function with no metadata
		const plainValidator = ((v: unknown) => v) as any
		const result = applyMetaActionsToValidator(plainValidator, [description('Test')])
		expect(result).toBe(plainValidator)
		// No error thrown, just returns as-is
	})
})
