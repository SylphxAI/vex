import type { AnySchema } from './types'

// ============================================================
// Global Schema Registry
// ============================================================

export interface SchemaRegistry {
	/** Register a schema with a name */
	register<T extends AnySchema>(name: string, schema: T): T
	/** Get a schema by name */
	get(name: string): AnySchema | undefined
	/** Check if a schema is registered */
	has(name: string): boolean
	/** Get all registered schema names */
	names(): string[]
	/** Clear all registered schemas */
	clear(): void
	/** Get the name of a registered schema */
	nameOf(schema: AnySchema): string | undefined
}

function createRegistry(): SchemaRegistry {
	const schemas = new Map<string, AnySchema>()
	const nameMap = new WeakMap<AnySchema, string>()

	return {
		register<T extends AnySchema>(name: string, schema: T): T {
			schemas.set(name, schema)
			nameMap.set(schema, name)
			return schema
		},

		get(name: string): AnySchema | undefined {
			return schemas.get(name)
		},

		has(name: string): boolean {
			return schemas.has(name)
		},

		names(): string[] {
			return Array.from(schemas.keys())
		},

		clear(): void {
			schemas.clear()
		},

		nameOf(schema: AnySchema): string | undefined {
			return nameMap.get(schema)
		},
	}
}

/** Global schema registry for managing and retrieving schemas by name */
export const globalRegistry = createRegistry()
