import { SchemaError } from './errors'
import { toStandardIssue } from './types'
import type { BaseSchema, Check, Issue, Result } from './types'

const VENDOR = 'zen'

/**
 * Create a schema with validation logic
 */
export function createSchema<TInput, TOutput = TInput>(
	typeName: string,
	typeCheck: (value: unknown) => value is TInput,
	checks: Check<TInput>[] = [],
	transform?: (value: TInput) => TOutput
): BaseSchema<TInput, TOutput> {
	const schema: BaseSchema<TInput, TOutput> = {
		// Type brands
		_input: undefined as TInput,
		_output: undefined as TOutput,
		_checks: checks,

		// Standard Schema V1
		'~standard': {
			version: 1,
			vendor: VENDOR,
			validate(value: unknown): { value: TOutput } | { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> } {
				const result = schema.safeParse(value)
				if (result.success) {
					return { value: result.data }
				}
				return { issues: result.issues.map(toStandardIssue) }
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
					issues: [{ message: `Expected ${typeName}` }],
				}
			}

			// Run all checks - lazy allocate issues array
			let issues: Issue[] | null = null
			for (let i = 0; i < checks.length; i++) {
				const check = checks[i]!
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
