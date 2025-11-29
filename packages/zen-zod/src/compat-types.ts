// ============================================================
// 🧘 Zen-Zod Compatibility Types
// Type-level compatibility layer for Zen and Zod schemas
// NO runtime dependency on Zod - pure type definitions
// ============================================================

/**
 * Minimal Zod-like schema interface
 * This matches what Zod schemas look like at the type level
 */
export interface ZodLikeSchema<TOutput = unknown, TInput = TOutput> {
	_output: TOutput
	_input: TInput
	parse(data: unknown): TOutput
	safeParse(data: unknown): { success: true; data: TOutput } | { success: false; error: unknown }
}

/**
 * Minimal Zen schema interface
 * This matches what Zen schemas look like at the type level
 */
export interface ZenLikeSchema<TOutput = unknown, TInput = TOutput> {
	_output: TOutput
	_input: TInput
	parse(data: unknown): TOutput
	safeParse(data: unknown): { success: true; data: TOutput } | { success: false; issues: unknown[] }
}

/**
 * Standard Schema V1 interface
 * Both Zen and Zod v4 implement this
 */
export interface StandardSchemaLike<TOutput = unknown, TInput = TOutput> {
	'~standard': {
		version: 1
		vendor: string
		validate(value: unknown): { value: TOutput } | { issues: readonly unknown[] }
	}
}

/**
 * Universal schema type that accepts both Zen and Zod schemas
 * Use this when you want to accept either library's schemas
 *
 * @example
 * ```ts
 * import type { UniversalSchema, InferOutput } from '@sylphx/zen-zod'
 *
 * function validate<T extends UniversalSchema>(schema: T, data: unknown): InferOutput<T> {
 *   return schema.parse(data)
 * }
 *
 * // Works with Zen
 * import { z } from '@sylphx/zen-full'
 * validate(z.string(), "hello")
 *
 * // Works with Zod
 * import { z } from 'zod'
 * validate(z.string(), "hello")
 * ```
 */
export interface UniversalSchema<TOutput = unknown, TInput = TOutput> {
	readonly _output: TOutput
	readonly _input: TInput
	parse(data: unknown): TOutput
	safeParse(data: unknown):
		| { success: true; data: TOutput }
		| { success: false; error?: unknown; issues?: unknown[] }
}

/**
 * Infer output type from any schema (Zen or Zod)
 */
export type InferOutput<T extends { _output: unknown }> = T['_output']

/**
 * Infer input type from any schema (Zen or Zod)
 */
export type InferInput<T extends { _input: unknown }> = T['_input']

/**
 * Alias for InferOutput (matches Zod's z.infer)
 */
export type Infer<T extends { _output: unknown }> = InferOutput<T>

/**
 * Type guard to check if something looks like a schema
 */
export function isSchema(value: unknown): value is UniversalSchema {
	return (
		typeof value === 'object' &&
		value !== null &&
		'parse' in value &&
		'safeParse' in value &&
		typeof (value as UniversalSchema).parse === 'function'
	)
}

/**
 * Type guard for Standard Schema V1 compliance
 */
export function isStandardSchema(value: unknown): value is StandardSchemaLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		'~standard' in value &&
		typeof (value as StandardSchemaLike)['~standard'] === 'object'
	)
}

// ============================================================
// Zod Type Definitions (for type-level compatibility only)
// These mirror Zod's types WITHOUT importing Zod
// ============================================================

/**
 * Zod's ZodType base class shape (type-level only)
 */
export interface ZodTypeShape<TOutput = unknown, TInput = TOutput> {
	_type: TOutput
	_output: TOutput
	_input: TInput
	_def: { typeName: string }
	parse(data: unknown): TOutput
	safeParse(data: unknown): { success: true; data: TOutput } | { success: false; error: unknown }
	parseAsync(data: unknown): Promise<TOutput>
	safeParseAsync(data: unknown): Promise<{ success: true; data: TOutput } | { success: false; error: unknown }>
	optional(): ZodTypeShape<TOutput | undefined, TInput | undefined>
	nullable(): ZodTypeShape<TOutput | null, TInput | null>
	transform<TNew>(fn: (val: TOutput) => TNew): ZodTypeShape<TNew, TInput>
}

/**
 * Type that is compatible with both Zen's BaseSchema and Zod's ZodType
 * Use this for maximum interoperability
 */
export type AnySchemaCompat = UniversalSchema<unknown, unknown>

/**
 * Makes a type compatible with Zod's type system
 * Adds the _type property that Zod uses internally
 */
export type ZodCompatible<T extends UniversalSchema> = T & {
	_type: T['_output']
	_def: { typeName: string }
}
