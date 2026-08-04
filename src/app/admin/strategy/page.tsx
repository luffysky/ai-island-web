import { PageHero } from "@/components/admin/PageHero";
import { Swords, Shield, Boxes, Cpu, TriangleAlert, Target, Rocket, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

// 競品技術戰略分析（OpenClaw × NVIDIA NemoClaw × 分身島）。
// 資料來源見頁尾（已用 WebFetch/WebSearch 查證）。canonical 文件：docs/competitive/openclaw-nemoclaw-swot.md
export default function StrategyPage() {
  return (
    <div className="space-y-5 pb-16">
      <PageHero
        icon={Swords}
        title="競品技術戰略分析"
        desc="OpenClaw × NVIDIA NemoClaw × 分身島 — 站在他們肩上做更好"
      />

      <p className="text-sm text-fg-muted leading-relaxed">
        <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-bg-elevated text-xs text-fg-dim">📄 靜態分析文件</span>
        更新 2026-08-05。資料經 WebFetch/WebSearch 逐一查證（非臆測），來源見頁尾。完整文件：
        <code className="mx-1 px-1 rounded bg-bg-elevated">docs/competitive/openclaw-nemoclaw-swot.md</code>
      </p>

      {/* 一、定位 */}
      <Section icon={Target} title="一、三方定位（別打錯對手）">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left text-fg-muted border-b border-border">
                <th className="py-2 pr-3 font-medium">對象</th>
                <th className="py-2 pr-3 font-medium">是什麼</th>
                <th className="py-2 font-medium">對我們的意義</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <Row a="OpenClaw" b="開源個人 AI 代理框架（前身 Clawdbot，Peter Steinberger）。Node/TS，跑你自己機器的背景服務。~60 天衝上 25 萬+ GitHub star" c={<b className="text-red-400">直接對手</b>} note="概念幾乎等於分身島 Agent" />
              <Row a="NVIDIA NemoClaw" b="開源安全沙盒/營運參考堆疊，讓代理（含 OpenClaw）安全跑在 NVIDIA OpenShell 沙盒。本身不是代理" c={<b className="text-emerald-400">基礎設施層</b>} note="可為我所用（enterprise 沙盒）" />
              <Row a="分身島" b="托管式（Next.js+Supabase、零架設）、繁中、綁教育/創作/大眾工具站的多租戶 AI 代理" c={<b className="text-accent">我們</b>} note="同概念、不同市場切法" />
            </tbody>
          </table>
        </div>
        <Callout>OpenClaw＝自架/單人/技術宅/全球英文/無變現；分身島＝托管/零架設/繁中大眾/教育+變現漏斗/多租戶安全。<b>同一概念、完全不同市場</b>。</Callout>
      </Section>

      {/* 二、OpenClaw 技術 */}
      <Section icon={Cpu} title="二、OpenClaw 技術深度解析">
        <ul className="text-sm space-y-2 leading-relaxed list-disc pl-5">
          <li><b>Gateway 單一長駐 Node 程序＝控制平面</b>，五子系統：Channel adapters（WhatsApp=Baileys／Telegram=grammY）、Session manager、Queue（每 session 串行）、Agent runtime（從 AGENTS.md/SOUL.md/TOOLS.md/MEMORY.md/日誌組 context→迴圈）、Control plane（WebSocket port 18789）</li>
          <li><b>記憶＝本機純 Markdown/YAML 檔</b>（<code>~/.openclaw</code>）：可編輯/git 版控/grep——透明、可攜、不鎖廠商</li>
          <li><b>技能＝<code>SKILL.md</code></b>（YAML frontmatter+自然語言），經 <b>ClawHub</b> 市集散布（13,700+），相容 Claude Code/Cursor</li>
          <li><b>自主＝背景 daemon + 心跳</b>（預設 30 分）讀 HEARTBEAT.md 決定要不要動；webhook/cron 外部觸發</li>
          <li><b>模型不可知</b>：Anthropic/OpenAI/Google/xAI/Mistral/DeepSeek/Ollama。<b>自架</b> 2–4GB RAM、$5 VPS；成本 $18–540/月</li>
        </ul>
        <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-sm">
          <div className="flex items-center gap-1.5 font-semibold text-red-400 mb-1.5"><TriangleAlert className="w-4 h-4" /> 安全是他們最大痛點（＝我們的機會）</div>
          <ul className="space-y-1 list-disc pl-5 text-fg-muted">
            <li><b>CVE-2026-25253（CVSS 8.8）</b>：cross-site WebSocket hijacking，一個惡意連結偷 token 拿 RCE；揭露時 <b>2.1 萬 instance 曝露公網</b>（多為 HTTP）</li>
            <li><b>技能供應鏈</b>：Cisco 測出 <b>26% 社群技能 ≥1 漏洞</b>；ClawHub 出現過惡意技能排第一</li>
            <li><b>自主執行無把關</b>：曾自動寄保險申訴、談車價——不可逆動作沒人核准</li>
          </ul>
        </div>
        <Callout>弱點（vs LangChain/CrewAI/AutoGen）：Markdown 技能失去程式表達力；不適合嵌進既有產品；非 cloud-native；架設門檻高；權限面過廣（Palo Alto 點名）。</Callout>
      </Section>

      {/* 三、NemoClaw */}
      <Section icon={Boxes} title="三、NVIDIA NemoClaw（可為我所用的層）">
        <ul className="text-sm space-y-2 leading-relaxed list-disc pl-5">
          <li>開源參考堆疊，把代理放進 <b>NVIDIA OpenShell 沙盒</b>安全執行：managed inference、network policy、<b>egress 控制</b>、snapshots、生命週期、憑證處理、沙盒硬化</li>
          <li>支援代理：OpenClaw（預設）/Hermes/LangChain Deep Agents。TS/Node+Docker+CLI，Apache 2.0，22k star</li>
          <li><b>對我們</b>：這是「代理↔推論之間的安全/營運層」。打 enterprise 時可讓分身島代理跑在 NemoClaw/OpenShell 沙盒，或借鏡其 egress/snapshot/network policy</li>
        </ul>
      </Section>

      {/* 四、SWOT */}
      <Section icon={Shield} title="四、分身島 SWOT">
        <div className="grid sm:grid-cols-2 gap-3">
          <Quad tone="emerald" title="S 優勢">
            <li><b>托管、零架設</b>：登入即用，不用 VPS/systemd/OAuth（OpenClaw 最大門檻）</li>
            <li><b>多租戶安全內建</b>：RLS、逐項 approval、per-agent 日預算、STEP_CAP、伺服器隔離沙盒跑 code——正補 OpenClaw 致命傷</li>
            <li><b>繁中大眾 + 教育/創作/大眾工具漏斗 + 變現內建</b>（Z幣/訂閱/LINE 推播）</li>
            <li>已有 orchestrator L1–L5、技能合成、多代理、MCP+OpenAPI、pgvector RAG、語音代理、桌面 bridge</li>
          </Quad>
          <Quad tone="amber" title="W 劣勢">
            <li>托管＝資料所有權/隱私不如本機（OpenClaw 主打 privacy-first）</li>
            <li>通路數少（我們 LINE 為主；OpenClaw 20+ 內建 WhatsApp/Signal/iMessage）</li>
            <li>沒有技能市集/社群網路效應（OpenClaw 13,700+/ClawHub）</li>
            <li>非開源＝無社群貢獻與病毒成長；規模品牌遠不如</li>
          </Quad>
          <Quad tone="sky" title="O 機會">
            <li><b>匯入 OpenClaw 技能生態</b>：支援 SKILL.md → 吃 ClawHub 技能，<b>而且我們幫掃漏洞</b>（他們 26% 有洞）＝把對手弱點變賣點</li>
            <li>繁中/亞洲/非技術大眾＝OpenClaw 服務不到的一塊；「不會架站的人的 OpenClaw」</li>
            <li>enterprise：借 NemoClaw 沙盒做「安全托管代理」</li>
            <li>透明可攜記憶（匯出 AGENTS.md/MEMORY.md）降鎖廠商疑慮</li>
          </Quad>
          <Quad tone="rose" title="T 威脅">
            <li>OpenClaw 爆炸成長 + NVIDIA 加持 NemoClaw；品類商品化</li>
            <li>若 OpenClaw 推托管版/繁中版＝正面對撞</li>
            <li>品類安全事件（CVE/惡意技能）連累大眾信任</li>
          </Quad>
        </div>
      </Section>

      {/* 五、路線 */}
      <Section icon={Rocket} title="五、站在他們肩上做更好">
        <div className="space-y-3 text-sm leading-relaxed">
          <StepBlock title="A. 吸收好設計（為我所用）">
            <li>檔案式透明記憶：分身記憶可匯出 AGENTS.md/SOUL.md/MEMORY.md（可攜/git/降鎖廠商），底層仍存 DB（多租戶）</li>
            <li>SKILL.md 相容 + 技能市集（併 §2.7.9）：匯入 ClawHub/Claude Code 技能 + <b>內建安全掃描</b>（解他們 26% 漏洞痛點）</li>
            <li>心跳自主（已有 autonomous 排程，補 HEARTBEAT 式可讀策略）；多通路 adapter（WhatsApp/Signal/Slack）；MCP/OpenAPI 續當賣點</li>
          </StepBlock>
          <StepBlock title="B. 打他們痛點當差異化">
            <li><b>安全托管天生贏</b>：不曝露公網、逐項 approval、預算硬上限、伺服器沙盒、RLS。拿「OpenClaw 的 CVE/惡意技能/失控自主」當行銷對照</li>
            <li>零架設 + 繁中 + 大眾漏斗 + 變現＝他們完全沒有的市場</li>
          </StepBlock>
          <StepBlock title="C. 與 NemoClaw 互補（非對抗）">
            <li>enterprise 版：分身島代理可選跑在 NemoClaw/OpenShell 沙盒（egress/snapshot），主打「合規安全代理」</li>
          </StepBlock>
        </div>
      </Section>

      {/* 來源 */}
      <Section icon={ExternalLink} title="資料來源">
        <ul className="text-sm space-y-1">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
                {s.label} <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

const SOURCES = [
  { label: "OpenClaw GitHub", url: "https://github.com/openclaw/openclaw" },
  { label: "OpenClaw 官網", url: "https://openclaw.ai/" },
  { label: "NVIDIA NemoClaw（產品）", url: "https://www.nvidia.com/zh-tw/ai/nemoclaw/" },
  { label: "NemoClaw GitHub", url: "https://github.com/NVIDIA/NemoClaw" },
  { label: "Milvus 技術指南", url: "https://milvus.io/blog/openclaw-formerly-clawdbot-moltbot-explained-a-complete-guide-to-the-autonomous-ai-agent.md" },
  { label: "SFAI Labs（vs LangChain/CrewAI/AutoGen）", url: "https://sfailabs.com/guides/openclaw-ai-agent-framework" },
];

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-bg-card border border-border rounded-2xl p-4 sm:p-5">
      <h2 className="text-base font-semibold inline-flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-accent" /> {title}</h2>
      {children}
    </section>
  );
}

function Row({ a, b, c, note }: { a: string; b: string; c: React.ReactNode; note: string }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{a}</td>
      <td className="py-2.5 pr-3 text-fg-muted">{b}</td>
      <td className="py-2.5">{c}<div className="text-xs text-fg-dim mt-0.5">{note}</div></td>
    </tr>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm text-fg-muted leading-relaxed">{children}</div>;
}

const QUAD_TONE: Record<string, string> = {
  emerald: "border-emerald-500/40 bg-emerald-500/5",
  amber: "border-amber-500/40 bg-amber-500/5",
  sky: "border-sky-500/40 bg-sky-500/5",
  rose: "border-rose-500/40 bg-rose-500/5",
};
function Quad({ tone, title, children }: { tone: string; title: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-3 ${QUAD_TONE[tone]}`}>
      <div className="font-semibold text-sm mb-1.5">{title}</div>
      <ul className="text-sm space-y-1 list-disc pl-5 text-fg-muted leading-relaxed">{children}</ul>
    </div>
  );
}

function StepBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated/40 p-3">
      <div className="font-semibold mb-1">{title}</div>
      <ul className="list-disc pl-5 space-y-1 text-fg-muted">{children}</ul>
    </div>
  );
}
