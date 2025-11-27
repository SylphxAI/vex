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

// Schemas
export {
	array,
	boolean,
	literal,
	number,
	object,
	string,
	union,
	type ArraySchema,
	type BooleanSchema,
	type LiteralSchema,
	type NumberSchema,
	type ObjectSchema,
	type ObjectShape,
	type StringSchema,
	type UnionSchema,
} from './schemas'

// Convenience namespace (like zod's `z`)
import { array, boolean, literal, number, object, string, union } from './schemas'

export const z = {
	string,
	number,
	boolean,
	object,
	array,
	union,
	literal,
} as const

// Alias for zen
export const zen = z

// Default export
export default z
