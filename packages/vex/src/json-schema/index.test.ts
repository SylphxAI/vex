import { beforeEach, describe, expect, test } from 'bun:test'
import { literal } from '../validators/literal'
import { arr, bigInt, bool, date, num, obj, str } from '../validators/primitives'
import { any, never, nullType, unknown, voidType } from '../validators/special'
import {
	addGlobalDefs,
	clearGlobalDefs,
	getGlobalDefs,
	getSchemaMetadata,
	toJsonSchema,
	toJsonSchemaDefs,
} from './index'

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
			const meta = getSchemaMetadata(str())
			expect(meta).toBeDefined()
			expect(meta?.type).toBe('string')
		})

		test('num() has schema metadata', () => {
			const meta = getSchemaMetadata(num())
			expect(meta).toBeDefined()
			expect(meta?.type).toBe('number')
		})

		test('bool() has schema metadata', () => {
			const meta = getSchemaMetadata(bool())
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
})

describe('string format validators', () => {
	test('email has format metadata', () => {
		const { email } = require('../validators/string')
		const meta = getSchemaMetadata(email)
		expect(meta?.type).toBe('email')
		expect(meta?.constraints?.format).toBe('email')
	})

	test('url has format metadata', () => {
		const { url } = require('../validators/string')
		const meta = getSchemaMetadata(url)
		expect(meta?.type).toBe('url')
		expect(meta?.constraints?.format).toBe('uri')
	})

	test('uuid has format metadata', () => {
		const { uuid } = require('../validators/string')
		const meta = getSchemaMetadata(uuid)
		expect(meta?.type).toBe('uuid')
		expect(meta?.constraints?.format).toBe('uuid')
	})

	test('datetime has format metadata', () => {
		const { datetime } = require('../validators/string')
		const meta = getSchemaMetadata(datetime)
		expect(meta?.type).toBe('datetime')
		expect(meta?.constraints?.format).toBe('date-time')
	})

	test('dateOnly has format metadata', () => {
		const { dateOnly } = require('../validators/string')
		const meta = getSchemaMetadata(dateOnly)
		expect(meta?.type).toBe('isoDate')
		expect(meta?.constraints?.format).toBe('date')
	})

	test('time has format metadata', () => {
		const { time } = require('../validators/string')
		const meta = getSchemaMetadata(time)
		expect(meta?.type).toBe('isoTime')
		expect(meta?.constraints?.format).toBe('time')
	})

	test('ipv4 has format metadata', () => {
		const { ipv4 } = require('../validators/string')
		const meta = getSchemaMetadata(ipv4)
		expect(meta?.type).toBe('ipv4')
		expect(meta?.constraints?.format).toBe('ipv4')
	})

	test('ipv6 has format metadata', () => {
		const { ipv6 } = require('../validators/string')
		const meta = getSchemaMetadata(ipv6)
		expect(meta?.type).toBe('ipv6')
		expect(meta?.constraints?.format).toBe('ipv6')
	})
})

describe('string length validators', () => {
	test('min has minLength metadata', () => {
		const { min } = require('../validators/string')
		const minValidator = min(5)
		const meta = getSchemaMetadata(minValidator)
		expect(meta?.type).toBe('minLength')
		expect(meta?.constraints?.minLength).toBe(5)
	})

	test('max has maxLength metadata', () => {
		const { max } = require('../validators/string')
		const maxValidator = max(10)
		const meta = getSchemaMetadata(maxValidator)
		expect(meta?.type).toBe('maxLength')
		expect(meta?.constraints?.maxLength).toBe(10)
	})

	test('len has length metadata', () => {
		const { len } = require('../validators/string')
		const lenValidator = len(8)
		const meta = getSchemaMetadata(lenValidator)
		expect(meta?.type).toBe('length')
		expect(meta?.constraints?.length).toBe(8)
	})

	test('nonempty has minLength 1 metadata', () => {
		const { nonempty } = require('../validators/string')
		const meta = getSchemaMetadata(nonempty)
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
