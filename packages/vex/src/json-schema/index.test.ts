// @ts-nocheck
import { beforeEach, describe, expect, test } from 'bun:test'
import { getMeta } from '../core'
import { literal } from '../validators/literal'
import { arr, bigInt, bool, date, num, obj, str } from '../validators/primitives'
import { any, never, nullType, unknown, voidType } from '../validators/special'
import { addGlobalDefs, clearGlobalDefs, getGlobalDefs, toJsonSchema, toJsonSchemaDefs } from './index'

describe('toJsonSchema', () => {
	describe('primitive types', () => {
		test('converts string schema', () => {
			const result = toJsonSchema(str())
			expect(result.type).toBe('string')
			expect(result.$schema).toBe('http://json-schema.org/draft-07/schema#')
		})

		test('converts number schema', () => {
			const result = toJsonSchema(num())
			expect(result.type).toBe('number')
		})

		test('converts boolean schema', () => {
			const result = toJsonSchema(bool())
			expect(result.type).toBe('boolean')
		})

		test('converts bigint schema', () => {
			const result = toJsonSchema(bigInt())
			expect(result.type).toBe('integer')
		})

		test('converts date schema', () => {
			const result = toJsonSchema(date())
			expect(result.type).toBe('string')
			expect(result.format).toBe('date-time')
		})

		test('converts array schema', () => {
			const result = toJsonSchema(arr())
			expect(result.type).toBe('array')
		})

		test('converts object schema', () => {
			const result = toJsonSchema(obj())
			expect(result.type).toBe('object')
		})
	})

	describe('special types', () => {
		test('converts any schema to empty object', () => {
			const result = toJsonSchema(any)
			expect(result.type).toBeUndefined()
		})

		test('converts unknown schema to empty object', () => {
			const result = toJsonSchema(unknown)
			expect(result.type).toBeUndefined()
		})

		test('converts never schema', () => {
			const result = toJsonSchema(never)
			expect(result.not).toEqual({})
		})

		test('converts null schema', () => {
			const result = toJsonSchema(nullType)
			expect(result.type).toBe('null')
		})

		test('converts void schema', () => {
			const result = toJsonSchema(voidType)
			expect(result.type).toBe('null')
		})
	})

	describe('options', () => {
		test('includes $schema by default', () => {
			const result = toJsonSchema(str())
			expect(result.$schema).toBeDefined()
		})

		test('excludes $schema when disabled', () => {
			const result = toJsonSchema(str(), { $schema: false })
			expect(result.$schema).toBeUndefined()
		})

		test('uses draft-07 by default', () => {
			const result = toJsonSchema(str())
			expect(result.$schema).toBe('http://json-schema.org/draft-07/schema#')
		})

		test('uses draft-2019-09 when specified', () => {
			const result = toJsonSchema(str(), { draft: 'draft-2019-09' })
			expect(result.$schema).toBe('https://json-schema.org/draft/2019-09/schema')
		})

		test('uses draft-2020-12 when specified', () => {
			const result = toJsonSchema(str(), { draft: 'draft-2020-12' })
			expect(result.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
		})
	})

	describe('definitions', () => {
		test('includes definitions when provided', () => {
			const result = toJsonSchema(str(), {
				definitions: {
					Email: str(),
					Age: num(),
				},
			})
			expect(result.$defs).toBeDefined()
			expect(result.$defs?.Email).toEqual({ type: 'string' })
			expect(result.$defs?.Age).toEqual({ type: 'number' })
		})

		test('does not include $defs when empty', () => {
			const result = toJsonSchema(str(), { definitions: {} })
			expect(result.$defs).toBeUndefined()
		})
	})

	describe('schema metadata', () => {
		test('str() has schema metadata', () => {
			const meta = getMeta(str())
			expect(meta).toBeDefined()
			expect(meta?.type).toBe('string')
		})

		test('num() has schema metadata', () => {
			const meta = getMeta(num())
			expect(meta).toBeDefined()
			expect(meta?.type).toBe('number')
		})

		test('bool() has schema metadata', () => {
			const meta = getMeta(bool())
			expect(meta).toBeDefined()
			expect(meta?.type).toBe('boolean')
		})
	})
})

describe('toJsonSchemaDefs', () => {
	test('converts multiple schemas to definitions', () => {
		const defs = toJsonSchemaDefs({
			String: str(),
			Number: num(),
			Boolean: bool(),
		})
		expect(defs.String).toEqual({ type: 'string' })
		expect(defs.Number).toEqual({ type: 'number' })
		expect(defs.Boolean).toEqual({ type: 'boolean' })
	})

	test('returns empty object for empty input', () => {
		const defs = toJsonSchemaDefs({})
		expect(defs).toEqual({})
	})
})

describe('global definitions', () => {
	beforeEach(() => {
		clearGlobalDefs()
	})

	test('addGlobalDefs adds definitions', () => {
		addGlobalDefs({ Email: str() })
		const defs = getGlobalDefs()
		expect(defs).toBeDefined()
		expect(defs?.Email).toBeDefined()
	})

	test('addGlobalDefs merges with existing', () => {
		addGlobalDefs({ Email: str() })
		addGlobalDefs({ Age: num() })
		const defs = getGlobalDefs()
		expect(defs?.Email).toBeDefined()
		expect(defs?.Age).toBeDefined()
	})

	test('clearGlobalDefs removes all definitions', () => {
		addGlobalDefs({ Email: str() })
		clearGlobalDefs()
		const defs = getGlobalDefs()
		expect(defs).toBeNull()
	})

	test('getGlobalDefs returns null when empty', () => {
		const defs = getGlobalDefs()
		expect(defs).toBeNull()
	})
})

describe('complex schemas', () => {
	test('converts literal schema', () => {
		const schema = literal('hello')
		const result = toJsonSchema(schema, { $schema: false })
		// Literal may not have metadata yet, but should not throw
		expect(result).toBeDefined()
	})

	test('handles schema without metadata gracefully', () => {
		const customValidator = ((v: unknown) => v) as any
		const result = toJsonSchema(customValidator, { $schema: false })
		// Should return empty schema or inferred schema
		expect(result).toBeDefined()
	})

	test('literal type without value returns empty object', () => {
		const { setMeta, addStandardSchema } = require('../core')
		const validator = ((v: unknown) => v) as any
		setMeta(validator, { type: 'literal', constraints: {} })
		addStandardSchema(validator)
		const result = toJsonSchema(validator, { $schema: false })
		expect(result).toEqual({})
	})
})

describe('string format validators', () => {
	test('email has format metadata', () => {
		const { email } = require('../validators/string')
		const meta = getMeta(email)
		expect(meta?.type).toBe('email')
		expect(meta?.constraints?.format).toBe('email')
	})

	test('url has format metadata', () => {
		const { url } = require('../validators/string')
		const meta = getMeta(url)
		expect(meta?.type).toBe('url')
		expect(meta?.constraints?.format).toBe('uri')
	})

	test('uuid has format metadata', () => {
		const { uuid } = require('../validators/string')
		const meta = getMeta(uuid)
		expect(meta?.type).toBe('uuid')
		expect(meta?.constraints?.format).toBe('uuid')
	})

	test('datetime has format metadata', () => {
		const { datetime } = require('../validators/string')
		const meta = getMeta(datetime)
		expect(meta?.type).toBe('datetime')
		expect(meta?.constraints?.format).toBe('date-time')
	})

	test('dateOnly has format metadata', () => {
		const { dateOnly } = require('../validators/string')
		const meta = getMeta(dateOnly)
		expect(meta?.type).toBe('isoDate')
		expect(meta?.constraints?.format).toBe('date')
	})

	test('time has format metadata', () => {
		const { time } = require('../validators/string')
		const meta = getMeta(time)
		expect(meta?.type).toBe('isoTime')
		expect(meta?.constraints?.format).toBe('time')
	})

	test('ipv4 has format metadata', () => {
		const { ipv4 } = require('../validators/string')
		const meta = getMeta(ipv4)
		expect(meta?.type).toBe('ipv4')
		expect(meta?.constraints?.format).toBe('ipv4')
	})

	test('ipv6 has format metadata', () => {
		const { ipv6 } = require('../validators/string')
		const meta = getMeta(ipv6)
		expect(meta?.type).toBe('ipv6')
		expect(meta?.constraints?.format).toBe('ipv6')
	})
})

describe('string length validators', () => {
	test('min has minLength metadata', () => {
		const { min } = require('../validators/string')
		const minValidator = min(5)
		const meta = getMeta(minValidator)
		expect(meta?.type).toBe('minLength')
		expect(meta?.constraints?.minLength).toBe(5)
	})

	test('max has maxLength metadata', () => {
		const { max } = require('../validators/string')
		const maxValidator = max(10)
		const meta = getMeta(maxValidator)
		expect(meta?.type).toBe('maxLength')
		expect(meta?.constraints?.maxLength).toBe(10)
	})

	test('len has length metadata', () => {
		const { len } = require('../validators/string')
		const lenValidator = len(8)
		const meta = getMeta(lenValidator)
		expect(meta?.type).toBe('length')
		expect(meta?.constraints?.length).toBe(8)
	})

	test('nonempty has minLength 1 metadata', () => {
		const { nonempty } = require('../validators/string')
		const meta = getMeta(nonempty)
		expect(meta?.type).toBe('minLength')
		expect(meta?.constraints?.minLength).toBe(1)
	})
})

describe('edge cases', () => {
	test('handles undefined constraints gracefully', () => {
		const result = toJsonSchema(str(), { $schema: false })
		expect(result).toEqual({ type: 'string' })
	})

	test('handles empty options object', () => {
		const result = toJsonSchema(str(), {})
		expect(result.$schema).toBeDefined()
	})

	test('preserves type for all primitives', () => {
		expect(toJsonSchema(str(), { $schema: false }).type).toBe('string')
		expect(toJsonSchema(num(), { $schema: false }).type).toBe('number')
		expect(toJsonSchema(bool(), { $schema: false }).type).toBe('boolean')
	})
})

describe('complex type conversions', () => {
	const { array, tuple, object, record, set, map, nullable, optional, union, intersect, lazy, pipe } = require('..')
	const { setMeta, getMeta, addStandardSchema } = require('../core')

	describe('integer type', () => {
		test('converts integer metadata type', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'integer', constraints: { minimum: 0 } })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('integer')
			expect(result.minimum).toBe(0)
		})
	})

	describe('array conversion', () => {
		test('converts array with items', () => {
			const result = toJsonSchema(array(str()), { $schema: false })
			expect(result.type).toBe('array')
			expect(result.items).toEqual({ type: 'string' })
		})

		test('array with minItems constraint', () => {
			const arr = array(num())
			const meta = getMeta(arr)
			if (meta) {
				meta.constraints = { ...meta.constraints, minItems: 1 }
				setMeta(arr, meta)
			}
			const result = toJsonSchema(arr, { $schema: false })
			expect(result.minItems).toBe(1)
		})

		test('array with maxItems constraint', () => {
			const arr = array(num())
			const meta = getMeta(arr)
			if (meta) {
				meta.constraints = { ...meta.constraints, maxItems: 10 }
				setMeta(arr, meta)
			}
			const result = toJsonSchema(arr, { $schema: false })
			expect(result.maxItems).toBe(10)
		})

		test('array with length constraint', () => {
			const arr = array(num())
			const meta = getMeta(arr)
			if (meta) {
				meta.constraints = { ...meta.constraints, length: 5 }
				setMeta(arr, meta)
			}
			const result = toJsonSchema(arr, { $schema: false })
			expect(result.minItems).toBe(5)
			expect(result.maxItems).toBe(5)
		})

		test('array with uniqueItems constraint', () => {
			const arr = array(num())
			const meta = getMeta(arr)
			if (meta) {
				meta.constraints = { ...meta.constraints, uniqueItems: true }
				setMeta(arr, meta)
			}
			const result = toJsonSchema(arr, { $schema: false })
			expect(result.uniqueItems).toBe(true)
		})
	})

	describe('tuple conversion', () => {
		test('converts tuple with items', () => {
			const result = toJsonSchema(tuple(str(), num(), bool()), { $schema: false })
			expect(result.type).toBe('array')
			expect(Array.isArray(result.items)).toBe(true)
			expect((result.items as any[]).length).toBe(3)
			expect(result.minItems).toBe(3)
			expect(result.maxItems).toBe(3)
		})

		test('tuple without items', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'tuple' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('array')
		})
	})

	describe('record conversion', () => {
		test('converts record with value type', () => {
			const result = toJsonSchema(record(str(), num()), { $schema: false })
			expect(result.type).toBe('object')
			expect(result.additionalProperties).toEqual({ type: 'number' })
		})

		test('record without value schema', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'record' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('object')
		})
	})

	describe('map conversion', () => {
		test('converts map to object', () => {
			const result = toJsonSchema(map(str(), num()), { $schema: false })
			expect(result.type).toBe('object')
		})
	})

	describe('set conversion', () => {
		test('converts set with items', () => {
			const result = toJsonSchema(set(str()), { $schema: false })
			expect(result.type).toBe('array')
			expect(result.uniqueItems).toBe(true)
			expect(result.items).toEqual({ type: 'string' })
		})

		test('set with size constraints', () => {
			const s = set(num())
			const meta = getMeta(s)
			if (meta) {
				meta.constraints = { ...meta.constraints, minSize: 1, maxSize: 10 }
				setMeta(s, meta)
			}
			const result = toJsonSchema(s, { $schema: false })
			expect(result.minItems).toBe(1)
			expect(result.maxItems).toBe(10)
		})

		test('set without items', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'set' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('array')
			expect(result.uniqueItems).toBe(true)
		})
	})

	describe('union conversion', () => {
		test('converts union with options', () => {
			const result = toJsonSchema(union(str(), num()), { $schema: false })
			expect(result.anyOf).toBeDefined()
			expect(result.anyOf?.length).toBe(2)
		})

		test('empty union', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'union', inner: [] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})

		test('union without inner', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'union' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})
	})

	describe('intersect conversion', () => {
		test('converts intersect with schemas', () => {
			const result = toJsonSchema(intersect(object({ a: str() }), object({ b: num() })), { $schema: false })
			expect(result.allOf).toBeDefined()
			expect(result.allOf?.length).toBe(2)
		})

		test('empty intersect', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'intersect', inner: [] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})

		test('intersect without inner', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'intersect' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})
	})

	describe('nullable conversion', () => {
		test('converts nullable string', () => {
			const result = toJsonSchema(nullable(str()), { $schema: false })
			expect(result.type).toEqual(['string', 'null'])
		})

		test('nullable without inner', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'nullable' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('null')
		})

		test('nullable with array type inner', () => {
			const innerValidator = ((v: unknown) => v) as any
			setMeta(innerValidator, { type: 'array' })
			addStandardSchema(innerValidator)

			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'nullable', inner: innerValidator })
			addStandardSchema(validator)

			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toEqual(['array', 'null'])
		})

		test('nullable with no-type inner uses anyOf', () => {
			const innerValidator = ((v: unknown) => v) as any
			setMeta(innerValidator, { type: 'any' }) // 'any' produces no type
			addStandardSchema(innerValidator)

			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'nullable', inner: innerValidator })
			addStandardSchema(validator)

			const result = toJsonSchema(validator, { $schema: false })
			expect(result.anyOf).toBeDefined()
		})
	})

	describe('optional conversion', () => {
		test('converts optional with inner', () => {
			const result = toJsonSchema(optional(str()), { $schema: false })
			expect(result.type).toBe('string')
		})

		test('optional without inner', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'optional' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})
	})

	describe('lazy conversion', () => {
		test('converts lazy schema', () => {
			const result = toJsonSchema(
				lazy(() => str()),
				{ $schema: false },
			)
			expect(result.type).toBe('string')
		})

		test('lazy without inner', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'lazy' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})
	})

	describe('enum conversion', () => {
		test('converts enum with values', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'enum', constraints: { values: ['a', 'b', 'c'] } })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.enum).toEqual(['a', 'b', 'c'])
		})

		test('enum without values', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'enum', constraints: {} })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.enum).toBeUndefined()
		})
	})

	describe('pipe conversion', () => {
		test('converts pipe with base schema', () => {
			const result = toJsonSchema(pipe(str()), { $schema: false })
			expect(result.type).toBe('string')
		})

		test('pipe without inner', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})

		test('pipe with empty inner array', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})

		test('pipe applies constraints from subsequent validators', () => {
			const base = str()
			const minValidator = ((v: string) => v) as any
			setMeta(minValidator, { type: 'min', constraints: { value: 5 } })
			addStandardSchema(minValidator)

			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [base, minValidator] })
			addStandardSchema(validator)

			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('string')
			expect(result.minLength).toBe(5)
		})
	})

	describe('object with properties', () => {
		test('object with required and optional properties', () => {
			const result = toJsonSchema(
				object({
					name: str(),
					age: optional(num()),
				}),
				{ $schema: false },
			)
			expect(result.type).toBe('object')
			expect(result.properties?.name).toEqual({ type: 'string' })
			expect(result.properties?.age).toEqual({ type: 'number' })
			expect(result.required).toEqual(['name'])
		})

		test('object with additionalProperties constraint', () => {
			const obj = object({ name: str() })
			const meta = getMeta(obj)
			if (meta) {
				meta.constraints = { ...meta.constraints, additionalProperties: false }
				setMeta(obj, meta)
			}
			const result = toJsonSchema(obj, { $schema: false })
			expect(result.additionalProperties).toBe(false)
		})

		test('object with minProperties constraint', () => {
			const obj = object({ name: str() })
			const meta = getMeta(obj)
			if (meta) {
				meta.constraints = { ...meta.constraints, minProperties: 1 }
				setMeta(obj, meta)
			}
			const result = toJsonSchema(obj, { $schema: false })
			expect(result.minProperties).toBe(1)
		})

		test('object with maxProperties constraint', () => {
			const obj = object({ name: str() })
			const meta = getMeta(obj)
			if (meta) {
				meta.constraints = { ...meta.constraints, maxProperties: 10 }
				setMeta(obj, meta)
			}
			const result = toJsonSchema(obj, { $schema: false })
			expect(result.maxProperties).toBe(10)
		})

		test('object with no required properties', () => {
			const result = toJsonSchema(object({ name: optional(str()) }), { $schema: false })
			expect(result.required).toBeUndefined()
		})
	})

	describe('undefined type', () => {
		test('converts undefined to null', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'undefined' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('null')
		})
	})

	describe('unknown type fallthrough', () => {
		test('unknown type returns empty schema', () => {
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'customUnknownType' })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})
	})

	describe('metadata transfer', () => {
		// Note: These tests use fresh mock validators to avoid mutating the shared singleton.
		// Using str() and then setMeta() would corrupt the singleton for other tests.

		test('transfers description', () => {
			const s = ((v: unknown) => v) as any
			setMeta(s, { type: 'string', description: 'A string field' })
			addStandardSchema(s)
			const result = toJsonSchema(s, { $schema: false })
			expect(result.description).toBe('A string field')
		})

		test('transfers title', () => {
			const s = ((v: unknown) => v) as any
			setMeta(s, { type: 'string', title: 'String Field' })
			addStandardSchema(s)
			const result = toJsonSchema(s, { $schema: false })
			expect(result.title).toBe('String Field')
		})

		test('transfers examples', () => {
			const s = ((v: unknown) => v) as any
			setMeta(s, { type: 'string', examples: ['hello', 'world'] })
			addStandardSchema(s)
			const result = toJsonSchema(s, { $schema: false })
			expect(result.examples).toEqual(['hello', 'world'])
		})

		test('transfers default', () => {
			const s = ((v: unknown) => v) as any
			setMeta(s, { type: 'string', default: 'default value' })
			addStandardSchema(s)
			const result = toJsonSchema(s, { $schema: false })
			expect(result.default).toBe('default value')
		})

		test('transfers deprecated', () => {
			const s = ((v: unknown) => v) as any
			setMeta(s, { type: 'string', deprecated: true })
			addStandardSchema(s)
			const result = toJsonSchema(s, { $schema: false })
			expect(result.deprecated).toBe(true)
		})

		test('transfers readonly', () => {
			const s = ((v: unknown) => v) as any
			setMeta(s, { type: 'string', readonly: true })
			addStandardSchema(s)
			const result = toJsonSchema(s, { $schema: false })
			expect(result.readOnly).toBe(true)
		})
	})

	describe('inferSchema function', () => {
		test('infers string from function name', () => {
			const validator = function stringValidator(v: unknown) {
				return v
			} as any
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('string')
		})

		test('infers number from function name', () => {
			const validator = function numberValidator(v: unknown) {
				return v
			} as any
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('number')
		})

		test('infers boolean from function name', () => {
			const validator = function booleanValidator(v: unknown) {
				return v
			} as any
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('boolean')
		})

		test('infers null from function name', () => {
			const validator = function nullValidator(v: unknown) {
				return v
			} as any
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('null')
		})

		test('infers array from function name', () => {
			const validator = function arrayValidator(v: unknown) {
				return v
			} as any
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('array')
		})

		test('infers Array (capitalized) from function body', () => {
			const validator = function checkArray(v: unknown) {
				return Array.isArray(v) ? v : []
			} as any
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('array')
		})

		test('infers object from function name', () => {
			const validator = function objectValidator(v: unknown) {
				return v
			} as any
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('object')
		})

		test('returns empty for unknown function', () => {
			const validator = function xyz(v: unknown) {
				return v
			} as any
			const result = toJsonSchema(validator, { $schema: false })
			expect(result).toEqual({})
		})
	})

	describe('convertConstraints function', () => {
		// Test each constraint type conversion
		// Note: convertConstraints is only called when meta.constraints exists,
		// so we always need to include a constraints object

		test('min constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'min', constraints: { value: 3 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.minLength).toBe(3)
		})

		test('max constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'max', constraints: { value: 50 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.maxLength).toBe(50)
		})

		test('length constraint via pipe', () => {
			const inner = str()
			setMeta(inner, { type: 'length', constraints: { value: 10 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.minLength).toBe(10)
			expect(result.maxLength).toBe(10)
		})

		test('length constraint on string schema directly', () => {
			// Test convertString's length handling
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'string', constraints: { length: 15 } })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('string')
			expect(result.minLength).toBe(15)
			expect(result.maxLength).toBe(15)
		})

		test('email constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'email', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('email')
		})

		test('url constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'url', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('uri')
		})

		test('uuid constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'uuid', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('uuid')
		})

		test('datetime constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'datetime', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('date-time')
		})

		test('isoDateTime constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'isoDateTime', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('date-time')
		})

		test('date constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'isoDate', constraints: {} }) // Use isoDate for format: date
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('date')
		})

		test('time constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'time', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('time')
		})

		test('isoTime constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'isoTime', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('time')
		})

		test('ipv4 constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'ipv4', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('ipv4')
		})

		test('ipv6 constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'ipv6', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.format).toBe('ipv6')
		})

		test('regex constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'regex', constraints: { pattern: '^[a-z]+$' } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.pattern).toBe('^[a-z]+$')
		})

		test('pattern constraint', () => {
			const inner = str()
			setMeta(inner, { type: 'pattern', constraints: { pattern: '^[A-Z]+$' } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [str(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.pattern).toBe('^[A-Z]+$')
		})

		test('gte constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'gte', constraints: { value: 0 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.minimum).toBe(0)
		})

		test('minimum constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'minimum', constraints: { value: 10 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.minimum).toBe(10)
		})

		test('gt constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'gt', constraints: { value: 0 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.exclusiveMinimum).toBe(0)
		})

		test('exclusiveMinimum constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'exclusiveMinimum', constraints: { value: 5 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.exclusiveMinimum).toBe(5)
		})

		test('lte constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'lte', constraints: { value: 100 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.maximum).toBe(100)
		})

		test('maximum constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'maximum', constraints: { value: 50 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.maximum).toBe(50)
		})

		test('lt constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'lt', constraints: { value: 100 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.exclusiveMaximum).toBe(100)
		})

		test('exclusiveMaximum constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'exclusiveMaximum', constraints: { value: 95 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.exclusiveMaximum).toBe(95)
		})

		test('multipleOf constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'multipleOf', constraints: { value: 5 } })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.multipleOf).toBe(5)
		})

		test('integer constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'integer', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('integer')
		})

		test('int constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'int', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('integer')
		})

		test('positive constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'positive', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.exclusiveMinimum).toBe(0)
		})

		test('negative constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'negative', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.exclusiveMaximum).toBe(0)
		})

		test('nonnegative constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'nonnegative', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.minimum).toBe(0)
		})

		test('nonpositive constraint', () => {
			const inner = num()
			setMeta(inner, { type: 'nonpositive', constraints: {} })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [num(), inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.maximum).toBe(0)
		})

		test('unknown constraint returns empty', () => {
			// Create a separate validator for the unknown constraint (don't mutate num() singleton)
			const unknownConstraint = ((v: unknown) => v) as any
			setMeta(unknownConstraint, { type: 'unknownConstraintType', constraints: {} })

			// Create a base number validator for the pipe
			const baseNum = ((v: unknown) => v) as any
			setMeta(baseNum, { type: 'number' })
			addStandardSchema(baseNum)

			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [baseNum, unknownConstraint] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.type).toBe('number')
		})

		test('minLength constraint', () => {
			// Create a fresh validator to avoid mutating shared singleton
			const inner = ((v: unknown) => v) as any
			setMeta(inner, { type: 'minLength', constraints: { value: 5 } })
			const baseStr = ((v: unknown) => v) as any
			setMeta(baseStr, { type: 'string' })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [baseStr, inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.minLength).toBe(5)
		})

		test('maxLength constraint', () => {
			// Create a fresh validator to avoid mutating shared singleton
			const inner = ((v: unknown) => v) as any
			setMeta(inner, { type: 'maxLength', constraints: { value: 100 } })
			const baseStr = ((v: unknown) => v) as any
			setMeta(baseStr, { type: 'string' })
			const validator = ((v: unknown) => v) as any
			setMeta(validator, { type: 'pipe', inner: [baseStr, inner] })
			addStandardSchema(validator)
			const result = toJsonSchema(validator, { $schema: false })
			expect(result.maxLength).toBe(100)
		})
	})
})
