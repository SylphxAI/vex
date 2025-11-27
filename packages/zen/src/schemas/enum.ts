import { SchemaError } from '../errors'
import type { BaseSchema, Result } from '../types'

// ============================================================
// Enum Schema Types
// ============================================================

type EnumValues = readonly [string, ...string[]]
type EnumValue<T extends EnumValues> = T[number]

// ============================================================
// Enum Schema Interface
// ============================================================

export interface EnumSchema<T extends EnumValues> extends BaseSchema<EnumValue<T>, EnumValue<T>> {
	readonly options: T
	readonly enum: { [K in T[number]]: K }
	optional(): BaseSchema<EnumValue<T> | undefined, EnumValue<T> | undefined>
	nullable(): BaseSchema<EnumValue<T> | null, EnumValue<T> | null>
}

// ============================================================
// Implementation
// ============================================================

function createEnumSchema<T extends EnumValues>(values: T): EnumSchema<T> {
	type TValue = EnumValue<T>

	const valueSet = new Set<string>(values)
	const enumObj = {} as { [K in T[number]]: K }
	for (const v of values) {
		;(enumObj as Record<string, string>)[v] = v
	}

	const isValidEnum = (v: unknown): v is TValue =>
		typeof v === 'string' && valueSet.has(v)

	const schema: EnumSchema<T> = {
		// Type brands
		_input: undefined as TValue,
		_output: undefined as TValue,
		_checks: [],
		options: values,
		enum: enumObj,

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
			types: undefined as unknown as { input: TValue; output: TValue },
		},

		parse(data: unknown): TValue {
			const result = this.safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse(data: unknown): Result<TValue> {
			if (!isValidEnum(data)) {
				return {
					success: false,
					issues: [
						{
							message: `Expected one of: ${values.map((v) => `"${v}"`).join(', ')}`,
						},
					],
				}
			}
			return { success: true, data }
		},

		async parseAsync(data: unknown): Promise<TValue> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TValue>> {
			return this.safeParse(data)
		},

		optional() {
			return {
				_input: undefined as TValue | undefined,
				_output: undefined as TValue | undefined,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						const result =
							v === undefined
								? ({ success: true, data: undefined } as Result<TValue | undefined>)
								: schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues }
					},
					types: undefined as unknown as { input: TValue | undefined; output: TValue | undefined },
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown): Result<TValue | undefined> =>
					v === undefined ? { success: true, data: undefined } : schema.safeParse(v),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TValue | undefined>> =>
					v === undefined ? { success: true, data: undefined } : schema.safeParse(v),
			}
		},

		nullable() {
			return {
				_input: undefined as TValue | null,
				_output: undefined as TValue | null,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						const result =
							v === null
								? ({ success: true, data: null } as Result<TValue | null>)
								: schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues }
					},
					types: undefined as unknown as { input: TValue | null; output: TValue | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown): Result<TValue | null> =>
					v === null ? { success: true, data: null } : schema.safeParse(v),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TValue | null>> =>
					v === null ? { success: true, data: null } : schema.safeParse(v),
			}
		},
	}

	return schema
}

/**
 * Create an enum schema
 * @example
 * const status = z.enum(['pending', 'active', 'done'])
 * status.parse('active') // 'active'
 * status.enum.active // 'active' (autocomplete)
 */
export function enumSchema<T extends EnumValues>(values: T): EnumSchema<T> {
	return createEnumSchema(values)
}

// Alias for Zod compatibility
export { enumSchema as enum_ }
