import Link from 'next/link'

export default function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-fd-background">
			<div className="max-w-3xl px-4 text-center">
				<h1 className="mb-4 text-5xl font-bold tracking-tight">
					<span className="text-fd-primary">Vex</span>
				</h1>
				<p className="mb-2 text-2xl text-fd-muted-foreground">Ultra-fast Schema Validation</p>
				<p className="mb-8 text-lg text-fd-muted-foreground">
					12x faster than Zod • 6x faster than Valibot • Pure functional design
				</p>

				<div className="mb-12 flex flex-wrap justify-center gap-4">
					<Link
						href="/docs"
						className="rounded-lg bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
					>
						Get Started
					</Link>
					<a
						href="https://github.com/SylphxAI/vex"
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-lg border border-fd-border bg-fd-card px-6 py-3 font-medium text-fd-foreground transition-colors hover:bg-fd-accent"
					>
						GitHub
					</a>
				</div>

				<div className="rounded-xl border border-fd-border bg-fd-card p-6">
					<pre className="overflow-x-auto text-left text-sm">
						<code className="text-fd-muted-foreground">
							{`import { str, num, object, email, int, positive } from '@sylphx/vex'

const userSchema = object({
  name: str(),
  email: str(email),
  age: num(int, positive),
})

const user = userSchema(data) // throws on error`}
						</code>
					</pre>
				</div>
			</div>
		</main>
	)
}
