export const metadata = {
  title: "隱私權政策 | AI 島",
  description: "AI 島學習平台的個人資料保護政策、依台灣個資法制定",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose-custom">
      <h1>隱私權政策</h1>
      <p className="text-sm text-fg-muted">
        最後更新：2026 年 5 月 19 日
      </p>

      <p>
        歡迎使用 AI 島學習平台（以下簡稱「本平台」、「我們」）。
        本平台由 SnowRealm 經營（個人開發者：Luffysky）、依《個人資料保護法》制定本政策、
        說明本平台如何蒐集、處理及利用您的個人資料。請您詳閱本政策、若不同意請勿使用本服務。
      </p>

      <h2>一、適用範圍</h2>
      <p>
        本政策適用於您在 ai-island-web.snowrealm.pet（及相關子網域）使用本平台的所有服務。
        不適用於本平台外連結之其他第三方網站。
      </p>

      <h2>二、蒐集的個人資料類別</h2>
      <p>本平台會在下列情況蒐集您的個人資料：</p>
      <ul>
        <li><strong>註冊 / 登入時</strong>：電子郵件、暱稱、頭像（透過 Google / LINE OAuth 取得）</li>
        <li><strong>使用服務時</strong>：學習進度、書籤、筆記、AI 對話紀錄、Z-coin 餘額</li>
        <li><strong>裝置與技術資訊</strong>：IP 位址、瀏覽器類型、作業系統、訪問時間、操作行為</li>
        <li><strong>Cookies 與類似技術</strong>：詳見 <a href="/cookies">Cookie 政策</a></li>
        <li><strong>付款時（如有）</strong>：付款由第三方金流（Newebpay / LINE Pay）處理、本平台不儲存您的信用卡資料</li>
      </ul>

      <h2>三、蒐集目的</h2>
      <ul>
        <li>提供帳號註冊、登入、學習進度追蹤等核心服務</li>
        <li>個人化學習體驗（AI 導師、推薦內容）</li>
        <li>遊戲化機制（XP、Z-coin、徽章）</li>
        <li>服務改善、bug 修復、產品開發</li>
        <li>客服支援、寄發系統通知</li>
        <li>防止濫用、維護服務安全</li>
        <li>遵守法律義務</li>
      </ul>

      <h2>四、利用期間、地區、對象與方式</h2>
      <ul>
        <li><strong>利用期間</strong>：自您註冊起、至您刪除帳號或本平台停止營運時止</li>
        <li><strong>利用地區</strong>：主要儲存於 Supabase（AWS Tokyo 機房）、AI 對話內容會傳輸至 Anthropic / OpenAI / Google 等 AI 服務商</li>
        <li><strong>利用對象</strong>：本平台、提供必要服務的第三方（如金流、AI 服務、CDN）、法律要求之政府機關</li>
        <li><strong>利用方式</strong>：自動化系統處理為主、必要時由本平台人員存取</li>
      </ul>

      <h2>五、第三方服務</h2>
      <p>本平台使用下列第三方服務、您的部分資料會傳輸給他們處理：</p>
      <ul>
        <li><strong>Supabase</strong>（資料庫、認證）— <a href="https://supabase.com/privacy" target="_blank" rel="noopener">隱私政策</a></li>
        <li><strong>Anthropic Claude / OpenAI GPT / Google Gemini</strong>（AI 服務）</li>
        <li><strong>Google OAuth / LINE Login</strong>（第三方登入）</li>
        <li><strong>Zeabur</strong>（網站託管）</li>
        <li><strong>Google Analytics</strong>（流量分析、匿名化）</li>
        <li><strong>Newebpay / LINE Pay / ECPay</strong>（金流、如使用付費服務）</li>
      </ul>

      <h2>六、您的權利</h2>
      <p>依個資法第 3 條、您對自己的個人資料享有下列權利：</p>
      <ol>
        <li>查詢或請求閱覽</li>
        <li>請求製給複製本</li>
        <li>請求補充或更正</li>
        <li>請求停止蒐集、處理或利用</li>
        <li>請求刪除</li>
      </ol>
      <p>
        您可在「會員中心」自助操作、或寄信至 <code>luffysky00@gmail.com</code> 申請。
        本平台會在收到請求後 30 日內回覆。
      </p>

      <h2>七、資料安全</h2>
      <ul>
        <li>密碼以單向雜湊加密儲存（不可逆）</li>
        <li>API Key、敏感資料以 AES-256-GCM 加密</li>
        <li>傳輸層使用 HTTPS / TLS 1.3</li>
        <li>採行業界標準的存取控管（Row Level Security）</li>
        <li>定期安全稽核與更新</li>
      </ul>

      <h2>八、未成年人保護</h2>
      <p>
        本平台未針對 13 歲以下兒童設計、未經父母或監護人同意、請勿提供個人資料。
        若我們發現蒐集了未成年人資料、會立即刪除。
      </p>

      <h2>九、政策變更</h2>
      <p>
        本平台得隨時修訂本政策、修訂時將於本頁公告並更新「最後更新」日期。
        重大變更會以電子郵件或站內通知告知您。
      </p>

      <h2>十、聯絡我們</h2>
      <p>
        若您對本政策有任何疑問、或欲行使前述權利、請聯絡：<br />
        Email: <code>luffysky00@gmail.com</code><br />
        經營者：SnowRealm（個人開發者 Luffysky）<br />
        所在地：新北市鶯歌區
      </p>

      <hr />
      <p className="text-sm text-fg-muted">
        相關政策：<a href="/terms">使用條款</a> · <a href="/cookies">Cookie 政策</a>
      </p>
    </div>
  );
}
