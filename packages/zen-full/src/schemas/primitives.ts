import { SchemaError } from '../errors'
import type { BaseSchema, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Primitive Schemas
// ============================================================

// --- any ---
export function any(): BaseSchema<unknown, unknown> {
	const safeParse = (data: unknown): Result<unknown> => ({ success: true, data })

	return {
		_input: undefined as unknown as unknown,
		_output: undefined as unknown as unknown,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate: (v): { value: unknown } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => ({ value: v }),
			types: undefined as unknown as { input: unknown; output: unknown },
		},
		parse: (data) => data,
		safeParse,
		parseAsync: async (data) => data,
		safeParseAsync: async (data) => safeParse(data),
	}
}

// --- unknown ---
export function unknown(): BaseSchema<unknown, unknown> {
	return any() // Same as any at runtime
}

// --- null ---
export function null_(): BaseSchema<null, null> {
	const safeParse = (data: unknown): Result<null> => {
		if (data === null) return { success: true, data }
		return { success: false, issues: [{ message: 'Expected null' }] }
	}

	return {
		_input: undefined as unknown as null,
		_output: undefined as unknown as null,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate: (v): { value: null } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
				const result = safeParse(v)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: null; output: null },
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
}

// --- undefined ---
export function undefined_(): BaseSchema<undefined, undefined> {
	const safeParse = (data: unknown): Result<undefined> => {
		if (data === undefined) return { success: true, data }
		return { success: false, issues: [{ message: 'Expected undefined' }] }
	}

	return {
		_input: undefined as unknown as undefined,
		_output: undefined as unknown as undefined,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate: (v): { value: undefined } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
				const result = safeParse(v)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: undefined; output: undefined },
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
}

// --- void ---
export function void_(): BaseSchema<void, void> {
	const safeParse = (data: unknown): Result<void> => {
		if (data === undefined) return { success: true, data: undefined }
		return { success: false, issues: [{ message: 'Expected void (undefined)' }] }
	}

	return {
		_input: undefined as unknown as void,
		_output: undefined as unknown as void,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate: (v): { value: void } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
				const result = safeParse(v)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: void; output: void },
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
}

// --- never ---
export function never(): BaseSchema<never, never> {
	const safeParse = (_data: unknown): Result<never> => {
		return { success: false, issues: [{ message: 'Expected never (no value is valid)' }] }
	}

	const errorIssue = [{ message: 'Expected never (no value is valid)' }]

	return {
		_input: undefined as unknown as never,
		_output: undefined as unknown as never,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate: (): { value: never } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => ({ issues: [{ message: 'Expected never' }] }),
			types: undefined as unknown as { input: never; output: never },
		},
		parse: (_data) => {
			throw new SchemaError(errorIssue)
		},
		safeParse,
		parseAsync: async (_data) => {
			throw new SchemaError(errorIssue)
		},
		safeParseAsync: async (data) => safeParse(data),
	}
}

// --- nan ---
export function nan(): BaseSchema<number, number> {
	const safeParse = (data: unknown): Result<number> => {
		if (typeof data === 'number' && Number.isNaN(data)) {
			return { success: true, data }
		}
		return { success: false, issues: [{ message: 'Expected NaN' }] }
	}

	return {
		_input: undefined as unknown as number,
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
			types: undefined as unknown as { input: number; output: number },
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
}

// --- date ---
export interface DateSchema extends BaseSchema<Date, Date> {
	min(minDate: Date, message?: string): DateSchema
	max(maxDate: Date, message?: string): DateSchema
	optional(): BaseSchema<Date | undefined, Date | undefined>
	nullable(): BaseSchema<Date | null, Date | null>
}

function createDateSchema(
	checks: Array<{ check: (d: Date) => boolean; message: string }> = []
): DateSchema {
	const safeParse = (data: unknown): Result<Date> => {
		if (!(data instanceof Date)) {
			return { success: false, issues: [{ message: 'Expected Date' }] }
		}
		if (Number.isNaN(data.getTime())) {
			return { success: false, issues: [{ message: 'Invalid date' }] }
		}

		for (const check of checks) {
			if (!check.check(data)) {
				return { success: false, issues: [{ message: check.message }] }
			}
		}

		return { success: true, data }
	}

	const schema: DateSchema = {
		_input: undefined as unknown as Date,
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
			types: undefined as unknown as { input: Date; output: Date },
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
		min(minDate: Date, message?: string) {
			return createDateSchema([
				...checks,
				{
					check: (d) => d.getTime() >= minDate.getTime(),
					message: message ?? `Date must be on or after ${minDate.toISOString()}`,
				},
			])
		},
		max(maxDate: Date, message?: string) {
			return createDateSchema([
				...checks,
				{
					check: (d) => d.getTime() <= maxDate.getTime(),
					message: message ?? `Date must be on or before ${maxDate.toISOString()}`,
				},
			])
		},
		optional() {
			return {
				_input: undefined as unknown as Date | undefined,
				_output: undefined as unknown as Date | undefined,
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
					types: undefined as unknown as { input: Date | undefined; output: Date | undefined },
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown) => (v === undefined ? { success: true, data: undefined } : safeParse(v)),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown) => (v === undefined ? { success: true, data: undefined } : safeParse(v)),
			}
		},
		nullable() {
			return {
				_input: undefined as unknown as Date | null,
				_output: undefined as unknown as Date | null,
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
					types: undefined as unknown as { input: Date | null; output: Date | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown) => (v === null ? { success: true, data: null } : safeParse(v)),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown) => (v === null ? { success: true, data: null } : safeParse(v)),
			}
		},
	}

	return schema
}

export function date(): DateSchema {
	return createDateSchema()
}

// --- bigint ---
export interface BigIntSchema extends BaseSchema<bigint, bigint> {
	min(value: bigint, message?: string): BigIntSchema
	max(value: bigint, message?: string): BigIntSchema
	gt(value: bigint, message?: string): BigIntSchema
	gte(value: bigint, message?: string): BigIntSchema
	lt(value: bigint, message?: string): BigIntSchema
	lte(value: bigint, message?: string): BigIntSchema
	positive(message?: string): BigIntSchema
	negative(message?: string): BigIntSchema
	nonnegative(message?: string): BigIntSchema
	nonpositive(message?: string): BigIntSchema
	multipleOf(value: bigint, message?: string): BigIntSchema
	/** Alias for multipleOf */
	step(value: bigint, message?: string): BigIntSchema
	optional(): BaseSchema<bigint | undefined, bigint | undefined>
	nullable(): BaseSchema<bigint | null, bigint | null>
}

function createBigIntSchema(
	checks: Array<{ check: (n: bigint) => boolean; message: string }> = []
): BigIntSchema {
	const safeParse = (data: unknown): Result<bigint> => {
		if (typeof data !== 'bigint') {
			return { success: false, issues: [{ message: 'Expected bigint' }] }
		}

		for (const check of checks) {
			if (!check.check(data)) {
				return { success: false, issues: [{ message: check.message }] }
			}
		}

		return { success: true, data }
	}

	const schema: BigIntSchema = {
		_input: undefined as unknown as bigint,
		_output: undefined as unknown as bigint,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate: (v): { value: bigint } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
				const result = safeParse(v)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: bigint; output: bigint },
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
		min(value: bigint, message?: string) {
			return createBigIntSchema([
				...checks,
				{ check: (n) => n >= value, message: message ?? `Must be at least ${value}` },
			])
		},
		max(value: bigint, message?: string) {
			return createBigIntSchema([
				...checks,
				{ check: (n) => n <= value, message: message ?? `Must be at most ${value}` },
			])
		},
		gt(value: bigint, message?: string) {
			return createBigIntSchema([
				...checks,
				{ check: (n) => n > value, message: message ?? `Must be greater than ${value}` },
			])
		},
		gte(value: bigint, message?: string) {
			return this.min(value, message)
		},
		lt(value: bigint, message?: string) {
			return createBigIntSchema([
				...checks,
				{ check: (n) => n < value, message: message ?? `Must be less than ${value}` },
			])
		},
		lte(value: bigint, message?: string) {
			return this.max(value, message)
		},
		positive(message?: string) {
			return createBigIntSchema([
				...checks,
				{ check: (n) => n > 0n, message: message ?? 'Must be positive' },
			])
		},
		negative(message?: string) {
			return createBigIntSchema([
				...checks,
				{ check: (n) => n < 0n, message: message ?? 'Must be negative' },
			])
		},
		nonnegative(message?: string) {
			return createBigIntSchema([
				...checks,
				{ check: (n) => n >= 0n, message: message ?? 'Must be non-negative' },
			])
		},
		nonpositive(message?: string) {
			return createBigIntSchema([
				...checks,
				{ check: (n) => n <= 0n, message: message ?? 'Must be non-positive' },
			])
		},
		multipleOf(value: bigint, message?: string) {
			return createBigIntSchema([
				...checks,
				{ check: (n) => n % value === 0n, message: message ?? `Must be a multiple of ${value}` },
			])
		},

		step(value: bigint, message?: string) {
			return this.multipleOf(value, message)
		},
		optional() {
			return {
				_input: undefined as unknown as bigint | undefined,
				_output: undefined as unknown as bigint | undefined,
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
					types: undefined as unknown as { input: bigint | undefined; output: bigint | undefined },
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown) => (v === undefined ? { success: true, data: undefined } : safeParse(v)),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown) => (v === undefined ? { success: true, data: undefined } : safeParse(v)),
			}
		},
		nullable() {
			return {
				_input: undefined as unknown as bigint | null,
				_output: undefined as unknown as bigint | null,
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
					types: undefined as unknown as { input: bigint | null; output: bigint | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown) => (v === null ? { success: true, data: null } : safeParse(v)),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown) => (v === null ? { success: true, data: null } : safeParse(v)),
			}
		},
	}

	return schema
}

export function bigint(): BigIntSchema {
	return createBigIntSchema()
}

// --- symbol ---
export function symbol(): BaseSchema<symbol, symbol> {
	const safeParse = (data: unknown): Result<symbol> => {
		if (typeof data === 'symbol') return { success: true, data }
		return { success: false, issues: [{ message: 'Expected symbol' }] }
	}

	return {
		_input: undefined as unknown as symbol,
		_output: undefined as unknown as symbol,
		_checks: [],
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate: (v): { value: symbol } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } => {
				const result = safeParse(v)
				if (result.success) return { value: result.data }
				return { issues: result.issues.map(toStandardIssue) }
			},
			types: undefined as unknown as { input: symbol; output: symbol },
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
}
