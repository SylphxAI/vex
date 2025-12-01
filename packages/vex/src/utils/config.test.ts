// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
	config,
	deleteGlobalConfig,
	deleteGlobalMessage,
	deleteSchemaMessage,
	deleteSpecificMessage,
	getGlobalConfig,
	getGlobalMessage,
	getSchemaMessage,
	getSpecificMessage,
	setGlobalConfig,
	setGlobalMessage,
	setSchemaMessage,
	setSpecificMessage,
} from './config'

describe('utils/config', () => {
	beforeEach(() => {
		deleteGlobalConfig()
		deleteGlobalMessage()
	})

	afterEach(() => {
		deleteGlobalConfig()
		deleteGlobalMessage()
	})

	describe('globalConfig', () => {
		test('getGlobalConfig returns empty object by default', () => {
			expect(getGlobalConfig()).toEqual({})
		})

		test('setGlobalConfig sets config', () => {
			setGlobalConfig({ abortEarly: true })
			expect(getGlobalConfig()).toEqual({ abortEarly: true })
		})

		test('setGlobalConfig merges config', () => {
			setGlobalConfig({ a: 1 })
			setGlobalConfig({ b: 2 })
			expect(getGlobalConfig()).toEqual({ a: 1, b: 2 })
		})

		test('setGlobalConfig overwrites existing keys', () => {
			setGlobalConfig({ a: 1 })
			setGlobalConfig({ a: 2 })
			expect(getGlobalConfig()).toEqual({ a: 2 })
		})

		test('setGlobalConfig with empty object preserves existing', () => {
			setGlobalConfig({ a: 1 })
			setGlobalConfig({})
			expect(getGlobalConfig()).toEqual({ a: 1 })
		})

		test('deleteGlobalConfig clears config', () => {
			setGlobalConfig({ a: 1 })
			deleteGlobalConfig()
			expect(getGlobalConfig()).toEqual({})
		})

		test('deleteGlobalConfig is idempotent', () => {
			deleteGlobalConfig()
			deleteGlobalConfig()
			expect(getGlobalConfig()).toEqual({})
		})

		test('setGlobalConfig with nested objects', () => {
			setGlobalConfig({ nested: { deep: { value: 1 } } })
			expect(getGlobalConfig()).toEqual({ nested: { deep: { value: 1 } } })
		})

		test('setGlobalConfig with arrays', () => {
			setGlobalConfig({ items: [1, 2, 3] })
			expect(getGlobalConfig()).toEqual({ items: [1, 2, 3] })
		})

		test('setGlobalConfig with null values', () => {
			setGlobalConfig({ nullable: null })
			expect(getGlobalConfig()).toEqual({ nullable: null })
		})

		test('setGlobalConfig with boolean values', () => {
			setGlobalConfig({ enabled: true, disabled: false })
			expect(getGlobalConfig()).toEqual({ enabled: true, disabled: false })
		})

		test('setGlobalConfig with function values', () => {
			const fn = () => 'test'
			setGlobalConfig({ formatter: fn })
			expect(getGlobalConfig().formatter).toBe(fn)
		})

		test('multiple merges accumulate correctly', () => {
			setGlobalConfig({ a: 1 })
			setGlobalConfig({ b: 2 })
			setGlobalConfig({ c: 3 })
			expect(getGlobalConfig()).toEqual({ a: 1, b: 2, c: 3 })
		})
	})

	describe('globalMessage', () => {
		test('getGlobalMessage returns undefined by default', () => {
			expect(getGlobalMessage()).toBeUndefined()
		})

		test('setGlobalMessage sets string message', () => {
			setGlobalMessage('Global error')
			expect(getGlobalMessage()).toBe('Global error')
		})

		test('setGlobalMessage sets function message', () => {
			const fn = (issue: { message: string }) => `Custom: ${issue.message}`
			setGlobalMessage(fn)
			expect(getGlobalMessage()).toBe(fn)
		})

		test('setGlobalMessage overwrites previous message', () => {
			setGlobalMessage('First')
			setGlobalMessage('Second')
			expect(getGlobalMessage()).toBe('Second')
		})

		test('deleteGlobalMessage clears message', () => {
			setGlobalMessage('Global error')
			deleteGlobalMessage()
			expect(getGlobalMessage()).toBeUndefined()
		})

		test('deleteGlobalMessage is idempotent', () => {
			deleteGlobalMessage()
			deleteGlobalMessage()
			expect(getGlobalMessage()).toBeUndefined()
		})

		test('setGlobalMessage with empty string', () => {
			setGlobalMessage('')
			expect(getGlobalMessage()).toBe('')
		})

		test('setGlobalMessage with unicode', () => {
			setGlobalMessage('错误: 无效的值')
			expect(getGlobalMessage()).toBe('错误: 无效的值')
		})

		test('setGlobalMessage with special characters', () => {
			setGlobalMessage('<script>alert("xss")</script>')
			expect(getGlobalMessage()).toBe('<script>alert("xss")</script>')
		})

		test('function message receives issue object', () => {
			const fn = (issue: { message: string }) => {
				expect(issue).toBeDefined()
				return `Modified: ${issue.message}`
			}
			setGlobalMessage(fn)
			const getter = getGlobalMessage()
			if (typeof getter === 'function') {
				expect(getter({ message: 'test' })).toBe('Modified: test')
			}
		})

		test('function message can access all issue properties', () => {
			const fn = (issue: { message: string; path?: string[] }) => {
				return issue.path ? `${issue.path.join('.')}: ${issue.message}` : issue.message
			}
			setGlobalMessage(fn)
			const getter = getGlobalMessage()
			if (typeof getter === 'function') {
				expect(getter({ message: 'error', path: ['user', 'name'] })).toBe('user.name: error')
			}
		})
	})

	describe('schemaMessage', () => {
		afterEach(() => {
			deleteSchemaMessage('string')
			deleteSchemaMessage('number')
			deleteSchemaMessage('boolean')
			deleteSchemaMessage('object')
			deleteSchemaMessage('array')
		})

		test('getSchemaMessage returns undefined by default', () => {
			expect(getSchemaMessage('string')).toBeUndefined()
		})

		test('setSchemaMessage sets message for schema', () => {
			setSchemaMessage('string', 'Must be a string')
			expect(getSchemaMessage('string')).toBe('Must be a string')
		})

		test('setSchemaMessage sets function message', () => {
			const fn = (issue: { message: string }) => `Custom: ${issue.message}`
			setSchemaMessage('number', fn)
			expect(getSchemaMessage('number')).toBe(fn)
		})

		test('setSchemaMessage overwrites previous message', () => {
			setSchemaMessage('string', 'First')
			setSchemaMessage('string', 'Second')
			expect(getSchemaMessage('string')).toBe('Second')
		})

		test('deleteSchemaMessage clears message', () => {
			setSchemaMessage('string', 'Must be a string')
			deleteSchemaMessage('string')
			expect(getSchemaMessage('string')).toBeUndefined()
		})

		test('deleteSchemaMessage is idempotent', () => {
			deleteSchemaMessage('nonexistent')
			expect(getSchemaMessage('nonexistent')).toBeUndefined()
		})

		test('different schemas have independent messages', () => {
			setSchemaMessage('string', 'String error')
			setSchemaMessage('number', 'Number error')
			expect(getSchemaMessage('string')).toBe('String error')
			expect(getSchemaMessage('number')).toBe('Number error')
		})

		test('deleting one schema message preserves others', () => {
			setSchemaMessage('string', 'String error')
			setSchemaMessage('number', 'Number error')
			deleteSchemaMessage('string')
			expect(getSchemaMessage('string')).toBeUndefined()
			expect(getSchemaMessage('number')).toBe('Number error')
		})

		test('setSchemaMessage with empty string', () => {
			setSchemaMessage('string', '')
			expect(getSchemaMessage('string')).toBe('')
		})

		test('setSchemaMessage for custom schema types', () => {
			setSchemaMessage('email', 'Invalid email format')
			expect(getSchemaMessage('email')).toBe('Invalid email format')
			deleteSchemaMessage('email')
		})

		test('setSchemaMessage for nested type names', () => {
			setSchemaMessage('object.user', 'Invalid user object')
			expect(getSchemaMessage('object.user')).toBe('Invalid user object')
			deleteSchemaMessage('object.user')
		})
	})

	describe('specificMessage', () => {
		afterEach(() => {
			deleteSpecificMessage('user.email')
			deleteSpecificMessage('user.name')
			deleteSpecificMessage('address.street')
		})

		test('getSpecificMessage returns undefined by default', () => {
			expect(getSpecificMessage('user.email')).toBeUndefined()
		})

		test('setSpecificMessage sets message for key', () => {
			setSpecificMessage('user.email', 'Invalid email')
			expect(getSpecificMessage('user.email')).toBe('Invalid email')
		})

		test('setSpecificMessage sets function message', () => {
			const fn = (issue: { message: string }) => `Custom: ${issue.message}`
			setSpecificMessage('user.name', fn)
			expect(getSpecificMessage('user.name')).toBe(fn)
		})

		test('setSpecificMessage overwrites previous message', () => {
			setSpecificMessage('user.email', 'First')
			setSpecificMessage('user.email', 'Second')
			expect(getSpecificMessage('user.email')).toBe('Second')
		})

		test('deleteSpecificMessage clears message', () => {
			setSpecificMessage('user.email', 'Invalid email')
			deleteSpecificMessage('user.email')
			expect(getSpecificMessage('user.email')).toBeUndefined()
		})

		test('deleteSpecificMessage is idempotent', () => {
			deleteSpecificMessage('nonexistent.path')
			expect(getSpecificMessage('nonexistent.path')).toBeUndefined()
		})

		test('different keys have independent messages', () => {
			setSpecificMessage('user.email', 'Email error')
			setSpecificMessage('user.name', 'Name error')
			expect(getSpecificMessage('user.email')).toBe('Email error')
			expect(getSpecificMessage('user.name')).toBe('Name error')
		})

		test('deleting one key preserves others', () => {
			setSpecificMessage('user.email', 'Email error')
			setSpecificMessage('user.name', 'Name error')
			deleteSpecificMessage('user.email')
			expect(getSpecificMessage('user.email')).toBeUndefined()
			expect(getSpecificMessage('user.name')).toBe('Name error')
		})

		test('setSpecificMessage with empty string', () => {
			setSpecificMessage('user.email', '')
			expect(getSpecificMessage('user.email')).toBe('')
		})

		test('setSpecificMessage with deep paths', () => {
			setSpecificMessage('user.address.street.number', 'Invalid number')
			expect(getSpecificMessage('user.address.street.number')).toBe('Invalid number')
			deleteSpecificMessage('user.address.street.number')
		})

		test('setSpecificMessage with array notation', () => {
			setSpecificMessage('users[0].email', 'First user email invalid')
			expect(getSpecificMessage('users[0].email')).toBe('First user email invalid')
			deleteSpecificMessage('users[0].email')
		})

		test('function message can customize based on issue', () => {
			const fn = (issue: { message: string; expected?: string }) => {
				return issue.expected ? `Expected ${issue.expected}` : issue.message
			}
			setSpecificMessage('user.age', fn)
			const getter = getSpecificMessage('user.age')
			if (typeof getter === 'function') {
				expect(getter({ message: 'error', expected: 'number' })).toBe('Expected number')
			}
			deleteSpecificMessage('user.age')
		})
	})

	describe('config function', () => {
		test('returns schema unchanged', () => {
			const schema = ((v: unknown) => v) as any
			expect(config(schema, { abortEarly: true })).toBe(schema)
		})

		test('returns schema with empty options', () => {
			const schema = ((v: unknown) => v) as any
			expect(config(schema, {})).toBe(schema)
		})

		test('returns complex schema unchanged', () => {
			const schema = Object.assign((v: unknown) => v, { safe: (v: unknown) => ({ ok: true, value: v }) }) as any
			const result = config(schema, { message: 'Custom' })
			expect(result).toBe(schema)
		})

		test('works with various config options', () => {
			const schema = ((v: unknown) => v) as any
			expect(config(schema, { abortEarly: false })).toBe(schema)
			expect(config(schema, { lang: 'en' })).toBe(schema)
		})

		test('config does not modify schema properties', () => {
			const schema = Object.assign((v: unknown) => v, { type: 'string' }) as any
			config(schema, { abortEarly: true })
			expect(schema.type).toBe('string')
		})
	})

	describe('integration scenarios', () => {
		test('global config and message work together', () => {
			setGlobalConfig({ abortEarly: true })
			setGlobalMessage('Validation failed')
			expect(getGlobalConfig()).toEqual({ abortEarly: true })
			expect(getGlobalMessage()).toBe('Validation failed')
		})

		test('schema and specific messages are independent', () => {
			setSchemaMessage('string', 'Schema string error')
			setSpecificMessage('user.name', 'Specific name error')
			expect(getSchemaMessage('string')).toBe('Schema string error')
			expect(getSpecificMessage('user.name')).toBe('Specific name error')
			deleteSchemaMessage('string')
			deleteSpecificMessage('user.name')
		})

		test('all message types can coexist', () => {
			setGlobalMessage('Global')
			setSchemaMessage('string', 'Schema')
			setSpecificMessage('field', 'Specific')
			expect(getGlobalMessage()).toBe('Global')
			expect(getSchemaMessage('string')).toBe('Schema')
			expect(getSpecificMessage('field')).toBe('Specific')
			deleteSchemaMessage('string')
			deleteSpecificMessage('field')
		})

		test('resetting global does not affect schema messages', () => {
			setSchemaMessage('string', 'String error')
			deleteGlobalMessage()
			expect(getSchemaMessage('string')).toBe('String error')
			deleteSchemaMessage('string')
		})

		test('multiple concurrent configurations', () => {
			setGlobalConfig({ a: 1 })
			setGlobalConfig({ b: 2 })
			setGlobalMessage('Error 1')
			setGlobalMessage('Error 2')
			expect(getGlobalConfig()).toEqual({ a: 1, b: 2 })
			expect(getGlobalMessage()).toBe('Error 2')
		})
	})

	describe('edge cases', () => {
		test('handles undefined schema name', () => {
			setSchemaMessage(undefined as any, 'message')
			expect(getSchemaMessage(undefined as any)).toBe('message')
			deleteSchemaMessage(undefined as any)
		})

		test('handles empty string schema name', () => {
			setSchemaMessage('', 'message')
			expect(getSchemaMessage('')).toBe('message')
			deleteSchemaMessage('')
		})

		test('handles special characters in key', () => {
			setSpecificMessage('user[0].name', 'error')
			expect(getSpecificMessage('user[0].name')).toBe('error')
			deleteSpecificMessage('user[0].name')
		})

		test('handles very long key names', () => {
			const longKey = 'a'.repeat(1000)
			setSpecificMessage(longKey, 'error')
			expect(getSpecificMessage(longKey)).toBe('error')
			deleteSpecificMessage(longKey)
		})

		test('handles unicode in schema names', () => {
			setSchemaMessage('数字', 'Number error')
			expect(getSchemaMessage('数字')).toBe('Number error')
			deleteSchemaMessage('数字')
		})
	})
})
