// ============================================================
// Array Schema
// ============================================================

import type { Parser, Result, StandardSchemaV1, Validator } from '../core'
import { addSchemaMetadata, createValidator, ValidationError } from '../core'

const ERR_ARRAY: Result<never> = { ok: false, error: 'Expected array' }
const ERR_NONEMPTY: Result<never> = { ok: false, error: 'Array must not be empty' }

/**
 * Create an array validator
 *
 * @example
 * const validateNumbers = array(pipe(num, int))
 */
export const array = <T>(itemValidator: Parser<T>): Parser<T[]> => {
	// Cache safe method lookup for JIT
	const hasSafe = itemValidator.safe !== undefined

	const fn = ((value: unknown) => {
		if (!Array.isArray(value)) throw new ValidationError('Expected array')

		const len = value.length
		const result = new Array<T>(len)

		for (let i = 0; i < len; i++) {
			try {
				result[i] = itemValidator(value[i])
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error'
				throw new ValidationError(`[${i}]: ${msg}`)
			}
		}

		return result
	}) as Parser<T[]>

	fn.safe = (value: unknown): Result<T[]> => {
		if (!Array.isArray(value)) return ERR_ARRAY as Result<T[]>

		const len = value.length
		const result = new Array<T>(len)

		if (hasSafe) {
			const safe = itemValidator.safe!
			for (let i = 0; i < len; i++) {
				const r = safe(value[i])
				if (!r.ok) {
					return { ok: false, error: `[${i}]: ${r.error}` }
				}
				result[i] = r.value
			}
		} else {
			for (let i = 0; i < len; i++) {
				try {
					result[i] = itemValidator(value[i])
				} catch (e) {
					return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
				}
			}
		}

		return { ok: true, value: result }
	}

	// Add Standard Schema with path support
	const std = itemValidator['~standard']
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<T[]> => {
			if (!Array.isArray(value)) {
				return { issues: [{ message: 'Expected array' }] }
			}

			const len = value.length
			const result = new Array<T>(len)

			if (std) {
				for (let i = 0; i < len; i++) {
					const r = std.validate(value[i]) as StandardSchemaV1.Result<T>
					if (r.issues) {
						return {
							issues: r.issues.map((issue) => ({
								...issue,
								path: [i, ...(issue.path || [])],
							})),
						}
					}
					result[i] = r.value
				}
			} else {
				for (let i = 0; i < len; i++) {
					try {
						result[i] = itemValidator(value[i])
					} catch (e) {
						return {
							issues: [{ message: e instanceof Error ? e.message : 'Unknown error', path: [i] }],
						}
					}
				}
			}

			return { value: result }
		},
	}

	// Add schema metadata for JSON Schema conversion
	addSchemaMetadata(fn, { type: 'array', inner: itemValidator })

	return fn
}

// ============================================================
// Array Length Validators
// ============================================================

/** Array minimum length validator */
export const minLength = <T>(n: number): Validator<T[], T[]> => {
	const msg = `Array must have at least ${n} items`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (v.length < n) throw new ValidationError(msg)
			return v
		},
		(v) => (v.length >= n ? { ok: true, value: v } : err),
		{ type: 'minItems', constraints: { minItems: n } }
	)
}

/** Array maximum length validator */
export const maxLength = <T>(n: number): Validator<T[], T[]> => {
	const msg = `Array must have at most ${n} items`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (v.length > n) throw new ValidationError(msg)
			return v
		},
		(v) => (v.length <= n ? { ok: true, value: v } : err),
		{ type: 'maxItems', constraints: { maxItems: n } }
	)
}

/** Array exact length validator */
export const exactLength = <T>(n: number): Validator<T[], T[]> => {
	const msg = `Array must have exactly ${n} items`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (v.length !== n) throw new ValidationError(msg)
			return v
		},
		(v) => (v.length === n ? { ok: true, value: v } : err),
		{ type: 'exactItems', constraints: { minItems: n, maxItems: n } }
	)
}

/** Array non-empty validator */
export const nonemptyArray = <T>(): Validator<T[], [T, ...T[]]> => {
	return createValidator(
		(v) => {
			if (v.length === 0) throw new ValidationError('Array must not be empty')
			return v as [T, ...T[]]
		},
		(v) => (v.length > 0 ? { ok: true, value: v as [T, ...T[]] } : ERR_NONEMPTY),
		{ type: 'minItems', constraints: { minItems: 1 } }
	) as Validator<T[], [T, ...T[]]>
}
