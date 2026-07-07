"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

function UnsubscribeContent() {
  const t = useTranslations("blogs");
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    fetch(`/api/blog/unsubscribe?token=${token}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setEmail(j.email ?? "");
          setStatus("done");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      {status === "loading" && (
        <>
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-fg-muted" />
          <p className="text-fg-muted">{t("processing")}</p>
        </>
      )}
      {status === "done" && (
        <>
          <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold mb-2">{t("unsubscribed")}</h1>
          <p className="text-sm text-fg-muted mb-6">
            {email && `${email} `}{t("unsubscribedDesc")}
          </p>
          <Link href="/" className="text-sm text-accent">{t("backHome")}</Link>
        </>
      )}
      {status === "error" && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">{t("invalidLink")}</h1>
          <p className="text-sm text-fg-muted mb-6">
            {t("invalidLinkDesc")}
          </p>
          <Link href="/" className="text-sm text-accent">{t("backHome")}</Link>
        </>
      )}
    </div>
  );
}

function UnsubscribeFallback() {
  const t = useTranslations("blogs");
  return <div className="py-20 text-center text-fg-muted">{t("loading")}</div>;
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribeFallback />}>
      <UnsubscribeContent />
    </Suspense>
  );
}
