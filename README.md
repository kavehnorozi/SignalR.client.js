# SignalR Client Library / کتابخانه کلاینت SignalR

یک پکیج جاوااسکریپت برای اتصال به چند Hub همزمان SignalR با ویژگی‌های:

- مدیریت صف پیام‌ها (Queue)
- ریکانکت خودکار
- ارسال و دریافت پیام‌ها
- پشتیبانی چند Hub همزمان
- استفاده در مرورگر و Node.js

---

## نصب / Installation

با npm:

```bash
npm install signalr-client
```

یا به صورت مستقیم در مرورگر:

```html
<script src="dist/signalr-client.min.js"></script>
```

---

## استفاده / Usage

### افزودن و اتصال به Hub

```javascript
const client = new SignalRClientLib.SignalRClient();

client.addHub('chatHub', 'https://example.com/chatHub').then(hub => {
    hub.on('ReceiveMessage', msg => {
        console.log('پیام دریافت شد:', msg);
    });

    hub.send('SendMessage', 'سلام از کلاینت!');
});
```

### افزودن چند Hub

```javascript
client.addHub('notificationHub', 'https://example.com/notificationHub');
```

### ارسال پیام

```javascript
const hub = client.getHub('chatHub');
hub.send('SendMessage', 'سلام!');
```

### دریافت پیام

```javascript
hub.on('ReceiveMessage', msg => console.log(msg));
```

### مدیریت ریکانکت و صف پیام‌ها

- پیام‌ها وقتی اتصال برقرار نیست در صف ذخیره می‌شوند و بعد از اتصال ارسال می‌شوند.
- ریکانکت خودکار انجام می‌شود (5 بار قابل تنظیم).

---

## ویژگی‌ها / Features

- اتصال و مدیریت چند Hub همزمان
- ارسال و دریافت پیام
- مدیریت صف پیام‌ها
- ریکانکت خودکار
- خروجی UMD قابل استفاده در مرورگر و Node.js

---

## License

MIT
