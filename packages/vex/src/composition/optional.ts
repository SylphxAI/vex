// ============================================================
// Optional, Nullable, WithDefault
// ============================================================

import type { Result, Validator } from '../core'
import { addStandardSchema, getErrorMsg, getMeta, setMeta, ValidationError, wrapMeta } from '../core'

/**
 * Make a validator optional (allows undefined)
 *
 * Preserves metadata (description, title, etc.) from inner validator.
 */
export const optional = <I, O>(
	validator: Validator<I, O>,
): Validator<I | undefined, O | undefined> => {
	const fn = ((v: I | undefined) => {
		if (v === undefined) return undefined
		return validator(v)
	}) as Validator<I | undefined, O | undefined>

	fn.safe = (v: I | undefined): Result<O | undefined> => {
		if (v === undefined) return { ok: true, value: undefined }
		if (validator.safe) return validator.safe(v)
		try {
			return { ok: true, value: validator(v) }
		} catch (e) {
			return { ok: false, error: getErrorMsg(e) }
		}
	}

	// Use wrapMeta to preserve documentation from inner validator
	setMeta(fn, wrapMeta('optional', getMeta(validator), validator))

	return addStandardSchema(fn)
}

/**
 * Make a validator nullable (allows null)
 *
 * Preserves metadata (description, title, etc.) from inner validator.
 */
export const nullable = <I, O>(validator: Validator<I, O>): Validator<I | null, O | null> => {
	const fn = ((v: I | null) => {
		if (v === null) return null
		return validator(v)
	}) as Validator<I | null, O | null>

	fn.safe = (v: I | null): Result<O | null> => {
		if (v === null) return { ok: true, value: null }
		if (validator.safe) return validator.safe(v)
		try {
			return { ok: true, value: validator(v) }
		} catch (e) {
			return { ok: false, error: getErrorMsg(e) }
		}
	}

	// Use wrapMeta to preserve documentation from inner validator
	setMeta(fn, wrapMeta('nullable', getMeta(validator), validator))

	return addStandardSchema(fn)
}

/**
 * Make a validator nullish (allows null or undefined)
 *
 * Preserves metadata (description, title, etc.) from inner validator.
 */
export const nullish = <I, O>(
	validator: Validator<I, O>,
): Validator<I | null | undefined, O | null | undefined> => {
	const fn = ((v: I | null | undefined) => {
		if (v === null || v === undefined) return v
		return validator(v)
	}) as Validator<I | null | undefined, O | null | undefined>

	fn.safe = (v: I | null | undefined): Result<O | null | undefined> => {
		if (v === null || v === undefined) return { ok: true, value: v as O | null | undefined }
		if (validator.safe) return validator.safe(v)
		try {
			return { ok: true, value: validator(v) }
		} catch (e) {
			return { ok: false, error: getErrorMsg(e) }
		}
	}

	// Use wrapMeta to preserve documentation from inner validator
	setMeta(fn, wrapMeta('nullish', getMeta(validator), validator))

	return addStandardSchema(fn)
}

/**
 * Provide a default value when undefined
 *
 * Preserves metadata (description, title, etc.) from inner validator.
 */
export const withDefault = <I, O>(
	validator: Validator<I, O>,
	defaultValue: O,
): Validator<I | undefined, O> => {
	const fn = ((v: I | undefined) => {
		if (v === undefined) return defaultValue
		return validator(v)
	}) as Validator<I | undefined, O>

	fn.safe = (v: I | undefined): Result<O> => {
		if (v === undefined) return { ok: true, value: defaultValue }
		if (validator.safe) return validator.safe(v)
		try {
			return { ok: true, value: validator(v) }
		} catch (e) {
			return { ok: false, error: getErrorMsg(e) }
		}
	}

	// Use wrapMeta to preserve documentation from inner validator
	setMeta(fn, wrapMeta('default', getMeta(validator), validator, { default: defaultValue }))

	return addStandardSchema(fn)
}

/**
 * Make a validator undefinedable (allows undefined) - alias for optional
 */
export { optional as undefinedable }

/**
 * Remove null from a nullable type (opposite of nullable)
 * Throws if value is null
 *
 * Preserves metadata (description, title, etc.) from inner validator.
 */
export const nonNullable = <I, O>(
	validator: Validator<I | null, O | null>,
): Validator<I, Exclude<O, null>> => {
	const fn = ((v: I) => {
		const result = validator(v)
		if (result === null) throw new ValidationError('Value cannot be null')
		return result as Exclude<O, null>
	}) as Validator<I, Exclude<O, null>>

	fn.safe = (v: I): Result<Exclude<O, null>> => {
		if (validator.safe) {
			const res = validator.safe(v)
			if (!res.ok) return res
			if (res.value === null) return { ok: false, error: 'Value cannot be null' }
			return { ok: true, value: res.value as Exclude<O, null> }
		}
		try {
			const result = validator(v)
			if (result === null) return { ok: false, error: 'Value cannot be null' }
			return { ok: true, value: result as Exclude<O, null> }
		} catch (e) {
			return { ok: false, error: getErrorMsg(e) }
		}
	}

	// Use wrapMeta to preserve documentation from inner validator
	setMeta(fn, wrapMeta('nonNullable', getMeta(validator), validator))

	return addStandardSchema(fn)
}

/**
 * Remove null and undefined from a nullish type (opposite of nullish)
 * Throws if value is null or undefined
 *
 * Preserves metadata (description, title, etc.) from inner validator.
 */
export const nonNullish = <I, O>(
	validator: Validator<I | null | undefined, O | null | undefined>,
): Validator<I, Exclude<O, null | undefined>> => {
	const fn = ((v: I) => {
		const result = validator(v)
		if (result === null || result === undefined)
			throw new ValidationError('Value cannot be null or undefined')
		return result as Exclude<O, null | undefined>
	}) as Validator<I, Exclude<O, null | undefined>>

	fn.safe = (v: I): Result<Exclude<O, null | undefined>> => {
		if (validator.safe) {
			const res = validator.safe(v)
			if (!res.ok) return res
			if (res.value === null || res.value === undefined)
				return { ok: false, error: 'Value cannot be null or undefined' }
			return { ok: true, value: res.value as Exclude<O, null | undefined> }
		}
		try {
			const result = validator(v)
			if (result === null || result === undefined)
				return { ok: false, error: 'Value cannot be null or undefined' }
			return { ok: true, value: result as Exclude<O, null | undefined> }
		} catch (e) {
			return { ok: false, error: getErrorMsg(e) }
		}
	}

	// Use wrapMeta to preserve documentation from inner validator
	setMeta(fn, wrapMeta('nonNullish', getMeta(validator), validator))

	return addStandardSchema(fn)
}

/**
 * Remove undefined from an optional type (opposite of optional)
 * Throws if value is undefined
 *
 * Preserves metadata (description, title, etc.) from inner validator.
 */
export const nonOptional = <I, O>(
	validator: Validator<I | undefined, O | undefined>,
): Validator<I, Exclude<O, undefined>> => {
	const fn = ((v: I) => {
		const result = validator(v)
		if (result === undefined) throw new ValidationError('Value cannot be undefined')
		return result as Exclude<O, undefined>
	}) as Validator<I, Exclude<O, undefined>>

	fn.safe = (v: I): Result<Exclude<O, undefined>> => {
		if (validator.safe) {
			const res = validator.safe(v)
			if (!res.ok) return res
			if (res.value === undefined) return { ok: false, error: 'Value cannot be undefined' }
			return { ok: true, value: res.value as Exclude<O, undefined> }
		}
		try {
			const result = validator(v)
			if (result === undefined) return { ok: false, error: 'Value cannot be undefined' }
			return { ok: true, value: result as Exclude<O, undefined> }
		} catch (e) {
			return { ok: false, error: getErrorMsg(e) }
		}
	}

	// Use wrapMeta to preserve documentation from inner validator
	setMeta(fn, wrapMeta('nonOptional', getMeta(validator), validator))

	return addStandardSchema(fn)
}

/**
 * Exact optional - only allows undefined, not missing property
 * This is useful for strict object validation where you want to distinguish
 * between a missing property and an explicitly undefined value
 *
 * Preserves metadata (description, title, etc.) from inner validator.
 *
 * @example
 * const schema = object({ name: exactOptional(str) })
 * schema({ name: undefined }) // OK
 * schema({}) // Error - name is required but can be undefined
 */
export const exactOptional = <I, O>(
	validator: Validator<I, O>,
): Validator<I | undefined, O | undefined> => {
	const fn = ((v: I | undefined) => {
		if (v === undefined) return undefined
		return validator(v)
	}) as Validator<I | undefined, O | undefined>

	fn.safe = (v: I | undefined): Result<O | undefined> => {
		if (v === undefined) return { ok: true, value: undefined }
		if (validator.safe) return validator.safe(v)
		try {
			return { ok: true, value: validator(v) }
		} catch (e) {
			return { ok: false, error: getErrorMsg(e) }
		}
	}

	// Use wrapMeta to preserve documentation from inner validator
	setMeta(fn, wrapMeta('exactOptional', getMeta(validator), validator))

	return addStandardSchema(fn)
}

/**
 * Provide a fallback value when validation fails
 *
 * Preserves metadata (description, title, etc.) from inner validator.
 */
export const fallback = <I, O>(validator: Validator<I, O>, fallbackValue: O): Validator<I, O> => {
	const fn = ((v: I) => {
		try {
			return validator(v)
		} catch {
			return fallbackValue
		}
	}) as Validator<I, O>

	fn.safe = (v: I): Result<O> => {
		if (validator.safe) {
			const res = validator.safe(v)
			if (!res.ok) return { ok: true, value: fallbackValue }
			return res
		}
		try {
			return { ok: true, value: validator(v) }
		} catch {
			return { ok: true, value: fallbackValue }
		}
	}

	// Use wrapMeta to preserve documentation from inner validator
	setMeta(fn, wrapMeta('fallback', getMeta(validator), validator, { fallback: fallbackValue }))

	return addStandardSchema(fn)
}
