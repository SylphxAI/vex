import { SchemaError } from '../errors'
import type { AnySchema, BaseSchema, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Preprocess - Transform before validation
// ============================================================

export function preprocess<TInput, TOutput>(
	preprocessFn: (data: unknown) => unknown,
	schema: BaseSchema<TInput, TOutput>
): BaseSchema<unknown, TOutput> {
	const safeParse = (data: unknown): Result<TOutput> => {
		const processed = preprocessFn(data)
		return schema.safeParse(processed)
	}

	return {
		_input: undefined as unknown as unknown,
		_output: undefined as unknown as TOutput,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: unknown; output: TOutput },
		},
		parse(data: unknown): TOutput {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParse,
		parseAsync: async (data) => {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParseAsync: async (data) => safeParse(data),
	}
}

// ============================================================
// Intersection - Combine schemas (both must pass)
// ============================================================

export interface IntersectionSchema<
	TLeft extends AnySchema,
	TRight extends AnySchema,
> extends BaseSchema<TLeft['_input'] & TRight['_input'], TLeft['_output'] & TRight['_output']> {
	readonly left: TLeft
	readonly right: TRight
}

export function intersection<TLeft extends AnySchema, TRight extends AnySchema>(
	left: TLeft,
	right: TRight
): IntersectionSchema<TLeft, TRight> {
	type TInput = TLeft['_input'] & TRight['_input']
	type TOutput = TLeft['_output'] & TRight['_output']

	const safeParse = (data: unknown): Result<TOutput> => {
		const leftResult = left.safeParse(data)
		if (!leftResult.success) return leftResult as Result<TOutput>

		const rightResult = right.safeParse(data)
		if (!rightResult.success) return rightResult as Result<TOutput>

		// Merge the results
		if (typeof leftResult.data === 'object' && typeof rightResult.data === 'object') {
			return {
				success: true,
				data: { ...leftResult.data, ...rightResult.data } as TOutput,
			}
		}

		return { success: true, data: leftResult.data as TOutput }
	}

	return {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		left,
		right,
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput; output: TOutput },
		},
		parse(data: unknown): TOutput {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParse,
		parseAsync: async (data) => {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParseAsync: async (data) => safeParse(data),
	}
}

// ============================================================
// Promise Schema
// ============================================================

export interface PromiseSchema<T extends AnySchema>
	extends BaseSchema<Promise<T['_input']>, Promise<T['_output']>> {
	readonly innerSchema: T
}

export function promise<T extends AnySchema>(schema: T): PromiseSchema<T> {
	type TInput = Promise<T['_input']>
	type TOutput = Promise<T['_output']>

	const safeParse = (data: unknown): Result<TOutput> => {
		if (!(data instanceof Promise)) {
			return { success: false, issues: [{ message: 'Expected Promise' }] }
		}
		// Return a promise that validates when resolved
		const validated = data.then((value) => schema.parse(value)) as TOutput
		return { success: true, data: validated }
	}

	return {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		innerSchema: schema,
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput; output: TOutput },
		},
		parse(data: unknown): TOutput {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParse,
		parseAsync: async (data) => {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParseAsync: async (data) => safeParse(data),
	}
}

// ============================================================
// Function Schema
// ============================================================

export interface FunctionSchema<TArgs extends AnySchema, TReturn extends AnySchema>
	extends BaseSchema<
		(...args: TArgs['_input'][]) => TReturn['_input'],
		(...args: TArgs['_output'][]) => TReturn['_output']
	> {
	readonly args: TArgs
	readonly returns: TReturn
	implement<F extends (...args: TArgs['_output'][]) => TReturn['_input']>(fn: F): F
}

export function function_<TArgs extends AnySchema = BaseSchema<unknown, unknown>, TReturn extends AnySchema = BaseSchema<unknown, unknown>>(
	args?: TArgs,
	returns?: TReturn
): FunctionSchema<TArgs, TReturn> {
	type TInput = (...args: TArgs['_input'][]) => TReturn['_input']
	type TOutput = (...args: TArgs['_output'][]) => TReturn['_output']

	const safeParse = (data: unknown): Result<TOutput> => {
		if (typeof data !== 'function') {
			return { success: false, issues: [{ message: 'Expected function' }] }
		}
		return { success: true, data: data as TOutput }
	}

	return {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		args: args as TArgs,
		returns: returns as TReturn,
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput; output: TOutput },
		},
		parse(data: unknown): TOutput {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParse,
		parseAsync: async (data) => {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParseAsync: async (data) => safeParse(data),
		implement<F extends (...args: TArgs['_output'][]) => TReturn['_input']>(fn: F): F {
			return fn
		},
	}
}

// ============================================================
// Map Schema
// ============================================================

export interface MapSchema<TKey extends AnySchema, TValue extends AnySchema>
	extends BaseSchema<Map<TKey['_input'], TValue['_input']>, Map<TKey['_output'], TValue['_output']>> {
	readonly keySchema: TKey
	readonly valueSchema: TValue
}

export function map<TKey extends AnySchema, TValue extends AnySchema>(
	keySchema: TKey,
	valueSchema: TValue
): MapSchema<TKey, TValue> {
	type TInput = Map<TKey['_input'], TValue['_input']>
	type TOutput = Map<TKey['_output'], TValue['_output']>

	const safeParse = (data: unknown): Result<TOutput> => {
		if (!(data instanceof Map)) {
			return { success: false, issues: [{ message: 'Expected Map' }] }
		}

		const result = new Map<TKey['_output'], TValue['_output']>()
		const issues: Array<{ message: string; path?: PropertyKey[] }> = []

		for (const [key, value] of data) {
			const keyResult = keySchema.safeParse(key)
			if (!keyResult.success) {
				for (const issue of keyResult.issues) {
					issues.push(toStandardIssue(issue))
				}
				continue
			}

			const valueResult = valueSchema.safeParse(value)
			if (!valueResult.success) {
				for (const issue of valueResult.issues) {
					issues.push({
						message: issue.message,
						path: [key, ...(issue.path ?? [])],
					})
				}
				continue
			}

			result.set(keyResult.data, valueResult.data)
		}

		if (issues.length > 0) {
			return { success: false, issues }
		}

		return { success: true, data: result }
	}

	return {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		keySchema,
		valueSchema,
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput; output: TOutput },
		},
		parse(data: unknown): TOutput {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParse,
		parseAsync: async (data) => {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParseAsync: async (data) => safeParse(data),
	}
}

// ============================================================
// Set Schema
// ============================================================

export interface SetSchema<T extends AnySchema>
	extends BaseSchema<Set<T['_input']>, Set<T['_output']>> {
	readonly valueSchema: T
	min(size: number, message?: string): SetSchema<T>
	max(size: number, message?: string): SetSchema<T>
	size(size: number, message?: string): SetSchema<T>
	nonempty(message?: string): SetSchema<T>
}

export function set<T extends AnySchema>(valueSchema: T): SetSchema<T> {
	type TInput = Set<T['_input']>
	type TOutput = Set<T['_output']>

	const createSetSchema = (
		checks: Array<{ check: (s: Set<unknown>) => boolean; message: string }> = []
	): SetSchema<T> => {
		const safeParse = (data: unknown): Result<TOutput> => {
			if (!(data instanceof Set)) {
				return { success: false, issues: [{ message: 'Expected Set' }] }
			}

			// Run size checks
			for (const check of checks) {
				if (!check.check(data)) {
					return { success: false, issues: [{ message: check.message }] }
				}
			}

			const result = new Set<T['_output']>()
			const issues: Array<{ message: string }> = []

			for (const value of data) {
				const valueResult = valueSchema.safeParse(value)
				if (!valueResult.success) {
					for (const issue of valueResult.issues) {
						issues.push(toStandardIssue(issue))
					}
					continue
				}
				result.add(valueResult.data)
			}

			if (issues.length > 0) {
				return { success: false, issues }
			}

			return { success: true, data: result }
		}

		return {
			_input: undefined as unknown as TInput,
			_output: undefined as unknown as TOutput,
			_checks: [],
			valueSchema,
			'~standard': {
				version: 1,
				vendor: 'zen',
				validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
					const result = safeParse(value)
					if (result.success) return { value: result.data }
					return { issues: result.issues.map(toStandardIssue) }
				},
				types: undefined as unknown as { input: TInput; output: TOutput },
			},
			parse(data: unknown): TOutput {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParse,
			parseAsync: async (data) => {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParseAsync: async (data) => safeParse(data),
			min(size: number, message = `Set must have at least ${size} items`) {
				return createSetSchema([...checks, { check: (s) => s.size >= size, message }])
			},
			max(size: number, message = `Set must have at most ${size} items`) {
				return createSetSchema([...checks, { check: (s) => s.size <= size, message }])
			},
			size(size: number, message = `Set must have exactly ${size} items`) {
				return createSetSchema([...checks, { check: (s) => s.size === size, message }])
			},
			nonempty(message = 'Set must not be empty') {
				return createSetSchema([...checks, { check: (s) => s.size > 0, message }])
			},
		}
	}

	return createSetSchema()
}

// ============================================================
// Instanceof Schema
// ============================================================

// biome-ignore lint/suspicious/noExplicitAny: need any for constructor type
type Constructor<T = unknown> = new (...args: any[]) => T

export function instanceof_<T extends Constructor>(
	cls: T
): BaseSchema<InstanceType<T>, InstanceType<T>> {
	type TOutput = InstanceType<T>

	const safeParse = (data: unknown): Result<TOutput> => {
		if (data instanceof cls) {
			return { success: true, data: data as TOutput }
		}
		return { success: false, issues: [{ message: `Expected instance of ${cls.name}` }] }
	}

	return {
		_input: undefined as unknown as TOutput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TOutput; output: TOutput },
		},
		parse(data: unknown): TOutput {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParse,
		parseAsync: async (data) => {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParseAsync: async (data) => safeParse(data),
	}
}

// ============================================================
// Pipe - Chain schemas together
// ============================================================

export function pipe<A extends AnySchema, B extends AnySchema>(
	first: A,
	second: B
): BaseSchema<A['_input'], B['_output']> {
	type TInput = A['_input']
	type TOutput = B['_output']

	const safeParse = (data: unknown): Result<TOutput> => {
		const firstResult = first.safeParse(data)
		if (!firstResult.success) return firstResult as Result<TOutput>
		return second.safeParse(firstResult.data)
	}

	return {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput; output: TOutput },
		},
		parse(data: unknown): TOutput {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParse,
		parseAsync: async (data) => {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParseAsync: async (data) => safeParse(data),
	}
}

// ============================================================
// Or - Union shorthand (alias)
// ============================================================

export function or<T extends AnySchema[]>(
	...schemas: T
): BaseSchema<T[number]['_input'], T[number]['_output']> {
	type TInput = T[number]['_input']
	type TOutput = T[number]['_output']

	const safeParse = (data: unknown): Result<TOutput> => {
		for (const schema of schemas) {
			const result = schema.safeParse(data)
			if (result.success) {
				return result as Result<TOutput>
			}
		}
		return { success: false, issues: [{ message: 'None of the union types matched' }] }
	}

	return {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput; output: TOutput },
		},
		parse(data: unknown): TOutput {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParse,
		parseAsync: async (data) => {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParseAsync: async (data) => safeParse(data),
	}
}

// ============================================================
// And - Intersection shorthand (alias)
// ============================================================

export function and<A extends AnySchema, B extends AnySchema>(
	left: A,
	right: B
): BaseSchema<A['_input'] & B['_input'], A['_output'] & B['_output']> {
	// Re-use intersection implementation
	return intersection(left, right)
}
