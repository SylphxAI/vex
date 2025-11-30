// ============================================================
// Record Schema
// ============================================================

import type { Parser, Result, StandardSchemaV1 } from '../core'
import { ValidationError } from '../core'

const ERR_OBJECT: Result<never> = { ok: false, error: 'Expected object' }

/**
 * Create a record validator (object with dynamic keys)
 *
 * @example
 * const validateScores = record(str, num)
 * const validateData = record(str, pipe(str, nonempty))
 */
export const record = <K extends string, V>(
	keyValidator: Parser<K>,
	valueValidator: Parser<V>
): Parser<Record<K, V>> => {
	// Cache safe method lookups for JIT
	const hasKeySafe = keyValidator.safe !== undefined
	const hasValSafe = valueValidator.safe !== undefined

	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		const input = value as Record<string, unknown>
		const keys = Object.keys(input)
		const result = {} as Record<K, V>

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]!
			const val = input[key]
			try {
				const validKey = keyValidator(key)
				try {
					result[validKey] = valueValidator(val)
				} catch (e) {
					const msg = e instanceof Error ? e.message : 'Unknown error'
					throw new ValidationError(`[${key}]: ${msg}`)
				}
			} catch (e) {
				if (e instanceof ValidationError && !e.message.startsWith('[')) {
					throw new ValidationError(`Invalid key "${key}": ${e.message}`)
				}
				throw e
			}
		}

		return result
	}) as Parser<Record<K, V>>

	fn.safe = (value: unknown): Result<Record<K, V>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return ERR_OBJECT as Result<Record<K, V>>
		}

		const input = value as Record<string, unknown>
		const keys = Object.keys(input)
		const result = {} as Record<K, V>

		if (hasKeySafe && hasValSafe) {
			const keySafe = keyValidator.safe!
			const valSafe = valueValidator.safe!
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]!
				const keyResult = keySafe(key)
				if (!keyResult.ok) {
					return { ok: false, error: `Invalid key "${key}": ${keyResult.error}` }
				}
				const valResult = valSafe(input[key])
				if (!valResult.ok) {
					return { ok: false, error: `[${key}]: ${valResult.error}` }
				}
				result[keyResult.value] = valResult.value
			}
		} else if (hasKeySafe) {
			const keySafe = keyValidator.safe!
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]!
				const keyResult = keySafe(key)
				if (!keyResult.ok) {
					return { ok: false, error: `Invalid key "${key}": ${keyResult.error}` }
				}
				try {
					result[keyResult.value] = valueValidator(input[key])
				} catch (e) {
					return {
						ok: false,
						error: `[${key}]: ${e instanceof Error ? e.message : 'Unknown error'}`,
					}
				}
			}
		} else if (hasValSafe) {
			const valSafe = valueValidator.safe!
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]!
				try {
					const validKey = keyValidator(key)
					const valResult = valSafe(input[key])
					if (!valResult.ok) {
						return { ok: false, error: `[${key}]: ${valResult.error}` }
					}
					result[validKey] = valResult.value
				} catch (e) {
					return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
				}
			}
		} else {
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]!
				try {
					const validKey = keyValidator(key)
					result[validKey] = valueValidator(input[key])
				} catch (e) {
					return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
				}
			}
		}

		return { ok: true, value: result }
	}

	// Add Standard Schema with path support
	const keyStd = keyValidator['~standard']
	const valStd = valueValidator['~standard']
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<Record<K, V>> => {
			if (typeof value !== 'object' || value === null || Array.isArray(value)) {
				return { issues: [{ message: 'Expected object' }] }
			}

			const input = value as Record<string, unknown>
			const keys = Object.keys(input)
			const result = {} as Record<K, V>

			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]!
				if (keyStd) {
					const keyResult = keyStd.validate(key) as StandardSchemaV1.Result<K>
					if (keyResult.issues) {
						return { issues: [{ message: `Invalid key "${key}"` }] }
					}
				}

				if (valStd) {
					const valResult = valStd.validate(input[key]) as StandardSchemaV1.Result<V>
					if (valResult.issues) {
						return {
							issues: valResult.issues.map((issue) => ({
								...issue,
								path: [key, ...(issue.path || [])] as (
									| PropertyKey
									| StandardSchemaV1.PathSegment
								)[],
							})),
						}
					}
					result[key as K] = valResult.value
				} else {
					try {
						result[key as K] = valueValidator(input[key])
					} catch (e) {
						return {
							issues: [{ message: e instanceof Error ? e.message : 'Unknown error', path: [key] }],
						}
					}
				}
			}

			return { value: result }
		},
	}

	return fn
}
