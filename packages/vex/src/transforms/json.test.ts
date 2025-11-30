import { describe, expect, test } from 'bun:test'
import { pipe } from '../composition/pipe'
import { array, object } from '../schemas'
import { num, str } from '../validators/primitives'
import { parseJson, parseJsonWith, stringifyJson, stringifyJsonWith } from './json'

describe('JSON Transforms', () => {
	describe('parseJson', () => {
		test('parses valid JSON object', () => {
			expect(parseJson('{"a":1}')).toEqual({ a: 1 })
			expect(parseJson('{"name":"John","age":30}')).toEqual({ name: 'John', age: 30 })
		})

		test('parses valid JSON array', () => {
			expect(parseJson('[1,2,3]')).toEqual([1, 2, 3])
			expect(parseJson('[]')).toEqual([])
			expect(parseJson('[[1,2],[3,4]]')).toEqual([
				[1, 2],
				[3, 4],
			])
		})

		test('parses JSON string', () => {
			expect(parseJson('"hello"')).toBe('hello')
			expect(parseJson('""')).toBe('')
			expect(parseJson('"line1\\nline2"')).toBe('line1\nline2')
		})

		test('parses JSON number', () => {
			expect(parseJson('123')).toBe(123)
			expect(parseJson('3.14')).toBe(3.14)
			expect(parseJson('-42')).toBe(-42)
			expect(parseJson('0')).toBe(0)
		})

		test('parses JSON boolean', () => {
			expect(parseJson('true')).toBe(true)
			expect(parseJson('false')).toBe(false)
		})

		test('parses JSON null', () => {
			expect(parseJson('null')).toBe(null)
		})

		test('parses nested objects', () => {
			const nested = '{"a":{"b":{"c":1}}}'
			expect(parseJson(nested)).toEqual({ a: { b: { c: 1 } } })
		})

		test('parses mixed array types', () => {
			expect(parseJson('[1,"two",true,null]')).toEqual([1, 'two', true, null])
		})

		test('parses escaped characters', () => {
			expect(parseJson('"hello\\tworld"')).toBe('hello\tworld')
			expect(parseJson('"quote: \\"test\\""')).toBe('quote: "test"')
		})

		test('parses unicode in strings', () => {
			expect(parseJson('"\\u0041"')).toBe('A')
			expect(parseJson('"你好"')).toBe('你好')
		})

		test('throws on invalid JSON', () => {
			expect(() => parseJson('{')).toThrow('Invalid JSON')
			expect(() => parseJson('}')).toThrow('Invalid JSON')
			expect(() => parseJson('[')).toThrow('Invalid JSON')
		})

		test('throws on undefined keyword', () => {
			expect(() => parseJson('undefined')).toThrow('Invalid JSON')
		})

		test('throws on empty string', () => {
			expect(() => parseJson('')).toThrow('Invalid JSON')
		})

		test('throws on trailing comma', () => {
			expect(() => parseJson('[1,2,3,]')).toThrow('Invalid JSON')
			expect(() => parseJson('{"a":1,}')).toThrow('Invalid JSON')
		})

		test('throws on single quotes', () => {
			expect(() => parseJson("{'a':1}")).toThrow('Invalid JSON')
		})

		test('throws on unquoted keys', () => {
			expect(() => parseJson('{a:1}')).toThrow('Invalid JSON')
		})

		test('safe version returns success', () => {
			expect(parseJson.safe!('{"a":1}')).toEqual({ ok: true, value: { a: 1 } })
			expect(parseJson.safe!('[1,2,3]')).toEqual({ ok: true, value: [1, 2, 3] })
			expect(parseJson.safe!('"hello"')).toEqual({ ok: true, value: 'hello' })
		})

		test('safe version returns error', () => {
			expect(parseJson.safe!('{')).toEqual({ ok: false, error: 'Invalid JSON' })
			expect(parseJson.safe!('')).toEqual({ ok: false, error: 'Invalid JSON' })
		})

		test('Standard Schema support', () => {
			expect(parseJson['~standard']).toBeDefined()
			expect(parseJson['~standard']!.version).toBe(1)
			expect(parseJson['~standard']!.vendor).toBe('vex')
		})

		test('Standard Schema validate success', () => {
			expect(parseJson['~standard']!.validate('{"a":1}')).toEqual({ value: { a: 1 } })
		})

		test('Standard Schema validate failure', () => {
			const result = parseJson['~standard']!.validate('{')
			expect(result.issues![0].message).toBe('Invalid JSON')
		})

		test('works in pipe', () => {
			const validate = str(parseJson)
			expect(validate('{"key":"value"}')).toEqual({ key: 'value' })
		})
	})

	describe('parseJsonWith', () => {
		const userSchema = object({ name: str(), age: num() })

		test('parses and validates JSON', () => {
			const result = parseJsonWith(userSchema)('{"name":"John","age":30}')
			expect(result).toEqual({ name: 'John', age: 30 })
		})

		test('parses and validates array schema', () => {
			const arraySchema = array(num())
			const result = parseJsonWith(arraySchema)('[1,2,3]')
			expect(result).toEqual([1, 2, 3])
		})

		test('parses and validates string schema', () => {
			const result = parseJsonWith(str())('"hello"')
			expect(result).toBe('hello')
		})

		test('parses and validates number schema', () => {
			const result = parseJsonWith(num())('42')
			expect(result).toBe(42)
		})

		test('throws on invalid JSON', () => {
			expect(() => parseJsonWith(userSchema)('{')).toThrow('Invalid JSON')
			expect(() => parseJsonWith(userSchema)('')).toThrow('Invalid JSON')
		})

		test('throws on schema validation failure', () => {
			expect(() => parseJsonWith(userSchema)('{"name":"John"}')).toThrow()
			expect(() => parseJsonWith(userSchema)('{"name":123,"age":30}')).toThrow()
		})

		test('safe version returns success', () => {
			const result = parseJsonWith(userSchema).safe!('{"name":"John","age":30}')
			expect(result).toEqual({ ok: true, value: { name: 'John', age: 30 } })
		})

		test('safe version returns error on invalid JSON', () => {
			const result = parseJsonWith(userSchema).safe!('{')
			expect(result).toEqual({ ok: false, error: 'Invalid JSON' })
		})

		test('safe version returns error on schema failure', () => {
			const result = parseJsonWith(userSchema).safe!('{"name":"John"}')
			expect(result.ok).toBe(false)
		})

		test('safe falls back to try-catch when schema has no safe', () => {
			const noSafe = ((v: unknown) => {
				const obj = v as { name: string }
				if (!obj.name) throw new Error('Missing name')
				return obj
			}) as any
			const validator = parseJsonWith(noSafe)
			expect(validator.safe!('{"name":"John"}')).toEqual({ ok: true, value: { name: 'John' } })
			expect(validator.safe!('{}')).toEqual({ ok: false, error: 'Missing name' })
		})

		test('safe handles non-Error exception in schema', () => {
			const throwsNonError = ((_v: unknown) => {
				throw 'string error'
			}) as any
			const validator = parseJsonWith(throwsNonError)
			expect(validator.safe!('{"name":"John"}')).toEqual({ ok: false, error: 'Unknown error' })
		})

		test('Standard Schema support', () => {
			const validator = parseJsonWith(userSchema)
			expect(validator['~standard']).toBeDefined()
		})

		test('Standard Schema validate success', () => {
			const validator = parseJsonWith(userSchema)
			expect(validator['~standard']!.validate('{"name":"John","age":30}')).toEqual({
				value: { name: 'John', age: 30 },
			})
		})

		test('Standard Schema validate failure on invalid JSON', () => {
			const validator = parseJsonWith(userSchema)
			const result = validator['~standard']!.validate('{')
			expect(result.issues![0].message).toBe('Invalid JSON')
		})

		test('works in pipe', () => {
			const validate = str(parseJsonWith(userSchema))
			expect(validate('{"name":"John","age":30}')).toEqual({ name: 'John', age: 30 })
		})

		test('handles nested schemas', () => {
			const nestedSchema = object({
				user: object({ name: str() }),
				scores: array(num()),
			})
			const json = '{"user":{"name":"John"},"scores":[1,2,3]}'
			expect(parseJsonWith(nestedSchema)(json)).toEqual({
				user: { name: 'John' },
				scores: [1, 2, 3],
			})
		})
	})

	describe('stringifyJson', () => {
		test('stringifies objects', () => {
			expect(stringifyJson({ a: 1 })).toBe('{"a":1}')
			expect(stringifyJson({ name: 'John', age: 30 })).toBe('{"name":"John","age":30}')
		})

		test('stringifies arrays', () => {
			expect(stringifyJson([1, 2, 3])).toBe('[1,2,3]')
			expect(stringifyJson([])).toBe('[]')
		})

		test('stringifies strings', () => {
			expect(stringifyJson('hello')).toBe('"hello"')
			expect(stringifyJson('')).toBe('""')
		})

		test('stringifies numbers', () => {
			expect(stringifyJson(123)).toBe('123')
			expect(stringifyJson(3.14)).toBe('3.14')
			expect(stringifyJson(-42)).toBe('-42')
			expect(stringifyJson(0)).toBe('0')
		})

		test('stringifies booleans', () => {
			expect(stringifyJson(true)).toBe('true')
			expect(stringifyJson(false)).toBe('false')
		})

		test('stringifies null', () => {
			expect(stringifyJson(null)).toBe('null')
		})

		test('stringifies nested structures', () => {
			const nested = { a: { b: [1, 2, { c: 3 }] } }
			expect(stringifyJson(nested)).toBe('{"a":{"b":[1,2,{"c":3}]}}')
		})

		test('handles special characters', () => {
			expect(stringifyJson('line1\nline2')).toBe('"line1\\nline2"')
			expect(stringifyJson('tab\there')).toBe('"tab\\there"')
		})

		test('handles unicode', () => {
			expect(stringifyJson('你好')).toBe('"你好"')
		})

		test('throws on circular reference', () => {
			const circular: any = { a: 1 }
			circular.self = circular
			expect(() => stringifyJson(circular)).toThrow('Cannot stringify to JSON')
		})

		test('throws on BigInt', () => {
			expect(() => stringifyJson(BigInt(123))).toThrow('Cannot stringify to JSON')
		})

		test('converts undefined values in objects', () => {
			expect(stringifyJson({ a: undefined })).toBe('{}')
		})

		test('converts undefined in arrays to null', () => {
			expect(stringifyJson([1, undefined, 3])).toBe('[1,null,3]')
		})

		test('safe version returns success', () => {
			expect(stringifyJson.safe!({ a: 1 })).toEqual({ ok: true, value: '{"a":1}' })
			expect(stringifyJson.safe!([1, 2, 3])).toEqual({ ok: true, value: '[1,2,3]' })
		})

		test('safe version handles circular reference', () => {
			const circular: any = { a: 1 }
			circular.self = circular
			expect(stringifyJson.safe!(circular)).toEqual({ ok: false, error: 'Cannot stringify to JSON' })
		})

		test('safe version handles BigInt', () => {
			expect(stringifyJson.safe!(BigInt(123))).toEqual({ ok: false, error: 'Cannot stringify to JSON' })
		})

		test('Standard Schema support', () => {
			expect(stringifyJson['~standard']).toBeDefined()
			expect(stringifyJson['~standard']!.version).toBe(1)
		})

		test('Standard Schema validate success', () => {
			expect(stringifyJson['~standard']!.validate({ a: 1 })).toEqual({ value: '{"a":1}' })
		})

		test('Standard Schema validate failure', () => {
			const circular: any = { a: 1 }
			circular.self = circular
			const result = stringifyJson['~standard']!.validate(circular)
			expect(result.issues![0].message).toBe('Cannot stringify to JSON')
		})

		test('works in pipe', () => {
			const validate = pipe(stringifyJson)
			expect(validate({ key: 'value' })).toBe('{"key":"value"}')
		})
	})

	describe('stringifyJsonWith', () => {
		test('stringifies with indentation', () => {
			const result = stringifyJsonWith(2)({ a: 1 })
			expect(result).toBe('{\n  "a": 1\n}')
		})

		test('stringifies with tab indentation', () => {
			const result = stringifyJsonWith('\t')({ a: 1 })
			expect(result).toBe('{\n\t"a": 1\n}')
		})

		test('stringifies with no formatting', () => {
			const result = stringifyJsonWith(undefined)({ a: 1 })
			expect(result).toBe('{"a":1}')
		})

		test('stringifies with 0 indentation', () => {
			const result = stringifyJsonWith(0)({ a: 1 })
			expect(result).toBe('{"a":1}')
		})

		test('stringifies with 4 spaces', () => {
			const result = stringifyJsonWith(4)({ a: 1, b: 2 })
			expect(result).toContain('    ')
		})

		test('stringifies nested with formatting', () => {
			const result = stringifyJsonWith(2)({ a: { b: 1 } })
			expect(result).toBe('{\n  "a": {\n    "b": 1\n  }\n}')
		})

		test('stringifies arrays with formatting', () => {
			const result = stringifyJsonWith(2)([1, 2, 3])
			expect(result).toBe('[\n  1,\n  2,\n  3\n]')
		})

		test('throws on circular reference', () => {
			const circular: any = { a: 1 }
			circular.self = circular
			expect(() => stringifyJsonWith(2)(circular)).toThrow('Cannot stringify to JSON')
		})

		test('safe version returns success', () => {
			const result = stringifyJsonWith(2).safe!({ a: 1 })
			expect(result.ok).toBe(true)
			expect((result as any).value).toBe('{\n  "a": 1\n}')
		})

		test('safe version handles circular reference', () => {
			const circular: any = { a: 1 }
			circular.self = circular
			expect(stringifyJsonWith(2).safe!(circular)).toEqual({ ok: false, error: 'Cannot stringify to JSON' })
		})

		test('works with replacer function', () => {
			const replacer = (key: string, value: unknown) => {
				if (key === 'secret') return undefined
				return value
			}
			const result = stringifyJsonWith(undefined, replacer)({ name: 'John', secret: '123' })
			expect(result).toBe('{"name":"John"}')
		})

		test('replacer transforms values', () => {
			const replacer = (_key: string, value: unknown) => {
				if (typeof value === 'number') return value * 2
				return value
			}
			const result = stringifyJsonWith(undefined, replacer)({ a: 5, b: 10 })
			expect(result).toBe('{"a":10,"b":20}')
		})

		test('works with replacer and indentation', () => {
			const replacer = (key: string, value: unknown) => {
				if (key === 'password') return undefined
				return value
			}
			const result = stringifyJsonWith(2, replacer)({ name: 'John', password: 'secret' })
			expect(result).toBe('{\n  "name": "John"\n}')
		})

		test('Standard Schema support', () => {
			const validator = stringifyJsonWith(2)
			expect(validator['~standard']).toBeDefined()
		})

		test('Standard Schema validate success', () => {
			const validator = stringifyJsonWith(2)
			const result = validator['~standard']!.validate({ a: 1 })
			expect(result.value).toBe('{\n  "a": 1\n}')
		})

		test('Standard Schema validate failure', () => {
			const circular: any = { a: 1 }
			circular.self = circular
			const validator = stringifyJsonWith(2)
			const result = validator['~standard']!.validate(circular)
			expect(result.issues![0].message).toBe('Cannot stringify to JSON')
		})

		test('works in pipe', () => {
			const prettyJson = pipe(stringifyJsonWith(2))
			expect(prettyJson({ key: 'value' })).toBe('{\n  "key": "value"\n}')
		})
	})

	describe('roundtrip', () => {
		test('parse then stringify preserves data', () => {
			const original = { name: 'John', age: 30, active: true }
			const stringified = stringifyJson(original)
			const parsed = parseJson(stringified)
			expect(parsed).toEqual(original)
		})

		test('stringify then parse preserves data', () => {
			const json = '{"a":1,"b":[2,3],"c":{"d":4}}'
			const parsed = parseJson(json)
			const stringified = stringifyJson(parsed)
			const reparsed = parseJson(stringified)
			expect(reparsed).toEqual(parsed)
		})

		test('with array data', () => {
			const original = [1, 'two', true, null, { key: 'value' }]
			const stringified = stringifyJson(original)
			const parsed = parseJson(stringified)
			expect(parsed).toEqual(original)
		})
	})

	describe('edge cases', () => {
		test('parseJson with whitespace', () => {
			expect(parseJson('  {"a":1}  ')).toEqual({ a: 1 })
			expect(parseJson('\n{"a":1}\n')).toEqual({ a: 1 })
		})

		test('parseJson with large numbers', () => {
			expect(parseJson('1e308')).toBe(1e308)
			expect(parseJson('-1e308')).toBe(-1e308)
		})

		test('stringifyJson with Date converts to ISO string', () => {
			const date = new Date('2024-01-15T00:00:00.000Z')
			const result = stringifyJson({ date })
			expect(result).toBe('{"date":"2024-01-15T00:00:00.000Z"}')
		})

		test('stringifyJson with function removes it', () => {
			const withFn = { a: 1, fn: () => {} }
			expect(stringifyJson(withFn)).toBe('{"a":1}')
		})

		test('stringifyJson with Symbol removes it', () => {
			const withSym = { a: 1, [Symbol('key')]: 'value' }
			expect(stringifyJson(withSym)).toBe('{"a":1}')
		})

		test('parseJsonWith with optional schema uses defaults', () => {
			const schema = object({
				name: str(),
			})
			// Note: The schema will fail for missing fields
			expect(() => parseJsonWith(schema)('{}')).toThrow()
		})
	})
})
