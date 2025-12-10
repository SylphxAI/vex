import { Card, Cards } from 'fumadocs-ui/components/card'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { source } from '@/lib/source'

const mdxComponents = {
	...defaultMdxComponents,
	Tab,
	Tabs,
	Card,
	Cards,
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	// fumadocs-mdx adds these properties but types aren't properly inferred
	const data = page.data as typeof page.data & {
		body: React.ComponentType<{ components?: Record<string, unknown> }>
		toc: { title: string; url: string; depth: number }[]
		full?: boolean
	}

	return (
		<DocsPage toc={data.toc} full={data.full}>
			<DocsTitle>{data.title}</DocsTitle>
			<DocsDescription>{data.description}</DocsDescription>
			<DocsBody>
				<data.body components={mdxComponents} />
			</DocsBody>
		</DocsPage>
	)
}

export async function generateStaticParams() {
	return source.generateParams()
}

export async function generateMetadata(props: {
	params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
	const params = await props.params
	const page = source.getPage(params.slug)
	if (!page) notFound()

	const image = `/api/og?title=${encodeURIComponent(page.data.title ?? 'Vex')}`

	return {
		title: page.data.title,
		description: page.data.description,
		openGraph: {
			title: page.data.title,
			description: page.data.description,
			images: image,
		},
		twitter: {
			card: 'summary_large_image',
			title: page.data.title,
			description: page.data.description,
			images: image,
		},
	}
}
