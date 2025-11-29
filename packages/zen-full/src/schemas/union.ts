import { SchemaError } from '../errors'
import type { BaseSchema, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Union Schema Types
// ============================================================

type AnySchema = BaseSchema<unknown, unknown>

type UnionInput<T extends readonly AnySchema[]> = T[number]['_input']
type UnionOutput<T extends readonly AnySchema[]> = T[number]['_output']

// ============================================================
// Union Schema Interface
// ============================================================

export interface UnionSchema<T extends readonly AnySchema[]>
	extends BaseSchema<UnionInput<T>, UnionOutput<T>> {
	readonly options: T
	optional(): BaseSchema<UnionInput<T> | undefined, UnionOutput<T> | undefined>
	nullable(): BaseSchema<UnionInput<T> | null, UnionOutput<T> | null>
}

// ============================================================
// Implementation
// ============================================================

function createUnionSchema<T extends readonly AnySchema[]>(options: T): UnionSchema<T> {
	type TInput = UnionInput<T>
	type TOutput = UnionOutput<T>

	const schema: UnionSchema<T> = {
		// Type brands
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		options,

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
			for (const option of options) {
				const result = option.safeParse(data)
				if (result.success) {
					return { success: true, data: result.data as TOutput }
				}
			}

			return {
				success: false,
				issues: [{ message: 'Value does not match any type in union' }],
			}
		},

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return this.safeParse(data)
		},

		optional() {
			return {
				_input: undefined as unknown as TInput | undefined,
				_output: undefined as unknown as TOutput | undefined,
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

		nullable() {
			return {
				_input: undefined as unknown as TInput | null,
				_output: undefined as unknown as TOutput | null,
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
	}

	return schema
}

/**
 * Create a union schema (OR)
 */
export function union<T extends readonly AnySchema[]>(options: T): UnionSchema<T> {
	return createUnionSchema(options)
}
