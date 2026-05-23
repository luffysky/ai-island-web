"use client";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function GA4Charts({ data }: { data: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-3 text-sm">📊 每日瀏覽 / 訪客</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#50fa7b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#50fa7b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="uv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8be9fd" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8be9fd" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#999" fontSize={11} />
            <YAxis stroke="#999" fontSize={11} />
            <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #444", borderRadius: 8, fontSize: 12 }} />
            <Legend />
            <Area type="monotone" dataKey="page_views" name="瀏覽" stroke="#50fa7b" fill="url(#pv)" />
            <Area type="monotone" dataKey="unique_visitors" name="訪客" stroke="#8be9fd" fill="url(#uv)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-3 text-sm">⏱️ 平均停留時間（秒）</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#999" fontSize={11} />
            <YAxis stroke="#999" fontSize={11} />
            <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #444", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="avg_engagement_sec" stroke="#bd93f9" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
