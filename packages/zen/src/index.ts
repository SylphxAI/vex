// ============================================================
// 🧘 Zen - Calm, minimal schema validation
// ============================================================

// Core
export { SchemaError } from './errors'
export type {
	AnySchema,
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

// Schemas
export {
	// Core schemas
	array,
	boolean,
	enum_,
	literal,
	number,
	object,
	record,
	string,
	tuple,
	union,
	// Advanced schemas
	discriminatedUnion,
	lazy,
	// Primitive types
	any,
	unknown,
	null as null_,
	undefined as undefined_,
	void as void_,
	never,
	nan,
	date,
	bigint,
	symbol,
	// Modifiers
	coerce,
	refine,
	transform,
	withDefault,
	withCatch,
	superRefine,
	brand,
	readonly,
	custom,
	stringbool,
	// Utilities
	preprocess,
	intersection,
	promise,
	function as function_,
	map,
	set,
	instanceof as instanceof_,
	pipe,
	or,
	and,
	// Types
	type ArraySchema,
	type Brand,
	type BrandedSchema,
	type BooleanSchema,
	type DiscriminatedUnionSchema,
	type EnumSchema,
	type FunctionSchema,
	type IntersectionSchema,
	type LazySchema,
	type LiteralSchema,
	type MapSchema,
	type NumberSchema,
	type ObjectSchema,
	type ObjectShape,
	type PromiseSchema,
	type RecordSchema,
	type RefinedSchema,
	type SetSchema,
	type StringSchema,
	type TupleSchema,
	type UnionSchema,
} from './schemas'

// Convenience namespace (like zod's `z`)
import {
	// Core schemas
	array,
	boolean,
	enum_,
	literal,
	number,
	object,
	record,
	string,
	tuple,
	union,
	// Advanced schemas
	discriminatedUnion,
	lazy,
	// Primitive types
	any,
	unknown,
	null as null_,
	undefined as undefined_,
	void as void_,
	never,
	nan,
	date,
	bigint,
	symbol,
	// Modifiers
	coerce,
	refine,
	transform,
	withDefault,
	withCatch,
	superRefine,
	brand,
	readonly,
	custom,
	stringbool,
	// Utilities
	preprocess,
	intersection,
	promise,
	function as function_,
	map,
	set,
	instanceof as instanceof_,
	pipe,
	or,
	and,
} from './schemas'

export const z = {
	// Primitives
	string,
	number,
	boolean,
	bigint,
	symbol,
	date,
	// Special types
	any,
	unknown,
	null: null_,
	undefined: undefined_,
	void: void_,
	never,
	nan,
	// Complex types
	object,
	array,
	tuple,
	record,
	map,
	set,
	// Union & literal
	union,
	discriminatedUnion,
	intersection,
	literal,
	enum: enum_,
	// Recursion
	lazy,
	// Function & Promise
	function: function_,
	promise,
	instanceof: instanceof_,
	// Modifiers
	refine,
	superRefine,
	transform,
	default: withDefault,
	catch: withCatch,
	brand,
	readonly,
	custom,
	stringbool,
	coerce,
	preprocess,
	pipe,
	or,
	and,
} as const

// Alias for zen
export const zen = z

// Default export
export default z
