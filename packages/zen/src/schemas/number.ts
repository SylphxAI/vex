import { createSchema } from '../core'
import type { BaseSchema, Check } from '../types'

// Type guard
const isNumber = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v)

// ============================================================
// Number Schema Interface
// ============================================================

export interface NumberSchema extends BaseSchema<number, number> {
	min(value: number, message?: string): NumberSchema
	max(value: number, message?: string): NumberSchema
	int(message?: string): NumberSchema
	positive(message?: string): NumberSchema
	negative(message?: string): NumberSchema
	nonnegative(message?: string): NumberSchema
	nonpositive(message?: string): NumberSchema
	multipleOf(value: number, message?: string): NumberSchema
	finite(message?: string): NumberSchema
	safe(message?: string): NumberSchema
	gt(value: number, message?: string): NumberSchema
	gte(value: number, message?: string): NumberSchema
	lt(value: number, message?: string): NumberSchema
	lte(value: number, message?: string): NumberSchema
	optional(): BaseSchema<number | undefined, number | undefined>
	nullable(): BaseSchema<number | null, number | null>
}

// ============================================================
// Implementation
// ============================================================

function createNumberSchema(checks: Check<number>[] = []): NumberSchema {
	const base = createSchema<number>('number', isNumber, checks)

	const addCheck = (check: Check<number>): NumberSchema => {
		return createNumberSchema([...checks, check])
	}

	const schema: NumberSchema = {
		...base,

		min(value: number, message?: string) {
			return addCheck({
				name: 'min',
				check: (v) => v >= value,
				message: message ?? `Must be at least ${value}`,
			})
		},

		max(value: number, message?: string) {
			return addCheck({
				name: 'max',
				check: (v) => v <= value,
				message: message ?? `Must be at most ${value}`,
			})
		},

		gt(value: number, message?: string) {
			return addCheck({
				name: 'gt',
				check: (v) => v > value,
				message: message ?? `Must be greater than ${value}`,
			})
		},

		gte(value: number, message?: string) {
			return this.min(value, message)
		},

		lt(value: number, message?: string) {
			return addCheck({
				name: 'lt',
				check: (v) => v < value,
				message: message ?? `Must be less than ${value}`,
			})
		},

		lte(value: number, message?: string) {
			return this.max(value, message)
		},

		int(message?: string) {
			return addCheck({
				name: 'int',
				check: (v) => Number.isInteger(v),
				message: message ?? 'Must be an integer',
			})
		},

		positive(message?: string) {
			return addCheck({
				name: 'positive',
				check: (v) => v > 0,
				message: message ?? 'Must be positive',
			})
		},

		negative(message?: string) {
			return addCheck({
				name: 'negative',
				check: (v) => v < 0,
				message: message ?? 'Must be negative',
			})
		},

		nonnegative(message?: string) {
			return addCheck({
				name: 'nonnegative',
				check: (v) => v >= 0,
				message: message ?? 'Must be non-negative',
			})
		},

		nonpositive(message?: string) {
			return addCheck({
				name: 'nonpositive',
				check: (v) => v <= 0,
				message: message ?? 'Must be non-positive',
			})
		},

		multipleOf(value: number, message?: string) {
			return addCheck({
				name: 'multipleOf',
				check: (v) => v % value === 0,
				message: message ?? `Must be a multiple of ${value}`,
			})
		},

		finite(message?: string) {
			return addCheck({
				name: 'finite',
				check: (v) => Number.isFinite(v),
				message: message ?? 'Must be finite',
			})
		},

		safe(message?: string) {
			return addCheck({
				name: 'safe',
				check: (v) => Number.isSafeInteger(v),
				message: message ?? 'Must be a safe integer',
			})
		},

		optional() {
			return createSchema<number | undefined>(
				'number',
				(v): v is number | undefined => v === undefined || isNumber(v),
				checks as Check<number | undefined>[]
			)
		},

		nullable() {
			return createSchema<number | null>(
				'number',
				(v): v is number | null => v === null || isNumber(v),
				checks as Check<number | null>[]
			)
		},
	}

	return schema
}

/**
 * Create a number schema
 */
export function number(): NumberSchema {
	return createNumberSchema()
}
