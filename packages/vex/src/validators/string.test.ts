// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import {
	base64,
	bic,
	creditCard,
	cuid,
	cuid2,
	dateOnly,
	datetime,
	decimal,
	digits,
	email,
	emoji,
	empty,
	endsWith,
	hash,
	hex,
	hexadecimal,
	hexColor,
	iban,
	imei,
	includes,
	ip,
	ipv4,
	ipv6,
	isbn,
	isoDate,
	isoDateTime,
	isoTime,
	isoTimeSecond,
	isoTimestamp,
	isoWeek,
	len,
	length,
	mac,
	mac48,
	mac64,
	max,
	min,
	nanoid,
	nonEmpty,
	nonempty,
	notLength,
	octal,
	pattern,
	regex,
	rfcEmail,
	slug,
	startsWith,
	time,
	ulid,
	url,
	uuid,
} from './string'

describe('String Validators', () => {
	describe('length validators', () => {
		test('min validates minimum length', () => {
			expect(min(3)('abc')).toBe('abc')
			expect(min(3)('abcd')).toBe('abcd')
			expect(() => min(3)('ab')).toThrow('Min 3 chars')
		})

		test('min safe mode', () => {
			expect(min(3).safe!('abc')).toEqual({ ok: true, value: 'abc' })
			expect(min(3).safe!('ab')).toEqual({ ok: false, error: 'Min 3 chars' })
		})

		test('max validates maximum length', () => {
			expect(max(3)('abc')).toBe('abc')
			expect(max(3)('ab')).toBe('ab')
			expect(() => max(3)('abcd')).toThrow('Max 3 chars')
		})

		test('max safe mode', () => {
			expect(max(3).safe!('abc')).toEqual({ ok: true, value: 'abc' })
			expect(max(3).safe!('abcd')).toEqual({ ok: false, error: 'Max 3 chars' })
		})

		test('len validates exact length', () => {
			expect(len(3)('abc')).toBe('abc')
			expect(() => len(3)('ab')).toThrow('Must be 3 chars')
			expect(() => len(3)('abcd')).toThrow('Must be 3 chars')
		})

		test('len safe mode', () => {
			expect(len(3).safe!('abc')).toEqual({ ok: true, value: 'abc' })
			expect(len(3).safe!('ab')).toEqual({ ok: false, error: 'Must be 3 chars' })
		})

		test('length is alias for len', () => {
			expect(length).toBe(len)
		})

		test('nonempty validates non-empty string', () => {
			expect(nonempty('hello')).toBe('hello')
			expect(() => nonempty('')).toThrow('Required')
		})

		test('nonempty safe mode', () => {
			expect(nonempty.safe!('hello')).toEqual({ ok: true, value: 'hello' })
			expect(nonempty.safe!('')).toEqual({ ok: false, error: 'Required' })
		})

		test('nonEmpty is alias for nonempty', () => {
			expect(nonEmpty).toBe(nonempty)
		})

		test('empty validates empty string', () => {
			expect(empty('')).toBe('')
			expect(() => empty('hello')).toThrow('Must be empty')
		})

		test('empty safe mode', () => {
			expect(empty.safe!('')).toEqual({ ok: true, value: '' })
			expect(empty.safe!('hello')).toEqual({ ok: false, error: 'Must be empty' })
		})

		test('notLength validates non-matching length', () => {
			expect(notLength(3)('ab')).toBe('ab')
			expect(notLength(3)('abcd')).toBe('abcd')
			expect(() => notLength(3)('abc')).toThrow('Must not be 3 chars')
		})

		test('notLength safe mode', () => {
			expect(notLength(3).safe!('ab')).toEqual({ ok: true, value: 'ab' })
			expect(notLength(3).safe!('abc')).toEqual({ ok: false, error: 'Must not be 3 chars' })
		})
	})

	describe('format validators', () => {
		test('email validates email format', () => {
			expect(email('test@example.com')).toBe('test@example.com')
			expect(email('user.name@domain.org')).toBe('user.name@domain.org')
			expect(() => email('invalid')).toThrow('Invalid email')
			expect(() => email('missing@domain')).toThrow('Invalid email')
		})

		test('email safe mode', () => {
			expect(email.safe!('test@example.com')).toEqual({ ok: true, value: 'test@example.com' })
			expect(email.safe!('invalid')).toEqual({ ok: false, error: 'Invalid email' })
		})

		test('url validates URL format', () => {
			expect(url('https://example.com')).toBe('https://example.com')
			expect(url('http://localhost:3000')).toBe('http://localhost:3000')
			expect(() => url('not-a-url')).toThrow('Invalid URL')
			expect(() => url('ftp://invalid')).toThrow('Invalid URL')
		})

		test('url safe mode', () => {
			expect(url.safe!('https://example.com')).toEqual({ ok: true, value: 'https://example.com' })
			expect(url.safe!('ftp://invalid')).toEqual({ ok: false, error: 'Invalid URL' })
		})

		test('uuid validates UUID format', () => {
			expect(uuid('123e4567-e89b-12d3-a456-426614174000')).toBeTruthy()
			expect(uuid('550e8400-e29b-41d4-a716-446655440000')).toBeTruthy()
			expect(() => uuid('invalid')).toThrow('Invalid UUID')
			expect(() => uuid('123e4567-e89b-12d3-a456')).toThrow('Invalid UUID')
		})

		test('uuid safe mode', () => {
			expect(uuid.safe!('123e4567-e89b-12d3-a456-426614174000')).toEqual({
				ok: true,
				value: '123e4567-e89b-12d3-a456-426614174000',
			})
			expect(uuid.safe!('invalid')).toEqual({ ok: false, error: 'Invalid UUID' })
		})

		test('pattern validates regex pattern', () => {
			expect(pattern(/^[A-Z]+$/)('ABC')).toBe('ABC')
			expect(() => pattern(/^[A-Z]+$/)('abc')).toThrow('Invalid format')

			const customMsg = pattern(/^\d+$/, 'Must be digits only')
			expect(customMsg('123')).toBe('123')
			expect(() => customMsg('abc')).toThrow('Must be digits only')
		})

		test('pattern safe mode', () => {
			expect(pattern(/^[A-Z]+$/).safe!('ABC')).toEqual({ ok: true, value: 'ABC' })
			expect(pattern(/^[A-Z]+$/).safe!('abc')).toEqual({ ok: false, error: 'Invalid format' })
		})

		test('regex is alias for pattern', () => {
			expect(regex).toBe(pattern)
		})
	})

	describe('substring validators', () => {
		test('startsWith validates prefix', () => {
			expect(startsWith('hello')('hello world')).toBe('hello world')
			expect(() => startsWith('hello')('hi world')).toThrow('Must start with "hello"')
		})

		test('startsWith safe mode', () => {
			expect(startsWith('hello').safe!('hello world')).toEqual({ ok: true, value: 'hello world' })
			expect(startsWith('hello').safe!('hi world')).toEqual({
				ok: false,
				error: 'Must start with "hello"',
			})
		})

		test('endsWith validates suffix', () => {
			expect(endsWith('world')('hello world')).toBe('hello world')
			expect(() => endsWith('world')('hello there')).toThrow('Must end with "world"')
		})

		test('endsWith safe mode', () => {
			expect(endsWith('world').safe!('hello world')).toEqual({ ok: true, value: 'hello world' })
			expect(endsWith('world').safe!('hello there')).toEqual({
				ok: false,
				error: 'Must end with "world"',
			})
		})

		test('includes validates substring', () => {
			expect(includes('o w')('hello world')).toBe('hello world')
			expect(() => includes('xyz')('hello world')).toThrow('Must include "xyz"')
		})

		test('includes safe mode', () => {
			expect(includes('o w').safe!('hello world')).toEqual({ ok: true, value: 'hello world' })
			expect(includes('xyz').safe!('hello world')).toEqual({
				ok: false,
				error: 'Must include "xyz"',
			})
		})
	})

	describe('datetime validators', () => {
		test('datetime validates ISO 8601 datetime', () => {
			expect(datetime('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z')
			expect(datetime('2024-01-15T10:30:00.123Z')).toBe('2024-01-15T10:30:00.123Z')
			expect(datetime('2024-01-15T10:30:00+05:30')).toBe('2024-01-15T10:30:00+05:30')
			expect(() => datetime('invalid')).toThrow('Invalid datetime')
			expect(() => datetime('2024-01-15')).toThrow('Invalid datetime')
		})

		test('datetime safe mode', () => {
			expect(datetime.safe!('2024-01-15T10:30:00Z')).toEqual({
				ok: true,
				value: '2024-01-15T10:30:00Z',
			})
			expect(datetime.safe!('invalid')).toEqual({ ok: false, error: 'Invalid datetime' })
		})

		test('isoDateTime is alias for datetime', () => {
			expect(isoDateTime).toBe(datetime)
		})

		test('dateOnly validates ISO 8601 date', () => {
			expect(dateOnly('2024-01-15')).toBe('2024-01-15')
			expect(dateOnly('2000-12-31')).toBe('2000-12-31')
			expect(() => dateOnly('invalid')).toThrow('Invalid date')
			expect(() => dateOnly('2024-01-15T10:30:00Z')).toThrow('Invalid date')
		})

		test('dateOnly safe mode', () => {
			expect(dateOnly.safe!('2024-01-15')).toEqual({ ok: true, value: '2024-01-15' })
			expect(dateOnly.safe!('invalid')).toEqual({ ok: false, error: 'Invalid date' })
		})

		test('isoDate is alias for dateOnly', () => {
			expect(isoDate).toBe(dateOnly)
		})

		test('time validates ISO 8601 time', () => {
			expect(time('10:30:00')).toBe('10:30:00')
			expect(time('23:59:59')).toBe('23:59:59')
			expect(time('00:00:00')).toBe('00:00:00')
			expect(time('10:30:00.123')).toBe('10:30:00.123')
			expect(() => time('invalid')).toThrow('Invalid time')
			expect(() => time('25:00:00')).toThrow('Invalid time')
			expect(() => time('10:60:00')).toThrow('Invalid time')
			expect(() => time('10:30:60')).toThrow('Invalid time')
		})

		test('time safe mode', () => {
			expect(time.safe!('10:30:00')).toEqual({ ok: true, value: '10:30:00' })
			expect(time.safe!('invalid')).toEqual({ ok: false, error: 'Invalid time' })
		})

		test('isoTime is alias for time', () => {
			expect(isoTime).toBe(time)
		})

		test('isoTimestamp validates full precision datetime', () => {
			expect(isoTimestamp('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z')
			expect(isoTimestamp('2024-01-15T10:30:00.123456789Z')).toBe('2024-01-15T10:30:00.123456789Z')
			expect(isoTimestamp('2024-01-15T10:30:00+05:30')).toBe('2024-01-15T10:30:00+05:30')
			expect(() => isoTimestamp('2024-01-15T10:30:00')).toThrow('Invalid ISO timestamp')
			expect(() => isoTimestamp('invalid')).toThrow('Invalid ISO timestamp')
		})

		test('isoTimestamp safe mode', () => {
			expect(isoTimestamp.safe!('2024-01-15T10:30:00Z')).toEqual({
				ok: true,
				value: '2024-01-15T10:30:00Z',
			})
			expect(isoTimestamp.safe!('invalid')).toEqual({ ok: false, error: 'Invalid ISO timestamp' })
		})

		test('isoTimeSecond validates time with seconds', () => {
			expect(isoTimeSecond('10:30:00')).toBe('10:30:00')
			expect(isoTimeSecond('23:59:59')).toBe('23:59:59')
			expect(() => isoTimeSecond('10:30')).toThrow('Invalid ISO time')
			expect(() => isoTimeSecond('25:00:00')).toThrow('Invalid ISO time')
		})

		test('isoTimeSecond safe mode', () => {
			expect(isoTimeSecond.safe!('10:30:00')).toEqual({ ok: true, value: '10:30:00' })
			expect(isoTimeSecond.safe!('invalid')).toEqual({ ok: false, error: 'Invalid ISO time' })
		})

		test('isoWeek validates ISO week format', () => {
			expect(isoWeek('2024-W01')).toBe('2024-W01')
			expect(isoWeek('2024-W52')).toBe('2024-W52')
			expect(isoWeek('2024-W53')).toBe('2024-W53')
			expect(() => isoWeek('2024-W00')).toThrow('Invalid ISO week')
			expect(() => isoWeek('2024-W54')).toThrow('Invalid ISO week')
			expect(() => isoWeek('invalid')).toThrow('Invalid ISO week')
		})

		test('isoWeek safe mode', () => {
			expect(isoWeek.safe!('2024-W01')).toEqual({ ok: true, value: '2024-W01' })
			expect(isoWeek.safe!('invalid')).toEqual({ ok: false, error: 'Invalid ISO week' })
		})
	})

	describe('IP address validators', () => {
		test('ipv4 validates IPv4 addresses', () => {
			expect(ipv4('192.168.1.1')).toBe('192.168.1.1')
			expect(ipv4('0.0.0.0')).toBe('0.0.0.0')
			expect(ipv4('255.255.255.255')).toBe('255.255.255.255')
			expect(() => ipv4('256.1.1.1')).toThrow('Invalid IPv4 address')
			expect(() => ipv4('1.1.1')).toThrow('Invalid IPv4 address')
			expect(() => ipv4('01.1.1.1')).toThrow('Invalid IPv4 address') // no leading zeros
			expect(() => ipv4('invalid')).toThrow('Invalid IPv4 address')
		})

		test('ipv4 safe mode', () => {
			expect(ipv4.safe!('192.168.1.1')).toEqual({ ok: true, value: '192.168.1.1' })
			expect(ipv4.safe!('invalid')).toEqual({ ok: false, error: 'Invalid IPv4 address' })
		})

		test('ipv6 validates IPv6 addresses', () => {
			expect(ipv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
			expect(ipv6('::1')).toBe('::1')
			expect(ipv6('::')).toBe('::')
			expect(ipv6('fe80::')).toBe('fe80::')
			expect(() => ipv6('invalid')).toThrow('Invalid IPv6 address')
			expect(() => ipv6('192.168.1.1')).toThrow('Invalid IPv6 address')
		})

		test('ipv6 safe mode', () => {
			expect(ipv6.safe!('::1')).toEqual({ ok: true, value: '::1' })
			expect(ipv6.safe!('invalid')).toEqual({ ok: false, error: 'Invalid IPv6 address' })
		})

		test('ip validates both IPv4 and IPv6', () => {
			expect(ip('192.168.1.1')).toBe('192.168.1.1')
			expect(ip('::1')).toBe('::1')
			expect(() => ip('invalid')).toThrow('Invalid IP address')
		})

		test('ip safe mode', () => {
			expect(ip.safe!('192.168.1.1')).toEqual({ ok: true, value: '192.168.1.1' })
			expect(ip.safe!('::1')).toEqual({ ok: true, value: '::1' })
			expect(ip.safe!('invalid')).toEqual({ ok: false, error: 'Invalid IP address' })
		})
	})

	describe('ID format validators', () => {
		test('cuid validates CUID format', () => {
			expect(cuid('cjld2cjxh0000qzrmn831i7rn')).toBe('cjld2cjxh0000qzrmn831i7rn')
			expect(() => cuid('invalid')).toThrow('Invalid CUID')
			expect(() => cuid('xjld2cjxh0000qzrmn831i7rn')).toThrow('Invalid CUID') // must start with 'c'
		})

		test('cuid safe mode', () => {
			expect(cuid.safe!('cjld2cjxh0000qzrmn831i7rn')).toEqual({
				ok: true,
				value: 'cjld2cjxh0000qzrmn831i7rn',
			})
			expect(cuid.safe!('invalid')).toEqual({ ok: false, error: 'Invalid CUID' })
		})

		test('cuid2 validates CUID2 format', () => {
			expect(cuid2('tz4a98xxat96iws9zmbrgj3a')).toBe('tz4a98xxat96iws9zmbrgj3a')
			expect(() => cuid2('invalid')).toThrow('Invalid CUID2')
			expect(() => cuid2('1z4a98xxat96iws9zmbrgj3a')).toThrow('Invalid CUID2') // must start with letter
		})

		test('cuid2 safe mode', () => {
			expect(cuid2.safe!('tz4a98xxat96iws9zmbrgj3a')).toEqual({
				ok: true,
				value: 'tz4a98xxat96iws9zmbrgj3a',
			})
			expect(cuid2.safe!('invalid')).toEqual({ ok: false, error: 'Invalid CUID2' })
		})

		test('ulid validates ULID format', () => {
			expect(ulid('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV')
			expect(() => ulid('invalid')).toThrow('Invalid ULID')
			expect(() => ulid('01ARZ3NDEKTSV4RRFFQ69G5FA')).toThrow('Invalid ULID') // 25 chars, need 26
		})

		test('ulid safe mode', () => {
			expect(ulid.safe!('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toEqual({
				ok: true,
				value: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
			})
			expect(ulid.safe!('invalid')).toEqual({ ok: false, error: 'Invalid ULID' })
		})

		test('nanoid validates nanoid format', () => {
			expect(nanoid('V1StGXR8_Z5jdHi6B-myT')).toBe('V1StGXR8_Z5jdHi6B-myT')
			expect(() => nanoid('invalid')).toThrow('Invalid nanoid')
			expect(() => nanoid('V1StGXR8_Z5jdHi6B-my')).toThrow('Invalid nanoid') // 20 chars, need 21
		})

		test('nanoid safe mode', () => {
			expect(nanoid.safe!('V1StGXR8_Z5jdHi6B-myT')).toEqual({
				ok: true,
				value: 'V1StGXR8_Z5jdHi6B-myT',
			})
			expect(nanoid.safe!('invalid')).toEqual({ ok: false, error: 'Invalid nanoid' })
		})
	})

	describe('encoding validators', () => {
		test('base64 validates base64 strings', () => {
			expect(base64('SGVsbG8gV29ybGQ=')).toBe('SGVsbG8gV29ybGQ=')
			expect(base64('YWJj')).toBe('YWJj')
			expect(base64('')).toBe('')
			expect(() => base64('not valid!')).toThrow('Invalid base64')
		})

		test('base64 safe mode', () => {
			expect(base64.safe!('SGVsbG8=')).toEqual({ ok: true, value: 'SGVsbG8=' })
			expect(base64.safe!('invalid!')).toEqual({ ok: false, error: 'Invalid base64' })
		})

		test('hexadecimal validates hex strings', () => {
			expect(hexadecimal('deadbeef')).toBe('deadbeef')
			expect(hexadecimal('DEADBEEF')).toBe('DEADBEEF')
			expect(hexadecimal('123abc')).toBe('123abc')
			expect(() => hexadecimal('ghijk')).toThrow('Invalid hexadecimal')
		})

		test('hexadecimal safe mode', () => {
			expect(hexadecimal.safe!('deadbeef')).toEqual({ ok: true, value: 'deadbeef' })
			expect(hexadecimal.safe!('ghijk')).toEqual({ ok: false, error: 'Invalid hexadecimal' })
		})

		test('hex is alias for hexadecimal', () => {
			expect(hex).toBe(hexadecimal)
		})

		test('hexColor validates hex color codes', () => {
			expect(hexColor('#fff')).toBe('#fff')
			expect(hexColor('#ffffff')).toBe('#ffffff')
			expect(hexColor('#FFFFFF')).toBe('#FFFFFF')
			expect(hexColor('#ffff')).toBe('#ffff') // with alpha (4 chars)
			expect(hexColor('#ffffffff')).toBe('#ffffffff') // with alpha (8 chars)
			expect(() => hexColor('ffffff')).toThrow('Invalid hex color') // missing #
			expect(() => hexColor('#ff')).toThrow('Invalid hex color')
		})

		test('hexColor safe mode', () => {
			expect(hexColor.safe!('#fff')).toEqual({ ok: true, value: '#fff' })
			expect(hexColor.safe!('invalid')).toEqual({ ok: false, error: 'Invalid hex color' })
		})
	})

	describe('numeric string validators', () => {
		test('decimal validates decimal number strings', () => {
			expect(decimal('123')).toBe('123')
			expect(decimal('123.45')).toBe('123.45')
			expect(decimal('-123.45')).toBe('-123.45')
			expect(() => decimal('abc')).toThrow('Invalid decimal')
			expect(() => decimal('12.34.56')).toThrow('Invalid decimal')
		})

		test('decimal safe mode', () => {
			expect(decimal.safe!('123.45')).toEqual({ ok: true, value: '123.45' })
			expect(decimal.safe!('abc')).toEqual({ ok: false, error: 'Invalid decimal' })
		})

		test('digits validates digit-only strings', () => {
			expect(digits('12345')).toBe('12345')
			expect(digits('0')).toBe('0')
			expect(() => digits('123.45')).toThrow('Must contain only digits')
			expect(() => digits('abc')).toThrow('Must contain only digits')
			expect(() => digits('-123')).toThrow('Must contain only digits')
		})

		test('digits safe mode', () => {
			expect(digits.safe!('12345')).toEqual({ ok: true, value: '12345' })
			expect(digits.safe!('abc')).toEqual({ ok: false, error: 'Must contain only digits' })
		})

		test('octal validates octal strings', () => {
			expect(octal('755')).toBe('755')
			expect(octal('0o755')).toBe('0o755')
			expect(octal('0O755')).toBe('0O755')
			expect(() => octal('789')).toThrow('Invalid octal') // 8 and 9 are not octal
			expect(() => octal('abc')).toThrow('Invalid octal')
		})

		test('octal safe mode', () => {
			expect(octal.safe!('755')).toEqual({ ok: true, value: '755' })
			expect(octal.safe!('abc')).toEqual({ ok: false, error: 'Invalid octal' })
		})
	})

	describe('slug validator', () => {
		test('slug validates URL-safe slugs', () => {
			expect(slug('hello-world')).toBe('hello-world')
			expect(slug('my-post-123')).toBe('my-post-123')
			expect(slug('single')).toBe('single')
			expect(() => slug('Hello-World')).toThrow('Invalid slug') // uppercase
			expect(() => slug('hello_world')).toThrow('Invalid slug') // underscore
			expect(() => slug('-hello')).toThrow('Invalid slug') // starts with hyphen
			expect(() => slug('hello-')).toThrow('Invalid slug') // ends with hyphen
		})

		test('slug safe mode', () => {
			expect(slug.safe!('hello-world')).toEqual({ ok: true, value: 'hello-world' })
			expect(slug.safe!('invalid slug')).toEqual({ ok: false, error: 'Invalid slug' })
		})
	})

	describe('MAC address validators', () => {
		test('mac48 validates MAC-48 addresses', () => {
			expect(mac48('00:1A:2B:3C:4D:5E')).toBe('00:1A:2B:3C:4D:5E')
			expect(mac48('00-1A-2B-3C-4D-5E')).toBe('00-1A-2B-3C-4D-5E')
			expect(() => mac48('invalid')).toThrow('Invalid MAC-48 address')
			expect(() => mac48('00:1A:2B:3C:4D')).toThrow('Invalid MAC-48 address')
		})

		test('mac48 safe mode', () => {
			expect(mac48.safe!('00:1A:2B:3C:4D:5E')).toEqual({ ok: true, value: '00:1A:2B:3C:4D:5E' })
			expect(mac48.safe!('invalid')).toEqual({ ok: false, error: 'Invalid MAC-48 address' })
		})

		test('mac64 validates MAC-64/EUI-64 addresses', () => {
			expect(mac64('00:1A:2B:FF:FE:3C:4D:5E')).toBe('00:1A:2B:FF:FE:3C:4D:5E')
			expect(mac64('00-1A-2B-FF-FE-3C-4D-5E')).toBe('00-1A-2B-FF-FE-3C-4D-5E')
			expect(() => mac64('invalid')).toThrow('Invalid MAC-64 address')
			expect(() => mac64('00:1A:2B:3C:4D:5E')).toThrow('Invalid MAC-64 address') // MAC-48
		})

		test('mac64 safe mode', () => {
			expect(mac64.safe!('00:1A:2B:FF:FE:3C:4D:5E')).toEqual({
				ok: true,
				value: '00:1A:2B:FF:FE:3C:4D:5E',
			})
			expect(mac64.safe!('invalid')).toEqual({ ok: false, error: 'Invalid MAC-64 address' })
		})

		test('mac validates both MAC-48 and MAC-64', () => {
			expect(mac('00:1A:2B:3C:4D:5E')).toBe('00:1A:2B:3C:4D:5E')
			expect(mac('00:1A:2B:FF:FE:3C:4D:5E')).toBe('00:1A:2B:FF:FE:3C:4D:5E')
			expect(() => mac('invalid')).toThrow('Invalid MAC address')
		})

		test('mac safe mode', () => {
			expect(mac.safe!('00:1A:2B:3C:4D:5E')).toEqual({ ok: true, value: '00:1A:2B:3C:4D:5E' })
			expect(mac.safe!('00:1A:2B:FF:FE:3C:4D:5E')).toEqual({
				ok: true,
				value: '00:1A:2B:FF:FE:3C:4D:5E',
			})
			expect(mac.safe!('invalid')).toEqual({ ok: false, error: 'Invalid MAC address' })
		})
	})

	describe('financial validators', () => {
		test('creditCard validates credit card numbers with Luhn', () => {
			expect(creditCard('4111111111111111')).toBe('4111111111111111') // Visa test card
			expect(creditCard('5500000000000004')).toBe('5500000000000004') // Mastercard test
			expect(creditCard('4111-1111-1111-1111')).toBe('4111-1111-1111-1111') // with dashes
			expect(() => creditCard('1234567890123456')).toThrow('Invalid credit card number')
			expect(() => creditCard('invalid')).toThrow('Invalid credit card number')
		})

		test('creditCard safe mode', () => {
			expect(creditCard.safe!('4111111111111111')).toEqual({
				ok: true,
				value: '4111111111111111',
			})
			expect(creditCard.safe!('invalid')).toEqual({ ok: false, error: 'Invalid credit card number' })
		})

		test('bic validates BIC/SWIFT codes', () => {
			expect(bic('DEUTDEFF')).toBe('DEUTDEFF')
			expect(bic('DEUTDEFF500')).toBe('DEUTDEFF500')
			expect(() => bic('invalid')).toThrow('Invalid BIC/SWIFT code')
			expect(() => bic('DEUT')).toThrow('Invalid BIC/SWIFT code')
		})

		test('bic safe mode', () => {
			expect(bic.safe!('DEUTDEFF')).toEqual({ ok: true, value: 'DEUTDEFF' })
			expect(bic.safe!('invalid')).toEqual({ ok: false, error: 'Invalid BIC/SWIFT code' })
		})

		test('iban validates IBAN with checksum', () => {
			expect(iban('DE89370400440532013000')).toBe('DE89370400440532013000')
			expect(iban('GB82 WEST 1234 5698 7654 32')).toBe('GB82 WEST 1234 5698 7654 32') // with spaces
			expect(() => iban('invalid')).toThrow('Invalid IBAN')
			expect(() => iban('DE00000000000000000000')).toThrow('Invalid IBAN') // invalid checksum
		})

		test('iban safe mode', () => {
			expect(iban.safe!('DE89370400440532013000')).toEqual({
				ok: true,
				value: 'DE89370400440532013000',
			})
			expect(iban.safe!('invalid')).toEqual({ ok: false, error: 'Invalid IBAN' })
		})
	})

	describe('book validators', () => {
		test('isbn validates ISBN-10 and ISBN-13', () => {
			expect(isbn('0-306-40615-2')).toBe('0-306-40615-2') // ISBN-10
			expect(isbn('978-3-16-148410-0')).toBe('978-3-16-148410-0') // ISBN-13
			expect(isbn('080442957X')).toBe('080442957X') // ISBN-10 with X
			expect(() => isbn('invalid')).toThrow('Invalid ISBN')
			expect(() => isbn('1234567890')).toThrow('Invalid ISBN') // invalid checksum
		})

		test('isbn safe mode', () => {
			expect(isbn.safe!('978-3-16-148410-0')).toEqual({ ok: true, value: '978-3-16-148410-0' })
			expect(isbn.safe!('invalid')).toEqual({ ok: false, error: 'Invalid ISBN' })
		})
	})

	describe('device validators', () => {
		test('imei validates IMEI numbers with Luhn', () => {
			expect(imei('490154203237518')).toBe('490154203237518')
			expect(() => imei('123456789012345')).toThrow('Invalid IMEI')
			expect(() => imei('invalid')).toThrow('Invalid IMEI')
			expect(() => imei('49015420323751')).toThrow('Invalid IMEI') // 14 digits
		})

		test('imei safe mode', () => {
			expect(imei.safe!('490154203237518')).toEqual({ ok: true, value: '490154203237518' })
			expect(imei.safe!('invalid')).toEqual({ ok: false, error: 'Invalid IMEI' })
		})
	})

	describe('emoji validator', () => {
		test('emoji validates emoji characters', () => {
			expect(emoji('😀')).toBe('😀')
			expect(emoji('👨‍👩‍👧‍👦')).toBe('👨‍👩‍👧‍👦') // family emoji (ZWJ sequence)
			expect(emoji('❤️')).toBe('❤️') // heart with variation selector
			expect(() => emoji('hello')).toThrow('Invalid emoji')
			expect(() => emoji('')).toThrow('Invalid emoji')
		})

		test('emoji safe mode', () => {
			expect(emoji.safe!('😀')).toEqual({ ok: true, value: '😀' })
			expect(emoji.safe!('hello')).toEqual({ ok: false, error: 'Invalid emoji' })
		})
	})

	describe('hash validator', () => {
		test('hash validates MD5 hashes', () => {
			const md5 = hash('md5')
			expect(md5('d41d8cd98f00b204e9800998ecf8427e')).toBe('d41d8cd98f00b204e9800998ecf8427e')
			expect(() => md5('invalid')).toThrow('Invalid md5 hash')
		})

		test('hash validates SHA-1 hashes', () => {
			const sha1 = hash('sha1')
			expect(sha1('da39a3ee5e6b4b0d3255bfef95601890afd80709')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
			expect(() => sha1('invalid')).toThrow('Invalid sha1 hash')
		})

		test('hash validates SHA-256 hashes', () => {
			const sha256 = hash('sha256')
			expect(sha256('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBeTruthy()
			expect(() => sha256('invalid')).toThrow('Invalid sha256 hash')
		})

		test('hash validates SHA-512 hashes', () => {
			const sha512 = hash('sha512')
			expect(
				sha512(
					'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
				),
			).toBeTruthy()
			expect(() => sha512('invalid')).toThrow('Invalid sha512 hash')
		})

		test('hash validates CRC32 hashes', () => {
			const crc32 = hash('crc32')
			expect(crc32('00000000')).toBe('00000000')
			expect(() => crc32('invalid')).toThrow('Invalid crc32 hash')
		})

		test('hash safe mode', () => {
			const md5 = hash('md5')
			expect(md5.safe!('d41d8cd98f00b204e9800998ecf8427e')).toEqual({
				ok: true,
				value: 'd41d8cd98f00b204e9800998ecf8427e',
			})
			expect(md5.safe!('invalid')).toEqual({ ok: false, error: 'Invalid md5 hash' })
		})
	})

	describe('RFC email validator', () => {
		test('rfcEmail validates RFC 5322 compliant emails', () => {
			expect(rfcEmail('test@example.com')).toBe('test@example.com')
			expect(rfcEmail('user.name+tag@example.co.uk')).toBe('user.name+tag@example.co.uk')
			expect(() => rfcEmail('invalid')).toThrow('Invalid RFC 5322 email')
		})

		test('rfcEmail safe mode', () => {
			expect(rfcEmail.safe!('test@example.com')).toEqual({ ok: true, value: 'test@example.com' })
			expect(rfcEmail.safe!('invalid')).toEqual({ ok: false, error: 'Invalid RFC 5322 email' })
		})
	})

	describe('Standard Schema support', () => {
		test('validators have ~standard property', () => {
			expect(min(3)['~standard']).toBeDefined()
			expect(min(3)['~standard']?.version).toBe(1)
			expect(min(3)['~standard']?.vendor).toBe('vex')
		})

		test('~standard validate returns value on success', () => {
			const result = min(3)['~standard']!.validate('abc')
			expect(result).toEqual({ value: 'abc' })
		})

		test('~standard validate returns issues on failure', () => {
			const result = min(3)['~standard']!.validate('ab')
			expect(result.issues).toBeDefined()
			expect(result.issues![0].message).toBe('Min 3 chars')
		})
	})
})
