import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
      <Link href="/" className="text-base font-semibold tracking-tight">
        dev<span className="text-accent">wrapped</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm text-muted">
        <Link href="/docs" className="hover-link">Docs</Link>
        <a href="https://cajuos.dev" target="_blank" rel="noopener noreferrer" className="hover-link">
          cajuos.dev
        </a>
      </nav>
    </header>
  );
}
