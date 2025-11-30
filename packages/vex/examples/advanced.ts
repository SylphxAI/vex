// ============================================================
// Advanced Usage Examples
// ============================================================

import {
	array,
	email,
	endsWith,
	gte,
	includes,
	int,
	lower,
	lte,
	max,
	min,
	multipleOf,
	nonempty,
	nullable,
	num,
	object,
	optional,
	type Parser,
	pattern,
	pipe,
	positive,
	safeParse,
	startsWith,
	str,
	toFloat,
	toInt,
	trim,
	uuid,
	ValidationError,
	type Validator,
	withDefault,
} from '../src'

// ============================================================
// 1. Custom Validators
// ============================================================

console.log('=== Custom Validators ===')

// Custom validator function
const hex: Validator<string> = (v) => {
	if (!/^[0-9a-fA-F]+$/.test(v)) {
		throw new ValidationError('Must be hexadecimal')
	}
	return v
}

const validateHexColor = pipe(str, min(6), max(6), hex)
console.log('Hex color:', validateHexColor('ff00aa'))

// Custom with parameter
const divisibleBy =
	(n: number): Validator<number> =>
	(v) => {
		if (v % n !== 0) throw new ValidationError(`Must be divisible by ${n}`)
		return v
	}

const validateEven = pipe(num, int, divisibleBy(2))
console.log('Even number:', validateEven(42))

// ============================================================
// 2. Transforms
// ============================================================

console.log('\n=== Transforms ===')

// Trim and lowercase email
const normalizeEmail = pipe(str, trim, lower, email)
console.log('Normalized:', normalizeEmail('  USER@EXAMPLE.COM  '))
// 'user@example.com'

// Parse string to number
const parseAge = pipe(str, trim, toInt, positive, lte(150))
console.log('Parsed age:', parseAge('  25  '))
// 25

// Parse price
const parsePrice = pipe(str, toFloat, positive)
console.log('Parsed price:', parsePrice('19.99'))
// 19.99

// ============================================================
// 3. String Patterns
// ============================================================

console.log('\n=== String Patterns ===')

// Phone number (simple)
const validatePhone = pipe(str, pattern(/^\d{3}-\d{3}-\d{4}$/, 'Invalid phone'))
console.log('Phone:', validatePhone('123-456-7890'))

// Slug
const validateSlug = pipe(str, pattern(/^[a-z0-9-]+$/, 'Invalid slug'), min(3), max(50))
console.log('Slug:', validateSlug('my-blog-post'))

// URL path
const validatePath = pipe(str, startsWith('/'), nonempty)
console.log('Path:', validatePath('/api/users'))

// File extension
const validateJsFile = pipe(str, endsWith('.js'))
console.log('JS file:', validateJsFile('app.js'))

// Contains
const validateContainsAt = pipe(str, includes('@'))
console.log('Contains @:', validateContainsAt('user@domain'))

// ============================================================
// 4. Number Constraints
// ============================================================

console.log('\n=== Number Constraints ===')

// Percentage (0-100)
const validatePercent = pipe(num, gte(0), lte(100))
console.log('Percent:', validatePercent(75))

// Port number
const validatePort = pipe(num, int, gte(1), lte(65535))
console.log('Port:', validatePort(8080))

// Quantity (must be multiple of 5)
const validateQuantity = pipe(num, int, positive, multipleOf(5))
console.log('Quantity:', validateQuantity(25))

// ============================================================
// 5. Default Values
// ============================================================

console.log('\n=== Default Values ===')

const validateConfig = object({
	host: withDefault(str, 'localhost'),
	port: withDefault(pipe(num, int), 3000),
	debug: withDefault(pipe(str, lower), 'false'),
})

const config1 = validateConfig({})
console.log('Default config:', config1)
// { host: 'localhost', port: 3000, debug: 'false' }

const config2 = validateConfig({ host: 'example.com', port: 8080 })
console.log('Partial config:', config2)
// { host: 'example.com', port: 8080, debug: 'false' }

// ============================================================
// 6. Nullable vs Optional
// ============================================================

console.log('\n=== Nullable vs Optional ===')

const validateNullableEmail = nullable(pipe(str, email))
console.log('Nullable email (null):', validateNullableEmail(null)) // null
console.log('Nullable email (value):', validateNullableEmail('a@b.com')) // 'a@b.com'

const validateOptionalEmail = optional(pipe(str, email))
console.log('Optional email (undefined):', validateOptionalEmail(undefined)) // undefined
console.log('Optional email (value):', validateOptionalEmail('a@b.com')) // 'a@b.com'

// Combined: optional and nullable
const validateNullish = nullable(optional(pipe(str, email)))
console.log('Nullish (null):', validateNullish(null)) // null
console.log('Nullish (undefined):', validateNullish(undefined)) // undefined

// ============================================================
// 7. API Request Validation
// ============================================================

console.log('\n=== API Request Validation ===')

// POST /users
const validateCreateUser = object({
	email: pipe(str, trim, lower, email),
	password: pipe(str, min(8), max(100)),
	name: pipe(str, trim, nonempty, max(100)),
	role: optional(pipe(str, pattern(/^(admin|user|guest)$/))),
})

const createUserRequest = validateCreateUser({
	email: '  ALICE@EXAMPLE.COM  ',
	password: 'secretpassword123',
	name: '  Alice  ',
})
console.log('Create user:', createUserRequest)

// GET /users?page=1&limit=20
const validatePagination = object({
	page: withDefault(pipe(str, toInt, positive), 1),
	limit: withDefault(pipe(str, toInt, gte(1), lte(100)), 20),
})

const query1 = validatePagination({})
console.log('Default pagination:', query1) // { page: 1, limit: 20 }

const query2 = validatePagination({ page: '3', limit: '50' })
console.log('Custom pagination:', query2) // { page: 3, limit: 50 }

// ============================================================
// 8. Form Validation
// ============================================================

console.log('\n=== Form Validation ===')

const validateSignupForm = object({
	username: pipe(str, trim, min(3), max(20), pattern(/^[a-z0-9_]+$/)),
	email: pipe(str, trim, lower, email),
	password: pipe(str, min(8)),
	confirmPassword: pipe(str, min(8)),
	agreeToTerms: (v: unknown) => {
		if (v !== true) throw new ValidationError('Must agree to terms')
		return true
	},
})

// Validate form
const formResult = safeParse(validateSignupForm)({
	username: 'alice_123',
	email: 'alice@example.com',
	password: 'password123',
	confirmPassword: 'password123',
	agreeToTerms: true,
})

if (formResult.success) {
	// Additional check: passwords match
	if (formResult.data.password !== formResult.data.confirmPassword) {
		console.log('Form error: Passwords do not match')
	} else {
		console.log('Form valid:', formResult.data)
	}
} else {
	console.log('Form error:', formResult.error)
}

// ============================================================
// 9. Composing Validators
// ============================================================

console.log('\n=== Composing Validators ===')

// Base validators
const validateId = pipe(str, uuid)
const validateTimestamp = pipe(str, pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))

// Composable entity base
const withMetadata = <T extends Record<string, Parser<unknown>>>(shape: T) =>
	object({
		...shape,
		id: validateId,
		createdAt: validateTimestamp,
		updatedAt: validateTimestamp,
	})

const validatePost = withMetadata({
	title: pipe(str, nonempty, max(200)),
	content: pipe(str, nonempty),
	published: withDefault((v) => v === true, false),
})

const post = validatePost({
	id: '550e8400-e29b-41d4-a716-446655440000',
	title: 'Hello World',
	content: 'This is my first post',
	createdAt: '2024-01-15T10:30:00Z',
	updatedAt: '2024-01-15T10:30:00Z',
})
console.log('Post:', post)

// ============================================================
// 10. Type Inference
// ============================================================

console.log('\n=== Type Inference ===')

// The validator IS the type guard
const userValidator = object({
	id: pipe(str, uuid),
	email: pipe(str, email),
	age: pipe(num, int, positive),
})

// TypeScript infers the type from the validator
type User = ReturnType<typeof userValidator>
// { id: string; email: string; age: number }

function processUsers(data: unknown): User[] {
	const validated = array(userValidator)(data)
	// validated is User[] - fully typed!
	return validated.map((u) => ({
		...u,
		email: u.email.toLowerCase(), // TypeScript knows email is string
	}))
}

const users = processUsers([
	{ id: '550e8400-e29b-41d4-a716-446655440000', email: 'ALICE@EXAMPLE.COM', age: 30 },
])
console.log('Processed users:', users)
