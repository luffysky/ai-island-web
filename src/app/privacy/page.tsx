export const metadata = {
  title: "隱私權政策 | AI 島",
  description: "AI 島學習平台的個人資料保護政策、依台灣個資法制定",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose-custom">
      <h1>隱私權政策</h1>
      <p className="text-sm text-fg-muted">
        最後更新：2026 年 5 月 25 日
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
        <li><strong>裝置與技術資訊</strong>：IP 位址、瀏覽器類型、作業系統、螢幕尺寸、訪問時間、操作行為（點擊 / 停留時長 / 訪問路徑）</li>
        <li>
          <strong>地理位置資料</strong>：
          <ul>
            <li><strong>大致縣市（自動）</strong>：透過 IP 反查取得（IPInfo / OpenStreetMap）、用於異常登入警告、語系自動選擇、CDN 加速、合規處理（如歐盟 GDPR cookie 提示）</li>
            <li><strong>精準 GPS 座標（需您主動同意）</strong>：僅在您於設定中啟用「精準位置」後才會收集、用於同學媒合、線下活動通知、支付幣別自動帶。<strong>原始 GPS 不長期儲存</strong>、只存反查後的大致縣市；隨時可在「設定 → 精準位置」關閉並撤回授權。</li>
          </ul>
        </li>
        <li><strong>Cookies 與類似技術</strong>：詳見 <a href="/cookies">Cookie 政策</a></li>
        <li><strong>付款時（如有）</strong>：付款由第三方金流（Newebpay / LINE Pay）處理、本平台不儲存您的信用卡資料</li>
      </ul>

      <h2>三、蒐集目的</h2>
      <ul>
        <li>提供帳號註冊、登入、學習進度追蹤等核心服務</li>
        <li>個人化學習體驗（AI 導師、推薦內容、Chapter 推薦演算法）</li>
        <li>遊戲化機制（XP、Z-coin、徽章、排行榜）</li>
        <li>服務改善、bug 修復、產品開發、流量分析（Google Analytics 匿名化）</li>
        <li>客服支援、寄發系統通知、教師批改學員作業</li>
        <li>防止濫用、維護服務安全、異常登入警告（IP 地理位置變化偵測）</li>
        <li>遵守法律義務</li>
      </ul>

      <h2>四、平台運營透明度</h2>
      <p>
        為了維護服務品質、防止濫用、第一時間發現異常、本平台會在內部監看下列事件：
      </p>
      <ul>
        <li><strong>系統健康指標</strong>：錯誤率、回應時間、用戶活躍狀況等聚合數據</li>
        <li><strong>訪客活動</strong>：未登入訪客的訪問來源 IP、大致地理位置、裝置類型、停留時長（用於分析流量、偵測爬蟲 / 攻擊）</li>
        <li><strong>系統錯誤</strong>：自動偵測異常並通知平台運營者排查</li>
        <li>
          <strong>用戶里程碑事件（可關閉）</strong>：登入、完課、升等、論壇互動、解鎖成就。
          <br />
          預設會即時通知平台運營端、您可在「<a href="/settings">設定 → 🌙 低調模式</a>」一鍵啟用低調、之後不再即時播報。
        </li>
      </ul>
      <p>
        所有監看內容<strong>不包含您的密碼、AI 對話內容、付款資訊</strong>等敏感資料、僅用於營運監控。
        無論是否啟用低調模式、您的學習資料儲存 / 統計 / 排行榜都完全一樣、不受影響。
      </p>

      <h2>五、利用期間、地區、對象與方式</h2>
      <ul>
        <li><strong>利用期間</strong>：自您註冊起、至您刪除帳號或本平台停止營運時止</li>
        <li><strong>利用地區</strong>：主要儲存於 Supabase（AWS Tokyo 機房）、AI 對話內容會傳輸至 Anthropic / OpenAI / Google 等 AI 服務商</li>
        <li><strong>利用對象</strong>：本平台、提供必要服務的第三方（如金流、AI 服務、CDN）、法律要求之政府機關</li>
        <li><strong>利用方式</strong>：自動化系統處理為主、必要時由本平台人員存取（會記錄到 audit log）</li>
      </ul>

      <h2>六、AI 對話資料處理</h2>
      <p>
        使用「AI 導師（綠寶 / 肥仔 / 菇寶）」、「AI 助教」、「寵物 AI 對話」等功能時、
        您輸入的<strong>對話內容會即時傳輸至 AI 服務商</strong>（Anthropic / OpenAI / Google / Groq、由您選擇的模型決定）。
      </p>
      <ul>
        <li>AI 服務商<strong>不會用您的對話訓練模型</strong>（依各家服務商企業 API 條款）</li>
        <li>對話紀錄會儲存在本平台 DB（讓您之後可以查歷史）、可在「設定」隨時刪除</li>
        <li>若您使用「自己的 API key（BYOK）」、對話直接從本平台 → AI 服務商、不通過第三方</li>
        <li>本平台 admin 可能會對被標記為違規的對話進行審核（content moderation）、用於防止 AI 濫用</li>
      </ul>

      <h2>七、第三方服務</h2>
      <p>本平台使用下列第三方服務、您的部分資料會傳輸給他們處理：</p>
      <ul>
        <li><strong>Supabase</strong>（資料庫、認證、Storage）— <a href="https://supabase.com/privacy" target="_blank" rel="noopener">隱私政策</a></li>
        <li><strong>Anthropic Claude / OpenAI GPT / Google Gemini / Groq</strong>（AI 服務、企業 API、不訓練模型）</li>
        <li><strong>Google OAuth / LINE Login</strong>（第三方登入）</li>
        <li><strong>Zeabur</strong>（網站託管）</li>
        <li><strong>Google Analytics 4</strong>（流量分析、IP 匿名化）</li>
        <li><strong>IPInfo / OpenStreetMap Nominatim</strong>（IP → 大致地理位置反查）</li>
        <li><strong>Resend</strong>（系統 email 寄送）</li>
        <li><strong>Newebpay / LINE Pay / ECPay</strong>（金流、如使用付費服務）</li>
        <li><strong>LINE Messaging API</strong>（管理員 / 用戶通知推送）</li>
      </ul>

      <h2>八、您的權利</h2>
      <p>依個資法第 3 條、您對自己的個人資料享有下列權利：</p>
      <ol>
        <li>查詢或請求閱覽（含 <strong>GDPR 匯出</strong>：在 <a href="/settings">設定</a> 可一鍵下載您所有資料的 JSON）</li>
        <li>請求製給複製本</li>
        <li>請求補充或更正</li>
        <li>請求停止蒐集、處理或利用（含關閉精準位置、關閉 AI 對話記錄、撤回行銷 email 訂閱）</li>
        <li>請求刪除（在 <a href="/settings">設定</a> 可申請<strong>帳號刪除</strong>、本平台會在 30 日內處理）</li>
      </ol>
      <p>
        您可在「會員中心」自助操作、或寄信至 <code>luffysky00@gmail.com</code> 申請。
        本平台會在收到請求後 30 日內回覆。
      </p>

      <h2>九、資料安全</h2>
      <ul>
        <li>密碼以單向雜湊加密儲存（不可逆）</li>
        <li>API Key、敏感資料以 AES-256-GCM 加密</li>
        <li>傳輸層使用 HTTPS / TLS 1.3</li>
        <li>採行業界標準的存取控管（Row Level Security）</li>
        <li>所有 admin 操作敏感資料的動作都會寫入 audit log</li>
        <li>定期安全稽核與更新</li>
      </ul>

      <h2>十、未成年人保護</h2>
      <p>
        本平台未針對 13 歲以下兒童設計、未經父母或監護人同意、請勿提供個人資料。
        若我們發現蒐集了未成年人資料、會立即刪除。
      </p>

      <h2>十一、政策變更</h2>
      <p>
        本平台得隨時修訂本政策、修訂時將於本頁公告並更新「最後更新」日期。
        重大變更會以電子郵件或站內通知告知您。
      </p>

      <h2>十二、聯絡我們</h2>
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
