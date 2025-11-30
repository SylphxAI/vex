// ============================================================
// Union Types
// ============================================================

import type { Parser, Result, StandardSchemaV1 } from '../core'
import { addSchemaMetadata, addStandardSchema, ValidationError } from '../core'

type UnionOutput<T extends readonly Parser<unknown>[]> = {
	[K in keyof T]: T[K] extends Parser<infer O> ? O : never
}[number]

/**
 * Create a union validator (match one of multiple schemas)
 *
 * @example
 * const validateStringOrNumber = union([str, num])
 */
export const union = <T extends readonly [Parser<unknown>, ...Parser<unknown>[]]>(
	schemas: T
): Parser<UnionOutput<T>> => {
	const msg = 'Value does not match any type in union'
	const err: Result<never> = { ok: false, error: msg }
	const len = schemas.length

	const fn = ((value: unknown) => {
		for (let i = 0; i < len; i++) {
			const schema = schemas[i]!
			if (schema.safe) {
				const result = schema.safe(value)
				if (result.ok) return result.value
			} else {
				try {
					return schema(value)
				} catch {
					// continue to next schema
				}
			}
		}
		throw new ValidationError(msg)
	}) as Parser<UnionOutput<T>>

	fn.safe = (value: unknown): Result<UnionOutput<T>> => {
		for (let i = 0; i < len; i++) {
			const schema = schemas[i]!
			if (schema.safe) {
				const result = schema.safe(value)
				if (result.ok) return { ok: true, value: result.value as UnionOutput<T> }
			} else {
				try {
					return { ok: true, value: schema(value) as UnionOutput<T> }
				} catch {
					// continue to next schema
				}
			}
		}
		return err
	}

	// Add Standard Schema
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<UnionOutput<T>> => {
			for (let i = 0; i < len; i++) {
				const schema = schemas[i]!
				const std = schema['~standard']
				if (std) {
					const result = std.validate(value) as StandardSchemaV1.Result<unknown>
					if (!result.issues) return { value: result.value as UnionOutput<T> }
				} else if (schema.safe) {
					const result = schema.safe(value)
					if (result.ok) return { value: result.value as UnionOutput<T> }
				} else {
					try {
						return { value: schema(value) as UnionOutput<T> }
					} catch {
						// continue
					}
				}
			}
			return { issues: [{ message: msg }] }
		},
	}

	// Add schema metadata for JSON Schema conversion
	addSchemaMetadata(fn, { type: 'union', inner: [...schemas] })

	return fn
}

/**
 * Create a discriminated union validator (optimized union based on discriminator key)
 *
 * @example
 * const validateShape = discriminatedUnion('type', [
 *   object({ type: literal('circle'), radius: num }),
 *   object({ type: literal('square'), side: num }),
 * ])
 */
export const discriminatedUnion = <K extends string, T extends readonly Parser<unknown>[]>(
	_discriminator: K,
	options: T
): Parser<UnionOutput<T>> => {
	const msg = `Invalid discriminator value`
	const ERR_OBJECT: Result<never> = { ok: false, error: 'Expected object' }
	const len = options.length

	const fn = ((value: unknown) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new ValidationError('Expected object')
		}

		// Try each option until one matches
		for (let i = 0; i < len; i++) {
			const schema = options[i]!
			if (schema.safe) {
				const result = schema.safe(value)
				if (result.ok) return result.value
			} else {
				try {
					return schema(value)
				} catch {
					// continue to next
				}
			}
		}

		throw new ValidationError(msg)
	}) as Parser<UnionOutput<T>>

	fn.safe = (value: unknown): Result<UnionOutput<T>> => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return ERR_OBJECT as Result<UnionOutput<T>>
		}

		for (let i = 0; i < len; i++) {
			const schema = options[i]!
			if (schema.safe) {
				const result = schema.safe(value)
				if (result.ok) return { ok: true, value: result.value as UnionOutput<T> }
			} else {
				try {
					return { ok: true, value: schema(value) as UnionOutput<T> }
				} catch {
					// continue
				}
			}
		}

		return { ok: false, error: msg }
	}

	// Add schema metadata for JSON Schema conversion
	addSchemaMetadata(fn, {
		type: 'discriminatedUnion',
		inner: [...options],
		constraints: { discriminator: _discriminator },
	})

	return addStandardSchema(fn)
}
