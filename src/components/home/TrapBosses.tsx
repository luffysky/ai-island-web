import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, Skull } from "lucide-react";

const TRAP_BOSSES = [
  { no: 1, color: "border-red-500/30 bg-red-500/5" },
  { no: 2, color: "border-purple-500/30 bg-purple-500/5" },
  { no: 3, color: "border-violet-500/30 bg-violet-500/5" },
  { no: 4, color: "border-cyan-500/30 bg-cyan-500/5" },
  { no: 5, color: "border-green-500/30 bg-green-500/5" },
];

export async function TrapBosses() {
  const t = await getTranslations("home");
  return (
    <section className="border-b border-border py-16 bg-gradient-to-b from-transparent via-bg-elevated/10 to-transparent">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10 reveal">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-red-500/10 border border-red-500/30 text-red-400 mb-3">
            <AlertTriangle size={14} /> {t("trapBadge")}
          </div>
          <h2 className="text-3xl font-bold mb-2 inline-flex items-center gap-2"><Skull size={28} className="text-red-400" /> {t("trapHeading")}</h2>
          <p className="text-fg-muted">{t("trapSubtitle")}</p>
        </div>

        <div className="mb-12">
          <Image
            src="/mascot/trap-bosses.png"
            alt={t("trapHeading")}
            width={1200}
            height={700}
            sizes="(max-width: 768px) 100vw, 896px"
            className="w-full max-w-4xl mx-auto h-auto rounded-2xl shadow-xl border border-border"
          />
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {TRAP_BOSSES.map((b, idx) => (
            <div key={b.no} className={`rounded-xl border ${b.color} p-4 reveal ${idx < 5 ? `reveal-d${idx + 1}` : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center text-xs font-bold">
                  {b.no}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-900 dark:text-red-200 font-bold">
                  BOSS
                </span>
              </div>
              <h3 className="font-bold mb-2">{t(`trap${b.no}Name`)}</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-red-400/80 font-semibold mb-0.5">{t("trapSymptomLabel")}</div>
                  <p className="text-fg-muted leading-relaxed">{t(`trap${b.no}Symptom`)}</p>
                </div>
                <div>
                  <div className="text-yellow-400/80 font-semibold mb-0.5">{t("trapWeaknessLabel")}</div>
                  <p>{t(`trap${b.no}Weakness`)}</p>
                </div>
                <div>
                  <div className="text-green-400/80 font-semibold mb-0.5">{t("trapSolveLabel")}</div>
                  <p className="text-fg-muted leading-relaxed">{t(`trap${b.no}Solve`)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
