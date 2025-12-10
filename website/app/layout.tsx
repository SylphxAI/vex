import './global.css'
import { RootProvider } from 'fumadocs-ui/provider'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
	title: {
		template: '%s | Vex',
		default: 'Vex - Ultra-fast Schema Validation',
	},
	description:
		'Ultra-fast schema validation library - 12x faster than Zod, 6x faster than Valibot. Pure functional design with zero overhead.',
	metadataBase: new URL('https://vex.sylphx.com'),
	openGraph: {
		type: 'website',
		locale: 'en_US',
		siteName: 'Vex',
		title: 'Vex - Ultra-fast Schema Validation',
		description:
			'Ultra-fast schema validation library - 12x faster than Zod, 6x faster than Valibot',
		images: [
			{
				url: '/og.png',
				width: 1200,
				height: 630,
				alt: 'Vex - Ultra-fast Schema Validation',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Vex - Ultra-fast Schema Validation',
		description:
			'Ultra-fast schema validation library - 12x faster than Zod, 6x faster than Valibot',
		images: ['/og.png'],
	},
	keywords: ['vex', 'schema', 'validation', 'typescript', 'zod', 'valibot', 'fast', 'functional'],
	authors: [{ name: 'Sylphx', url: 'https://github.com/SylphxAI' }],
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex min-h-screen flex-col">
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	)
}
