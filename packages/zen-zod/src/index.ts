// ============================================================
// 🧘 Zen-Zod - Zod compatibility adapter
// ============================================================

// Export compatibility types (no Zod dependency)
export type {
	UniversalSchema,
	InferOutput,
	InferInput,
	Infer,
	ZodLikeSchema,
	ZenLikeSchema,
	StandardSchemaLike,
	ZodTypeShape,
	AnySchemaCompat,
	ZodCompatible,
} from './compat-types'

export { isSchema, isStandardSchema } from './compat-types'

import {
	type AnySchema,
	type ArraySchema,
	type BaseSchema,
	type BooleanSchema,
	type DiscriminatedUnionSchema,
	type EnumSchema,
	type Infer,
	type Input,
	type LazySchema,
	type LiteralSchema,
	type NumberSchema,
	type ObjectSchema,
	type ObjectShape,
	type RecordSchema,
	type RefinedSchema,
	SchemaError,
	type StringSchema,
	type TupleSchema,
	type UnionSchema,
	// Core schemas
	array as zenArray,
	boolean as zenBoolean,
	enum_ as zenEnum,
	literal as zenLiteral,
	number as zenNumber,
	object as zenObject,
	record as zenRecord,
	string as zenString,
	tuple as zenTuple,
	union as zenUnion,
	// Advanced schemas
	discriminatedUnion as zenDiscriminatedUnion,
	lazy as zenLazy,
	// Primitive types
	any as zenAny,
	unknown as zenUnknown,
	null_ as zenNull,
	undefined_ as zenUndefined,
	void_ as zenVoid,
	never as zenNever,
	nan as zenNan,
	date as zenDate,
	bigint as zenBigint,
	symbol as zenSymbol,
	// Modifiers
	coerce as zenCoerce,
	refine as zenRefine,
	transform as zenTransform,
	withDefault as zenDefault,
} from '@sylphx/zen-full'

// ============================================================
// Zod Compatibility Types
// ============================================================

export type ZodTypeName =
	| 'ZodString'
	| 'ZodNumber'
	| 'ZodBoolean'
	| 'ZodBigInt'
	| 'ZodSymbol'
	| 'ZodDate'
	| 'ZodObject'
	| 'ZodArray'
	| 'ZodTuple'
	| 'ZodRecord'
	| 'ZodOptional'
	| 'ZodNullable'
	| 'ZodUnion'
	| 'ZodDiscriminatedUnion'
	| 'ZodLiteral'
	| 'ZodEnum'
	| 'ZodLazy'
	| 'ZodAny'
	| 'ZodUnknown'
	| 'ZodNull'
	| 'ZodUndefined'
	| 'ZodVoid'
	| 'ZodNever'
	| 'ZodNaN'
	| 'ZodEffects'
	| 'ZodDefault'

export interface ZodCompatDef {
	readonly typeName: ZodTypeName
}

// ============================================================
// Zod-Compatible Error
// ============================================================

export class ZodError extends Error {
	readonly name = 'ZodError'
	readonly issues: Array<{
		code: string
		message: string
		path: (string | number)[]
	}>

	constructor(schemaError: SchemaError) {
		super(schemaError.message)
		this.issues = schemaError.issues.map((i) => ({
			code: 'custom',
			message: i.message,
			path: (i.path?.map((p) => (typeof p === 'symbol' ? String(p) : p)) ?? []) as (
				| string
				| number
			)[],
		}))
	}

	get errors() {
		return this.issues
	}

	flatten() {
		const formErrors: string[] = []
		const fieldErrors: Record<string, string[]> = {}

		for (const issue of this.issues) {
			if (issue.path.length === 0) {
				formErrors.push(issue.message)
			} else {
				const key = issue.path.join('.')
				fieldErrors[key] ??= []
				fieldErrors[key].push(issue.message)
			}
		}

		return { formErrors, fieldErrors }
	}
}

// ============================================================
// Schema with Zod compatibility
// ============================================================

type ZodCompatSchema<T extends BaseSchema<unknown, unknown>> = T & {
	readonly _def: ZodCompatDef
	readonly _zod: { def: ZodCompatDef }
}

function addZodCompat<T extends BaseSchema<unknown, unknown>>(
	schema: T,
	typeName: ZodTypeName
): ZodCompatSchema<T> {
	return Object.assign(schema, {
		_def: { typeName },
		_zod: { def: { typeName } },
	}) as ZodCompatSchema<T>
}

// ============================================================
// Core Schema Creators
// ============================================================

export function string(): ZodCompatSchema<StringSchema> {
	return addZodCompat(zenString(), 'ZodString')
}

export function number(): ZodCompatSchema<NumberSchema> {
	return addZodCompat(zenNumber(), 'ZodNumber')
}

export function boolean(): ZodCompatSchema<BooleanSchema> {
	return addZodCompat(zenBoolean(), 'ZodBoolean')
}

export function object<T extends ObjectShape>(shape: T): ZodCompatSchema<ObjectSchema<T>> {
	return addZodCompat(zenObject(shape), 'ZodObject')
}

export function array<T extends AnySchema>(element: T): ZodCompatSchema<ArraySchema<T>> {
	return addZodCompat(zenArray(element), 'ZodArray')
}

export function union<T extends readonly AnySchema[]>(options: T): ZodCompatSchema<UnionSchema<T>> {
	return addZodCompat(zenUnion(options), 'ZodUnion')
}

export function literal<T extends string | number | boolean | null | undefined>(
	value: T
): ZodCompatSchema<LiteralSchema<T>> {
	return addZodCompat(zenLiteral(value), 'ZodLiteral')
}

type EnumValues = readonly [string, ...string[]]
export function enum_<T extends EnumValues>(values: T): ZodCompatSchema<EnumSchema<T>> {
	return addZodCompat(zenEnum(values), 'ZodEnum')
}

type TupleItems = readonly AnySchema[]
export function tuple<T extends TupleItems>(items: T): ZodCompatSchema<TupleSchema<T>> {
	return addZodCompat(zenTuple(items), 'ZodTuple')
}

export function record<TValue extends AnySchema>(
	valueSchema: TValue
): ZodCompatSchema<RecordSchema<BaseSchema<string, string>, TValue>> {
	return addZodCompat(zenRecord(valueSchema), 'ZodRecord')
}

// ============================================================
// Advanced Schema Creators
// ============================================================

interface ObjectSchemaWithDiscriminator extends AnySchema {
	shape: Record<string, AnySchema>
}

export function discriminatedUnion<
	K extends string,
	T extends readonly ObjectSchemaWithDiscriminator[],
>(discriminator: K, options: T): ZodCompatSchema<DiscriminatedUnionSchema<K, T>> {
	return addZodCompat(zenDiscriminatedUnion(discriminator, options), 'ZodDiscriminatedUnion')
}

export function lazy<T extends AnySchema>(getter: () => T): ZodCompatSchema<LazySchema<T>> {
	return addZodCompat(zenLazy(getter), 'ZodLazy')
}

// ============================================================
// Primitive Types
// ============================================================

export function any(): ZodCompatSchema<BaseSchema<unknown, unknown>> {
	return addZodCompat(zenAny(), 'ZodAny')
}

export function unknown(): ZodCompatSchema<BaseSchema<unknown, unknown>> {
	return addZodCompat(zenUnknown(), 'ZodUnknown')
}

export function null_(): ZodCompatSchema<BaseSchema<null, null>> {
	return addZodCompat(zenNull(), 'ZodNull')
}

export function undefined_(): ZodCompatSchema<BaseSchema<undefined, undefined>> {
	return addZodCompat(zenUndefined(), 'ZodUndefined')
}

export function void_(): ZodCompatSchema<BaseSchema<void, void>> {
	return addZodCompat(zenVoid(), 'ZodVoid')
}

export function never(): ZodCompatSchema<BaseSchema<never, never>> {
	return addZodCompat(zenNever(), 'ZodNever')
}

export function nan(): ZodCompatSchema<BaseSchema<number, number>> {
	return addZodCompat(zenNan(), 'ZodNaN')
}

export function date(): ZodCompatSchema<BaseSchema<Date, Date>> {
	return addZodCompat(zenDate(), 'ZodDate')
}

export function bigint(): ZodCompatSchema<BaseSchema<bigint, bigint>> {
	return addZodCompat(zenBigint(), 'ZodBigInt')
}

export function symbol(): ZodCompatSchema<BaseSchema<symbol, symbol>> {
	return addZodCompat(zenSymbol(), 'ZodSymbol')
}

// ============================================================
// Modifiers
// ============================================================

export function refine<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	check: (data: TOutput) => boolean,
	message?: string | ((data: TOutput) => string)
): ZodCompatSchema<RefinedSchema<TInput, TOutput>> {
	return addZodCompat(zenRefine(schema, check, message), 'ZodEffects')
}

export function transform<TInput, TOutput, TNew>(
	schema: BaseSchema<TInput, TOutput>,
	fn: (data: TOutput) => TNew
): ZodCompatSchema<RefinedSchema<TInput, TNew>> {
	return addZodCompat(zenTransform(schema, fn), 'ZodEffects')
}

export function withDefault<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	defaultValue: TOutput | (() => TOutput)
): ZodCompatSchema<BaseSchema<TInput | undefined, TOutput>> {
	return addZodCompat(zenDefault(schema, defaultValue), 'ZodDefault')
}

export const coerce = {
	string: () => addZodCompat(zenCoerce.string(), 'ZodString'),
	number: () => addZodCompat(zenCoerce.number(), 'ZodNumber'),
	boolean: () => addZodCompat(zenCoerce.boolean(), 'ZodBoolean'),
	date: () => addZodCompat(zenCoerce.date(), 'ZodDate'),
}

// ============================================================
// Exports
// ============================================================

// Re-export types from zen
export type {
	AnySchema,
	BaseSchema,
	Infer,
	Input,
	StringSchema,
	NumberSchema,
	BooleanSchema,
	ObjectSchema,
	ObjectShape,
	ArraySchema,
	TupleSchema,
	RecordSchema,
	UnionSchema,
	DiscriminatedUnionSchema,
	LiteralSchema,
	EnumSchema,
	LazySchema,
	RefinedSchema,
}

// Re-export SchemaError
export { SchemaError }

// Convenience namespace (like zod's `z`)
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
	// Union & literal
	union,
	discriminatedUnion,
	literal,
	enum: enum_,
	// Recursion
	lazy,
	// Modifiers
	refine,
	transform,
	default: withDefault,
	coerce,
} as const

// Default export
export default z
