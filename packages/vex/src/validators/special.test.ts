import { describe, expect, test } from 'bun:test'
import {
	any,
	blob,
	file,
	func,
	instance,
	mimeType,
	nan,
	never,
	nullType,
	promise,
	symbol,
	undefinedType,
	unknown,
	voidType,
} from './special'

describe('Special Validators', () => {
	describe('any', () => {
		test('accepts anything', () => {
			expect(any(123)).toBe(123)
			expect(any('hello')).toBe('hello')
			expect(any(null)).toBe(null)
			expect(any(undefined)).toBe(undefined)
			expect(any({ foo: 'bar' })).toEqual({ foo: 'bar' })
		})

		test('safe version works', () => {
			expect(any.safe!(123)).toEqual({ ok: true, value: 123 })
			expect(any.safe!(null)).toEqual({ ok: true, value: null })
		})

		test('has Standard Schema', () => {
			expect(any['~standard']).toBeDefined()
			expect(any['~standard']!.validate(123)).toEqual({ value: 123 })
		})
	})

	describe('unknown', () => {
		test('accepts anything', () => {
			expect(unknown(123)).toBe(123)
			expect(unknown('hello')).toBe('hello')
			expect(unknown(null)).toBe(null)
		})

		test('has own schema metadata', () => {
			// unknown has its own metadata (type: 'unknown') for JSON Schema conversion
			expect(unknown).not.toBe(any)
			expect(unknown('test')).toBe('test')
		})
	})

	describe('never', () => {
		test('always fails', () => {
			expect(() => never('anything')).toThrow('Value not allowed')
			expect(() => never(null)).toThrow()
			expect(() => never(undefined)).toThrow()
		})

		test('safe version returns error', () => {
			expect(never.safe!('test')).toEqual({ ok: false, error: 'Value not allowed' })
		})

		test('has Standard Schema', () => {
			expect(never['~standard']).toBeDefined()
			expect(never['~standard']!.validate('anything').issues![0].message).toBe('Value not allowed')
		})
	})

	describe('voidType', () => {
		test('accepts undefined only', () => {
			expect(voidType(undefined)).toBe(undefined)
			expect(() => voidType(null)).toThrow('Expected undefined')
			expect(() => voidType('')).toThrow()
			expect(() => voidType(0)).toThrow()
		})

		test('safe version works', () => {
			expect(voidType.safe!(undefined)).toEqual({ ok: true, value: undefined })
			expect(voidType.safe!(null)).toEqual({ ok: false, error: 'Expected undefined' })
		})

		test('has Standard Schema', () => {
			expect(voidType['~standard']).toBeDefined()
			expect(voidType['~standard']!.validate(undefined)).toEqual({ value: undefined })
			expect(voidType['~standard']!.validate(null).issues).toBeDefined()
		})
	})

	describe('nullType', () => {
		test('accepts null only', () => {
			expect(nullType(null)).toBe(null)
			expect(() => nullType(undefined)).toThrow('Expected null')
			expect(() => nullType('')).toThrow()
		})

		test('safe version works', () => {
			expect(nullType.safe!(null)).toEqual({ ok: true, value: null })
			expect(nullType.safe!(undefined)).toEqual({ ok: false, error: 'Expected null' })
		})

		test('has Standard Schema', () => {
			expect(nullType['~standard']).toBeDefined()
		})
	})

	describe('undefinedType', () => {
		test('accepts undefined only', () => {
			expect(undefinedType(undefined)).toBe(undefined)
			expect(() => undefinedType(null)).toThrow('Expected undefined')
			expect(() => undefinedType('')).toThrow()
		})

		test('safe version works', () => {
			expect(undefinedType.safe!(undefined)).toEqual({ ok: true, value: undefined })
			expect(undefinedType.safe!(null)).toEqual({ ok: false, error: 'Expected undefined' })
		})

		test('has Standard Schema', () => {
			expect(undefinedType['~standard']).toBeDefined()
		})
	})

	describe('nan', () => {
		test('accepts NaN only', () => {
			expect(Number.isNaN(nan(Number.NaN))).toBe(true)
			expect(() => nan(123)).toThrow('Expected NaN')
			expect(() => nan(0)).toThrow('Expected NaN')
			expect(() => nan('NaN' as any)).toThrow('Expected NaN')
		})

		test('safe version works', () => {
			expect(nan.safe!(Number.NaN)).toEqual({ ok: true, value: Number.NaN })
			expect(nan.safe!(123)).toEqual({ ok: false, error: 'Expected NaN' })
			expect(nan.safe!('NaN')).toEqual({ ok: false, error: 'Expected NaN' })
		})

		test('has Standard Schema', () => {
			expect(nan['~standard']).toBeDefined()
		})
	})

	describe('symbol', () => {
		test('accepts symbols', () => {
			const sym = Symbol('test')
			expect(symbol(sym)).toBe(sym)
			expect(() => symbol('symbol')).toThrow('Expected symbol')
		})

		test('safe version works', () => {
			const sym = Symbol('test')
			expect(symbol.safe!(sym)).toEqual({ ok: true, value: sym })
			expect(symbol.safe!('string')).toEqual({ ok: false, error: 'Expected symbol' })
		})

		test('has Standard Schema', () => {
			expect(symbol['~standard']).toBeDefined()
		})
	})

	describe('func', () => {
		test('accepts functions', () => {
			const fn = () => {}
			expect(func(fn)).toBe(fn)
			expect(() => func({})).toThrow('Expected function')
		})

		test('safe version works', () => {
			const fn = () => {}
			expect(func.safe!(fn)).toEqual({ ok: true, value: fn })
			expect(func.safe!({})).toEqual({ ok: false, error: 'Expected function' })
		})

		test('has Standard Schema', () => {
			expect(func['~standard']).toBeDefined()
		})
	})

	describe('promise', () => {
		test('accepts promises', () => {
			const p = Promise.resolve(1)
			expect(promise(p)).toBe(p)
			expect(() => promise({})).toThrow('Expected Promise')
		})

		test('safe version works', () => {
			const p = Promise.resolve(1)
			expect(promise.safe!(p)).toEqual({ ok: true, value: p })
			expect(promise.safe!({})).toEqual({ ok: false, error: 'Expected Promise' })
		})

		test('has Standard Schema', () => {
			expect(promise['~standard']).toBeDefined()
		})
	})

	describe('instance', () => {
		test('validates class instances', () => {
			class MyClass {}
			const obj = new MyClass()
			expect(instance(MyClass)(obj)).toBe(obj)
			expect(() => instance(MyClass)({})).toThrow('Expected instance of MyClass')

			const d = new Date()
			expect(instance(Date)(d)).toBe(d)
		})

		test('handles anonymous class', () => {
			// Create a proper anonymous class
			const AnonClass = class {}
			Object.defineProperty(AnonClass, 'name', { value: '' })
			expect(() => instance(AnonClass)({})).toThrow('Expected instance of class')
		})

		test('safe version works', () => {
			const d = new Date()
			expect(instance(Date).safe!(d)).toEqual({ ok: true, value: d })
			expect(instance(Date).safe!({})).toEqual({ ok: false, error: 'Expected instance of Date' })
		})

		test('has Standard Schema', () => {
			expect(instance(Date)['~standard']).toBeDefined()
		})
	})

	describe('blob', () => {
		test('accepts Blob', () => {
			const b = new Blob(['test'])
			expect(blob(b)).toBe(b)
			expect(() => blob({})).toThrow('Expected Blob')
		})

		test('safe version works', () => {
			const b = new Blob(['test'])
			expect(blob.safe!(b)).toEqual({ ok: true, value: b })
			expect(blob.safe!({})).toEqual({ ok: false, error: 'Expected Blob' })
		})

		test('has Standard Schema', () => {
			expect(blob['~standard']).toBeDefined()
		})
	})

	describe('file', () => {
		test('accepts File', () => {
			const f = new File(['test'], 'test.txt')
			expect(file(f)).toBe(f)
			expect(() => file(new Blob(['test']))).toThrow('Expected File')
		})

		test('safe version works', () => {
			const f = new File(['test'], 'test.txt')
			expect(file.safe!(f)).toEqual({ ok: true, value: f })
			expect(file.safe!(new Blob(['test']))).toEqual({ ok: false, error: 'Expected File' })
		})

		test('has Standard Schema', () => {
			expect(file['~standard']).toBeDefined()
		})
	})

	describe('mimeType', () => {
		test('validates MIME type', () => {
			const imageValidator = mimeType(['image/png', 'image/jpeg'])
			const pngBlob = new Blob([''], { type: 'image/png' })
			expect(imageValidator(pngBlob)).toBe(pngBlob)

			const jpegBlob = new Blob([''], { type: 'image/jpeg' })
			expect(imageValidator(jpegBlob)).toBe(jpegBlob)
		})

		test('throws for non-Blob', () => {
			const imageValidator = mimeType(['image/png'])
			expect(() => imageValidator({} as any)).toThrow('Expected Blob')
		})

		test('throws for wrong MIME type', () => {
			const imageValidator = mimeType(['image/png'])
			const textBlob = new Blob([''], { type: 'text/plain' })
			expect(() => imageValidator(textBlob)).toThrow('Expected MIME type: image/png')
		})

		test('safe version works', () => {
			const imageValidator = mimeType(['image/png'])
			const pngBlob = new Blob([''], { type: 'image/png' })
			expect(imageValidator.safe!(pngBlob)).toEqual({ ok: true, value: pngBlob })

			const textBlob = new Blob([''], { type: 'text/plain' })
			expect(imageValidator.safe!(textBlob)).toEqual({
				ok: false,
				error: 'Expected MIME type: image/png',
			})

			expect(imageValidator.safe!({})).toEqual({ ok: false, error: 'Expected Blob' })
		})

		test('has Standard Schema', () => {
			const imageValidator = mimeType(['image/png'])
			expect(imageValidator['~standard']).toBeDefined()
		})

		test('Standard Schema validates successfully', () => {
			const imageValidator = mimeType(['image/png'])
			const pngBlob = new Blob([''], { type: 'image/png' })
			expect(imageValidator['~standard']!.validate(pngBlob)).toEqual({ value: pngBlob })
		})

		test('Standard Schema returns issues for wrong type', () => {
			const imageValidator = mimeType(['image/png'])
			const textBlob = new Blob([''], { type: 'text/plain' })
			const result = imageValidator['~standard']!.validate(textBlob)
			expect(result.issues![0].message).toBe('Expected MIME type: image/png')
		})

		test('validates multiple MIME types', () => {
			const mediaValidator = mimeType(['image/png', 'image/jpeg', 'image/gif'])
			const gifBlob = new Blob([''], { type: 'image/gif' })
			expect(mediaValidator(gifBlob)).toBe(gifBlob)
		})

		test('validates single MIME type', () => {
			const svgValidator = mimeType(['image/svg+xml'])
			const svgBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' })
			expect(svgValidator(svgBlob)).toBe(svgBlob)
		})
	})
})

describe('Special Validators edge cases', () => {
	describe('any', () => {
		test('handles complex objects', () => {
			const complex = { nested: { deep: { value: 123 } }, array: [1, 2, 3] }
			expect(any(complex)).toEqual(complex)
		})

		test('handles arrays', () => {
			expect(any([1, 2, 3])).toEqual([1, 2, 3])
			expect(any([])).toEqual([])
		})

		test('handles functions', () => {
			const fn = () => 'hello'
			expect(any(fn)).toBe(fn)
		})

		test('handles symbols', () => {
			const sym = Symbol('test')
			expect(any(sym)).toBe(sym)
		})
	})

	describe('never', () => {
		test('rejects all primitive types', () => {
			expect(() => never(0)).toThrow('Value not allowed')
			expect(() => never('')).toThrow('Value not allowed')
			expect(() => never(true)).toThrow('Value not allowed')
			expect(() => never(false)).toThrow('Value not allowed')
		})

		test('rejects complex types', () => {
			expect(() => never({})).toThrow('Value not allowed')
			expect(() => never([])).toThrow('Value not allowed')
			expect(() => never(() => {})).toThrow('Value not allowed')
		})
	})

	describe('symbol', () => {
		test('accepts well-known symbols', () => {
			expect(symbol(Symbol.iterator)).toBe(Symbol.iterator)
			expect(symbol(Symbol.toStringTag)).toBe(Symbol.toStringTag)
		})

		test('rejects non-symbol primitives', () => {
			expect(() => symbol(123 as any)).toThrow('Expected symbol')
			expect(() => symbol(null as any)).toThrow('Expected symbol')
			expect(() => symbol(undefined as any)).toThrow('Expected symbol')
		})
	})

	describe('func', () => {
		test('accepts arrow functions', () => {
			const arrow = () => {}
			expect(func(arrow)).toBe(arrow)
		})

		test('accepts named functions', () => {
			function named() {}
			expect(func(named)).toBe(named)
		})

		test('accepts async functions', () => {
			const asyncFn = async () => {}
			expect(func(asyncFn)).toBe(asyncFn)
		})

		test('accepts generator functions', () => {
			function* gen() {}
			expect(func(gen)).toBe(gen)
		})

		test('accepts class constructors', () => {
			class MyClass {}
			expect(func(MyClass)).toBe(MyClass)
		})

		test('rejects callable objects', () => {
			// Objects with call signature but not typeof 'function'
			expect(() => func({} as any)).toThrow('Expected function')
		})
	})

	describe('promise', () => {
		test('accepts resolved promises', () => {
			const p = Promise.resolve('done')
			expect(promise(p)).toBe(p)
		})

		test('accepts rejected promises', () => {
			const p = Promise.reject(new Error('fail')).catch(() => {})
			expect(promise(p)).toBe(p)
		})

		test('accepts pending promises', () => {
			const p = new Promise(() => {}) // never resolves
			expect(promise(p)).toBe(p)
		})

		test('rejects thenable objects', () => {
			const thenable = { then: () => {} }
			expect(() => promise(thenable as any)).toThrow('Expected Promise')
		})
	})

	describe('instance', () => {
		test('validates built-in types', () => {
			expect(instance(RegExp)(/test/)).toEqual(/test/)
			expect(instance(Map)(new Map())).toEqual(new Map())
			expect(instance(Set)(new Set())).toEqual(new Set())
			expect(instance(WeakMap)(new WeakMap())).toEqual(new WeakMap())
			expect(instance(WeakSet)(new WeakSet())).toEqual(new WeakSet())
		})

		test('validates Error subclasses', () => {
			const err = new TypeError('test')
			expect(instance(TypeError)(err)).toBe(err)
			expect(instance(Error)(err)).toBe(err)
		})

		test('validates custom class hierarchy', () => {
			class Animal {}
			class Dog extends Animal {}
			const dog = new Dog()
			expect(instance(Dog)(dog)).toBe(dog)
			expect(instance(Animal)(dog)).toBe(dog)
		})

		test('rejects wrong class in hierarchy', () => {
			class Animal {}
			class Dog extends Animal {}
			class Cat extends Animal {}
			const dog = new Dog()
			expect(() => instance(Cat)(dog as any)).toThrow('Expected instance of Cat')
		})
	})

	describe('blob', () => {
		test('accepts Blob with content', () => {
			const b = new Blob(['hello', 'world'], { type: 'text/plain' })
			expect(blob(b)).toBe(b)
		})

		test('accepts empty Blob', () => {
			const b = new Blob([])
			expect(blob(b)).toBe(b)
		})

		test('accepts File (which extends Blob)', () => {
			const f = new File(['content'], 'test.txt')
			expect(blob(f)).toBe(f)
		})

		test('rejects ArrayBuffer', () => {
			expect(() => blob(new ArrayBuffer(8) as any)).toThrow('Expected Blob')
		})
	})

	describe('file', () => {
		test('accepts File with options', () => {
			const f = new File(['content'], 'test.txt', { type: 'text/plain' })
			expect(file(f)).toBe(f)
		})

		test('accepts empty File', () => {
			const f = new File([], 'empty.txt')
			expect(file(f)).toBe(f)
		})

		test('rejects Blob that is not File', () => {
			const b = new Blob(['content'])
			expect(() => file(b as any)).toThrow('Expected File')
		})
	})

	describe('nan', () => {
		test('accepts NaN from different sources', () => {
			expect(Number.isNaN(nan(0 / 0))).toBe(true)
			expect(Number.isNaN(nan(Math.sqrt(-1)))).toBe(true)
			expect(Number.isNaN(nan(parseFloat('not a number')))).toBe(true)
		})

		test('rejects Infinity', () => {
			expect(() => nan(Infinity as any)).toThrow('Expected NaN')
			expect(() => nan(-Infinity as any)).toThrow('Expected NaN')
		})
	})

	describe('voidType and undefinedType', () => {
		test('voidType and undefinedType are equivalent', () => {
			expect(voidType(undefined)).toBe(undefined)
			expect(undefinedType(undefined)).toBe(undefined)
		})

		test('both reject null', () => {
			expect(() => voidType(null)).toThrow()
			expect(() => undefinedType(null)).toThrow()
		})

		test('both reject empty values', () => {
			expect(() => voidType('')).toThrow()
			expect(() => undefinedType(0)).toThrow()
			expect(() => voidType(false)).toThrow()
		})
	})
})
