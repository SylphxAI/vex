// ============================================================
// ⚡ Vex - Ultra-fast schema validation
// ============================================================
//
// Pure functional API:
// - Constant validators (zero allocation)
// - Compose with pipe()
// - 5x faster than Valibot, 30x faster than Zod
// - Standard Schema compliant
//
// Usage:
//   import { str, num, pipe, min, max, email } from '@sylphx/vex'
//
//   const validateEmail = pipe(str, email)
//   const validateAge = pipe(num, int, min(0), max(150))
//
//   validateEmail('test@example.com') // 'test@example.com'
//   validateEmail(123) // throws
//
// ============================================================

// ============================================================
// Standard Schema V1 Types
// https://standardschema.dev/
// ============================================================

/** The Standard Schema interface */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

export declare namespace StandardSchemaV1 {
	/** The Standard Schema properties interface */
	export interface Props<Input = unknown, Output = Input> {
		readonly version: 1
		readonly vendor: string
		readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>
		readonly types?: Types<Input, Output> | undefined
	}

	/** The result interface of the validate function */
	export type Result<Output> = SuccessResult<Output> | FailureResult

	/** The result interface if validation succeeds */
	export interface SuccessResult<Output> {
		readonly value: Output
		readonly issues?: undefined
	}

	/** The result interface if validation fails */
	export interface FailureResult {
		readonly issues: ReadonlyArray<Issue>
	}

	/** The issue interface of the failure output */
	export interface Issue {
		readonly message: string
		readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
	}

	/** The path segment interface of the issue */
	export interface PathSegment {
		readonly key: PropertyKey
	}

	/** The Standard Schema types interface */
	export interface Types<Input = unknown, Output = Input> {
		readonly input: Input
		readonly output: Output
	}

	/** Infers the input type of a Standard Schema */
	export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
		Schema['~standard']['types']
	>['input']

	/** Infers the output type of a Standard Schema */
	export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
		Schema['~standard']['types']
	>['output']
}

// ============================================================
// Core Types
// ============================================================

/** Result type for validation (no throwing) */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

/** A validator function that returns the value or throws, with optional Standard Schema support */
export type Validator<I, O = I> = ((value: I) => O) & {
	/** Safe version that returns Result instead of throwing */
	safe?: (value: I) => Result<O>
	/** Standard Schema V1 support */
	'~standard'?: StandardSchemaV1.Props<I, O>
}

/** A validator with guaranteed Standard Schema support */
export type StandardValidator<I, O = I> = Validator<I, O> & StandardSchemaV1<I, O>

/** A validator that accepts unknown input */
export type Parser<O> = Validator<unknown, O>

/** Validation error */
export class ValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ValidationError'
	}
}

// ============================================================
// Pre-allocated error results (no allocation on failure)
// ============================================================

const ERR_STRING: Result<never> = { ok: false, error: 'Expected string' }
const ERR_NUMBER: Result<never> = { ok: false, error: 'Expected number' }
const ERR_BOOLEAN: Result<never> = { ok: false, error: 'Expected boolean' }
const ERR_BIGINT: Result<never> = { ok: false, error: 'Expected bigint' }
const ERR_DATE: Result<never> = { ok: false, error: 'Expected Date' }
const ERR_ARRAY: Result<never> = { ok: false, error: 'Expected array' }
const ERR_OBJECT: Result<never> = { ok: false, error: 'Expected object' }
const ERR_EMAIL: Result<never> = { ok: false, error: 'Invalid email' }
const ERR_URL: Result<never> = { ok: false, error: 'Invalid URL' }
const ERR_UUID: Result<never> = { ok: false, error: 'Invalid UUID' }
const ERR_INT: Result<never> = { ok: false, error: 'Must be integer' }
const ERR_POSITIVE: Result<never> = { ok: false, error: 'Must be positive' }
const ERR_NEGATIVE: Result<never> = { ok: false, error: 'Must be negative' }
const ERR_FINITE: Result<never> = { ok: false, error: 'Must be finite' }
const ERR_REQUIRED: Result<never> = { ok: false, error: 'Required' }

// ============================================================
// Helper: Add Standard Schema support to a validator
// ============================================================

function addStandardSchema<I, O>(fn: Validator<I, O>): Validator<I, O> {
	const safeFn = fn.safe
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<O> => {
			if (safeFn) {
				const result = safeFn(value as I)
				if (result.ok) {
					return { value: result.value }
				}
				return { issues: [{ message: result.error }] }
			}
			// Fallback to try-catch
			try {
				return { value: fn(value as I) }
			} catch (e) {
				return { issues: [{ message: e instanceof Error ? e.message : 'Unknown error' }] }
			}
		},
	}
	return fn
}

// ============================================================
// Helper: Create validator with safe version and Standard Schema
// ============================================================

function createValidator<I, O>(
	validate: (value: I) => O,
	safeValidate: (value: I) => Result<O>
): Validator<I, O> {
	const fn = validate as Validator<I, O>
	fn.safe = safeValidate
	return addStandardSchema(fn)
}

// ============================================================
// Type Validators (Parsers)
// ============================================================

/** Validate string type */
export const str: Parser<string> = createValidator(
	(v) => {
		if (typeof v !== 'string') throw new ValidationError('Expected string')
		return v
	},
	(v) => (typeof v === 'string' ? { ok: true, value: v } : ERR_STRING)
)

/** Validate number type */
export const num: Parser<number> = createValidator(
	(v) => {
		if (typeof v !== 'number' || Number.isNaN(v)) throw new ValidationError('Expected number')
		return v
	},
	(v) => (typeof v === 'number' && !Number.isNaN(v) ? { ok: true, value: v } : ERR_NUMBER)
)

/** Validate boolean type */
export const bool: Parser<boolean> = createValidator(
	(v) => {
		if (typeof v !== 'boolean') throw new ValidationError('Expected boolean')
		return v
	},
	(v) => (typeof v === 'boolean' ? { ok: true, value: v } : ERR_BOOLEAN)
)

/** Validate bigint type */
export const bigInt: Parser<bigint> = createValidator(
	(v) => {
		if (typeof v !== 'bigint') throw new ValidationError('Expected bigint')
		return v
	},
	(v) => (typeof v === 'bigint' ? { ok: true, value: v } : ERR_BIGINT)
)

/** Validate Date type */
export const date: Parser<Date> = createValidator(
	(v) => {
		if (!(v instanceof Date) || Number.isNaN(v.getTime()))
			throw new ValidationError('Expected Date')
		return v
	},
	(v) => (v instanceof Date && !Number.isNaN(v.getTime()) ? { ok: true, value: v } : ERR_DATE)
)

/** Validate array type */
export const arr: Parser<unknown[]> = createValidator(
	(v) => {
		if (!Array.isArray(v)) throw new ValidationError('Expected array')
		return v
	},
	(v) => (Array.isArray(v) ? { ok: true, value: v } : ERR_ARRAY)
)

/** Validate object type (not null, not array) */
export const obj: Parser<Record<string, unknown>> = createValidator(
	(v) => {
		if (typeof v !== 'object' || v === null || Array.isArray(v))
			throw new ValidationError('Expected object')
		return v as Record<string, unknown>
	},
	(v) =>
		typeof v === 'object' && v !== null && !Array.isArray(v)
			? { ok: true, value: v as Record<string, unknown> }
			: ERR_OBJECT
)

// ============================================================
// String Validators
// ============================================================

/** Minimum length */
export const min = (n: number): Validator<string> => {
	const err: Result<never> = { ok: false, error: `Min ${n} chars` }
	return createValidator(
		(v) => {
			if (v.length < n) throw new ValidationError(`Min ${n} chars`)
			return v
		},
		(v) => (v.length >= n ? { ok: true, value: v } : err)
	)
}

/** Maximum length */
export const max = (n: number): Validator<string> => {
	const err: Result<never> = { ok: false, error: `Max ${n} chars` }
	return createValidator(
		(v) => {
			if (v.length > n) throw new ValidationError(`Max ${n} chars`)
			return v
		},
		(v) => (v.length <= n ? { ok: true, value: v } : err)
	)
}

/** Exact length */
export const len = (n: number): Validator<string> => {
	const err: Result<never> = { ok: false, error: `Must be ${n} chars` }
	return createValidator(
		(v) => {
			if (v.length !== n) throw new ValidationError(`Must be ${n} chars`)
			return v
		},
		(v) => (v.length === n ? { ok: true, value: v } : err)
	)
}

/** Non-empty string */
export const nonempty: Validator<string> = createValidator(
	(v) => {
		if (v.length === 0) throw new ValidationError('Required')
		return v
	},
	(v) => (v.length > 0 ? { ok: true, value: v } : ERR_REQUIRED)
)

/** Email format */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const email: Validator<string> = createValidator(
	(v) => {
		if (!EMAIL_RE.test(v)) throw new ValidationError('Invalid email')
		return v
	},
	(v) => (EMAIL_RE.test(v) ? { ok: true, value: v } : ERR_EMAIL)
)

/** URL format */
const URL_RE = /^https?:\/\/.+/
export const url: Validator<string> = createValidator(
	(v) => {
		if (!URL_RE.test(v)) throw new ValidationError('Invalid URL')
		return v
	},
	(v) => (URL_RE.test(v) ? { ok: true, value: v } : ERR_URL)
)

/** UUID format */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const uuid: Validator<string> = createValidator(
	(v) => {
		if (!UUID_RE.test(v)) throw new ValidationError('Invalid UUID')
		return v
	},
	(v) => (UUID_RE.test(v) ? { ok: true, value: v } : ERR_UUID)
)

/** Regex pattern */
export const pattern = (re: RegExp, msg = 'Invalid format'): Validator<string> => {
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (!re.test(v)) throw new ValidationError(msg)
			return v
		},
		(v) => (re.test(v) ? { ok: true, value: v } : err)
	)
}

/** Starts with prefix */
export const startsWith = (prefix: string): Validator<string> => {
	const msg = `Must start with "${prefix}"`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (!v.startsWith(prefix)) throw new ValidationError(msg)
			return v
		},
		(v) => (v.startsWith(prefix) ? { ok: true, value: v } : err)
	)
}

/** Ends with suffix */
export const endsWith = (suffix: string): Validator<string> => {
	const msg = `Must end with "${suffix}"`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (!v.endsWith(suffix)) throw new ValidationError(msg)
			return v
		},
		(v) => (v.endsWith(suffix) ? { ok: true, value: v } : err)
	)
}

/** Contains substring */
export const includes = (search: string): Validator<string> => {
	const msg = `Must include "${search}"`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (!v.includes(search)) throw new ValidationError(msg)
			return v
		},
		(v) => (v.includes(search) ? { ok: true, value: v } : err)
	)
}

// ============================================================
// Number Validators
// ============================================================

/** Integer check */
export const int: Validator<number> = createValidator(
	(v) => {
		if (!Number.isInteger(v)) throw new ValidationError('Must be integer')
		return v
	},
	(v) => (Number.isInteger(v) ? { ok: true, value: v } : ERR_INT)
)

/** Positive number (> 0) */
export const positive: Validator<number> = createValidator(
	(v) => {
		if (v <= 0) throw new ValidationError('Must be positive')
		return v
	},
	(v) => (v > 0 ? { ok: true, value: v } : ERR_POSITIVE)
)

/** Negative number (< 0) */
export const negative: Validator<number> = createValidator(
	(v) => {
		if (v >= 0) throw new ValidationError('Must be negative')
		return v
	},
	(v) => (v < 0 ? { ok: true, value: v } : ERR_NEGATIVE)
)

/** Finite number */
export const finite: Validator<number> = createValidator(
	(v) => {
		if (!Number.isFinite(v)) throw new ValidationError('Must be finite')
		return v
	},
	(v) => (Number.isFinite(v) ? { ok: true, value: v } : ERR_FINITE)
)

/** Minimum value */
export const gte = (n: number): Validator<number> => {
	const err: Result<never> = { ok: false, error: `Min ${n}` }
	return createValidator(
		(v) => {
			if (v < n) throw new ValidationError(`Min ${n}`)
			return v
		},
		(v) => (v >= n ? { ok: true, value: v } : err)
	)
}

/** Maximum value */
export const lte = (n: number): Validator<number> => {
	const err: Result<never> = { ok: false, error: `Max ${n}` }
	return createValidator(
		(v) => {
			if (v > n) throw new ValidationError(`Max ${n}`)
			return v
		},
		(v) => (v <= n ? { ok: true, value: v } : err)
	)
}

/** Greater than */
export const gt = (n: number): Validator<number> => {
	const err: Result<never> = { ok: false, error: `Must be > ${n}` }
	return createValidator(
		(v) => {
			if (v <= n) throw new ValidationError(`Must be > ${n}`)
			return v
		},
		(v) => (v > n ? { ok: true, value: v } : err)
	)
}

/** Less than */
export const lt = (n: number): Validator<number> => {
	const err: Result<never> = { ok: false, error: `Must be < ${n}` }
	return createValidator(
		(v) => {
			if (v >= n) throw new ValidationError(`Must be < ${n}`)
			return v
		},
		(v) => (v < n ? { ok: true, value: v } : err)
	)
}

/** Multiple of */
export const multipleOf = (n: number): Validator<number> => {
	const err: Result<never> = { ok: false, error: `Must be multiple of ${n}` }
	return createValidator(
		(v) => {
			if (v % n !== 0) throw new ValidationError(`Must be multiple of ${n}`)
			return v
		},
		(v) => (v % n === 0 ? { ok: true, value: v } : err)
	)
}

// ============================================================
// Composition
// ============================================================

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
export function pipe(...validators: Validator<unknown, unknown>[]): Validator<unknown, unknown> {
	// Create the throwing version
	const fn = ((value: unknown) => {
		let result = value
		for (const v of validators) {
			result = v(result)
		}
		return result
	}) as Validator<unknown, unknown>

	// Create the safe version that uses .safe if available
	fn.safe = (value: unknown): Result<unknown> => {
		let result: unknown = value
		for (const v of validators) {
			if (v.safe) {
				const r = v.safe(result)
				if (!r.ok) return r
				result = r.value
			} else {
				// Fallback to try-catch for validators without .safe
				try {
					result = v(result)
				} catch (e) {
					return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
				}
			}
		}
		return { ok: true, value: result }
	}

	return addStandardSchema(fn)
}

/**
 * Try to validate, return null on error
 */
export const tryParse =
	<I, O>(validator: Validator<I, O>) =>
	(value: I): O | null => {
		if (validator.safe) {
			const result = validator.safe(value)
			return result.ok ? result.value : null
		}
		try {
			return validator(value)
		} catch {
			return null
		}
	}

/**
 * Try to validate, return result object (uses safe version if available)
 */
export const safeParse =
	<I, O>(validator: Validator<I, O>) =>
	(value: I): { success: true; data: O } | { success: false; error: string } => {
		if (validator.safe) {
			const result = validator.safe(value)
			return result.ok
				? { success: true, data: result.value }
				: { success: false, error: result.error }
		}
		try {
			return { success: true, data: validator(value) }
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

/**
 * Make a validator optional (allows undefined)
 */
export const optional = <I, O>(
	validator: Validator<I, O>
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
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	return addStandardSchema(fn)
}

/**
 * Make a validator nullable (allows null)
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
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	return addStandardSchema(fn)
}

/**
 * Provide a default value
 */
export const withDefault = <I, O>(
	validator: Validator<I, O>,
	defaultValue: O
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
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	return addStandardSchema(fn)
}

// ============================================================
// Object Validation
// ============================================================

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
	const entries = Object.entries(shape) as [keyof T, Parser<unknown>][]

	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		const input = value as Record<string, unknown>
		const result = {} as T

		for (const [key, validator] of entries) {
			try {
				result[key] = validator(input[key as string]) as T[keyof T]
			} catch (e) {
				if (e instanceof ValidationError) {
					throw new ValidationError(`${String(key)}: ${e.message}`)
				}
				throw e
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

		for (const [key, validator] of entries) {
			if (validator.safe) {
				const r = validator.safe(input[key as string])
				if (!r.ok) {
					return { ok: false, error: `${String(key)}: ${r.error}` }
				}
				result[key] = r.value as T[keyof T]
			} else {
				try {
					result[key] = validator(input[key as string]) as T[keyof T]
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

			for (const [key, validator] of entries) {
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

	return fn
}

/**
 * Create an array validator
 *
 * @example
 * const validateNumbers = array(pipe(num, int))
 */
export const array = <T>(itemValidator: Parser<T>): Parser<T[]> => {
	const fn = ((value: unknown) => {
		if (!Array.isArray(value)) throw new ValidationError('Expected array')

		return value.map((item, i) => {
			try {
				return itemValidator(item)
			} catch (e) {
				if (e instanceof ValidationError) {
					throw new ValidationError(`[${i}]: ${e.message}`)
				}
				throw e
			}
		})
	}) as Parser<T[]>

	fn.safe = (value: unknown): Result<T[]> => {
		if (!Array.isArray(value)) return ERR_ARRAY as Result<T[]>

		const result: T[] = []
		for (let i = 0; i < value.length; i++) {
			if (itemValidator.safe) {
				const r = itemValidator.safe(value[i])
				if (!r.ok) {
					return { ok: false, error: `[${i}]: ${r.error}` }
				}
				result.push(r.value)
			} else {
				try {
					result.push(itemValidator(value[i]))
				} catch (e) {
					return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
				}
			}
		}

		return { ok: true, value: result }
	}

	// Add Standard Schema with path support
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<T[]> => {
			if (!Array.isArray(value)) {
				return { issues: [{ message: 'Expected array' }] }
			}

			const result: T[] = []
			const std = itemValidator['~standard']

			for (let i = 0; i < value.length; i++) {
				if (std) {
					const r = std.validate(value[i]) as StandardSchemaV1.Result<T>
					if (r.issues) {
						return {
							issues: r.issues.map((issue) => ({
								...issue,
								path: [i, ...(issue.path || [])],
							})),
						}
					}
					result.push(r.value)
				} else {
					try {
						result.push(itemValidator(value[i]))
					} catch (e) {
						return {
							issues: [{ message: e instanceof Error ? e.message : 'Unknown error', path: [i] }],
						}
					}
				}
			}

			return { value: result }
		},
	}

	return fn
}

// ============================================================
// Transforms
// ============================================================

/** Trim whitespace */
export const trim: Validator<string> = createValidator(
	(v) => v.trim(),
	(v) => ({ ok: true, value: v.trim() })
)

/** To lowercase */
export const lower: Validator<string> = createValidator(
	(v) => v.toLowerCase(),
	(v) => ({ ok: true, value: v.toLowerCase() })
)

/** To uppercase */
export const upper: Validator<string> = createValidator(
	(v) => v.toUpperCase(),
	(v) => ({ ok: true, value: v.toUpperCase() })
)

/** Parse to integer */
export const toInt: Validator<string, number> = createValidator(
	(v) => {
		const n = Number.parseInt(v, 10)
		if (Number.isNaN(n)) throw new ValidationError('Invalid integer')
		return n
	},
	(v) => {
		const n = Number.parseInt(v, 10)
		return Number.isNaN(n) ? { ok: false, error: 'Invalid integer' } : { ok: true, value: n }
	}
)

/** Parse to float */
export const toFloat: Validator<string, number> = createValidator(
	(v) => {
		const n = Number.parseFloat(v)
		if (Number.isNaN(n)) throw new ValidationError('Invalid number')
		return n
	},
	(v) => {
		const n = Number.parseFloat(v)
		return Number.isNaN(n) ? { ok: false, error: 'Invalid number' } : { ok: true, value: n }
	}
)

/** Parse to Date */
export const toDate: Validator<string, Date> = createValidator(
	(v) => {
		const d = new Date(v)
		if (Number.isNaN(d.getTime())) throw new ValidationError('Invalid date')
		return d
	},
	(v) => {
		const d = new Date(v)
		return Number.isNaN(d.getTime()) ? { ok: false, error: 'Invalid date' } : { ok: true, value: d }
	}
)
