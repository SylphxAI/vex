// ============================================================
// Special Type Validators
// ============================================================

import type { Parser } from '../core'
import { createValidator, ValidationError } from '../core'

/** any - accepts any value */
export const any: Parser<unknown> = createValidator(
	(v) => v,
	(v) => ({ ok: true, value: v }),
	{ type: 'any' },
)

/** unknown - accepts any value (same as any but stricter type) */
export const unknown: Parser<unknown> = createValidator(
	(v) => v,
	(v) => ({ ok: true, value: v }),
	{ type: 'unknown' },
)

/** never - always fails */
export const never: Parser<never> = createValidator(
	() => {
		throw new ValidationError('Value not allowed')
	},
	() => ({ ok: false, error: 'Value not allowed' }),
	{ type: 'never' },
)

/** void - accepts undefined */
export const voidType: Parser<void> = createValidator(
	(v) => {
		if (v !== undefined) throw new ValidationError('Expected undefined')
		return undefined
	},
	(v) =>
		v === undefined ? { ok: true, value: undefined } : { ok: false, error: 'Expected undefined' },
	{ type: 'void' },
)

/** null - accepts null */
export const nullType: Parser<null> = createValidator(
	(v) => {
		if (v !== null) throw new ValidationError('Expected null')
		return null
	},
	(v) => (v === null ? { ok: true, value: null } : { ok: false, error: 'Expected null' }),
	{ type: 'null' },
)

/** undefined - accepts undefined */
export const undefinedType: Parser<undefined> = createValidator(
	(v) => {
		if (v !== undefined) throw new ValidationError('Expected undefined')
		return undefined
	},
	(v) =>
		v === undefined ? { ok: true, value: undefined } : { ok: false, error: 'Expected undefined' },
	{ type: 'undefined' },
)

/** NaN - accepts only NaN */
export const nan: Parser<number> = createValidator(
	(v) => {
		if (typeof v !== 'number' || !Number.isNaN(v)) throw new ValidationError('Expected NaN')
		return v
	},
	(v) =>
		typeof v === 'number' && Number.isNaN(v)
			? { ok: true, value: v }
			: { ok: false, error: 'Expected NaN' },
	{ type: 'nan' },
)

/** symbol - accepts symbol */
export const symbol: Parser<symbol> = createValidator(
	(v) => {
		if (typeof v !== 'symbol') throw new ValidationError('Expected symbol')
		return v
	},
	(v) => (typeof v === 'symbol' ? { ok: true, value: v } : { ok: false, error: 'Expected symbol' }),
	{ type: 'symbol' },
)

/** function - accepts function */
// biome-ignore lint/complexity/noBannedTypes: intentional for validator
export const func: Parser<Function> = createValidator(
	(v) => {
		if (typeof v !== 'function') throw new ValidationError('Expected function')
		// biome-ignore lint/complexity/noBannedTypes: intentional for validator
		return v as Function
	},
	(v) =>
		// biome-ignore lint/complexity/noBannedTypes: intentional for validator
		typeof v === 'function'
			? { ok: true, value: v as Function }
			: { ok: false, error: 'Expected function' },
)

/** promise - accepts Promise */
export const promise: Parser<Promise<unknown>> = createValidator(
	(v) => {
		if (!(v instanceof Promise)) throw new ValidationError('Expected Promise')
		return v
	},
	(v) => (v instanceof Promise ? { ok: true, value: v } : { ok: false, error: 'Expected Promise' }),
)

/**
 * instance - validates that value is instance of a class
 *
 * @example
 * const validateDate = instance(Date)
 * const validateError = instance(Error)
 */
export const instance = <T>(ctor: new (...args: unknown[]) => T): Parser<T> => {
	const name = ctor.name || 'class'
	const msg = `Expected instance of ${name}`
	return createValidator(
		(v) => {
			if (!(v instanceof ctor)) throw new ValidationError(msg)
			return v as T
		},
		(v) => (v instanceof ctor ? { ok: true, value: v as T } : { ok: false, error: msg }),
	)
}

/** blob - accepts Blob */
export const blob: Parser<Blob> = createValidator(
	(v) => {
		if (!(v instanceof Blob)) throw new ValidationError('Expected Blob')
		return v
	},
	(v) => (v instanceof Blob ? { ok: true, value: v } : { ok: false, error: 'Expected Blob' }),
)

/** file - accepts File */
export const file: Parser<File> = createValidator(
	(v) => {
		if (!(v instanceof File)) throw new ValidationError('Expected File')
		return v
	},
	(v) => (v instanceof File ? { ok: true, value: v } : { ok: false, error: 'Expected File' }),
)

/**
 * mimeType - validates Blob/File MIME type
 *
 * @example
 * const validateImage = mimeType(['image/png', 'image/jpeg'])
 */
export const mimeType = (types: readonly string[]): Parser<Blob> => {
	const typeSet = new Set(types)
	const msg = `Expected MIME type: ${types.join(', ')}`
	return createValidator(
		(v) => {
			if (!(v instanceof Blob)) throw new ValidationError('Expected Blob')
			if (!typeSet.has(v.type)) throw new ValidationError(msg)
			return v
		},
		(v) => {
			if (!(v instanceof Blob)) return { ok: false, error: 'Expected Blob' }
			if (!typeSet.has(v.type)) return { ok: false, error: msg }
			return { ok: true, value: v }
		},
	)
}
