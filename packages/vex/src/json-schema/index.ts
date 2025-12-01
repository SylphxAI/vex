// ============================================================
// JSON Schema Conversion
// ============================================================

import type { Parser } from '../core'
import { getMeta, type Metadata } from '../core'

// ============================================================
// JSON Schema Types
// ============================================================

/** JSON Schema draft-07 types */
export interface JsonSchema {
	$schema?: string
	$ref?: string
	$defs?: Record<string, JsonSchema>
	type?: JsonSchemaType | JsonSchemaType[]
	const?: unknown
	enum?: unknown[]
	// String
	minLength?: number
	maxLength?: number
	pattern?: string
	format?: string
	// Number
	minimum?: number
	maximum?: number
	exclusiveMinimum?: number
	exclusiveMaximum?: number
	multipleOf?: number
	// Array
	items?: JsonSchema | JsonSchema[]
	minItems?: number
	maxItems?: number
	uniqueItems?: boolean
	contains?: JsonSchema
	// Object
	properties?: Record<string, JsonSchema>
	required?: string[]
	additionalProperties?: boolean | JsonSchema
	propertyNames?: JsonSchema
	minProperties?: number
	maxProperties?: number
	patternProperties?: Record<string, JsonSchema>
	// Composition
	allOf?: JsonSchema[]
	anyOf?: JsonSchema[]
	oneOf?: JsonSchema[]
	not?: JsonSchema
	if?: JsonSchema
	then?: JsonSchema
	else?: JsonSchema
	// Metadata (documentation)
	title?: string
	description?: string
	default?: unknown
	examples?: unknown[]
	deprecated?: boolean
	readOnly?: boolean
	writeOnly?: boolean
}

type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'null' | 'array' | 'object'

// ============================================================
// toJsonSchema Options
// ============================================================

export interface ToJsonSchemaOptions {
	/** Include $schema property (default: true) */
	$schema?: boolean
	/** JSON Schema draft version (default: 'draft-07') */
	draft?: 'draft-07' | 'draft-2019-09' | 'draft-2020-12'
	/** Named definitions to include */
	definitions?: Record<string, Parser<unknown>>
	/** Type mode: 'input' or 'output' (default: 'input') */
	typeMode?: 'input' | 'output'
}

// ============================================================
// toJsonSchema Implementation
// ============================================================

/**
 * Convert a Vex schema to JSON Schema
 *
 * @example
 * const schema = pipe(str(), email)
 * toJsonSchema(schema) // { type: "string", format: "email" }
 *
 * @example
 * const userSchema = object({ name: str(), age: num() })
 * toJsonSchema(userSchema)
 * // {
 * //   type: "object",
 * //   properties: { name: { type: "string" }, age: { type: "number" } },
 * //   required: ["name", "age"]
 * // }
 */
export function toJsonSchema(
	schema: Parser<unknown>,
	options: ToJsonSchemaOptions = {},
): JsonSchema {
	const { $schema: includeSchema = true, draft = 'draft-07', definitions } = options

	const result = convertSchema(schema)

	// Add $schema if requested
	if (includeSchema) {
		const schemaUrl = getSchemaUrl(draft)
		result.$schema = schemaUrl
	}

	// Add definitions if provided
	if (definitions && Object.keys(definitions).length > 0) {
		result.$defs = {}
		for (const [name, def] of Object.entries(definitions)) {
			result.$defs[name] = convertSchema(def)
		}
	}

	return result
}

/**
 * Convert only definitions without a root schema
 */
export function toJsonSchemaDefs(
	definitions: Record<string, Parser<unknown>>,
): Record<string, JsonSchema> {
	const result: Record<string, JsonSchema> = {}
	for (const [name, schema] of Object.entries(definitions)) {
		result[name] = convertSchema(schema)
	}
	return result
}

// ============================================================
// Global Definitions
// ============================================================

let globalDefs: Record<string, Parser<unknown>> | null = null

/**
 * Add global schema definitions
 */
export function addGlobalDefs(defs: Record<string, Parser<unknown>>): void {
	globalDefs = { ...globalDefs, ...defs }
}

/**
 * Get global schema definitions
 */
export function getGlobalDefs(): Record<string, Parser<unknown>> | null {
	return globalDefs
}

/**
 * Clear global schema definitions
 */
export function clearGlobalDefs(): void {
	globalDefs = null
}

// ============================================================
// Internal Conversion Logic
// ============================================================

function getSchemaUrl(draft: string): string {
	switch (draft) {
		case 'draft-2020-12':
			return 'https://json-schema.org/draft/2020-12/schema'
		case 'draft-2019-09':
			return 'https://json-schema.org/draft/2019-09/schema'
		default:
			return 'http://json-schema.org/draft-07/schema#'
	}
}

function convertSchema(schema: Parser<unknown>): JsonSchema {
	const meta = getMeta(schema)

	if (!meta) {
		// Try to infer from function name or return empty schema
		return inferSchema(schema)
	}

	const result = convertByType(meta)

	// Add documentation metadata
	if (meta.description !== undefined) result.description = meta.description
	if (meta.title !== undefined) result.title = meta.title
	if (meta.examples !== undefined) result.examples = meta.examples
	if (meta.default !== undefined) result.default = meta.default
	if (meta.deprecated !== undefined) result.deprecated = meta.deprecated
	if (meta.readonly !== undefined) result.readOnly = meta.readonly

	return result
}

function convertByType(meta: Metadata): JsonSchema {
	const { type, constraints = {}, inner } = meta

	switch (type) {
		// Primitives
		case 'string':
			return convertString(constraints)
		case 'number':
			return convertNumber(constraints)
		case 'integer': {
			const numSchema = convertNumber(constraints)
			numSchema.type = 'integer'
			return numSchema
		}
		case 'boolean':
			return { type: 'boolean' }
		case 'null':
			return { type: 'null' }
		case 'bigint':
			return { type: 'integer' }
		case 'date':
			return { type: 'string', format: 'date-time' }
		case 'any':
		case 'unknown':
			return {}
		case 'never':
			return { not: {} }
		case 'void':
		case 'undefined':
			return { type: 'null' }

		// Complex types
		case 'array':
			return convertArray(constraints, inner as Parser<unknown> | undefined)
		case 'object':
			return convertObject(constraints, inner as Record<string, Parser<unknown>> | undefined)
		case 'tuple':
			return convertTuple(constraints, inner as Parser<unknown>[] | undefined)
		case 'record':
			return convertRecord(constraints, inner as Parser<unknown> | undefined)
		case 'map':
			return convertMap(constraints)
		case 'set':
			return convertSet(constraints, inner as Parser<unknown> | undefined)

		// Composition
		case 'union':
			return convertUnion(inner as Parser<unknown>[] | undefined)
		case 'intersect':
			return convertIntersect(inner as Parser<unknown>[] | undefined)
		case 'literal':
			return convertLiteral(constraints)
		case 'enum':
			return convertEnum(constraints)
		case 'optional':
			return convertOptional(inner as Parser<unknown> | undefined)
		case 'nullable':
			return convertNullable(inner as Parser<unknown> | undefined)
		case 'lazy':
			return convertLazy(inner as Parser<unknown> | undefined)

		// Pipe (just return inner schema with constraints applied)
		case 'pipe':
			return convertPipe(constraints, inner as Parser<unknown>[] | undefined)

		default:
			return {}
	}
}

function convertString(constraints: Record<string, unknown>): JsonSchema {
	const result: JsonSchema = { type: 'string' }

	if (constraints['minLength'] !== undefined) result.minLength = constraints['minLength'] as number
	if (constraints['maxLength'] !== undefined) result.maxLength = constraints['maxLength'] as number
	if (constraints['length'] !== undefined) {
		result.minLength = constraints['length'] as number
		result.maxLength = constraints['length'] as number
	}
	if (constraints['pattern'] !== undefined) result.pattern = constraints['pattern'] as string
	if (constraints['format'] !== undefined) result.format = constraints['format'] as string

	return result
}

function convertNumber(constraints: Record<string, unknown>): JsonSchema {
	const result: JsonSchema = { type: 'number' }

	if (constraints['minimum'] !== undefined) result.minimum = constraints['minimum'] as number
	if (constraints['maximum'] !== undefined) result.maximum = constraints['maximum'] as number
	if (constraints['exclusiveMinimum'] !== undefined)
		result.exclusiveMinimum = constraints['exclusiveMinimum'] as number
	if (constraints['exclusiveMaximum'] !== undefined)
		result.exclusiveMaximum = constraints['exclusiveMaximum'] as number
	if (constraints['multipleOf'] !== undefined)
		result.multipleOf = constraints['multipleOf'] as number
	if (constraints['integer']) result.type = 'integer'

	return result
}

function convertArray(constraints: Record<string, unknown>, items?: Parser<unknown>): JsonSchema {
	const result: JsonSchema = { type: 'array' }

	if (items) {
		result.items = convertSchema(items)
	}

	if (constraints['minItems'] !== undefined) result.minItems = constraints['minItems'] as number
	if (constraints['maxItems'] !== undefined) result.maxItems = constraints['maxItems'] as number
	if (constraints['length'] !== undefined) {
		result.minItems = constraints['length'] as number
		result.maxItems = constraints['length'] as number
	}
	if (constraints['uniqueItems'] !== undefined)
		result.uniqueItems = constraints['uniqueItems'] as boolean

	return result
}

function convertObject(
	constraints: Record<string, unknown>,
	shape?: Record<string, Parser<unknown>>,
): JsonSchema {
	const result: JsonSchema = { type: 'object' }

	if (shape) {
		result.properties = {}
		const required: string[] = []

		for (const [key, validator] of Object.entries(shape)) {
			const propMeta = getMeta(validator)
			result.properties[key] = convertSchema(validator)

			// Check if property is optional
			if (propMeta?.type !== 'optional') {
				required.push(key)
			}
		}

		if (required.length > 0) {
			result.required = required
		}
	}

	if (constraints['additionalProperties'] !== undefined) {
		result.additionalProperties = constraints['additionalProperties'] as boolean
	}

	if (constraints['minProperties'] !== undefined)
		result.minProperties = constraints['minProperties'] as number
	if (constraints['maxProperties'] !== undefined)
		result.maxProperties = constraints['maxProperties'] as number

	return result
}

function convertTuple(
	_constraints: Record<string, unknown>,
	items?: Parser<unknown>[],
): JsonSchema {
	const result: JsonSchema = { type: 'array' }

	if (items) {
		result.items = items.map(convertSchema)
		result.minItems = items.length
		result.maxItems = items.length
	}

	return result
}

function convertRecord(
	_constraints: Record<string, unknown>,
	inner?: Parser<unknown> | { key?: Parser<unknown>; value?: Parser<unknown> },
): JsonSchema {
	const result: JsonSchema = { type: 'object' }

	if (inner) {
		// Handle both single parser (legacy) and { key, value } structure
		const valueSchema =
			typeof inner === 'object' && 'value' in inner
				? (inner as { value?: Parser<unknown> }).value
				: inner
		if (valueSchema && typeof valueSchema === 'function') {
			result.additionalProperties = convertSchema(valueSchema as Parser<unknown>)
		}
	}

	return result
}

function convertMap(_constraints: Record<string, unknown>): JsonSchema {
	// Map is not directly representable in JSON Schema
	// We represent it as an object
	return { type: 'object' }
}

function convertSet(constraints: Record<string, unknown>, items?: Parser<unknown>): JsonSchema {
	const result: JsonSchema = { type: 'array', uniqueItems: true }

	if (items) {
		result.items = convertSchema(items)
	}

	if (constraints['minSize'] !== undefined) result.minItems = constraints['minSize'] as number
	if (constraints['maxSize'] !== undefined) result.maxItems = constraints['maxSize'] as number

	return result
}

function convertUnion(options?: Parser<unknown>[]): JsonSchema {
	if (!options || options.length === 0) return {}

	return {
		anyOf: options.map(convertSchema),
	}
}

function convertIntersect(schemas?: Parser<unknown>[]): JsonSchema {
	if (!schemas || schemas.length === 0) return {}

	return {
		allOf: schemas.map(convertSchema),
	}
}

function convertLiteral(constraints: Record<string, unknown>): JsonSchema {
	if (constraints['value'] !== undefined) {
		return { const: constraints['value'] }
	}
	return {}
}

function convertEnum(constraints: Record<string, unknown>): JsonSchema {
	if (constraints['values'] !== undefined) {
		return { enum: constraints['values'] as unknown[] }
	}
	return {}
}

function convertOptional(inner?: Parser<unknown>): JsonSchema {
	if (!inner) return {}
	return convertSchema(inner)
}

function convertNullable(inner?: Parser<unknown>): JsonSchema {
	if (!inner) return { type: 'null' }

	const innerSchema = convertSchema(inner)

	// Merge with null type
	if (innerSchema.type) {
		if (Array.isArray(innerSchema.type)) {
			return { ...innerSchema, type: [...innerSchema.type, 'null'] }
		}
		return { ...innerSchema, type: [innerSchema.type, 'null'] }
	}

	return { anyOf: [innerSchema, { type: 'null' }] }
}

function convertLazy(inner?: Parser<unknown>): JsonSchema {
	// For lazy schemas, we need to evaluate them
	if (!inner) return {}
	return convertSchema(inner)
}

function convertPipe(
	_constraints: Record<string, unknown>,
	schemas?: Parser<unknown>[],
): JsonSchema {
	if (!schemas || schemas.length === 0) return {}

	// Start with the base schema
	const first = schemas[0]!
	let result = convertSchema(first)

	// Apply constraints from subsequent validators
	for (let i = 1; i < schemas.length; i++) {
		const meta = getMeta(schemas[i])
		if (meta?.constraints) {
			result = { ...result, ...convertConstraints(meta.type, meta.constraints) }
		}
	}

	return result
}

function convertConstraints(type: string, constraints: Record<string, unknown>): JsonSchema {
	switch (type) {
		case 'min':
		case 'minLength':
			return { minLength: constraints['value'] as number }
		case 'max':
		case 'maxLength':
			return { maxLength: constraints['value'] as number }
		case 'length':
			return {
				minLength: constraints['value'] as number,
				maxLength: constraints['value'] as number,
			}
		case 'email':
			return { format: 'email' }
		case 'url':
			return { format: 'uri' }
		case 'uuid':
			return { format: 'uuid' }
		case 'datetime':
		case 'isoDateTime':
			return { format: 'date-time' }
		case 'date':
		case 'isoDate':
			return { format: 'date' }
		case 'time':
		case 'isoTime':
			return { format: 'time' }
		case 'ipv4':
			return { format: 'ipv4' }
		case 'ipv6':
			return { format: 'ipv6' }
		case 'regex':
		case 'pattern':
			return { pattern: constraints['pattern'] as string }
		case 'gte':
		case 'minimum':
			return { minimum: constraints['value'] as number }
		case 'gt':
		case 'exclusiveMinimum':
			return { exclusiveMinimum: constraints['value'] as number }
		case 'lte':
		case 'maximum':
			return { maximum: constraints['value'] as number }
		case 'lt':
		case 'exclusiveMaximum':
			return { exclusiveMaximum: constraints['value'] as number }
		case 'multipleOf':
			return { multipleOf: constraints['value'] as number }
		case 'integer':
		case 'int':
			return { type: 'integer' }
		case 'positive':
			return { exclusiveMinimum: 0 }
		case 'negative':
			return { exclusiveMaximum: 0 }
		case 'nonnegative':
			return { minimum: 0 }
		case 'nonpositive':
			return { maximum: 0 }
		default:
			return {}
	}
}

function inferSchema(schema: Parser<unknown>): JsonSchema {
	// Try to infer from function name or toString
	const fnStr = schema.toString()

	if (fnStr.includes('string')) return { type: 'string' }
	if (fnStr.includes('number')) return { type: 'number' }
	if (fnStr.includes('boolean')) return { type: 'boolean' }
	if (fnStr.includes('null')) return { type: 'null' }
	if (fnStr.includes('array') || fnStr.includes('Array')) return { type: 'array' }
	if (fnStr.includes('object')) return { type: 'object' }

	return {}
}
