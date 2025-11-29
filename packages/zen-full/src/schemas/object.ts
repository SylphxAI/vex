import { SchemaError } from '../errors'
import type { BaseSchema, Check, Issue, Result } from '../types'
import { toStandardIssue } from '../types'

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
	// Partial/Required
	partial(): ObjectSchema<{
		[K in keyof T]: BaseSchema<T[K]['_input'] | undefined, T[K]['_output'] | undefined>
	}>
	// biome-ignore lint/suspicious/noExplicitAny: complex type transformation
	required(): ObjectSchema<any>
	// biome-ignore lint/suspicious/noExplicitAny: complex type transformation
	deepPartial(): ObjectSchema<any>
	// Pick/Omit
	pick<K extends keyof T>(keys: K[]): ObjectSchema<Pick<T, K>>
	omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>>
	// Extend/Merge
	extend<E extends ObjectShape>(extension: E): ObjectSchema<T & E>
	safeExtend<E extends ObjectShape>(extension: E): ObjectSchema<T & Omit<E, keyof T>>
	merge<E extends ObjectShape>(other: ObjectSchema<E>): ObjectSchema<T & E>
	// Strictness
	passthrough(): ObjectSchema<T>
	strict(): ObjectSchema<T>
	strip(): ObjectSchema<T>
	catchall<C extends AnySchema>(schema: C): ObjectSchema<T>
	// Keys
	keyof(): BaseSchema<keyof T, keyof T>
	// Nullable/Optional
	optional(): BaseSchema<InferObjectInput<T> | undefined, InferObjectOutput<T> | undefined>
	nullable(): BaseSchema<InferObjectInput<T> | null, InferObjectOutput<T> | null>
	nullish(): BaseSchema<InferObjectInput<T> | null | undefined, InferObjectOutput<T> | null | undefined>
	// Metadata
	describe(description: string): ObjectSchema<T>
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
	const shapeEntries: [string, AnySchema][] = shapeKeys.map((k) => [k, shape[k]!])
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
			const [key, fieldSchema] = shapeEntries[i]!
			const value = input[key]
			const result = fieldSchema.safeParse(value)

			if (result.success) {
				// Only create output if value changed (transform) or we already have issues
				if (result.data !== value || hasTransform) {
					if (!output) {
						output = {}
						// Copy already processed values
						for (let j = 0; j < i; j++) {
							output[shapeEntries[j]![0]] = input[shapeEntries[j]![0]]
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
				const key = inputKeys[i]!
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
				const key = inputKeys[i]!
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
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		shape,

		// Standard Schema
		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) {
					return { value: result.data }
				}
				return { issues: result.issues.map(toStandardIssue) }
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
				const key = shapeKeys[i]!
				const fieldSchema = shape[key]!
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
					pickedShape[key] = shape[key]!
				}
			}
			return createObjectSchema(pickedShape, options)
		},

		omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>> {
			const omitSet = new Set<PropertyKey>(keys)
			const omittedShape = {} as Omit<T, K>
			for (const key of shapeKeys) {
				if (!omitSet.has(key)) {
					;(omittedShape as Record<string, AnySchema>)[key] = shape[key]!
				}
			}
			return createObjectSchema(omittedShape, options)
		},

		extend<E extends ObjectShape>(extension: E): ObjectSchema<T & E> {
			return createObjectSchema({ ...shape, ...extension }, options)
		},

		safeExtend<E extends ObjectShape>(extension: E): ObjectSchema<T & Omit<E, keyof T>> {
			// Only add keys that don't exist in the current shape
			const safeExtension: ObjectShape = {}
			for (const key of Object.keys(extension)) {
				if (!(key in shape)) {
					safeExtension[key] = extension[key]!
				}
			}
			return createObjectSchema({ ...shape, ...safeExtension }, options) as unknown as ObjectSchema<T & Omit<E, keyof T>>
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

		strip() {
			// Default behavior - strip unknown keys
			return createObjectSchema(shape, { ...options, passthrough: false, strict: false })
		},

		catchall<C extends AnySchema>(_catchallSchema: C) {
			// For now, just return passthrough behavior
			// Full implementation would validate unknown keys with catchallSchema
			return createObjectSchema(shape, { ...options, passthrough: true })
		},

		required() {
			const requiredShape = {} as Record<string, AnySchema>
			for (let i = 0; i < shapeKeys.length; i++) {
				const key = shapeKeys[i]!
				const fieldSchema = shape[key]!
				requiredShape[key] = {
					...fieldSchema,
					safeParse(data: unknown) {
						if (data === undefined) {
							return { success: false, issues: [{ message: 'Required' }] }
						}
						return fieldSchema.safeParse(data)
					},
					parse(data: unknown) {
						if (data === undefined) {
							throw new SchemaError([{ message: 'Required' }])
						}
						return fieldSchema.parse(data)
					},
				} as AnySchema
			}
			// biome-ignore lint/suspicious/noExplicitAny: complex type transformation
			return createObjectSchema(requiredShape, options) as ObjectSchema<any>
		},

		deepPartial() {
			const deepPartialShape = {} as Record<string, AnySchema>
			for (let i = 0; i < shapeKeys.length; i++) {
				const key = shapeKeys[i]!
				const fieldSchema = shape[key]!
				// If field has a shape property, it's an object - make it deep partial
				const innerShape = (fieldSchema as unknown as { shape?: ObjectShape }).shape
				if (innerShape) {
					const innerPartial = createObjectSchema(innerShape, options).deepPartial()
					deepPartialShape[key] = {
						...innerPartial,
						safeParse(data: unknown) {
							if (data === undefined) return { success: true, data: undefined }
							return innerPartial.safeParse(data)
						},
						parse(data: unknown) {
							if (data === undefined) return undefined
							return innerPartial.parse(data)
						},
					} as AnySchema
				} else {
					deepPartialShape[key] = {
						...fieldSchema,
						safeParse(data: unknown) {
							if (data === undefined) return { success: true, data: undefined }
							return fieldSchema.safeParse(data)
						},
						parse(data: unknown) {
							if (data === undefined) return undefined
							return fieldSchema.parse(data)
						},
					} as AnySchema
				}
			}
			// biome-ignore lint/suspicious/noExplicitAny: complex type transformation
			return createObjectSchema(deepPartialShape, options) as ObjectSchema<any>
		},

		keyof() {
			const keys = shapeKeys as unknown as (keyof T)[]
			type KeyType = keyof T

			const safeParse = (data: unknown): Result<KeyType> => {
				if (typeof data !== 'string' || !shapeKeys.includes(data)) {
					return {
						success: false,
						issues: [{ message: `Expected one of: ${shapeKeys.join(', ')}` }],
					}
				}
				return { success: true, data: data as KeyType }
			}

			return {
				_input: undefined as unknown as KeyType,
				_output: undefined as unknown as KeyType,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						const result = safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues.map(toStandardIssue) }
					},
					types: undefined as unknown as { input: KeyType; output: KeyType },
				},
				parse: (v: unknown) => {
					const result = safeParse(v)
					if (result.success) return result.data
					throw new SchemaError(result.issues)
				},
				safeParse,
				parseAsync: async (v: unknown) => {
					const result = safeParse(v)
					if (result.success) return result.data
					throw new SchemaError(result.issues)
				},
				safeParseAsync: async (v: unknown) => safeParse(v),
			}
		},

		optional() {
			return {
				_input: undefined as unknown as TInput | undefined,
				_output: undefined as unknown as TOutput | undefined,
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
						return { issues: result.issues.map(toStandardIssue) }
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
				_input: undefined as unknown as TInput | null,
				_output: undefined as unknown as TOutput | null,
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
						return { issues: result.issues.map(toStandardIssue) }
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

		nullish() {
			return {
				_input: undefined as unknown as TInput | null | undefined,
				_output: undefined as unknown as TOutput | null | undefined,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						if (v === null || v === undefined) return { value: v as TOutput | null | undefined }
						const result = safeParse(v)
						if (result.success) return { value: result.data }
						return { issues: result.issues.map(toStandardIssue) }
					},
					types: undefined as unknown as {
						input: TInput | null | undefined
						output: TOutput | null | undefined
					},
				},
				parse: (v: unknown) => (v === null || v === undefined ? v : schema.parse(v)),
				safeParse: (v: unknown): Result<TOutput | null | undefined> =>
					v === null || v === undefined
						? { success: true, data: v as TOutput | null | undefined }
						: safeParse(v),
				parseAsync: async (v: unknown) =>
					v === null || v === undefined ? v : schema.parse(v),
				safeParseAsync: async (v: unknown): Promise<Result<TOutput | null | undefined>> =>
					v === null || v === undefined
						? { success: true, data: v as TOutput | null | undefined }
						: safeParse(v),
			}
		},

		describe(_description: string) {
			// Store description in metadata (for future use with JSON Schema export)
			return createObjectSchema(shape, options)
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

/**
 * Create a strict object schema (rejects unknown keys)
 */
export function strictObject<T extends ObjectShape>(shape: T): ObjectSchema<T> {
	return createObjectSchema(shape, { strict: true })
}

/**
 * Create a loose object schema (passes through unknown keys)
 */
export function looseObject<T extends ObjectShape>(shape: T): ObjectSchema<T> {
	return createObjectSchema(shape, { passthrough: true })
}
