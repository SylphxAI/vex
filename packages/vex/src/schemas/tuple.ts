// ============================================================
// Tuple Schema
// ============================================================

import type { Parser, Result, StandardSchemaV1 } from '../core'
import { addSchemaMetadata, ValidationError } from '../core'

const ERR_ARRAY: Result<never> = { ok: false, error: 'Expected array' }

type TupleOutput<T extends readonly Parser<unknown>[]> = {
	[K in keyof T]: T[K] extends Parser<infer O> ? O : never
}

/**
 * Create a tuple validator (fixed-length array with specific types)
 *
 * @example
 * const validatePoint = tuple([num, num])
 * const validateEntry = tuple([str, num, bool])
 */
export const tuple = <T extends readonly [Parser<unknown>, ...Parser<unknown>[]]>(
	schemas: T
): Parser<TupleOutput<T>> => {
	const len = schemas.length

	const fn = ((value: unknown) => {
		if (!Array.isArray(value)) throw new ValidationError('Expected array')
		if (value.length !== len) {
			throw new ValidationError(`Expected ${len} items, got ${value.length}`)
		}

		const result = new Array(len)
		for (let i = 0; i < len; i++) {
			try {
				// biome-ignore lint/style/noNonNullAssertion: index is within bounds
				result[i] = schemas[i]!(value[i])
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error'
				throw new ValidationError(`[${i}]: ${msg}`)
			}
		}
		return result as TupleOutput<T>
	}) as Parser<TupleOutput<T>>

	fn.safe = (value: unknown): Result<TupleOutput<T>> => {
		if (!Array.isArray(value)) return ERR_ARRAY as Result<TupleOutput<T>>
		if (value.length !== len) {
			return { ok: false, error: `Expected ${len} items, got ${value.length}` }
		}

		const result = new Array(len)
		for (let i = 0; i < len; i++) {
			const schema = schemas[i]!
			if (schema.safe) {
				const r = schema.safe(value[i])
				if (!r.ok) return { ok: false, error: `[${i}]: ${r.error}` }
				result[i] = r.value
			} else {
				try {
					result[i] = schema(value[i])
				} catch (e) {
					return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
				}
			}
		}

		return { ok: true, value: result as TupleOutput<T> }
	}

	// Add Standard Schema with path support
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<TupleOutput<T>> => {
			if (!Array.isArray(value)) {
				return { issues: [{ message: 'Expected array' }] }
			}
			if (value.length !== len) {
				return { issues: [{ message: `Expected ${len} items, got ${value.length}` }] }
			}

			const result = new Array(len)
			for (let i = 0; i < len; i++) {
				const schema = schemas[i]!
				const std = schema['~standard']
				if (std) {
					const r = std.validate(value[i]) as StandardSchemaV1.Result<unknown>
					if (r.issues) {
						return {
							issues: r.issues.map((issue) => ({
								...issue,
								path: [i, ...(issue.path || [])],
							})),
						}
					}
					result[i] = r.value
				} else {
					try {
						result[i] = schema(value[i])
					} catch (e) {
						return {
							issues: [{ message: e instanceof Error ? e.message : 'Unknown error', path: [i] }],
						}
					}
				}
			}

			return { value: result as TupleOutput<T> }
		},
	}

	// Add schema metadata for JSON Schema conversion
	addSchemaMetadata(fn, { type: 'tuple', inner: [...schemas] })

	return fn
}

/**
 * Strict tuple - fails if extra elements present (same as tuple)
 */
export const strictTuple = tuple

/**
 * Loose tuple - allows extra elements (ignores them)
 *
 * @example
 * const validatePoint = looseTuple([num, num])
 * validatePoint([1, 2, 3]) // [1, 2] - extra element ignored
 */
export const looseTuple = <T extends readonly [Parser<unknown>, ...Parser<unknown>[]]>(
	schemas: T
): Parser<TupleOutput<T>> => {
	const len = schemas.length

	const fn = ((value: unknown) => {
		if (!Array.isArray(value)) throw new ValidationError('Expected array')
		if (value.length < len) {
			throw new ValidationError(`Expected at least ${len} items, got ${value.length}`)
		}

		const result = new Array(len)
		for (let i = 0; i < len; i++) {
			try {
				// biome-ignore lint/style/noNonNullAssertion: index is within bounds
				result[i] = schemas[i]!(value[i])
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error'
				throw new ValidationError(`[${i}]: ${msg}`)
			}
		}
		return result as TupleOutput<T>
	}) as Parser<TupleOutput<T>>

	fn.safe = (value: unknown): Result<TupleOutput<T>> => {
		if (!Array.isArray(value)) return ERR_ARRAY as Result<TupleOutput<T>>
		if (value.length < len) {
			return { ok: false, error: `Expected at least ${len} items, got ${value.length}` }
		}

		const result = new Array(len)
		for (let i = 0; i < len; i++) {
			const schema = schemas[i]!
			if (schema.safe) {
				const r = schema.safe(value[i])
				if (!r.ok) return { ok: false, error: `[${i}]: ${r.error}` }
				result[i] = r.value
			} else {
				try {
					result[i] = schema(value[i])
				} catch (e) {
					return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
				}
			}
		}

		return { ok: true, value: result as TupleOutput<T> }
	}

	// Standard Schema support
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<TupleOutput<T>> => {
			if (!Array.isArray(value)) {
				return { issues: [{ message: 'Expected array' }] }
			}
			if (value.length < len) {
				return { issues: [{ message: `Expected at least ${len} items` }] }
			}

			const result = new Array(len)
			for (let i = 0; i < len; i++) {
				const schema = schemas[i]!
				const std = schema['~standard']
				if (std) {
					const r = std.validate(value[i]) as StandardSchemaV1.Result<unknown>
					if (r.issues) {
						return {
							issues: r.issues.map((issue) => ({
								...issue,
								path: [i, ...(issue.path || [])],
							})),
						}
					}
					result[i] = r.value
				} else {
					try {
						result[i] = schema(value[i])
					} catch (e) {
						return {
							issues: [{ message: e instanceof Error ? e.message : 'Unknown error', path: [i] }],
						}
					}
				}
			}

			return { value: result as TupleOutput<T> }
		},
	}

	// Add schema metadata for JSON Schema conversion
	addSchemaMetadata(fn, { type: 'tuple', inner: [...schemas] })

	return fn
}

/**
 * Tuple with rest - fixed items followed by rest elements
 *
 * @example
 * const validateArgs = tupleWithRest([str, num], str)
 * validateArgs(['name', 42, 'extra1', 'extra2']) // ['name', 42, 'extra1', 'extra2']
 */
export const tupleWithRest = <
	T extends readonly [Parser<unknown>, ...Parser<unknown>[]],
	R extends Parser<unknown>,
>(
	schemas: T,
	rest: R
): Parser<[...TupleOutput<T>, ...(R extends Parser<infer O> ? O[] : never)]> => {
	type Output = [...TupleOutput<T>, ...(R extends Parser<infer O> ? O[] : never)]
	const len = schemas.length
	const hasRestSafe = rest.safe !== undefined

	const fn = ((value: unknown) => {
		if (!Array.isArray(value)) throw new ValidationError('Expected array')
		if (value.length < len) {
			throw new ValidationError(`Expected at least ${len} items, got ${value.length}`)
		}

		const result = new Array(value.length)

		// Validate fixed items
		for (let i = 0; i < len; i++) {
			try {
				// biome-ignore lint/style/noNonNullAssertion: index is within bounds
				result[i] = schemas[i]!(value[i])
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error'
				throw new ValidationError(`[${i}]: ${msg}`)
			}
		}

		// Validate rest items
		for (let i = len; i < value.length; i++) {
			try {
				result[i] = rest(value[i])
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error'
				throw new ValidationError(`[${i}]: ${msg}`)
			}
		}

		return result as Output
	}) as Parser<Output>

	fn.safe = (value: unknown): Result<Output> => {
		if (!Array.isArray(value)) return ERR_ARRAY as Result<Output>
		if (value.length < len) {
			return { ok: false, error: `Expected at least ${len} items, got ${value.length}` }
		}

		const result = new Array(value.length)

		// Validate fixed items
		for (let i = 0; i < len; i++) {
			const schema = schemas[i]!
			if (schema.safe) {
				const r = schema.safe(value[i])
				if (!r.ok) return { ok: false, error: `[${i}]: ${r.error}` }
				result[i] = r.value
			} else {
				try {
					result[i] = schema(value[i])
				} catch (e) {
					return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
				}
			}
		}

		// Validate rest items
		if (hasRestSafe) {
			const restSafe = rest.safe!
			for (let i = len; i < value.length; i++) {
				const r = restSafe(value[i])
				if (!r.ok) return { ok: false, error: `[${i}]: ${r.error}` }
				result[i] = r.value
			}
		} else {
			for (let i = len; i < value.length; i++) {
				try {
					result[i] = rest(value[i])
				} catch (e) {
					return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
				}
			}
		}

		return { ok: true, value: result as Output }
	}

	// Standard Schema support
	const restStd = rest['~standard']
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<Output> => {
			if (!Array.isArray(value)) {
				return { issues: [{ message: 'Expected array' }] }
			}
			if (value.length < len) {
				return { issues: [{ message: `Expected at least ${len} items` }] }
			}

			const result = new Array(value.length)

			for (let i = 0; i < len; i++) {
				const schema = schemas[i]!
				const std = schema['~standard']
				if (std) {
					const r = std.validate(value[i]) as StandardSchemaV1.Result<unknown>
					if (r.issues) {
						return {
							issues: r.issues.map((issue) => ({
								...issue,
								path: [i, ...(issue.path || [])],
							})),
						}
					}
					result[i] = r.value
				} else {
					try {
						result[i] = schema(value[i])
					} catch (e) {
						return {
							issues: [{ message: e instanceof Error ? e.message : 'Unknown error', path: [i] }],
						}
					}
				}
			}

			if (restStd) {
				for (let i = len; i < value.length; i++) {
					const r = restStd.validate(value[i]) as StandardSchemaV1.Result<unknown>
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
				for (let i = len; i < value.length; i++) {
					try {
						result[i] = rest(value[i])
					} catch (e) {
						return {
							issues: [{ message: e instanceof Error ? e.message : 'Unknown error', path: [i] }],
						}
					}
				}
			}

			return { value: result as Output }
		},
	}

	// Add schema metadata for JSON Schema conversion
	addSchemaMetadata(fn, { type: 'tuple', inner: [...schemas], constraints: { rest } })

	return fn
}
