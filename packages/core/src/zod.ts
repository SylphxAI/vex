// ============================================================
// Zod Compatibility Layer
// ============================================================
//
// This module provides full Zod API compatibility.
// Use this when you need drop-in replacement for Zod.
//
// import { z } from '@pico-schema/core/zod'
//
// ============================================================

import { SchemaError, ZodCompatError } from './errors'
import { array, boolean, literal, number, object, string, union } from './schemas'
import type { BaseSchema } from './types'

// Re-export everything with zod-like naming
export {
	array,
	boolean,
	literal,
	number,
	object,
	string,
	union,
	SchemaError,
	ZodCompatError as ZodError,
}

// Type inference (matches Zod's API)
export type infer<T extends BaseSchema<unknown, unknown>> = T['_output']
export type input<T extends BaseSchema<unknown, unknown>> = T['_input']
export type output<T extends BaseSchema<unknown, unknown>> = T['_output']

// Zod namespace
export const z = {
	string,
	number,
	boolean,
	object,
	array,
	union,
	literal,

	// Aliases that Zod has
	enum: <T extends readonly [string, ...string[]]>(values: T) => {
		return union(
			values.map((v) => literal(v)) as unknown as readonly BaseSchema<T[number], T[number]>[]
		)
	},

	// Utility types
	infer: undefined as unknown,
} as const

export default z
