// ============================================================
// Union Types
// ============================================================

import type { MetaAction, Parser, Result, StandardSchemaV1 } from '../core'
import {
	addSchemaMetadata,
	addStandardSchema,
	applyMetaActions,
	isMetaAction,
	type Metadata,
	ValidationError,
} from '../core'

type UnionOutput<T extends readonly Parser<unknown>[]> = {
	[K in keyof T]: T[K] extends Parser<infer O> ? O : never
}[number]

/** Argument type for union - can be a schema or MetaAction */
type UnionArg = Parser<unknown> | MetaAction

/**
 * Separate schemas from MetaActions in union arguments
 */
function separateUnionArgs(args: UnionArg[]): {
	schemas: Parser<unknown>[]
	metaActions: MetaAction[]
} {
	const schemas: Parser<unknown>[] = []
	const metaActions: MetaAction[] = []

	for (const arg of args) {
		if (isMetaAction(arg)) {
			metaActions.push(arg)
		} else {
			schemas.push(arg)
		}
	}

	return { schemas, metaActions }
}

/**
 * Create a union validator (match one of multiple schemas)
 *
 * @example
 * union(str(), num())                              // string | number
 * union(str(), num(), description('String or number'))  // with metadata
 */
export function union<A>(a: Parser<A>, ...rest: MetaAction[]): Parser<A>
export function union<A, B>(a: Parser<A>, b: Parser<B>, ...rest: MetaAction[]): Parser<A | B>
export function union<A, B, C>(
	a: Parser<A>,
	b: Parser<B>,
	c: Parser<C>,
	...rest: MetaAction[]
): Parser<A | B | C>
export function union<A, B, C, D>(
	a: Parser<A>,
	b: Parser<B>,
	c: Parser<C>,
	d: Parser<D>,
	...rest: MetaAction[]
): Parser<A | B | C | D>
export function union<A, B, C, D, E>(
	a: Parser<A>,
	b: Parser<B>,
	c: Parser<C>,
	d: Parser<D>,
	e: Parser<E>,
	...rest: MetaAction[]
): Parser<A | B | C | D | E>
export function union(...args: UnionArg[]): Parser<unknown> {
	const { schemas, metaActions } = separateUnionArgs(args)

	if (schemas.length === 0) {
		throw new Error('union() requires at least one schema')
	}

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
	}) as Parser<unknown>

	fn.safe = (value: unknown): Result<unknown> => {
		for (let i = 0; i < len; i++) {
			const schema = schemas[i]!
			if (schema.safe) {
				const result = schema.safe(value)
				if (result.ok) return { ok: true, value: result.value }
			} else {
				try {
					return { ok: true, value: schema(value) }
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
		validate: (value: unknown): StandardSchemaV1.Result<unknown> => {
			for (let i = 0; i < len; i++) {
				const schema = schemas[i]!
				const std = schema['~standard']
				if (std) {
					const result = std.validate(value) as StandardSchemaV1.Result<unknown>
					if (!result.issues) return { value: result.value }
				} else if (schema.safe) {
					const result = schema.safe(value)
					if (result.ok) return { value: result.value }
				} else {
					try {
						return { value: schema(value) }
					} catch {
						// continue
					}
				}
			}
			return { issues: [{ message: msg }] }
		},
	}

	// Build metadata
	let metadata: Metadata = { type: 'union', inner: [...schemas] }

	// Apply MetaActions
	if (metaActions.length > 0) {
		metadata = applyMetaActions(metadata, metaActions)
	}

	addSchemaMetadata(fn, metadata)

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
	options: T,
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
