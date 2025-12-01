// ============================================================
// Map Schema
// ============================================================

import type { Parser, Result, StandardSchemaV1 } from '../core'
import { addSchemaMetadata, ValidationError } from '../core'

const ERR_MAP: Result<never> = { ok: false, error: 'Expected Map' }

/**
 * Create a Map validator
 *
 * @example
 * const validateStringToNumber = map(str, num)
 * const validateIdToUser = map(pipe(str, uuid), userSchema)
 */
export const map = <K, V>(
	keyValidator: Parser<K>,
	valueValidator: Parser<V>,
): Parser<Map<K, V>> => {
	const fn = ((value: unknown) => {
		if (!(value instanceof Map)) throw new ValidationError('Expected Map')

		const result = new Map<K, V>()
		for (const [key, val] of value) {
			let validKey: K
			try {
				validKey = keyValidator(key)
			} catch (e) {
				if (e instanceof ValidationError) {
					throw new ValidationError(`Map key: ${e.message}`)
				}
				throw e
			}

			try {
				result.set(validKey, valueValidator(val))
			} catch (e) {
				if (e instanceof ValidationError) {
					throw new ValidationError(`Map[${String(key)}]: ${e.message}`)
				}
				throw e
			}
		}
		return result
	}) as Parser<Map<K, V>>

	fn.safe = (value: unknown): Result<Map<K, V>> => {
		if (!(value instanceof Map)) return ERR_MAP as Result<Map<K, V>>

		const result = new Map<K, V>()
		for (const [key, val] of value) {
			let validKey: K

			if (keyValidator.safe) {
				const kr = keyValidator.safe(key)
				if (!kr.ok) {
					return { ok: false, error: `Map key: ${kr.error}` }
				}
				validKey = kr.value
			} else {
				try {
					validKey = keyValidator(key)
				} catch (e) {
					return {
						ok: false,
						error: `Map key: ${e instanceof Error ? e.message : 'Unknown error'}`,
					}
				}
			}

			if (valueValidator.safe) {
				const vr = valueValidator.safe(val)
				if (!vr.ok) {
					return { ok: false, error: `Map[${String(key)}]: ${vr.error}` }
				}
				result.set(validKey, vr.value)
			} else {
				try {
					result.set(validKey, valueValidator(val))
				} catch (e) {
					return {
						ok: false,
						error: `Map[${String(key)}]: ${e instanceof Error ? e.message : 'Unknown error'}`,
					}
				}
			}
		}

		return { ok: true, value: result }
	}

	// Add Standard Schema
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<Map<K, V>> => {
			if (!(value instanceof Map)) {
				return { issues: [{ message: 'Expected Map' }] }
			}

			const result = new Map<K, V>()
			const keyStd = keyValidator['~standard']
			const valStd = valueValidator['~standard']

			for (const [key, val] of value) {
				let validKey: K

				if (keyStd) {
					const kr = keyStd.validate(key) as StandardSchemaV1.Result<K>
					if (kr.issues) {
						return { issues: [{ message: `Map key: ${kr.issues[0]?.message || 'Invalid'}` }] }
					}
					validKey = kr.value
				} else {
					try {
						validKey = keyValidator(key)
					} catch (e) {
						return {
							issues: [{ message: `Map key: ${e instanceof Error ? e.message : 'Invalid'}` }],
						}
					}
				}

				if (valStd) {
					const vr = valStd.validate(val) as StandardSchemaV1.Result<V>
					if (vr.issues) {
						return {
							issues: vr.issues.map((issue) => ({
								...issue,
								path: [key as PropertyKey, ...(issue.path || [])],
							})),
						}
					}
					result.set(validKey, vr.value)
				} else {
					try {
						result.set(validKey, valueValidator(val))
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

	// Add metadata for JSON Schema conversion
	addSchemaMetadata(fn, {
		type: 'map',
		inner: { key: keyValidator, value: valueValidator },
	})

	return fn
}
