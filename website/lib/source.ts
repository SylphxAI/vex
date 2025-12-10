import { Icon } from '@iconify/react'
import { loader } from 'fumadocs-core/source'
import { createElement } from 'react'
import { docs } from '@/.source'

// toFumadocsSource() returns { files: () => [...] }
// but loader expects { files: [...] }
const fumadocsSource = docs.toFumadocsSource()
// biome-ignore lint/suspicious/noExplicitAny: fumadocs type mismatch
const filesRaw = fumadocsSource.files as any
const source_raw = {
	files: typeof filesRaw === 'function' ? filesRaw() : filesRaw,
}

export const source = loader({
	baseUrl: '/docs',
	// biome-ignore lint/suspicious/noExplicitAny: fumadocs type mismatch
	source: source_raw as any,
	icon(icon) {
		if (!icon) return
		// Use Iconify for all icons
		return createElement(Icon, { icon, className: 'size-4' })
	},
})
