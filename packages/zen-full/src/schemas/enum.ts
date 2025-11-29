import { SchemaError } from '../errors'
import type { BaseSchema, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Enum Schema
// ============================================================

type EnumValues = readonly [string, ...string[]]

export interface EnumSchema<T extends EnumValues> extends BaseSchema<T[number], T[number]> {
	readonly options: T
	/** Alias for options */
	readonly values: T
	readonly enum: { [K in T[number]]: K }
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	exclude<U extends T[number]>(values: readonly U[]): EnumSchema<any>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	extract<U extends T[number]>(values: readonly U[]): EnumSchema<any>
	optional(): BaseSchema<T[number] | undefined, T[number] | undefined>
	nullable(): BaseSchema<T[number] | null, T[number] | null>
}

const isString = (v: unknown): v is string => typeof v === 'string'

export function enumSchema<T extends EnumValues>(values: T): EnumSchema<T> {
	const valuesSet = new Set<string>(values)
	const enumObj = Object.fromEntries(values.map((v) => [v, v])) as { [K in T[number]]: K }

	const safeParse = (data: unknown): Result<T[number]> => {
		if (!isString(data)) {
			return { success: false, issues: [{ message: 'Expected string' }] }
		}
		if (!valuesSet.has(data)) {
			return {
				success: false,
				issues: [{ message: `Expected one of: ${values.join(', ')}` }],
			}
		}
		return { success: true, data: data as T[number] }
	}

	const schema: EnumSchema<T> = {
		_input: undefined as unknown as T[number],
		_output: undefined as unknown as T[number],
		_checks: [],
		options: values,
		values: values,
		enum: enumObj,

		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: T[number] } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: T[number]; output: T[number] },
		},

		parse(data: unknown): T[number] {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse,

		async parseAsync(data: unknown): Promise<T[number]> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<T[number]>> {
			return safeParse(data)
		},

		exclude<U extends T[number]>(excludeValues: readonly U[]) {
			const excludeSet = new Set(excludeValues)
			const newValues = values.filter((v) => !excludeSet.has(v as U))
			// biome-ignore lint/suspicious/noExplicitAny: return type is EnumSchema<any>
			return enumSchema(newValues as unknown as EnumValues) as EnumSchema<any>
		},

		extract<U extends T[number]>(extractValues: readonly U[]) {
			// biome-ignore lint/suspicious/noExplicitAny: return type is EnumSchema<any>
			return enumSchema(extractValues as unknown as EnumValues) as EnumSchema<any>
		},

		optional() {
			return {
				_input: undefined as unknown as T[number] | undefined,
				_output: undefined as unknown as T[number] | undefined,
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
						input: T[number] | undefined
						output: T[number] | undefined
					},
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown): Result<T[number] | undefined> =>
					v === undefined ? { success: true, data: undefined } : safeParse(v),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<T[number] | undefined>> =>
					v === undefined ? { success: true, data: undefined } : safeParse(v),
			}
		},

		nullable() {
			return {
				_input: undefined as unknown as T[number] | null,
				_output: undefined as unknown as T[number] | null,
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
					types: undefined as unknown as { input: T[number] | null; output: T[number] | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown): Result<T[number] | null> =>
					v === null ? { success: true, data: null } : safeParse(v),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<T[number] | null>> =>
					v === null ? { success: true, data: null } : safeParse(v),
			}
		},
	}

	return schema
}

export { enumSchema as enum_ }

// ============================================================
// Native Enum Schema - For TypeScript native enums
// ============================================================

// biome-ignore lint/suspicious/noExplicitAny: generic enum type
type EnumLike = Record<string, string | number>

export interface NativeEnumSchema<T extends EnumLike> extends BaseSchema<T[keyof T], T[keyof T]> {
	readonly enum: T
	optional(): BaseSchema<T[keyof T] | undefined, T[keyof T] | undefined>
	nullable(): BaseSchema<T[keyof T] | null, T[keyof T] | null>
}

export function nativeEnum<T extends EnumLike>(enumObj: T): NativeEnumSchema<T> {
	// Get all enum values (handles both string and numeric enums)
	const values = Object.values(enumObj).filter((v) => typeof enumObj[v as keyof T] !== 'number')
	const valuesSet = new Set(values)

	const safeParse = (data: unknown): Result<T[keyof T]> => {
		if (!valuesSet.has(data as T[keyof T])) {
			return {
				success: false,
				issues: [{ message: `Expected one of: ${values.join(', ')}` }],
			}
		}
		return { success: true, data: data as T[keyof T] }
	}

	const schema: NativeEnumSchema<T> = {
		_input: undefined as unknown as T[keyof T],
		_output: undefined as unknown as T[keyof T],
		_checks: [],
		enum: enumObj,

		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: T[keyof T] } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: T[keyof T]; output: T[keyof T] },
		},

		parse(data: unknown): T[keyof T] {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse,

		async parseAsync(data: unknown): Promise<T[keyof T]> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<T[keyof T]>> {
			return safeParse(data)
		},

		optional() {
			return {
				_input: undefined as unknown as T[keyof T] | undefined,
				_output: undefined as unknown as T[keyof T] | undefined,
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
						input: T[keyof T] | undefined
						output: T[keyof T] | undefined
					},
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown): Result<T[keyof T] | undefined> =>
					v === undefined ? { success: true, data: undefined } : safeParse(v),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<T[keyof T] | undefined>> =>
					v === undefined ? { success: true, data: undefined } : safeParse(v),
			}
		},

		nullable() {
			return {
				_input: undefined as unknown as T[keyof T] | null,
				_output: undefined as unknown as T[keyof T] | null,
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
					types: undefined as unknown as { input: T[keyof T] | null; output: T[keyof T] | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown): Result<T[keyof T] | null> =>
					v === null ? { success: true, data: null } : safeParse(v),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<T[keyof T] | null>> =>
					v === null ? { success: true, data: null } : safeParse(v),
			}
		},
	}

	return schema
}
