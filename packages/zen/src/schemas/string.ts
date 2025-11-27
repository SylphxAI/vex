import { createSchema } from '../core'
import type { BaseSchema, Check } from '../types'

// Type guard
const isString = (v: unknown): v is string => typeof v === 'string'

// ============================================================
// String Schema Interface
// ============================================================

export interface StringSchema extends BaseSchema<string, string> {
	min(length: number, message?: string): StringSchema
	max(length: number, message?: string): StringSchema
	length(length: number, message?: string): StringSchema
	email(message?: string): StringSchema
	url(message?: string): StringSchema
	uuid(message?: string): StringSchema
	regex(pattern: RegExp, message?: string): StringSchema
	startsWith(prefix: string, message?: string): StringSchema
	endsWith(suffix: string, message?: string): StringSchema
	includes(search: string, message?: string): StringSchema
	trim(): StringSchema
	toLowerCase(): StringSchema
	toUpperCase(): StringSchema
	nonempty(message?: string): StringSchema
	optional(): BaseSchema<string | undefined, string | undefined>
	nullable(): BaseSchema<string | null, string | null>
}

// ============================================================
// Validators
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const URL_REGEX = /^https?:\/\/.+/

// ============================================================
// Implementation
// ============================================================

function createStringSchema(checks: Check<string>[] = []): StringSchema {
	const base = createSchema<string>('string', isString, checks)

	const addCheck = (check: Check<string>): StringSchema => {
		return createStringSchema([...checks, check])
	}

	const schema: StringSchema = {
		...base,

		min(length: number, message?: string) {
			return addCheck({
				name: 'min',
				check: (v) => v.length >= length,
				message: message ?? `Must be at least ${length} characters`,
			})
		},

		max(length: number, message?: string) {
			return addCheck({
				name: 'max',
				check: (v) => v.length <= length,
				message: message ?? `Must be at most ${length} characters`,
			})
		},

		length(len: number, message?: string) {
			return addCheck({
				name: 'length',
				check: (v) => v.length === len,
				message: message ?? `Must be exactly ${len} characters`,
			})
		},

		email(message?: string) {
			return addCheck({
				name: 'email',
				check: (v) => EMAIL_REGEX.test(v),
				message: message ?? 'Invalid email address',
			})
		},

		url(message?: string) {
			return addCheck({
				name: 'url',
				check: (v) => URL_REGEX.test(v),
				message: message ?? 'Invalid URL',
			})
		},

		uuid(message?: string) {
			return addCheck({
				name: 'uuid',
				check: (v) => UUID_REGEX.test(v),
				message: message ?? 'Invalid UUID',
			})
		},

		regex(pattern: RegExp, message?: string) {
			return addCheck({
				name: 'regex',
				check: (v) => pattern.test(v),
				message: message ?? 'Invalid format',
			})
		},

		startsWith(prefix: string, message?: string) {
			return addCheck({
				name: 'startsWith',
				check: (v) => v.startsWith(prefix),
				message: message ?? `Must start with "${prefix}"`,
			})
		},

		endsWith(suffix: string, message?: string) {
			return addCheck({
				name: 'endsWith',
				check: (v) => v.endsWith(suffix),
				message: message ?? `Must end with "${suffix}"`,
			})
		},

		includes(search: string, message?: string) {
			return addCheck({
				name: 'includes',
				check: (v) => v.includes(search),
				message: message ?? `Must include "${search}"`,
			})
		},

		trim() {
			// Transform - needs different handling
			return createStringSchema([
				...checks,
				{
					name: 'trim',
					check: () => true,
					message: '',
				},
			])
		},

		toLowerCase() {
			return createStringSchema([
				...checks,
				{
					name: 'toLowerCase',
					check: () => true,
					message: '',
				},
			])
		},

		toUpperCase() {
			return createStringSchema([
				...checks,
				{
					name: 'toUpperCase',
					check: () => true,
					message: '',
				},
			])
		},

		nonempty(message?: string) {
			return this.min(1, message ?? 'Must not be empty')
		},

		optional() {
			return createSchema<string | undefined>(
				'string',
				(v): v is string | undefined => v === undefined || isString(v),
				checks as Check<string | undefined>[]
			)
		},

		nullable() {
			return createSchema<string | null>(
				'string',
				(v): v is string | null => v === null || isString(v),
				checks as Check<string | null>[]
			)
		},
	}

	return schema
}

/**
 * Create a string schema
 */
export function string(): StringSchema {
	return createStringSchema()
}
