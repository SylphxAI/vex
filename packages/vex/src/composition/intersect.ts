// ============================================================
// Intersect Composition
// ============================================================

import type { Parser, Result, StandardSchemaV1 } from '../core'
import { addSchemaMetadata } from '../core'

type IntersectOutput<T extends readonly Parser<unknown>[]> = T extends readonly [
	Parser<infer A>,
	...infer Rest,
]
	? Rest extends readonly Parser<unknown>[]
		? A & IntersectOutput<Rest>
		: A
	: unknown

/**
 * Create an intersect validator (value must match ALL schemas)
 *
 * @example
 * const validateAdminUser = intersect([
 *   object({ name: str, email: pipe(str, email) }),
 *   object({ role: literal('admin'), permissions: array(str) }),
 * ])
 */
export const intersect = <T extends readonly [Parser<unknown>, ...Parser<unknown>[]]>(
	schemas: T
): Parser<IntersectOutput<T>> => {
	const msg = 'Value does not match all schemas in intersect'

	const fn = ((value: unknown) => {
		let result: unknown = {}

		for (const schema of schemas) {
			const validated = schema(value)
			if (typeof validated === 'object' && validated !== null && typeof result === 'object') {
				result = { ...result, ...validated }
			} else {
				result = validated
			}
		}

		return result as IntersectOutput<T>
	}) as Parser<IntersectOutput<T>>

	fn.safe = (value: unknown): Result<IntersectOutput<T>> => {
		let result: unknown = {}

		for (const schema of schemas) {
			if (schema.safe) {
				const r = schema.safe(value)
				if (!r.ok) return { ok: false, error: r.error }
				if (typeof r.value === 'object' && r.value !== null && typeof result === 'object') {
					result = { ...result, ...r.value }
				} else {
					result = r.value
				}
			} else {
				try {
					const validated = schema(value)
					if (typeof validated === 'object' && validated !== null && typeof result === 'object') {
						result = { ...result, ...validated }
					} else {
						result = validated
					}
				} catch (e) {
					return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
				}
			}
		}

		return { ok: true, value: result as IntersectOutput<T> }
	}

	// Add Standard Schema
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<IntersectOutput<T>> => {
			let result: unknown = {}

			for (const schema of schemas) {
				const std = schema['~standard']
				if (std) {
					const r = std.validate(value) as StandardSchemaV1.Result<unknown>
					if (r.issues) return r as StandardSchemaV1.Result<IntersectOutput<T>>
					if (typeof r.value === 'object' && r.value !== null && typeof result === 'object') {
						result = { ...result, ...r.value }
					} else {
						result = r.value
					}
				} else if (schema.safe) {
					const r = schema.safe(value)
					if (!r.ok) return { issues: [{ message: r.error }] }
					if (typeof r.value === 'object' && r.value !== null && typeof result === 'object') {
						result = { ...result, ...r.value }
					} else {
						result = r.value
					}
				} else {
					try {
						const validated = schema(value)
						if (typeof validated === 'object' && validated !== null && typeof result === 'object') {
							result = { ...result, ...validated }
						} else {
							result = validated
						}
					} catch (e) {
						return { issues: [{ message: e instanceof Error ? e.message : msg }] }
					}
				}
			}

			return { value: result as IntersectOutput<T> }
		},
	}

	// Add schema metadata for JSON Schema conversion
	addSchemaMetadata(fn, { type: 'intersect', inner: [...schemas] })

	return fn
}
