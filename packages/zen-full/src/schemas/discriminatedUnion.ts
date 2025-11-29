import { SchemaError } from '../errors'
import type { AnySchema, BaseSchema, Result } from '../types'
import { toStandardIssue } from '../types'

// ============================================================
// Discriminated Union Schema
// ============================================================

type DiscriminatorValue = string | number | boolean

interface ObjectSchemaWithDiscriminator extends AnySchema {
	shape: Record<string, AnySchema>
}

type ExtractDiscriminator<T extends ObjectSchemaWithDiscriminator, K extends string> =
	T['shape'][K] extends BaseSchema<infer I, infer O> ? O : never

export interface DiscriminatedUnionSchema<
	K extends string,
	T extends readonly ObjectSchemaWithDiscriminator[],
> extends BaseSchema<T[number]['_input'], T[number]['_output']> {
	readonly discriminator: K
	readonly options: T
	optional(): BaseSchema<T[number]['_input'] | undefined, T[number]['_output'] | undefined>
	nullable(): BaseSchema<T[number]['_input'] | null, T[number]['_output'] | null>
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v)

export function discriminatedUnion<
	K extends string,
	T extends readonly ObjectSchemaWithDiscriminator[],
>(discriminator: K, options: T): DiscriminatedUnionSchema<K, T> {
	type TInput = T[number]['_input']
	type TOutput = T[number]['_output']

	// Build a map of discriminator value -> schema for O(1) lookup
	const schemaMap = new Map<DiscriminatorValue, ObjectSchemaWithDiscriminator>()

	for (const option of options) {
		const discSchema = option.shape[discriminator]
		if (discSchema && 'value' in discSchema) {
			// It's a literal schema
			schemaMap.set(discSchema.value as DiscriminatorValue, option)
		}
	}

	const safeParse = (data: unknown): Result<TOutput> => {
		if (!isObject(data)) {
			return { success: false, issues: [{ message: 'Expected object' }] }
		}

		const discValue = data[discriminator]
		if (discValue === undefined) {
			return {
				success: false,
				issues: [{ message: `Missing discriminator key "${discriminator}"` }],
			}
		}

		const schema = schemaMap.get(discValue as DiscriminatorValue)
		if (!schema) {
			const validValues = Array.from(schemaMap.keys()).join(', ')
			return {
				success: false,
				issues: [
					{
						message: `Invalid discriminator value. Expected one of: ${validValues}`,
						path: [discriminator],
					},
				],
			}
		}

		return schema.safeParse(data) as Result<TOutput>
	}

	const schema: DiscriminatedUnionSchema<K, T> = {
		_input: undefined as unknown as TInput,
		_output: undefined as unknown as TOutput,
		_checks: [],
		discriminator,
		options,

		'~standard': {
			version: 1,
			vendor: 'zen',
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = safeParse(value)
				if (result.success) return { value: result.data }
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

		optional() {
			return {
				_input: undefined as unknown as TInput | undefined,
				_output: undefined as unknown as TOutput | undefined,
				_checks: [],
				'~standard': {
					version: 1 as const,
					vendor: 'zen',
					validate: (v: unknown) => {
						if (v === undefined) return { value: undefined }
						const result = safeParse(v)
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
						if (v === null) return { value: null }
						const result = safeParse(v)
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
	}

	return schema
}
