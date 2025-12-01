// Core exports

export { type PathSegment, ValidationError, type ValidationIssue, ValiError } from './error'
export { addStandardSchema, createValidator } from './helpers'
export {
	// Legacy compatibility (deprecated)
	addSchemaMetadata,
	// New unified metadata API
	applyMetaActions,
	createMetaAction,
	getMeta,
	getSchemaMetadata,
	isMetaAction,
	META_ACTION_KEY,
	META_KEY,
	type MetaAction,
	type Metadata,
	mergeMeta,
	type SchemaMetadata,
	setMeta,
	updateMeta,
	type WithMeta,
	wrapMeta,
} from './metadata'
export type { StandardSchemaV1 } from './standard'
export type { Parser, Result, StandardValidator, Validator } from './types'

// Type inference utilities (Valibot compatibility)
import type { StandardSchemaV1 } from './standard'

/** Infer the input type of a schema */
export type InferInput<T extends StandardSchemaV1> = StandardSchemaV1.InferInput<T>

/** Infer the output type of a schema */
export type InferOutput<T extends StandardSchemaV1> = StandardSchemaV1.InferOutput<T>

/** Alias for InferInput */
export type Input<T extends StandardSchemaV1> = InferInput<T>

/** Alias for InferOutput */
export type Output<T extends StandardSchemaV1> = InferOutput<T>
