export const metadata = {
  title: "Cookie 政策 | AI 島",
  description: "AI 島如何使用 Cookies 及您的選擇權",
};

export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose-custom">
      <h1>Cookie 政策</h1>
      <p className="text-sm text-fg-muted">
        最後更新：2026 年 5 月 19 日
      </p>

      <h2>一、什麼是 Cookie</h2>
      <p>
        Cookie 是儲存在您裝置上的小型文字檔、讓網站記住您的偏好設定或登入狀態。
        類似技術還包括 LocalStorage、SessionStorage、IndexedDB 等。本政策統稱「Cookies」。
      </p>

      <h2>二、本平台使用的 Cookies 類別</h2>

      <h3>1. 必要型 Cookies（不可關閉）</h3>
      <p>提供核心服務所需、關閉將導致無法使用。</p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr><th>名稱</th><th>用途</th><th>期限</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sb-*-auth-token</code></td>
            <td>登入狀態（Supabase Auth）</td>
            <td>1 週</td>
          </tr>
          <tr>
            <td><code>sb-*-auth-token-code-verifier</code></td>
            <td>OAuth PKCE 驗證</td>
            <td>5 分鐘</td>
          </tr>
          <tr>
            <td><code>cookie-consent</code></td>
            <td>記錄您的 Cookie 同意選擇</td>
            <td>1 年</td>
          </tr>
        </tbody>
      </table>
      </div>

      <h3>2. 功能型 Cookies</h3>
      <p>記住您的偏好（如主題、語言）、增強使用體驗。</p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr><th>名稱</th><th>用途</th><th>期限</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>theme</code></td>
            <td>深色 / 淺色模式偏好</td>
            <td>1 年</td>
          </tr>
          <tr>
            <td><code>locale</code></td>
            <td>語言偏好</td>
            <td>1 年</td>
          </tr>
        </tbody>
      </table>
      </div>

      <h3>3. 分析型 Cookies（可選）</h3>
      <p>協助我們瞭解使用者行為、改善服務。資料已匿名化、不會識別個別使用者。</p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr><th>來源</th><th>用途</th><th>期限</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Google Analytics (<code>_ga</code>, <code>_ga_*</code>)</td>
            <td>流量分析、行為追蹤</td>
            <td>2 年</td>
          </tr>
        </tbody>
      </table>
      </div>

      <h3>4. 第三方 Cookies</h3>
      <p>當您使用第三方登入時、相應服務會設定其 Cookies：</p>
      <ul>
        <li><strong>Google</strong>（OAuth 登入）</li>
        <li><strong>LINE</strong>（LINE 登入）</li>
      </ul>
      <p>這些 Cookies 由第三方控制、適用其各自的隱私政策。</p>

      <h2>三、您的選擇權</h2>
      <ul>
        <li><strong>同意 / 拒絕</strong>：首次訪問時可在 Cookie Banner 選擇</li>
        <li><strong>瀏覽器設定</strong>：可隨時透過瀏覽器設定刪除或封鎖 Cookies</li>
        <li><strong>退出 Analytics</strong>：使用 <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics Opt-Out 外掛</a></li>
      </ul>

      <h2>四、瀏覽器 Cookie 管理</h2>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Chrome</a></li>
        <li><a href="https://support.mozilla.org/zh-TW/kb/cookies" target="_blank" rel="noopener">Firefox</a></li>
        <li><a href="https://support.apple.com/zh-tw/guide/safari/sfri11471/mac" target="_blank" rel="noopener">Safari</a></li>
        <li><a href="https://support.microsoft.com/zh-tw/microsoft-edge" target="_blank" rel="noopener">Edge</a></li>
      </ul>

      <h2>五、政策變更</h2>
      <p>本政策可能不時更新、請定期查閱。重大變更會以站內通知告知。</p>

      <hr />
      <p className="text-sm text-fg-muted">
        相關政策：<a href="/privacy">隱私權政策</a> · <a href="/terms">使用條款</a>
      </p>
    </div>
  );
}
