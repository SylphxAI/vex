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

	// Pre-compute keys and entries for faster iteration
	const shapeKeys = Object.keys(shape)
	const shapeEntries: [string, AnySchema][] = shapeKeys.map((k) => [k, shape[k]])
	const shapeKeySet = options.strict ? new Set(shapeKeys) : null

	const isObject = (v: unknown): v is TInput =>
		typeof v === 'object' && v !== null && !Array.isArray(v)

	// Optimized safeParse - avoid unnecessary allocations
	const safeParse = (data: unknown): Result<TOutput> => {
		if (!isObject(data)) {
			return { success: false, issues: [{ message: 'Expected object' }] }
		}

		const input = data as Record<string, unknown>
		let issues: Issue[] | null = null
		let output: Record<string, unknown> | null = null
		let hasTransform = false

		// Validate each field in shape
		for (let i = 0; i < shapeEntries.length; i++) {
			const [key, fieldSchema] = shapeEntries[i]
			const value = input[key]
			const result = fieldSchema.safeParse(value)

			if (result.success) {
				// Only create output if value changed (transform) or we already have issues
				if (result.data !== value || hasTransform) {
					if (!output) {
						output = {}
						// Copy already processed values
						for (let j = 0; j < i; j++) {
							output[shapeEntries[j][0]] = input[shapeEntries[j][0]]
						}
					}
					output[key] = result.data
					hasTransform = true
				} else if (output) {
					output[key] = result.data
				}
			} else {
				if (!issues) issues = []
				for (const issue of result.issues) {
					issues.push({
						message: issue.message,
						path: [key, ...(issue.path ?? [])],
					})
				}
			}
		}

		// Check for extra keys in strict mode
		if (shapeKeySet) {
			const inputKeys = Object.keys(input)
			for (let i = 0; i < inputKeys.length; i++) {
				const key = inputKeys[i]
				if (!shapeKeySet.has(key)) {
					if (!issues) issues = []
					issues.push({
						message: `Unexpected property "${key}"`,
						path: [key],
					})
				}
			}
		}

		// Passthrough extra keys
		if (options.passthrough) {
			const inputKeys = Object.keys(input)
			for (let i = 0; i < inputKeys.length; i++) {
				const key = inputKeys[i]
				if (!(key in shape)) {
					if (!output) {
						output = { ...input }
					} else {
						output[key] = input[key]
					}
				}
			}
		}

		if (issues) {
			return { success: false, issues }
		}

		// Return original object if no transforms, else return new object
		return { success: true, data: (output ?? input) as TOutput }
	}

	const schema: ObjectSchema<T> = {
		// Type brands
		_input: undefined as TInput,
		_output: undefined as TOutput,
		_checks: [],
		shape,

		// Standard Schema
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown) {
				const result = safeParse(value)
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
			const result = safeParse(data)
			if (result.success) return result.data
			throw new SchemaError(result.issues)
		},

		safeParse,

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return safeParse(data)
		},

		partial() {
			const partialShape = {} as Record<string, AnySchema>
			for (let i = 0; i < shapeKeys.length; i++) {
				const key = shapeKeys[i]
				const fieldSchema = shape[key]
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
			for (const key of shapeKeys) {
				if (!omitSet.has(key)) {
					;(omittedShape as Record<string, AnySchema>)[key] = shape[key]
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
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						const result =
							v === undefined
								? ({ success: true, data: undefined } as Result<TOutput | undefined>)
								: safeParse(v)
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
					v === undefined ? { success: true, data: undefined } : safeParse(v),
				parseAsync: async (v: unknown) => (v === undefined ? undefined : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TOutput | undefined>> =>
					v === undefined ? { success: true, data: undefined } : safeParse(v),
			}
		},

		nullable() {
			return {
				_input: undefined as TInput | null,
				_output: undefined as TOutput | null,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						const result =
							v === null
								? ({ success: true, data: null } as Result<TOutput | null>)
								: safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues }
					},
					types: undefined as unknown as { input: TInput | null; output: TOutput | null },
				},
				parse: (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParse: (v: unknown): Result<TOutput | null> =>
					v === null ? { success: true, data: null } : safeParse(v),
				parseAsync: async (v: unknown) => (v === null ? null : schema.parse(v)),
				safeParseAsync: async (v: unknown): Promise<Result<TOutput | null>> =>
					v === null ? { success: true, data: null } : safeParse(v),
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
