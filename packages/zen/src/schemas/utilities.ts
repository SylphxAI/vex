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
