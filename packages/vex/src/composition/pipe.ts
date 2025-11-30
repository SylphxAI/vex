// ============================================================
// Pipe Composition
// ============================================================

import type { Result, SchemaMetadata, Validator } from '../core'
import { addSchemaMetadata, addStandardSchema, getSchemaMetadata } from '../core'

/**
 * Pipe validators together (left to right)
 *
 * @example
 * const validateEmail = pipe(str, email)
 * const validateAge = pipe(num, int, gte(0), lte(150))
 */
export function pipe<A, B>(v1: Validator<A, B>): Validator<A, B>
export function pipe<A, B, C>(v1: Validator<A, B>, v2: Validator<B, C>): Validator<A, C>
export function pipe<A, B, C, D>(
	v1: Validator<A, B>,
	v2: Validator<B, C>,
	v3: Validator<C, D>
): Validator<A, D>
export function pipe<A, B, C, D, E>(
	v1: Validator<A, B>,
	v2: Validator<B, C>,
	v3: Validator<C, D>,
	v4: Validator<D, E>
): Validator<A, E>
export function pipe<A, B, C, D, E, F>(
	v1: Validator<A, B>,
	v2: Validator<B, C>,
	v3: Validator<C, D>,
	v4: Validator<D, E>,
	v5: Validator<E, F>
): Validator<A, F>
export function pipe<A, B, C, D, E, F, G>(
	v1: Validator<A, B>,
	v2: Validator<B, C>,
	v3: Validator<C, D>,
	v4: Validator<D, E>,
	v5: Validator<E, F>,
	v6: Validator<F, G>
): Validator<A, G>
export function pipe(...validators: Validator<unknown, unknown>[]): Validator<unknown, unknown> {
	const len = validators.length

	// Helper to safely call a validator
	const safeCall = (v: Validator<unknown, unknown>, value: unknown): Result<unknown> => {
		if (v.safe) return v.safe(value)
		try {
			return { ok: true as const, value: v(value) }
		} catch (e) {
			return { ok: false as const, error: e instanceof Error ? e.message : 'Unknown error' }
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

	// Collect schema metadata from all validators in the pipe
	// The first validator provides the base type, subsequent validators add constraints
	const metadataSteps = validators
		.map((v) => getSchemaMetadata(v))
		.filter((m): m is NonNullable<typeof m> => m !== undefined)

	if (metadataSteps.length > 0) {
		// Merge constraints from all validators
		const first = metadataSteps[0]!
		const mergedConstraints: Record<string, unknown> = {}
		for (const step of metadataSteps) {
			if (step.constraints) {
				Object.assign(mergedConstraints, step.constraints)
			}
		}
		const metadata: SchemaMetadata = { type: first.type }
		if (Object.keys(mergedConstraints).length > 0) {
			metadata.constraints = mergedConstraints
		}
		if (metadataSteps.length > 1) {
			metadata.inner = metadataSteps
		} else if (first.inner !== undefined) {
			metadata.inner = first.inner
		}
		addSchemaMetadata(fn, metadata)
	}

	return addStandardSchema(fn)
}
