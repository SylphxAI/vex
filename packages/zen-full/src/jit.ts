// ============================================================
// 🧘 Zen JIT Compiler - Compile schemas to optimized validators
// ============================================================
//
// Performance optimizations:
// 1. JIT-compiled pattern validators (email, uuid, ipv4, etc.)
// 2. Schema compilation caching (WeakMap)
// 3. Batch validation (compile once, validate many)
// 4. Schema pooling for common patterns
// 5. Pre-computed field validators for objects
//
// ============================================================

import type { BaseSchema, Check, Result } from './types'

// ============================================================
// Compiled Validator Cache
// ============================================================

const validatorCache = new WeakMap<object, CompiledValidator<unknown>>()

export interface CompiledValidator<T> {
	validate: (data: unknown) => Result<T>
	compiled: true
}

// ============================================================
// String Pattern JIT Compilation
// ============================================================

// Pre-compiled pattern validators (faster than regex.test() in hot paths)
const PATTERN_VALIDATORS: Record<string, (v: string) => boolean> = {
	// Email: simple but fast check
	email: (v) => {
		const at = v.indexOf('@')
		if (at < 1) return false
		const dot = v.lastIndexOf('.')
		return dot > at + 1 && dot < v.length - 1 && !v.includes(' ')
	},

	// UUID v4: inline character checks (faster than regex)
	uuid: (v) => {
		if (v.length !== 36) return false
		for (let i = 0; i < 36; i++) {
			const c = v.charCodeAt(i)
			if (i === 8 || i === 13 || i === 18 || i === 23) {
				if (c !== 45) return false // '-'
			} else if (i === 14) {
				if (c < 49 || c > 53) return false // '1'-'5'
			} else if (i === 19) {
				// 8, 9, a, b, A, B
				if (!((c >= 56 && c <= 57) || c === 97 || c === 98 || c === 65 || c === 66)) return false
			} else {
				// 0-9, a-f, A-F
				if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102) || (c >= 65 && c <= 70))) return false
			}
		}
		return true
	},

	// IPv4: inline parsing (faster than regex)
	ipv4: (v) => {
		const parts = v.split('.')
		if (parts.length !== 4) return false
		for (const part of parts) {
			if (part.length === 0 || part.length > 3) return false
			if (part.length > 1 && part[0] === '0') return false
			const num = Number.parseInt(part, 10)
			if (Number.isNaN(num) || num < 0 || num > 255) return false
		}
		return true
	},

	// URL: basic fast check
	url: (v) => v.startsWith('http://') || v.startsWith('https://'),

	// ISO Date: YYYY-MM-DD format check
	date: (v) => {
		if (v.length !== 10) return false
		if (v[4] !== '-' || v[7] !== '-') return false
		const year = Number.parseInt(v.slice(0, 4), 10)
		const month = Number.parseInt(v.slice(5, 7), 10)
		const day = Number.parseInt(v.slice(8, 10), 10)
		if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return false
		return year >= 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31
	},

	// Hex: character range check
	hex: (v) => {
		if (v.length === 0) return false
		for (let i = 0; i < v.length; i++) {
			const c = v.charCodeAt(i)
			if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102) || (c >= 65 && c <= 70))) return false
		}
		return true
	},

	// ULID: character range check (base32 Crockford)
	ulid: (v) => {
		if (v.length !== 26) return false
		for (let i = 0; i < 26; i++) {
			const c = v.charCodeAt(i)
			// 0-9, A-H, J-K, M-N, P-T, V-Z (no I, L, O, U)
			if (
				!(
					(c >= 48 && c <= 57) || // 0-9
					(c >= 65 && c <= 72) || // A-H
					(c >= 74 && c <= 75) || // J-K
					(c >= 77 && c <= 78) || // M-N
					(c >= 80 && c <= 84) || // P-T
					(c >= 86 && c <= 90) || // V-Z
					(c >= 97 && c <= 104) || // a-h
					(c >= 106 && c <= 107) || // j-k
					(c >= 109 && c <= 110) || // m-n
					(c >= 112 && c <= 116) || // p-t
					(c >= 118 && c <= 122) // v-z
				)
			)
				return false
		}
		return true
	},
}

// ============================================================
// Check Compilation
// ============================================================

/**
 * Get optimized validator for a check name
 */
export function getOptimizedValidator(checkName: string): ((v: string) => boolean) | null {
	return PATTERN_VALIDATORS[checkName] ?? null
}

/**
 * Compile checks into a single optimized validator function
 */
export function compileChecks<T>(checks: Check<T>[]): (value: T) => { message: string } | null {
	if (checks.length === 0) {
		return () => null
	}

	if (checks.length === 1) {
		const check = checks[0]!
		// Try to get optimized validator
		const optimized = getOptimizedValidator(check.name)
		if (optimized) {
			return (value: T) => {
				if (optimized(value as unknown as string)) return null
				return { message: typeof check.message === 'function' ? check.message(value) : check.message }
			}
		}
		return (value: T) => {
			if (check.check(value)) return null
			return { message: typeof check.message === 'function' ? check.message(value) : check.message }
		}
	}

	// Multiple checks - compile into single function
	const optimizedChecks = checks.map((check) => {
		const optimized = getOptimizedValidator(check.name)
		if (optimized) {
			return { check: optimized as (v: T) => boolean, message: check.message }
		}
		return { check: check.check, message: check.message }
	})

	return (value: T) => {
		for (const c of optimizedChecks) {
			if (!c.check(value)) {
				return { message: typeof c.message === 'function' ? c.message(value) : c.message }
			}
		}
		return null
	}
}

// ============================================================
// Schema Compilation
// ============================================================

/**
 * Compile a schema for faster repeated validation
 * Returns cached version if already compiled
 */
export function compile<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>
): CompiledValidator<TOutput> {
	const cached = validatorCache.get(schema)
	if (cached) {
		return cached as CompiledValidator<TOutput>
	}

	// Compile the checks
	const compiledChecks = compileChecks(schema._checks ?? [])

	const validator: CompiledValidator<TOutput> = {
		compiled: true,
		validate: (data: unknown): Result<TOutput> => {
			const result = schema.safeParse(data)
			if (!result.success) return result

			// Run compiled checks
			const error = compiledChecks(result.data as unknown)
			if (error) {
				return { success: false, issues: [error] }
			}

			return result
		},
	}

	validatorCache.set(schema, validator)
	return validator
}

// ============================================================
// Bulk Validation (for arrays of data)
// ============================================================

/**
 * Validate multiple values at once (optimized for batch processing)
 */
export function validateBatch<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	values: unknown[]
): Result<TOutput>[] {
	// Compile once, validate many
	const compiled = compile(schema)
	return values.map(compiled.validate)
}

/**
 * Validate and collect only valid items
 */
export function filterValid<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	values: unknown[]
): TOutput[] {
	const compiled = compile(schema)
	const valid: TOutput[] = []
	for (const value of values) {
		const result = compiled.validate(value)
		if (result.success) {
			valid.push(result.data)
		}
	}
	return valid
}

/**
 * Validate and partition into valid/invalid
 */
export function partition<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	values: unknown[]
): { valid: TOutput[]; invalid: { value: unknown; issues: { message: string }[] }[] } {
	const compiled = compile(schema)
	const valid: TOutput[] = []
	const invalid: { value: unknown; issues: { message: string }[] }[] = []

	for (const value of values) {
		const result = compiled.validate(value)
		if (result.success) {
			valid.push(result.data)
		} else {
			invalid.push({ value, issues: result.issues })
		}
	}

	return { valid, invalid }
}

// ============================================================
// Object Schema Optimization
// ============================================================

export interface CompiledObjectValidator<T> {
	validate: (data: unknown) => Result<T>
	fields: Map<string, CompiledValidator<unknown>>
}

/**
 * Pre-compile all fields in an object schema
 */
export function compileObjectSchema<T extends Record<string, BaseSchema<unknown, unknown>>>(
	shape: T
): CompiledObjectValidator<{ [K in keyof T]: T[K]['_output'] }> {
	const fields = new Map<string, CompiledValidator<unknown>>()

	for (const [key, schema] of Object.entries(shape)) {
		fields.set(key, compile(schema))
	}

	const shapeKeys = Object.keys(shape)

	const validate = (data: unknown): Result<{ [K in keyof T]: T[K]['_output'] }> => {
		if (typeof data !== 'object' || data === null || Array.isArray(data)) {
			return { success: false, issues: [{ message: 'Expected object' }] }
		}

		const input = data as Record<string, unknown>
		const output: Record<string, unknown> = {}
		let issues: { message: string; path?: PropertyKey[] }[] | null = null

		for (const key of shapeKeys) {
			const compiled = fields.get(key)!
			const result = compiled.validate(input[key])

			if (result.success) {
				output[key] = result.data
			} else {
				if (!issues) issues = []
				for (const issue of result.issues) {
					issues.push({
						message: issue.message,
						path: [key, ...((issue as { path?: PropertyKey[] }).path ?? [])],
					})
				}
			}
		}

		if (issues) {
			return { success: false, issues }
		}

		return { success: true, data: output as { [K in keyof T]: T[K]['_output'] } }
	}

	return { validate, fields }
}

// ============================================================
// Fast Type Checks (Inlined for Performance)
// ============================================================

/**
 * Ultra-fast type checking functions
 * These are optimized to be inlined by JS engines
 */
export const fastCheck = {
	/** Check if value is a string */
	string: (v: unknown): v is string => typeof v === 'string',

	/** Check if value is a valid number (not NaN, not Infinity) */
	number: (v: unknown): v is number =>
		typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v),

	/** Check if value is a boolean */
	boolean: (v: unknown): v is boolean => typeof v === 'boolean',

	/** Check if value is a bigint */
	bigint: (v: unknown): v is bigint => typeof v === 'bigint',

	/** Check if value is an object (not null, not array) */
	object: (v: unknown): v is Record<string, unknown> =>
		typeof v === 'object' && v !== null && !Array.isArray(v),

	/** Check if value is an array */
	array: (v: unknown): v is unknown[] => Array.isArray(v),

	/** Check if value is null */
	null: (v: unknown): v is null => v === null,

	/** Check if value is undefined */
	undefined: (v: unknown): v is undefined => v === undefined,

	/** Check if value is nullish (null or undefined) */
	nullish: (v: unknown): v is null | undefined => v === null || v === undefined,

	/** Check if value is a Date instance with valid time */
	date: (v: unknown): v is Date => v instanceof Date && !Number.isNaN(v.getTime()),

	/** Check if value is a symbol */
	symbol: (v: unknown): v is symbol => typeof v === 'symbol',

	/** Check if value is a function */
	function: (v: unknown): v is (...args: unknown[]) => unknown => typeof v === 'function',
} as const

// ============================================================
// Inline Validators (No Object Allocation)
// ============================================================

/**
 * Validate without allocating result objects
 * Returns the validated value directly or throws
 * Use when performance is critical and you expect mostly valid data
 */
export function validateInline<T>(
	check: (v: unknown) => v is T,
	data: unknown,
	errorMessage: string
): T {
	if (check(data)) return data
	throw new Error(errorMessage)
}

/**
 * Try to validate inline, returns null if invalid
 * Zero allocation on success path
 */
export function tryValidateInline<T>(
	check: (v: unknown) => v is T,
	data: unknown
): T | null {
	return check(data) ? data : null
}
