import type { Metadata } from "next";
import { MessageCoach } from "./MessageCoach";

export const metadata: Metadata = {
  title: "訊息軍師 · AI 島",
  description: "難開口的話——談加薪、婉拒、道歉、催款、客訴——選情境、填重點、挑語氣，AI 幫你寫出得體又有效的訊息，可直接複製傳送。",
  alternates: { canonical: "/message-coach" },
};

export const dynamic = "force-dynamic";

export default function MessageCoachPage() {
  return <MessageCoach />;
}
