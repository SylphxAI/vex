import { SchemaError } from '../errors'
import type { BaseSchema, Issue, Result } from '../types'

// ============================================================
// Record Schema Types
// ============================================================

type AnySchema = BaseSchema<unknown, unknown>

// ============================================================
// Record Schema Interface
// ============================================================

export interface RecordSchema<V extends AnySchema>
	extends BaseSchema<Record<string, V['_input']>, Record<string, V['_output']>> {
	readonly valueSchema: V
	optional(): BaseSchema<
		Record<string, V['_input']> | undefined,
		Record<string, V['_output']> | undefined
	>
	nullable(): BaseSchema<
		Record<string, V['_input']> | null,
		Record<string, V['_output']> | null
	>
}

// ============================================================
// Implementation
// ============================================================

function createRecordSchema<V extends AnySchema>(valueSchema: V): RecordSchema<V> {
	type TInput = Record<string, V['_input']>
	type TOutput = Record<string, V['_output']>

	const isObject = (v: unknown): v is Record<string, unknown> =>
		typeof v === 'object' && v !== null && !Array.isArray(v)

	const schema: RecordSchema<V> = {
		// Type brands
		_input: undefined as TInput,
		_output: undefined as TOutput,
		_checks: [],
		valueSchema,

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
			if (!isObject(data)) {
				return { success: false, issues: [{ message: 'Expected object' }] }
			}

			const keys = Object.keys(data)
			let issues: Issue[] | null = null
			let output: Record<string, unknown> | null = null
			let hasTransform = false

			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]
				const value = data[key]
				const result = valueSchema.safeParse(value)

				if (result.success) {
					if (result.data !== value || hasTransform) {
						if (!output) {
							output = {}
							// Copy already processed values
							for (let j = 0; j < i; j++) {
								output[keys[j]] = data[keys[j]]
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
 * Create a record schema (object with string keys and uniform value type)
 * @example
 * const scores = z.record(z.number())
 * scores.parse({ alice: 100, bob: 95 }) // { alice: 100, bob: 95 }
 */
export function record<V extends AnySchema>(valueSchema: V): RecordSchema<V> {
	return createRecordSchema(valueSchema)
}
