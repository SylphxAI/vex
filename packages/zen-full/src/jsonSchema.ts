import type { AnySchema, BaseSchema } from './types'

// ============================================================
// JSON Schema Conversion
// ============================================================

export interface JSONSchemaOptions {
	/** JSON Schema version target */
	target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0'
	/** How to handle unrepresentable types */
	unrepresentable?: 'throw' | 'any'
	/** Target input or output type */
	io?: 'input' | 'output'
}

export type JSONSchemaType =
	| { type: 'string'; format?: string; minLength?: number; maxLength?: number; pattern?: string; enum?: string[] }
	| { type: 'number'; minimum?: number; maximum?: number; exclusiveMinimum?: number; exclusiveMaximum?: number; multipleOf?: number }
	| { type: 'integer'; minimum?: number; maximum?: number; multipleOf?: number }
	| { type: 'boolean' }
	| { type: 'null' }
	| { type: 'array'; items?: JSONSchemaType; minItems?: number; maxItems?: number; prefixItems?: JSONSchemaType[] }
	| { type: 'object'; properties?: Record<string, JSONSchemaType>; required?: string[]; additionalProperties?: boolean | JSONSchemaType }
	| { anyOf: JSONSchemaType[] }
	| { oneOf: JSONSchemaType[] }
	| { allOf: JSONSchemaType[] }
	| { const: unknown }
	| { enum: unknown[] }
	| Record<string, unknown> // For extensibility

// Type detection helpers
function hasProperty<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
	return typeof obj === 'object' && obj !== null && key in obj
}

function getSchemaType(schema: AnySchema): string | null {
	// Check for shape (object)
	if (hasProperty(schema, 'shape')) return 'object'
	// Check for options (union/enum)
	if (hasProperty(schema, 'options')) {
		// Enum has string options, union has schema options
		const opts = schema.options as unknown[]
		if (opts.length > 0 && typeof opts[0] === 'string') return 'enum'
		return 'union'
	}
	// Check for items (array)
	if (hasProperty(schema, 'items')) return 'array'
	// Check for element (array schema)
	if (hasProperty(schema, 'element')) return 'array'
	// Check for keySchema (record/map)
	if (hasProperty(schema, 'keySchema')) return 'record'
	// Check for valueSchema (set)
	if (hasProperty(schema, 'valueSchema') && !hasProperty(schema, 'keySchema')) return 'set'
	// Try to infer from _checks
	if (hasProperty(schema, '_checks')) {
		const checks = schema._checks as Array<{ name?: string }>
		for (const check of checks) {
			if (check.name === 'string') return 'string'
			if (check.name === 'number') return 'number'
			if (check.name === 'boolean') return 'boolean'
			if (check.name === 'bigint') return 'bigint'
			if (check.name === 'date') return 'date'
		}
	}
	// Try to parse a sample value to detect type
	const testResult = schema.safeParse('')
	if (testResult.success) return 'string'
	const numResult = schema.safeParse(0)
	if (numResult.success) return 'number'
	const boolResult = schema.safeParse(true)
	if (boolResult.success) return 'boolean'
	const nullResult = schema.safeParse(null)
	if (nullResult.success) return 'null'
	const undefinedResult = schema.safeParse(undefined)
	if (undefinedResult.success) return 'undefined'

	return null
}

/**
 * Convert a Zen schema to JSON Schema
 */
export function toJSONSchema(
	schema: AnySchema,
	options: JSONSchemaOptions = {}
): JSONSchemaType {
	const { unrepresentable = 'throw' } = options

	const handleUnrepresentable = (typeName: string): JSONSchemaType => {
		if (unrepresentable === 'throw') {
			throw new Error(`Cannot convert ${typeName} to JSON Schema`)
		}
		return {} // Any type
	}

	// Object schema
	if (hasProperty(schema, 'shape')) {
		const shape = schema.shape as Record<string, AnySchema>
		const properties: Record<string, JSONSchemaType> = {}
		const required: string[] = []

		for (const [key, fieldSchema] of Object.entries(shape)) {
			properties[key] = toJSONSchema(fieldSchema, options)
			// Check if optional
			const optResult = fieldSchema.safeParse(undefined)
			if (!optResult.success) {
				required.push(key)
			}
		}

		return {
			type: 'object',
			properties,
			required: required.length > 0 ? required : undefined,
			additionalProperties: false,
		} as JSONSchemaType
	}

	// Array schema
	if (hasProperty(schema, 'element')) {
		const element = schema.element as AnySchema
		const result: JSONSchemaType = {
			type: 'array',
			items: toJSONSchema(element, options),
		}
		// Check for min/max from _checks
		if (hasProperty(schema, '_checks')) {
			const checks = schema._checks as Array<{ name: string; value?: number }>
			for (const check of checks) {
				if (check.name === 'min' && check.value !== undefined) {
					;(result as Record<string, unknown>).minItems = check.value
				}
				if (check.name === 'max' && check.value !== undefined) {
					;(result as Record<string, unknown>).maxItems = check.value
				}
			}
		}
		return result
	}

	// Tuple schema
	if (hasProperty(schema, 'items') && Array.isArray(schema.items)) {
		const items = schema.items as AnySchema[]
		return {
			type: 'array',
			prefixItems: items.map((item) => toJSONSchema(item, options)),
			minItems: items.length,
			maxItems: items.length,
		} as JSONSchemaType
	}

	// Enum schema
	if (hasProperty(schema, 'options') && hasProperty(schema, 'enum')) {
		const opts = schema.options as string[]
		return { enum: opts } as JSONSchemaType
	}

	// Union schema
	if (hasProperty(schema, 'options') && Array.isArray(schema.options)) {
		const opts = schema.options as AnySchema[]
		// Check if it's a discriminated union
		if (hasProperty(schema, 'discriminator')) {
			return {
				oneOf: opts.map((opt) => toJSONSchema(opt, options)),
			} as JSONSchemaType
		}
		return {
			anyOf: opts.map((opt) => toJSONSchema(opt, options)),
		} as JSONSchemaType
	}

	// Literal schema
	if (hasProperty(schema, 'value')) {
		return { const: schema.value } as JSONSchemaType
	}

	// Record schema
	if (hasProperty(schema, 'keySchema') && hasProperty(schema, 'valueSchema')) {
		const valueSchema = schema.valueSchema as AnySchema
		return {
			type: 'object',
			additionalProperties: toJSONSchema(valueSchema, options),
		} as JSONSchemaType
	}

	// Try to detect primitive types by testing
	const schemaType = getSchemaType(schema)

	switch (schemaType) {
		case 'string': {
			const result: JSONSchemaType = { type: 'string' }
			// Try to extract format from _checks
			if (hasProperty(schema, '_checks')) {
				const checks = schema._checks as Array<{ name: string; value?: unknown; message?: string }>
				for (const check of checks) {
					if (check.name === 'email') (result as Record<string, unknown>).format = 'email'
					if (check.name === 'uuid') (result as Record<string, unknown>).format = 'uuid'
					if (check.name === 'url') (result as Record<string, unknown>).format = 'uri'
					if (check.name === 'datetime') (result as Record<string, unknown>).format = 'date-time'
					if (check.name === 'date') (result as Record<string, unknown>).format = 'date'
					if (check.name === 'time') (result as Record<string, unknown>).format = 'time'
					if (check.name === 'ipv4') (result as Record<string, unknown>).format = 'ipv4'
					if (check.name === 'ipv6') (result as Record<string, unknown>).format = 'ipv6'
					if (check.name === 'min' && typeof check.value === 'number') {
						;(result as Record<string, unknown>).minLength = check.value
					}
					if (check.name === 'max' && typeof check.value === 'number') {
						;(result as Record<string, unknown>).maxLength = check.value
					}
					if (check.name === 'regex' && check.value instanceof RegExp) {
						;(result as Record<string, unknown>).pattern = check.value.source
					}
				}
			}
			return result
		}
		case 'number': {
			const result: JSONSchemaType = { type: 'number' }
			if (hasProperty(schema, '_checks')) {
				const checks = schema._checks as Array<{ name: string; value?: number }>
				for (const check of checks) {
					if (check.name === 'int') (result as Record<string, unknown>).type = 'integer'
					if (check.name === 'min' && check.value !== undefined) {
						;(result as Record<string, unknown>).minimum = check.value
					}
					if (check.name === 'max' && check.value !== undefined) {
						;(result as Record<string, unknown>).maximum = check.value
					}
					if (check.name === 'gt' && check.value !== undefined) {
						;(result as Record<string, unknown>).exclusiveMinimum = check.value
					}
					if (check.name === 'lt' && check.value !== undefined) {
						;(result as Record<string, unknown>).exclusiveMaximum = check.value
					}
					if (check.name === 'multipleOf' && check.value !== undefined) {
						;(result as Record<string, unknown>).multipleOf = check.value
					}
				}
			}
			return result
		}
		case 'boolean':
			return { type: 'boolean' }
		case 'null':
			return { type: 'null' }
		case 'undefined':
			// JSON Schema doesn't have undefined, treat as nullable
			return handleUnrepresentable('undefined')
		case 'bigint':
			return handleUnrepresentable('bigint')
		case 'date':
			// Represent as string with date-time format
			return { type: 'string', format: 'date-time' } as JSONSchemaType
		case 'set':
			return handleUnrepresentable('Set')
		default:
			// Unknown type - return empty schema (any)
			return {}
	}
}
