"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => main_default
});
module.exports = __toCommonJS(main_exports);
var ctx = null;
function db() {
  if (!ctx) throw new Error("\u6570\u636E\u5E93\u672A\u521D\u59CB\u5316");
  return ctx.database;
}
function getEntryByDate(date) {
  const rows = db().query(
    "SELECT entry_date, title, content FROM diary_entries WHERE entry_date = ?",
    [date]
  );
  return rows.length > 0 ? rows[0] : null;
}
function getEntriesInMonth(year, month) {
  const m = String(month).padStart(2, "0");
  const prefix = `${year}-${m}`;
  return db().query(
    "SELECT entry_date, title FROM diary_entries WHERE entry_date LIKE ? ORDER BY entry_date",
    [`${prefix}%`]
  );
}
function formatDateHeader(dateStr) {
  const date = new Date(dateStr);
  const weekNames = ["\u661F\u671F\u65E5", "\u661F\u671F\u4E00", "\u661F\u671F\u4E8C", "\u661F\u671F\u4E09", "\u661F\u671F\u56DB", "\u661F\u671F\u4E94", "\u661F\u671F\u516D"];
  return `${date.getFullYear()}\u5E74${date.getMonth() + 1}\u6708${date.getDate()}\u65E5 ${weekNames[date.getDay()]}`;
}
function handleGetMonthEntries(msg) {
  const now = /* @__PURE__ */ new Date();
  const year = msg.year ?? now.getFullYear();
  const month = msg.month ?? now.getMonth() + 1;
  return { entries: getEntriesInMonth(year, month) };
}
function handleGetEntry(msg) {
  if (!msg.date) return { error: "\u7F3A\u5C11\u65E5\u671F\u53C2\u6570" };
  const entry = getEntryByDate(msg.date);
  return entry ? { entry } : { entry: null };
}
function handleSaveEntry(msg) {
  if (!msg.date) return { error: "\u7F3A\u5C11\u65E5\u671F\u53C2\u6570" };
  const title = msg.title ?? "";
  const content = msg.content ?? "";
  const existing = getEntryByDate(msg.date);
  if (existing) {
    if (title === "" && content === "") {
      db().execute("DELETE FROM diary_entries WHERE entry_date = ?", [msg.date]);
    } else {
      db().execute(
        "UPDATE diary_entries SET title = ?, content = ?, updated_at = datetime('now','localtime') WHERE entry_date = ?",
        [title, content, msg.date]
      );
    }
  } else if (title !== "" || content !== "") {
    db().execute(
      "INSERT INTO diary_entries (entry_date, title, content) VALUES (?, ?, ?)",
      [msg.date, title, content]
    );
  }
  return { success: true };
}
function handleDeleteEntry(msg) {
  if (!msg.date) return { error: "\u7F3A\u5C11\u65E5\u671F\u53C2\u6570" };
  db().execute("DELETE FROM diary_entries WHERE entry_date = ?", [msg.date]);
  return { success: true };
}
function handleExportSingle(msg) {
  if (!msg.date) return { error: "\u7F3A\u5C11\u65E5\u671F\u53C2\u6570" };
  const entry = getEntryByDate(msg.date);
  if (!entry) return { error: "\u8BE5\u65E5\u671F\u6CA1\u6709\u65E5\u8BB0" };
  const header = formatDateHeader(msg.date);
  const md = `# ${header}

## ${entry.title}

${entry.content}`;
  return { content: md };
}
function handleExportMonth(msg) {
  const now = /* @__PURE__ */ new Date();
  const year = msg.year ?? now.getFullYear();
  const month = msg.month ?? now.getMonth() + 1;
  const rows = getEntriesInMonth(year, month);
  if (rows.length === 0) return { error: "\u8BE5\u6708\u6CA1\u6709\u65E5\u8BB0" };
  const parts = [];
  const m = String(month).padStart(2, "0");
  for (const row of rows) {
    const entry = getEntryByDate(row.entry_date);
    if (!entry) continue;
    const header = formatDateHeader(row.entry_date);
    parts.push(`# ${header}

## ${entry.title}

${entry.content}`);
  }
  const md = parts.join("\n\n---\n\n");
  return { content: md };
}
var plugin = {
  async activate(pluginCtx) {
    ctx = pluginCtx;
    ctx.logger.info("\u65E5\u8BB0\u63D2\u4EF6\u5DF2\u6FC0\u6D3B");
    ctx.database.execute(`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )
    `);
    ctx.logger.info("\u65E5\u8BB0\u6570\u636E\u5E93\u521D\u59CB\u5316\u5B8C\u6210");
  },
  deactivate() {
    ctx = null;
  },
  onMessage(message) {
    const msg = message;
    switch (msg.type) {
      case "getMonthEntries":
        return handleGetMonthEntries(msg);
      case "getEntry":
        return handleGetEntry(msg);
      case "saveEntry":
        return handleSaveEntry(msg);
      case "deleteEntry":
        return handleDeleteEntry(msg);
      case "exportSingle":
        return handleExportSingle(msg);
      case "exportMonth":
        return handleExportMonth(msg);
      default:
        return { error: `\u672A\u77E5\u6D88\u606F\u7C7B\u578B: ${msg.type}` };
    }
  }
};
var main_default = plugin;
