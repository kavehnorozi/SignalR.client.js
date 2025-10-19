# SignalR Client Library (Simple, Practical & Multi‑Hub)

A tiny TypeScript wrapper around **@microsoft/signalr** that makes it dead‑simple to use **multiple Hubs**, with **auto‑reconnect** and a **built‑in queue** for both `send` and `invoke`. Works in browsers and Node.js.

> نسخه فارسی در ادامه ⬇️

---

## Features
- Multiple hubs with a single client
- Auto‑reconnect with configurable backoff
- Queue for **send** _and_ **invoke** while disconnected
- Tiny, friendly API + TypeScript types
- Optional access token factory & transport selection

---

## Install

```bash
npm i @microsoft/signalr
# then copy `signalr-client.ts` into your project
```

---

## Quick Start

```ts
import { SignalRClient } from './signalr-client';

const client = new SignalRClient();
const chat = await client.addHub('chat', 'https://example.com/chatHub');

chat.on('ReceiveMessage', (m) => console.log('> ', m));

await chat.send('SendMessage', 'Hello!');             // fire-and-forget
const pong = await chat.invoke('Ping', 'data');       // request/response
```

### Options

```ts
const client = new SignalRClient({
  reconnect: { retries: 6, retryDelayMs: 800, factor: 2 },
  queue:     { enabled: true, maxSize: 500, dropStrategy: 'oldest' },
  logging:   { level: 'warn' },
  transport: 'auto', // or: 'webSockets' | 'serverSentEvents' | 'longPolling'
});
```

Per-hub options are supported via `addHub(name, url, options)` and override client defaults.

---

## API

### `SignalRClient`
- `addHub(name, url, options?) => Promise<Hub>`
- `getHub(name) => Hub | undefined`
- `listHubs() => string[]`
- `removeHub(name) => Promise<void>`
- Events: `connected | disconnected | reconnecting | reconnected | error`

```ts
client.on('reconnecting', (hubName) => console.log('…reconnecting', hubName));
client.on('reconnected',  (hubName) => console.log('✅ reconnected', hubName));
```

### `Hub`
- `send(method, ...args): Promise<void>`
- `invoke<T>(method, ...args): Promise<T>`
- `on(method, handler): this`
- `off(method, handler): this`
- `close(): Promise<void>`
- Props: `name`, `url`, `state`, `connectionId?`

Queue behavior:
- When disconnected, `send` is queued.
- `invoke` returns a Promise that resolves after reconnection when flushed.
- If the queue is full, it drops the **oldest** item by default (configurable).

---

## Browser

Use a bundler (Vite/Webpack/Rspack/ESBuild). If you expose UMD, you can attach to `window.SignalRClientLib` (see last line in `signalr-client.ts`).

---

## License
MIT

---

# 📜 نسخه فارسی

کتابخانهٔ کوچک TypeScript برای ساده‌سازی کار با **@microsoft/signalr**. اتصال به **چند هاب** با یک کلاینت، **اتصال مجدد خودکار** و **صف داخلی** برای `send` و `invoke` در زمان قطع بودن ارتباط.

## ویژگی‌ها
- چندین هاب با یک کلاینت
- اتصال مجدد خودکار با بک‌آف قابل تنظیم
- صف برای `send` و `invoke` در حالت قطع اتصال
- API ساده به‌همراه تایپ‌های TypeScript
- پشتیبانی از `accessTokenFactory` و انتخاب نوع انتقال (Transport)

## نصب
```bash
npm i @microsoft/signalr
# سپس فایل `signalr-client.ts` را به پروژه اضافه کنید
```

## شروع سریع
```ts
import { SignalRClient } from './signalr-client';

const client = new SignalRClient();
const chat = await client.addHub('chat', 'https://example.com/chatHub');

chat.on('ReceiveMessage', (m) => console.log('> ', m));

await chat.send('SendMessage', 'سلام!');
const pong = await chat.invoke('Ping', 'data');
```

## گزینه‌ها
```ts
const client = new SignalRClient({
  reconnect: { retries: 6, retryDelayMs: 800, factor: 2 },
  queue:     { enabled: true, maxSize: 500, dropStrategy: 'oldest' },
  logging:   { level: 'warn' },
  transport: 'auto',
});
```

## API خلاصه
- `addHub(name, url, options?)` → هاب جدید
- `getHub(name)`، `listHubs()`، `removeHub(name)`
- رویدادها: `connected | disconnected | reconnecting | reconnected | error`
- متدهای هاب: `send`، `invoke`، `on`، `off`، `close`
- ویژگی‌ها: `name`، `url`، `state`، `connectionId?`

## مجوز
MIT
