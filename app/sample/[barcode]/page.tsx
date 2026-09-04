import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { CowIcon, FlaskIcon, XIcon } from "@/components/icons";

interface Custody {
  at: string;
  by: string;
  role: string;
  action: string;
  status: string;
}

interface Trace {
  found: boolean;
  barcode: string;
  status?: string;
  specimen_type?: string;
  disease_code?: string;
  result?: string;
  result_summary?: string;
  collected_at?: string;
  received_at?: string;
  resulted_at?: string;
  created_at?: string;
  custody_json?: Custody[];
  case_status?: string;
  disease?: string;
  disease_hi?: string;
  disease_mr?: string;
}

const SAMPLE_CHIP: Record<string, { bg: string; fg: string }> = {
  collected: { bg: "#EDF0DE", fg: "#5E6E3E" },
  in_transit: { bg: "#FBF3DC", fg: "#8A6D1F" },
  received: { bg: "#E3EBF1", fg: "#3E6E8A" },
  resulted: { bg: "#E9EDE0", fg: "#5A7A3E" },
};

const RESULT_CHIP: Record<string, { bg: string; fg: string }> = {
  positive: { bg: "#E9EAF0", fg: "#4A5A82" },
  negative: { bg: "#EDF0DE", fg: "#5E6E3E" },
  inconclusive: { bg: "#FBF3DC", fg: "#8A6D1F" },
};

export default async function SampleTrackPage({
  params,
}: {
  params: Promise<{ barcode: string }>;
}) {
  const { barcode } = await params;
  const t = await getTranslations("sample");
  const locale = await getLocale();

  const supabase = await createClient();
  const { data } = await supabase.rpc("sample_trace", { p_barcode: barcode });
  const trace = data as Trace | null;

  const diseaseName =
    locale === "hi"
      ? trace?.disease_hi
      : locale === "mr"
        ? trace?.disease_mr
        : undefined;

  const fmt = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(locale === "mr" ? "mr-IN" : locale === "hi" ? "hi-IN" : "en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-[clamp(16px,4vw,28px)] py-6">
      <header className="flex items-center gap-3 pb-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sage-on">
          <CowIcon className="h-[19px] w-[19px]" />
        </span>
        <span>
          <span className="font-serif text-lg font-semibold leading-none tracking-tight">
            Pashu<b className="text-accent">Setu</b>
          </span>
          <div className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-mut">
            {t("script")}
          </div>
        </span>
        <Link
          href="/"
          className="ml-auto flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-ink"
        >
          {t("home")}
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-5">
        <div className="eyebrow">{t("eyebrow")}</div>
        <div className="h1 font-serif">{t("heading")}</div>
        <p className="lede">{t("lede")}</p>

        {!trace || !trace.found ? (
          <div className="card page-in mt-4 p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
              <XIcon className="h-6 w-6" />
            </span>
            <div className="mt-3 font-serif text-lg font-semibold">{t("notFoundTitle")}</div>
            <p className="mt-1 text-[13px] text-mut">
              {t("notFoundBody", { barcode: barcode || "—" })}
            </p>
          </div>
        ) : (
          <>
            {/* identity */}
            <div className="card overflow-hidden p-0">
              <div className="flex flex-wrap items-center gap-3 border-b border-line-2 px-5 py-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-sage-soft text-sage">
                  <FlaskIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[15px] font-bold tracking-wide text-ink">
                    {trace.barcode}
                  </div>
                  <div className="text-[11.5px] text-mut">{t("sampleLabel")}</div>
                </div>
                {trace.status && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                    style={{
                      background: (SAMPLE_CHIP[trace.status] ?? SAMPLE_CHIP.collected).bg,
                      color: (SAMPLE_CHIP[trace.status] ?? SAMPLE_CHIP.collected).fg,
                    }}
                  >
                    {t(`status.${trace.status}`)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-5 gap-y-3 px-5 py-4">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                    {t("disease")}
                  </div>
                  <div className="mt-0.5 text-[14px] font-semibold">
                    {diseaseName || trace.disease || trace.disease_code || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                    {t("specimen")}
                  </div>
                  <div className="mt-0.5 text-[14px] font-semibold">
                    {trace.specimen_type
                      ? t(`specimen.${trace.specimen_type}`)
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                    {t("collectedAt")}
                  </div>
                  <div className="mt-0.5 text-[13px] font-semibold">
                    {fmt(trace.collected_at)}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                    {t("resultedAt")}
                  </div>
                  <div className="mt-0.5 text-[13px] font-semibold">
                    {fmt(trace.resulted_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* lab result */}
            {trace.result && (
              <div className="overflow-hidden rounded-3xl border border-line bg-card">
                <div className="flex flex-wrap items-center gap-2 border-b border-line-2 px-5 py-3.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
                    <FlaskIcon className="h-4 w-4" />
                  </span>
                  <span className="text-[13px] font-bold uppercase tracking-[0.1em]">
                    {t("labResult")}
                  </span>
                  <span
                    className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{
                      background: (RESULT_CHIP[trace.result] ?? RESULT_CHIP.inconclusive).bg,
                      color: (RESULT_CHIP[trace.result] ?? RESULT_CHIP.inconclusive).fg,
                    }}
                  >
                    {t(`result.${trace.result}`)}
                  </span>
                </div>
                {trace.result_summary && (
                  <p className="px-5 py-4 text-[14px] leading-relaxed text-ink-2">
                    {trace.result_summary}
                  </p>
                )}
              </div>
            )}

            {/* chain of custody */}
            <div className="overflow-hidden rounded-3xl border border-line bg-card">
              <div className="flex items-center gap-2.5 border-b border-line-2 px-5 py-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-sage-soft text-sage">
                  <FlaskIcon className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-bold uppercase tracking-[0.1em]">
                  {t("custodyChain")}
                </span>
              </div>
              {(trace.custody_json ?? []).length === 0 ? (
                <div className="px-5 py-6 text-center text-[13px] text-mut">
                  {t("custodyEmpty")}
                </div>
              ) : (
                <ol className="flex flex-col gap-1 px-5 py-4">
                  {(trace.custody_json ?? []).map((e, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-snug">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sage" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink-2">{e.action}</div>
                        <div className="text-[11px] text-mut">
                          {e.by} · {e.role} · {fmt(e.at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded-xl bg-paper/60 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-mut">
              {t("disclaimer")}
            </div>
          </>
        )}
      </main>

      <footer className="mt-8 pb-2 text-center text-[11px] text-mut2">
        {t("footer")}
      </footer>
    </div>
  );
}
