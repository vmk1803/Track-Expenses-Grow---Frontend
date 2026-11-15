type Framework = {
  rule: string;
  needsPct: number;
  wantsPct: number;
  saveInvestPct: number;
  bestFor: string;
  summary: string;
};

const frameworks: Framework[] = [
  {
    rule: "50/30/20",
    needsPct: 50,
    wantsPct: 30,
    saveInvestPct: 20,
    bestFor: "Comfortable income, low fixed costs",
    summary:
      "The classic default. Half on essentials, almost a third on lifestyle, and a healthy 20% toward savings, investments, and debt payoff.",
  },
  {
    rule: "60/20/20",
    needsPct: 60,
    wantsPct: 20,
    saveInvestPct: 20,
    bestFor: "Tier-1 city, EMIs, growing family",
    summary:
      "Needs bucket widens to absorb rent and EMIs while savings stay protected. Wants take the hit instead of long-term wealth.",
  },
  {
    rule: "70/20/10",
    needsPct: 70,
    wantsPct: 20,
    saveInvestPct: 10,
    bestFor: "Early career, high rent, tight cash flow",
    summary:
      "Survival mode. Essentials dominate, lifestyle stays small, savings start at 10% so the habit is built even when the cushion is thin.",
  },
];

export function BudgetFrameworksSection() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-strong">
          Section 1 &mdash; Read &amp; apply on your own
        </p>
        <h2 className="text-2xl font-semibold text-foreground">
          Three load-bearing budget frameworks
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-copy-muted">
          Every split below is applied to your take-home pay (post-tax). The
          right rule bends with income tier, city, and life stage &mdash; pick
          the one closest to your reality, then use it in the Income tab.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {frameworks.map((framework) => (
          <article
            key={framework.rule}
            className="flex h-full flex-col gap-4 rounded-[24px] border border-border bg-surface p-6 shadow-[0_14px_40px_rgba(13,20,33,0.06)]"
          >
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-semibold text-foreground">
                {framework.rule}
              </p>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-copy-muted">
                Needs / Wants / Save
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-border bg-background px-2 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-copy-muted">
                  Needs
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {framework.needsPct}%
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-2 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-copy-muted">
                  Wants
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {framework.wantsPct}%
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-2 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-copy-muted">
                  Save
                </p>
                <p className="mt-1 text-lg font-semibold text-brand-strong">
                  {framework.saveInvestPct}%
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-strong">
                Best for
              </p>
              <p className="text-sm font-medium text-foreground">
                {framework.bestFor}
              </p>
            </div>

            <p className="mt-auto text-sm leading-6 text-copy-muted">
              {framework.summary}
            </p>
          </article>
        ))}
      </div>

      <div className="rounded-[20px] border border-dashed border-border bg-background px-5 py-4 text-sm leading-6 text-copy-muted">
        <strong className="font-semibold text-foreground">Needs</strong> are
        essentials you must pay to live (housing, EMI, utilities, groceries,
        transport, insurance).{" "}
        <strong className="font-semibold text-foreground">Wants</strong> are
        the things that improve life but aren&rsquo;t survival (dining out,
        OTT, hobbies, travel).{" "}
        <strong className="font-semibold text-foreground">Save / Invest</strong>{" "}
        covers emergency-fund top-ups, retirement, SIPs, and high-interest debt
        payoff.
      </div>
    </section>
  );
}
