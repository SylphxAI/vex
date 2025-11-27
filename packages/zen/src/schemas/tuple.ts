import { SchemaError } from '../errors'
import type { BaseSchema, Issue, Result } from '../types'

// ============================================================
// Tuple Schema Types
// ============================================================

type AnySchema = BaseSchema<unknown, unknown>

type TupleInput<T extends readonly AnySchema[]> = {
	[K in keyof T]: T[K] extends AnySchema ? T[K]['_input'] : never
}

type TupleOutput<T extends readonly AnySchema[]> = {
	[K in keyof T]: T[K] extends AnySchema ? T[K]['_output'] : never
}

// ============================================================
// Tuple Schema Interface
// ============================================================

export interface TupleSchema<T extends readonly AnySchema[]>
	extends BaseSchema<TupleInput<T>, TupleOutput<T>> {
	readonly items: T
	optional(): BaseSchema<TupleInput<T> | undefined, TupleOutput<T> | undefined>
	nullable(): BaseSchema<TupleInput<T> | null, TupleOutput<T> | null>
}

// ============================================================
// Implementation
// ============================================================

function createTupleSchema<T extends readonly AnySchema[]>(items: T): TupleSchema<T> {
	type TInput = TupleInput<T>
	type TOutput = TupleOutput<T>

	const isArray = (v: unknown): v is unknown[] => Array.isArray(v)

	const schema: TupleSchema<T> = {
		// Type brands
		_input: undefined as TInput,
		_output: undefined as TOutput,
		_checks: [],
		items,

		// Standard Schema
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown) {
				const result = schema.safeParse(value)
				if (result.success) {
					return { value: result.data }
				}
				return {
					issues: result.issues.map((i) => ({
						message: i.message,
						path: i.path ? [...i.path] : undefined,
					})),
				}
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

			if (data.length !== items.length) {
				return {
					success: false,
					issues: [{ message: `Expected ${items.length} elements, received ${data.length}` }],
				}
			}

			let issues: Issue[] | null = null
			let output: unknown[] | null = null
			let hasTransform = false

			for (let i = 0; i < items.length; i++) {
				const itemSchema = items[i]
				const item = data[i]
				const result = itemSchema.safeParse(item)

				if (result.success) {
					if (result.data !== item || hasTransform) {
						if (!output) {
							output = data.slice(0, i)
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

			return { success: true, data: (output ?? data) as TOutput }
		},

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return this.safeParse(data)
		},

		optional() {
			return {
				_input: undefined as TInput | undefined,
				_output: undefined as TOutput | undefined,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						const result =
							v === undefined
								? ({ success: true, data: undefined } as Result<TOutput | undefined>)
								: schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues }
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

		nullable() {
			return {
				_input: undefined as TInput | null,
				_output: undefined as TOutput | null,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						const result =
							v === null
								? ({ success: true, data: null } as Result<TOutput | null>)
								: schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues }
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
	}

	return schema
}

/**
 * Create a tuple schema (fixed-length array with specific types per position)
 * @example
 * const point = z.tuple([z.number(), z.number()])
 * point.parse([1, 2]) // [1, 2]
 */
export function tuple<T extends readonly AnySchema[]>(items: T): TupleSchema<T> {
	return createTupleSchema(items)
}
