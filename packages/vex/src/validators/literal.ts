// ============================================================
// Literal & Enum Validators
// ============================================================

import type { Parser, Result } from '../core'
import { createValidator, ValidationError } from '../core'

type Primitive = string | number | boolean | null | undefined

/**
 * Create a literal validator (exact value match)
 *
 * @example
 * const validateAdmin = literal('admin')
 * const validateTrue = literal(true)
 */
export const literal = <T extends Primitive>(value: T): Parser<T> => {
	const msg = `Expected ${JSON.stringify(value)}`
	const err: Result<never> = { ok: false, error: msg }

	const validator = createValidator(
		(v) => {
			if (v !== value) throw new ValidationError(msg)
			return value
		},
		(v) => (v === value ? { ok: true, value } : err),
		{ type: 'literal', constraints: { value } }
	)

	return validator
}

/**
 * Create an enum validator (one of literal values)
 *
 * @example
 * const validateRole = enum_(['admin', 'user', 'guest'] as const)
 */
export const enum_ = <T extends readonly [Primitive, ...Primitive[]]>(
	values: T
): Parser<T[number]> => {
	const valuesSet = new Set<Primitive>(values)
	const msg = `Expected one of: ${values.map((v) => JSON.stringify(v)).join(', ')}`
	const err: Result<never> = { ok: false, error: msg }

	const validator = createValidator(
		(v) => {
			if (!valuesSet.has(v as Primitive)) throw new ValidationError(msg)
			return v as T[number]
		},
		(v) => (valuesSet.has(v as Primitive) ? { ok: true, value: v as T[number] } : err),
		{ type: 'enum', constraints: { values: [...values] } }
	)

	return validator
}

/** Alias for enum_ */
export { enum_ as enumType }

/** Alias for enum_ - Valibot compatibility */
export { enum_ as picklist }
