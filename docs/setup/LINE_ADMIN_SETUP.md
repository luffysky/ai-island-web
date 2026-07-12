# LINE Admin 通知設定

## 1. 單一 admin（最簡單、適合剛開始）

Zeabur env：
```
ADMIN_LINE_CHANNEL_TOKEN=<Channel access token long-lived>
ADMIN_LINE_CHANNEL_SECRET=<Channel secret>
ADMIN_LINE_USER_ID=<你的 LINE userId>
ADMIN_LINE_USER_LABEL=luffy
ADMIN_LINE_USER_ROLE=董事長
IPINFO_TOKEN=<選填、訪客地理資訊>
```

效果：
- 所有 admin 通知都推給你
- LINE 跟 bot 對話、AI 知道你是「luffy（董事長）」

## 2. 多 admin（之後 Nami 想收通知時用）

把上面 `ADMIN_LINE_USER_ID` / `ADMIN_LINE_USER_LABEL` / `ADMIN_LINE_USER_ROLE` 換成：
```
ADMIN_LINE_USERS=[{"id":"Uxxxxx","name":"luffy","role":"董事長"},{"id":"Uyyyyy","name":"Nami","role":"營運長"}]
```

效果：
- 通知會同時推給 luffy 跟 Nami
- LINE 對 bot 對話、AI 根據 userId 認對方身份注入 system prompt

## 3. 取得 Nami 的 userId

1. Nami 加 bot 為好友（同一個 bot QR code、給她掃）
2. Nami 對 bot 傳「hi」
3. bot 會 reply 給 Nami：「你的 userId: Uxxxx、把這個給管理員 」
4. Nami 把 userId 傳給 luffy
5. luffy 把 Nami 加進 ADMIN_LINE_USERS env、重啟 Zeabur

## 4. 預設假設

如果 Nami 還沒給 userId、env 只有 luffy → 只有 luffy 收通知。
之後 Nami 拿到 userId 才加進 env、立刻生效。

## 5. 暫停某 admin 收通知

從 ADMIN_LINE_USERS 把那個物件移除、重啟。
（未來可加 per-user `enabled: false` 開關、目前最簡單就是 remove。）

## 6. bot 命令系統

不管哪個 admin 都可用：
- `/help` 列所有命令
- `/today` 今日 KPI（DAU / 新註冊 / 完課 / 收入）
- `/kpi 7` 7 天 KPI（可改數字 1/7/30/90）
- `/users` 最近 10 位註冊用戶
- `/churn` 流失預警 Top 10
- `/errors` 最近 10 個系統錯誤
- `/who` 看 bot 認到的你的身份
- `/clear` 清自己對話歷史
- 其他訊息 → AI 對話（用 admin 身份注入 system prompt）

## 7. 通知範例

訪客 visit：
```
👀 訪客 看 /chapters/17（首次訪問）
📍 TW · Taipei · 110
💻 Chrome on macOS
📡 Chunghwa Telecom Co.,Ltd.
🌐 1.234.567.89
📍 點看地圖：https://www.google.com/maps?q=...
```

升等：
```
🎉 luffy 升等到 Lv 12
```

論壇回覆：
```
💭 alice 回覆「Next.js Server Action 怎麼測？」
```
