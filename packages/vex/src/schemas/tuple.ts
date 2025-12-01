// ============================================================
// Tuple Schema
// ============================================================

import type { MetaAction, Parser, Result, StandardSchemaV1 } from '../core'
import {
	addSchemaMetadata,
	applyMetaActions,
	isMetaAction,
	type Metadata,
	ValidationError,
} from '../core'

const ERR_ARRAY: Result<never> = { ok: false, error: 'Expected array' }

type TupleOutput<T extends readonly Parser<unknown>[]> = {
	[K in keyof T]: T[K] extends Parser<infer O> ? O : never
}

/** Argument type for tuple - can be a schema or MetaAction */
type TupleArg = Parser<unknown> | MetaAction

/**
 * Separate schemas from MetaActions in tuple arguments
 */
function separateTupleArgs(args: TupleArg[]): {
	schemas: Parser<unknown>[]
	metaActions: MetaAction[]
} {
	const schemas: Parser<unknown>[] = []
	const metaActions: MetaAction[] = []

	for (const arg of args) {
		if (isMetaAction(arg)) {
			metaActions.push(arg)
		} else {
			schemas.push(arg)
		}
	}

	return { schemas, metaActions }
}

/**
 * Create a tuple validator (fixed-length array with specific types)
 *
 * @example
 * tuple(num(), num())                          // [number, number]
 * tuple(str(), num(), bool())                  // [string, number, boolean]
 * tuple(str(), num(), description('Point'))   // with metadata
 */
export function tuple<A>(a: Parser<A>, ...rest: MetaAction[]): Parser<[A]>
export function tuple<A, B>(a: Parser<A>, b: Parser<B>, ...rest: MetaAction[]): Parser<[A, B]>
export function tuple<A, B, C>(
	a: Parser<A>,
	b: Parser<B>,
	c: Parser<C>,
	...rest: MetaAction[]
): Parser<[A, B, C]>
export function tuple<A, B, C, D>(
	a: Parser<A>,
	b: Parser<B>,
	c: Parser<C>,
	d: Parser<D>,
	...rest: MetaAction[]
): Parser<[A, B, C, D]>
export function tuple<A, B, C, D, E>(
	a: Parser<A>,
	b: Parser<B>,
	c: Parser<C>,
	d: Parser<D>,
	e: Parser<E>,
	...rest: MetaAction[]
): Parser<[A, B, C, D, E]>
export function tuple(...args: TupleArg[]): Parser<unknown[]> {
	const { schemas, metaActions } = separateTupleArgs(args)

	if (schemas.length === 0) {
		throw new Error('tuple() requires at least one schema')
	}

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
		return result as unknown[]
	}) as Parser<unknown[]>

	fn.safe = (value: unknown): Result<unknown[]> => {
		if (!Array.isArray(value)) return ERR_ARRAY as Result<unknown[]>
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

		return { ok: true, value: result as unknown[] }
	}

	// Add Standard Schema with path support
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<unknown[]> => {
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

			return { value: result as unknown[] }
		},
	}

	// Build metadata
	let metadata: Metadata = { type: 'tuple', inner: [...schemas] }

	// Apply MetaActions
	if (metaActions.length > 0) {
		metadata = applyMetaActions(metadata, metaActions)
	}

	addSchemaMetadata(fn, metadata)

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
 * looseTuple([num(), num()])                      // [number, number], ignores extras
 * looseTuple([num(), num()], description('Point')) // with metadata
 */
export const looseTuple = <T extends readonly [Parser<unknown>, ...Parser<unknown>[]]>(
	schemas: T,
	...metaActions: MetaAction[]
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

	// Build metadata
	let metadata: Metadata = { type: 'tuple', inner: [...schemas], constraints: { loose: true } }

	// Apply MetaActions
	if (metaActions.length > 0) {
		metadata = applyMetaActions(metadata, metaActions)
	}

	addSchemaMetadata(fn, metadata)

	return fn
}

/**
 * Tuple with rest - fixed items followed by rest elements
 *
 * @example
 * tupleWithRest([str(), num()], str())                      // [string, number, ...string[]]
 * tupleWithRest([str(), num()], str(), description('Args')) // with metadata
 */
export const tupleWithRest = <
	T extends readonly [Parser<unknown>, ...Parser<unknown>[]],
	R extends Parser<unknown>,
>(
	schemas: T,
	rest: R,
	...metaActions: MetaAction[]
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

	// Build metadata
	let metadata: Metadata = { type: 'tuple', inner: [...schemas], constraints: { rest } }

	// Apply MetaActions
	if (metaActions.length > 0) {
		metadata = applyMetaActions(metadata, metaActions)
	}

	addSchemaMetadata(fn, metadata)

	return fn
}
