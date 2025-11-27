import { SchemaError, ZodCompatError } from './errors'
import type { BaseSchema, Check, Issue, Result, ZodTypeName } from './types'

const VENDOR = 'zen'

/**
 * Create a schema with validation logic
 */
export function createSchema<TInput, TOutput = TInput>(
	typeName: ZodTypeName,
	typeCheck: (value: unknown) => value is TInput,
	checks: Check<TInput>[] = [],
	transform?: (value: TInput) => TOutput
): BaseSchema<TInput, TOutput> {
	const schema: BaseSchema<TInput, TOutput> = {
		// Type brands
		_input: undefined as TInput,
		_output: undefined as TOutput,
		_checks: checks,

		// Zod v3 compat
		_def: { typeName },

		// Zod v4 compat
		_zod: { def: { typeName } },

		// Standard Schema V1
		'~standard': {
			version: 1,
			vendor: VENDOR,
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
			// Type check
			if (!typeCheck(data)) {
				return {
					success: false,
					issues: [{ message: `Expected ${typeName.replace('Zod', '').toLowerCase()}` }],
				}
			}

			// Run all checks - lazy allocate issues array
			let issues: Issue[] | null = null
			for (let i = 0; i < checks.length; i++) {
				const check = checks[i]
				if (!check.check(data)) {
					const message = typeof check.message === 'function' ? check.message(data) : check.message
					if (!issues) issues = []
					issues.push({ message })
				}
			}

			if (issues) {
				return { success: false, issues }
			}

			// Apply transform if any
			const output = transform ? transform(data) : (data as unknown as TOutput)
			return { success: true, data: output }
		},

		async parseAsync(data: unknown): Promise<TOutput> {
			return this.parse(data)
		},

		async safeParseAsync(data: unknown): Promise<Result<TOutput>> {
			return this.safeParse(data)
		},
	}

	return schema
}

/**
 * Clone schema with additional checks
 */
export function withCheck<TInput, TOutput>(
	schema: BaseSchema<TInput, TOutput>,
	check: Check<TInput>
): BaseSchema<TInput, TOutput> {
	// Get the original typeCheck from the schema's behavior
	const typeCheck = (v: unknown): v is TInput => {
		const result = createSchema(schema._def.typeName, () => true, []).safeParse(v)
		return result.success || schema.safeParse(v).success || true
	}

	return createSchema(
		schema._def.typeName,
		// biome-ignore lint/suspicious/noExplicitAny: need to preserve type check
		(v): v is TInput =>
			(schema as any)._typeCheck?.(v) ?? typeof v === inferType(schema._def.typeName),
		[...schema._checks, check]
	)
}

function inferType(typeName: ZodTypeName): string {
	switch (typeName) {
		case 'ZodString':
			return 'string'
		case 'ZodNumber':
			return 'number'
		case 'ZodBoolean':
			return 'boolean'
		default:
			return 'object'
	}
}

/**
 * Create chainable schema with fluent API
 */
export function createChainableSchema<TInput, TOutput, TMethods extends object>(
	base: BaseSchema<TInput, TOutput>,
	methods: TMethods,
	typeCheck: (value: unknown) => value is TInput
): BaseSchema<TInput, TOutput> & TMethods {
	const schema = Object.assign({}, base, methods)

	// Store typeCheck for cloning
	Object.defineProperty(schema, '_typeCheck', {
		value: typeCheck,
		enumerable: false,
	})

	return schema as BaseSchema<TInput, TOutput> & TMethods
}
