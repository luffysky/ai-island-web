"use client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { TrendingUp } from "lucide-react";

export function AIUsageChart({ dailyData }: { dailyData: any[] }) {
  const [metric, setMetric] = useState<"cost" | "tokens" | "calls">("cost");

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> 趨勢圖（近 30 天）</h3>
        <div className="flex gap-1 text-xs">
          <Tab active={metric === "cost"} onClick={() => setMetric("cost")}>費用</Tab>
          <Tab active={metric === "tokens"} onClick={() => setMetric("tokens")}>Tokens</Tab>
          <Tab active={metric === "calls"} onClick={() => setMetric("calls")}>對話數</Tab>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dailyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" stroke="#999" fontSize={11} />
          <YAxis stroke="#999" fontSize={11} />
          <Tooltip
            contentStyle={{ background: "#1e1e2e", border: "1px solid #444", borderRadius: 8, fontSize: 12 }}
            formatter={(v: any) => metric === "cost" ? `$${Number(v).toFixed(4)}` : v.toLocaleString()}
          />
          <Bar dataKey={metric} fill="#50fa7b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded ${active ? "bg-accent text-black font-semibold" : "bg-bg-elevated hover:bg-border"}`}
    >
      {children}
    </button>
  );
}
