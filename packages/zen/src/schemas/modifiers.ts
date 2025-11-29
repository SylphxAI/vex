import { SchemaError } from '../errors'
import type { AnySchema, BaseSchema, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Refine - Add custom validation
// ============================================================

export interface RefinedSchema<TInput, TOutput> extends BaseSchema<TInput, TOutput> {
	refine(
		check: (data: TOutput) => boolean,
		message?: string | ((data: TOutput) => string)
	): RefinedSchema<TInput, TOutput>
	transform<TNew>(fn: (data: TOutput) => TNew): RefinedSchema<TInput, TNew>
}

export function refine<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	check: (data: TOutput) => boolean,
	message: string | ((data: TOutput) => string) = 'Validation failed'
): RefinedSchema<TInput, TOutput> {
	const safeParse = (data: unknown): Result<TOutput> => {
		const result = schema.safeParse(data)
		if (!result.success) return result

		if (!check(result.data)) {
			const msg = typeof message === 'function' ? message(result.data) : message
			return { success: false, issues: [{ message: msg }] }
		}

		return result
	}

	const refined: RefinedSchema<TInput, TOutput> = {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],

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

		refine(
			newCheck: (data: TOutput) => boolean,
			newMessage?: string | ((data: TOutput) => string)
		): RefinedSchema<TInput, TOutput> {
			return refine(refined, newCheck, newMessage)
		},

		transform<TNew>(fn: (data: TOutput) => TNew): RefinedSchema<TInput, TNew> {
			return transform(refined, fn)
		},
	}

	return refined
}

// ============================================================
// Transform - Transform output value
// ============================================================

export function transform<TInput, TOutput, TNew>(
	schema: BaseSchema<TInput, TOutput>,
	fn: (data: TOutput) => TNew
): RefinedSchema<TInput, TNew> {
	const safeParse = (data: unknown): Result<TNew> => {
		const result = schema.safeParse(data)
		if (!result.success) return result as unknown as Result<TNew>

		try {
			const transformed = fn(result.data)
			return { success: true, data: transformed }
		} catch (e) {
			return {
				success: false,
				issues: [{ message: e instanceof Error ? e.message : 'Transform failed' }],
			}
		}
	}

	const transformed: RefinedSchema<TInput, TNew> = {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TNew,
		_checks: [],

		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TNew } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput; output: TNew },
		},

		parse(data: unknown): TNew {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse,

		async parseAsync(data: unknown): Promise<TNew> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TNew>> {
			return safeParse(data)
		},

		refine(
			check: (data: TNew) => boolean,
			message?: string | ((data: TNew) => string)
		): RefinedSchema<TInput, TNew> {
			return refine(transformed, check, message)
		},

		transform<TNext>(nextFn: (data: TNew) => TNext): RefinedSchema<TInput, TNext> {
			return transform(transformed, nextFn)
		},
	}

	return transformed
}

// ============================================================
// Default - Provide default value
// ============================================================

export function withDefault<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	defaultValue: TOutput | (() => TOutput)
): BaseSchema<TInput | undefined, TOutput> {
	const getDefault = (): TOutput =>
		typeof defaultValue === 'function' ? (defaultValue as () => TOutput)() : defaultValue

	const safeParse = (data: unknown): Result<TOutput> => {
		if (data === undefined) {
			return { success: true, data: getDefault() }
		}
		return schema.safeParse(data)
	}

	return {
		_input: undefined as unknown as TInput | undefined,
		_output: undefined as unknown as TOutput,
		_checks: [],

		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput | undefined; output: TOutput },
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
	}
}

// ============================================================
// Coerce - Coerce input to target type
// ============================================================

// ============================================================
// Catch - Fallback value on error
// ============================================================

export function withCatch<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	catchValue: TOutput | ((ctx: { error: unknown; input: unknown }) => TOutput)
): BaseSchema<unknown, TOutput> {
	const getCatch = (error: unknown, input: unknown): TOutput =>
		typeof catchValue === 'function'
			? (catchValue as (ctx: { error: unknown; input: unknown }) => TOutput)({ error, input })
			: catchValue

	const safeParse = (data: unknown): Result<TOutput> => {
		const result = schema.safeParse(data)
		if (result.success) return result
		return { success: true, data: getCatch(result.issues, data) }
	}

	return {
		_input: undefined as unknown as unknown,
		_output: undefined as unknown as TOutput,
		_checks: [],

		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: unknown; output: TOutput },
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
	}
}

// ============================================================
// SuperRefine - Refinement with context (add multiple issues)
// ============================================================

export interface RefinementCtx {
	addIssue(issue: { message: string; path?: PropertyKey[] }): void
}

export function superRefine<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	refinement: (data: TOutput, ctx: RefinementCtx) => void
): BaseSchema<TInput, TOutput> {
	const safeParse = (data: unknown): Result<TOutput> => {
		const result = schema.safeParse(data)
		if (!result.success) return result

		const issues: { message: string; path?: PropertyKey[] }[] = []
		const ctx: RefinementCtx = {
			addIssue(issue) {
				issues.push(issue)
			},
		}

		refinement(result.data, ctx)

		if (issues.length > 0) {
			return { success: false, issues }
		}

		return result
	}

	return {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],

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
	}
}

// ============================================================
// Brand - Nominal typing
// ============================================================

declare const BRAND: unique symbol
export type Brand<T, B> = T & { [BRAND]: B }

export interface BrandedSchema<TInput, TOutput, B> extends BaseSchema<TInput, Brand<TOutput, B>> {
	readonly _brand: B
}

export function brand<TInput, TOutput, B extends string>(
	schema: BaseSchema<TInput, TOutput>,
	_brand: B
): BrandedSchema<TInput, TOutput, B> {
	const safeParse = (data: unknown): Result<Brand<TOutput, B>> => {
		const result = schema.safeParse(data)
		if (!result.success) return result as unknown as Result<Brand<TOutput, B>>
		return { success: true, data: result.data as Brand<TOutput, B> }
	}

	return {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as Brand<TOutput, B>,
		_checks: [],
		_brand: undefined as unknown as B,

		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: Brand<TOutput, B> } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: TInput; output: Brand<TOutput, B> },
		},

		parse(data: unknown): Brand<TOutput, B> {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse,

		async parseAsync(data: unknown): Promise<Brand<TOutput, B>> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<Brand<TOutput, B>>> {
			return safeParse(data)
		},
	}
}

// ============================================================
// Readonly - Mark output as readonly
// ============================================================

export function readonly<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>
): BaseSchema<TInput, Readonly<TOutput>> {
	// At runtime, readonly is a no-op - it's purely a TypeScript type marker
	return schema as unknown as BaseSchema<TInput, Readonly<TOutput>>
}

// ============================================================
// Custom - Create custom schema
// ============================================================

export function custom<T>(
	check: (data: unknown) => data is T,
	message: string | ((data: unknown) => string) = 'Invalid value'
): BaseSchema<T, T> {
	const safeParse = (data: unknown): Result<T> => {
		if (check(data)) {
			return { success: true, data }
		}
		const msg = typeof message === 'function' ? message(data) : message
		return { success: false, issues: [{ message: msg }] }
	}

	return {
		_input: undefined as unknown as T,
		_output: undefined as unknown as T,
		_checks: [],

		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: T } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: T; output: T },
		},

		parse(data: unknown): T {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse,

		async parseAsync(data: unknown): Promise<T> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<T>> {
			return safeParse(data)
		},
	}
}

// ============================================================
// Stringbool - Parse env-style boolean strings (Zod v4)
// ============================================================

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on', 'y', 'enabled'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'off', 'n', 'disabled'])

export function stringbool(): BaseSchema<string, boolean> {
	const safeParse = (data: unknown): Result<boolean> => {
		if (typeof data !== 'string') {
			return { success: false, issues: [{ message: 'Expected string' }] }
		}
		const lower = data.toLowerCase()
		if (TRUE_VALUES.has(lower)) return { success: true, data: true }
		if (FALSE_VALUES.has(lower)) return { success: true, data: false }
		return { success: false, issues: [{ message: 'Invalid boolean string' }] }
	}

	return {
		_input: undefined as unknown as string,
		_output: undefined as unknown as boolean,
		_checks: [],

		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: boolean } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: string; output: boolean },
		},

		parse(data: unknown): boolean {
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse,

		async parseAsync(data: unknown): Promise<boolean> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<boolean>> {
			return safeParse(data)
		},
	}
}

// ============================================================
// Coerce - Coerce input to target type
// ============================================================

export const coerce = {
	string(): BaseSchema<unknown, string> {
		const safeParse = (data: unknown): Result<string> => {
			try {
				return { success: true, data: String(data) }
			} catch {
				return { success: false, issues: [{ message: 'Failed to coerce to string' }] }
			}
		}

		return {
			_input: undefined as unknown as unknown,
			_output: undefined as unknown as string,
			_checks: [],
			'~standard': {
				version: 1,
				vendor: 'zen',
				validate: (v): { value: string } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
					const result = safeParse(v)
					if (result.success) return { value: result.data }
					return { issues: result.issues.map(toStandardIssue) }
				},
				types: undefined as unknown as { input: unknown; output: string },
			},
			parse: (data) => {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParse,
			parseAsync: async (data) => {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParseAsync: async (data) => safeParse(data),
		}
	},

	number(): BaseSchema<unknown, number> {
		const safeParse = (data: unknown): Result<number> => {
			const num = Number(data)
			if (Number.isNaN(num)) {
				return { success: false, issues: [{ message: 'Failed to coerce to number' }] }
			}
			return { success: true, data: num }
		}

		return {
			_input: undefined as unknown as unknown,
			_output: undefined as unknown as number,
			_checks: [],
			'~standard': {
				version: 1,
				vendor: 'zen',
				validate: (v): { value: number } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
					const result = safeParse(v)
					if (result.success) return { value: result.data }
					return { issues: result.issues.map(toStandardIssue) }
				},
				types: undefined as unknown as { input: unknown; output: number },
			},
			parse: (data) => {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParse,
			parseAsync: async (data) => {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParseAsync: async (data) => safeParse(data),
		}
	},

	boolean(): BaseSchema<unknown, boolean> {
		const safeParse = (data: unknown): Result<boolean> => {
			if (typeof data === 'boolean') return { success: true, data }
			if (data === 'true' || data === 1) return { success: true, data: true }
			if (data === 'false' || data === 0) return { success: true, data: false }
			return { success: false, issues: [{ message: 'Failed to coerce to boolean' }] }
		}

		return {
			_input: undefined as unknown as unknown,
			_output: undefined as unknown as boolean,
			_checks: [],
			'~standard': {
				version: 1,
				vendor: 'zen',
				validate: (v): { value: boolean } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
					const result = safeParse(v)
					if (result.success) return { value: result.data }
					return { issues: result.issues.map(toStandardIssue) }
				},
				types: undefined as unknown as { input: unknown; output: boolean },
			},
			parse: (data) => {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParse,
			parseAsync: async (data) => {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParseAsync: async (data) => safeParse(data),
		}
	},

	date(): BaseSchema<unknown, Date> {
		const safeParse = (data: unknown): Result<Date> => {
			if (data instanceof Date) {
				if (Number.isNaN(data.getTime())) {
					return { success: false, issues: [{ message: 'Invalid date' }] }
				}
				return { success: true, data }
			}
			const date = new Date(data as string | number)
			if (Number.isNaN(date.getTime())) {
				return { success: false, issues: [{ message: 'Failed to coerce to date' }] }
			}
			return { success: true, data: date }
		}

		return {
			_input: undefined as unknown as unknown,
			_output: undefined as unknown as Date,
			_checks: [],
			'~standard': {
				version: 1,
				vendor: 'zen',
				validate: (v): { value: Date } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
					const result = safeParse(v)
					if (result.success) return { value: result.data }
					return { issues: result.issues.map(toStandardIssue) }
				},
				types: undefined as unknown as { input: unknown; output: Date },
			},
			parse: (data) => {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParse,
			parseAsync: async (data) => {
				const result = safeParse(data)
				if (result.success) return result.data
				throw new SchemaError(result.issues)
			},
			safeParseAsync: async (data) => safeParse(data),
		}
	},
}
