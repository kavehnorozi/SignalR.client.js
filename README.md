# SignalR Client Library

A lightweight JavaScript/TypeScript client for connecting to **multiple SignalR Hubs simultaneously**, with built‑in **message queuing**, **auto‑reconnect**, and a clean, promise-based API. Works in **browsers** and **Node.js** (UMD bundle + ES modules).

> If you're looking for the Persian (Farsi) version of this README, scroll down to **📜 نسخه فارسی**.

---

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Add and connect to a Hub](#add-and-connect-to-a-hub)
  - [Multiple Hubs](#multiple-hubs)
  - [Send & Receive](#send--receive)
  - [Message Queue](#message-queue)
  - [Auto Reconnect](#auto-reconnect)
- [API Reference](#api-reference)
  - [SignalRClient](#signalrclient)
  - [Hub](#hub)
  - [Events](#events)
  - [Options](#options)
- [TypeScript](#typescript)
- [Browser Usage](#browser-usage)
- [Node.js Usage](#nodejs-usage)
- [Examples](#examples)
- [FAQ](#faq)
- [Contributing](#contributing)
- [Versioning](#versioning)
- [License](#license)

---

## Features
- Connect to and manage **multiple Hubs** at once.
- **Send** and **receive** messages with simple methods.
- **Message queue** stores outgoing messages while disconnected.
- **Auto-reconnect** with configurable retry strategy.
- **UMD** output for browsers and **ES module/CommonJS** for Node.js.
- Built with DX in mind: tiny API surface, sensible defaults, and TypeScript types.

---

## Installation

Using npm:

```bash
npm install signalr-client
```

Using yarn:

```bash
yarn add signalr-client
```

Directly in the browser (UMD build):

```html
<script src="dist/signalr-client.min.js"></script>
```

> Global name: `SignalRClientLib`

---

## Quick Start

```javascript
import { SignalRClient } from 'signalr-client';

const client = new SignalRClient();

// Connect to a hub
const hub = await client.addHub('chatHub', 'https://example.com/chatHub');

// Subscribe to messages
hub.on('ReceiveMessage', (msg) => {
  console.log('Received:', msg);
});

// Send a message
await hub.send('SendMessage', 'Hello from client!');
```

---

## Usage

### Add and connect to a Hub

```javascript
const client = new SignalRClientLib.SignalRClient(); // or: new SignalRClient()

client.addHub('chatHub', 'https://example.com/chatHub', {
  reconnect: { retries: 5, retryDelayMs: 1500 },
  queue:     { enabled: true, maxSize: 500 },
  logging:   { level: 'info' },
}).then((hub) => {
  hub.on('ReceiveMessage', (msg) => {
    console.log('Message:', msg);
  });

  hub.send('SendMessage', 'Hi there!');
});
```

### Multiple Hubs

```javascript
await client.addHub('chatHub', 'https://example.com/chatHub');
await client.addHub('notificationHub', 'https://example.com/notificationHub');

const chat = client.getHub('chatHub');
const notif = client.getHub('notificationHub');

notif.on('Notify', (payload) => console.log('Notify:', payload));
await chat.send('SendMessage', 'Using multiple hubs!');
```

### Send & Receive

```javascript
const hub = client.getHub('chatHub');

hub.on('ReceiveMessage', (msg) => console.log('> ', msg));
await hub.send('SendMessage', 'Hello!');
```

### Message Queue
- When **disconnected**, outgoing messages are **queued**.
- After reconnection, queued messages are sent in order.
- Configure with `{ queue: { enabled: true, maxSize: number } }`.

### Auto Reconnect
- Built-in **reconnect** with backoff.
- Configure with `{ reconnect: { retries: number, retryDelayMs: number } }`.
- Emits lifecycle events: `reconnecting`, `reconnected`, `disconnected`.

---

## API Reference

### `SignalRClient`

```ts
class SignalRClient {
  constructor(options?: ClientOptions);
  addHub(name: string, url: string, options?: HubOptions): Promise<Hub>;
  getHub(name: string): Hub | undefined;
  removeHub(name: string): Promise<void>;
  listHubs(): string[];

  // Events (EventEmitter-style or custom)
  on(event: ClientEvent, handler: (...args: any[]) => void): this;
  off(event: ClientEvent, handler: (...args: any[]) => void): this;
}
```

**ClientOptions** (all optional):

```ts
type ClientOptions = {
  reconnect?: ReconnectOptions;
  queue?: QueueOptions;
  logging?: { level?: 'silent' | 'error' | 'warn' | 'info' | 'debug' };
};
```

### `Hub`

```ts
interface Hub {
  name: string;
  url: string;
  state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

  // SignalR method calls
  send(methodName: string, ...args: any[]): Promise<void>;

  // Receive from server
  on(methodName: string, handler: (...args: any[]) => void): this;
  off(methodName: string, handler: (...args: any[]) => void): this;

  // Lifecycle
  close(): Promise<void>;
}
```

### Events

Client-level events (string literals):

- `connected` `(hubName: string)`
- `disconnected` `(hubName: string)`
- `reconnecting` `(hubName: string, attempt: number)`
- `reconnected` `(hubName: string)`
- `error` `(hubName: string, error: unknown)`

### Options

```ts
type ReconnectOptions = {
  retries?: number;       // default: 5
  retryDelayMs?: number;  // default: 1000
  factor?: number;        // backoff multiplier, default: 1.5
};

type QueueOptions = {
  enabled?: boolean; // default: true
  maxSize?: number;  // default: 1000
};

type HubOptions = ClientOptions & {
  headers?: Record<string, string>;
  accessTokenFactory?: () => string | Promise<string>;
  transport?: 'auto' | 'webSockets' | 'serverSentEvents' | 'longPolling';
};
```

---

## TypeScript

Types are included. Example:

```ts
import { SignalRClient, Hub } from 'signalr-client';

const client = new SignalRClient();
const hub: Hub = await client.addHub('orders', 'https://example.com/ordersHub');

hub.on('OrderCreated', (orderId: string) => {
  console.log(orderId);
});
```

---

## Browser Usage

```html
<script src="dist/signalr-client.min.js"></script>
<script>
  const client = new SignalRClientLib.SignalRClient();
  client.addHub('chat', '/chatHub').then((hub) => {
    hub.on('ReceiveMessage', (m) => console.log(m));
    hub.send('SendMessage', 'Hello from the browser!');
  });
</script>
```

---

## Node.js Usage

```bash
npm install signalr-client
```

```js
import { SignalRClient } from 'signalr-client';

const client = new SignalRClient({ logging: { level: 'warn' } });
const hub = await client.addHub('metrics', 'https://example.com/metricsHub');
hub.on('Ping', () => console.log('pong'));
await hub.send('Hello');
```

---

## Examples

- **Auth token per hub**

```js
await client.addHub('secure', 'https://example.com/secureHub', {
  accessTokenFactory: async () => fetch('/token').then(r => r.text()),
});
```

- **Custom transport**

```js
await client.addHub('lp', 'https://example.com/lpHub', {
  transport: 'longPolling',
});
```

- **Remove a hub**

```js
await client.removeHub('chatHub');
```

---

## FAQ

**Q: What happens to messages while the connection is down?**  
A: If the queue is enabled (default), messages are enqueued and flushed after reconnection in the original order.

**Q: How can I detect reconnect attempts?**  
A: Listen to `reconnecting` and `reconnected` events on the client.

**Q: Does this library ship types?**  
A: Yes. Full TypeScript typings are included.

---

## Contributing
PRs and issues are welcome! Please open a discussion for significant changes before submitting PRs.

---

## Versioning
This project follows **semantic versioning** (`MAJOR.MINOR.PATCH`).

---

## License
MIT

---

# 📜 نسخه فارسی (Persian)

یک کتابخانهٔ سبک جاوااسکریپت/تایپ‌اسکریپت برای اتصال به **چندین Hub سیگنال‌آر به صورت همزمان** با **صف پیام‌ها**، **اتصال مجدد خودکار** و API ساده مبتنی بر Promise. قابل استفاده در **مرورگر** و **Node.js** (خروجی UMD و ES Modules).

> برای نسخهٔ انگلیسی این فایل به ابتدای README مراجعه کنید.

---

## فهرست مطالب
- [ویژگی‌ها](#ویژگیها)
- [نصب](#نصب)
- [شروع سریع](#شروع-سریع)
- [نحوهٔ استفاده](#نحوهٔ-استفاده)
  - [افزودن و اتصال به Hub](#افزودن-و-اتصال-به-hub)
  - [چند Hub](#چند-hub)
  - [ارسال و دریافت](#ارسال-و-دریافت)
  - [صف پیام‌ها](#صف-پیامها)
  - [اتصال مجدد خودکار](#اتصال-مجدد-خودکار)
- [مستندات API](#مستندات-api)
  - [SignalRClient](#signalrclient-1)
  - [Hub](#hub-1)
  - [رویدادها](#رویدادها)
  - [گزینه‌ها](#گزینهها)
- [TypeScript](#typescript-1)
- [استفاده در مرورگر](#استفاده-در-مرورگر)
- [استفاده در Node.js](#استفاده-در-nodejs)
- [نمونه‌ها](#نمونهها)
- [سوالات پرتکرار](#سوالات-پرتکرار)
- [مشارکت](#مشارکت)
- [نسخه‌دهی](#نسخهدهی)
- [لایسنس](#لایسنس)

---

## ویژگی‌ها
- اتصال و مدیریت **چند Hub** به‌صورت همزمان
- **ارسال** و **دریافت** پیام با متدهای ساده
- **صف پیام‌ها** برای زمان‌های قطع اتصال
- **اتصال مجدد خودکار** با امکان پیکربندی
- خروجی **UMD** برای مرورگر و **ES/CJS** برای Node.js
- تجربه توسعه عالی با API کوچک و تایپ‌ها

---

## نصب

با npm:

```bash
npm install signalr-client
```

با yarn:

```bash
yarn add signalr-client
```

به‌صورت مستقیم در مرورگر (نسخه UMD):

```html
<script src="dist/signalr-client.min.js"></script>
```

> نام گلوبال: `SignalRClientLib`

---

## شروع سریع

```javascript
import { SignalRClient } from 'signalr-client';

const client = new SignalRClient();
const hub = await client.addHub('chatHub', 'https://example.com/chatHub');

hub.on('ReceiveMessage', (msg) => {
  console.log('پیام:', msg);
});

await hub.send('SendMessage', 'سلام از کلاینت!');
```

---

## نحوهٔ استفاده

### افزودن و اتصال به Hub

```javascript
const client = new SignalRClientLib.SignalRClient(); // یا: new SignalRClient()

client.addHub('chatHub', 'https://example.com/chatHub', {
  reconnect: { retries: 5, retryDelayMs: 1500 },
  queue:     { enabled: true, maxSize: 500 },
  logging:   { level: 'info' },
}).then((hub) => {
  hub.on('ReceiveMessage', (msg) => {
    console.log('پیام:', msg);
  });

  hub.send('SendMessage', 'سلام!');
});
```

### چند Hub

```javascript
await client.addHub('chatHub', 'https://example.com/chatHub');
await client.addHub('notificationHub', 'https://example.com/notificationHub');

const chat = client.getHub('chatHub');
const notif = client.getHub('notificationHub');

notif.on('Notify', (payload) => console.log('اعلان:', payload));
await chat.send('SendMessage', 'اتصال به چند هاب!');
```

### ارسال و دریافت

```javascript
const hub = client.getHub('chatHub');

hub.on('ReceiveMessage', (msg) => console.log('> ', msg));
await hub.send('SendMessage', 'سلام!');
```

### صف پیام‌ها
- هنگام **قطع اتصال**، پیام‌های خروجی **در صف** ذخیره می‌شوند.
- پس از اتصال مجدد، پیام‌ها به ترتیب ارسال می‌شوند.
- با `{ queue: { enabled: true, maxSize: number } }` پیکربندی می‌شود.

### اتصال مجدد خودکار
- **اتصال مجدد** داخلی با بک‌آف.
- با `{ reconnect: { retries: number, retryDelayMs: number } }` پیکربندی می‌شود.
- رویدادها: `reconnecting`، `reconnected`، `disconnected`.

---

## مستندات API

### `SignalRClient`

```ts
class SignalRClient {
  constructor(options?: ClientOptions);
  addHub(name: string, url: string, options?: HubOptions): Promise<Hub>;
  getHub(name: string): Hub | undefined;
  removeHub(name: string): Promise<void>;
  listHubs(): string[];

  on(event: ClientEvent, handler: (...args: any[]) => void): this;
  off(event: ClientEvent, handler: (...args: any[]) => void): this;
}
```

**ClientOptions** (اختیاری):

```ts
type ClientOptions = {
  reconnect?: ReconnectOptions;
  queue?: QueueOptions;
  logging?: { level?: 'silent' | 'error' | 'warn' | 'info' | 'debug' };
};
```

### `Hub`

```ts
interface Hub {
  name: string;
  url: string;
  state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

  send(methodName: string, ...args: any[]): Promise<void>;

  on(methodName: string, handler: (...args: any[]) => void): this;
  off(methodName: string, handler: (...args: any[]) => void): this;

  close(): Promise<void>;
}
```

### رویدادها

رویدادهای سطح کلاینت:

- `connected` `(hubName: string)`
- `disconnected` `(hubName: string)`
- `reconnecting` `(hubName: string, attempt: number)`
- `reconnected` `(hubName: string)`
- `error` `(hubName: string, error: unknown)`

### گزینه‌ها

```ts
type ReconnectOptions = {
  retries?: number;       // پیش‌فرض: 5
  retryDelayMs?: number;  // پیش‌فرض: 1000
  factor?: number;        // ضریب بک‌آف، پیش‌فرض: 1.5
};

type QueueOptions = {
  enabled?: boolean; // پیش‌فرض: true
  maxSize?: number;  // پیش‌فرض: 1000
};

type HubOptions = ClientOptions & {
  headers?: Record<string, string>;
  accessTokenFactory?: () => string | Promise<string>;
  transport?: 'auto' | 'webSockets' | 'serverSentEvents' | 'longPolling';
};
```

---

## TypeScript

تایپ‌ها داخل پکیج گنجانده شده‌اند:

```ts
import { SignalRClient, Hub } from 'signalr-client';

const client = new SignalRClient();
const hub: Hub = await client.addHub('orders', 'https://example.com/ordersHub');

hub.on('OrderCreated', (orderId: string) => {
  console.log(orderId);
});
```

---

## استفاده در مرورگر

```html
<script src="dist/signalr-client.min.js"></script>
<script>
  const client = new SignalRClientLib.SignalRClient();
  client.addHub('chat', '/chatHub').then((hub) => {
    hub.on('ReceiveMessage', (m) => console.log(m));
    hub.send('SendMessage', 'سلام از مرورگر!');
  });
</script>
```

---

## استفاده در Node.js

```bash
npm install signalr-client
```

```js
import { SignalRClient } from 'signalr-client';

const client = new SignalRClient({ logging: { level: 'warn' } });
const hub = await client.addHub('metrics', 'https://example.com/metricsHub');
hub.on('Ping', () => console.log('pong'));
await hub.send('Hello');
```

---

## نمونه‌ها

- **توکن احراز هویت برای هر Hub**

```js
await client.addHub('secure', 'https://example.com/secureHub', {
  accessTokenFactory: async () => fetch('/token').then(r => r.text()),
});
```

- **حمل‌ونقل سفارشی**

```js
await client.addHub('lp', 'https://example.com/lpHub', {
  transport: 'longPolling',
});
```

- **حذف یک Hub**

```js
await client.removeHub('chatHub');
```

---

## سوالات پرتکرار

**س: هنگام قطع بودن اتصال، چه اتفاقی برای پیام‌ها می‌افتد؟**  
ج: اگر صف فعال باشد (به صورت پیش‌فرض فعال است)، پیام‌ها در صف ذخیره و پس از اتصال مجدد به ترتیب ارسال می‌شوند.

**س: تلاش‌های اتصال مجدد را چطور تشخیص بدهم؟**  
ج: به رویدادهای `reconnecting` و `reconnected` در کلاینت گوش کنید.

**س: آیا این کتابخانه تایپ‌ها را ارائه می‌کند؟**  
ج: بله، تایپ‌های کامل TypeScript داخل پکیج موجود است.

---

## مشارکت
مشارکت از طریق Issue و Pull Request خوش‌آمد است. لطفاً برای تغییرات بزرگ، ابتدا گفت‌وگو باز کنید.

---

## نسخه‌دهی
پروژه از **نسخه‌دهی معنایی** پیروی می‌کند (`MAJOR.MINOR.PATCH`).

---

## لایسنس
MIT
