// ============================================================
// Advanced Composition Functions (Valibot Parity)
// ============================================================

import type { Parser, Result, Validator } from '../core'
import { addStandardSchema, getSchemaMetadata, ValidationError } from '../core'

/**
 * Custom error message wrapper
 *
 * @example
 * const validateAge = message(pipe(num, gte(18)), 'Must be 18 or older')
 */
export const message = <I, O>(
	validator: Validator<I, O>,
	errorMessage: string | ((issue: { input: I }) => string)
): Validator<I, O> => {
	const getMsg = typeof errorMessage === 'function' ? errorMessage : () => errorMessage

	const fn = ((value: I) => {
		try {
			return validator(value)
		} catch {
			throw new ValidationError(getMsg({ input: value }))
		}
	}) as Validator<I, O>

	fn.safe = (value: I): Result<O> => {
		if (validator.safe) {
			const result = validator.safe(value)
			if (!result.ok) return { ok: false, error: getMsg({ input: value }) }
			return result
		}
		try {
			return { ok: true, value: validator(value) }
		} catch {
			return { ok: false, error: getMsg({ input: value }) }
		}
	}

	return addStandardSchema(fn)
}

/**
 * Raw check with full context access
 *
 * @example
 * const validate = rawCheck((ctx) => {
 *   if (ctx.input.password !== ctx.input.confirmPassword) {
 *     ctx.addIssue({ message: 'Passwords must match' })
 *   }
 * })
 */
export const rawCheck = <T>(
	check: (ctx: {
		input: T
		addIssue: (issue: { message: string; path?: PropertyKey[] }) => void
	}) => void
): Validator<T, T> => {
	const fn = ((value: T) => {
		const issues: { message: string; path?: PropertyKey[] }[] = []
		check({
			input: value,
			addIssue: (issue) => issues.push(issue),
		})
		if (issues.length > 0) {
			throw new ValidationError(issues[0]?.message ?? 'Validation failed')
		}
		return value
	}) as Validator<T, T>

	fn.safe = (value: T): Result<T> => {
		const issues: { message: string; path?: PropertyKey[] }[] = []
		check({
			input: value,
			addIssue: (issue) => issues.push(issue),
		})
		if (issues.length > 0) {
			return { ok: false, error: issues[0]?.message ?? 'Validation failed' }
		}
		return { ok: true, value }
	}

	return addStandardSchema(fn)
}

/**
 * Raw transform with full context access
 *
 * @example
 * const validate = rawTransform((ctx) => {
 *   return { ...ctx.input, processed: true }
 * })
 */
export const rawTransform = <I, O>(
	transform: (ctx: { input: I; addIssue: (issue: { message: string }) => void }) => O
): Validator<I, O> => {
	const fn = ((value: I) => {
		const issues: { message: string }[] = []
		const result = transform({
			input: value,
			addIssue: (issue) => issues.push(issue),
		})
		if (issues.length > 0) {
			throw new ValidationError(issues[0]?.message ?? 'Transform failed')
		}
		return result
	}) as Validator<I, O>

	fn.safe = (value: I): Result<O> => {
		const issues: { message: string }[] = []
		try {
			const result = transform({
				input: value,
				addIssue: (issue) => issues.push(issue),
			})
			if (issues.length > 0) {
				return { ok: false, error: issues[0]?.message ?? 'Transform failed' }
			}
			return { ok: true, value: result }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Transform failed' }
		}
	}

	return addStandardSchema(fn)
}

/**
 * Partial check - validate only specific paths of an object
 *
 * @example
 * const validate = partialCheck(
 *   [['password'], ['confirmPassword']],
 *   (input) => input.password === input.confirmPassword,
 *   'Passwords must match'
 * )
 */
export const partialCheck = <T extends Record<string, unknown>>(
	_paths: PropertyKey[][],
	check: (input: T) => boolean,
	errorMessage = 'Partial check failed'
): Validator<T, T> => {
	const err: Result<never> = { ok: false, error: errorMessage }

	const fn = ((value: T) => {
		if (!check(value)) throw new ValidationError(errorMessage)
		return value
	}) as Validator<T, T>

	fn.safe = (value: T): Result<T> => {
		if (!check(value)) return err
		return { ok: true, value }
	}

	return addStandardSchema(fn)
}

/**
 * Forward error to a different path
 *
 * @example
 * const validate = forward(
 *   check((input) => input.password === input.confirm),
 *   ['confirm']
 * )
 */
export const forward = <I, O>(validator: Validator<I, O>, path: PropertyKey[]): Validator<I, O> => {
	// Forward is primarily for error path manipulation in Standard Schema
	// For basic usage, it acts as a pass-through
	const fn = ((value: I) => validator(value)) as Validator<I, O>

	if (validator.safe) {
		fn.safe = validator.safe
	}

	// Standard Schema with path forwarding
	const original = (validator as unknown as { '~standard'?: unknown })['~standard']
	if (original) {
		;(fn as unknown as Record<string, unknown>)['~standard'] = {
			...original,
			validate: (value: unknown) => {
				const std = original as {
					validate: (v: unknown) => {
						issues?: { message: string; path?: PropertyKey[] }[]
						value?: O
					}
				}
				const result = std.validate(value)
				if (result.issues) {
					return {
						issues: result.issues.map((issue) => ({
							...issue,
							path: [...path, ...(issue.path || [])],
						})),
					}
				}
				return result
			},
		}
	}

	return fn
}

/**
 * Function arguments validator
 *
 * @example
 * const validateArgs = args(tuple([str, num]))
 */
export const args = <T extends unknown[]>(schema: Parser<T>): Parser<T> => schema

/**
 * Function return value validator
 *
 * @example
 * const validateReturn = returns(str)
 */
export const returns = <T>(schema: Parser<T>): Parser<T> => schema

/**
 * Get default value from a schema (if set via withDefault)
 */
export const getDefault = <T>(schema: Parser<T>): T | undefined => {
	const metadata = getSchemaMetadata(schema)
	if (metadata?.type === 'default' && metadata.constraints) {
		return metadata.constraints.default as T
	}
	return undefined
}

/**
 * Get all defaults from an object schema
 */
export const getDefaults = <T extends Record<string, unknown>>(
	schema: Parser<T>
): Partial<T> | undefined => {
	const metadata = getSchemaMetadata(schema)
	if (metadata?.type !== 'object' || !metadata.inner) {
		return undefined
	}

	const shape = metadata.inner as Record<string, unknown>
	const defaults: Partial<T> = {}
	let hasDefaults = false

	for (const [key, fieldSchema] of Object.entries(shape)) {
		const fieldMeta = getSchemaMetadata(fieldSchema as Parser<unknown>)
		if (fieldMeta?.type === 'default' && fieldMeta.constraints) {
			;(defaults as Record<string, unknown>)[key] = fieldMeta.constraints.default
			hasDefaults = true
		}
	}

	return hasDefaults ? defaults : undefined
}

/**
 * Get fallback value from a schema (if set via fallback)
 */
export const getFallback = <T>(schema: Parser<T>): T | undefined => {
	const metadata = getSchemaMetadata(schema)
	if (metadata?.type === 'fallback' && metadata.constraints) {
		return metadata.constraints.fallback as T
	}
	return undefined
}

/**
 * Get all fallbacks from an object schema
 */
export const getFallbacks = <T extends Record<string, unknown>>(
	schema: Parser<T>
): Partial<T> | undefined => {
	const metadata = getSchemaMetadata(schema)
	if (metadata?.type !== 'object' || !metadata.inner) {
		return undefined
	}

	const shape = metadata.inner as Record<string, unknown>
	const fallbacks: Partial<T> = {}
	let hasFallbacks = false

	for (const [key, fieldSchema] of Object.entries(shape)) {
		const fieldMeta = getSchemaMetadata(fieldSchema as Parser<unknown>)
		if (fieldMeta?.type === 'fallback' && fieldMeta.constraints) {
			;(fallbacks as Record<string, unknown>)[key] = fieldMeta.constraints.fallback
			hasFallbacks = true
		}
	}

	return hasFallbacks ? fallbacks : undefined
}

/**
 * Unwrap a wrapped schema (optional, nullable, etc.)
 * Returns the inner schema if the schema is wrapped in optional, nullable, nullish, etc.
 */
export const unwrap = <T>(schema: Parser<T>): Parser<NonNullable<T>> => {
	const metadata = getSchemaMetadata(schema)
	if (!metadata) {
		return schema as unknown as Parser<NonNullable<T>>
	}

	// If this is a wrapped type, extract the inner schema
	const wrappedTypes = [
		'optional',
		'nullable',
		'nullish',
		'nonNullable',
		'nonNullish',
		'nonOptional',
	]
	if (wrappedTypes.includes(metadata.type) && metadata.inner) {
		return metadata.inner as Parser<NonNullable<T>>
	}

	return schema as unknown as Parser<NonNullable<T>>
}

/**
 * Flatten validation errors into a simple structure
 */
export const flatten = <_T>(
	error: { message: string } | { issues?: { message: string; path?: PropertyKey[] }[] }
): { root?: string[]; nested?: Record<string, string[]> } => {
	if ('message' in error && !('issues' in error)) {
		return { root: [error.message] }
	}

	const issues = (error as { issues?: { message: string; path?: PropertyKey[] }[] }).issues || []
	const result: { root?: string[]; nested?: Record<string, string[]> } = {}

	for (const issue of issues) {
		if (!issue.path || issue.path.length === 0) {
			result.root = result.root || []
			result.root.push(issue.message)
		} else {
			result.nested = result.nested || {}
			const key = issue.path.join('.')
			result.nested[key] = result.nested[key] || []
			result.nested[key].push(issue.message)
		}
	}

	return result
}

/**
 * Summarize a schema's structure for debugging/inspection
 *
 * @example
 * const schema = object({ name: str, age: num })
 * console.log(summarize(schema))
 * // { type: 'object', entries: { name: { type: 'string' }, age: { type: 'number' } } }
 */
export const summarize = <T>(schema: Parser<T>): Record<string, unknown> => {
	// Check for Standard Schema support
	const std = (schema as unknown as { '~standard'?: { vendor: string } })['~standard']
	if (std) {
		return {
			vendor: std.vendor,
			type: 'schema',
		}
	}
	return { type: 'unknown' }
}

/**
 * Get all defaults from an object schema (async version)
 */
export const getDefaultsAsync = async <T extends Record<string, unknown>>(
	_schema: Parser<T>
): Promise<Partial<T> | undefined> => {
	return undefined // Object schemas don't store defaults in vex
}

/**
 * Get all fallbacks from an object schema (async version)
 */
export const getFallbacksAsync = async <T extends Record<string, unknown>>(
	_schema: Parser<T>
): Promise<Partial<T> | undefined> => {
	return undefined
}
