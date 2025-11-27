// ============================================================
// 🧘 Zen - Calm, minimal schema validation
// ============================================================

// Core
export { SchemaError } from './errors'
export type {
	BaseSchema,
	Check,
	Infer,
	InferInput,
	InferOutput,
	Input,
	Issue,
	Result,
	StandardSchemaV1,
} from './types'

// Transforms
export {
	refine,
	transform,
	withDefault,
	coerceNumber,
	coerceString,
	coerceBoolean,
} from './transforms'

// Schemas
export {
	array,
	boolean,
	literal,
	number,
	object,
	string,
	union,
	enumSchema,
	enum_,
	tuple,
	record,
	type ArraySchema,
	type BooleanSchema,
	type LiteralSchema,
	type NumberSchema,
	type ObjectSchema,
	type ObjectShape,
	type StringSchema,
	type UnionSchema,
	type EnumSchema,
	type TupleSchema,
	type RecordSchema,
} from './schemas'

// Convenience namespace (like zod's `z`)
import {
	array,
	boolean,
	literal,
	number,
	object,
	string,
	union,
	enumSchema,
	tuple,
	record,
} from './schemas'
import {
	refine,
	transform,
	withDefault,
	coerceNumber,
	coerceString,
	coerceBoolean,
} from './transforms'

export const z = {
	// Schema creators
	string,
	number,
	boolean,
	object,
	array,
	union,
	literal,
	enum: enumSchema,
	tuple,
	record,
	// Transform utilities
	refine,
	transform,
	default: withDefault,
	// Coercion
	coerce: {
		string: () => coerceString(string()),
		number: () => coerceNumber(number()),
		boolean: () => coerceBoolean(boolean()),
	},
} as const

// Alias for zen
export const zen = z

// Default export
export default z
