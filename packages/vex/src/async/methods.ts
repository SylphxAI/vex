// ============================================================
// Async Method Variants
// ============================================================

import type { Result } from '../core'
import { ValidationError } from '../core'
import type { AsyncParser, AsyncValidator } from './core'

// ============================================================
// Parse Async
// ============================================================

export const parseAsync = async <T>(schema: AsyncParser<T>, value: unknown): Promise<T> => {
	return schema(value)
}

export const safeParseAsync = async <T>(
	schema: AsyncParser<T>,
	value: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> => {
	if (schema.safe) {
		const result = await schema.safe(value)
		return result.ok
			? { success: true, data: result.value }
			: { success: false, error: result.error }
	}
	try {
		return { success: true, data: await schema(value) }
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
	}
}

export const parserAsync = <T>(schema: AsyncParser<T>): ((value: unknown) => Promise<T>) => {
	return (value: unknown) => schema(value)
}

export const safeParserAsync = <T>(
	schema: AsyncParser<T>
): ((
	value: unknown
) => Promise<{ success: true; data: T } | { success: false; error: string }>) => {
	return (value: unknown) => safeParseAsync(schema, value)
}

// ============================================================
// Pipe Async
// ============================================================

type PipeOutput<T extends readonly unknown[]> = T extends readonly [...infer _, infer Last]
	? Last extends AsyncValidator<unknown, infer O>
		? O
		: never
	: never

export const pipeAsync = <
	T extends readonly [AsyncValidator<unknown, unknown>, ...AsyncValidator<unknown, unknown>[]],
>(
	...validators: T
): AsyncParser<PipeOutput<T>> => {
	const fn = (async (value: unknown) => {
		let result = value
		for (const validator of validators) {
			result = await validator(result)
		}
		return result as PipeOutput<T>
	}) as AsyncParser<PipeOutput<T>>

	fn.safe = async (value: unknown): Promise<Result<PipeOutput<T>>> => {
		let result = value
		for (const validator of validators) {
			try {
				if (validator.safe) {
					const r = await validator.safe(result)
					if (!r.ok) return r as Result<PipeOutput<T>>
					result = r.value
				} else {
					result = await validator(result)
				}
			} catch (e) {
				return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
			}
		}
		return { ok: true, value: result as PipeOutput<T> }
	}

	return fn
}

// ============================================================
// Transform Async
// ============================================================

export const transformAsync = <I, O>(fn: (value: I) => O | Promise<O>): AsyncValidator<I, O> => {
	const validator = (async (value: I) => {
		return fn(value)
	}) as AsyncValidator<I, O>

	validator.safe = async (value: I): Promise<Result<O>> => {
		try {
			return { ok: true, value: await fn(value) }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
		}
	}

	return validator
}

// ============================================================
// Check Async
// ============================================================

export const checkAsync = <T>(
	checkFn: (value: T) => boolean | Promise<boolean>,
	message = 'Validation failed'
): AsyncValidator<T, T> => {
	const fn = (async (value: T) => {
		if (!(await checkFn(value))) throw new ValidationError(message)
		return value
	}) as AsyncValidator<T, T>

	fn.safe = async (value: T): Promise<Result<T>> => {
		try {
			if (!(await checkFn(value))) return { ok: false, error: message }
			return { ok: true, value }
		} catch {
			return { ok: false, error: message }
		}
	}

	return fn
}

export const checkItemsAsync = <T>(
	checkFn: (item: T, index: number) => boolean | Promise<boolean>,
	message = 'Item validation failed'
): AsyncValidator<T[], T[]> => {
	const fn = (async (value: T[]) => {
		for (let i = 0; i < value.length; i++) {
			if (!(await checkFn(value[i] as T, i))) {
				throw new ValidationError(`[${i}]: ${message}`)
			}
		}
		return value
	}) as AsyncValidator<T[], T[]>

	fn.safe = async (value: T[]): Promise<Result<T[]>> => {
		for (let i = 0; i < value.length; i++) {
			try {
				if (!(await checkFn(value[i] as T, i))) {
					return { ok: false, error: `[${i}]: ${message}` }
				}
			} catch {
				return { ok: false, error: `[${i}]: ${message}` }
			}
		}
		return { ok: true, value }
	}

	return fn
}

// ============================================================
// Raw Check/Transform Async
// ============================================================

export const rawCheckAsync = <T>(
	check: (ctx: {
		input: T
		addIssue: (issue: { message: string; path?: PropertyKey[] }) => void
	}) => void | Promise<void>
): AsyncValidator<T, T> => {
	const fn = (async (value: T) => {
		const issues: { message: string; path?: PropertyKey[] }[] = []
		await check({
			input: value,
			addIssue: (issue) => issues.push(issue),
		})
		if (issues.length > 0) {
			throw new ValidationError(issues[0]?.message ?? 'Validation failed')
		}
		return value
	}) as AsyncValidator<T, T>

	fn.safe = async (value: T): Promise<Result<T>> => {
		const issues: { message: string; path?: PropertyKey[] }[] = []
		await check({
			input: value,
			addIssue: (issue) => issues.push(issue),
		})
		if (issues.length > 0) {
			return { ok: false, error: issues[0]?.message ?? 'Validation failed' }
		}
		return { ok: true, value }
	}

	return fn
}

export const rawTransformAsync = <I, O>(
	transform: (ctx: { input: I; addIssue: (issue: { message: string }) => void }) => O | Promise<O>
): AsyncValidator<I, O> => {
	const fn = (async (value: I) => {
		const issues: { message: string }[] = []
		const result = await transform({
			input: value,
			addIssue: (issue) => issues.push(issue),
		})
		if (issues.length > 0) {
			throw new ValidationError(issues[0]?.message ?? 'Transform failed')
		}
		return result
	}) as AsyncValidator<I, O>

	fn.safe = async (value: I): Promise<Result<O>> => {
		const issues: { message: string }[] = []
		try {
			const result = await transform({
				input: value,
				addIssue: (issue) => issues.push(issue),
			})
			if (issues.length > 0) {
				return { ok: false, error: issues[0]?.message ?? 'Transform failed' }
			}
			return { ok: true, value: result }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Transform failed' }
		}
	}

	return fn
}

export const partialCheckAsync = <T extends Record<string, unknown>>(
	_paths: PropertyKey[][],
	check: (input: T) => boolean | Promise<boolean>,
	errorMessage = 'Partial check failed'
): AsyncValidator<T, T> => {
	const fn = (async (value: T) => {
		if (!(await check(value))) throw new ValidationError(errorMessage)
		return value
	}) as AsyncValidator<T, T>

	fn.safe = async (value: T): Promise<Result<T>> => {
		try {
			if (!(await check(value))) return { ok: false, error: errorMessage }
			return { ok: true, value }
		} catch {
			return { ok: false, error: errorMessage }
		}
	}

	return fn
}

export const forwardAsync = <I, O>(
	validator: AsyncValidator<I, O>,
	_path: PropertyKey[]
): AsyncValidator<I, O> => {
	const fn = (async (value: I) => validator(value)) as AsyncValidator<I, O>

	if (validator.safe) {
		fn.safe = validator.safe
	}

	return fn
}

// ============================================================
// Args/Returns Async
// ============================================================

export const argsAsync = <T extends unknown[]>(schema: AsyncParser<T>): AsyncParser<T> => schema

export const returnsAsync = <T>(schema: AsyncParser<T>): AsyncParser<T> => schema

// ============================================================
// Await Async
// ============================================================

export const awaitAsync = <T>(): AsyncValidator<Promise<T>, T> => {
	const fn = (async (value: Promise<T>) => {
		return value
	}) as AsyncValidator<Promise<T>, T>

	fn.safe = async (value: Promise<T>): Promise<Result<T>> => {
		try {
			return { ok: true, value: await value }
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : 'Promise rejected' }
		}
	}

	return fn
}
