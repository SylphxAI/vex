// ============================================================
// Pipe Composition
// ============================================================

import type { Result, Validator } from '../core'
import { addStandardSchema, getErrorMsg, getMeta, mergeMeta, META_KEY, type Metadata } from '../core'

/**
 * Pipe validators together (left to right)
 *
 * Metadata semantics:
 * - type: First validator's type (base type)
 * - constraints: Merge all (accumulate)
 * - description/title/examples: Last one wins (most specific)
 * - brand/flavor: Last one wins
 *
 * @example
 * const validateEmail = pipe(str(), email)
 * const validateAge = pipe(num(), int, gte(0), lte(150))
 * const documented = pipe(str(), description(str(), 'User email'))
 */
export function pipe<A, B>(v1: Validator<A, B>): Validator<A, B>
export function pipe<A, B, C>(v1: Validator<A, B>, v2: Validator<B, C>): Validator<A, C>
export function pipe<A, B, C, D>(
	v1: Validator<A, B>,
	v2: Validator<B, C>,
	v3: Validator<C, D>,
): Validator<A, D>
export function pipe<A, B, C, D, E>(
	v1: Validator<A, B>,
	v2: Validator<B, C>,
	v3: Validator<C, D>,
	v4: Validator<D, E>,
): Validator<A, E>
export function pipe<A, B, C, D, E, F>(
	v1: Validator<A, B>,
	v2: Validator<B, C>,
	v3: Validator<C, D>,
	v4: Validator<D, E>,
	v5: Validator<E, F>,
): Validator<A, F>
export function pipe<A, B, C, D, E, F, G>(
	v1: Validator<A, B>,
	v2: Validator<B, C>,
	v3: Validator<C, D>,
	v4: Validator<D, E>,
	v5: Validator<E, F>,
	v6: Validator<F, G>,
): Validator<A, G>
export function pipe(...validators: Validator<unknown, unknown>[]): Validator<unknown, unknown> {
	const len = validators.length

	// Helper to safely call a validator
	const safeCall = (v: Validator<unknown, unknown>, value: unknown): Result<unknown> => {
		if (v.safe) return v.safe(value)
		try {
			return { ok: true as const, value: v(value) }
		} catch (e) {
			return { ok: false as const, error: getErrorMsg(e) }
		}
	}

	// JIT-optimized fast paths for common cases (monomorphic call sites)
	let fn: Validator<unknown, unknown>

	if (len === 1) {
		const v0 = validators[0]!
		fn = ((value: unknown) => v0(value)) as Validator<unknown, unknown>
		fn.safe = (value: unknown) => safeCall(v0, value)
	} else if (len === 2) {
		const [v0, v1] = validators as [Validator<unknown, unknown>, Validator<unknown, unknown>]
		fn = ((value: unknown) => v1(v0(value))) as Validator<unknown, unknown>
		fn.safe = (value: unknown): Result<unknown> => {
			const r0 = safeCall(v0, value)
			if (!r0.ok) return r0
			return safeCall(v1, r0.value)
		}
	} else if (len === 3) {
		const [v0, v1, v2] = validators as [
			Validator<unknown, unknown>,
			Validator<unknown, unknown>,
			Validator<unknown, unknown>,
		]
		fn = ((value: unknown) => v2(v1(v0(value)))) as Validator<unknown, unknown>
		fn.safe = (value: unknown): Result<unknown> => {
			const r0 = safeCall(v0, value)
			if (!r0.ok) return r0
			const r1 = safeCall(v1, r0.value)
			if (!r1.ok) return r1
			return safeCall(v2, r1.value)
		}
	} else if (len === 4) {
		const [v0, v1, v2, v3] = validators as [
			Validator<unknown, unknown>,
			Validator<unknown, unknown>,
			Validator<unknown, unknown>,
			Validator<unknown, unknown>,
		]
		fn = ((value: unknown) => v3(v2(v1(v0(value))))) as Validator<unknown, unknown>
		fn.safe = (value: unknown): Result<unknown> => {
			const r0 = safeCall(v0, value)
			if (!r0.ok) return r0
			const r1 = safeCall(v1, r0.value)
			if (!r1.ok) return r1
			const r2 = safeCall(v2, r1.value)
			if (!r2.ok) return r2
			return safeCall(v3, r2.value)
		}
	} else {
		// Generic fallback for 5+ validators
		fn = ((value: unknown) => {
			let result = value
			for (let i = 0; i < len; i++) {
				result = validators[i]?.(result)
			}
			return result
		}) as Validator<unknown, unknown>

		fn.safe = (value: unknown): Result<unknown> => {
			let result: unknown = value
			for (let i = 0; i < len; i++) {
				const r = safeCall(validators[i]!, result)
				if (!r.ok) return r
				result = r.value
			}
			return { ok: true as const, value: result }
		}
	}

	// Lazy metadata merging - only compute when accessed (reduces allocation on pipe creation)
	let cachedMeta: Metadata | undefined | null = null // null = not computed, undefined = computed but empty
	Object.defineProperty(fn, META_KEY, {
		get() {
			if (cachedMeta === null) {
				const metadataSteps = validators.map((v) => getMeta(v))
				cachedMeta = mergeMeta(metadataSteps)
			}
			return cachedMeta
		},
		enumerable: true,
		configurable: true,
	})

	return addStandardSchema(fn)
}
