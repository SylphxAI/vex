// ============================================================
// Async Schema Variants
// ============================================================

import type { Result } from '../core'
import { ValidationError } from '../core'
import type { AsyncParser, AsyncValidator } from './core'

// ============================================================
// Array Async
// ============================================================

export const arrayAsync = <T>(
	itemValidator: AsyncValidator<unknown, T> | ((v: unknown) => Promise<T>)
): AsyncParser<T[]> => {
	const validator = itemValidator as AsyncValidator<unknown, T>

	const fn = (async (value: unknown) => {
		if (!Array.isArray(value)) throw new ValidationError('Expected array')
		return Promise.all(
			value.map((item, i) =>
				Promise.resolve(validator(item)).catch((e) => {
					throw new ValidationError(`[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}`)
				})
			)
		)
	}) as AsyncParser<T[]>

	fn.safe = async (value: unknown): Promise<Result<T[]>> => {
		if (!Array.isArray(value)) return { ok: false, error: 'Expected array' }
		const results: T[] = []
		for (let i = 0; i < value.length; i++) {
			try {
				if (validator.safe) {
					const r = await validator.safe(value[i])
					if (!r.ok) return { ok: false, error: `[${i}]: ${r.error}` }
					results.push(r.value)
				} else {
					results.push(await validator(value[i]))
				}
			} catch (e) {
				return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
			}
		}
		return { ok: true, value: results }
	}

	return fn
}

// ============================================================
// Object Async
// ============================================================

type Shape<T> = { [K in keyof T]: AsyncValidator<unknown, T[K]> | ((v: unknown) => Promise<T[K]>) }

export const objectAsync = <T extends Record<string, unknown>>(shape: Shape<T>): AsyncParser<T> => {
	const entries = Object.entries(shape) as [keyof T, AsyncValidator<unknown, unknown>][]

	const fn = (async (value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}
		const input = value as Record<string, unknown>
		const result = {} as T
		for (const [key, validator] of entries) {
			try {
				result[key] = (await validator(input[key as string])) as T[keyof T]
			} catch (e) {
				throw new ValidationError(
					`${String(key)}: ${e instanceof Error ? e.message : 'Unknown error'}`
				)
			}
		}
		return result
	}) as AsyncParser<T>

	fn.safe = async (value: unknown): Promise<Result<T>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return { ok: false, error: 'Expected object' }
		}
		const input = value as Record<string, unknown>
		const result = {} as T
		for (const [key, validator] of entries) {
			try {
				if (validator.safe) {
					const r = await validator.safe(input[key as string])
					if (!r.ok) return { ok: false, error: `${String(key)}: ${r.error}` }
					result[key] = r.value as T[keyof T]
				} else {
					result[key] = (await validator(input[key as string])) as T[keyof T]
				}
			} catch (e) {
				return {
					ok: false,
					error: `${String(key)}: ${e instanceof Error ? e.message : 'Unknown error'}`,
				}
			}
		}
		return { ok: true, value: result }
	}

	return fn
}

export const looseObjectAsync = <T extends Record<string, unknown>>(
	shape: Shape<T>
): AsyncParser<T & Record<string, unknown>> => {
	const entries = Object.entries(shape) as [keyof T, AsyncValidator<unknown, unknown>][]

	const fn = (async (value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}
		const input = value as Record<string, unknown>
		const result = { ...input } as T & Record<string, unknown>
		for (const [key, validator] of entries) {
			try {
				result[key] = (await validator(input[key as string])) as T[keyof T]
			} catch (e) {
				throw new ValidationError(
					`${String(key)}: ${e instanceof Error ? e.message : 'Unknown error'}`
				)
			}
		}
		return result
	}) as AsyncParser<T & Record<string, unknown>>

	fn.safe = async (value: unknown): Promise<Result<T & Record<string, unknown>>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return { ok: false, error: 'Expected object' }
		}
		const input = value as Record<string, unknown>
		const result = { ...input } as T & Record<string, unknown>
		for (const [key, validator] of entries) {
			try {
				if (validator.safe) {
					const r = await validator.safe(input[key as string])
					if (!r.ok) return { ok: false, error: `${String(key)}: ${r.error}` }
					result[key] = r.value as T[keyof T]
				} else {
					result[key] = (await validator(input[key as string])) as T[keyof T]
				}
			} catch (e) {
				return {
					ok: false,
					error: `${String(key)}: ${e instanceof Error ? e.message : 'Unknown error'}`,
				}
			}
		}
		return { ok: true, value: result }
	}

	return fn
}

export const strictObjectAsync = objectAsync

export const objectWithRestAsync = <T extends Record<string, unknown>, R>(
	shape: Shape<T>,
	rest: AsyncValidator<unknown, R> | ((v: unknown) => Promise<R>)
): AsyncParser<T & Record<string, R>> => {
	const entries = Object.entries(shape) as [keyof T, AsyncValidator<unknown, unknown>][]
	const knownKeys = new Set(Object.keys(shape))
	const restValidator = rest as AsyncValidator<unknown, R>

	const fn = (async (value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}
		const input = value as Record<string, unknown>
		const result: Record<string, unknown> = {}

		for (const [key, validator] of entries) {
			try {
				result[key as string] = await validator(input[key as string])
			} catch (e) {
				throw new ValidationError(
					`${String(key)}: ${e instanceof Error ? e.message : 'Unknown error'}`
				)
			}
		}

		for (const [key, val] of Object.entries(input)) {
			if (!knownKeys.has(key)) {
				try {
					result[key] = await restValidator(val)
				} catch (e) {
					throw new ValidationError(`${key}: ${e instanceof Error ? e.message : 'Unknown error'}`)
				}
			}
		}

		return result as T & Record<string, R>
	}) as AsyncParser<T & Record<string, R>>

	fn.safe = async (value: unknown): Promise<Result<T & Record<string, R>>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return { ok: false, error: 'Expected object' }
		}
		const input = value as Record<string, unknown>
		const result: Record<string, unknown> = {}

		for (const [key, validator] of entries) {
			try {
				if (validator.safe) {
					const r = await validator.safe(input[key as string])
					if (!r.ok) return { ok: false, error: `${String(key)}: ${r.error}` }
					result[key as string] = r.value
				} else {
					result[key as string] = await validator(input[key as string])
				}
			} catch (e) {
				return {
					ok: false,
					error: `${String(key)}: ${e instanceof Error ? e.message : 'Unknown error'}`,
				}
			}
		}

		for (const [key, val] of Object.entries(input)) {
			if (!knownKeys.has(key)) {
				try {
					if (restValidator.safe) {
						const r = await restValidator.safe(val)
						if (!r.ok) return { ok: false, error: `${key}: ${r.error}` }
						result[key] = r.value
					} else {
						result[key] = await restValidator(val)
					}
				} catch (e) {
					return { ok: false, error: `${key}: ${e instanceof Error ? e.message : 'Unknown error'}` }
				}
			}
		}

		return { ok: true, value: result as T & Record<string, R> }
	}

	return fn
}

// ============================================================
// Tuple Async
// ============================================================

type TupleValidators = readonly [
	AsyncValidator<unknown, unknown>,
	...AsyncValidator<unknown, unknown>[],
]
type TupleOutput<T extends TupleValidators> = {
	[K in keyof T]: T[K] extends AsyncValidator<unknown, infer O> ? O : never
}

export const tupleAsync = <T extends TupleValidators>(schemas: T): AsyncParser<TupleOutput<T>> => {
	const fn = (async (value: unknown) => {
		if (!Array.isArray(value)) throw new ValidationError('Expected array')
		if (value.length !== schemas.length) {
			throw new ValidationError(`Expected ${schemas.length} items, got ${value.length}`)
		}
		return Promise.all(
			schemas.map((schema, i) =>
				Promise.resolve(schema(value[i])).catch((e) => {
					throw new ValidationError(`[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}`)
				})
			)
		) as Promise<TupleOutput<T>>
	}) as AsyncParser<TupleOutput<T>>

	fn.safe = async (value: unknown): Promise<Result<TupleOutput<T>>> => {
		if (!Array.isArray(value)) return { ok: false, error: 'Expected array' }
		if (value.length !== schemas.length) {
			return { ok: false, error: `Expected ${schemas.length} items, got ${value.length}` }
		}
		const results: unknown[] = []
		for (let i = 0; i < schemas.length; i++) {
			const schema = schemas[i]!
			try {
				if (schema.safe) {
					const r = await schema.safe(value[i])
					if (!r.ok) return { ok: false, error: `[${i}]: ${r.error}` }
					results.push(r.value)
				} else {
					results.push(await schema(value[i]))
				}
			} catch (e) {
				return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
			}
		}
		return { ok: true, value: results as TupleOutput<T> }
	}

	return fn
}

export const strictTupleAsync = tupleAsync

export const looseTupleAsync = <T extends TupleValidators>(
	schemas: T
): AsyncParser<TupleOutput<T>> => {
	const fn = (async (value: unknown) => {
		if (!Array.isArray(value)) throw new ValidationError('Expected array')
		if (value.length < schemas.length) {
			throw new ValidationError(`Expected at least ${schemas.length} items, got ${value.length}`)
		}
		return Promise.all(
			schemas.map((schema, i) =>
				Promise.resolve(schema(value[i])).catch((e) => {
					throw new ValidationError(`[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}`)
				})
			)
		) as Promise<TupleOutput<T>>
	}) as AsyncParser<TupleOutput<T>>

	fn.safe = async (value: unknown): Promise<Result<TupleOutput<T>>> => {
		if (!Array.isArray(value)) return { ok: false, error: 'Expected array' }
		if (value.length < schemas.length) {
			return { ok: false, error: `Expected at least ${schemas.length} items, got ${value.length}` }
		}
		const results: unknown[] = []
		for (let i = 0; i < schemas.length; i++) {
			const schema = schemas[i]!
			try {
				if (schema.safe) {
					const r = await schema.safe(value[i])
					if (!r.ok) return { ok: false, error: `[${i}]: ${r.error}` }
					results.push(r.value)
				} else {
					results.push(await schema(value[i]))
				}
			} catch (e) {
				return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
			}
		}
		return { ok: true, value: results as TupleOutput<T> }
	}

	return fn
}

export const tupleWithRestAsync = <T extends TupleValidators, R>(
	schemas: T,
	rest: AsyncValidator<unknown, R> | ((v: unknown) => Promise<R>)
): AsyncParser<[...TupleOutput<T>, ...R[]]> => {
	type Output = [...TupleOutput<T>, ...R[]]
	const restValidator = rest as AsyncValidator<unknown, R>

	const fn = (async (value: unknown) => {
		if (!Array.isArray(value)) throw new ValidationError('Expected array')
		if (value.length < schemas.length) {
			throw new ValidationError(`Expected at least ${schemas.length} items, got ${value.length}`)
		}

		const results: unknown[] = []
		for (let i = 0; i < schemas.length; i++) {
			try {
				results.push(await schemas[i]?.(value[i]))
			} catch (e) {
				throw new ValidationError(`[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}`)
			}
		}
		for (let i = schemas.length; i < value.length; i++) {
			try {
				results.push(await restValidator(value[i]))
			} catch (e) {
				throw new ValidationError(`[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}`)
			}
		}
		return results as Output
	}) as AsyncParser<Output>

	fn.safe = async (value: unknown): Promise<Result<Output>> => {
		if (!Array.isArray(value)) return { ok: false, error: 'Expected array' }
		if (value.length < schemas.length) {
			return { ok: false, error: `Expected at least ${schemas.length} items, got ${value.length}` }
		}

		const results: unknown[] = []
		for (let i = 0; i < schemas.length; i++) {
			const schema = schemas[i]!
			try {
				if (schema.safe) {
					const r = await schema.safe(value[i])
					if (!r.ok) return { ok: false, error: `[${i}]: ${r.error}` }
					results.push(r.value)
				} else {
					results.push(await schema(value[i]))
				}
			} catch (e) {
				return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
			}
		}
		for (let i = schemas.length; i < value.length; i++) {
			try {
				if (restValidator.safe) {
					const r = await restValidator.safe(value[i])
					if (!r.ok) return { ok: false, error: `[${i}]: ${r.error}` }
					results.push(r.value)
				} else {
					results.push(await restValidator(value[i]))
				}
			} catch (e) {
				return { ok: false, error: `[${i}]: ${e instanceof Error ? e.message : 'Unknown error'}` }
			}
		}
		return { ok: true, value: results as Output }
	}

	return fn
}

// ============================================================
// Other Async Schemas
// ============================================================

export const mapAsync = <K, V>(
	keyValidator: AsyncValidator<unknown, K>,
	valueValidator: AsyncValidator<unknown, V>
): AsyncParser<Map<K, V>> => {
	const fn = (async (value: unknown) => {
		if (!(value instanceof Map)) throw new ValidationError('Expected Map')
		const result = new Map<K, V>()
		for (const [k, v] of value) {
			const validKey = await keyValidator(k)
			const validValue = await valueValidator(v)
			result.set(validKey, validValue)
		}
		return result
	}) as AsyncParser<Map<K, V>>

	fn.safe = async (value: unknown): Promise<Result<Map<K, V>>> => {
		if (!(value instanceof Map)) return { ok: false, error: 'Expected Map' }
		const result = new Map<K, V>()
		for (const [k, v] of value) {
			try {
				const validKey = keyValidator.safe
					? await keyValidator.safe(k)
					: { ok: true as const, value: await keyValidator(k) }
				if (!validKey.ok) return { ok: false, error: `key: ${validKey.error}` }
				const validValue = valueValidator.safe
					? await valueValidator.safe(v)
					: { ok: true as const, value: await valueValidator(v) }
				if (!validValue.ok) return { ok: false, error: `value: ${validValue.error}` }
				result.set(validKey.value, validValue.value)
			} catch (e) {
				return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
			}
		}
		return { ok: true, value: result }
	}

	return fn
}

export const setAsync = <T>(itemValidator: AsyncValidator<unknown, T>): AsyncParser<Set<T>> => {
	const fn = (async (value: unknown) => {
		if (!(value instanceof Set)) throw new ValidationError('Expected Set')
		const result = new Set<T>()
		for (const item of value) {
			result.add(await itemValidator(item))
		}
		return result
	}) as AsyncParser<Set<T>>

	fn.safe = async (value: unknown): Promise<Result<Set<T>>> => {
		if (!(value instanceof Set)) return { ok: false, error: 'Expected Set' }
		const result = new Set<T>()
		for (const item of value) {
			try {
				if (itemValidator.safe) {
					const r = await itemValidator.safe(item)
					if (!r.ok) return r as Result<Set<T>>
					result.add(r.value)
				} else {
					result.add(await itemValidator(item))
				}
			} catch (e) {
				return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
			}
		}
		return { ok: true, value: result }
	}

	return fn
}

export const recordAsync = <V>(
	valueValidator: AsyncValidator<unknown, V>
): AsyncParser<Record<string, V>> => {
	const fn = (async (value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}
		const result: Record<string, V> = {}
		for (const [k, v] of Object.entries(value)) {
			result[k] = await valueValidator(v)
		}
		return result
	}) as AsyncParser<Record<string, V>>

	fn.safe = async (value: unknown): Promise<Result<Record<string, V>>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return { ok: false, error: 'Expected object' }
		}
		const result: Record<string, V> = {}
		for (const [k, v] of Object.entries(value)) {
			try {
				if (valueValidator.safe) {
					const r = await valueValidator.safe(v)
					if (!r.ok) return { ok: false, error: `${k}: ${r.error}` }
					result[k] = r.value
				} else {
					result[k] = await valueValidator(v)
				}
			} catch (e) {
				return { ok: false, error: `${k}: ${e instanceof Error ? e.message : 'Unknown error'}` }
			}
		}
		return { ok: true, value: result }
	}

	return fn
}

export const intersectAsync = <
	T extends readonly [AsyncParser<unknown>, ...AsyncParser<unknown>[]],
>(
	schemas: T
): AsyncParser<T[number] extends AsyncParser<infer O> ? O : never> => {
	type Output = T[number] extends AsyncParser<infer O> ? O : never

	const fn = (async (value: unknown) => {
		let result = value
		for (const schema of schemas) {
			result = await schema(result)
		}
		return result as Output
	}) as AsyncParser<Output>

	fn.safe = async (value: unknown): Promise<Result<Output>> => {
		let result = value
		for (const schema of schemas) {
			try {
				if (schema.safe) {
					const r = await schema.safe(result)
					if (!r.ok) return r as Result<Output>
					result = r.value
				} else {
					result = await schema(result)
				}
			} catch (e) {
				return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
			}
		}
		return { ok: true, value: result as Output }
	}

	return fn
}

export const unionAsync = <T extends readonly [AsyncParser<unknown>, ...AsyncParser<unknown>[]]>(
	schemas: T
): AsyncParser<T[number] extends AsyncParser<infer O> ? O : never> => {
	type Output = T[number] extends AsyncParser<infer O> ? O : never

	const fn = (async (value: unknown) => {
		for (const schema of schemas) {
			try {
				if (schema.safe) {
					const result = await schema.safe(value)
					if (result.ok) return result.value as Output
				} else {
					return (await schema(value)) as Output
				}
			} catch {
				// Try next
			}
		}
		throw new ValidationError('No matching schema in union')
	}) as AsyncParser<Output>

	fn.safe = async (value: unknown): Promise<Result<Output>> => {
		for (const schema of schemas) {
			try {
				if (schema.safe) {
					const result = await schema.safe(value)
					if (result.ok) return result as Result<Output>
				} else {
					return { ok: true, value: (await schema(value)) as Output }
				}
			} catch {
				// Try next
			}
		}
		return { ok: false, error: 'No matching schema in union' }
	}

	return fn
}

export const variantAsync = <K extends string, T extends AsyncParser<Record<K, unknown>>[]>(
	key: K,
	options: T
): AsyncParser<T[number] extends AsyncParser<infer O> ? O : never> => {
	type Output = T[number] extends AsyncParser<infer O> ? O : never

	const fn = (async (value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}
		const input = value as Record<string, unknown>
		const discriminant = input[key]

		for (const option of options) {
			try {
				if (option.safe) {
					const result = await option.safe(value)
					if (result.ok) return result.value as Output
				} else {
					return (await option(value)) as Output
				}
			} catch {
				// Try next
			}
		}
		throw new ValidationError(`No matching variant for ${key}=${JSON.stringify(discriminant)}`)
	}) as AsyncParser<Output>

	fn.safe = async (value: unknown): Promise<Result<Output>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return { ok: false, error: 'Expected object' }
		}
		const input = value as Record<string, unknown>
		const discriminant = input[key]

		for (const option of options) {
			try {
				if (option.safe) {
					const result = await option.safe(value)
					if (result.ok) return result as Result<Output>
				} else {
					return { ok: true, value: (await option(value)) as Output }
				}
			} catch {
				// Try next
			}
		}
		return { ok: false, error: `No matching variant for ${key}=${JSON.stringify(discriminant)}` }
	}

	return fn
}

export const lazyAsync = <T>(getter: () => AsyncParser<T>): AsyncParser<T> => {
	const fn = (async (value: unknown) => {
		return getter()(value)
	}) as AsyncParser<T>

	fn.safe = async (value: unknown): Promise<Result<T>> => {
		const schema = getter()
		if (schema.safe) return schema.safe(value)
		try {
			return { ok: true, value: await schema(value) }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	return fn
}
