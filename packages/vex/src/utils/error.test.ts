// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { entriesFromList, entriesFromObjects, getDotPath, isOfKind, isOfType, isValiError, ValiError } from './error'

describe('utils/error', () => {
	describe('ValiError', () => {
		test('creates error with message', () => {
			const error = new ValiError('Test error')
			expect(error.message).toBe('Test error')
			expect(error.name).toBe('ValidationError')
		})

		test('is instance of Error', () => {
			const error = new ValiError('Test')
			expect(error instanceof Error).toBe(true)
		})

		test('is instance of ValiError', () => {
			const error = new ValiError('Test')
			expect(error instanceof ValiError).toBe(true)
		})

		test('has correct prototype chain', () => {
			const error = new ValiError('Test')
			expect(Object.getPrototypeOf(error)).toBe(ValiError.prototype)
			expect(Object.getPrototypeOf(ValiError.prototype)).toBe(Error.prototype)
		})

		test('creates error with empty message', () => {
			const error = new ValiError('')
			expect(error.message).toBe('')
		})

		test('creates error with special characters', () => {
			const error = new ValiError('<script>alert("xss")</script>')
			expect(error.message).toBe('<script>alert("xss")</script>')
		})

		test('creates error with unicode', () => {
			const error = new ValiError('错误: 无效的值')
			expect(error.message).toBe('错误: 无效的值')
		})

		test('creates error with emoji', () => {
			const error = new ValiError('Error: ❌ Failed')
			expect(error.message).toBe('Error: ❌ Failed')
		})

		test('creates error with long message', () => {
			const longMessage = 'x'.repeat(10000)
			const error = new ValiError(longMessage)
			expect(error.message).toBe(longMessage)
		})

		test('creates error with newlines', () => {
			const error = new ValiError('Line 1\nLine 2\nLine 3')
			expect(error.message).toBe('Line 1\nLine 2\nLine 3')
		})

		test('can be thrown and caught', () => {
			expect(() => {
				throw new ValiError('Test')
			}).toThrow(ValiError)
		})

		test('can be caught as Error', () => {
			try {
				throw new ValiError('Test')
			} catch (e) {
				expect(e instanceof Error).toBe(true)
			}
		})

		test('has stack trace', () => {
			const error = new ValiError('Test')
			expect(error.stack).toBeDefined()
			expect(typeof error.stack).toBe('string')
		})

		test('toString returns message', () => {
			const error = new ValiError('Test error')
			expect(error.toString()).toContain('Test error')
		})
	})

	describe('isValiError', () => {
		test('returns true for ValiError', () => {
			const error = new ValiError('Test')
			expect(isValiError(error)).toBe(true)
		})

		test('returns false for regular Error', () => {
			const error = new Error('Test')
			expect(isValiError(error)).toBe(false)
		})

		test('returns false for TypeError', () => {
			const error = new TypeError('Test')
			expect(isValiError(error)).toBe(false)
		})

		test('returns false for RangeError', () => {
			const error = new RangeError('Test')
			expect(isValiError(error)).toBe(false)
		})

		test('returns false for SyntaxError', () => {
			const error = new SyntaxError('Test')
			expect(isValiError(error)).toBe(false)
		})

		test('returns false for string', () => {
			expect(isValiError('string')).toBe(false)
		})

		test('returns false for null', () => {
			expect(isValiError(null)).toBe(false)
		})

		test('returns false for undefined', () => {
			expect(isValiError(undefined)).toBe(false)
		})

		test('returns false for number', () => {
			expect(isValiError(123)).toBe(false)
		})

		test('returns false for boolean', () => {
			expect(isValiError(true)).toBe(false)
			expect(isValiError(false)).toBe(false)
		})

		test('returns false for plain object', () => {
			expect(isValiError({})).toBe(false)
			expect(isValiError({ message: 'error' })).toBe(false)
		})

		test('returns false for array', () => {
			expect(isValiError([])).toBe(false)
		})

		test('returns false for function', () => {
			expect(isValiError(() => {})).toBe(false)
		})

		test('returns false for object mimicking error', () => {
			const fake = {
				message: 'Test',
				name: 'ValidationError',
			}
			expect(isValiError(fake)).toBe(false)
		})

		test('returns false for subclass of Error', () => {
			class CustomError extends Error {}
			expect(isValiError(new CustomError('Test'))).toBe(false)
		})
	})

	describe('isOfType', () => {
		test('checks type property', () => {
			const obj = { type: 'string' }
			expect(isOfType(obj, 'string')).toBe(true)
			expect(isOfType(obj, 'number')).toBe(false)
		})

		test('returns false for non-object', () => {
			expect(isOfType('string', 'string')).toBe(false)
			expect(isOfType(null, 'string')).toBe(false)
		})

		test('returns false for undefined', () => {
			expect(isOfType(undefined, 'string')).toBe(false)
		})

		test('returns false for number', () => {
			expect(isOfType(123, 'number')).toBe(false)
		})

		test('returns false for object without type', () => {
			const obj = { name: 'test' }
			expect(isOfType(obj, 'string')).toBe(false)
		})

		test('returns false for object with undefined type', () => {
			const obj = { type: undefined }
			expect(isOfType(obj, 'string')).toBe(false)
		})

		test('returns false for object with null type', () => {
			const obj = { type: null }
			expect(isOfType(obj, 'string')).toBe(false)
		})

		test('matches exact type', () => {
			const obj = { type: 'email' }
			expect(isOfType(obj, 'email')).toBe(true)
			expect(isOfType(obj, 'Email')).toBe(false)
			expect(isOfType(obj, 'EMAIL')).toBe(false)
		})

		test('works with various type names', () => {
			expect(isOfType({ type: 'string' }, 'string')).toBe(true)
			expect(isOfType({ type: 'number' }, 'number')).toBe(true)
			expect(isOfType({ type: 'boolean' }, 'boolean')).toBe(true)
			expect(isOfType({ type: 'object' }, 'object')).toBe(true)
			expect(isOfType({ type: 'array' }, 'array')).toBe(true)
		})

		test('returns false for array', () => {
			expect(isOfType([], 'array')).toBe(false)
		})

		test('returns false for function', () => {
			expect(isOfType(() => {}, 'function')).toBe(false)
		})

		test('handles object with other properties', () => {
			const obj = { type: 'string', name: 'test', value: 123 }
			expect(isOfType(obj, 'string')).toBe(true)
		})

		test('handles empty string type', () => {
			const obj = { type: '' }
			expect(isOfType(obj, '')).toBe(true)
			expect(isOfType(obj, 'string')).toBe(false)
		})
	})

	describe('isOfKind', () => {
		test('checks issue kind', () => {
			const issue = { kind: 'validation', message: 'Error' }
			expect(isOfKind(issue, 'validation')).toBe(true)
			expect(isOfKind(issue, 'transform')).toBe(false)
		})

		test('returns false for issue without kind', () => {
			const issue = { message: 'Error' }
			expect(isOfKind(issue, 'validation')).toBe(false)
		})

		test('returns false for non-object', () => {
			expect(isOfKind('string', 'validation')).toBe(false)
			expect(isOfKind(null, 'validation')).toBe(false)
		})

		test('returns false for undefined', () => {
			expect(isOfKind(undefined, 'validation')).toBe(false)
		})

		test('returns false for number', () => {
			expect(isOfKind(123, 'validation')).toBe(false)
		})

		test('returns false for array', () => {
			expect(isOfKind([], 'validation')).toBe(false)
		})

		test('matches exact kind', () => {
			const issue = { kind: 'schema' }
			expect(isOfKind(issue, 'schema')).toBe(true)
			expect(isOfKind(issue, 'Schema')).toBe(false)
			expect(isOfKind(issue, 'SCHEMA')).toBe(false)
		})

		test('works with various kind names', () => {
			expect(isOfKind({ kind: 'validation' }, 'validation')).toBe(true)
			expect(isOfKind({ kind: 'transform' }, 'transform')).toBe(true)
			expect(isOfKind({ kind: 'schema' }, 'schema')).toBe(true)
			expect(isOfKind({ kind: 'custom' }, 'custom')).toBe(true)
		})

		test('returns false for undefined kind', () => {
			const issue = { kind: undefined }
			expect(isOfKind(issue, 'validation')).toBe(false)
		})

		test('returns false for null kind', () => {
			const issue = { kind: null }
			expect(isOfKind(issue, 'validation')).toBe(false)
		})

		test('handles issue with other properties', () => {
			const issue = { kind: 'validation', message: 'Error', path: ['field'] }
			expect(isOfKind(issue, 'validation')).toBe(true)
		})

		test('handles empty string kind', () => {
			const issue = { kind: '' }
			expect(isOfKind(issue, '')).toBe(true)
			expect(isOfKind(issue, 'validation')).toBe(false)
		})
	})

	describe('getDotPath', () => {
		test('joins path with dots', () => {
			expect(getDotPath({ path: ['user', 'email'] })).toBe('user.email')
		})

		test('handles empty path', () => {
			expect(getDotPath({ path: [] })).toBe(undefined)
		})

		test('handles undefined path', () => {
			expect(getDotPath({})).toBe(undefined)
		})

		test('handles single item', () => {
			expect(getDotPath({ path: ['name'] })).toBe('name')
		})

		test('handles numeric keys', () => {
			expect(getDotPath({ path: ['items', 0, 'name'] })).toBe('items[0].name')
		})

		test('handles multiple numeric keys', () => {
			expect(getDotPath({ path: ['items', 0, 'tags', 1] })).toBe('items[0].tags[1]')
		})

		test('handles numeric at start', () => {
			expect(getDotPath({ path: [0, 'name'] })).toBe('[0].name')
		})

		test('handles only numeric keys', () => {
			expect(getDotPath({ path: [0, 1, 2] })).toBe('[0][1][2]')
		})

		test('handles deeply nested path', () => {
			expect(getDotPath({ path: ['a', 'b', 'c', 'd', 'e'] })).toBe('a.b.c.d.e')
		})

		test('handles path with special characters', () => {
			expect(getDotPath({ path: ['user-name', 'email'] })).toBe('user-name.email')
		})

		test('handles path with underscore', () => {
			expect(getDotPath({ path: ['user_name', 'email_address'] })).toBe('user_name.email_address')
		})

		test('handles path with numbers in names', () => {
			expect(getDotPath({ path: ['user1', 'field2'] })).toBe('user1.field2')
		})

		test('returns undefined for null path', () => {
			expect(getDotPath({ path: null as any })).toBe(undefined)
		})

		test('handles mixed string and number path', () => {
			expect(getDotPath({ path: ['users', 0, 'posts', 1, 'title'] })).toBe('users[0].posts[1].title')
		})

		test('handles issue with other properties', () => {
			expect(getDotPath({ path: ['user', 'email'], message: 'Error' })).toBe('user.email')
		})
	})

	describe('entriesFromList', () => {
		test('converts list to entries', () => {
			expect(entriesFromList(['a', 'b', 'c'])).toEqual([
				['a', 'a'],
				['b', 'b'],
				['c', 'c'],
			])
		})

		test('handles empty list', () => {
			expect(entriesFromList([])).toEqual([])
		})

		test('handles numbers', () => {
			expect(entriesFromList([1, 2, 3])).toEqual([
				[1, 1],
				[2, 2],
				[3, 3],
			])
		})

		test('handles single item', () => {
			expect(entriesFromList(['only'])).toEqual([['only', 'only']])
		})

		test('handles mixed types', () => {
			expect(entriesFromList([1, 'two', 3])).toEqual([
				[1, 1],
				['two', 'two'],
				[3, 3],
			])
		})

		test('handles objects', () => {
			const obj = { key: 'value' }
			expect(entriesFromList([obj])).toEqual([[obj, obj]])
		})

		test('handles null values', () => {
			expect(entriesFromList([null, null])).toEqual([
				[null, null],
				[null, null],
			])
		})

		test('handles undefined values', () => {
			expect(entriesFromList([undefined])).toEqual([[undefined, undefined]])
		})

		test('handles boolean values', () => {
			expect(entriesFromList([true, false])).toEqual([
				[true, true],
				[false, false],
			])
		})

		test('handles large list', () => {
			const list = Array.from({ length: 100 }, (_, i) => i)
			const entries = entriesFromList(list)
			expect(entries.length).toBe(100)
			expect(entries[0]).toEqual([0, 0])
			expect(entries[99]).toEqual([99, 99])
		})

		test('preserves original value identity', () => {
			const obj = { id: 1 }
			const entries = entriesFromList([obj])
			expect(entries[0][0]).toBe(obj)
			expect(entries[0][1]).toBe(obj)
		})
	})

	describe('entriesFromObjects', () => {
		test('creates entries from objects', () => {
			const objects = [
				{ key: 'a', value: 1 },
				{ key: 'b', value: 2 },
			]
			expect(entriesFromObjects(objects, 'key', 'value')).toEqual([
				['a', 1],
				['b', 2],
			])
		})

		test('handles empty array', () => {
			expect(entriesFromObjects([], 'key', 'value')).toEqual([])
		})

		test('handles single object', () => {
			const objects = [{ key: 'a', value: 1 }]
			expect(entriesFromObjects(objects, 'key', 'value')).toEqual([['a', 1]])
		})

		test('handles different property names', () => {
			const objects = [
				{ name: 'foo', data: 123 },
				{ name: 'bar', data: 456 },
			]
			expect(entriesFromObjects(objects, 'name', 'data')).toEqual([
				['foo', 123],
				['bar', 456],
			])
		})

		test('handles nested object values', () => {
			const objects = [{ id: 'a', nested: { deep: 'value' } }]
			expect(entriesFromObjects(objects, 'id', 'nested')).toEqual([['a', { deep: 'value' }]])
		})

		test('handles array values', () => {
			const objects = [{ key: 'items', value: [1, 2, 3] }]
			expect(entriesFromObjects(objects, 'key', 'value')).toEqual([['items', [1, 2, 3]]])
		})

		test('handles null values', () => {
			const objects = [{ key: 'nullable', value: null }]
			expect(entriesFromObjects(objects, 'key', 'value')).toEqual([['nullable', null]])
		})

		test('handles undefined values', () => {
			const objects = [{ key: 'undefined', value: undefined }]
			expect(entriesFromObjects(objects, 'key', 'value')).toEqual([['undefined', undefined]])
		})

		test('handles numeric keys', () => {
			const objects = [
				{ index: 0, value: 'first' },
				{ index: 1, value: 'second' },
			]
			expect(entriesFromObjects(objects, 'index', 'value')).toEqual([
				[0, 'first'],
				[1, 'second'],
			])
		})

		test('handles boolean values', () => {
			const objects = [
				{ flag: 'enabled', status: true },
				{ flag: 'disabled', status: false },
			]
			expect(entriesFromObjects(objects, 'flag', 'status')).toEqual([
				['enabled', true],
				['disabled', false],
			])
		})

		test('handles large array', () => {
			const objects = Array.from({ length: 100 }, (_, i) => ({ k: `key${i}`, v: i }))
			const entries = entriesFromObjects(objects, 'k', 'v')
			expect(entries.length).toBe(100)
			expect(entries[0]).toEqual(['key0', 0])
			expect(entries[99]).toEqual(['key99', 99])
		})

		test('preserves object reference', () => {
			const value = { nested: 'data' }
			const objects = [{ key: 'test', value }]
			const entries = entriesFromObjects(objects, 'key', 'value')
			expect(entries[0][1]).toBe(value)
		})

		test('handles same key and value property', () => {
			const objects = [{ same: 'value1' }, { same: 'value2' }]
			expect(entriesFromObjects(objects, 'same', 'same')).toEqual([
				['value1', 'value1'],
				['value2', 'value2'],
			])
		})
	})

	describe('integration scenarios', () => {
		test('ValiError with getDotPath', () => {
			const path = getDotPath({ path: ['user', 'email'] })
			const error = new ValiError(`Invalid value at ${path}`)
			expect(error.message).toBe('Invalid value at user.email')
			expect(isValiError(error)).toBe(true)
		})

		test('isOfType and isOfKind together', () => {
			const issue = { type: 'string', kind: 'validation', message: 'Error' }
			expect(isOfType(issue, 'string')).toBe(true)
			expect(isOfKind(issue, 'validation')).toBe(true)
		})

		test('entriesFromList for enum creation', () => {
			const values = ['active', 'inactive', 'pending']
			const entries = entriesFromList(values)
			const enumObj = Object.fromEntries(entries)
			expect(enumObj).toEqual({ active: 'active', inactive: 'inactive', pending: 'pending' })
		})

		test('entriesFromObjects for mapping', () => {
			const users = [
				{ id: '1', name: 'Alice' },
				{ id: '2', name: 'Bob' },
			]
			const entries = entriesFromObjects(users, 'id', 'name')
			const nameById = Object.fromEntries(entries)
			expect(nameById['1']).toBe('Alice')
			expect(nameById['2']).toBe('Bob')
		})
	})

	describe('edge cases', () => {
		test('ValiError with Symbol in message', () => {
			const error = new ValiError(String(Symbol('test')))
			expect(error.message).toBe('Symbol(test)')
		})

		test('getDotPath with very long path', () => {
			const longPath = Array.from({ length: 100 }, (_, i) => `level${i}`)
			const result = getDotPath({ path: longPath })
			expect(result).toContain('level0.level1')
			expect(result).toContain('level99')
		})

		test('isOfType with numeric type', () => {
			const obj = { type: 123 }
			expect(isOfType(obj, 123 as any)).toBe(true)
		})

		test('entriesFromList with duplicate values', () => {
			const result = entriesFromList(['a', 'a', 'a'])
			expect(result).toEqual([
				['a', 'a'],
				['a', 'a'],
				['a', 'a'],
			])
		})
	})
})
