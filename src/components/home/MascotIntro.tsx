import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Handshake, Sword, Ruler, Sparkles } from "lucide-react";

export async function MascotIntro() {
  const t = await getTranslations("home");
  return (
    <section className="border-b border-border py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10 reveal">
          <h2 className="text-3xl font-bold mb-2 inline-flex items-center gap-2"><Handshake size={28} className="text-accent" /> {t("mascotIntroHeading")}</h2>
          <p className="text-fg-muted">{t("mascotIntroSubtitle")}</p>
        </div>

        <div className="relative mb-10">
          <Image
            src="/mascot/mascot-trio.png"
            alt={t("mascotTrioAlt")}
            width={1200}
            height={700}
            sizes="(max-width: 768px) 100vw, 896px"
            className="w-full max-w-4xl mx-auto h-auto rounded-2xl shadow-xl border border-border"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-orange-400/30 bg-orange-400/5 reveal reveal-d1">
            <div className="flex items-center gap-2 mb-2">
              <Sword size={22} className="text-orange-400" />
              <h3 className="text-xl font-bold text-orange-400">{t("mascotFatzai")}</h3>
            </div>
            <div className="text-sm text-fg-muted mb-2">{t("mascotFatzaiRole")}</div>
            <p className="text-sm leading-relaxed">
              {t("mascotFatzaiDesc")}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-purple-400/30 bg-purple-400/5 reveal reveal-d2">
            <div className="flex items-center gap-2 mb-2">
              <Ruler size={22} className="text-purple-400" />
              <h3 className="text-xl font-bold text-purple-400">{t("mascotGubao")}</h3>
            </div>
            <div className="text-sm text-fg-muted mb-2">{t("mascotGubaoRole")}</div>
            <p className="text-sm leading-relaxed">
              {t("mascotGubaoDesc")}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-green-400/30 bg-green-400/5 reveal reveal-d3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={22} className="text-green-400" />
              <h3 className="text-xl font-bold text-green-400">{t("mascotLvbao")}</h3>
            </div>
            <div className="text-sm text-fg-muted mb-2">{t("mascotLvbaoRole")}</div>
            <p className="text-sm leading-relaxed">
              {t("mascotLvbaoDesc")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
