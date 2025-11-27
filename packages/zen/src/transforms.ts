import { SchemaError } from './errors'
import type { BaseSchema, Result } from './types'

const VENDOR = 'zen'

// ============================================================
// Refine - Custom validation
// ============================================================

export interface RefinedSchema<TInput, TOutput> extends BaseSchema<TInput, TOutput> {}

/**
 * Add custom validation to a schema
 * @example
 * const passwordSchema = refine(z.string(), (val) => val.length >= 8, 'Password must be at least 8 characters')
 */
export function refine<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	check: (value: TOutput) => boolean,
	message: string | ((value: TOutput) => string)
): RefinedSchema<TInput, TOutput> {
	const refinedSchema: RefinedSchema<TInput, TOutput> = {
		_input: undefined as TInput,
		_output: undefined as TOutput,
		_checks: schema._checks,

		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value: unknown) {
				const result = refinedSchema.safeParse(value)
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
			const result = schema.safeParse(data)
			if (!result.success) return result

			if (!check(result.data)) {
				const msg = typeof message === 'function' ? message(result.data) : message
				return { success: false, issues: [{ message: msg }] }
			}

			return result
		},

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return this.safeParse(data)
		},
	}

	return refinedSchema
}

// ============================================================
// Transform - Transform output value
// ============================================================

export interface TransformedSchema<TInput, TOutput> extends BaseSchema<TInput, TOutput> {}

/**
 * Transform the output of a schema
 * @example
 * const upperString = transform(z.string(), (val) => val.toUpperCase())
 */
export function transform<TInput, TIntermediate, TOutput>(
	schema: BaseSchema<TInput, TIntermediate>,
	transformer: (value: TIntermediate) => TOutput
): TransformedSchema<TInput, TOutput> {
	const transformedSchema: TransformedSchema<TInput, TOutput> = {
		_input: undefined as TInput,
		_output: undefined as TOutput,
		_checks: schema._checks,

		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value: unknown) {
				const result = transformedSchema.safeParse(value)
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
			const result = schema.safeParse(data)
			if (!result.success) return result as Result<TOutput>

			try {
				const transformed = transformer(result.data)
				return { success: true, data: transformed }
			} catch (e) {
				const message = e instanceof Error ? e.message : 'Transform failed'
				return { success: false, issues: [{ message }] }
			}
		},

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return this.safeParse(data)
		},
	}

	return transformedSchema
}

// ============================================================
// Default - Provide default value for undefined
// ============================================================

export interface DefaultedSchema<TInput, TOutput> extends BaseSchema<TInput | undefined, TOutput> {}

/**
 * Provide a default value when input is undefined
 * @example
 * const nameSchema = withDefault(z.string(), 'Anonymous')
 */
export function withDefault<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	defaultValue: TOutput | (() => TOutput)
): DefaultedSchema<TInput, TOutput> {
	const getDefault = (): TOutput =>
		typeof defaultValue === 'function' ? (defaultValue as () => TOutput)() : defaultValue

	const defaultedSchema: DefaultedSchema<TInput, TOutput> = {
		_input: undefined as TInput | undefined,
		_output: undefined as TOutput,
		_checks: schema._checks,

		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value: unknown) {
				const result = defaultedSchema.safeParse(value)
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
			types: undefined as unknown as { input: TInput | undefined; output: TOutput },
		},

		parse(data: unknown): TOutput {
			const result = this.safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse(data: unknown): Result<TOutput> {
			if (data === undefined) {
				return { success: true, data: getDefault() }
			}
			return schema.safeParse(data)
		},

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return this.safeParse(data)
		},
	}

	return defaultedSchema
}

// ============================================================
// Coerce - Coerce input before validation
// ============================================================

/**
 * Coerce string to number
 */
export function coerceNumber(schema: BaseSchema<number, number>): BaseSchema<unknown, number> {
	const coercedSchema: BaseSchema<unknown, number> = {
		_input: undefined as unknown,
		_output: undefined as number,
		_checks: schema._checks,

		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value: unknown) {
				const result = coercedSchema.safeParse(value)
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
			types: undefined as unknown as { input: unknown; output: number },
		},

		parse(data: unknown): number {
			const result = this.safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse(data: unknown): Result<number> {
			const coerced = Number(data)
			return schema.safeParse(coerced)
		},

		async parseAsync(data: unknown): Promise<number> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<number>> {
			return this.safeParse(data)
		},
	}

	return coercedSchema
}

/**
 * Coerce to string
 */
export function coerceString(schema: BaseSchema<string, string>): BaseSchema<unknown, string> {
	const coercedSchema: BaseSchema<unknown, string> = {
		_input: undefined as unknown,
		_output: undefined as string,
		_checks: schema._checks,

		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value: unknown) {
				const result = coercedSchema.safeParse(value)
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
			types: undefined as unknown as { input: unknown; output: string },
		},

		parse(data: unknown): string {
			const result = this.safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse(data: unknown): Result<string> {
			const coerced = String(data)
			return schema.safeParse(coerced)
		},

		async parseAsync(data: unknown): Promise<string> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<string>> {
			return this.safeParse(data)
		},
	}

	return coercedSchema
}

/**
 * Coerce to boolean
 */
export function coerceBoolean(schema: BaseSchema<boolean, boolean>): BaseSchema<unknown, boolean> {
	const coercedSchema: BaseSchema<unknown, boolean> = {
		_input: undefined as unknown,
		_output: undefined as boolean,
		_checks: schema._checks,

		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value: unknown) {
				const result = coercedSchema.safeParse(value)
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
			types: undefined as unknown as { input: unknown; output: boolean },
		},

		parse(data: unknown): boolean {
			const result = this.safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse(data: unknown): Result<boolean> {
			const coerced = Boolean(data)
			return schema.safeParse(coerced)
		},

		async parseAsync(data: unknown): Promise<boolean> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<boolean>> {
			return this.safeParse(data)
		},
	}

	return coercedSchema
}
