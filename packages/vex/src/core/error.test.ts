// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import { ValidationError, type ValidationIssue, ValiError } from './error'

describe('ValidationError', () => {
	test('creates error with message', () => {
		const error = new ValidationError('Test error')
		expect(error.message).toBe('Test error')
		expect(error.name).toBe('ValidationError')
		expect(error.issues).toEqual([{ message: 'Test error' }])
	})

	test('creates error with custom issues', () => {
		const issues: ValidationIssue[] = [
			{ message: 'Error 1', path: ['field1'] },
			{ message: 'Error 2', path: ['field2'] },
		]
		const error = new ValidationError('Multiple errors', issues)
		expect(error.issues).toEqual(issues)
	})

	test('is instance of Error', () => {
		const error = new ValidationError('Test')
		expect(error).toBeInstanceOf(Error)
		expect(error).toBeInstanceOf(ValidationError)
	})

	describe('fromIssue', () => {
		test('creates error from single issue', () => {
			const issue: ValidationIssue = {
				message: 'Field required',
				path: ['name'],
				input: undefined,
				expected: 'string',
				received: 'undefined',
			}
			const error = ValidationError.fromIssue(issue)
			expect(error.message).toBe('Field required')
			expect(error.issues).toEqual([issue])
		})
	})

	describe('fromIssues', () => {
		test('creates error from empty issues array', () => {
			const error = ValidationError.fromIssues([])
			expect(error.message).toBe('Validation failed')
			// When no issues provided, constructor defaults to [{ message }]
			expect(error.issues).toEqual([{ message: 'Validation failed' }])
		})

		test('creates error from single issue', () => {
			const issues: ValidationIssue[] = [{ message: 'Single error' }]
			const error = ValidationError.fromIssues(issues)
			expect(error.message).toBe('Single error')
		})

		test('creates error from multiple issues', () => {
			const issues: ValidationIssue[] = [{ message: 'Error 1' }, { message: 'Error 2' }, { message: 'Error 3' }]
			const error = ValidationError.fromIssues(issues)
			expect(error.message).toBe('3 validation errors')
			expect(error.issues).toEqual(issues)
		})
	})

	describe('format', () => {
		test('formats single issue without path', () => {
			const error = new ValidationError('Simple error')
			expect(error.format()).toBe('Simple error')
		})

		test('formats single issue with path', () => {
			const error = new ValidationError('Field error', [{ message: 'Required', path: ['name'] }])
			expect(error.format()).toBe('name: Required')
		})

		test('formats nested path', () => {
			const error = new ValidationError('Nested error', [{ message: 'Invalid', path: ['user', 'address', 'city'] }])
			expect(error.format()).toBe('user.address.city: Invalid')
		})

		test('formats array index in path', () => {
			const error = new ValidationError('Array error', [{ message: 'Invalid item', path: ['items', 2, 'name'] }])
			expect(error.format()).toBe('items[2].name: Invalid item')
		})

		test('formats multiple issues', () => {
			const error = new ValidationError('Multiple', [
				{ message: 'Required', path: ['name'] },
				{ message: 'Invalid', path: ['age'] },
				{ message: 'Root error' },
			])
			expect(error.format()).toBe('name: Required\nage: Invalid\nRoot error')
		})

		test('formats path starting with array index', () => {
			const error = new ValidationError('Array', [{ message: 'Error', path: [0, 'field'] }])
			expect(error.format()).toBe('[0].field: Error')
		})

		test('formats multiple consecutive array indices', () => {
			const error = new ValidationError('Array', [{ message: 'Error', path: ['matrix', 0, 1] }])
			expect(error.format()).toBe('matrix[0][1]: Error')
		})
	})

	describe('flatten', () => {
		test('flattens issues without path to root', () => {
			const error = new ValidationError('Multiple', [{ message: 'Error 1' }, { message: 'Error 2' }])
			const result = error.flatten()
			expect(result.root).toEqual(['Error 1', 'Error 2'])
			expect(result.nested).toEqual({})
		})

		test('flattens issues with path to nested', () => {
			const error = new ValidationError('Multiple', [
				{ message: 'Required', path: ['name'] },
				{ message: 'Invalid', path: ['email'] },
			])
			const result = error.flatten()
			expect(result.root).toEqual([])
			expect(result.nested).toEqual({
				name: ['Required'],
				email: ['Invalid'],
			})
		})

		test('flattens mixed root and nested', () => {
			const error = new ValidationError('Multiple', [
				{ message: 'Root error' },
				{ message: 'Field error', path: ['field'] },
			])
			const result = error.flatten()
			expect(result.root).toEqual(['Root error'])
			expect(result.nested).toEqual({ field: ['Field error'] })
		})

		test('accumulates multiple errors on same path', () => {
			const error = new ValidationError('Multiple', [
				{ message: 'Too short', path: ['password'] },
				{ message: 'Needs number', path: ['password'] },
				{ message: 'Needs special char', path: ['password'] },
			])
			const result = error.flatten()
			expect(result.nested).toEqual({
				password: ['Too short', 'Needs number', 'Needs special char'],
			})
		})

		test('formats array indices in flattened path', () => {
			const error = new ValidationError('Array', [{ message: 'Error', path: ['items', 0, 'name'] }])
			const result = error.flatten()
			expect(result.nested).toEqual({ 'items[0].name': ['Error'] })
		})

		test('handles empty path array as root', () => {
			const error = new ValidationError('Error', [{ message: 'Empty path', path: [] }])
			const result = error.flatten()
			expect(result.root).toEqual(['Empty path'])
		})
	})
})

describe('ValiError alias', () => {
	test('ValiError is same as ValidationError', () => {
		expect(ValiError).toBe(ValidationError)
	})

	test('can use ValiError interchangeably', () => {
		const error = new ValiError('Test')
		expect(error).toBeInstanceOf(ValidationError)
		expect(error.name).toBe('ValidationError')
	})
})

describe('ValidationIssue interface', () => {
	test('minimal issue only needs message', () => {
		const issue: ValidationIssue = { message: 'Error' }
		expect(issue.message).toBe('Error')
		expect(issue.path).toBeUndefined()
	})

	test('full issue with all fields', () => {
		const issue: ValidationIssue = {
			message: 'Invalid type',
			path: ['user', 'age'],
			input: 'not a number',
			expected: 'number',
			received: 'string',
		}
		expect(issue.message).toBe('Invalid type')
		expect(issue.path).toEqual(['user', 'age'])
		expect(issue.input).toBe('not a number')
		expect(issue.expected).toBe('number')
		expect(issue.received).toBe('string')
	})
})
