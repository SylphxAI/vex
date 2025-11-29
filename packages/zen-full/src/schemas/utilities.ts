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
	/** Get the key and value schemas */
	unwrap(): { key: TKey; value: TValue }
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
		unwrap(): { key: TKey; value: TValue } {
			return { key: keySchema, value: valueSchema }
		},
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
	/** Get the underlying value schema */
	unwrap(): T
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
			unwrap(): T {
				return valueSchema
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

// ============================================================
// JSON Schema - Parse JSON strings
// ============================================================

export interface JsonSchema<T extends AnySchema>
	extends BaseSchema<string, T['_output']> {
	readonly schema: T
}

export function json<T extends AnySchema>(schema: T): JsonSchema<T> {
	type TOutput = T['_output']

	const safeParse = (data: unknown): Result<TOutput> => {
		if (typeof data !== 'string') {
			return { success: false, issues: [{ message: 'Expected JSON string' }] }
		}

		let parsed: unknown
		try {
			parsed = JSON.parse(data)
		} catch {
			return { success: false, issues: [{ message: 'Invalid JSON' }] }
		}

		return schema.safeParse(parsed)
	}

	return {
		_input: undefined as unknown as string,
		_output: undefined as unknown as TOutput,
		_checks: [],
		schema,
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: string; output: TOutput },
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
// Int Schema - Integer validation
// ============================================================

export interface IntSchema extends BaseSchema<number, number> {
	min(value: number, message?: string): IntSchema
	max(value: number, message?: string): IntSchema
	positive(message?: string): IntSchema
	negative(message?: string): IntSchema
	nonnegative(message?: string): IntSchema
	nonpositive(message?: string): IntSchema
	multipleOf(value: number, message?: string): IntSchema
	optional(): BaseSchema<number | undefined, number | undefined>
	nullable(): BaseSchema<number | null, number | null>
}

function createIntSchema(
	checks: Array<{ check: (n: number) => boolean; message: string }> = [],
	is32Bit = false
): IntSchema {
	const safeParse = (data: unknown): Result<number> => {
		if (typeof data !== 'number') {
			return { success: false, issues: [{ message: 'Expected number' }] }
		}
		if (!Number.isInteger(data)) {
			return { success: false, issues: [{ message: 'Expected integer' }] }
		}
		// Zod v4: reject unsafe integers
		if (!Number.isSafeInteger(data)) {
			return { success: false, issues: [{ message: 'Integer out of safe range' }] }
		}
		if (is32Bit && (data < -2147483648 || data > 2147483647)) {
			return { success: false, issues: [{ message: 'Expected 32-bit integer' }] }
		}

		for (const check of checks) {
			if (!check.check(data)) {
				return { success: false, issues: [{ message: check.message }] }
			}
		}

		return { success: true, data }
	}

	const schema: IntSchema = {
		_input: undefined as unknown as number,
		_output: undefined as unknown as number,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: number } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: number; output: number },
		},
		parse(data: unknown): number {
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
		min(value: number, message = `Must be at least ${value}`) {
			return createIntSchema([...checks, { check: (n) => n >= value, message }], is32Bit)
		},
		max(value: number, message = `Must be at most ${value}`) {
			return createIntSchema([...checks, { check: (n) => n <= value, message }], is32Bit)
		},
		positive(message = 'Must be positive') {
			return createIntSchema([...checks, { check: (n) => n > 0, message }], is32Bit)
		},
		negative(message = 'Must be negative') {
			return createIntSchema([...checks, { check: (n) => n < 0, message }], is32Bit)
		},
		nonnegative(message = 'Must be non-negative') {
			return createIntSchema([...checks, { check: (n) => n >= 0, message }], is32Bit)
		},
		nonpositive(message = 'Must be non-positive') {
			return createIntSchema([...checks, { check: (n) => n <= 0, message }], is32Bit)
		},
		multipleOf(value: number, message = `Must be a multiple of ${value}`) {
			return createIntSchema([...checks, { check: (n) => n % value === 0, message }], is32Bit)
		},
		optional() {
			return {
				_input: undefined as unknown as number | undefined,
				_output: undefined as unknown as number | undefined,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						if (v === undefined) return { value: undefined }
						const result = safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues.map(toStandardIssue) }
					},
					types: undefined as unknown as { input: number | undefined; output: number | undefined },
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown) => (v === undefined ? { success: true, data: undefined } : safeParse(v)),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown) => (v === undefined ? { success: true, data: undefined } : safeParse(v)),
			}
		},
		nullable() {
			return {
				_input: undefined as unknown as number | null,
				_output: undefined as unknown as number | null,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						if (v === null) return { value: null }
						const result = safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues.map(toStandardIssue) }
					},
					types: undefined as unknown as { input: number | null; output: number | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown) => (v === null ? { success: true, data: null } : safeParse(v)),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown) => (v === null ? { success: true, data: null } : safeParse(v)),
			}
		},
	}

	return schema
}

export function int(): IntSchema {
	return createIntSchema()
}

export function int32(): IntSchema {
	return createIntSchema([], true)
}

// ============================================================
// ISO Namespace - Date/time string schemas
// ============================================================

const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const ISO_TIME_REGEX = /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/

function createIsoSchema(
	name: string,
	regex: RegExp,
	errorMessage: string
): BaseSchema<string, string> {
	const safeParse = (data: unknown): Result<string> => {
		if (typeof data !== 'string') {
			return { success: false, issues: [{ message: 'Expected string' }] }
		}
		if (!regex.test(data)) {
			return { success: false, issues: [{ message: errorMessage }] }
		}
		return { success: true, data }
	}

	return {
		_input: undefined as unknown as string,
		_output: undefined as unknown as string,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: string } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: string; output: string },
		},
		parse(data: unknown): string {
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

export const iso = {
	datetime: () => createIsoSchema('datetime', ISO_DATETIME_REGEX, 'Invalid ISO datetime'),
	date: () => createIsoSchema('date', ISO_DATE_REGEX, 'Invalid ISO date'),
	time: () => createIsoSchema('time', ISO_TIME_REGEX, 'Invalid ISO time'),
} as const

// ============================================================
// Prefault - Set default value before validation
// ============================================================

export function prefault<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	defaultValue: TInput | (() => TInput)
): BaseSchema<TInput | undefined | null, TOutput> {
	const getDefault = (): TInput =>
		typeof defaultValue === 'function' ? (defaultValue as () => TInput)() : defaultValue

	const safeParse = (data: unknown): Result<TOutput> => {
		const value = data === undefined || data === null ? getDefault() : data
		return schema.safeParse(value)
	}

	return {
		_input: undefined as unknown as TInput | undefined | null,
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
			types: undefined as unknown as { input: TInput | undefined | null; output: TOutput },
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
// Check - Add validation without modifying the schema type
// ============================================================

export function check<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	checkFn: (data: TOutput) => boolean,
	message = 'Validation failed'
): BaseSchema<TInput, TOutput> {
	const safeParse = (data: unknown): Result<TOutput> => {
		const result = schema.safeParse(data)
		if (!result.success) return result

		if (!checkFn(result.data)) {
			return { success: false, issues: [{ message }] }
		}

		return result
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
// Top-level Format Validators
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
// UUID version-specific regexes
const UUID_V1_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_V2_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-2[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_V3_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_V6_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-6[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const URL_REGEX = /^https?:\/\/.+/
const HTTP_URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
const IPV6_REGEX = /^(?:(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,7}:|(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}|(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}|(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}|(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}|[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,6}|:(?:(?::[a-fA-F0-9]{1,4}){1,7}|:)|fe80:(?::[a-fA-F0-9]{0,4}){0,4}%[0-9a-zA-Z]+|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])|(?:[a-fA-F0-9]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9]))$/

// Hash regexes
const MD5_REGEX = /^[a-f0-9]{32}$/i
const SHA1_REGEX = /^[a-f0-9]{40}$/i
const SHA256_REGEX = /^[a-f0-9]{64}$/i
const SHA384_REGEX = /^[a-f0-9]{96}$/i
const SHA512_REGEX = /^[a-f0-9]{128}$/i

function createFormatSchema(
	name: string,
	regex: RegExp,
	errorMessage: string
): BaseSchema<string, string> {
	const safeParse = (data: unknown): Result<string> => {
		if (typeof data !== 'string') {
			return { success: false, issues: [{ message: 'Expected string' }] }
		}
		if (!regex.test(data)) {
			return { success: false, issues: [{ message: errorMessage }] }
		}
		return { success: true, data }
	}

	return {
		_input: undefined as unknown as string,
		_output: undefined as unknown as string,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: string } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: string; output: string },
		},
		parse(data: unknown): string {
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

/** Standalone email schema */
export function email(message?: string): BaseSchema<string, string> {
	return createFormatSchema('email', EMAIL_REGEX, message ?? 'Invalid email address')
}

/** Standalone UUID schema */
export function uuid(message?: string): BaseSchema<string, string> {
	return createFormatSchema('uuid', UUID_REGEX, message ?? 'Invalid UUID')
}

/** UUID v1 schema */
export function uuidv1(message?: string): BaseSchema<string, string> {
	return createFormatSchema('uuidv1', UUID_V1_REGEX, message ?? 'Invalid UUID v1')
}

/** UUID v2 schema */
export function uuidv2(message?: string): BaseSchema<string, string> {
	return createFormatSchema('uuidv2', UUID_V2_REGEX, message ?? 'Invalid UUID v2')
}

/** UUID v3 schema */
export function uuidv3(message?: string): BaseSchema<string, string> {
	return createFormatSchema('uuidv3', UUID_V3_REGEX, message ?? 'Invalid UUID v3')
}

/** UUID v4 schema */
export function uuidv4(message?: string): BaseSchema<string, string> {
	return createFormatSchema('uuidv4', UUID_V4_REGEX, message ?? 'Invalid UUID v4')
}

/** UUID v5 schema */
export function uuidv5(message?: string): BaseSchema<string, string> {
	return createFormatSchema('uuidv5', UUID_V5_REGEX, message ?? 'Invalid UUID v5')
}

/** UUID v6 schema */
export function uuidv6(message?: string): BaseSchema<string, string> {
	return createFormatSchema('uuidv6', UUID_V6_REGEX, message ?? 'Invalid UUID v6')
}

/** UUID v7 schema */
export function uuidv7(message?: string): BaseSchema<string, string> {
	return createFormatSchema('uuidv7', UUID_V7_REGEX, message ?? 'Invalid UUID v7')
}

/** Standalone URL schema */
export function url(message?: string): BaseSchema<string, string> {
	return createFormatSchema('url', URL_REGEX, message ?? 'Invalid URL')
}

/** HTTP/HTTPS URL schema */
export function httpUrl(message?: string): BaseSchema<string, string> {
	return createFormatSchema('httpUrl', HTTP_URL_REGEX, message ?? 'Invalid HTTP URL')
}

/** Standalone IPv4 schema */
export function ipv4(message?: string): BaseSchema<string, string> {
	return createFormatSchema('ipv4', IPV4_REGEX, message ?? 'Invalid IPv4 address')
}

/** Standalone IPv6 schema */
export function ipv6(message?: string): BaseSchema<string, string> {
	return createFormatSchema('ipv6', IPV6_REGEX, message ?? 'Invalid IPv6 address')
}

/** Hash validation schema */
export function hash(
	algorithm: 'md5' | 'sha1' | 'sha256' | 'sha384' | 'sha512',
	message?: string
): BaseSchema<string, string> {
	const regexMap = {
		md5: MD5_REGEX,
		sha1: SHA1_REGEX,
		sha256: SHA256_REGEX,
		sha384: SHA384_REGEX,
		sha512: SHA512_REGEX,
	}
	return createFormatSchema(
		'hash',
		regexMap[algorithm],
		message ?? `Invalid ${algorithm.toUpperCase()} hash`
	)
}

// ============================================================
// Codec - Bidirectional transforms
// ============================================================

export interface Codec<TInput, TOutput> extends BaseSchema<TInput, TOutput> {
	encode(data: TOutput): TInput
}

export function codec<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	encode: (data: TOutput) => TInput
): Codec<TInput, TOutput> {
	return {
		...schema,
		encode,
	}
}

// ============================================================
// File Schema - For File/Blob validation
// ============================================================

export interface FileSchema extends BaseSchema<File | Blob, File | Blob> {
	minSize(bytes: number, message?: string): FileSchema
	maxSize(bytes: number, message?: string): FileSchema
	mimeType(types: string | string[], message?: string): FileSchema
}

function createFileSchema(
	checks: Array<{ check: (f: File | Blob) => boolean; message: string }> = []
): FileSchema {
	const safeParse = (data: unknown): Result<File | Blob> => {
		// Check for Blob (File extends Blob)
		if (typeof Blob !== 'undefined' && data instanceof Blob) {
			for (const check of checks) {
				if (!check.check(data)) {
					return { success: false, issues: [{ message: check.message }] }
				}
			}
			return { success: true, data }
		}
		return { success: false, issues: [{ message: 'Expected File or Blob' }] }
	}

	const schema: FileSchema = {
		_input: undefined as unknown as File | Blob,
		_output: undefined as unknown as File | Blob,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: File | Blob } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: File | Blob; output: File | Blob },
		},
		parse(data: unknown): File | Blob {
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
		minSize(bytes: number, message = `File must be at least ${bytes} bytes`) {
			return createFileSchema([...checks, { check: (f) => f.size >= bytes, message }])
		},
		maxSize(bytes: number, message = `File must be at most ${bytes} bytes`) {
			return createFileSchema([...checks, { check: (f) => f.size <= bytes, message }])
		},
		mimeType(types: string | string[], message?: string) {
			const typeArray = Array.isArray(types) ? types : [types]
			const defaultMsg = `File must be of type: ${typeArray.join(', ')}`
			return createFileSchema([
				...checks,
				{ check: (f) => typeArray.includes(f.type), message: message ?? defaultMsg },
			])
		},
	}

	return schema
}

export function file(): FileSchema {
	return createFileSchema()
}

// ============================================================
// Template Literal Schema
// ============================================================

export function templateLiteral<T extends string>(
	strings: TemplateStringsArray,
	...schemas: BaseSchema<string, string>[]
): BaseSchema<string, string> {
	const safeParse = (data: unknown): Result<string> => {
		if (typeof data !== 'string') {
			return { success: false, issues: [{ message: 'Expected string' }] }
		}

		// Build a regex pattern from the template
		let pattern = '^'
		for (let i = 0; i < strings.length; i++) {
			// Escape regex special chars in literal parts
			pattern += strings[i]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			if (i < schemas.length) {
				// For simplicity, match any string segment (can be enhanced)
				pattern += '(.+?)'
			}
		}
		pattern += '$'

		const regex = new RegExp(pattern)
		const match = data.match(regex)

		if (!match) {
			return { success: false, issues: [{ message: 'Does not match template pattern' }] }
		}

		// Validate each captured group with corresponding schema
		for (let i = 0; i < schemas.length; i++) {
			const captured = match[i + 1]
			if (captured === undefined) {
				return { success: false, issues: [{ message: `Missing segment ${i + 1}` }] }
			}
			const result = schemas[i]!.safeParse(captured)
			if (!result.success) {
				return result
			}
		}

		return { success: true, data }
	}

	return {
		_input: undefined as unknown as string,
		_output: undefined as unknown as string,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: string } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: string; output: string },
		},
		parse(data: unknown): string {
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
// Partial Record Schema
// ============================================================

export function partialRecord<K extends BaseSchema<string, string>, V extends AnySchema>(
	keySchema: K,
	valueSchema: V
): BaseSchema<Partial<Record<K['_output'], V['_input']>>, Partial<Record<K['_output'], V['_output']>>> {
	type TInput = Partial<Record<K['_output'], V['_input']>>
	type TOutput = Partial<Record<K['_output'], V['_output']>>

	const safeParse = (data: unknown): Result<TOutput> => {
		if (typeof data !== 'object' || data === null || Array.isArray(data)) {
			return { success: false, issues: [{ message: 'Expected object' }] }
		}

		const result: Record<string, V['_output']> = {}
		const issues: Array<{ message: string; path?: PropertyKey[] }> = []

		for (const [key, value] of Object.entries(data)) {
			// Validate key
			const keyResult = keySchema.safeParse(key)
			if (!keyResult.success) {
				for (const issue of keyResult.issues) {
					issues.push({ message: issue.message, path: [key] })
				}
				continue
			}

			// Value can be undefined in partial record
			if (value === undefined) {
				continue
			}

			// Validate value
			const valueResult = valueSchema.safeParse(value)
			if (!valueResult.success) {
				for (const issue of valueResult.issues) {
					issues.push({ message: issue.message, path: [key, ...(issue.path ?? [])] })
				}
				continue
			}

			result[keyResult.data] = valueResult.data
		}

		if (issues.length > 0) {
			return { success: false, issues }
		}

		return { success: true, data: result as TOutput }
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
// Interface Schema - Zod v4 precise optional property control
// ============================================================

type AnyInterfaceSchema = BaseSchema<unknown, unknown>

// Helper type to mark a property as optional (key can be omitted)
// biome-ignore lint/suspicious/noExplicitAny: extends base schema with optional marker
export interface OptionalProperty<T extends AnyInterfaceSchema> extends BaseSchema<any, any> {
	readonly _optional: true
	readonly schema: T
}

// Helper to create optional property marker
export function optionalProp<T extends AnyInterfaceSchema>(schema: T): OptionalProperty<T> {
	// Create a wrapper that extends the schema with the optional marker
	return {
		...schema,
		_optional: true as const,
		schema,
	} as OptionalProperty<T>
}

export type InterfaceShape = Record<string, AnyInterfaceSchema>

// Infer input type for interface schema
type InferInterfaceInput<T extends InterfaceShape> = {
	[K in keyof T as T[K] extends OptionalProperty<AnyInterfaceSchema> ? never : K]: T[K]['_input']
} & {
	[K in keyof T as T[K] extends OptionalProperty<AnyInterfaceSchema> ? K : never]?: T[K] extends OptionalProperty<
		infer S
	>
		? S['_input']
		: never
}

// Infer output type for interface schema
type InferInterfaceOutput<T extends InterfaceShape> = {
	[K in keyof T as T[K] extends OptionalProperty<AnyInterfaceSchema> ? never : K]: T[K]['_output']
} & {
	[K in keyof T as T[K] extends OptionalProperty<AnyInterfaceSchema> ? K : never]?: T[K] extends OptionalProperty<
		infer S
	>
		? S['_output']
		: never
}

export interface InterfaceSchema<T extends InterfaceShape>
	extends BaseSchema<InferInterfaceInput<T>, InferInterfaceOutput<T>> {
	readonly shape: T
	// biome-ignore lint/suspicious/noExplicitAny: complex type transformation
	partial(): InterfaceSchema<any>
	// biome-ignore lint/suspicious/noExplicitAny: complex type transformation
	required(): InterfaceSchema<any>
	pick<K extends keyof T>(keys: K[]): InterfaceSchema<Pick<T, K>>
	omit<K extends keyof T>(keys: K[]): InterfaceSchema<Omit<T, K>>
	extend<E extends InterfaceShape>(extension: E): InterfaceSchema<T & E>
}

/**
 * Create an interface schema with precise optional property control
 * Use optionalProp() wrapper for properties that can be omitted
 */
export function interface_<T extends InterfaceShape>(shape: T): InterfaceSchema<T> {
	type TInput = InferInterfaceInput<T>
	type TOutput = InferInterfaceOutput<T>

	const shapeKeys = Object.keys(shape)
	const optionalKeys = new Set<string>()
	const schemas: Record<string, AnyInterfaceSchema> = {}

	for (const key of shapeKeys) {
		const value = shape[key]!
		if ((value as OptionalProperty<AnyInterfaceSchema>)._optional) {
			optionalKeys.add(key)
			schemas[key] = (value as OptionalProperty<AnyInterfaceSchema>).schema
		} else {
			schemas[key] = value as AnyInterfaceSchema
		}
	}

	const isObject = (v: unknown): v is Record<string, unknown> =>
		typeof v === 'object' && v !== null && !Array.isArray(v)

	const safeParse = (data: unknown): Result<TOutput> => {
		if (!isObject(data)) {
			return { success: false, issues: [{ message: 'Expected object' }] }
		}

		let issues: Array<{ message: string; path?: PropertyKey[] }> | null = null
		let output: Record<string, unknown> | null = null
		let hasTransform = false

		for (const key of shapeKeys) {
			const fieldSchema = schemas[key]!
			const isOptionalKey = optionalKeys.has(key)
			const hasKey = key in data

			// For optional keys, missing is OK
			if (!hasKey && isOptionalKey) {
				continue
			}

			// For required keys, missing is an error
			if (!hasKey && !isOptionalKey) {
				if (!issues) issues = []
				issues.push({ message: 'Required', path: [key] })
				continue
			}

			const value = data[key]
			const result = fieldSchema.safeParse(value)

			if (result.success) {
				if (result.data !== value || hasTransform) {
					if (!output) {
						output = {}
						// Copy already processed values
						for (const k of shapeKeys) {
							if (k === key) break
							if (k in data) output[k] = data[k]
						}
					}
					output[key] = result.data
					hasTransform = true
				} else if (output) {
					output[key] = result.data
				}
			} else {
				if (!issues) issues = []
				for (const issue of result.issues) {
					issues.push({
						message: issue.message,
						path: [key, ...(issue.path ?? [])],
					})
				}
			}
		}

		if (issues) {
			return { success: false, issues }
		}

		return { success: true, data: (output ?? data) as TOutput }
	}

	const interfaceSchema: InterfaceSchema<T> = {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		shape,

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

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return safeParse(data)
		},

		partial() {
			const partialShape: InterfaceShape = {}
			for (const key of shapeKeys) {
				const value = shape[key]!
				if ((value as OptionalProperty<AnyInterfaceSchema>)._optional) {
					partialShape[key] = value
				} else {
					partialShape[key] = optionalProp(value as AnyInterfaceSchema)
				}
			}
			// biome-ignore lint/suspicious/noExplicitAny: complex type transformation
			return interface_(partialShape) as any
		},

		required() {
			const requiredShape: InterfaceShape = {}
			for (const key of shapeKeys) {
				const value = shape[key]!
				if ((value as OptionalProperty<AnyInterfaceSchema>)._optional) {
					requiredShape[key] = (value as OptionalProperty<AnyInterfaceSchema>).schema
				} else {
					requiredShape[key] = value
				}
			}
			// biome-ignore lint/suspicious/noExplicitAny: complex type transformation
			return interface_(requiredShape) as any
		},

		pick<K extends keyof T>(keys: K[]): InterfaceSchema<Pick<T, K>> {
			const pickedShape = {} as Pick<T, K>
			for (const key of keys) {
				if (key in shape) {
					pickedShape[key] = shape[key]!
				}
			}
			return interface_(pickedShape)
		},

		omit<K extends keyof T>(keys: K[]): InterfaceSchema<Omit<T, K>> {
			const omitSet = new Set<PropertyKey>(keys)
			const omittedShape = {} as Omit<T, K>
			for (const key of shapeKeys) {
				if (!omitSet.has(key)) {
					;(omittedShape as Record<string, unknown>)[key] = shape[key]
				}
			}
			return interface_(omittedShape)
		},

		extend<E extends InterfaceShape>(extension: E): InterfaceSchema<T & E> {
			return interface_({ ...shape, ...extension })
		},
	}

	return interfaceSchema
}
