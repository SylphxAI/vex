import { Icon } from '@iconify/react'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { source } from '@/lib/source'

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<DocsLayout
			tree={source.pageTree}
			nav={{
				title: (
					<div className="flex items-center gap-2 font-semibold">
						<Icon icon="lucide:zap" className="size-5 text-fd-primary" />
						<span>Vex</span>
					</div>
				),
			}}
			sidebar={{
				banner: (
					<div className="mb-4 rounded-lg border border-fd-border bg-fd-card/50 p-3 text-xs text-fd-muted-foreground">
						<span className="font-medium text-fd-foreground">@sylphx/vex</span> - Ultra-fast schema
						validation
					</div>
				),
			}}
			links={[
				{
					type: 'icon',
					label: 'GitHub',
					icon: <Icon icon="lucide:github" className="size-5" />,
					text: 'GitHub',
					url: 'https://github.com/SylphxAI/vex',
					external: true,
				},
				{
					type: 'icon',
					label: 'NPM',
					icon: <Icon icon="simple-icons:npm" className="size-5" />,
					text: 'NPM',
					url: 'https://www.npmjs.com/package/@sylphx/vex',
					external: true,
				},
			]}
		>
			{children}
		</DocsLayout>
	)
}
