// ============================================================
// ⚡ Vex - Ultra-fast schema validation
// ============================================================
//
// Pure functional API - composable, tree-shakeable, blazing fast
//
// Usage:
//   import { pipe, str, email, object } from '@sylphx/vex'
//
//   const validateEmail = pipe(str, email)
//   const validateUser = object({
//     name: pipe(str, nonempty),
//     email: pipe(str, email),
//   })
//
// ============================================================

// All functional validators
export {
	// Type validators
	str,
	num,
	bool,
	arr,
	obj,
	bigInt,
	date,
	// String validators
	min,
	max,
	len,
	nonempty,
	email,
	url,
	uuid,
	pattern,
	startsWith,
	endsWith,
	includes,
	// Number validators
	int,
	positive,
	negative,
	finite,
	gte,
	lte,
	gt,
	lt,
	multipleOf,
	// Composition
	pipe,
	tryParse,
	safeParse,
	optional,
	nullable,
	withDefault,
	// Object/Array
	object,
	array,
	// Transforms
	trim,
	lower,
	upper,
	toInt,
	toFloat,
	toDate,
	// Types & Error
	ValidationError,
	type Validator,
	type Parser,
	type Result,
} from './fn'
