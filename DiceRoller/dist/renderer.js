"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DiceRollerPlugin;

const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function rollDice(count, sides) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

function DiceRollerPlugin({ config }) {
  const defaultSides = clampNumber(config.defaultSides, 2, 100, 6);
  const [count, setCount] = (0, react_1.useState)(2);
  const [sides, setSides] = (0, react_1.useState)(defaultSides);
  const [result, setResult] = (0, react_1.useState)([]);
  const [history, setHistory] = (0, react_1.useState)([]);

  const total = result.reduce((sum, value) => sum + value, 0);

  const handleRoll = () => {
    const next = rollDice(count, sides);
    setResult(next);
    setHistory((prev) => [
      {
        id: Date.now(),
        label: `${count}d${sides}`,
        values: next,
        total: next.reduce((sum, value) => sum + value, 0)
      },
      ...prev
    ].slice(0, 8));
  };

  const numberInputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box"
  };

  return (0, jsx_runtime_1.jsxs)("div", {
    style: {
      minHeight: "100%",
      padding: 20,
      borderRadius: 12,
      background: "#f7f9fb",
      color: "#1f2933"
    },
    children: [
      (0, jsx_runtime_1.jsx)("h2", {
        style: { margin: "0 0 16px", fontSize: 20 },
        children: "骰子与随机数"
      }),
      (0, jsx_runtime_1.jsxs)("div", {
        style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 },
        children: [
          (0, jsx_runtime_1.jsxs)("label", {
            style: { fontSize: 13, color: "#52616b" },
            children: [
              "骰子数量",
              (0, jsx_runtime_1.jsx)("input", {
                type: "number",
                min: 1,
                max: 20,
                value: count,
                onChange: (event) => setCount(clampNumber(event.target.value, 1, 20, 1)),
                style: { ...numberInputStyle, marginTop: 6 }
              })
            ]
          }),
          (0, jsx_runtime_1.jsxs)("label", {
            style: { fontSize: 13, color: "#52616b" },
            children: [
              "骰子面数",
              (0, jsx_runtime_1.jsx)("input", {
                type: "number",
                min: 2,
                max: 100,
                value: sides,
                onChange: (event) => setSides(clampNumber(event.target.value, 2, 100, 6)),
                style: { ...numberInputStyle, marginTop: 6 }
              })
            ]
          })
        ]
      }),
      (0, jsx_runtime_1.jsx)("button", {
        onClick: handleRoll,
        style: {
          width: "100%",
          padding: "12px 0",
          border: "none",
          borderRadius: 8,
          background: "#2563eb",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer"
        },
        children: "投掷"
      }),
      result.length > 0 && (0, jsx_runtime_1.jsxs)("div", {
        style: { marginTop: 18, padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e6edf3" },
        children: [
          (0, jsx_runtime_1.jsxs)("div", {
            style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
            children: [
              (0, jsx_runtime_1.jsx)("strong", { style: { fontSize: 16 }, children: "本次结果" }),
              (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 28, fontWeight: 800, color: "#2563eb" }, children: ["总计 ", total] })
            ]
          }),
          (0, jsx_runtime_1.jsx)("div", {
            style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 },
            children: result.map((value, index) => (0, jsx_runtime_1.jsx)("span", {
              style: {
                minWidth: 42,
                padding: "8px 10px",
                borderRadius: 8,
                background: "#eef4ff",
                color: "#1d4ed8",
                textAlign: "center",
                fontWeight: 700
              },
              children: value
            }, `${index}-${value}`))
          })
        ]
      }),
      history.length > 0 && (0, jsx_runtime_1.jsxs)("div", {
        style: { marginTop: 18 },
        children: [
          (0, jsx_runtime_1.jsx)("h3", { style: { margin: "0 0 10px", fontSize: 15 }, children: "最近记录" }),
          (0, jsx_runtime_1.jsx)("div", {
            style: { display: "grid", gap: 8 },
            children: history.map((entry) => (0, jsx_runtime_1.jsxs)("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 12px",
                background: "#fff",
                borderRadius: 8,
                border: "1px solid #e6edf3",
                fontSize: 13
              },
              children: [
                (0, jsx_runtime_1.jsxs)("span", { children: [entry.label, " = ", entry.values.join(" + ")] }),
                (0, jsx_runtime_1.jsx)("strong", { children: entry.total })
              ]
            }, entry.id))
          })
        ]
      })
    ]
  });
}
