const stats = [
  { label: "Money in (this month)", value: "--" },
  { label: "Money out (this month)", value: "--" },
  { label: "Budget remaining", value: "--" },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Phase 0 shell. Analytics arrive in Phase 6.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Monthly summary">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <p className="text-sm text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8" aria-label="Top expenses">
        <h2 className="mb-3 text-lg font-medium">Top expenses</h2>
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No data yet. Connect an account to get started.
        </div>
      </section>
    </div>
  );
}
