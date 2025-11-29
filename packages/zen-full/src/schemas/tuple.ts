import { SchemaError } from '../errors'
import type { AnySchema, BaseSchema, Issue, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Tuple Schema
// ============================================================

type TupleItems = readonly AnySchema[]
type TupleInput<T extends TupleItems> = { [K in keyof T]: T[K]['_input'] }
type TupleOutput<T extends TupleItems> = { [K in keyof T]: T[K]['_output'] }

export interface TupleSchema<T extends TupleItems> extends BaseSchema<TupleInput<T>, TupleOutput<T>> {
	readonly items: T
	rest<R extends AnySchema>(rest: R): TupleSchema<T> & { readonly rest: R }
	optional(): BaseSchema<TupleInput<T> | undefined, TupleOutput<T> | undefined>
	nullable(): BaseSchema<TupleInput<T> | null, TupleOutput<T> | null>
	/** Get the underlying item schemas */
	unwrap(): T
}

const isArray = (v: unknown): v is unknown[] => Array.isArray(v)

export function tuple<T extends TupleItems>(items: T): TupleSchema<T> {
	type TInput = TupleInput<T>
	type TOutput = TupleOutput<T>

	const safeParse = (data: unknown): Result<TOutput> => {
		if (!isArray(data)) {
			return { success: false, issues: [{ message: 'Expected array' }] }
		}

		if (data.length !== items.length) {
			return {
				success: false,
				issues: [{ message: `Expected ${items.length} items, got ${data.length}` }],
			}
		}

		let issues: Issue[] | null = null
		let output: unknown[] | null = null
		let hasTransform = false

		for (let i = 0; i < items.length; i++) {
			const result = items[i]!.safeParse(data[i])
			if (result.success) {
				if (result.data !== data[i] || hasTransform) {
					if (!output) output = data.slice(0, i)
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
	}

	const schema: TupleSchema<T> = {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		items,

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

		rest<R extends AnySchema>(_rest: R) {
			// TODO: implement rest element validation
			return this as TupleSchema<T> & { readonly rest: R }
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
					types: undefined as unknown as { input: TInput | undefined; output: TOutput | undefined },
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

		unwrap(): T {
			return items
		},
	}

	return schema
}
