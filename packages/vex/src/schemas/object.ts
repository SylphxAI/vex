// ============================================================
// Object Schema
// ============================================================

import type { Parser, Result, StandardSchemaV1 } from '../core'
import { addSchemaMetadata, addStandardSchema, ValidationError } from '../core'

const ERR_OBJECT: Result<never> = { ok: false, error: 'Expected object' }

type Shape<T> = { [K in keyof T]: Parser<T[K]> }

/**
 * Create an object validator from a shape
 *
 * @example
 * const validateUser = object({
 *   name: pipe(str, nonempty),
 *   age: pipe(num, int, gte(0)),
 *   email: pipe(str, email),
 * })
 */
export const object = <T extends Record<string, unknown>>(shape: Shape<T>): Parser<T> => {
	// Pre-extract keys and validators for JIT-optimized indexed loops
	const keys = Object.keys(shape) as (keyof T)[]
	const validators = keys.map((k) => shape[k]) as Parser<unknown>[]
	const len = keys.length

	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		const input = value as Record<string, unknown>
		const result = {} as T

		for (let i = 0; i < len; i++) {
			const key = keys[i]!
			const validator = validators[i]!
			try {
				result[key] = validator(input[key as string]) as T[keyof T]
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error'
				throw new ValidationError(`${String(key)}: ${msg}`)
			}
		}

		return result
	}) as Parser<T>

	fn.safe = (value: unknown): Result<T> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return ERR_OBJECT as Result<T>
		}

		const input = value as Record<string, unknown>
		const result = {} as T

		for (let i = 0; i < len; i++) {
			const key = keys[i]!
			const validator = validators[i]!
			const v = input[key as string]
			if (validator.safe) {
				const r = validator.safe(v)
				if (!r.ok) {
					return { ok: false, error: `${String(key)}: ${r.error}` }
				}
				result[key] = r.value as T[keyof T]
			} else {
				try {
					result[key] = validator(v) as T[keyof T]
				} catch (e) {
					return {
						ok: false,
						error: `${String(key)}: ${e instanceof Error ? e.message : 'Unknown error'}`,
					}
				}
			}
		}

		return { ok: true, value: result }
	}

	// Add Standard Schema with path support
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<T> => {
			if (typeof value !== 'object' || value === null || Array.isArray(value)) {
				return { issues: [{ message: 'Expected object' }] }
			}

			const input = value as Record<string, unknown>
			const result = {} as T

			for (let i = 0; i < len; i++) {
				const key = keys[i]!
				const validator = validators[i]!
				const std = validator['~standard']
				if (std) {
					const r = std.validate(input[key as string]) as StandardSchemaV1.Result<unknown>
					if (r.issues) {
						return {
							issues: r.issues.map((issue) => ({
								...issue,
								path: [key as PropertyKey, ...(issue.path || [])],
							})),
						}
					}
					result[key] = r.value as T[keyof T]
				} else {
					try {
						result[key] = validator(input[key as string]) as T[keyof T]
					} catch (e) {
						return {
							issues: [
								{
									message: e instanceof Error ? e.message : 'Unknown error',
									path: [key as PropertyKey],
								},
							],
						}
					}
				}
			}

			return { value: result }
		},
	}

	// Add schema metadata for JSON Schema conversion
	addSchemaMetadata(fn, { type: 'object', inner: shape })

	return fn
}

/**
 * Make all properties optional
 */
export const partial = <T extends Record<string, unknown>>(
	schema: Parser<T>
): Parser<Partial<T>> => {
	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		if (schema.safe) {
			const result = schema.safe(value)
			if (result.ok) return result.value
		}

		return value as Partial<T>
	}) as Parser<Partial<T>>

	fn.safe = (value: unknown): Result<Partial<T>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return ERR_OBJECT as Result<Partial<T>>
		}
		return { ok: true, value: value as Partial<T> }
	}

	return addStandardSchema(fn)
}

/**
 * Allow extra properties (passthrough mode)
 */
export const passthrough = <T extends Record<string, unknown>>(
	schema: Parser<T>
): Parser<T & Record<string, unknown>> => {
	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		const validated = schema(value)
		return { ...value, ...validated } as T & Record<string, unknown>
	}) as Parser<T & Record<string, unknown>>

	fn.safe = (value: unknown): Result<T & Record<string, unknown>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return ERR_OBJECT as Result<T & Record<string, unknown>>
		}

		if (schema.safe) {
			const result = schema.safe(value)
			if (!result.ok) return result as Result<T & Record<string, unknown>>
			return { ok: true, value: { ...value, ...result.value } as T & Record<string, unknown> }
		}

		try {
			const validated = schema(value)
			return { ok: true, value: { ...value, ...validated } as T & Record<string, unknown> }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	return addStandardSchema(fn)
}

/**
 * Strip unknown properties (strict mode)
 */
export const strict = <T extends Record<string, unknown>>(schema: Parser<T>): Parser<T> => {
	return schema
}

/** Alias for strict */
export { strict as strip }

// ============================================================
// Object Utilities (shape-based)
// ============================================================

/**
 * Pick specific properties from an object shape
 *
 * @example
 * const userShape = { name: str, age: num, email: pipe(str, email) }
 * const validateName = object(pick(userShape, ['name']))
 */
export const pick = <T extends Record<string, Parser<unknown>>, K extends keyof T>(
	shape: T,
	keys: readonly K[]
): Pick<T, K> => {
	const result = {} as Pick<T, K>
	for (const key of keys) {
		if (key in shape) {
			result[key] = shape[key]
		}
	}
	return result
}

/**
 * Omit specific properties from an object shape
 *
 * @example
 * const userShape = { name: str, age: num, email: pipe(str, email) }
 * const validateWithoutEmail = object(omit(userShape, ['email']))
 */
export const omit = <T extends Record<string, Parser<unknown>>, K extends keyof T>(
	shape: T,
	keys: readonly K[]
): Omit<T, K> => {
	const keysSet = new Set<string>(keys as unknown as string[])
	const result = {} as Record<string, Parser<unknown>>
	for (const [key, value] of Object.entries(shape)) {
		if (!keysSet.has(key)) {
			result[key] = value
		}
	}
	return result as Omit<T, K>
}

/**
 * Extend an object shape with additional properties
 *
 * @example
 * const userShape = { name: str, age: num }
 * const adminShape = extend(userShape, { role: literal('admin') })
 */
export const extend = <
	T extends Record<string, Parser<unknown>>,
	U extends Record<string, Parser<unknown>>,
>(
	base: T,
	extension: U
): T & U => {
	return { ...base, ...extension }
}

/**
 * Merge two object shapes (alias for extend)
 */
export const merge = extend

/**
 * Make all properties required (opposite of partial)
 *
 * @example
 * const partialUser = object({ name: optional(str), age: optional(num) })
 * const fullUser = required(partialUser)
 */
export const required = <T extends Record<string, unknown>>(
	schema: Parser<Partial<T>>
): Parser<Required<T>> => {
	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		const result = schema(value) as Record<string, unknown>

		// Check that no values are undefined
		for (const [key, val] of Object.entries(result)) {
			if (val === undefined) {
				throw new ValidationError(`${key}: Required`)
			}
		}

		return result as Required<T>
	}) as Parser<Required<T>>

	fn.safe = (value: unknown): Result<Required<T>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return ERR_OBJECT as Result<Required<T>>
		}

		if (schema.safe) {
			const res = schema.safe(value)
			if (!res.ok) return res as Result<Required<T>>

			for (const [key, val] of Object.entries(res.value as Record<string, unknown>)) {
				if (val === undefined) {
					return { ok: false, error: `${key}: Required` }
				}
			}
			return { ok: true, value: res.value as Required<T> }
		}

		try {
			const result = schema(value) as Record<string, unknown>
			for (const [key, val] of Object.entries(result)) {
				if (val === undefined) {
					return { ok: false, error: `${key}: Required` }
				}
			}
			return { ok: true, value: result as Required<T> }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	return addStandardSchema(fn)
}

/**
 * Get the keys of an object schema as a union type validator
 *
 * @example
 * const userShape = { name: str, age: num }
 * const validateKey = keyof(userShape)
 * validateKey('name') // 'name'
 * validateKey('invalid') // throws
 */
export const keyof = <T extends Record<string, Parser<unknown>>>(
	shape: T
): Parser<keyof T> => {
	const keys = Object.keys(shape) as (keyof T)[]
	const keySet = new Set(keys as string[])
	const msg = `Expected one of: ${keys.join(', ')}`
	const err: Result<never> = { ok: false, error: msg }

	const fn = ((value: unknown) => {
		if (typeof value !== 'string' || !keySet.has(value)) {
			throw new ValidationError(msg)
		}
		return value as keyof T
	}) as Parser<keyof T>

	fn.safe = (value: unknown): Result<keyof T> => {
		if (typeof value !== 'string' || !keySet.has(value)) {
			return err as Result<keyof T>
		}
		return { ok: true, value: value as keyof T }
	}

	return addStandardSchema(fn)
}

/**
 * Strict object - strips unknown properties (alias for object)
 */
export const strictObject = object

/**
 * Loose object - allows and preserves unknown properties
 *
 * @example
 * const validateUser = looseObject({ name: str })
 * validateUser({ name: 'John', extra: 123 }) // { name: 'John', extra: 123 }
 */
export const looseObject = <T extends Record<string, unknown>>(
	shape: Shape<T>
): Parser<T & Record<string, unknown>> => {
	// Pre-extract keys and validators for JIT-optimized indexed loops
	const keys = Object.keys(shape) as (keyof T)[]
	const validators = keys.map((k) => shape[k]) as Parser<unknown>[]
	const len = keys.length

	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		const input = value as Record<string, unknown>
		const result = { ...input } as T & Record<string, unknown>

		for (let i = 0; i < len; i++) {
			const key = keys[i]!
			const validator = validators[i]!
			try {
				result[key] = validator(input[key as string]) as T[keyof T]
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error'
				throw new ValidationError(`${String(key)}: ${msg}`)
			}
		}

		return result
	}) as Parser<T & Record<string, unknown>>

	fn.safe = (value: unknown): Result<T & Record<string, unknown>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return ERR_OBJECT as Result<T & Record<string, unknown>>
		}

		const input = value as Record<string, unknown>
		const result = { ...input } as T & Record<string, unknown>

		for (let i = 0; i < len; i++) {
			const key = keys[i]!
			const validator = validators[i]!
			const v = input[key as string]
			if (validator.safe) {
				const r = validator.safe(v)
				if (!r.ok) {
					return { ok: false, error: `${String(key)}: ${r.error}` }
				}
				result[key] = r.value as T[keyof T]
			} else {
				try {
					result[key] = validator(v) as T[keyof T]
				} catch (e) {
					return {
						ok: false,
						error: `${String(key)}: ${e instanceof Error ? e.message : 'Unknown error'}`,
					}
				}
			}
		}

		return { ok: true, value: result }
	}

	return addStandardSchema(fn)
}

/**
 * Object with rest - validates known keys and rest with a schema
 *
 * @example
 * const validateConfig = objectWithRest({ name: str }, num)
 * validateConfig({ name: 'app', timeout: 5000, retries: 3 })
 */
export const objectWithRest = <T extends Record<string, unknown>, R>(
	shape: Shape<T>,
	rest: Parser<R>
): Parser<T & Record<string, R>> => {
	// Pre-extract keys and validators for JIT-optimized indexed loops
	const keys = Object.keys(shape) as (keyof T)[]
	const validators = keys.map((k) => shape[k]) as Parser<unknown>[]
	const len = keys.length
	const knownKeys = new Set(keys as string[])
	const hasRestSafe = rest.safe !== undefined

	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		const input = value as Record<string, unknown>
		const result: Record<string, unknown> = {}

		// Validate known keys
		for (let i = 0; i < len; i++) {
			const key = keys[i]!
			const validator = validators[i]!
			try {
				result[key as string] = validator(input[key as string])
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Unknown error'
				throw new ValidationError(`${String(key)}: ${msg}`)
			}
		}

		// Validate rest keys
		const inputKeys = Object.keys(input)
		for (let i = 0; i < inputKeys.length; i++) {
			const key = inputKeys[i]!
			if (!knownKeys.has(key)) {
				try {
					result[key] = rest(input[key])
				} catch (e) {
					const msg = e instanceof Error ? e.message : 'Unknown error'
					throw new ValidationError(`${key}: ${msg}`)
				}
			}
		}

		return result as T & Record<string, R>
	}) as Parser<T & Record<string, R>>

	fn.safe = (value: unknown): Result<T & Record<string, R>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return ERR_OBJECT as Result<T & Record<string, R>>
		}

		const input = value as Record<string, unknown>
		const result: Record<string, unknown> = {}

		// Validate known keys
		for (let i = 0; i < len; i++) {
			const key = keys[i]!
			const validator = validators[i]!
			const v = input[key as string]
			if (validator.safe) {
				const r = validator.safe(v)
				if (!r.ok) {
					return { ok: false, error: `${String(key)}: ${r.error}` }
				}
				result[key as string] = r.value
			} else {
				try {
					result[key as string] = validator(v)
				} catch (e) {
					return {
						ok: false,
						error: `${String(key)}: ${e instanceof Error ? e.message : 'Unknown error'}`,
					}
				}
			}
		}

		// Validate rest keys
		const inputKeys = Object.keys(input)
		if (hasRestSafe) {
			const restSafe = rest.safe!
			for (let i = 0; i < inputKeys.length; i++) {
				const key = inputKeys[i]!
				if (!knownKeys.has(key)) {
					const r = restSafe(input[key])
					if (!r.ok) {
						return { ok: false, error: `${key}: ${r.error}` }
					}
					result[key] = r.value
				}
			}
		} else {
			for (let i = 0; i < inputKeys.length; i++) {
				const key = inputKeys[i]!
				if (!knownKeys.has(key)) {
					try {
						result[key] = rest(input[key])
					} catch (e) {
						return {
							ok: false,
							error: `${key}: ${e instanceof Error ? e.message : 'Unknown error'}`,
						}
					}
				}
			}
		}

		return { ok: true, value: result as T & Record<string, R> }
	}

	return addStandardSchema(fn)
}

/**
 * Variant - discriminated union based on a key's literal value
 *
 * @example
 * const validateEvent = variant('type', [
 *   object({ type: literal('click'), x: num, y: num }),
 *   object({ type: literal('keypress'), key: str }),
 * ])
 */
export const variant = <K extends string, T extends Parser<Record<K, unknown>>[]>(
	key: K,
	options: T
): Parser<T[number] extends Parser<infer O> ? O : never> => {
	type Output = T[number] extends Parser<infer O> ? O : never

	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		const input = value as Record<string, unknown>
		const discriminant = input[key]

		for (const option of options) {
			if (option.safe) {
				const result = option.safe(value)
				if (result.ok) return result.value as Output
			} else {
				try {
					return option(value) as Output
				} catch {
					// Try next option
				}
			}
		}

		throw new ValidationError(`No matching variant for ${key}=${JSON.stringify(discriminant)}`)
	}) as Parser<Output>

	fn.safe = (value: unknown): Result<Output> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return ERR_OBJECT as Result<Output>
		}

		const input = value as Record<string, unknown>
		const discriminant = input[key]

		for (const option of options) {
			if (option.safe) {
				const result = option.safe(value)
				if (result.ok) return result as Result<Output>
			} else {
				try {
					return { ok: true, value: option(value) as Output }
				} catch {
					// Try next option
				}
			}
		}

		return { ok: false, error: `No matching variant for ${key}=${JSON.stringify(discriminant)}` }
	}

	return addStandardSchema(fn)
}
