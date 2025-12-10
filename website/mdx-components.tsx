import { Card, Cards } from 'fumadocs-ui/components/card'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import defaultMdxComponents from 'fumadocs-ui/mdx'

/**
 * Returns MDX components for the docs.
 * This is used by fumadocs-mdx to provide custom components.
 */
export function getMDXComponents() {
	return {
		...defaultMdxComponents,
		Tab,
		Tabs,
		Card,
		Cards,
	}
}
