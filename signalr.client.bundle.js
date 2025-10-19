
/*! SignalRClient one-file bundle (auto-loads @microsoft/signalr if missing) */
(function (root) {
    function ensureSignalR() {
        if (root.signalR) return Promise.resolve();
        var base = (function () {
            var s = document.currentScript;
            if (!s) {
                var scripts = document.getElementsByTagName('script');
                s = scripts[scripts.length - 1];
            }
            var src = (s && s.src) || '';
            return src.slice(0, src.lastIndexOf('/') + 1);
        })();
        return new Promise(function (resolve, reject) {
            var el = document.createElement('script');
            el.src = base + 'signalr.min.js'; 
            el.onload = function () { resolve(); };
            el.onerror = function () { reject(new Error('Failed to load local signalr.min.js')); };
            document.head.appendChild(el);
        });
    }
    function bootstrap() {
        (function (root) {
            'use strict';
            var signalR = root.signalR;
            if (!signalR) throw new Error('[SignalRClientLib] Missing global `signalR` even after loader.');

            function Emitter() { this._ = {}; }
            Emitter.prototype.on = function (ev, fn) { (this._[ev] = this._[ev] || new Set()).add(fn); return this; };
            Emitter.prototype.off = function (ev, fn) { if (this._[ev]) this._[ev].delete(fn); return this; };
            Emitter.prototype.emit = function (ev) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (this._[ev]) this._[ev].forEach(function (f) { try { f.apply(null, args); } catch (e) { console.error(e); } });
            };

            function defaults(val, d) {
                val = val || {};
                var out = {}; for (var k in d) out[k] = d[k];
                for (var k2 in val) out[k2] = val[k2];
                return out;
            }

            function resolveTransport(t) {
                if (t === 'webSockets') return signalR.HttpTransportType.WebSockets;
                if (t === 'serverSentEvents') return signalR.HttpTransportType.ServerSentEvents;
                if (t === 'longPolling') return signalR.HttpTransportType.LongPolling;
                return undefined; // auto
            }

            function makeDelays(opts) {
                if (opts.delaysMs && opts.delaysMs.length) return opts.delaysMs.slice();
                var arr = [];
                for (var i = 0; i < opts.retries; i++) {
                    arr.push(Math.round(opts.retryDelayMs * Math.pow(opts.factor, i)));
                }
                return arr;
            }

            function shouldLog(cur, level) {
                if (cur === 'silent') return false;
                var rank = { error: 1, warn: 2, info: 3, debug: 4 };
                return rank[cur] >= rank[level];
            }

            function SignalRHub(name, url, options) {
                this.name = name;
                this.url = url;
                options = options || {};
                this.options = {
                    reconnect: defaults(options.reconnect, { retries: 5, retryDelayMs: 1000, factor: 1.8, delaysMs: [] }),
                    queue: defaults(options.queue, { enabled: true, maxSize: 1000, dropStrategy: 'oldest' }),
                    logging: defaults(options.logging, { level: 'warn' }),
                    headers: options.headers || {},
                    accessTokenFactory: options.accessTokenFactory,
                    transport: options.transport || 'auto'
                };
                this.state = 'disconnected';
                this.connectionId = null;
                this._queue = [];
                this._conn = null;
            }

            SignalRHub.prototype._log = function (level) {
                if (shouldLog(this.options.logging.level, level)) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    console[level === 'error' ? 'error' : level].apply(console, args);
                }
            };

            SignalRHub.prototype.connect = function (clientEmit) {
                var self = this;
                self.state = 'connecting';
                var r = self.options.reconnect;
                var delays = makeDelays({ retries: r.retries, retryDelayMs: r.retryDelayMs, factor: r.factor, delaysMs: r.delaysMs });

                self._conn = new signalR.HubConnectionBuilder()
                    .withUrl(self.url, {
                        accessTokenFactory: self.options.accessTokenFactory,
                        transport: resolveTransport(self.options.transport),
                        headers: self.options.headers
                    })
                    .withAutomaticReconnect(delays)
                    .build();

                self._conn.onreconnecting(function (err) {
                    self.state = 'reconnecting';
                    self._log('warn', '[' + self.name + '] reconnecting…', err && err.message || '');
                    clientEmit && clientEmit('reconnecting', self.name, err);
                });

                self._conn.onreconnected(function (cid) {
                    self.state = 'connected';
                    self.connectionId = cid;
                    self._log('info', '[' + self.name + '] reconnected', cid || '');
                    clientEmit && clientEmit('reconnected', self.name);
                    self._flush();
                });

                self._conn.onclose(function (err) {
                    self.state = 'disconnected';
                    self._log('warn', '[' + self.name + '] disconnected', err && err.message || '');
                    clientEmit && clientEmit('disconnected', self.name);
                });

                return self._conn.start()
                    .then(function () {
                        self.state = 'connected';
                        clientEmit && clientEmit('connected', self.name);
                        return self._flush();
                    })
                    .catch(function (err) {
                        self.state = 'disconnected';
                        self._log('error', '[' + self.name + '] initial start failed', err);
                        clientEmit && clientEmit('error', self.name, err);
                        throw err;
                    });
            };

            SignalRHub.prototype._push = function (item) {
                if (!this.options.queue.enabled) return;
                if (this._queue.length >= this.options.queue.maxSize) {
                    if (this.options.queue.dropStrategy === 'oldest') {
                        this._queue.shift();
                    } else {
                        if (item.kind === 'invoke' && item.reject) item.reject(new Error('Queue full'));
                        return;
                    }
                }
                this._queue.push(item);
            };

            SignalRHub.prototype._flush = function () {
                var self = this;
                if (self.state !== 'connected') return Promise.resolve();
                var p = Promise.resolve();
                var loop = function () {
                    if (self.state !== 'connected' || self._queue.length === 0) return;
                    var item = self._queue.shift();
                    if (!item) return;
                    if (item.kind === 'send') {
                        p = p.then(function () { return self._conn.send.apply(self._conn, [item.method].concat(item.args)); })
                            .catch(function (err) {
                                self._log('warn', '[' + self.name + '] flush send failed; requeueing', err);
                                self._queue.unshift(item);
                            })
                            .then(loop);
                    } else { // invoke
                        p = p.then(function () { return self._conn.invoke.apply(self._conn, [item.method].concat(item.args)); })
                            .then(function (res) { item.resolve && item.resolve(res); })
                            .catch(function (err) {
                                self._log('warn', '[' + self.name + '] flush invoke failed; requeueing', err);
                                self._queue.unshift(item);
                            })
                            .then(loop);
                    }
                };
                loop();
                return p;
            };

            SignalRHub.prototype.send = function (method) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (this.state === 'connected') {
                    var self = this;
                    return this._conn.send.apply(this._conn, [method].concat(args)).catch(function (err) {
                        self._log('warn', '[' + self.name + '] send failed; queued', err);
                        self._push({ kind: 'send', method: method, args: args });
                    });
                }
                this._push({ kind: 'send', method: method, args: args });
                return Promise.resolve();
            };

            SignalRHub.prototype.invoke = function (method) {
                var args = Array.prototype.slice.call(arguments, 1);
                var self = this;
                if (this.state === 'connected') {
                    return this._conn.invoke.apply(this._conn, [method].concat(args))
                        .catch(function (err) {
                            self._log('warn', '[' + self.name + '] invoke failed; queued', err);
                            return new Promise(function (resolve, reject) {
                                self._push({ kind: 'invoke', method: method, args: args, resolve: resolve, reject: reject });
                            });
                        });
                }
                return new Promise(function (resolve, reject) {
                    self._push({ kind: 'invoke', method: method, args: args, resolve: resolve, reject: reject });
                });
            };

            SignalRHub.prototype.on = function (method, handler) { this._conn.on(method, handler); return this; };
            SignalRHub.prototype.off = function (method, handler) { this._conn.off(method, handler); return this; };
            SignalRHub.prototype.close = function () { this.state = 'disconnected'; return this._conn ? this._conn.stop() : Promise.resolve(); };

            function SignalRClient(options) {
                Emitter.call(this);
                options = options || {};
                this._options = {
                    reconnect: defaults(options.reconnect, { retries: 5, retryDelayMs: 1000, factor: 1.8, delaysMs: [] }),
                    queue: defaults(options.queue, { enabled: true, maxSize: 1000, dropStrategy: 'oldest' }),
                    logging: defaults(options.logging, { level: 'warn' }),
                    headers: options.headers || {},
                    accessTokenFactory: options.accessTokenFactory,
                    transport: options.transport || 'auto'
                };
                this._hubs = {};
            }
            SignalRClient.prototype = Object.create(Emitter.prototype);

            SignalRClient.prototype.addHub = function (name, url, options) {
                var hub = new SignalRHub(name, url, defaults(options, this._options));
                this._hubs[name] = hub;
                var self = this;
                return hub.connect(function (ev) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    self.emit.apply(self, [ev].concat(args));
                }).then(function () { return hub; });
            };

            SignalRClient.prototype.getHub = function (name) { return this._hubs[name]; };
            SignalRClient.prototype.listHubs = function () { return Object.keys(this._hubs); };
            SignalRClient.prototype.removeHub = function (name) {
                var hub = this._hubs[name];
                if (hub) { delete this._hubs[name]; return hub.close(); }
                return Promise.resolve();
            };

            root.SignalRClientLib = { SignalRClient: SignalRClient, SignalRHub: SignalRHub };
        })(typeof self !== 'undefined' ? self : this);
    }

    function start() {
        ensureSignalR().then(bootstrap).catch(function (e) {
            console.error('[SignalRClient] cannot load dependency:', e);
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})(typeof self !== 'undefined' ? self : this);
