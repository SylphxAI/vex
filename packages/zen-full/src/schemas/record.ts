import { SchemaError } from '../errors'
import type { AnySchema, BaseSchema, Issue, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Record Schema
// ============================================================

export interface RecordSchema<TKey extends BaseSchema<string, string>, TValue extends AnySchema>
	extends BaseSchema<Record<TKey['_input'], TValue['_input']>, Record<TKey['_output'], TValue['_output']>> {
	readonly keySchema: TKey
	readonly valueSchema: TValue
	optional(): BaseSchema<
		Record<TKey['_input'], TValue['_input']> | undefined,
		Record<TKey['_output'], TValue['_output']> | undefined
	>
	nullable(): BaseSchema<
		Record<TKey['_input'], TValue['_input']> | null,
		Record<TKey['_output'], TValue['_output']> | null
	>
	/** Get the key and value schemas */
	unwrap(): { key: TKey; value: TValue }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v)

// Simple string key schema for default case
const stringKeySchema: BaseSchema<string, string> = {
	_input: undefined as unknown as string,
	_output: undefined as unknown as string,
	_checks: [],
	'~standard': {
		version: 1,
		vendor: 'zen',
		validate: (v) => (typeof v === 'string' ? { value: v } : { issues: [{ message: 'Expected string' }] }),
		types: undefined as unknown as { input: string; output: string },
	},
	parse: (v) => {
		if (typeof v === 'string') return v
		throw new SchemaError([{ message: 'Expected string' }])
	},
	safeParse: (v) =>
		typeof v === 'string'
			? { success: true, data: v }
			: { success: false, issues: [{ message: 'Expected string' }] },
	parseAsync: async (v) => stringKeySchema.parse(v),
	safeParseAsync: async (v) => stringKeySchema.safeParse(v),
}

export function record<TValue extends AnySchema>(
	valueSchema: TValue
): RecordSchema<typeof stringKeySchema, TValue>
export function record<TKey extends BaseSchema<string, string>, TValue extends AnySchema>(
	keySchema: TKey,
	valueSchema: TValue
): RecordSchema<TKey, TValue>
export function record<TKey extends BaseSchema<string, string>, TValue extends AnySchema>(
	keyOrValue: TKey | TValue,
	maybeValue?: TValue
): RecordSchema<TKey, TValue> {
	const keySchema = maybeValue ? (keyOrValue as TKey) : (stringKeySchema as unknown as TKey)
	const valueSchema = maybeValue ? maybeValue : (keyOrValue as TValue)

	type TInput = Record<TKey['_input'], TValue['_input']>
	type TOutput = Record<TKey['_output'], TValue['_output']>

	const safeParse = (data: unknown): Result<TOutput> => {
		if (!isObject(data)) {
			return { success: false, issues: [{ message: 'Expected object' }] }
		}

		let issues: Issue[] | null = null
		let output: Record<string, unknown> | null = null
		const keys = Object.keys(data)

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]!
			const value = data[key]

			// Validate key
			const keyResult = keySchema.safeParse(key)
			if (!keyResult.success) {
				if (!issues) issues = []
				for (const issue of keyResult.issues) {
					issues.push({
						message: `Invalid key "${key}": ${issue.message}`,
						path: [key],
					})
				}
				continue
			}

			// Validate value
			const valueResult = valueSchema.safeParse(value)
			if (valueResult.success) {
				if (valueResult.data !== value || keyResult.data !== key || output) {
					if (!output) output = {}
					for (let j = 0; j < i; j++) {
						output[keys[j]!] = data[keys[j]!]
					}
					output[keyResult.data] = valueResult.data
				}
			} else {
				if (!issues) issues = []
				for (const issue of valueResult.issues) {
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

	const schema: RecordSchema<TKey, TValue> = {
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

		unwrap(): { key: TKey; value: TValue } {
			return { key: keySchema, value: valueSchema }
		},
	}

	return schema
}
