export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-6 py-8 text-sm text-muted sm:flex-row sm:justify-between">
      <span>
        dev<span className="text-accent">wrapped</span> · by{" "}
        <a href="https://cajuos.dev" target="_blank" rel="noopener noreferrer" className="hover-link">
          cajuos.dev
        </a>
      </span>
      <span className="text-xs">dados públicos do GitHub · nada é salvo</span>
    </footer>
  );
}
