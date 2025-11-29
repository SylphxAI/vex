import { SchemaError } from '../errors'
import type { BaseSchema, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Literal Schema Types
// ============================================================

type Primitive = string | number | boolean | null | undefined

// ============================================================
// Literal Schema Interface
// ============================================================

export interface LiteralSchema<T extends Primitive> extends BaseSchema<T, T> {
	readonly value: T
	optional(): BaseSchema<T | undefined, T | undefined>
	nullable(): BaseSchema<T | null, T | null>
}

// ============================================================
// Implementation
// ============================================================

function createLiteralSchema<T extends Primitive>(value: T): LiteralSchema<T> {
	const schema: LiteralSchema<T> = {
		// Type brands
		_input: undefined as unknown as T,
		_output: undefined as unknown as T,
		_checks: [],
		value,

		// Standard Schema
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(data: unknown): { value: T } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = schema.safeParse(data)
				if (result.success) {
					return { value: result.data }
				}
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: T; output: T },
		},

		parse(data: unknown): T {
			const result = this.safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse(data: unknown): Result<T> {
			if (data === value) {
				return { success: true, data: value }
			}
			return {
				success: false,
				issues: [
					{ message: `Expected ${JSON.stringify(value)}, received ${JSON.stringify(data)}` },
				],
			}
		},

		async parseAsync(data: unknown): Promise<T> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<T>> {
			return this.safeParse(data)
		},

		optional() {
			return {
				_input: undefined as unknown as T | undefined,
				_output: undefined as unknown as T | undefined,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						const result =
							v === undefined
								? ({ success: true, data: undefined } as Result<T | undefined>)
								: schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues.map(toStandardIssue) }
					},
					types: undefined as unknown as { input: T | undefined; output: T | undefined },
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown): Result<T | undefined> =>
					v === undefined ? { success: true, data: undefined } : schema.safeParse(v),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<T | undefined>> =>
					v === undefined ? { success: true, data: undefined } : schema.safeParse(v),
			}
		},

		nullable() {
			return {
				_input: undefined as unknown as T | null,
				_output: undefined as unknown as T | null,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						const result =
							v === null ? ({ success: true, data: null } as Result<T | null>) : schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues.map(toStandardIssue) }
					},
					types: undefined as unknown as { input: T | null; output: T | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown): Result<T | null> =>
					v === null ? { success: true, data: null } : schema.safeParse(v),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<T | null>> =>
					v === null ? { success: true, data: null } : schema.safeParse(v),
			}
		},
	}

	return schema
}

/**
 * Create a literal schema
 */
export function literal<T extends Primitive>(value: T): LiteralSchema<T> {
	return createLiteralSchema(value)
}
