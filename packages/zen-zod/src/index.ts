// ============================================================
// 🧘 Zen-Zod - Zod compatibility adapter
// ============================================================

import {
	type ArraySchema,
	type BaseSchema,
	type BooleanSchema,
	type Infer,
	type Input,
	type LiteralSchema,
	type NumberSchema,
	type ObjectSchema,
	type ObjectShape,
	SchemaError,
	type StringSchema,
	type UnionSchema,
	array as zenArray,
	boolean as zenBoolean,
	literal as zenLiteral,
	number as zenNumber,
	object as zenObject,
	string as zenString,
	union as zenUnion,
} from '@sylphx/zen'

// ============================================================
// Zod Compatibility Types
// ============================================================

export type ZodTypeName =
	| 'ZodString'
	| 'ZodNumber'
	| 'ZodBoolean'
	| 'ZodObject'
	| 'ZodArray'
	| 'ZodOptional'
	| 'ZodNullable'
	| 'ZodUnion'
	| 'ZodLiteral'
	| 'ZodEnum'
	| 'ZodAny'
	| 'ZodUnknown'

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
// Wrapped Schema Creators
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

export function array<T extends BaseSchema<unknown, unknown>>(
	element: T
): ZodCompatSchema<ArraySchema<T>> {
	return addZodCompat(zenArray(element), 'ZodArray')
}

export function union<T extends readonly BaseSchema<unknown, unknown>[]>(
	options: T
): ZodCompatSchema<UnionSchema<T>> {
	return addZodCompat(zenUnion(options), 'ZodUnion')
}

export function literal<T extends string | number | boolean | null | undefined>(
	value: T
): ZodCompatSchema<LiteralSchema<T>> {
	return addZodCompat(zenLiteral(value), 'ZodLiteral')
}

// ============================================================
// Exports
// ============================================================

// Re-export types from zen
export type {
	BaseSchema,
	Infer,
	Input,
	StringSchema,
	NumberSchema,
	BooleanSchema,
	ObjectSchema,
	ObjectShape,
	ArraySchema,
	UnionSchema,
	LiteralSchema,
}

// Re-export SchemaError
export { SchemaError }

// Convenience namespace (like zod's `z`)
export const z = {
	string,
	number,
	boolean,
	object,
	array,
	union,
	literal,
} as const

// Default export
export default z
