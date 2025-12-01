// ============================================================
// Unified Metadata System
// ============================================================
//
// Single source of truth for all validator metadata.
//
// Two key concepts:
// 1. Metadata - attached to validators via '~meta' key
// 2. MetaAction - composable metadata modifiers (not validators!)
//
// MetaAction allows consistent API across all schema types:
//   str(min(1), description('Test'))
//   union(str(), num(), description('Either'))
//
// ============================================================

import type { Validator } from './types'

// ============================================================
// Constants
// ============================================================

/** Metadata key - string for easy debugging and serialization */
export const META_KEY = '~meta' as const

/** MetaAction brand key */
export const META_ACTION_KEY = '~metaAction' as const

// ============================================================
// Types
// ============================================================

/**
 * Unified metadata interface for all validators
 *
 * Combines:
 * - Type information (for JSON Schema conversion)
 * - Documentation (description, title, examples)
 * - Nominal typing (brand, flavor)
 * - Flags (readonly, deprecated)
 */
export interface Metadata {
	// ---- Type Information ----
	/** The base type of the validator */
	type: string
	/** Validation constraints (minLength, pattern, etc.) */
	constraints?: Record<string, unknown>
	/** Inner schema(s) for composed types */
	inner?: unknown

	// ---- Documentation ----
	/** Human-readable description */
	description?: string
	/** Short title/label */
	title?: string
	/** Example valid values */
	examples?: unknown[]
	/** Default value */
	default?: unknown
	/** Mark as deprecated */
	deprecated?: boolean

	// ---- Nominal Typing ----
	/** Brand for strict nominal typing */
	brand?: string
	/** Flavor for weak nominal typing */
	flavor?: string

	// ---- Flags ----
	/** Mark as readonly (type-level) */
	readonly?: boolean

	// ---- Extensibility ----
	/** Allow additional custom metadata */
	[key: string]: unknown
}

/** Validator with metadata attached */
export type WithMeta<T> = T & { [META_KEY]?: Metadata }

// ============================================================
// MetaAction - Composable Metadata Modifiers
// ============================================================

/**
 * MetaAction - a metadata modifier that can be passed to schema functions
 *
 * Unlike validators which transform values, MetaActions only modify metadata.
 * This allows consistent API across all schema types:
 *
 * @example
 * str(min(1), description('Test'))      // description is MetaAction
 * union(str(), num(), description('X')) // works here too!
 * object({ name: str() }, description('User'))
 */
export interface MetaAction {
	readonly [META_ACTION_KEY]: true
	/** Apply this action to existing metadata */
	readonly apply: (meta: Metadata) => Metadata
}

/**
 * Type guard to check if a value is a MetaAction
 */
export function isMetaAction(value: unknown): value is MetaAction {
	return (
		typeof value === 'object' &&
		value !== null &&
		META_ACTION_KEY in value &&
		(value as MetaAction)[META_ACTION_KEY] === true
	)
}

/**
 * Create a MetaAction from a partial metadata update
 *
 * @example
 * const desc = createMetaAction({ description: 'Test' })
 */
export function createMetaAction(updates: Partial<Omit<Metadata, 'type'>>): MetaAction {
	return {
		[META_ACTION_KEY]: true,
		apply: (meta) => ({ ...meta, ...updates }),
	}
}

/**
 * Apply multiple MetaActions to metadata
 *
 * @example
 * const meta = applyMetaActions(baseMeta, [description('X'), title('Y')])
 */
export function applyMetaActions(meta: Metadata, actions: MetaAction[]): Metadata {
	let result = meta
	for (const action of actions) {
		result = action.apply(result)
	}
	return result
}

// ============================================================
// Core Functions
// ============================================================

/**
 * Get metadata from a validator
 *
 * @example
 * const meta = getMeta(validator)
 * if (meta) console.log(meta.type, meta.description)
 */
export function getMeta(validator: unknown): Metadata | undefined {
	return (validator as WithMeta<unknown>)?.[META_KEY]
}

/**
 * Set metadata on a validator (mutates and returns)
 *
 * @example
 * setMeta(fn, { type: 'string', description: 'User email' })
 */
export function setMeta<T>(validator: T, metadata: Metadata): T {
	;(validator as WithMeta<T>)[META_KEY] = metadata
	return validator
}

/**
 * Update metadata on a validator (merges with existing)
 *
 * @example
 * updateMeta(fn, { description: 'Updated description' })
 */
export function updateMeta<T>(validator: T, updates: Partial<Metadata>): T {
	const existing = getMeta(validator)
	if (existing) {
		;(validator as WithMeta<T>)[META_KEY] = { ...existing, ...updates }
	} else if (updates.type) {
		;(validator as WithMeta<T>)[META_KEY] = updates as Metadata
	}
	return validator
}

// ============================================================
// Composition Helpers
// ============================================================

/**
 * Merge metadata from multiple validators (for pipe composition)
 *
 * Semantics:
 * - type: First validator's type (base type)
 * - constraints: Merge all (accumulate)
 * - description/title/examples: Last one wins (most specific)
 * - brand/flavor: Last one wins
 * - inner: Preserve from last that has it
 *
 * @example
 * const merged = mergeMeta([getMeta(v1), getMeta(v2), getMeta(v3)])
 */
export function mergeMeta(steps: (Metadata | undefined)[]): Metadata | undefined {
	const defined = steps.filter((m): m is Metadata => m !== undefined)
	if (defined.length === 0) return undefined
	if (defined.length === 1) return defined[0]

	const first = defined[0]!
	const result: Metadata = { type: first.type }

	for (const step of defined) {
		// Constraints: merge (accumulate)
		if (step.constraints) {
			result.constraints = { ...result.constraints, ...step.constraints }
		}

		// Documentation: last wins
		if (step.description !== undefined) result.description = step.description
		if (step.title !== undefined) result.title = step.title
		if (step.examples !== undefined) result.examples = step.examples
		if (step.default !== undefined) result.default = step.default
		if (step.deprecated !== undefined) result.deprecated = step.deprecated

		// Nominal typing: last wins
		if (step.brand !== undefined) result.brand = step.brand
		if (step.flavor !== undefined) result.flavor = step.flavor

		// Flags: last wins
		if (step.readonly !== undefined) result.readonly = step.readonly

		// Inner: preserve last that has it
		if (step.inner !== undefined) result.inner = step.inner
	}

	return result
}

/**
 * Wrap metadata for composed types (optional, nullable, array, etc.)
 *
 * Preserves documentation from inner validator while setting new type.
 *
 * @example
 * const wrapped = wrapMeta('optional', getMeta(innerValidator))
 */
export function wrapMeta(
	type: string,
	innerMeta: Metadata | undefined,
	inner: unknown,
	extraConstraints?: Record<string, unknown>,
): Metadata {
	const result: Metadata = {
		type,
		inner,
	}

	// Preserve documentation from inner
	if (innerMeta) {
		if (innerMeta.description !== undefined) result.description = innerMeta.description
		if (innerMeta.title !== undefined) result.title = innerMeta.title
		if (innerMeta.examples !== undefined) result.examples = innerMeta.examples
		if (innerMeta.brand !== undefined) result.brand = innerMeta.brand
		if (innerMeta.flavor !== undefined) result.flavor = innerMeta.flavor
	}

	// Add extra constraints
	if (extraConstraints) {
		result.constraints = extraConstraints
	}

	return result
}

// ============================================================
// Legacy Compatibility (deprecated, will be removed)
// ============================================================

// These are kept temporarily for migration, aliased to new functions

/** @deprecated Use getMeta instead */
export const getSchemaMetadata = getMeta

/** @deprecated Use setMeta instead */
export function addSchemaMetadata<I, O>(
	fn: Validator<I, O>,
	metadata: { type: string; constraints?: Record<string, unknown>; inner?: unknown },
): Validator<I, O> {
	return setMeta(fn, metadata as Metadata)
}

/** @deprecated Use Metadata instead */
export type SchemaMetadata = Metadata
