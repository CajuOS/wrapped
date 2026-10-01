import { WrappedGenerator } from "@/components/wrapped-generator";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Teu ano no GitHub em <span className="text-accent">1 card</span>.
      </h1>
      <p className="mt-2 text-muted">
        Commits, PRs, stars — e as verdades: café, deploy de sexta, dias sem quebrar prod.
      </p>
      <div className="mt-8">
        <WrappedGenerator />
      </div>
    </div>
  );
}
