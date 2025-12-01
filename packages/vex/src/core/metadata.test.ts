// @ts-nocheck
import { describe, expect, test } from 'bun:test'
import {
	addSchemaMetadata,
	applyMetaActions,
	createMetaAction,
	getMeta,
	getSchemaMetadata,
	isMetaAction,
	META_ACTION_KEY,
	META_KEY,
	type MetaAction,
	type Metadata,
	mergeMeta,
	setMeta,
	updateMeta,
	wrapMeta,
} from './metadata'

describe('Constants', () => {
	test('META_KEY is ~meta', () => {
		expect(META_KEY).toBe('~meta')
	})

	test('META_ACTION_KEY is ~metaAction', () => {
		expect(META_ACTION_KEY).toBe('~metaAction')
	})
})

describe('isMetaAction', () => {
	test('returns true for valid MetaAction', () => {
		const action: MetaAction = {
			[META_ACTION_KEY]: true,
			apply: (meta) => meta,
		}
		expect(isMetaAction(action)).toBe(true)
	})

	test('returns false for null', () => {
		expect(isMetaAction(null)).toBe(false)
	})

	test('returns false for undefined', () => {
		expect(isMetaAction(undefined)).toBe(false)
	})

	test('returns false for primitives', () => {
		expect(isMetaAction('string')).toBe(false)
		expect(isMetaAction(123)).toBe(false)
		expect(isMetaAction(true)).toBe(false)
	})

	test('returns false for object without key', () => {
		expect(isMetaAction({})).toBe(false)
		expect(isMetaAction({ apply: () => {} })).toBe(false)
	})

	test('returns false for object with wrong key value', () => {
		expect(isMetaAction({ [META_ACTION_KEY]: false })).toBe(false)
		expect(isMetaAction({ [META_ACTION_KEY]: 'true' })).toBe(false)
	})
})

describe('createMetaAction', () => {
	test('creates MetaAction with description', () => {
		const action = createMetaAction({ description: 'Test' })
		expect(isMetaAction(action)).toBe(true)

		const meta: Metadata = { type: 'string' }
		const result = action.apply(meta)
		expect(result.description).toBe('Test')
		expect(result.type).toBe('string')
	})

	test('creates MetaAction with multiple fields', () => {
		const action = createMetaAction({
			description: 'Desc',
			title: 'Title',
			examples: ['a', 'b'],
			deprecated: true,
		})

		const meta: Metadata = { type: 'string' }
		const result = action.apply(meta)
		expect(result.description).toBe('Desc')
		expect(result.title).toBe('Title')
		expect(result.examples).toEqual(['a', 'b'])
		expect(result.deprecated).toBe(true)
	})

	test('preserves existing metadata', () => {
		const action = createMetaAction({ description: 'New' })
		const meta: Metadata = { type: 'string', title: 'Existing' }
		const result = action.apply(meta)
		expect(result.description).toBe('New')
		expect(result.title).toBe('Existing')
	})

	test('overrides existing fields', () => {
		const action = createMetaAction({ description: 'New' })
		const meta: Metadata = { type: 'string', description: 'Old' }
		const result = action.apply(meta)
		expect(result.description).toBe('New')
	})
})

describe('applyMetaActions', () => {
	test('applies empty array', () => {
		const meta: Metadata = { type: 'string', description: 'Original' }
		const result = applyMetaActions(meta, [])
		expect(result).toEqual(meta)
	})

	test('applies single action', () => {
		const meta: Metadata = { type: 'string' }
		const actions = [createMetaAction({ description: 'Added' })]
		const result = applyMetaActions(meta, actions)
		expect(result.description).toBe('Added')
	})

	test('applies multiple actions in order', () => {
		const meta: Metadata = { type: 'string' }
		const actions = [
			createMetaAction({ description: 'First' }),
			createMetaAction({ title: 'Title' }),
			createMetaAction({ description: 'Last' }),
		]
		const result = applyMetaActions(meta, actions)
		expect(result.description).toBe('Last')
		expect(result.title).toBe('Title')
	})
})

describe('getMeta', () => {
	test('returns undefined for object without metadata', () => {
		const fn = () => {}
		expect(getMeta(fn)).toBeUndefined()
	})

	test('returns undefined for null', () => {
		expect(getMeta(null)).toBeUndefined()
	})

	test('returns undefined for undefined', () => {
		expect(getMeta(undefined)).toBeUndefined()
	})

	test('returns metadata when present', () => {
		const fn = (() => {}) as any
		fn[META_KEY] = { type: 'string', description: 'Test' }
		expect(getMeta(fn)).toEqual({ type: 'string', description: 'Test' })
	})
})

describe('setMeta', () => {
	test('sets metadata on validator', () => {
		const fn = (() => {}) as any
		const meta: Metadata = { type: 'string', description: 'Test' }
		const result = setMeta(fn, meta)
		expect(result).toBe(fn)
		expect(getMeta(fn)).toEqual(meta)
	})

	test('overwrites existing metadata', () => {
		const fn = (() => {}) as any
		fn[META_KEY] = { type: 'old' }
		setMeta(fn, { type: 'new' })
		expect(getMeta(fn)).toEqual({ type: 'new' })
	})
})

describe('updateMeta', () => {
	test('merges with existing metadata', () => {
		const fn = (() => {}) as any
		fn[META_KEY] = { type: 'string', description: 'Old' }
		updateMeta(fn, { title: 'New Title' })
		expect(getMeta(fn)).toEqual({ type: 'string', description: 'Old', title: 'New Title' })
	})

	test('creates metadata if none exists and type provided', () => {
		const fn = (() => {}) as any
		updateMeta(fn, { type: 'string', description: 'New' })
		expect(getMeta(fn)).toEqual({ type: 'string', description: 'New' })
	})

	test('does nothing if no existing metadata and no type', () => {
		const fn = (() => {}) as any
		updateMeta(fn, { description: 'New' })
		expect(getMeta(fn)).toBeUndefined()
	})

	test('returns the validator', () => {
		const fn = (() => {}) as any
		fn[META_KEY] = { type: 'string' }
		const result = updateMeta(fn, { description: 'New' })
		expect(result).toBe(fn)
	})
})

describe('mergeMeta', () => {
	test('returns undefined for empty array', () => {
		expect(mergeMeta([])).toBeUndefined()
	})

	test('returns undefined for all undefined', () => {
		expect(mergeMeta([undefined, undefined])).toBeUndefined()
	})

	test('returns single defined metadata', () => {
		const meta: Metadata = { type: 'string', description: 'Test' }
		expect(mergeMeta([undefined, meta, undefined])).toBe(meta)
	})

	test('uses first type', () => {
		const result = mergeMeta([{ type: 'string' }, { type: 'number' }])
		expect(result?.type).toBe('string')
	})

	test('merges constraints', () => {
		const result = mergeMeta([
			{ type: 'string', constraints: { minLength: 1 } },
			{ type: 'string', constraints: { maxLength: 10 } },
		])
		expect(result?.constraints).toEqual({ minLength: 1, maxLength: 10 })
	})

	test('later constraints override earlier', () => {
		const result = mergeMeta([
			{ type: 'string', constraints: { min: 1 } },
			{ type: 'string', constraints: { min: 5 } },
		])
		expect(result?.constraints).toEqual({ min: 5 })
	})

	test('last description wins', () => {
		const result = mergeMeta([
			{ type: 'string', description: 'First' },
			{ type: 'string', description: 'Second' },
		])
		expect(result?.description).toBe('Second')
	})

	test('last title wins', () => {
		const result = mergeMeta([
			{ type: 'string', title: 'First' },
			{ type: 'string', title: 'Second' },
		])
		expect(result?.title).toBe('Second')
	})

	test('last examples wins', () => {
		const result = mergeMeta([
			{ type: 'string', examples: ['a'] },
			{ type: 'string', examples: ['b', 'c'] },
		])
		expect(result?.examples).toEqual(['b', 'c'])
	})

	test('last default wins', () => {
		const result = mergeMeta([
			{ type: 'string', default: 'a' },
			{ type: 'string', default: 'b' },
		])
		expect(result?.default).toBe('b')
	})

	test('last deprecated wins', () => {
		const result = mergeMeta([
			{ type: 'string', deprecated: false },
			{ type: 'string', deprecated: true },
		])
		expect(result?.deprecated).toBe(true)
	})

	test('last brand wins', () => {
		const result = mergeMeta([
			{ type: 'string', brand: 'A' },
			{ type: 'string', brand: 'B' },
		])
		expect(result?.brand).toBe('B')
	})

	test('last flavor wins', () => {
		const result = mergeMeta([
			{ type: 'string', flavor: 'A' },
			{ type: 'string', flavor: 'B' },
		])
		expect(result?.flavor).toBe('B')
	})

	test('last readonly wins', () => {
		const result = mergeMeta([
			{ type: 'string', readonly: false },
			{ type: 'string', readonly: true },
		])
		expect(result?.readonly).toBe(true)
	})

	test('last inner wins', () => {
		const inner1 = { type: 'a' }
		const inner2 = { type: 'b' }
		const result = mergeMeta([
			{ type: 'array', inner: inner1 },
			{ type: 'array', inner: inner2 },
		])
		expect(result?.inner).toBe(inner2)
	})

	test('complex merge scenario', () => {
		const result = mergeMeta([
			{ type: 'string', constraints: { minLength: 1 }, description: 'Base' },
			{ type: 'email', constraints: { format: 'email' } },
			{ type: 'branded', brand: 'Email', description: 'Email address' },
		])
		expect(result?.type).toBe('string')
		expect(result?.constraints).toEqual({ minLength: 1, format: 'email' })
		expect(result?.description).toBe('Email address')
		expect(result?.brand).toBe('Email')
	})
})

describe('wrapMeta', () => {
	test('creates wrapper with type and inner', () => {
		const inner = { type: 'item' }
		const result = wrapMeta('array', undefined, inner)
		expect(result.type).toBe('array')
		expect(result.inner).toBe(inner)
	})

	test('preserves description from inner', () => {
		const innerMeta: Metadata = { type: 'string', description: 'Inner desc' }
		const result = wrapMeta('optional', innerMeta, {})
		expect(result.description).toBe('Inner desc')
	})

	test('preserves title from inner', () => {
		const innerMeta: Metadata = { type: 'string', title: 'Title' }
		const result = wrapMeta('optional', innerMeta, {})
		expect(result.title).toBe('Title')
	})

	test('preserves examples from inner', () => {
		const innerMeta: Metadata = { type: 'string', examples: ['a', 'b'] }
		const result = wrapMeta('optional', innerMeta, {})
		expect(result.examples).toEqual(['a', 'b'])
	})

	test('preserves brand from inner', () => {
		const innerMeta: Metadata = { type: 'string', brand: 'Email' }
		const result = wrapMeta('optional', innerMeta, {})
		expect(result.brand).toBe('Email')
	})

	test('preserves flavor from inner', () => {
		const innerMeta: Metadata = { type: 'string', flavor: 'UserId' }
		const result = wrapMeta('optional', innerMeta, {})
		expect(result.flavor).toBe('UserId')
	})

	test('adds extra constraints', () => {
		const result = wrapMeta('array', undefined, {}, { minItems: 1, maxItems: 10 })
		expect(result.constraints).toEqual({ minItems: 1, maxItems: 10 })
	})

	test('handles undefined inner meta', () => {
		const result = wrapMeta('optional', undefined, {})
		expect(result.description).toBeUndefined()
		expect(result.title).toBeUndefined()
	})
})

describe('Legacy compatibility', () => {
	test('getSchemaMetadata is alias for getMeta', () => {
		expect(getSchemaMetadata).toBe(getMeta)
	})

	test('addSchemaMetadata sets metadata', () => {
		const fn = (() => {}) as any
		const result = addSchemaMetadata(fn, { type: 'string', constraints: { min: 1 } })
		expect(result).toBe(fn)
		expect(getMeta(fn)?.type).toBe('string')
		expect(getMeta(fn)?.constraints).toEqual({ min: 1 })
	})

	test('addSchemaMetadata with inner', () => {
		const fn = (() => {}) as any
		const inner = { type: 'number' }
		addSchemaMetadata(fn, { type: 'array', inner })
		expect(getMeta(fn)?.inner).toBe(inner)
	})
})

describe('Metadata interface', () => {
	test('supports all standard fields', () => {
		const meta: Metadata = {
			type: 'string',
			constraints: { minLength: 1 },
			inner: { type: 'item' },
			description: 'A string',
			title: 'String Field',
			examples: ['hello', 'world'],
			default: 'default',
			deprecated: true,
			brand: 'MyBrand',
			flavor: 'MyFlavor',
			readonly: true,
		}

		expect(meta.type).toBe('string')
		expect(meta.constraints?.minLength).toBe(1)
		expect(meta.inner).toEqual({ type: 'item' })
		expect(meta.description).toBe('A string')
		expect(meta.title).toBe('String Field')
		expect(meta.examples).toEqual(['hello', 'world'])
		expect(meta.default).toBe('default')
		expect(meta.deprecated).toBe(true)
		expect(meta.brand).toBe('MyBrand')
		expect(meta.flavor).toBe('MyFlavor')
		expect(meta.readonly).toBe(true)
	})

	test('supports custom fields via index signature', () => {
		const meta: Metadata = {
			type: 'custom',
			customField: 'value',
			anotherCustom: 123,
		}
		expect(meta.customField).toBe('value')
		expect(meta.anotherCustom).toBe(123)
	})
})
