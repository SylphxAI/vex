import { SchemaError } from '../errors'
import type { BaseSchema, Check, Issue, Result } from '../types'

// ============================================================
// Object Schema Types
// ============================================================

type AnySchema = BaseSchema<unknown, unknown>

export type ObjectShape = Record<string, AnySchema>

export type InferObjectInput<T extends ObjectShape> = {
	[K in keyof T]: T[K]['_input']
}

export type InferObjectOutput<T extends ObjectShape> = {
	[K in keyof T]: T[K]['_output']
}

// ============================================================
// Object Schema Interface
// ============================================================

export interface ObjectSchema<T extends ObjectShape>
	extends BaseSchema<InferObjectInput<T>, InferObjectOutput<T>> {
	readonly shape: T
	partial(): ObjectSchema<{
		[K in keyof T]: BaseSchema<T[K]['_input'] | undefined, T[K]['_output'] | undefined>
	}>
	pick<K extends keyof T>(keys: K[]): ObjectSchema<Pick<T, K>>
	omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>>
	extend<E extends ObjectShape>(extension: E): ObjectSchema<T & E>
	merge<E extends ObjectShape>(other: ObjectSchema<E>): ObjectSchema<T & E>
	passthrough(): ObjectSchema<T>
	strict(): ObjectSchema<T>
	optional(): BaseSchema<InferObjectInput<T> | undefined, InferObjectOutput<T> | undefined>
	nullable(): BaseSchema<InferObjectInput<T> | null, InferObjectOutput<T> | null>
}

// ============================================================
// Implementation
// ============================================================

function createObjectSchema<T extends ObjectShape>(
	shape: T,
	options: { passthrough?: boolean; strict?: boolean } = {}
): ObjectSchema<T> {
	type TInput = InferObjectInput<T>
	type TOutput = InferObjectOutput<T>

	const isObject = (v: unknown): v is TInput =>
		typeof v === 'object' && v !== null && !Array.isArray(v)

	const schema: ObjectSchema<T> = {
		// Type brands
		_input: undefined as TInput,
		_output: undefined as TOutput,
		_checks: [],
		shape,

		// Zod compat
		_def: { typeName: 'ZodObject' },
		_zod: { def: { typeName: 'ZodObject' } },

		// Standard Schema
		'~standard': {
			version: 1,
			vendor: 'pico-schema',
			validate(value: unknown) {
				const result = schema.safeParse(value)
				if (result.success) {
					return { value: result.data }
				}
				return {
					issues: result.issues.map((i) => ({
						message: i.message,
						path: i.path ? [...i.path] : undefined,
					})),
				}
			},
			types: undefined as unknown as { input: TInput; output: TOutput },
		},

		parse(data: unknown): TOutput {
			const result = this.safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse(data: unknown): Result<TOutput> {
			if (!isObject(data)) {
				return { success: false, issues: [{ message: 'Expected object' }] }
			}

			const issues: Issue[] = []
			const output: Record<string, unknown> = {}

			// Validate each field in shape
			for (const [key, fieldSchema] of Object.entries(shape)) {
				const value = (data as Record<string, unknown>)[key]
				const result = fieldSchema.safeParse(value)

				if (result.success) {
					output[key] = result.data
				} else {
					for (const issue of result.issues) {
						issues.push({
							message: issue.message,
							path: [key, ...(issue.path ?? [])],
						})
					}
				}
			}

			// Check for extra keys in strict mode
			if (options.strict) {
				const shapeKeys = new Set(Object.keys(shape))
				for (const key of Object.keys(data as object)) {
					if (!shapeKeys.has(key)) {
						issues.push({
							message: `Unexpected property "${key}"`,
							path: [key],
						})
					}
				}
			}

			// Passthrough extra keys
			if (options.passthrough) {
				for (const [key, value] of Object.entries(data as object)) {
					if (!(key in shape)) {
						output[key] = value
					}
				}
			}

			if (issues.length > 0) {
				return { success: false, issues }
			}

			return { success: true, data: output as TOutput }
		},

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return this.safeParse(data)
		},

		partial() {
			const partialShape = {} as Record<string, AnySchema>
			for (const [key, fieldSchema] of Object.entries(shape)) {
				// Create optional version
				partialShape[key] = {
					...fieldSchema,
					_input: undefined,
					_output: undefined,
					safeParse(data: unknown) {
						if (data === undefined) {
							return { success: true, data: undefined }
						}
						return fieldSchema.safeParse(data)
					},
					parse(data: unknown) {
						if (data === undefined) return undefined
						return fieldSchema.parse(data)
					},
				} as AnySchema
			}
			return createObjectSchema(partialShape, options) as unknown as ObjectSchema<{
				[K in keyof T]: BaseSchema<T[K]['_input'] | undefined, T[K]['_output'] | undefined>
			}>
		},

		pick<K extends keyof T>(keys: K[]): ObjectSchema<Pick<T, K>> {
			const pickedShape = {} as Pick<T, K>
			for (const key of keys) {
				if (key in shape) {
					pickedShape[key] = shape[key]
				}
			}
			return createObjectSchema(pickedShape, options)
		},

		omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>> {
			const omitSet = new Set<PropertyKey>(keys)
			const omittedShape = {} as Omit<T, K>
			for (const [key, value] of Object.entries(shape)) {
				if (!omitSet.has(key)) {
					;(omittedShape as Record<string, AnySchema>)[key] = value
				}
			}
			return createObjectSchema(omittedShape, options)
		},

		extend<E extends ObjectShape>(extension: E): ObjectSchema<T & E> {
			return createObjectSchema({ ...shape, ...extension }, options)
		},

		merge<E extends ObjectShape>(other: ObjectSchema<E>): ObjectSchema<T & E> {
			return createObjectSchema({ ...shape, ...other.shape }, options)
		},

		passthrough() {
			return createObjectSchema(shape, { ...options, passthrough: true })
		},

		strict() {
			return createObjectSchema(shape, { ...options, strict: true })
		},

		optional() {
			return {
				_input: undefined as TInput | undefined,
				_output: undefined as TOutput | undefined,
				_checks: [],
				_def: { typeName: 'ZodOptional' as const },
				_zod: { def: { typeName: 'ZodOptional' as const } },
				'~standard': {
					version: 1 as const,
					vendor: 'pico-schema',
					validate: (v: unknown) => {
						const result =
							v === undefined
								? ({ success: true, data: undefined } as Result<TOutput | undefined>)
								: schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues }
					},
					types: undefined as unknown as {
						input: TInput | undefined
						output: TOutput | undefined
					},
				},
				parse: (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParse: (v: unknown): Result<TOutput | undefined> =>
					v === undefined ? { success: true, data: undefined } : schema.safeParse(v),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TOutput | undefined>> =>
					v === undefined ? { success: true, data: undefined } : schema.safeParse(v),
			}
		},

		nullable() {
			return {
				_input: undefined as TInput | null,
				_output: undefined as TOutput | null,
				_checks: [],
				_def: { typeName: 'ZodNullable' as const },
				_zod: { def: { typeName: 'ZodNullable' as const } },
				'~standard': {
					version: 1 as const,
					vendor: 'pico-schema',
					validate: (v: unknown) => {
						const result =
							v === null
								? ({ success: true, data: null } as Result<TOutput | null>)
								: schema.safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues }
					},
					types: undefined as unknown as { input: TInput | null; output: TOutput | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown): Result<TOutput | null> =>
					v === null ? { success: true, data: null } : schema.safeParse(v),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TOutput | null>> =>
					v === null ? { success: true, data: null } : schema.safeParse(v),
			}
		},
	}

	return schema
}

/**
 * Create an object schema
 */
export function object<T extends ObjectShape>(shape: T): ObjectSchema<T> {
	return createObjectSchema(shape)
}
