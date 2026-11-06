window.__ModuleLoader__.load({id:"dsh-balance-money",factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  MoneyPill: () => MoneyPill,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require("react"), 1);

// src/accounting.js
function beijingDay(now) {
  return new Date(now + 8 * 36e5).toISOString().slice(0, 10);
}
function displayMoney(units, currency) {
  const value = BigInt(units), negative = value < 0n;
  const cents = ((negative ? -value : value) + 5000n) / 10000n;
  const symbol = currency === "CNY" ? "\xA5" : currency === "USD" ? "$" : currency + " ";
  return `${negative && cents > 0n ? "-" : ""}${symbol}${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

// src/holidays.js
var holidayRanges = {
  2026: [["01-01", "01-03"], ["02-15", "02-23"], ["04-04", "04-06"], ["05-01", "05-05"], ["06-19", "06-21"], ["09-25", "09-27"], ["10-01", "10-07"]],
  2027: [["01-01", "01-03"], ["02-05", "02-13"], ["04-03", "04-05"], ["05-01", "05-05"], ["06-09", "06-09"], ["09-15", "09-15"], ["10-01", "10-07"]]
};

// src/schedule.js
var OFFSET = 8 * 36e5;
var DAY = 24 * 36e5;
function stateAt(now) {
  const local = new Date(now + OFFSET);
  const year = local.getUTCFullYear();
  if (!holidayRanges[year]) return null;
  const date = local.toISOString().slice(5, 10);
  const holiday = holidayRanges[year].some(([start, end]) => date >= start && date <= end);
  const hour = local.getUTCHours();
  return !holiday && local.getUTCDay() !== 0 && local.getUTCDay() !== 6 && (hour >= 9 && hour < 12 || hour >= 14 && hour < 18);
}
function tariff(now) {
  const peak = stateAt(now);
  if (peak === null) return { label: "\u2014", next: null, reason: "\u8282\u5047\u65E5\u65E5\u5386\u9700\u8981\u66F4\u65B0" };
  const localMidnight = Math.floor((now + OFFSET) / DAY) * DAY - OFFSET;
  for (let day = 0; day < 16; day++) {
    for (const hour of [0, 9, 12, 14, 18, 24]) {
      const next = localMidnight + day * DAY + hour * 36e5;
      if (next <= now) continue;
      const state = stateAt(next);
      if (state === null) return { label: peak ? "\u5CF0" : "\u8C37", next: null, reason: "\u8282\u5047\u65E5\u65E5\u5386\u9700\u8981\u66F4\u65B0" };
      if (state !== peak) return { label: peak ? "\u5CF0" : "\u8C37", next, reason: null };
    }
  }
  return { label: peak ? "\u5CF0" : "\u8C37", next: null, reason: "\u65E0\u6CD5\u786E\u5B9A\u4E0B\u6B21\u5207\u6362\u65F6\u95F4" };
}
function formatRemaining(ms) {
  const minutes = Math.max(0, Math.ceil(ms / 6e4));
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}m`;
}

// src/lifecycle.js
var alwaysActive = { getSnapshot: () => true, subscribe: () => () => {
} };
function createLifecycle({ request = (url, init) => globalThis.fetch(url, init), retryMs = 2e3 } = {}) {
  let enabled = false, controller = null;
  const listeners = /* @__PURE__ */ new Set();
  const publish = (value) => {
    if (enabled !== value) {
      enabled = value;
      for (const listener of listeners) listener();
    }
  };
  const stop = () => {
    controller?.abort();
    controller = null;
  };
  return {
    getSnapshot: () => enabled,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stop,
    start() {
      stop();
      controller = new AbortController();
      const { signal } = controller;
      void (async () => {
        while (!signal.aborted) {
          try {
            const response = await request("dsh-balance-money/lifecycle", { method: "GET", cache: "no-store", signal });
            if ([404, 405].includes(response.status)) publish(false);
            if (response.ok && response.body) {
              const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
              let pending = "";
              try {
                while (!signal.aborted) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  pending += value;
                  let newline;
                  while ((newline = pending.indexOf("\n")) >= 0) {
                    const line = pending.slice(0, newline);
                    pending = pending.slice(newline + 1);
                    if (line.trim()) {
                      const event = JSON.parse(line);
                      if (typeof event.enabled === "boolean") publish(event.enabled);
                    }
                  }
                }
              } finally {
                await reader.cancel().catch(() => {
                });
                reader.releaseLock();
              }
            } else await response.body?.cancel();
          } catch {
          }
          if (signal.aborted) break;
          await new Promise((resolve) => {
            const finish = () => {
              clearTimeout(timer);
              signal.removeEventListener("abort", finish);
              resolve();
            };
            const timer = setTimeout(finish, retryMs);
            signal.addEventListener("abort", finish, { once: true });
          });
        }
      })();
      return stop;
    }
  };
}

// src/client.jsx
var inject = ["slots", "connection", "modelDirectories"];
function MoneyPill({ directory, rpc, lifecycle = alwaysActive }) {
  const active = (0, import_react.useSyncExternalStore)(lifecycle.subscribe, lifecycle.getSnapshot, lifecycle.getSnapshot);
  const selection = (0, import_react.useSyncExternalStore)(directory.store.subscribe, directory.store.getSnapshot, directory.store.getSnapshot);
  const provider = selection.current?.provider ?? null;
  const [result, setResult] = (0, import_react.useState)(null);
  const [now, setNow] = (0, import_react.useState)(Date.now);
  const [refresh, setRefresh] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1e3);
    return () => clearInterval(timer);
  }, [active]);
  (0, import_react.useEffect)(() => {
    const controller = new AbortController();
    let busy = false;
    if (!active) {
      setResult(null);
      return () => controller.abort();
    }
    if (!["deepseek-account", "deepseek-official"].includes(provider)) return () => controller.abort();
    const pull = async (force) => {
      if (busy) return;
      busy = true;
      try {
        const response = await rpc.call("/dsh-balance-money", "snapshot", { provider, force }, AbortSignal.any([controller.signal, AbortSignal.timeout(2e4)]));
        if (!controller.signal.aborted) {
          if (!response.ok) throw Error();
          setResult({ provider, ...response.value });
        }
      } catch (error2) {
        const http = error2?.message?.match(/HTTP \d{3}/)?.[0];
        if (!controller.signal.aborted) setResult((old) => ({ ...old?.provider === provider ? old : {}, provider, stale: true, error: http ? `\u4F59\u989D\u5237\u65B0\u5931\u8D25\uFF08${http}\uFF09` : "\u4F59\u989D\u5237\u65B0\u5931\u8D25" }));
      } finally {
        busy = false;
      }
    };
    void pull(refresh > 0);
    const timer = setInterval(() => void pull(false), 3e4);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [provider, rpc, refresh, active]);
  const value = result?.provider === provider ? result : null;
  const balance = value?.balance == null ? "\u2014" : displayMoney(value.balance, value.currency);
  const used = value?.used == null || value.day !== beijingDay(now) ? "\u2014" : displayMoney(value.used, value.currency);
  const period = tariff(now);
  const time = period.next == null ? "\u2014" : formatRemaining(period.next - now);
  const error = value?.error ?? (!provider ? "\u6B63\u5728\u8BFB\u53D6\u5F53\u524D\u6A21\u578B" : !["deepseek-account", "deepseek-official"].includes(provider) ? "\u5F53\u524D\u6A21\u578B\u975E DeepSeek \u5B98\u65B9" : null);
  const stamp = value?.updatedAt ? new Date(value.updatedAt).toLocaleTimeString("zh-CN", { hour12: false }) : null;
  const status = [error, stamp ? `\u4F59\u989D\u66F4\u65B0\u4E8E ${stamp}` : null, "\u70B9\u51FB\u5237\u65B0"].filter(Boolean).join("\uFF1B");
  const update = () => setRefresh((n) => n + 1);
  if (!active) return null;
  const scheduleHint = period.reason ?? `\u5F53\u524D${period.label === "\u5CF0" ? "\u9AD8\u5CF0" : "\u4F4E\u8C37"}\u4EF7\u683C\uFF1B\u5317\u4EAC\u65F6\u95F4 ${new Date(period.next).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })} \u5207\u6362`;
  const hint = `${status}
\u4ECA\u65E5\u6839\u636E\u5317\u4EAC\u65F6\u95F4\u9996\u6B21\u89C2\u6D4B\u540E\u7684\u4F59\u989D\u4E0B\u964D\u7D2F\u8BA1\uFF0C\u975E\u5B98\u65B9\u8D26\u5355\u3002
${scheduleHint}`;
  return /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      type: "button",
      className: "dsh-balance-money",
      "data-composer-stat": "balance-money",
      onClick: update,
      title: hint,
      "aria-label": `\u4F59\u989D ${balance}\uFF0C\u4ECA\u65E5 ${used}\uFF0C${period.label} ${time}\u3002${status}`
    },
    /* @__PURE__ */ import_react.default.createElement("span", null, "\u4F59\u989D ", balance, value?.stale ? " *" : ""),
    /* @__PURE__ */ import_react.default.createElement("span", null, "\u4ECA\u65E5 ", used),
    /* @__PURE__ */ import_react.default.createElement("span", null, period.label, " ", time)
  );
}
function apply(ctx) {
  const lifecycle = createLifecycle();
  ctx.effect(() => lifecycle.start());
  return ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
    name: "conversation.composer.dock",
    id: "balance-money",
    order: 2,
    inject: (sessionId) => ({ directory: ctx.modelDirectories.directoryFor(sessionId), rpc: ctx.connection.rpc, lifecycle })
  }, MoneyPill));
}

if(typeof document!=="undefined"){const style=document.createElement("style");style.dataset.plugin="dsh-balance-money";style.textContent="/* Adapted from DeepSeek Harness StatsPills.module.css (MIT, Copyright 2026 DeepSeek).\n   Match DSH 0.2.1-rc.5 using its public theme tokens. */\n.dsh-balance-money {\n  display: inline-flex;\n  flex-wrap: wrap;\n  /* ContextMeter is rendered after the extension slot, outside its ordering.\n     Order only our flex item after the host's default-order readings. */\n  order: 1;\n  min-width: 0;\n  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);\n  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));\n  align-items: center;\n  gap: 12px;\n  box-sizing: border-box;\n  max-width: 100%;\n  padding: 1px 8px;\n  border: none;\n  border-radius: var(--dsw-radius-sm);\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  font-family: inherit;\n  font-weight: inherit;\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n  cursor: pointer;\n}\n.dsh-balance-money:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-secondary);\n}\n.dsh-balance-money:focus-visible {\n  outline: 1px solid var(--dsw-alias-label-secondary);\n  outline-offset: -1px;\n}\n";document.head.append(style);}
return module.exports;}});
