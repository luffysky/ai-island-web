"use client";
import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Bot, DollarSign, BookOpen, BarChart3, Smartphone, Clock } from "lucide-react";

const COLORS = ["#50fa7b", "#8be9fd", "#bd93f9", "#ffb86c", "#ff79c6", "#f1fa8c", "#ff5555"];

interface Props {
  signupData: Array<{ date: string; count: number }>;
  aiData: Array<{ date: string; cost: number; calls: number }>;
  revenueData?: Array<{ date: string; revenue: number; refund: number }>;
  lessonCompletionData?: Array<{ chapter: string; completed: number; total: number }>;
  retentionData?: Array<{ day: string; retention: number }>;
  deviceData?: Array<{ name: string; value: number }>;
  hourlyActivityData?: Array<{ hour: number; users: number }>;
}

export function DashboardCharts({
  signupData,
  aiData,
  revenueData = [],
  lessonCompletionData = [],
  retentionData = [],
  deviceData = [],
  hourlyActivityData = [],
}: Props) {
  const [aiMetric, setAiMetric] = useState<"calls" | "cost">("calls");

  return (
    <div className="space-y-4">
      {/* 第一排：註冊趨勢 + AI 用量 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title={<><TrendingUp className="w-4 h-4" /> 註冊趨勢（近 30 天）</>} subtitle={`總計 ${signupData.reduce((s, d) => s + d.count, 0)} 人`}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={signupData}>
              <defs>
                <linearGradient id="g-signups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#50fa7b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#50fa7b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#999" fontSize={10} />
              <YAxis stroke="#999" fontSize={10} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="count" name="新註冊" stroke="#50fa7b" fill="url(#g-signups)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={<><Bot className="w-4 h-4" /> AI 導師使用量（近 30 天）</>}
          subtitle={aiData.length === 0 ? "尚無數據" : `${aiData.reduce((s, d) => s + d.calls, 0)} 次對話 / $${aiData.reduce((s, d) => s + d.cost, 0).toFixed(2)}`}
          actions={
            <div className="flex gap-1 text-xs">
              <Tab active={aiMetric === "calls"} onClick={() => setAiMetric("calls")}>對話</Tab>
              <Tab active={aiMetric === "cost"} onClick={() => setAiMetric("cost")}>費用</Tab>
            </div>
          }
        >
          {aiData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" fontSize={10} />
                <YAxis stroke="#999" fontSize={10} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: any) => aiMetric === "cost" ? `$${Number(v).toFixed(4)}` : v}
                />
                <Bar dataKey={aiMetric} fill="#8be9fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* 第二排：收入 + 完成度 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          title={<><DollarSign className="w-4 h-4" /> 收入趨勢（近 30 天）</>}
          subtitle={revenueData.length === 0 ? "尚無訂單" : `NT$ ${revenueData.reduce((s, d) => s + d.revenue, 0).toLocaleString()}`}
        >
          {revenueData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" fontSize={10} />
                <YAxis stroke="#999" fontSize={10} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => `NT$ ${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" name="收入" stroke="#50fa7b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="refund" name="退款" stroke="#ff5555" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title={<><BookOpen className="w-4 h-4" /> 章節完成率 Top 10</>}
          subtitle={lessonCompletionData.length === 0 ? "尚無數據" : "前 10 名最多人完成的章節"}
        >
          {lessonCompletionData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={lessonCompletionData.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#999" fontSize={10} />
                <YAxis type="category" dataKey="chapter" stroke="#999" fontSize={10} width={80} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="completed" name="完成數" fill="#bd93f9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* 第三排：Retention + 裝置 + Hourly */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard
          title={<><BarChart3 className="w-4 h-4" /> Retention（D1-D30）</>}
          subtitle="新註冊用戶留存率"
        >
          {retentionData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" stroke="#999" fontSize={10} />
                <YAxis stroke="#999" fontSize={10} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => `${v}%`} />
                <Line type="monotone" dataKey="retention" stroke="#ffb86c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={<><Smartphone className="w-4 h-4" /> 裝置分佈</>} subtitle="近 7 天">
          {deviceData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  label={(d) => d.name}
                >
                  {deviceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={<><Clock className="w-4 h-4" /> 每小時活躍</>} subtitle="找出 user peak time">
          {hourlyActivityData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="hour" stroke="#999" fontSize={10} tickFormatter={(h) => `${h}:00`} />
                <YAxis stroke="#999" fontSize={10} />
                <Tooltip {...tooltipStyle} labelFormatter={(h) => `${h}:00`} />
                <Bar dataKey="users" fill="#ff79c6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: "#1e1e2e",
    border: "1px solid #444",
    borderRadius: 8,
    fontSize: 12,
  },
};

function ChartCard({
  title, subtitle, actions, children,
}: { title: React.ReactNode; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">{title}</h3>
          {subtitle && <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded ${
        active ? "bg-accent text-black font-semibold" : "bg-bg-elevated hover:bg-border"
      }`}
    >
      {children}
    </button>
  );
}

function Empty() {
  return (
    <div className="h-[200px] flex items-center justify-center text-xs text-fg-muted">
      尚無數據
    </div>
  );
}
