// ============================================================
// Lazy Schema (for recursive types)
// ============================================================

import type { Parser, Result, StandardSchemaV1 } from '../core'
import { addSchemaMetadata } from '../core'

/**
 * Create a lazy validator for recursive schemas
 *
 * @example
 * type Node = { value: number; children: Node[] }
 * const nodeValidator: Parser<Node> = lazy(() => object({
 *   value: num,
 *   children: array(nodeValidator),
 * }))
 */
export const lazy = <T>(factory: () => Parser<T>): Parser<T> => {
	let cached: Parser<T> | null = null

	const getValidator = () => {
		if (!cached) cached = factory()
		return cached
	}

	const fn = ((value: unknown) => {
		return getValidator()(value)
	}) as Parser<T>

	fn.safe = (value: unknown): Result<T> => {
		const validator = getValidator()
		if (validator.safe) return validator.safe(value)
		try {
			return { ok: true, value: validator(value) }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	// Add Standard Schema
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<T> => {
			const validator = getValidator()
			const std = validator['~standard']
			if (std) return std.validate(value) as StandardSchemaV1.Result<T>
			if (validator.safe) {
				const result = validator.safe(value)
				if (result.ok) return { value: result.value }
				return { issues: [{ message: result.error }] }
			}
			try {
				return { value: validator(value) }
			} catch (e) {
				return { issues: [{ message: e instanceof Error ? e.message : 'Unknown error' }] }
			}
		},
	}

	// Add metadata for JSON Schema conversion - use getter for lazy evaluation
	addSchemaMetadata(fn, {
		type: 'lazy',
		get inner() {
			return getValidator()
		},
	})

	return fn
}
