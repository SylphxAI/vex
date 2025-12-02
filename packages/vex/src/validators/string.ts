// ============================================================
// String Validators
// ============================================================

import type { Result, Validator } from '../core'
import { createValidator, ValidationError } from '../core'

const ERR_REQUIRED: Result<never> = { ok: false, error: 'Required' }
const ERR_EMAIL: Result<never> = { ok: false, error: 'Invalid email' }
const ERR_URL: Result<never> = { ok: false, error: 'Invalid URL' }
const ERR_UUID: Result<never> = { ok: false, error: 'Invalid UUID' }
const ERR_DATETIME: Result<never> = { ok: false, error: 'Invalid datetime' }
const ERR_DATE_ONLY: Result<never> = { ok: false, error: 'Invalid date' }
const ERR_TIME: Result<never> = { ok: false, error: 'Invalid time' }
const ERR_IPV4: Result<never> = { ok: false, error: 'Invalid IPv4 address' }
const ERR_IPV6: Result<never> = { ok: false, error: 'Invalid IPv6 address' }
const ERR_IP: Result<never> = { ok: false, error: 'Invalid IP address' }
const ERR_CUID: Result<never> = { ok: false, error: 'Invalid CUID' }
const ERR_CUID2: Result<never> = { ok: false, error: 'Invalid CUID2' }
const ERR_ULID: Result<never> = { ok: false, error: 'Invalid ULID' }
const ERR_BASE64: Result<never> = { ok: false, error: 'Invalid base64' }

/** Minimum length */
export const min = (n: number): Validator<string> => {
	const err: Result<never> = { ok: false, error: `Min ${n} chars` }
	return createValidator(
		(v) => {
			if (v.length < n) throw new ValidationError(`Min ${n} chars`)
			return v
		},
		(v) => (v.length >= n ? { ok: true, value: v } : err),
		{ type: 'minLength', constraints: { value: n, minLength: n } },
	)
}

/** Maximum length */
export const max = (n: number): Validator<string> => {
	const err: Result<never> = { ok: false, error: `Max ${n} chars` }
	return createValidator(
		(v) => {
			if (v.length > n) throw new ValidationError(`Max ${n} chars`)
			return v
		},
		(v) => (v.length <= n ? { ok: true, value: v } : err),
		{ type: 'maxLength', constraints: { value: n, maxLength: n } },
	)
}

/** Exact length */
export const len = (n: number): Validator<string> => {
	const err: Result<never> = { ok: false, error: `Must be ${n} chars` }
	return createValidator(
		(v) => {
			if (v.length !== n) throw new ValidationError(`Must be ${n} chars`)
			return v
		},
		(v) => (v.length === n ? { ok: true, value: v } : err),
		{ type: 'length', constraints: { value: n, length: n } },
	)
}

/** Non-empty string */
export const nonempty: Validator<string> = createValidator(
	(v) => {
		if (v.length === 0) throw new ValidationError('Required')
		return v
	},
	(v) => (v.length > 0 ? { ok: true, value: v } : ERR_REQUIRED),
	{ type: 'minLength', constraints: { value: 1, minLength: 1 } },
)

/** Alias: nonEmpty (Valibot compatibility) */
export { nonempty as nonEmpty }

/** Email format */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const email: Validator<string> = createValidator(
	(v) => {
		if (!EMAIL_RE.test(v)) throw new ValidationError('Invalid email')
		return v
	},
	(v) => (EMAIL_RE.test(v) ? { ok: true, value: v } : ERR_EMAIL),
	{ type: 'email', constraints: { format: 'email' } },
)

/** URL format */
const URL_RE = /^https?:\/\/.+/
export const url: Validator<string> = createValidator(
	(v) => {
		if (!URL_RE.test(v)) throw new ValidationError('Invalid URL')
		return v
	},
	(v) => (URL_RE.test(v) ? { ok: true, value: v } : ERR_URL),
	{ type: 'url', constraints: { format: 'uri' } },
)

/** UUID format */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const uuid: Validator<string> = createValidator(
	(v) => {
		if (!UUID_RE.test(v)) throw new ValidationError('Invalid UUID')
		return v
	},
	(v) => (UUID_RE.test(v) ? { ok: true, value: v } : ERR_UUID),
	{ type: 'uuid', constraints: { format: 'uuid' } },
)

/** Regex pattern */
export const pattern = (re: RegExp, msg = 'Invalid format'): Validator<string> => {
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (!re.test(v)) throw new ValidationError(msg)
			return v
		},
		(v) => (re.test(v) ? { ok: true, value: v } : err),
		{ type: 'pattern', constraints: { pattern: re.source } },
	)
}

/** Starts with prefix */
export const startsWith = (prefix: string): Validator<string> => {
	const msg = `Must start with "${prefix}"`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (!v.startsWith(prefix)) throw new ValidationError(msg)
			return v
		},
		(v) => (v.startsWith(prefix) ? { ok: true, value: v } : err),
		{ type: 'startsWith', constraints: { startsWith: prefix } },
	)
}

/** Ends with suffix */
export const endsWith = (suffix: string): Validator<string> => {
	const msg = `Must end with "${suffix}"`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (!v.endsWith(suffix)) throw new ValidationError(msg)
			return v
		},
		(v) => (v.endsWith(suffix) ? { ok: true, value: v } : err),
		{ type: 'endsWith', constraints: { endsWith: suffix } },
	)
}

/** Contains substring */
export const includes = (search: string): Validator<string> => {
	const msg = `Must include "${search}"`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (!v.includes(search)) throw new ValidationError(msg)
			return v
		},
		(v) => (v.includes(search) ? { ok: true, value: v } : err),
		{ type: 'includes', constraints: { includes: search } },
	)
}

// ============================================================
// DateTime Validators
// ============================================================

/** ISO 8601 datetime (e.g., 2024-01-15T10:30:00Z) */
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/
export const datetime: Validator<string> = createValidator(
	(v) => {
		if (!DATETIME_RE.test(v) || Number.isNaN(Date.parse(v)))
			throw new ValidationError('Invalid datetime')
		return v
	},
	(v) =>
		DATETIME_RE.test(v) && !Number.isNaN(Date.parse(v)) ? { ok: true, value: v } : ERR_DATETIME,
	{ type: 'datetime', constraints: { format: 'date-time' } },
)

/** ISO 8601 date only (e.g., 2024-01-15) */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
export const dateOnly: Validator<string> = createValidator(
	(v) => {
		if (!DATE_ONLY_RE.test(v) || Number.isNaN(Date.parse(v)))
			throw new ValidationError('Invalid date')
		return v
	},
	(v) =>
		DATE_ONLY_RE.test(v) && !Number.isNaN(Date.parse(v)) ? { ok: true, value: v } : ERR_DATE_ONLY,
	{ type: 'isoDate', constraints: { format: 'date' } },
)

/** ISO 8601 time only (e.g., 10:30:00) */
const TIME_RE = /^\d{2}:\d{2}:\d{2}(\.\d+)?$/
const isValidTime = (v: string): boolean => {
	if (!TIME_RE.test(v)) return false
	const parts = v.split(':').map(Number)
	const h = parts[0] ?? 99
	const m = parts[1] ?? 99
	const s = parts[2] ?? 99
	return h <= 23 && m <= 59 && s <= 59
}
export const time: Validator<string> = createValidator(
	(v) => {
		if (!isValidTime(v)) throw new ValidationError('Invalid time')
		return v
	},
	(v) => (isValidTime(v) ? { ok: true, value: v } : ERR_TIME),
	{ type: 'isoTime', constraints: { format: 'time' } },
)

// ============================================================
// IP Address Validators
// ============================================================

/** IPv4 address (e.g., 192.168.1.1) */
const DIGIT_RE = /^\d+$/
const isValidIPv4 = (v: string): boolean => {
	const parts = v.split('.')
	if (parts.length !== 4) return false
	for (const part of parts) {
		if (!DIGIT_RE.test(part)) return false
		const num = Number.parseInt(part, 10)
		if (num < 0 || num > 255) return false
		if (part.length > 1 && part[0] === '0') return false // no leading zeros
	}
	return true
}
export const ipv4: Validator<string> = createValidator(
	(v) => {
		if (!isValidIPv4(v)) throw new ValidationError('Invalid IPv4 address')
		return v
	},
	(v) => (isValidIPv4(v) ? { ok: true, value: v } : ERR_IPV4),
	{ type: 'ipv4', constraints: { format: 'ipv4' } },
)

/** IPv6 address (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334) */
const IPV6_RE =
	/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:){1,7}:$|^:([0-9a-fA-F]{1,4}:){1,7}$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(:[0-9a-fA-F]{1,4}){1,6}$|^:(:[0-9a-fA-F]{1,4}){1,7}$/
export const ipv6: Validator<string> = createValidator(
	(v) => {
		if (!IPV6_RE.test(v)) throw new ValidationError('Invalid IPv6 address')
		return v
	},
	(v) => (IPV6_RE.test(v) ? { ok: true, value: v } : ERR_IPV6),
	{ type: 'ipv6', constraints: { format: 'ipv6' } },
)

/** IP address (IPv4 or IPv6) */
export const ip: Validator<string> = createValidator(
	(v) => {
		if (!isValidIPv4(v) && !IPV6_RE.test(v)) throw new ValidationError('Invalid IP address')
		return v
	},
	(v) => (isValidIPv4(v) || IPV6_RE.test(v) ? { ok: true, value: v } : ERR_IP),
)

// ============================================================
// ID Format Validators
// ============================================================

/** CUID format (e.g., cjld2cjxh0000qzrmn831i7rn) */
const CUID_RE = /^c[a-z0-9]{24}$/
export const cuid: Validator<string> = createValidator(
	(v) => {
		if (!CUID_RE.test(v)) throw new ValidationError('Invalid CUID')
		return v
	},
	(v) => (CUID_RE.test(v) ? { ok: true, value: v } : ERR_CUID),
)

/** CUID2 format (variable length, lowercase) */
const CUID2_RE = /^[a-z][a-z0-9]{23,}$/
export const cuid2: Validator<string> = createValidator(
	(v) => {
		if (!CUID2_RE.test(v)) throw new ValidationError('Invalid CUID2')
		return v
	},
	(v) => (CUID2_RE.test(v) ? { ok: true, value: v } : ERR_CUID2),
)

/** ULID format (26 chars, Crockford base32) */
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/
export const ulid: Validator<string> = createValidator(
	(v) => {
		if (!ULID_RE.test(v)) throw new ValidationError('Invalid ULID')
		return v
	},
	(v) => (ULID_RE.test(v) ? { ok: true, value: v } : ERR_ULID),
)

/** Base64 string */
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
export const base64: Validator<string> = createValidator(
	(v) => {
		if (!BASE64_RE.test(v)) throw new ValidationError('Invalid base64')
		return v
	},
	(v) => (BASE64_RE.test(v) ? { ok: true, value: v } : ERR_BASE64),
)

// ============================================================
// Additional String Validators
// ============================================================

const ERR_HEX_COLOR: Result<never> = { ok: false, error: 'Invalid hex color' }
const ERR_HEX: Result<never> = { ok: false, error: 'Invalid hexadecimal' }
const ERR_NANOID: Result<never> = { ok: false, error: 'Invalid nanoid' }
const ERR_SLUG: Result<never> = { ok: false, error: 'Invalid slug' }
const ERR_MAC: Result<never> = { ok: false, error: 'Invalid MAC address' }
const ERR_MAC48: Result<never> = { ok: false, error: 'Invalid MAC-48 address' }
const ERR_MAC64: Result<never> = { ok: false, error: 'Invalid MAC-64 address' }
const ERR_CREDIT_CARD: Result<never> = { ok: false, error: 'Invalid credit card number' }
const ERR_BIC: Result<never> = { ok: false, error: 'Invalid BIC/SWIFT code' }
const ERR_IMEI: Result<never> = { ok: false, error: 'Invalid IMEI' }
const ERR_EMOJI: Result<never> = { ok: false, error: 'Invalid emoji' }
const ERR_DECIMAL: Result<never> = { ok: false, error: 'Invalid decimal' }
const ERR_DIGITS: Result<never> = { ok: false, error: 'Must contain only digits' }
const ERR_OCTAL: Result<never> = { ok: false, error: 'Invalid octal' }
const _ERR_HASH: Result<never> = { ok: false, error: 'Invalid hash' }

/** Hex color (e.g., #fff, #ffffff, #ffffffff) */
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
export const hexColor: Validator<string> = createValidator(
	(v) => {
		if (!HEX_COLOR_RE.test(v)) throw new ValidationError('Invalid hex color')
		return v
	},
	(v) => (HEX_COLOR_RE.test(v) ? { ok: true, value: v } : ERR_HEX_COLOR),
)

/** Hexadecimal string */
const HEX_RE = /^[0-9a-fA-F]+$/
export const hexadecimal: Validator<string> = createValidator(
	(v) => {
		if (!HEX_RE.test(v)) throw new ValidationError('Invalid hexadecimal')
		return v
	},
	(v) => (HEX_RE.test(v) ? { ok: true, value: v } : ERR_HEX),
)
/** Alias for hexadecimal */
export { hexadecimal as hex }

/** Nanoid format (21 chars by default, URL-safe alphabet) */
const NANOID_RE = /^[A-Za-z0-9_-]{21}$/
export const nanoid: Validator<string> = createValidator(
	(v) => {
		if (!NANOID_RE.test(v)) throw new ValidationError('Invalid nanoid')
		return v
	},
	(v) => (NANOID_RE.test(v) ? { ok: true, value: v } : ERR_NANOID),
)

/** URL slug (lowercase letters, numbers, hyphens) */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const slug: Validator<string> = createValidator(
	(v) => {
		if (!SLUG_RE.test(v)) throw new ValidationError('Invalid slug')
		return v
	},
	(v) => (SLUG_RE.test(v) ? { ok: true, value: v } : ERR_SLUG),
)

/** MAC-48 address (e.g., 00:1A:2B:3C:4D:5E or 00-1A-2B-3C-4D-5E) */
const MAC48_RE = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/
export const mac48: Validator<string> = createValidator(
	(v) => {
		if (!MAC48_RE.test(v)) throw new ValidationError('Invalid MAC-48 address')
		return v
	},
	(v) => (MAC48_RE.test(v) ? { ok: true, value: v } : ERR_MAC48),
)

/** MAC-64 address (EUI-64) */
const MAC64_RE = /^([0-9A-Fa-f]{2}[:-]){7}[0-9A-Fa-f]{2}$/
export const mac64: Validator<string> = createValidator(
	(v) => {
		if (!MAC64_RE.test(v)) throw new ValidationError('Invalid MAC-64 address')
		return v
	},
	(v) => (MAC64_RE.test(v) ? { ok: true, value: v } : ERR_MAC64),
)

/** MAC address (MAC-48 or MAC-64) */
export const mac: Validator<string> = createValidator(
	(v) => {
		if (!MAC48_RE.test(v) && !MAC64_RE.test(v)) throw new ValidationError('Invalid MAC address')
		return v
	},
	(v) => (MAC48_RE.test(v) || MAC64_RE.test(v) ? { ok: true, value: v } : ERR_MAC),
)

/** Credit card number (Luhn algorithm) */
const isValidCreditCard = (v: string): boolean => {
	const digits = v.replace(/\D/g, '')
	if (digits.length < 13 || digits.length > 19) return false

	// Luhn algorithm
	let sum = 0
	let isEven = false
	for (let i = digits.length - 1; i >= 0; i--) {
		let digit = Number.parseInt(digits.charAt(i), 10)
		if (isEven) {
			digit *= 2
			if (digit > 9) digit -= 9
		}
		sum += digit
		isEven = !isEven
	}
	return sum % 10 === 0
}
export const creditCard: Validator<string> = createValidator(
	(v) => {
		if (!isValidCreditCard(v)) throw new ValidationError('Invalid credit card number')
		return v
	},
	(v) => (isValidCreditCard(v) ? { ok: true, value: v } : ERR_CREDIT_CARD),
)

/** BIC/SWIFT code (e.g., DEUTDEFF, DEUTDEFF500) */
const BIC_RE = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/
export const bic: Validator<string> = createValidator(
	(v) => {
		if (!BIC_RE.test(v)) throw new ValidationError('Invalid BIC/SWIFT code')
		return v
	},
	(v) => (BIC_RE.test(v) ? { ok: true, value: v } : ERR_BIC),
)

/** IMEI (15 digits with Luhn check) */
const isValidIMEI = (v: string): boolean => {
	if (!/^\d{15}$/.test(v)) return false

	// Luhn algorithm
	let sum = 0
	for (let i = 0; i < 15; i++) {
		let digit = Number.parseInt(v.charAt(i), 10)
		if (i % 2 === 1) {
			digit *= 2
			if (digit > 9) digit -= 9
		}
		sum += digit
	}
	return sum % 10 === 0
}
export const imei: Validator<string> = createValidator(
	(v) => {
		if (!isValidIMEI(v)) throw new ValidationError('Invalid IMEI')
		return v
	},
	(v) => (isValidIMEI(v) ? { ok: true, value: v } : ERR_IMEI),
)

/** Emoji (single emoji or emoji sequence) */
const EMOJI_RE =
	/^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u
export const emoji: Validator<string> = createValidator(
	(v) => {
		if (!EMOJI_RE.test(v)) throw new ValidationError('Invalid emoji')
		return v
	},
	(v) => (EMOJI_RE.test(v) ? { ok: true, value: v } : ERR_EMOJI),
)

/** Decimal number string (e.g., "123.45", "-123.45") */
const DECIMAL_RE = /^-?\d+(\.\d+)?$/
export const decimal: Validator<string> = createValidator(
	(v) => {
		if (!DECIMAL_RE.test(v)) throw new ValidationError('Invalid decimal')
		return v
	},
	(v) => (DECIMAL_RE.test(v) ? { ok: true, value: v } : ERR_DECIMAL),
)

/** Digits only string */
const DIGITS_RE = /^\d+$/
export const digits: Validator<string> = createValidator(
	(v) => {
		if (!DIGITS_RE.test(v)) throw new ValidationError('Must contain only digits')
		return v
	},
	(v) => (DIGITS_RE.test(v) ? { ok: true, value: v } : ERR_DIGITS),
)

/** Octal string (e.g., "0o755", "755") */
const OCTAL_RE = /^(?:0o)?[0-7]+$/i
export const octal: Validator<string> = createValidator(
	(v) => {
		if (!OCTAL_RE.test(v)) throw new ValidationError('Invalid octal')
		return v
	},
	(v) => (OCTAL_RE.test(v) ? { ok: true, value: v } : ERR_OCTAL),
)

/** Hash validator factory for various hash types */
const HASH_LENGTHS: Record<string, number> = {
	md5: 32,
	md4: 32,
	sha1: 40,
	sha256: 64,
	sha384: 96,
	sha512: 128,
	ripemd128: 32,
	ripemd160: 40,
	tiger128: 32,
	tiger160: 40,
	tiger192: 48,
	crc32: 8,
	crc32b: 8,
	adler32: 8,
}

// Cache for hash regexes by length (avoids repeated regex compilation)
const HASH_REGEX_CACHE: Record<number, RegExp> = {}
const getHashRegex = (length: number): RegExp =>
	(HASH_REGEX_CACHE[length] ??= new RegExp(`^[a-f0-9]{${length}}$`, 'i'))

export const hash = (algorithm: keyof typeof HASH_LENGTHS): Validator<string> => {
	const length = HASH_LENGTHS[algorithm]
	const re = getHashRegex(length)
	const msg = `Invalid ${algorithm} hash`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (!re.test(v)) throw new ValidationError(msg)
			return v
		},
		(v) => (re.test(v) ? { ok: true, value: v } : err),
	)
}

// ============================================================
// Additional Validators for Valibot Parity
// ============================================================

const ERR_RFC_EMAIL: Result<never> = { ok: false, error: 'Invalid RFC 5322 email' }
const ERR_ISO_WEEK: Result<never> = { ok: false, error: 'Invalid ISO week' }
const ERR_IBAN: Result<never> = { ok: false, error: 'Invalid IBAN' }
const ERR_ISBN: Result<never> = { ok: false, error: 'Invalid ISBN' }
const ERR_EMPTY: Result<never> = { ok: false, error: 'Must be empty' }

/**
 * RFC 5322 compliant email validation (stricter than basic email)
 * Supports quoted strings, comments, IP addresses, etc.
 */
const RFC_EMAIL_RE =
	/^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i
export const rfcEmail: Validator<string> = createValidator(
	(v) => {
		if (!RFC_EMAIL_RE.test(v)) throw new ValidationError('Invalid RFC 5322 email')
		return v
	},
	(v) => (RFC_EMAIL_RE.test(v) ? { ok: true, value: v } : ERR_RFC_EMAIL),
)

/**
 * ISO 8601 week format (e.g., 2024-W01, 2024-W52)
 */
const ISO_WEEK_RE = /^\d{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])$/
export const isoWeek: Validator<string> = createValidator(
	(v) => {
		if (!ISO_WEEK_RE.test(v)) throw new ValidationError('Invalid ISO week')
		return v
	},
	(v) => (ISO_WEEK_RE.test(v) ? { ok: true, value: v } : ERR_ISO_WEEK),
)

/**
 * IBAN validation (International Bank Account Number)
 * Validates format and checksum using mod 97 algorithm
 */
const isValidIBAN = (v: string): boolean => {
	const iban = v.replace(/\s/g, '').toUpperCase()
	if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(iban)) return false

	// Move first 4 chars to end and convert letters to numbers
	const rearranged = iban.slice(4) + iban.slice(0, 4)
	const numericStr = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55))

	// Mod 97 calculation (handle large numbers by processing in chunks)
	let remainder = numericStr
	while (remainder.length > 2) {
		const block = remainder.slice(0, 9)
		remainder = (Number.parseInt(block, 10) % 97).toString() + remainder.slice(block.length)
	}
	return Number.parseInt(remainder, 10) % 97 === 1
}
export const iban: Validator<string> = createValidator(
	(v) => {
		if (!isValidIBAN(v)) throw new ValidationError('Invalid IBAN')
		return v
	},
	(v) => (isValidIBAN(v) ? { ok: true, value: v } : ERR_IBAN),
)

/**
 * ISBN validation (ISBN-10 or ISBN-13)
 * Validates format and checksum
 */
const isValidISBN = (v: string): boolean => {
	const isbn = v.replace(/[-\s]/g, '')

	// ISBN-10
	if (/^[0-9]{9}[0-9X]$/.test(isbn)) {
		let sum = 0
		for (let i = 0; i < 9; i++) {
			sum += Number.parseInt(isbn.charAt(i), 10) * (10 - i)
		}
		const last = isbn.charAt(9)
		sum += last === 'X' ? 10 : Number.parseInt(last, 10)
		return sum % 11 === 0
	}

	// ISBN-13
	if (/^[0-9]{13}$/.test(isbn)) {
		let sum = 0
		for (let i = 0; i < 13; i++) {
			sum += Number.parseInt(isbn.charAt(i), 10) * (i % 2 === 0 ? 1 : 3)
		}
		return sum % 10 === 0
	}

	return false
}
export const isbn: Validator<string> = createValidator(
	(v) => {
		if (!isValidISBN(v)) throw new ValidationError('Invalid ISBN')
		return v
	},
	(v) => (isValidISBN(v) ? { ok: true, value: v } : ERR_ISBN),
)

/** Empty string validator */
export const empty: Validator<string> = createValidator(
	(v) => {
		if (v.length !== 0) throw new ValidationError('Must be empty')
		return v
	},
	(v) => (v.length === 0 ? { ok: true, value: v } : ERR_EMPTY),
)

/** Alias for pattern - regex validation */
export { pattern as regex }

/** Alias for len - Valibot compatibility */
export { len as length }

/** Not length validator */
export const notLength = (n: number): Validator<string> => {
	const msg = `Must not be ${n} chars`
	const err: Result<never> = { ok: false, error: msg }
	return createValidator(
		(v) => {
			if (v.length === n) throw new ValidationError(msg)
			return v
		},
		(v) => (v.length !== n ? { ok: true, value: v } : err),
	)
}

// ============================================================
// ISO Date Aliases (Valibot compatibility)
// ============================================================

/** ISO date (alias for dateOnly) */
export { dateOnly as isoDate }

/** ISO datetime (alias for datetime) */
export { datetime as isoDateTime }

/** ISO time (alias for time) */
export { time as isoTime }

/** ISO timestamp - full precision datetime with timezone */
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/
const ERR_ISO_TIMESTAMP: Result<never> = { ok: false, error: 'Invalid ISO timestamp' }
export const isoTimestamp: Validator<string> = createValidator(
	(v) => {
		if (!ISO_TIMESTAMP_RE.test(v) || Number.isNaN(Date.parse(v)))
			throw new ValidationError('Invalid ISO timestamp')
		return v
	},
	(v) =>
		ISO_TIMESTAMP_RE.test(v) && !Number.isNaN(Date.parse(v))
			? { ok: true, value: v }
			: ERR_ISO_TIMESTAMP,
)

/** ISO time with seconds */
const ISO_TIME_SECOND_RE = /^\d{2}:\d{2}:\d{2}$/
const ERR_ISO_TIME_SECOND: Result<never> = { ok: false, error: 'Invalid ISO time' }
const isValidTimeSecond = (v: string): boolean => {
	if (!ISO_TIME_SECOND_RE.test(v)) return false
	const parts = v.split(':').map(Number)
	const h = parts[0] ?? 99
	const m = parts[1] ?? 99
	const s = parts[2] ?? 99
	return h <= 23 && m <= 59 && s <= 59
}
export const isoTimeSecond: Validator<string> = createValidator(
	(v) => {
		if (!isValidTimeSecond(v)) throw new ValidationError('Invalid ISO time')
		return v
	},
	(v) => (isValidTimeSecond(v) ? { ok: true, value: v } : ERR_ISO_TIME_SECOND),
)
