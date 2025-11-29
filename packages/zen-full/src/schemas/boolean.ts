import { createSchema } from '../core'
import type { BaseSchema, Check } from '../types'

// Type guard
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean'

// ============================================================
// Boolean Schema Interface
// ============================================================

export interface BooleanSchema extends BaseSchema<boolean, boolean> {
	optional(): BaseSchema<boolean | undefined, boolean | undefined>
	nullable(): BaseSchema<boolean | null, boolean | null>
}

// ============================================================
// Implementation
// ============================================================

function createBooleanSchema(checks: Check<boolean>[] = []): BooleanSchema {
	const base = createSchema<boolean>('boolean', isBoolean, checks)

	const schema: BooleanSchema = {
		...base,

		optional() {
			return createSchema<boolean | undefined>(
				'boolean',
				(v): v is boolean | undefined => v === undefined || isBoolean(v),
				checks as Check<boolean | undefined>[]
			)
		},

		nullable() {
			return createSchema<boolean | null>(
				'boolean',
				(v): v is boolean | null => v === null || isBoolean(v),
				checks as Check<boolean | null>[]
			)
		},
	}

	return schema
}

/**
 * Create a boolean schema
 */
export function boolean(): BooleanSchema {
	return createBooleanSchema()
}
