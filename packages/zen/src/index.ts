// ============================================================
// 🧘 Zen Mini - Ultra-lightweight schema validation
// Tree-shakable functional API (~2KB gzipped)
// ============================================================

// ============================================================
// Core Types
// ============================================================

export interface Issue {
	readonly message: string
	readonly path?: ReadonlyArray<PropertyKey>
}

export type Result<T> = { success: true; data: T } | { success: false; issues: Issue[] }

export interface Schema<TInput = unknown, TOutput = TInput> {
	readonly _input: TInput
	readonly _output: TOutput
	parse(data: unknown): TOutput
	safeParse(data: unknown): Result<TOutput>
}

export type Infer<T extends Schema> = T['_output']
export type Input<T extends Schema> = T['_input']

// ============================================================
// Schema Error
// ============================================================

export class SchemaError extends Error {
	constructor(public readonly issues: Issue[]) {
		super(issues.map((i) => i.message).join(', '))
		this.name = 'SchemaError'
	}
}

// ============================================================
// Check Functions (for .check() method)
// ============================================================

export type CheckFn<T> = (value: T) => Issue | null

// String checks
export const minLength = (min: number, message?: string): CheckFn<string> =>
	(v) => v.length >= min ? null : { message: message ?? `Minimum length is ${min}` }

export const maxLength = (max: number, message?: string): CheckFn<string> =>
	(v) => v.length <= max ? null : { message: message ?? `Maximum length is ${max}` }

export const regex = (pattern: RegExp, message?: string): CheckFn<string> =>
	(v) => pattern.test(v) ? null : { message: message ?? 'Invalid format' }

export const email = (message?: string): CheckFn<string> =>
	regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message ?? 'Invalid email')

export const uuid = (message?: string): CheckFn<string> =>
	regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, message ?? 'Invalid UUID')

export const url = (message?: string): CheckFn<string> =>
	regex(/^https?:\/\/.+/, message ?? 'Invalid URL')

export const trim = (): CheckFn<string> => () => null // Transform handled separately

// Number checks
export const min = (minVal: number, message?: string): CheckFn<number> =>
	(v) => v >= minVal ? null : { message: message ?? `Minimum is ${minVal}` }

export const max = (maxVal: number, message?: string): CheckFn<number> =>
	(v) => v <= maxVal ? null : { message: message ?? `Maximum is ${maxVal}` }

export const int = (message?: string): CheckFn<number> =>
	(v) => Number.isInteger(v) ? null : { message: message ?? 'Must be an integer' }

export const positive = (message?: string): CheckFn<number> =>
	(v) => v > 0 ? null : { message: message ?? 'Must be positive' }

export const negative = (message?: string): CheckFn<number> =>
	(v) => v < 0 ? null : { message: message ?? 'Must be negative' }

// Array checks
export const minItems = (min: number, message?: string): CheckFn<unknown[]> =>
	(v) => v.length >= min ? null : { message: message ?? `Minimum ${min} items` }

export const maxItems = (max: number, message?: string): CheckFn<unknown[]> =>
	(v) => v.length <= max ? null : { message: message ?? `Maximum ${max} items` }

export const nonempty = (message?: string): CheckFn<unknown[]> =>
	(v) => v.length > 0 ? null : { message: message ?? 'Must not be empty' }

// ============================================================
// Schema Creators (Functional API)
// ============================================================

function createSchema<TInput, TOutput = TInput>(
	validate: (data: unknown) => Result<TOutput>,
	checks: CheckFn<TOutput>[] = []
): Schema<TInput, TOutput> & { check(...fns: CheckFn<TOutput>[]): Schema<TInput, TOutput> } {
	const safeParse = (data: unknown): Result<TOutput> => {
		const result = validate(data)
		if (!result.success) return result

		for (const check of checks) {
			const issue = check(result.data)
			if (issue) return { success: false, issues: [issue] }
		}

		return result
	}

	return {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		parse(data: unknown): TOutput {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},
		safeParse,
		check(...fns: CheckFn<TOutput>[]) {
			return createSchema(validate, [...checks, ...fns])
		},
	}
}

// ============================================================
// Primitive Schemas
// ============================================================

export function string() {
	return createSchema<string>((data) => {
		if (typeof data === 'string') return { success: true, data }
		return { success: false, issues: [{ message: 'Expected string' }] }
	})
}

export function number() {
	return createSchema<number>((data) => {
		if (typeof data === 'number' && !Number.isNaN(data) && Number.isFinite(data)) {
			return { success: true, data }
		}
		return { success: false, issues: [{ message: 'Expected number' }] }
	})
}

export function boolean() {
	return createSchema<boolean>((data) => {
		if (typeof data === 'boolean') return { success: true, data }
		return { success: false, issues: [{ message: 'Expected boolean' }] }
	})
}

export function bigint() {
	return createSchema<bigint>((data) => {
		if (typeof data === 'bigint') return { success: true, data }
		return { success: false, issues: [{ message: 'Expected bigint' }] }
	})
}

export function date() {
	return createSchema<Date>((data) => {
		if (data instanceof Date && !Number.isNaN(data.getTime())) {
			return { success: true, data }
		}
		return { success: false, issues: [{ message: 'Expected Date' }] }
	})
}

export function literal<T extends string | number | boolean | null | undefined>(value: T) {
	return createSchema<T>((data) => {
		if (data === value) return { success: true, data: data as T }
		return { success: false, issues: [{ message: `Expected ${JSON.stringify(value)}` }] }
	})
}

export function null_() {
	return literal(null)
}

export function undefined_() {
	return literal(undefined)
}

export function any() {
	return createSchema<unknown>((data) => ({ success: true, data }))
}

export function unknown() {
	return any()
}

// ============================================================
// Complex Schemas
// ============================================================

type ObjectShape = Record<string, Schema>
type InferShape<T extends ObjectShape> = { [K in keyof T]: T[K]['_output'] }

export function object<T extends ObjectShape>(shape: T) {
	return createSchema<InferShape<T>>((data) => {
		if (typeof data !== 'object' || data === null || Array.isArray(data)) {
			return { success: false, issues: [{ message: 'Expected object' }] }
		}

		const input = data as Record<string, unknown>
		const output: Record<string, unknown> = {}
		const issues: Issue[] = []

		for (const [key, schema] of Object.entries(shape)) {
			const result = schema.safeParse(input[key])
			if (result.success) {
				output[key] = result.data
			} else {
				for (const issue of result.issues) {
					issues.push({ message: issue.message, path: [key, ...(issue.path ?? [])] })
				}
			}
		}

		if (issues.length > 0) return { success: false, issues }
		return { success: true, data: output as InferShape<T> }
	})
}

export function array<T extends Schema>(element: T) {
	return createSchema<T['_output'][]>((data) => {
		if (!Array.isArray(data)) {
			return { success: false, issues: [{ message: 'Expected array' }] }
		}

		const output: T['_output'][] = []
		const issues: Issue[] = []

		for (let i = 0; i < data.length; i++) {
			const result = element.safeParse(data[i])
			if (result.success) {
				output.push(result.data)
			} else {
				for (const issue of result.issues) {
					issues.push({ message: issue.message, path: [i, ...(issue.path ?? [])] })
				}
			}
		}

		if (issues.length > 0) return { success: false, issues }
		return { success: true, data: output }
	})
}

export function union<T extends Schema[]>(options: T) {
	return createSchema<T[number]['_output']>((data) => {
		for (const option of options) {
			const result = option.safeParse(data)
			if (result.success) return result
		}
		return { success: false, issues: [{ message: 'No matching type in union' }] }
	})
}

export function enum_<T extends readonly [string, ...string[]]>(values: T) {
	const set = new Set(values)
	return createSchema<T[number]>((data) => {
		if (typeof data === 'string' && set.has(data)) {
			return { success: true, data: data as T[number] }
		}
		return { success: false, issues: [{ message: `Expected one of: ${values.join(', ')}` }] }
	})
}

export function record<T extends Schema>(valueSchema: T) {
	return createSchema<Record<string, T['_output']>>((data) => {
		if (typeof data !== 'object' || data === null || Array.isArray(data)) {
			return { success: false, issues: [{ message: 'Expected object' }] }
		}

		const input = data as Record<string, unknown>
		const output: Record<string, T['_output']> = {}
		const issues: Issue[] = []

		for (const [key, value] of Object.entries(input)) {
			const result = valueSchema.safeParse(value)
			if (result.success) {
				output[key] = result.data
			} else {
				for (const issue of result.issues) {
					issues.push({ message: issue.message, path: [key, ...(issue.path ?? [])] })
				}
			}
		}

		if (issues.length > 0) return { success: false, issues }
		return { success: true, data: output }
	})
}

export function tuple<T extends Schema[]>(items: T) {
	type TupleOutput = { [K in keyof T]: T[K]['_output'] }
	return createSchema<TupleOutput>((data) => {
		if (!Array.isArray(data)) {
			return { success: false, issues: [{ message: 'Expected array' }] }
		}
		if (data.length !== items.length) {
			return { success: false, issues: [{ message: `Expected ${items.length} items` }] }
		}

		const output: unknown[] = []
		const issues: Issue[] = []

		for (let i = 0; i < items.length; i++) {
			const result = items[i]!.safeParse(data[i])
			if (result.success) {
				output.push(result.data)
			} else {
				for (const issue of result.issues) {
					issues.push({ message: issue.message, path: [i, ...(issue.path ?? [])] })
				}
			}
		}

		if (issues.length > 0) return { success: false, issues }
		return { success: true, data: output as TupleOutput }
	})
}

// ============================================================
// Modifiers (Functional)
// ============================================================

export function optional<T extends Schema>(schema: T) {
	return createSchema<T['_output'] | undefined>((data) => {
		if (data === undefined) return { success: true, data: undefined }
		return schema.safeParse(data)
	})
}

export function nullable<T extends Schema>(schema: T) {
	return createSchema<T['_output'] | null>((data) => {
		if (data === null) return { success: true, data: null }
		return schema.safeParse(data)
	})
}

export function nullish<T extends Schema>(schema: T) {
	return createSchema<T['_output'] | null | undefined>((data) => {
		if (data === null || data === undefined) return { success: true, data }
		return schema.safeParse(data)
	})
}

export function withDefault<T extends Schema>(schema: T, defaultValue: T['_output']) {
	return createSchema<T['_output']>((data) => {
		if (data === undefined) return { success: true, data: defaultValue }
		return schema.safeParse(data)
	})
}

export function transform<T extends Schema, U>(schema: T, fn: (data: T['_output']) => U) {
	return createSchema<T['_input'], U>((data) => {
		const result = schema.safeParse(data)
		if (!result.success) return result as unknown as Result<U>
		try {
			return { success: true, data: fn(result.data) }
		} catch (e) {
			return { success: false, issues: [{ message: e instanceof Error ? e.message : 'Transform failed' }] }
		}
	})
}

export function refine<T extends Schema>(schema: T, check: (data: T['_output']) => boolean, message = 'Validation failed') {
	return createSchema<T['_input'], T['_output']>((data) => {
		const result = schema.safeParse(data)
		if (!result.success) return result
		if (!check(result.data)) return { success: false, issues: [{ message }] }
		return result
	})
}

export function lazy<T extends Schema>(getter: () => T): Schema<T['_input'], T['_output']> {
	return {
		_input: undefined as unknown as T['_input'],
		_output: undefined as unknown as T['_output'],
		parse(data: unknown) {
			return getter().parse(data)
		},
		safeParse(data: unknown) {
			return getter().safeParse(data)
		},
	}
}

// ============================================================
// Convenience Namespace
// ============================================================

export const z = {
	// Primitives
	string,
	number,
	boolean,
	bigint,
	date,
	literal,
	null: null_,
	undefined: undefined_,
	any,
	unknown,
	// Complex
	object,
	array,
	union,
	enum: enum_,
	record,
	tuple,
	// Modifiers
	optional,
	nullable,
	nullish,
	default: withDefault,
	transform,
	refine,
	lazy,
	// Checks
	minLength,
	maxLength,
	regex,
	email,
	uuid,
	url,
	trim,
	min,
	max,
	int,
	positive,
	negative,
	minItems,
	maxItems,
	nonempty,
} as const

export default z
