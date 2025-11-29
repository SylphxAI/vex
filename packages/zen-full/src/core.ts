import { SchemaError } from './errors'
import { toStandardIssue } from './types'
import type { BaseSchema, Check, Issue, Result } from './types'

const VENDOR = 'zen'

// Pre-allocated error objects for common cases (avoid allocation in hot path)
const TYPE_ERRORS: Record<string, { success: false; issues: Issue[] }> = {}

function getTypeError(typeName: string): { success: false; issues: Issue[] } {
	let error = TYPE_ERRORS[typeName]
	if (!error) {
		error = { success: false, issues: [{ message: `Expected ${typeName}` }] }
		TYPE_ERRORS[typeName] = error
	}
	return error
}

/**
 * Create a schema with validation logic
 */
export function createSchema<TInput, TOutput = TInput>(
	typeName: string,
	typeCheck: (value: unknown) => value is TInput,
	checks: Check<TInput>[] = [],
	transform?: (value: TInput) => TOutput
): BaseSchema<TInput, TOutput> {
	// Pre-cache type error for this schema
	const typeError = getTypeError(typeName)
	// Cache checks length (micro-optimization)
	const checksLen = checks.length
	const hasChecks = checksLen > 0
	const hasTransform = transform !== undefined

	const schema: BaseSchema<TInput, TOutput> = {
		// Type name for JIT compilation
		_type: typeName,
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

		// Optimized parse: no allocation on success path, direct validation
		parse(data: unknown): TOutput {
			// Inline type check (avoid function call to safeParse)
			if (!typeCheck(data)) {
				throw new SchemaError(typeError.issues)
			}

			// Run checks directly
			if (hasChecks) {
				for (let i = 0; i < checksLen; i++) {
					const check = checks[i]!
					if (!check.check(data)) {
						const message = typeof check.message === 'function' ? check.message(data) : check.message
						throw new SchemaError([{ message }])
					}
				}
			}

			// Apply transform if any
			return hasTransform ? transform(data) : (data as unknown as TOutput)
		},

		safeParse(data: unknown): Result<TOutput> {
			// Type check - return pre-allocated error
			if (!typeCheck(data)) {
				return typeError
			}

			// Fast path: no checks
			if (!hasChecks) {
				const output = hasTransform ? transform(data) : (data as unknown as TOutput)
				return { success: true, data: output }
			}

			// Run all checks - lazy allocate issues array
			let issues: Issue[] | null = null
			for (let i = 0; i < checksLen; i++) {
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
			const output = hasTransform ? transform(data) : (data as unknown as TOutput)
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
