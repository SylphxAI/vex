// ============================================================
// Intersect Composition
// ============================================================

import type { MetaAction, Parser, Result, StandardSchemaV1 } from '../core'
import { addSchemaMetadata, applyMetaActions, isMetaAction, type Metadata } from '../core'

/** Argument type for intersect - can be a schema or MetaAction */
type IntersectArg = Parser<unknown> | MetaAction

/**
 * Separate schemas from MetaActions in intersect arguments
 */
function separateIntersectArgs(args: IntersectArg[]): {
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
 * Create an intersect validator (value must match ALL schemas)
 *
 * @example
 * intersect(
 *   object({ name: str() }),
 *   object({ age: num() }),
 * )
 * intersect(
 *   object({ name: str() }),
 *   object({ age: num() }),
 *   description('User with age')
 * )
 */
export function intersect<A>(a: Parser<A>, ...rest: MetaAction[]): Parser<A>
export function intersect<A, B>(a: Parser<A>, b: Parser<B>, ...rest: MetaAction[]): Parser<A & B>
export function intersect<A, B, C>(
	a: Parser<A>,
	b: Parser<B>,
	c: Parser<C>,
	...rest: MetaAction[]
): Parser<A & B & C>
export function intersect<A, B, C, D>(
	a: Parser<A>,
	b: Parser<B>,
	c: Parser<C>,
	d: Parser<D>,
	...rest: MetaAction[]
): Parser<A & B & C & D>
export function intersect<A, B, C, D, E>(
	a: Parser<A>,
	b: Parser<B>,
	c: Parser<C>,
	d: Parser<D>,
	e: Parser<E>,
	...rest: MetaAction[]
): Parser<A & B & C & D & E>
export function intersect(...args: IntersectArg[]): Parser<unknown> {
	const { schemas, metaActions } = separateIntersectArgs(args)

	if (schemas.length === 0) {
		throw new Error('intersect() requires at least one schema')
	}

	const msg = 'Value does not match all schemas in intersect'

	const fn = ((value: unknown) => {
		let result: unknown = {}

		for (const schema of schemas) {
			const validated = schema(value)
			if (typeof validated === 'object' && validated !== null && typeof result === 'object') {
				result = { ...result, ...validated }
			} else {
				result = validated
			}
		}

		return result
	}) as Parser<unknown>

	fn.safe = (value: unknown): Result<unknown> => {
		let result: unknown = {}

		for (const schema of schemas) {
			if (schema.safe) {
				const r = schema.safe(value)
				if (!r.ok) return { ok: false, error: r.error }
				if (typeof r.value === 'object' && r.value !== null && typeof result === 'object') {
					result = { ...result, ...r.value }
				} else {
					result = r.value
				}
			} else {
				try {
					const validated = schema(value)
					if (typeof validated === 'object' && validated !== null && typeof result === 'object') {
						result = { ...result, ...validated }
					} else {
						result = validated
					}
				} catch (e) {
					return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
				}
			}
		}

		return { ok: true, value: result }
	}

	// Add Standard Schema
	;(fn as unknown as Record<string, unknown>)['~standard'] = {
		version: 1 as const,
		vendor: 'vex',
		validate: (value: unknown): StandardSchemaV1.Result<unknown> => {
			let result: unknown = {}

			for (const schema of schemas) {
				const std = schema['~standard']
				if (std) {
					const r = std.validate(value) as StandardSchemaV1.Result<unknown>
					if (r.issues) return r
					if (typeof r.value === 'object' && r.value !== null && typeof result === 'object') {
						result = { ...result, ...r.value }
					} else {
						result = r.value
					}
				} else if (schema.safe) {
					const r = schema.safe(value)
					if (!r.ok) return { issues: [{ message: r.error }] }
					if (typeof r.value === 'object' && r.value !== null && typeof result === 'object') {
						result = { ...result, ...r.value }
					} else {
						result = r.value
					}
				} else {
					try {
						const validated = schema(value)
						if (typeof validated === 'object' && validated !== null && typeof result === 'object') {
							result = { ...result, ...validated }
						} else {
							result = validated
						}
					} catch (e) {
						return { issues: [{ message: e instanceof Error ? e.message : msg }] }
					}
				}
			}

			return { value: result }
		},
	}

	// Build metadata
	let metadata: Metadata = { type: 'intersect', inner: [...schemas] }

	// Apply MetaActions
	if (metaActions.length > 0) {
		metadata = applyMetaActions(metadata, metaActions)
	}

	addSchemaMetadata(fn, metadata)

	return fn
}
