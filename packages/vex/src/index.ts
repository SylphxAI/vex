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
	arr,
	array,
	bigInt,
	bool,
	date,
	email,
	endsWith,
	finite,
	gt,
	gte,
	includes,
	// Number validators
	int,
	len,
	lower,
	lt,
	lte,
	max,
	// String validators
	min,
	multipleOf,
	negative,
	nonempty,
	nullable,
	num,
	obj,
	// Object/Array
	object,
	optional,
	type Parser,
	pattern,
	// Composition
	pipe,
	positive,
	type Result,
	safeParse,
	startsWith,
	// Type validators
	str,
	toDate,
	toFloat,
	toInt,
	// Transforms
	trim,
	tryParse,
	upper,
	url,
	uuid,
	// Types & Error
	ValidationError,
	type Validator,
	withDefault,
} from './fn'
