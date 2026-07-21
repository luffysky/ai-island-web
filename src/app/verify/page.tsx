import type { Metadata } from "next";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = {
  title: "驗證完課證書 · AI 島",
  description: "輸入驗證碼，確認 AI 島完課證書的真實性。",
  alternates: { canonical: "/verify" },
};

export default function VerifyPage() {
  return <VerifyForm />;
}
