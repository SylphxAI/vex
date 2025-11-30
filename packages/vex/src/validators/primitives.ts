// ============================================================
// Primitive Type Validators (Factory Pattern)
// ============================================================

import type { Parser, Result, SchemaMetadata, Validator } from '../core'
import {
	addSchemaMetadata,
	addStandardSchema,
	createValidator,
	getSchemaMetadata,
	ValidationError,
} from '../core'

// Pre-allocated error results (no allocation on failure)
const ERR_STRING: Result<never> = { ok: false, error: 'Expected string' }
const ERR_NUMBER: Result<never> = { ok: false, error: 'Expected number' }
const ERR_BOOLEAN: Result<never> = { ok: false, error: 'Expected boolean' }
const ERR_BIGINT: Result<never> = { ok: false, error: 'Expected bigint' }
const ERR_DATE: Result<never> = { ok: false, error: 'Expected Date' }
const ERR_ARRAY: Result<never> = { ok: false, error: 'Expected array' }
const ERR_OBJECT: Result<never> = { ok: false, error: 'Expected object' }
const ERR_SYMBOL: Result<never> = { ok: false, error: 'Expected symbol' }
const ERR_FUNCTION: Result<never> = { ok: false, error: 'Expected function' }

// ============================================================
// Base Validators (internal)
// ============================================================

const baseStr: Parser<string> = createValidator(
	(v) => {
		if (typeof v !== 'string') throw new ValidationError('Expected string')
		return v
	},
	(v) => (typeof v === 'string' ? { ok: true, value: v } : ERR_STRING),
	{ type: 'string' }
)

const baseNum: Parser<number> = createValidator(
	(v) => {
		if (typeof v !== 'number' || Number.isNaN(v)) throw new ValidationError('Expected number')
		return v
	},
	(v) => (typeof v === 'number' && !Number.isNaN(v) ? { ok: true, value: v } : ERR_NUMBER),
	{ type: 'number' }
)

const baseBool: Parser<boolean> = createValidator(
	(v) => {
		if (typeof v !== 'boolean') throw new ValidationError('Expected boolean')
		return v
	},
	(v) => (typeof v === 'boolean' ? { ok: true, value: v } : ERR_BOOLEAN),
	{ type: 'boolean' }
)

const baseBigInt: Parser<bigint> = createValidator(
	(v) => {
		if (typeof v !== 'bigint') throw new ValidationError('Expected bigint')
		return v
	},
	(v) => (typeof v === 'bigint' ? { ok: true, value: v } : ERR_BIGINT),
	{ type: 'bigint' }
)

const baseDate: Parser<Date> = createValidator(
	(v) => {
		if (!(v instanceof Date) || Number.isNaN(v.getTime()))
			throw new ValidationError('Expected Date')
		return v
	},
	(v) => (v instanceof Date && !Number.isNaN(v.getTime()) ? { ok: true, value: v } : ERR_DATE),
	{ type: 'date' }
)

const baseArr: Parser<unknown[]> = createValidator(
	(v) => {
		if (!Array.isArray(v)) throw new ValidationError('Expected array')
		return v
	},
	(v) => (Array.isArray(v) ? { ok: true, value: v } : ERR_ARRAY),
	{ type: 'array' }
)

const baseObj: Parser<Record<string, unknown>> = createValidator(
	(v) => {
		if (typeof v !== 'object' || v === null || Array.isArray(v))
			throw new ValidationError('Expected object')
		return v as Record<string, unknown>
	},
	(v) =>
		typeof v === 'object' && v !== null && !Array.isArray(v)
			? { ok: true, value: v as Record<string, unknown> }
			: ERR_OBJECT,
	{ type: 'object' }
)

const baseSymbol: Parser<symbol> = createValidator(
	(v) => {
		if (typeof v !== 'symbol') throw new ValidationError('Expected symbol')
		return v
	},
	(v) => (typeof v === 'symbol' ? { ok: true, value: v } : ERR_SYMBOL),
	{ type: 'symbol' }
)

const baseFunc: Parser<(...args: unknown[]) => unknown> = createValidator(
	(v) => {
		if (typeof v !== 'function') throw new ValidationError('Expected function')
		return v as (...args: unknown[]) => unknown
	},
	(v) =>
		typeof v === 'function'
			? { ok: true, value: v as (...args: unknown[]) => unknown }
			: ERR_FUNCTION,
	{ type: 'function' }
)

// ============================================================
// Composition Helper
// ============================================================

function composeWithBase<T>(
	base: Parser<T>,
	constraints: Validator<T, T>[],
	baseType: string
): Parser<T> {
	if (constraints.length === 0) return base

	const len = constraints.length

	// Helper to safely call a validator
	const safeCall = (v: Validator<T, T>, value: T): Result<T> => {
		if (v.safe) return v.safe(value)
		try {
			return { ok: true as const, value: v(value) }
		} catch (e) {
			return { ok: false as const, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	// JIT-optimized fast paths for common cases
	let fn: Parser<T>

	if (len === 1) {
		const c0 = constraints[0]!
		fn = ((value: unknown) => c0(base(value))) as Parser<T>
		fn.safe = (value: unknown): Result<T> => {
			// biome-ignore lint/style/noNonNullAssertion: safe is always defined on Parser
			const r0 = base.safe!(value)
			if (!r0.ok) return r0
			return safeCall(c0, r0.value)
		}
	} else if (len === 2) {
		const [c0, c1] = constraints as [Validator<T, T>, Validator<T, T>]
		fn = ((value: unknown) => c1(c0(base(value)))) as Parser<T>
		fn.safe = (value: unknown): Result<T> => {
			// biome-ignore lint/style/noNonNullAssertion: safe is always defined on Parser
			const r0 = base.safe!(value)
			if (!r0.ok) return r0
			const r1 = safeCall(c0, r0.value)
			if (!r1.ok) return r1
			return safeCall(c1, r1.value)
		}
	} else if (len === 3) {
		const [c0, c1, c2] = constraints as [Validator<T, T>, Validator<T, T>, Validator<T, T>]
		fn = ((value: unknown) => c2(c1(c0(base(value))))) as Parser<T>
		fn.safe = (value: unknown): Result<T> => {
			// biome-ignore lint/style/noNonNullAssertion: safe is always defined on Parser
			const r0 = base.safe!(value)
			if (!r0.ok) return r0
			const r1 = safeCall(c0, r0.value)
			if (!r1.ok) return r1
			const r2 = safeCall(c1, r1.value)
			if (!r2.ok) return r2
			return safeCall(c2, r2.value)
		}
	} else {
		// Generic fallback for 4+ constraints
		fn = ((value: unknown) => {
			let result = base(value)
			for (let i = 0; i < len; i++) {
				// biome-ignore lint/style/noNonNullAssertion: index is within bounds
				result = constraints[i]!(result)
			}
			return result
		}) as Parser<T>

		fn.safe = (value: unknown): Result<T> => {
			// biome-ignore lint/style/noNonNullAssertion: safe is always defined on Parser
			const r0 = base.safe!(value)
			if (!r0.ok) return r0
			let result = r0.value
			for (let i = 0; i < len; i++) {
				// biome-ignore lint/style/noNonNullAssertion: index is within bounds
				const r = safeCall(constraints[i]!, result)
				if (!r.ok) return r
				result = r.value
			}
			return { ok: true as const, value: result }
		}
	}

	// Collect and merge schema metadata
	const mergedConstraints: Record<string, unknown> = {}
	for (const c of constraints) {
		const meta = getSchemaMetadata(c)
		if (meta?.constraints) {
			Object.assign(mergedConstraints, meta.constraints)
		}
	}

	const metadata: SchemaMetadata = { type: baseType }
	if (Object.keys(mergedConstraints).length > 0) {
		metadata.constraints = mergedConstraints
	}
	addSchemaMetadata(fn, metadata)

	return addStandardSchema(fn)
}

// ============================================================
// Factory Functions (exported)
// ============================================================

/**
 * String validator factory
 *
 * @example
 * str()                    // base string
 * str(email)               // string + email format
 * str(min(3), max(20))     // string + length constraints
 */
export const str = (...constraints: Validator<string, string>[]): Parser<string> => {
	return composeWithBase(baseStr, constraints, 'string')
}

/**
 * Number validator factory
 *
 * @example
 * num()                    // base number
 * num(int)                 // integer
 * num(int, positive)       // positive integer
 * num(gte(0), lte(100))    // number between 0-100
 */
export const num = (...constraints: Validator<number, number>[]): Parser<number> => {
	return composeWithBase(baseNum, constraints, 'number')
}

/**
 * Boolean validator factory
 *
 * @example
 * bool()                   // base boolean
 */
export const bool = (...constraints: Validator<boolean, boolean>[]): Parser<boolean> => {
	return composeWithBase(baseBool, constraints, 'boolean')
}

/**
 * BigInt validator factory
 *
 * @example
 * bigInt()                 // base bigint
 */
export const bigInt = (...constraints: Validator<bigint, bigint>[]): Parser<bigint> => {
	return composeWithBase(baseBigInt, constraints, 'bigint')
}

/**
 * Date validator factory
 *
 * @example
 * date()                   // base Date
 */
export const date = (...constraints: Validator<Date, Date>[]): Parser<Date> => {
	return composeWithBase(baseDate, constraints, 'date')
}

/**
 * Array validator factory
 *
 * @example
 * arr()                    // base array
 */
export const arr = (...constraints: Validator<unknown[], unknown[]>[]): Parser<unknown[]> => {
	return composeWithBase(baseArr, constraints, 'array')
}

/**
 * Object validator factory
 *
 * @example
 * obj()                    // base object
 */
export const obj = (
	...constraints: Validator<Record<string, unknown>, Record<string, unknown>>[]
): Parser<Record<string, unknown>> => {
	return composeWithBase(baseObj, constraints, 'object')
}

/**
 * Symbol validator factory
 *
 * @example
 * sym()                    // base symbol
 */
export const sym = (...constraints: Validator<symbol, symbol>[]): Parser<symbol> => {
	return composeWithBase(baseSymbol, constraints, 'symbol')
}

/**
 * Function validator factory
 *
 * @example
 * func()                   // base function
 */
export const func = (
	...constraints: Validator<(...args: unknown[]) => unknown, (...args: unknown[]) => unknown>[]
): Parser<(...args: unknown[]) => unknown> => {
	return composeWithBase(baseFunc, constraints, 'function')
}
