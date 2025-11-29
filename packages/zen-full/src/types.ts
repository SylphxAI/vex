// ============================================================
// Core Types
// ============================================================

/** Validation issue */
export interface Issue {
	readonly message: string
	readonly path?: ReadonlyArray<PropertyKey>
}

/** Standard Schema issue format */
export type StandardIssue = { message: string; path?: PropertyKey[] }

/** Convert internal Issue to Standard Schema issue format */
export function toStandardIssue(i: Issue): StandardIssue {
	return i.path ? { message: i.message, path: [...i.path] } : { message: i.message }
}

/** Validation result */
export type Result<T> = { success: true; data: T } | { success: false; issues: Issue[] }

/** Check function for validators */
export interface Check<T = unknown> {
	readonly name: string
	readonly check: (value: T) => boolean
	readonly message: string | ((value: T) => string)
}

// ============================================================
// Standard Schema V1 Interface
// https://standardschema.dev/
// ============================================================

export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly '~standard': {
		readonly version: 1
		readonly vendor: string
		readonly validate: (
			value: unknown
		) => { value: Output } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> }
		readonly types?: { input: Input; output: Output }
	}
}

// ============================================================
// Base Schema Interface
// ============================================================

export interface BaseSchema<TInput = unknown, TOutput = TInput>
	extends StandardSchemaV1<TInput, TOutput> {
	/** @internal Type brand for input */
	readonly _input: TInput
	/** @internal Type brand for output */
	readonly _output: TOutput
	/** @internal Validation checks */
	readonly _checks: Check<TInput>[]

	/** Parse and throw on error */
	parse(data: unknown): TOutput
	/** Parse and return Result */
	safeParse(data: unknown): Result<TOutput>
	/** Async parse */
	parseAsync(data: unknown): Promise<TOutput>
	/** Async safe parse */
	safeParseAsync(data: unknown): Promise<Result<TOutput>>
}

/** Any schema type */
// biome-ignore lint/suspicious/noExplicitAny: intentionally any for schema compatibility
export type AnySchema = BaseSchema<any, any>

// ============================================================
// Type Inference Utilities
// ============================================================

/** Infer output type from schema */
export type Infer<T extends BaseSchema<unknown, unknown>> = T['_output']

/** Infer input type from schema */
export type Input<T extends BaseSchema<unknown, unknown>> = T['_input']

/** Standard Schema type inference */
export type InferOutput<T extends StandardSchemaV1> = T['~standard']['types'] extends {
	output: infer O
}
	? O
	: never

export type InferInput<T extends StandardSchemaV1> = T['~standard']['types'] extends {
	input: infer I
}
	? I
	: never
