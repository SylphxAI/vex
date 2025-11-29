import { createSchema } from '../core'
import type { BaseSchema, Check } from '../types'

// Type guard
const isString = (v: unknown): v is string => typeof v === 'string'

// ============================================================
// String Schema Interface
// ============================================================

export interface StringSchema extends BaseSchema<string, string> {
	// Length validators
	min(length: number, message?: string): StringSchema
	max(length: number, message?: string): StringSchema
	length(length: number, message?: string): StringSchema
	nonempty(message?: string): StringSchema
	// Format validators
	email(message?: string): StringSchema
	url(message?: string): StringSchema
	uuid(message?: string): StringSchema
	cuid(message?: string): StringSchema
	cuid2(message?: string): StringSchema
	ulid(message?: string): StringSchema
	nanoid(message?: string): StringSchema
	// IP validators
	ip(options?: { version?: 'v4' | 'v6' }, message?: string): StringSchema
	ipv4(message?: string): StringSchema
	ipv6(message?: string): StringSchema
	// Date/time validators
	datetime(message?: string): StringSchema
	date(message?: string): StringSchema
	time(message?: string): StringSchema
	duration(message?: string): StringSchema
	// Encoding validators
	base64(message?: string): StringSchema
	base64url(message?: string): StringSchema
	hex(message?: string): StringSchema
	jwt(message?: string): StringSchema
	emoji(message?: string): StringSchema
	// Network validators
	hostname(message?: string): StringSchema
	mac(message?: string): StringSchema
	cidrv4(message?: string): StringSchema
	cidrv6(message?: string): StringSchema
	// Case validators (check, not transform)
	lowercase(message?: string): StringSchema
	uppercase(message?: string): StringSchema
	// Pattern validators
	regex(pattern: RegExp, message?: string): StringSchema
	startsWith(prefix: string, message?: string): StringSchema
	endsWith(suffix: string, message?: string): StringSchema
	includes(search: string, message?: string): StringSchema
	// Transforms
	trim(): StringSchema
	toLowerCase(): StringSchema
	toUpperCase(): StringSchema
	normalize(form?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'): StringSchema
	// Nullable/Optional
	optional(): BaseSchema<string | undefined, string | undefined>
	nullable(): BaseSchema<string | null, string | null>
	nullish(): BaseSchema<string | null | undefined, string | null | undefined>
	// Metadata
	describe(description: string): StringSchema
}

// ============================================================
// Validators
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const URL_REGEX = /^https?:\/\/.+/
const CUID_REGEX = /^c[^\s-]{8,}$/i
const CUID2_REGEX = /^[a-z][a-z0-9]{23,}$/
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i
const NANOID_REGEX = /^[a-zA-Z0-9_-]{21}$/
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
const IPV6_REGEX = /^(?:(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,7}:|(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}|(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}|(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}|(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}|[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,6}|:(?:(?::[a-fA-F0-9]{1,4}){1,7}|:)|fe80:(?::[a-fA-F0-9]{0,4}){0,4}%[0-9a-zA-Z]+|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])|(?:[a-fA-F0-9]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9]))$/
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const TIME_REGEX = /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/
const DURATION_REGEX = /^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const BASE64URL_REGEX = /^[A-Za-z0-9_-]*$/
const HEX_REGEX = /^[0-9a-fA-F]+$/
const JWT_REGEX = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
const EMOJI_REGEX = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)+$/u
const HOSTNAME_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}\.){2}([0-9A-Fa-f]{4})$/
const CIDRV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:3[0-2]|[12]?[0-9])$/
const CIDRV6_REGEX = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\/(?:12[0-8]|1[01][0-9]|[1-9]?[0-9])$|^::(?:ffff:)?(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:12[0-8]|1[01][0-9]|[1-9]?[0-9])$/

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

		cuid(message?: string) {
			return addCheck({
				name: 'cuid',
				check: (v) => CUID_REGEX.test(v),
				message: message ?? 'Invalid CUID',
			})
		},

		cuid2(message?: string) {
			return addCheck({
				name: 'cuid2',
				check: (v) => CUID2_REGEX.test(v),
				message: message ?? 'Invalid CUID2',
			})
		},

		ulid(message?: string) {
			return addCheck({
				name: 'ulid',
				check: (v) => ULID_REGEX.test(v),
				message: message ?? 'Invalid ULID',
			})
		},

		nanoid(message?: string) {
			return addCheck({
				name: 'nanoid',
				check: (v) => NANOID_REGEX.test(v),
				message: message ?? 'Invalid nanoid',
			})
		},

		ip(options?: { version?: 'v4' | 'v6' }, message?: string) {
			const version = options?.version
			if (version === 'v4') return this.ipv4(message)
			if (version === 'v6') return this.ipv6(message)
			return addCheck({
				name: 'ip',
				check: (v) => IPV4_REGEX.test(v) || IPV6_REGEX.test(v),
				message: message ?? 'Invalid IP address',
			})
		},

		ipv4(message?: string) {
			return addCheck({
				name: 'ipv4',
				check: (v) => IPV4_REGEX.test(v),
				message: message ?? 'Invalid IPv4 address',
			})
		},

		ipv6(message?: string) {
			return addCheck({
				name: 'ipv6',
				check: (v) => IPV6_REGEX.test(v),
				message: message ?? 'Invalid IPv6 address',
			})
		},

		datetime(message?: string) {
			return addCheck({
				name: 'datetime',
				check: (v) => DATETIME_REGEX.test(v),
				message: message ?? 'Invalid ISO datetime',
			})
		},

		date(message?: string) {
			return addCheck({
				name: 'date',
				check: (v) => DATE_REGEX.test(v),
				message: message ?? 'Invalid ISO date',
			})
		},

		time(message?: string) {
			return addCheck({
				name: 'time',
				check: (v) => TIME_REGEX.test(v),
				message: message ?? 'Invalid ISO time',
			})
		},

		duration(message?: string) {
			return addCheck({
				name: 'duration',
				check: (v) => DURATION_REGEX.test(v),
				message: message ?? 'Invalid ISO duration',
			})
		},

		base64(message?: string) {
			return addCheck({
				name: 'base64',
				check: (v) => BASE64_REGEX.test(v),
				message: message ?? 'Invalid base64 string',
			})
		},

		jwt(message?: string) {
			return addCheck({
				name: 'jwt',
				check: (v) => JWT_REGEX.test(v),
				message: message ?? 'Invalid JWT',
			})
		},

		emoji(message?: string) {
			return addCheck({
				name: 'emoji',
				check: (v) => EMOJI_REGEX.test(v),
				message: message ?? 'Invalid emoji',
			})
		},

		base64url(message?: string) {
			return addCheck({
				name: 'base64url',
				check: (v) => BASE64URL_REGEX.test(v),
				message: message ?? 'Invalid base64url string',
			})
		},

		hex(message?: string) {
			return addCheck({
				name: 'hex',
				check: (v) => HEX_REGEX.test(v),
				message: message ?? 'Invalid hex string',
			})
		},

		hostname(message?: string) {
			return addCheck({
				name: 'hostname',
				check: (v) => HOSTNAME_REGEX.test(v),
				message: message ?? 'Invalid hostname',
			})
		},

		mac(message?: string) {
			return addCheck({
				name: 'mac',
				check: (v) => MAC_REGEX.test(v),
				message: message ?? 'Invalid MAC address',
			})
		},

		cidrv4(message?: string) {
			return addCheck({
				name: 'cidrv4',
				check: (v) => CIDRV4_REGEX.test(v),
				message: message ?? 'Invalid CIDR v4',
			})
		},

		cidrv6(message?: string) {
			return addCheck({
				name: 'cidrv6',
				check: (v) => CIDRV6_REGEX.test(v),
				message: message ?? 'Invalid CIDR v6',
			})
		},

		lowercase(message?: string) {
			return addCheck({
				name: 'lowercase',
				check: (v) => v === v.toLowerCase(),
				message: message ?? 'Must be lowercase',
			})
		},

		uppercase(message?: string) {
			return addCheck({
				name: 'uppercase',
				check: (v) => v === v.toUpperCase(),
				message: message ?? 'Must be uppercase',
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

		normalize(form: 'NFC' | 'NFD' | 'NFKC' | 'NFKD' = 'NFC') {
			return createStringSchema([
				...checks,
				{
					name: `normalize:${form}`,
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

		nullish() {
			return createSchema<string | null | undefined>(
				'string',
				(v): v is string | null | undefined => v === null || v === undefined || isString(v),
				checks as Check<string | null | undefined>[]
			)
		},

		describe(_description: string) {
			// Store description in metadata (for future use with JSON Schema export)
			return createStringSchema(checks)
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
