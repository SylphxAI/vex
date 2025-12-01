// ============================================================
// Metadata Composition Functions
// ============================================================
//
// MetaAction-based metadata modifiers.
// These return MetaAction (not Validator!) for consistent API:
//
//   str(min(1), description('Test'))
//   union(str(), num(), description('Either'))
//   object({ name: str() }, description('User'))
//
// ============================================================

import type { Parser, Result, Validator } from '../core'
import {
	addStandardSchema,
	applyMetaActions,
	createMetaAction,
	getMeta,
	type MetaAction,
	type Metadata,
	setMeta,
} from '../core'

// ============================================================
// Re-exports from core
// ============================================================

export { getMeta, isMetaAction, type MetaAction, type Metadata } from '../core'

// ============================================================
// Getter Functions
// ============================================================

/**
 * Get metadata from a validator
 *
 * @example
 * const meta = getMetadata(validator)
 */
export const getMetadata = getMeta

/**
 * Get description from a validator
 *
 * @example
 * const desc = getDescription(emailValidator)
 */
export const getDescription = <I, O>(validator: Validator<I, O>): string | undefined => {
	return getMeta(validator)?.description
}

/**
 * Get title from a validator
 *
 * @example
 * const t = getTitle(emailValidator)
 */
export const getTitle = <I, O>(validator: Validator<I, O>): string | undefined => {
	return getMeta(validator)?.title
}

/**
 * Get examples from a validator
 *
 * @example
 * const exs = getExamples(emailValidator)
 */
export const getExamples = <I, O>(validator: Validator<I, O>): unknown[] | undefined => {
	return getMeta(validator)?.examples
}

/**
 * Get brand from a validator
 *
 * @example
 * const b = getBrand(emailValidator)
 */
export const getBrand = <I, O>(validator: Validator<I, O>): string | undefined => {
	return getMeta(validator)?.brand
}

/**
 * Get flavor from a validator
 *
 * @example
 * const f = getFlavor(userIdValidator)
 */
export const getFlavor = <I, O>(validator: Validator<I, O>): string | undefined => {
	return getMeta(validator)?.flavor
}

// ============================================================
// MetaAction Factories
// ============================================================

/**
 * Add a description to a schema
 *
 * @example
 * str(email, description('User email address'))
 * union(str(), num(), description('String or number'))
 */
export const description = (text: string): MetaAction => {
	return createMetaAction({ description: text })
}

/**
 * Add a title to a schema
 *
 * @example
 * str(email, title('Email'))
 */
export const title = (text: string): MetaAction => {
	return createMetaAction({ title: text })
}

/**
 * Add examples to a schema
 *
 * @example
 * str(email, examples(['user@example.com', 'admin@domain.org']))
 */
export const examples = <T>(exampleValues: T[]): MetaAction => {
	return createMetaAction({ examples: exampleValues })
}

/**
 * Mark a schema as deprecated
 *
 * @example
 * str(deprecated())
 */
export const deprecated = (): MetaAction => {
	return createMetaAction({ deprecated: true })
}

/**
 * Add all metadata at once
 *
 * @example
 * str(metadata({ description: 'Test', title: 'Title' }))
 */
export const metadata = (meta: Partial<Omit<Metadata, 'type'>>): MetaAction => {
	return createMetaAction(meta)
}

// ============================================================
// Brand/Flavor - Special cases (affect types)
// ============================================================

/**
 * Add a brand to a validator (nominal typing support)
 *
 * Note: brand() wraps a validator (not MetaAction) because it
 * affects the TypeScript output type.
 *
 * @example
 * type Email = string & { __brand: 'Email' }
 * const validateEmail = brand(str(email), 'Email')
 */
export const brand = <I, O, B extends string>(
	validator: Validator<I, O>,
	brandName: B,
): Validator<I, O & { __brand: B }> => {
	const fn = ((value: I) => validator(value)) as Validator<I, O & { __brand: B }>

	fn.safe = (value: I): Result<O & { __brand: B }> => {
		if (validator.safe) {
			const result = validator.safe(value)
			if (result.ok) return { ok: true, value: result.value as O & { __brand: B } }
			return result as Result<O & { __brand: B }>
		}
		try {
			return { ok: true, value: validator(value) as O & { __brand: B } }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	// Get existing metadata and add brand
	const existing = getMeta(validator)
	if (existing) {
		setMeta(fn, { ...existing, brand: brandName })
	} else {
		setMeta(fn, { type: 'unknown', brand: brandName })
	}

	return addStandardSchema(fn)
}

/**
 * Add a flavor to a validator (weaker nominal typing)
 *
 * Note: flavor() wraps a validator (not MetaAction) because it
 * affects the TypeScript output type.
 *
 * @example
 * type UserId = string & { __flavor?: 'UserId' }
 * const validateUserId = flavor(str(uuid), 'UserId')
 */
export const flavor = <I, O, F extends string>(
	validator: Validator<I, O>,
	flavorName: F,
): Validator<I, O & { __flavor?: F }> => {
	const fn = ((value: I) => validator(value)) as Validator<I, O & { __flavor?: F }>

	fn.safe = (value: I): Result<O & { __flavor?: F }> => {
		if (validator.safe) {
			const result = validator.safe(value)
			if (result.ok) return { ok: true, value: result.value as O & { __flavor?: F } }
			return result as Result<O & { __flavor?: F }>
		}
		try {
			return { ok: true, value: validator(value) as O & { __flavor?: F } }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	// Get existing metadata and add flavor
	const existing = getMeta(validator)
	if (existing) {
		setMeta(fn, { ...existing, flavor: flavorName })
	} else {
		setMeta(fn, { type: 'unknown', flavor: flavorName })
	}

	return addStandardSchema(fn)
}

/**
 * Make a validator readonly (type-level only, no runtime effect)
 *
 * Note: readonly() wraps a validator because it affects the
 * TypeScript output type.
 *
 * @example
 * const validateReadonlyUser = readonly(validateUser)
 */
export const readonly = <O>(validator: Parser<O>): Parser<Readonly<O>> => {
	const fn = ((value: unknown) => validator(value)) as Parser<Readonly<O>>

	fn.safe = (value: unknown): Result<Readonly<O>> => {
		if (validator.safe) {
			const result = validator.safe(value)
			if (result.ok) return { ok: true, value: result.value as Readonly<O> }
			return result as Result<Readonly<O>>
		}
		try {
			return { ok: true, value: validator(value) as Readonly<O> }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	// Get existing metadata and add readonly flag
	const existing = getMeta(validator)
	if (existing) {
		setMeta(fn, { ...existing, readonly: true })
	} else {
		setMeta(fn, { type: 'unknown', readonly: true })
	}

	return addStandardSchema(fn)
}

// ============================================================
// Helper: Apply MetaActions to a validator
// ============================================================

/**
 * Apply MetaActions to a validator's metadata
 *
 * Used internally by schema functions to handle MetaAction arguments.
 *
 * @example
 * const result = applyMetaActionsToValidator(validator, [description('X')])
 */
export function applyMetaActionsToValidator<T>(validator: T, actions: MetaAction[]): T {
	if (actions.length === 0) return validator

	const existing = getMeta(validator)
	if (existing) {
		setMeta(validator, applyMetaActions(existing, actions))
	}
	return validator
}
