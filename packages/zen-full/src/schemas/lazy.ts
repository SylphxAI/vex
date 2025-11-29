import { SchemaError } from '../errors'
import type { AnySchema, BaseSchema, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Lazy Schema (for recursive types)
// ============================================================

export interface LazySchema<T extends AnySchema> extends BaseSchema<T['_input'], T['_output']> {
	readonly schema: T
	optional(): BaseSchema<T['_input'] | undefined, T['_output'] | undefined>
	nullable(): BaseSchema<T['_input'] | null, T['_output'] | null>
}

export function lazy<T extends AnySchema>(getter: () => T): LazySchema<T> {
	type TInput = T['_input']
	type TOutput = T['_output']

	// Cache the schema after first access
	let cachedSchema: T | null = null
	const getSchema = (): T => {
		if (!cachedSchema) {
			cachedSchema = getter()
		}
		return cachedSchema
	}

	const safeParse = (data: unknown): Result<TOutput> => {
		return getSchema().safeParse(data) as Result<TOutput>
	}

	const schema: LazySchema<T> = {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],

		get schema() {
			return getSchema()
		},

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

		optional() {
			return {
				_input: undefined as unknown as TInput | undefined,
				_output: undefined as unknown as TOutput | undefined,
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
					types: undefined as unknown as {
						input: TInput | undefined
						output: TOutput | undefined
					},
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown): Result<TOutput | undefined> =>
					v === undefined ? { success: true, data: undefined } : safeParse(v),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TOutput | undefined>> =>
					v === undefined ? { success: true, data: undefined } : safeParse(v),
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
						if (v === null) return { value: null }
						const result = safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues.map(toStandardIssue) }
					},
					types: undefined as unknown as { input: TInput | null; output: TOutput | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown): Result<TOutput | null> =>
					v === null ? { success: true, data: null } : safeParse(v),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TOutput | null>> =>
					v === null ? { success: true, data: null } : safeParse(v),
			}
		},
	}

	return schema
}
