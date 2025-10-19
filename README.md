# SignalRClientJs — One‑File SignalR Client (No CDN)

A single‑script JavaScript client for connecting to **ASP.NET Core SignalR Hubs**.  
Works in **ASP.NET Core MVC** (via Static Web Assets) and **ASP.NET MVC (classic)** (via content files).  
**No CDN is required**: the bundle auto‑loads a **local** `signalr.min.js` that is shipped with this package and sits next to the bundle.

> The Persian version is below (نسخهٔ فارسی در ادامه).

---

## Table of Contents
- [What you get](#what-you-get)
- [How it works](#how-it-works)
- [Install (NuGet)](#install-nuget)
- [ASP.NET Core MVC usage](#aspnet-core-mvc-usage)
- [ASP.NET MVC (classic) usage](#aspnet-mvc-classic-usage)
- [Quick Start (JS API)](#quick-start-js-api)
- [Options](#options)
- [Multiple hubs](#multiple-hubs)
- [Client events](#client-events)
- [Server sample hub](#server-sample-hub)
- [Troubleshooting](#troubleshooting)
- [Package layout & author notes](#package-layout--author-notes)
- [License](#license)

---

## What you get

**Files included** (shipped with the NuGet package):

- `wwwroot/js/signalr.client.bundle.js` — the one‑file client you include in your pages
- `wwwroot/js/signalr.min.js` — the official browser build of `@microsoft/signalr` placed locally
- `contentFiles/any/any/Scripts/*` — same two files for **ASP.NET MVC classic** auto‑copy

> In **ASP.NET Core**, these appear at runtime under `/_content/SignalRClientJs/js/...`

---

## How it works

- You include **one** script: `signalr.client.bundle.js`.
- On load, the bundle checks for `window.signalR`. If missing, it **loads the local** `signalr.min.js` **from the same folder** as the bundle (no CDN).
- Then it exposes a global: `window.SignalRClientLib` with:
  - `new SignalRClientLib.SignalRClient(options?)`
  - `SignalRClientLib.SignalRHub` (advanced: per‑hub instance)

---

## Install (NuGet)

```powershell
Install-Package SignalRClientJs
# or
dotnet add package SignalRClientJs
```

---

## ASP.NET Core MVC usage

1) Ensure static files are enabled in your app (usually already the case):

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();
app.UseStaticFiles();

app.MapHub<ChatHub>("/chatHub"); // sample hub route
app.MapDefaultControllerRoute();
app.Run();
```

2) Add **one** script tag to your layout (or specific view):

```html
<!-- Views/Shared/_Layout.cshtml -->
<script src="~/_content/SignalRClientJs/js/signalr.client.bundle.js" asp-append-version="true"></script>
```

3) Use it in your view:

```html
@section Scripts {
<script>
  (async () => {
    // Create client (options are optional)
    const client = new SignalRClientLib.SignalRClient({
      reconnect: { retries: 6, retryDelayMs: 800, factor: 2 },
      queue:     { enabled: true, maxSize: 500 }
    });

    // Connect to your hub (relative path is fine if same site)
    const hub = await client.addHub('chat', '/chatHub');

    // Receive messages from server
    hub.on('ReceiveMessage', msg => console.log('> ', msg));

    // Send a message
    await hub.send('SendMessage', 'Hello from Core!');

    // Or invoke (request/response)
    const pong = await hub.invoke('Ping', 'data');
    console.log('invoke result:', pong);
  })();
</script>
}
```

That’s it. No other scripts required. The bundle will auto‑load the local `signalr.min.js` placed next to it.

---

## ASP.NET MVC (classic) usage

When you install the package, the two JS files are **copied into your project’s** `~/Scripts/` folder automatically via a `.targets` file.

Add a single script tag to your layout/view:

```html
<script src="~/Scripts/signalr.client.bundle.js"></script>
<script>
  (async () => {
    const client = new SignalRClientLib.SignalRClient();
    const hub = await client.addHub('chat', '/chatHub');
    hub.on('ReceiveMessage', console.log);
    await hub.send('SendMessage', 'Hello classic MVC!');
  })();
</script>
```

The bundle locates `signalr.min.js` sitting in the **same folder** and loads it automatically.

---

## Quick Start (JS API)

```js
// Create the client
const client = new SignalRClientLib.SignalRClient({
  reconnect: { retries: 6, retryDelayMs: 800, factor: 2 },
  queue:     { enabled: true, maxSize: 500, dropStrategy: 'oldest' }, // or 'newest'
  logging:   { level: 'warn' },
  transport: 'auto', // 'webSockets' | 'serverSentEvents' | 'longPolling'
  // accessTokenFactory: async () => 'JWT-or-bearer-token'
});

// Add/connect to a hub
const hub = await client.addHub('chat', '/chatHub');

// Listen for server-to-client method calls
hub.on('ReceiveMessage', msg => console.log(msg));

// Send (fire-and-forget)
await hub.send('SendMessage', 'hello');

// Invoke (request/response)
const result = await hub.invoke('Echo', { foo: 'bar' });
console.log(result);

// Remove a hub later
await client.removeHub('chat');
```

---

## Options

```ts
type ReconnectOptions = {
  retries?: number;       // default: 5
  retryDelayMs?: number;  // default: 1000
  factor?: number;        // default: 1.8 (exponential backoff)
  delaysMs?: number[];    // custom schedule (overrides above)
};

type QueueOptions = {
  enabled?: boolean;        // default: true
  maxSize?: number;         // default: 1000
  dropStrategy?: 'oldest' | 'newest'; // default: 'oldest'
};

type LoggingOptions = { level?: 'silent' | 'error' | 'warn' | 'info' | 'debug' };

type HubOptions = {
  reconnect?: ReconnectOptions;
  queue?: QueueOptions;
  logging?: LoggingOptions;
  headers?: Record<string, string>;            // may be ignored by browsers
  accessTokenFactory?: () => string | Promise<string>;
  transport?: 'auto' | 'webSockets' | 'serverSentEvents' | 'longPolling';
};
```

- You can pass options to the client **and** override per‑hub via `addHub(name, url, options)`.
- `accessTokenFactory` is handy for JWT/Bearer auth hubs.

---

## Multiple hubs

```js
const chat = await client.addHub('chat', '/chatHub');
const notif = await client.addHub('notif', '/notificationHub');

notif.on('Notify', p => console.log('notify:', p));
await chat.send('SendMessage', 'Using multiple hubs');
```

List/remove hubs:

```js
console.log(client.listHubs());  // ['chat','notif']
await client.removeHub('notif');
```

---

## Client events

Subscribe on the client (Emitter‑style):

```js
client.on('connected',    hubName => console.log('connected:', hubName));
client.on('disconnected', hubName => console.log('disconnected:', hubName));
client.on('reconnecting', (hubName, err) => console.log('reconnecting:', hubName, err?.message));
client.on('reconnected',  hubName => console.log('reconnected:', hubName));
client.on('error',        (hubName, err) => console.error('error:', hubName, err));
```

---

## Server sample hub

```csharp
// ChatHub.cs
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    public async Task SendMessage(string message)
        => await Clients.All.SendAsync("ReceiveMessage", message);

    public Task<string> Ping(string data) => Task.FromResult($"pong: {data}");
}
```

```csharp
// Program.cs
builder.Services.AddSignalR();
app.MapHub<ChatHub>("/chatHub");
```

---

## Troubleshooting

- **404 for `/_content/SignalRClientJs/...`**  
  Ensure you’re on **ASP.NET Core** and have `app.UseStaticFiles()` enabled. The package is an RCL with Static Web Assets.

- **Nothing happens / console says “Missing global signalR even after loader”**  
  Make sure `signalr.min.js` is deployed **next to** `signalr.client.bundle.js`. The loader computes the base path from the current script URL and loads `signalr.min.js` from the same folder.

- **Cross‑domain hub**  
  If your hub is on a different origin, configure CORS on the server and use absolute hub URLs. You can also pick a transport (`webSockets`, etc.) if needed.

- **Auth**  
  Use `accessTokenFactory` (JWT/Bearer). Keep tokens short‑lived and secure.

---

## Package layout & author notes

This package targets both hosting models:

- **ASP.NET Core** (Razor Class Library + Static Web Assets)  
  Files under `wwwroot/js/*` are exposed at runtime under `/_content/SignalRClientJs/js/*`.

- **ASP.NET MVC classic**  
  Files under `contentFiles/any/any/Scripts/*` are copied to the consumer project’s `~/Scripts/` via `build/SignalRClientJs.targets`.

**Included files (in the nupkg):**

```
wwwroot/js/signalr.client.bundle.js
wwwroot/js/signalr.min.js
contentFiles/any/any/Scripts/signalr.client.bundle.js
contentFiles/any/any/Scripts/signalr.min.js
build/SignalRClientJs.targets
README.md
```

> The bundle’s internal loader uses `document.currentScript` (falling back to the last script tag) to find its own folder, then loads `signalr.min.js` from the same folder — **no CDN** is involved.

---

## License

MIT

---

# 📜 نسخهٔ فارسی — SignalRClientJs (بدون CDN، تک‌فایل)

یک اسکریپت واحد برای اتصال به **هاب‌های SignalR** در پروژه‌های **ASP.NET Core MVC** و **ASP.NET MVC کلاسیک**.  
**نیازی به CDN نیست**: باندل به‌صورت خودکار `signalr.min.js` محلی (کنار خودش) را لود می‌کند و سپس فضای سراسری `window.SignalRClientLib` را فراهم می‌کند.

---

## فهرست
- [چه چیزی دریافت می‌کنید](#چه-چیزی-دریافت-میکنید)
- [شیوهٔ کار](#شیوه-کار)
- [نصب (NuGet)](#نصب-nuget)
- [استفاده در ASP.NET Core MVC](#استفاده-در-aspnet-core-mvc)
- [استفاده در ASP.NET MVC کلاسیک](#استفاده-در-aspnet-mvc-کلاسیک)
- [شروع سریع (API جاوااسکریپت)](#شروع-سریع-api-جاوااسکریپت)
- [گزینه‌ها](#گزینهها)
- [چند هاب همزمان](#چند-هاب-همزمان)
- [رویدادهای کلاینت](#رویدادهای-کلاینت)
- [نمونه هاب سمت سرور](#نمونه-هاب-سمت-سرور)
- [عیب‌یابی](#عیب‌یابی)
- [ساختار پکیج و نکات برای سازنده](#ساختار-پکیج-و-نکات-برای-سازنده)
- [لایسنس](#لایسنس)

---

## چه چیزی دریافت می‌کنید

- `wwwroot/js/signalr.client.bundle.js` — اسکریپت اصلی که باید در صفحه اضافه شود
- `wwwroot/js/signalr.min.js` — نسخه مرورگری رسمی `@microsoft/signalr` به‌صورت محلی
- `contentFiles/any/any/Scripts/*` — همین دو فایل برای **MVC کلاسیک** جهت کپی خودکار

> در **ASP.NET Core**، این فایل‌ها در زمان اجرا از مسیر `/_content/SignalRClientJs/js/...` در دسترس هستند.

---

## شیوهٔ کار

- فقط **یک** اسکریپت اضافه می‌کنید: `signalr.client.bundle.js`.
- اگر `window.signalR` وجود نداشت، باندل به‌صورت خودکار **فایل محلی** `signalr.min.js` را از همان پوشه لود می‌کند.
- سپس فضای سراسری `window.SignalRClientLib` در دسترس است:
  - `new SignalRClientLib.SignalRClient(options?)`
  - `SignalRClientLib.SignalRHub` (در صورت نیاز)

---

## نصب (NuGet)

```powershell
Install-Package SignalRClientJs
# یا
dotnet add package SignalRClientJs
```

---

## استفاده در ASP.NET Core MVC

1) اطمینان از فعال بودن فایل‌های استاتیک:

```csharp
// Program.cs
builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();
app.UseStaticFiles();

app.MapHub<ChatHub>("/chatHub");
app.MapDefaultControllerRoute();
app.Run();
```

2) یک اسکریپت به Layout/View اضافه کنید:

```html
<script src="~/_content/SignalRClientJs/js/signalr.client.bundle.js" asp-append-version="true"></script>
```

3) نمونهٔ استفاده در View:

```html
@section Scripts {
<script>
  (async () => {
    const client = new SignalRClientLib.SignalRClient({
      reconnect: { retries: 6, retryDelayMs: 800, factor: 2 },
      queue: { enabled: true, maxSize: 500 }
    });

    const hub = await client.addHub('chat', '/chatHub');

    hub.on('ReceiveMessage', m => console.log('> ', m));
    await hub.send('SendMessage', 'سلام از کور!');

    const pong = await hub.invoke('Ping', 'data');
    console.log('invoke:', pong);
  })();
</script>
}
```

---

## استفاده در ASP.NET MVC کلاسیک

با نصب پکیج، فایل‌ها به‌صورت خودکار به `~/Scripts/` کپی می‌شوند. سپس:

```html
<script src="~/Scripts/signalr.client.bundle.js"></script>
<script>
  (async () => {
    const client = new SignalRClientLib.SignalRClient();
    const hub = await client.addHub('chat', '/chatHub');
    hub.on('ReceiveMessage', console.log);
    await hub.send('SendMessage', 'سلام از MVC کلاسیک!');
  })();
</script>
```

باندل، `signalr.min.js` را از **همان پوشه** پیدا کرده و لود می‌کند (بدون CDN).

---

## شروع سریع (API جاوااسکریپت)

```js
const client = new SignalRClientLib.SignalRClient({
  reconnect: { retries: 6, retryDelayMs: 800, factor: 2 },
  queue:     { enabled: true, maxSize: 500, dropStrategy: 'oldest' },
  logging:   { level: 'warn' },
  transport: 'auto',
  // accessTokenFactory: async () => 'توکن'
});

const hub = await client.addHub('chat', '/chatHub');

hub.on('ReceiveMessage', m => console.log(m));
await hub.send('SendMessage', 'سلام!');
const res = await hub.invoke('Echo', { foo: 'bar' });
console.log(res);
```

---

## گزینه‌ها

- `reconnect`: تعداد تلاش‌ها، فاصلهٔ زمانی، و بک‌آف نمایی
- `queue`: صف پیام‌ها در زمان قطع بودن اتصال (حداکثر اندازه و استراتژی حذف)
- `logging`: سطح لاگ (silent/error/warn/info/debug)
- `transport`: `auto`، `webSockets`، `serverSentEvents`، `longPolling`
- `accessTokenFactory`: برای هاب‌های نیازمند احراز هویت (JWT/Bearer)

```ts
type QueueOptions = {
  enabled?: boolean;
  maxSize?: number;
  dropStrategy?: 'oldest' | 'newest';
};
```

---

## چند هاب همزمان

```js
const chat  = await client.addHub('chat',  '/chatHub');
const notif = await client.addHub('notif', '/notificationHub');

notif.on('Notify', p => console.log('اعلان:', p));
await chat.send('SendMessage', 'چند هاب!');
```

---

## رویدادهای کلاینت

```js
client.on('connected',    name => console.log('وصل شد:', name));
client.on('disconnected', name => console.log('قطع شد:', name));
client.on('reconnecting', (name, err) => console.log('در حال اتصال مجدد:', name, err?.message));
client.on('reconnected',  name => console.log('اتصال مجدد:', name));
client.on('error',        (name, err) => console.error('خطا:', name, err));
```

---

## نمونه هاب سمت سرور

```csharp
public class ChatHub : Hub
{
    public async Task SendMessage(string message)
        => await Clients.All.SendAsync("ReceiveMessage", message);

    public Task<string> Ping(string data) => Task.FromResult($"pong: {data}");
}
```

```csharp
builder.Services.AddSignalR();
app.MapHub<ChatHub>("/chatHub");
```

---

## عیب‌یابی

- **خطای 404 برای `/_content/SignalRClientJs/...`**  
  در **ASP.NET Core** باید `app.UseStaticFiles()` فعال باشد.

- **پیام “Missing global signalR even after loader”**  
  مطمئن شوید `signalr.client.bundle.js` و `signalr.min.js` دقیقاً در **یک پوشه** هستند (در Core: `/_content/SignalRClientJs/js/`، در MVC کلاسیک: `~/Scripts/`).

- **هاست متفاوت (CORS)**  
  برای دامنه/پورت دیگر، CORS را روی سرور تنظیم کنید و از URL مطلق استفاده کنید.

- **احراز هویت**  
  از `accessTokenFactory` استفاده کنید (JWT/Bearer).

---

## ساختار پکیج و نکات برای سازنده

```
wwwroot/js/signalr.client.bundle.js
wwwroot/js/signalr.min.js
contentFiles/any/any/Scripts/signalr.client.bundle.js
contentFiles/any/any/Scripts/signalr.min.js
build/SignalRClientJs.targets
README.md
```

- در **ASP.NET Core**، فایل‌ها از مسیر `/_content/SignalRClientJs/js/*` در دسترس‌اند.
- در **MVC کلاسیک**، فایل‌ها به `~/Scripts/` کپی می‌شوند.

---

## لایسنس

MIT
