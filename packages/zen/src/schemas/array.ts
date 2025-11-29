import { SchemaError } from '../errors'
import { toStandardIssue } from '../types'
import type { BaseSchema, Check, Issue, Result } from '../types'

// ============================================================
// Array Schema Types
// ============================================================

type AnySchema = BaseSchema<unknown, unknown>

// ============================================================
// Array Schema Interface
// ============================================================

export interface ArraySchema<T extends AnySchema>
	extends BaseSchema<T['_input'][], T['_output'][]> {
	readonly element: T
	min(length: number, message?: string): ArraySchema<T>
	max(length: number, message?: string): ArraySchema<T>
	length(length: number, message?: string): ArraySchema<T>
	nonempty(message?: string): ArraySchema<T>
	optional(): BaseSchema<T['_input'][] | undefined, T['_output'][] | undefined>
	nullable(): BaseSchema<T['_input'][] | null, T['_output'][] | null>
	/** Get the underlying element schema */
	unwrap(): T
}

// ============================================================
// Implementation
// ============================================================

function createArraySchema<T extends AnySchema>(
	element: T,
	checks: Check<T['_input'][]>[] = []
): ArraySchema<T> {
	type TInput = T['_input'][]
	type TOutput = T['_output'][]

	const isArray = (v: unknown): v is TInput => Array.isArray(v)

	const addCheck = (check: Check<TInput>): ArraySchema<T> => {
		return createArraySchema(element, [...checks, check])
	}

	const schema: ArraySchema<T> = {
		// Type brands
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: checks,
		element,

		// Standard Schema
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = schema.safeParse(value)
				if (result.success) {
					return { value: result.data }
				}
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput; output: TOutput },
		},

		parse(data: unknown): TOutput {
			const result = this.safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse(data: unknown): Result<TOutput> {
			if (!isArray(data)) {
				return { success: false, issues: [{ message: 'Expected array' }] }
			}

			// Run array-level checks
			for (let i = 0; i < checks.length; i++) {
				const check = checks[i]!
				if (!check.check(data)) {
					const message = typeof check.message === 'function' ? check.message(data) : check.message
					return { success: false, issues: [{ message }] }
				}
			}

			// Validate each element - lazy allocate issues and output
			let issues: Issue[] | null = null
			let output: T['_output'][] | null = null
			let hasTransform = false

			for (let i = 0; i < data.length; i++) {
				const item = data[i]
				const result = element.safeParse(item)
				if (result.success) {
					// Only create output if value changed (transform) or we already have transforms
					if (result.data !== item || hasTransform) {
						if (!output) {
							output = data.slice(0, i) as T['_output'][]
						}
						output.push(result.data)
						hasTransform = true
					} else if (output) {
						output.push(result.data)
					}
				} else {
					if (!issues) issues = []
					for (const issue of result.issues) {
						issues.push({
							message: issue.message,
							path: [i, ...(issue.path ?? [])],
						})
					}
				}
			}

			if (issues) {
				return { success: false, issues }
			}

			// Return original array if no transforms, else return new array
			return { success: true, data: (output ?? data) as TOutput }
		},

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return this.safeParse(data)
		},

		min(length: number, message?: string) {
			return addCheck({
				name: 'min',
				check: (v) => v.length >= length,
				message: message ?? `Array must have at least ${length} elements`,
			})
		},

		max(length: number, message?: string) {
			return addCheck({
				name: 'max',
				check: (v) => v.length <= length,
				message: message ?? `Array must have at most ${length} elements`,
			})
		},

		length(len: number, message?: string) {
			return addCheck({
				name: 'length',
				check: (v) => v.length === len,
				message: message ?? `Array must have exactly ${len} elements`,
			})
		},

		nonempty(message?: string) {
			return this.min(1, message ?? 'Array must not be empty')
		},

		optional(): BaseSchema<TInput | undefined, TOutput | undefined> {
			return {
				_input: undefined as unknown as TInput | undefined,
				_output: undefined as unknown as TOutput | undefined,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown): { value: TOutput | undefined } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
						if (v === undefined) return { value: undefined }
						const result = schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues.map(toStandardIssue) }
					},
					types: undefined as unknown as {
						input: TInput | undefined
						output: TOutput | undefined
					},
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown): Result<TOutput | undefined> =>
					v === undefined ? { success: true, data: undefined } : schema.safeParse(v),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TOutput | undefined>> =>
					v === undefined ? { success: true, data: undefined } : schema.safeParse(v),
			}
		},

		nullable(): BaseSchema<TInput | null, TOutput | null> {
			return {
				_input: undefined as unknown as TInput | null,
				_output: undefined as unknown as TOutput | null,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown): { value: TOutput | null } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
						if (v === null) return { value: null }
						const result = schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues.map(toStandardIssue) }
					},
					types: undefined as unknown as { input: TInput | null; output: TOutput | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown): Result<TOutput | null> =>
					v === null ? { success: true, data: null } : schema.safeParse(v),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TOutput | null>> =>
					v === null ? { success: true, data: null } : schema.safeParse(v),
			}
		},

		unwrap(): T {
			return element
		},
	}

	return schema
}

/**
 * Create an array schema
 */
export function array<T extends AnySchema>(element: T): ArraySchema<T> {
	return createArraySchema(element)
}
