// ============================================================
// 🧘 Zen - Calm, minimal schema validation
// ============================================================

// Core
export { SchemaError } from './errors'
export { toJSONSchema, type JSONSchemaOptions, type JSONSchemaType } from './jsonSchema'
export { globalRegistry, type SchemaRegistry } from './registry'

// JIT Compilation (Performance)
export {
	compile,
	compileChecks,
	compileObjectSchema,
	fastCheck,
	filterValid,
	getOptimizedValidator,
	partition,
	tryValidateInline,
	validateBatch,
	validateInline,
	type CompiledObjectValidator,
	type CompiledValidator,
} from './jit'
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
	nativeEnum,
	literal,
	number,
	object,
	strictObject,
	looseObject,
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
	json,
	int,
	int32,
	iso,
	prefault,
	check,
	// Top-level format validators
	email,
	uuid,
	uuidv1,
	uuidv2,
	uuidv3,
	uuidv4,
	uuidv5,
	uuidv6,
	uuidv7,
	url,
	httpUrl,
	ipv4,
	ipv6,
	hash,
	// Advanced utilities
	codec,
	file,
	templateLiteral,
	partialRecord,
	// Interface schema (Zod v4)
	interface as interface_,
	optionalProp,
	// Types
	type ArraySchema,
	type BigIntSchema,
	type Brand,
	type BrandedSchema,
	type BooleanSchema,
	type Codec,
	type DateSchema,
	type DiscriminatedUnionSchema,
	type EnumSchema,
	type FileSchema,
	type FunctionSchema,
	type IntersectionSchema,
	type IntSchema,
	type JsonSchema,
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
	type InterfaceSchema,
	type InterfaceShape,
	type OptionalProperty,
	type NativeEnumSchema,
} from './schemas'

// Convenience namespace (like zod's `z`)
import {
	// Core schemas
	array,
	boolean,
	enum_,
	nativeEnum,
	literal,
	number,
	object,
	strictObject,
	looseObject,
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
	json,
	int,
	int32,
	iso,
	prefault,
	check,
	// Top-level format validators
	email,
	uuid,
	uuidv1,
	uuidv2,
	uuidv3,
	uuidv4,
	uuidv5,
	uuidv6,
	uuidv7,
	url,
	httpUrl,
	ipv4,
	ipv6,
	hash,
	// Advanced utilities
	codec,
	file,
	templateLiteral,
	partialRecord,
	// Interface schema (Zod v4)
	interface as interface_2,
	optionalProp as optionalProp2,
} from './schemas'

import { toJSONSchema } from './jsonSchema'
import { globalRegistry } from './registry'
import { compile, validateBatch, filterValid, partition, compileObjectSchema, fastCheck, validateInline, tryValidateInline } from './jit'

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
	strictObject,
	looseObject,
	array,
	tuple,
	record,
	partialRecord,
	map,
	set,
	// Union & literal
	union,
	discriminatedUnion,
	intersection,
	literal,
	enum: enum_,
	nativeEnum,
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
	// Additional utilities
	json,
	int,
	int32,
	iso,
	prefault,
	check,
	// Top-level format validators
	email,
	uuid,
	uuidv1,
	uuidv2,
	uuidv3,
	uuidv4,
	uuidv5,
	uuidv6,
	uuidv7,
	url,
	httpUrl,
	ipv4,
	ipv6,
	hash,
	// Advanced utilities
	codec,
	file,
	templateLiteral,
	// Interface schema (Zod v4)
	interface: interface_2,
	optionalProp: optionalProp2,
	// JSON Schema conversion
	toJSONSchema,
	// Registry
	globalRegistry,
	// JIT Compilation (Performance)
	compile,
	validateBatch,
	filterValid,
	partition,
	compileObjectSchema,
	fastCheck,
	validateInline,
	tryValidateInline,
} as const

// Alias for zen
export const zen = z

// NOTE: Infer, Input, InferInput, InferOutput already exported in types block above

// Default export
export default z
