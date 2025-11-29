// ============================================================
// Basic Usage Examples
// ============================================================

import {
	str,
	num,
	bool,
	pipe,
	email,
	min,
	max,
	int,
	positive,
	nonempty,
	object,
	array,
	optional,
	safeParse,
} from '../src'

// ============================================================
// 1. Simple Validators
// ============================================================

console.log('=== Simple Validators ===')

// String
const name = str('Alice')
console.log('String:', name) // 'Alice'

// Number
const age = num(25)
console.log('Number:', age) // 25

// Boolean
const active = bool(true)
console.log('Boolean:', active) // true

// ============================================================
// 2. Composed Validators with pipe()
// ============================================================

console.log('\n=== Composed Validators ===')

// Email validator
const validateEmail = pipe(str, email)
console.log('Email:', validateEmail('user@example.com'))

// Age validator (integer, positive, max 150)
const validateAge = pipe(num, int, positive, max(150))
console.log('Age:', validateAge(30))

// Username (string, 3-20 chars)
const validateUsername = pipe(str, min(3), max(20))
console.log('Username:', validateUsername('alice'))

// ============================================================
// 3. Object Validation
// ============================================================

console.log('\n=== Object Validation ===')

const validateUser = object({
	name: pipe(str, nonempty),
	email: pipe(str, email),
	age: pipe(num, int, positive),
})

const user = validateUser({
	name: 'Alice',
	email: 'alice@example.com',
	age: 30,
})

console.log('User:', user)

// ============================================================
// 4. Nested Objects
// ============================================================

console.log('\n=== Nested Objects ===')

const validateAddress = object({
	street: pipe(str, nonempty),
	city: pipe(str, nonempty),
	zip: pipe(str, min(5), max(10)),
})

const validatePerson = object({
	name: pipe(str, nonempty),
	address: validateAddress,
})

const person = validatePerson({
	name: 'Bob',
	address: {
		street: '123 Main St',
		city: 'NYC',
		zip: '10001',
	},
})

console.log('Person:', person)

// ============================================================
// 5. Arrays
// ============================================================

console.log('\n=== Arrays ===')

const validateTags = array(pipe(str, nonempty))
const tags = validateTags(['typescript', 'validation', 'fast'])
console.log('Tags:', tags)

const validateScores = array(pipe(num, int, min(0), max(100)))
const scores = validateScores([85, 92, 78, 95])
console.log('Scores:', scores)

// Array of objects
const validateUsers = array(validateUser)
const users = validateUsers([
	{ name: 'Alice', email: 'alice@example.com', age: 30 },
	{ name: 'Bob', email: 'bob@example.com', age: 25 },
])
console.log('Users:', users)

// ============================================================
// 6. Optional Fields
// ============================================================

console.log('\n=== Optional Fields ===')

const validateProfile = object({
	name: pipe(str, nonempty),
	bio: optional(pipe(str, max(500))),
	website: optional(pipe(str, min(5))),
})

const profile1 = validateProfile({
	name: 'Alice',
	bio: 'Developer',
})
console.log('Profile with bio:', profile1)

const profile2 = validateProfile({
	name: 'Bob',
})
console.log('Profile without optional:', profile2)

// ============================================================
// 7. Safe Parsing (no throws)
// ============================================================

console.log('\n=== Safe Parsing ===')

const safeValidateEmail = safeParse(validateEmail)

const valid = safeValidateEmail('test@example.com')
console.log('Valid result:', valid)
// { success: true, data: 'test@example.com' }

const invalid = safeValidateEmail('not-an-email')
console.log('Invalid result:', invalid)
// { success: false, error: 'Invalid email' }

const safeValidateUser = safeParse(validateUser)

const invalidUser = safeValidateUser({
	name: '',
	email: 'bad',
	age: -5,
})
console.log('Invalid user:', invalidUser)
// { success: false, error: 'name: Required' }

// ============================================================
// 8. Error Handling Pattern
// ============================================================

console.log('\n=== Error Handling ===')

function processUser(data: unknown) {
	const result = safeParse(validateUser)(data)

	if (result.success) {
		console.log('Processing user:', result.data.name)
		return result.data
	} else {
		console.log('Validation failed:', result.error)
		return null
	}
}

processUser({ name: 'Alice', email: 'alice@example.com', age: 30 })
processUser({ name: '', email: 'bad', age: -1 })
