import type { Issue } from './types'

/**
 * Schema validation error
 */
export class SchemaError extends Error {
	readonly name = 'SchemaError'
	readonly issues: Issue[]

	constructor(issues: Issue[]) {
		const message = issues.map((i) => i.message).join(', ')
		super(message)
		this.issues = issues

		// Maintains proper stack trace in V8
		const errorCtor = Error as unknown as { captureStackTrace?: (err: Error, ctor: unknown) => void }
		if (errorCtor.captureStackTrace) {
			errorCtor.captureStackTrace(this, SchemaError)
		}
	}

	/**
	 * Flatten errors into form-friendly format
	 */
	flatten() {
		const formErrors: string[] = []
		const fieldErrors: Record<string, string[]> = {}

		for (const issue of this.issues) {
			if (!issue.path || issue.path.length === 0) {
				formErrors.push(issue.message)
			} else {
				const key = issue.path.map(String).join('.')
				fieldErrors[key] ??= []
				fieldErrors[key].push(issue.message)
			}
		}

		return { formErrors, fieldErrors }
	}

	/**
	 * Format errors as string
	 */
	format(): string {
		return this.issues
			.map((i) => {
				const path = i.path?.length ? `[${i.path.join('.')}] ` : ''
				return `${path}${i.message}`
			})
			.join('\n')
	}
}

/**
 * Zod-compatible error class
 * Used for framework compatibility
 */
export class ZodCompatError extends Error {
	readonly name = 'ZodError'
	readonly issues: Array<{
		code: string
		message: string
		path: (string | number)[]
	}>

	constructor(schemaError: SchemaError) {
		super(schemaError.message)
		this.issues = schemaError.issues.map((i) => ({
			code: 'custom',
			message: i.message,
			path: (i.path?.map((p) => (typeof p === 'symbol' ? String(p) : p)) ?? []) as (
				| string
				| number
			)[],
		}))
	}

	get errors() {
		return this.issues
	}

	flatten() {
		const formErrors: string[] = []
		const fieldErrors: Record<string, string[]> = {}

		for (const issue of this.issues) {
			if (issue.path.length === 0) {
				formErrors.push(issue.message)
			} else {
				const key = issue.path.join('.')
				fieldErrors[key] ??= []
				fieldErrors[key].push(issue.message)
			}
		}

		return { formErrors, fieldErrors }
	}
}
