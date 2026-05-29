import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ── 颜色语义
// 粉色系 C.pk    → 选中格同行/列/宫 浅粉背景
// 绿色系 C.mn    → 与选中格数字相同 浅绿背景
// 红色系 C.err   → 数字冲突 浅红背景
// 紫色系 C.puD   → 候选标记数字（深紫圆形徽章，与上三种完全区分）

const C = {
  pk: "#FF85A1", pkL: "#FFB3C6", pkLL: "#FFD6E8", pkLLL: "#FFF0F7",
  mn: "#6CBF8A", mnL: "#A8D8BC", mnLL: "#D4EDE2",
  pu: "#9B86BD", puL: "#C5B8E0", puLL: "#EDE8F7", puLLL: "#F7F4FD",
  puD: "#6B4FA0",   // 深紫：候选数字圆形背景 & 文字
  ye: "#F5C842", yeL: "#FFF3C4",
  tx: "#5C3D5E", txm: "#8A6D8E", txl: "#C0A8C4",
  bd: "#F0C8D8", err: "#E53935",
  gv: "#C94B7A", us: "#5B4B8A", sv: "#1565C0",
};

const pageShell = {
  minHeight: "100dvh",
  paddingTop: "max(12px, env(safe-area-inset-top))",
  paddingBottom: "max(16px, env(safe-area-inset-bottom))",
  paddingLeft: "max(12px, env(safe-area-inset-left))",
  paddingRight: "max(12px, env(safe-area-inset-right))",
};

const css = `
  @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @keyframes popIn{0%{transform:scale(.2);opacity:0}75%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
  @keyframes rain{0%{color:${C.pk}}33%{color:${C.pu}}66%{color:${C.mn}}100%{color:${C.pk}}}
  @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif}
  button{transition:all .18s;cursor:pointer;min-height:44px;touch-action:manipulation;-webkit-user-select:none;user-select:none}
  @media (hover:hover){
    button:hover:not(:disabled){filter:brightness(1.07);transform:translateY(-1px)}
  }
  button:active:not(:disabled){transform:translateY(0)!important;filter:brightness(.95)}
  input:focus{outline:none}
`;

/* ───────── 数独引擎 ───────── */
const rng = () => Math.random();
const shuf = a => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = rng() * (i + 1) | 0;
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

function ok(g, r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (i !== c && g[r][i] === n) return false;
    if (i !== r && g[i][c] === n) return false;
  }
  const br = r - r % 3, bc = c - c % 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      if ((br + dr !== r || bc + dc !== c) && g[br + dr][bc + dc] === n) return false;
  return true;
}

function buildFull() {
  const g = Array.from({ length: 9 }, () => Array(9).fill(0));
  (function go(p) {
    if (p === 81) return true;
    const r = p / 9 | 0, c = p % 9;
    for (const n of shuf([1, 2, 3, 4, 5, 6, 7, 8, 9]))
      if (ok(g, r, c, n)) { g[r][c] = n; if (go(p + 1)) return true; g[r][c] = 0; }
    return false;
  })(0);
  return g;
}

function trysolve(g) {
  const b = g.map(r => [...r]);
  function go() {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!b[r][c]) {
          for (let n = 1; n <= 9; n++)
            if (ok(b, r, c, n)) { b[r][c] = n; if (go()) return true; b[r][c] = 0; }
          return false;
        }
    return true;
  }
  return go() ? b : null;
}

function mkPuzzle(diff) {
  const full = buildFull();
  const p = full.map(r => [...r]);
  const rm = { easy: 30, medium: 45, hard: 55 }[diff] || 45;
  for (const [r, c] of shuf(Array.from({ length: 81 }, (_, i) => [i / 9 | 0, i % 9])).slice(0, rm))
    p[r][c] = 0;
  return { puzzle: p, solution: full };
}

function getCfl(g) {
  const s = new Set();
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (g[r][c] && !ok(g, r, c, g[r][c])) s.add(`${r},${c}`);
  return s;
}

const fmtT = s => `${String(s / 60 | 0).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ───────── NoteGrid：候选标记 ─────────
   深紫圆形实色背景 + 白色粗体字
   对比度最高，与粉/绿/红高亮完全区分 */
function NoteGrid({ noteSet }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(3,1fr)",
      width: "100%", height: "100%", padding: "2px", gap: "1.5px",
    }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
        const on = noteSet.has(n);
        return (
          <div key={n} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", minWidth: 0, minHeight: 0,
          }}>
            {on && (
              <div style={{
                background: C.puD,
                borderRadius: "50%",
                width: "min(14px,3.2vw)",
                height: "min(14px,3.2vw)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{
                  fontSize: "clamp(6px,1.6vw,9px)", fontWeight: 900,
                  color: "white", lineHeight: 1, userSelect: "none",
                }}>{n}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────── 通用棋盘 ───────── */
function BoardGrid({ bd, ini, nts, selCell, onSel, cflSet, accent, isAnim, origBoard }) {
  accent = accent || C.pk;
  const sv = selCell && bd ? bd[selCell[0]][selCell[1]] : null;
  const sz = "min(360px,95vw)";
  return (
    <div style={{ position: "relative" }}>
      {/* 猫耳 */}
      <div style={{ position: "absolute", top: -19, left: 20, width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderBottom: `19px solid ${accent}`, zIndex: 2 }} />
      <div style={{ position: "absolute", top: -19, right: 20, width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderBottom: `19px solid ${accent}`, zIndex: 2 }} />
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(9,1fr)", gridTemplateRows: "repeat(9,1fr)",
        border: `3px solid ${accent}`, borderRadius: 14, overflow: "hidden",
        boxShadow: `0 8px 28px ${accent}44`,
        background: "white", width: sz, height: sz, flexShrink: 0,
      }}>
        {Array.from({ length: 81 }, (_, i) => {
          const r = i / 9 | 0, c = i % 9;
          const val = bd ? bd[r][c] : 0;
          const isG = ini && ini[r][c];
          const isSel = selCell && selCell[0] === r && selCell[1] === c;
          const isCfl = cflSet && cflSet.has(`${r},${c}`);
          const isSame = sv && val && val === sv && !isSel;
          const isHl = selCell && !isSel && !isSame &&
            (selCell[0] === r || selCell[1] === c ||
              ((selCell[0] / 3 | 0) === (r / 3 | 0) && (selCell[1] / 3 | 0) === (c / 3 | 0)));
          const wasAnim = isAnim && origBoard && val && val !== origBoard[r][c] && !isG;
          const cn = nts && nts[r][c] || new Set();

          // 背景优先级：选中 > 冲突 > 动画 > 相同数字 > 行列宫 > 有标记浅紫 > 白
          let bg = "white";
          if (isSel)          bg = C.pkLL;
          else if (isCfl)     bg = "#FFEBEE";
          else if (wasAnim)   bg = "#E3F2FD";
          else if (isSame)    bg = C.mnLL;
          else if (isHl)      bg = "#FFF4F9";
          else if (cn.size > 0) bg = C.puLLL;

          const br = c === 2 || c === 5 ? `2.5px solid ${accent}` : `1px solid ${C.bd}`;
          const bb = r === 2 || r === 5 ? `2.5px solid ${accent}` : `1px solid ${C.bd}`;

          return (
            <div key={i} onClick={() => onSel && onSel([r, c])} style={{
              background: bg, borderRight: br, borderBottom: bb,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: onSel ? "pointer" : "default", position: "relative",
              transition: "background .12s", overflow: "hidden", minWidth: 0, minHeight: 0,
            }}>
              {val
                ? <span style={{
                    fontSize: "clamp(13px,3.8vw,20px)", fontWeight: 700, userSelect: "none",
                    color: isCfl ? C.err : wasAnim ? "#1565C0" : isG ? C.gv : C.us,
                    animation: wasAnim ? "popIn .35s ease" : undefined, lineHeight: 1,
                  }}>{val}</span>
                : cn.size > 0 ? <NoteGrid noteSet={cn} /> : null
              }
              {isSel && <div style={{ position: "absolute", inset: 1, border: `2.5px solid ${accent}`, borderRadius: 3, pointerEvents: "none" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── 数字键盘 ───────── */
function NumPad({ onN, onE, nmA, onNmT }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7, maxWidth: 360, width: "100%" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, "✕"].map(n => (
        <button key={n} onClick={() => typeof n === "number" ? onN(n) : onE()} style={{
          background: typeof n === "number" ? "white" : "#FFF0F7",
          color: typeof n === "number" ? C.tx : C.pk,
          border: `2px solid ${typeof n === "number" ? C.bd : C.pkL}`,
          borderRadius: 11, padding: "13px 0",
          fontSize: typeof n === "number" ? 20 : 16, fontWeight: 700,
        }}>{n}</button>
      ))}
      {/* 标记按钮：激活时紫色主题，与候选标记颜色一致 */}
      <button onClick={onNmT} style={{
        background: nmA ? C.puLL : "white",
        color: nmA ? C.puD : C.txl,
        border: `2px solid ${nmA ? C.puL : C.bd}`,
        borderRadius: 11, padding: "13px 0", fontSize: 12, fontWeight: 700,
        boxShadow: nmA ? `inset 3px 0 0 ${C.puD}` : "none",
      }}>{nmA ? "✏️ 标记 ON" : "✏️ 标记"}</button>
    </div>
  );
}

/* ───────── 通用按钮 ───────── */
function Btn({ l, fn, dis, bg, tc, sm }) {
  bg = bg || C.pk; tc = tc || "white";
  return (
    <button onClick={fn} disabled={dis} style={{
      background: dis ? "#EEE" : bg, color: dis ? "#BBB" : tc, border: "none",
      borderRadius: sm ? 11 : 16, padding: sm ? "8px 13px" : "11px 20px",
      fontSize: sm ? 13 : 14, fontWeight: 700,
      boxShadow: dis ? "none" : "0 3px 10px rgba(0,0,0,.12)",
    }}>{l}</button>
  );
}

/* ───────── 颜色图例 ───────── */
function Legend() {
  const items = [
    { bg: "#FFF4F9", bd: C.pkL, label: "行/列/宫" },
    { bg: C.mnLL, bd: C.mnL, label: "相同数字" },
    { bg: "#FFEBEE", bd: "#FFCDD2", label: "冲突" },
    { bg: C.puLLL, bd: C.puL, label: "候选标记", txt: C.puD },
  ];
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", marginTop: 8, marginBottom: 2 }}>
      {items.map(it => (
        <div key={it.label} style={{
          display: "flex", alignItems: "center", gap: 4,
          background: it.bg, border: `1.5px solid ${it.bd}`,
          borderRadius: 20, padding: "3px 9px", fontSize: 11,
          color: it.txt || C.txm, fontWeight: 600,
        }}>{it.label}</div>
      ))}
    </div>
  );
}

/* ═══════════════════════════ MAIN APP ═══════════════════════════ */
export default function SudokuApp() {
  const [screen, setScreen] = useState("menu");
  const [diff, setDiff] = useState("medium");
  const [toastData, setToastData] = useState(null);
  const [initB, setInitB] = useState(null);
  const [board, setBoard] = useState(null);
  const [sol, setSol] = useState(null);
  const [notes, setNotes] = useState(null);
  const [sel, setSel] = useState(null);
  const [nm, setNm] = useState(false);
  const [hist, setHist] = useState([]);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [saves, setSaves] = useState([]);
  const [animOn, setAnimOn] = useState(false);
  const [animDisp, setAnimDisp] = useState(null);
  const [animSteps, setAnimSteps] = useState([]);
  const [animIdx, setAnimIdx] = useState(0);
  // 自定义出题
  const [cLib, setCLib] = useState([]);
  const [cBoard, setCBoard] = useState(() => Array.from({ length: 9 }, () => Array(9).fill(0)));
  const [cSel, setCSel] = useState(null);
  const [cName, setCName] = useState("");
  const [cHist, setCHist] = useState([]);
  const tRef = useRef();

  const toast = useCallback((msg, type = "ok") => {
    setToastData({ msg, type }); setTimeout(() => setToastData(null), 2800);
  }, []);

  // 计时器
  useEffect(() => {
    clearInterval(tRef.current);
    if (running && !done) tRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(tRef.current);
  }, [running, done]);

  // 解题动画
  useEffect(() => {
    if (!animOn) return;
    if (animIdx >= animSteps.length) {
      setAnimOn(false); setAnimDisp(null);
      if (sol) setBoard(sol.map(r => [...r]));
      setDone(true); setRunning(false); return;
    }
    const { r, c, n } = animSteps[animIdx];
    const tid = setTimeout(() => {
      setAnimDisp(prev => { const nb = (prev || board).map(row => [...row]); nb[r][c] = n; return nb; });
      setAnimIdx(i => i + 1);
    }, 110);
    return () => clearTimeout(tid);
  }, [animOn, animIdx, animSteps]);

  const disp = animOn && animDisp ? animDisp : board;

  const progress = useMemo(() => {
    if (!board || !initB || !sol) return 0;
    let tot = 0, fil = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!initB[r][c]) { tot++; if (board[r][c] && board[r][c] === sol[r][c]) fil++; }
    return tot ? Math.round(fil / tot * 100) : 100;
  }, [board, initB, sol]);

  const cfl = useMemo(() => board ? getCfl(board) : new Set(), [board]);
  const cCfl = useMemo(() => getCfl(cBoard), [cBoard]);

  const startGame = useCallback((d, customPuz = null) => {
    let data;
    if (customPuz) {
      const s = trysolve(customPuz);
      if (!s) { toast("❌ 此数独无解！", "err"); return; }
      data = { puzzle: customPuz.map(r => [...r]), solution: s };
    } else data = mkPuzzle(d || diff);
    setInitB(data.puzzle.map(r => [...r]));
    setBoard(data.puzzle.map(r => [...r]));
    setSol(data.solution);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())));
    setSel(null); setNm(false); setHist([]); setTime(0);
    setRunning(true); setDone(false); setHintsLeft(3);
    setAnimOn(false); setAnimDisp(null);
    if (d) setDiff(d);
    setScreen("game");
  }, [diff, toast]);

  const isDone = useCallback(b => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!b[r][c]) return false;
    return getCfl(b).size === 0;
  }, []);

  const pushH = useCallback(() => {
    if (!board || !notes) return;
    setHist(h => [...h.slice(-49), { board: board.map(r => [...r]), notes: notes.map(r => r.map(s => new Set(s))) }]);
  }, [board, notes]);

  const inputNum = useCallback(n => {
    if (!sel || !board || !initB || animOn) return;
    const [r, c] = sel; if (initB[r][c]) return;
    pushH();
    if (nm) {
      const nn = notes.map(row => row.map(s => new Set(s)));
      nn[r][c].has(n) ? nn[r][c].delete(n) : nn[r][c].add(n);
      setNotes(nn);
    } else {
      const nb = board.map(row => [...row]); nb[r][c] = nb[r][c] === n ? 0 : n;
      const nn = notes.map(row => row.map(s => new Set(s))); nn[r][c] = new Set();
      setBoard(nb); setNotes(nn);
      if (isDone(nb)) { setDone(true); setRunning(false); }
    }
  }, [sel, board, initB, notes, nm, animOn, pushH, isDone]);

  const eraseCell = useCallback(() => {
    if (!sel || !board || !initB || animOn) return;
    const [r, c] = sel; if (initB[r][c]) return;
    pushH();
    const nb = board.map(row => [...row]); nb[r][c] = 0;
    const nn = notes.map(row => row.map(s => new Set(s))); nn[r][c] = new Set();
    setBoard(nb); setNotes(nn);
  }, [sel, board, initB, notes, animOn, pushH]);

  const undoMove = useCallback(() => {
    if (!hist.length) return;
    const prev = hist[hist.length - 1];
    setBoard(prev.board); setNotes(prev.notes); setHist(h => h.slice(0, -1));
  }, [hist]);

  const giveHint = useCallback(() => {
    if (hintsLeft <= 0 || !sol || !board || !initB || animOn) return;
    const cells = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!initB[r][c] && board[r][c] !== sol[r][c]) cells.push([r, c]);
    if (!cells.length) return;
    const [r, c] = cells[rng() * cells.length | 0];
    pushH();
    const nb = board.map(row => [...row]); nb[r][c] = sol[r][c];
    const nn = notes.map(row => row.map(s => new Set(s))); nn[r][c] = new Set();
    setBoard(nb); setNotes(nn); setSel([r, c]); setHintsLeft(h => h - 1);
    if (isDone(nb)) { setDone(true); setRunning(false); }
  }, [hintsLeft, sol, board, initB, notes, animOn, pushH, isDone]);

  const saveGame = useCallback(() => {
    if (!board || !initB || !sol) return;
    setSaves(p => [{
      id: Date.now(), date: new Date().toLocaleString("zh-CN"),
      diff, time, progress,
      initB: initB.map(r => [...r]), board: board.map(r => [...r]), sol: sol.map(r => [...r]),
      notes: notes.map(row => row.map(s => [...s])),
      hist: hist.map(h => ({ board: h.board.map(r => [...r]), notes: h.notes.map(row => row.map(s => [...s])) })),
    }, ...p].slice(0, 10));
    toast("💾 游戏已保存！");
  }, [board, initB, sol, notes, hist, diff, time, progress, toast]);

  const loadGame = useCallback(s => {
    setInitB(s.initB); setBoard(s.board); setSol(s.sol);
    setNotes(s.notes.map(row => row.map(set => new Set(set))));
    setHist(s.hist.map(h => ({ board: h.board, notes: h.notes.map(row => row.map(set => new Set(set))) })));
    setDiff(s.diff); setTime(s.time);
    setRunning(true); setDone(false); setAnimOn(false); setAnimDisp(null);
    setSel(null); setHintsLeft(3); setScreen("game");
  }, []);

  const startAnim = useCallback(() => {
    if (!sol || !board || !initB || done) return;
    setRunning(false);
    const steps = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!initB[r][c] && board[r][c] !== sol[r][c]) steps.push({ r, c, n: sol[r][c] });
    setAnimSteps(steps); setAnimDisp(board.map(r => [...r])); setAnimIdx(0); setAnimOn(true);
  }, [sol, board, initB, done]);

  // 游戏键盘
  useEffect(() => {
    if (screen !== "game") return;
    const h = e => {
      const n = +e.key;
      if (n >= 1 && n <= 9) { e.preventDefault(); inputNum(n); }
      if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); eraseCell(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undoMove(); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [screen, inputNum, eraseCell, undoMove]);

  // 自定义出题操作
  const pushCH = useCallback(() => { setCHist(h => [...h.slice(-49), cBoard.map(r => [...r])]); }, [cBoard]);
  const inputC = useCallback(n => {
    if (!cSel) return;
    const [r, c] = cSel; pushCH();
    const nb = cBoard.map(row => [...row]); nb[r][c] = nb[r][c] === n ? 0 : n; setCBoard(nb);
  }, [cSel, cBoard, pushCH]);
  const eraseC = useCallback(() => {
    if (!cSel) return;
    const [r, c] = cSel; pushCH();
    const nb = cBoard.map(row => [...row]); nb[r][c] = 0; setCBoard(nb);
  }, [cSel, cBoard, pushCH]);
  const undoC = useCallback(() => {
    if (!cHist.length) return;
    setCBoard(cHist[cHist.length - 1]); setCHist(h => h.slice(0, -1));
  }, [cHist]);
  const clearC = useCallback(() => {
    setCBoard(Array.from({ length: 9 }, () => Array(9).fill(0)));
    setCSel(null); setCName(""); setCHist([]);
  }, []);
  const confirmC = useCallback(() => {
    if (cCfl.size > 0) { toast("⚠️ 有数字冲突，请修正！", "err"); return; }
    if (cBoard.flat().filter(Boolean).length < 17) { toast("⚠️ 至少需要17个数字！", "err"); return; }
    const s = trysolve(cBoard); if (!s) { toast("❌ 此数独无解！", "err"); return; }
    const nm2 = cName.trim() || `自定义题目 ${cLib.length + 1}`;
    setCLib(p => [...p, { id: Date.now(), name: nm2, board: cBoard.map(r => [...r]), solution: s, date: new Date().toLocaleString("zh-CN") }]);
    toast(`✅ "${nm2}" 已保存到题库！`); clearC();
  }, [cCfl, cBoard, cName, cLib, toast, clearC]);

  // 自定义键盘
  useEffect(() => {
    if (screen !== "custom") return;
    const h = e => {
      if (document.activeElement && document.activeElement.tagName === "INPUT") return;
      const n = +e.key;
      if (n >= 1 && n <= 9) { e.preventDefault(); inputC(n); }
      if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); eraseC(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undoC(); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [screen, inputC, eraseC, undoC]);

  function Toast() {
    if (!toastData) return null;
    return (
      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        background: toastData.type === "err" ? "#FFEBEE" : "#F0FFF4",
        color: toastData.type === "err" ? "#C62828" : "#1B5E20",
        border: `2px solid ${toastData.type === "err" ? "#FFCDD2" : "#C8E6C9"}`,
        borderRadius: 24, padding: "10px 24px", fontWeight: 700, fontSize: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,.18)", zIndex: 9999,
        animation: "fadeUp .3s ease", whiteSpace: "nowrap",
      }}>{toastData.msg}</div>
    );
  }

  const bgMain = "linear-gradient(145deg,#FFF0F7 0%,#EEF0FF 55%,#F0FFF4 100%)";

  /* ═══════ MENU ═══════ */
  if (screen === "menu") return (
    <div style={{ ...pageShell, background: bgMain, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <style>{css}</style>
      <div style={{ fontSize: 76, animation: "bob 2s ease-in-out infinite", marginBottom: 4, userSelect: "none" }}>🐱</div>
      <h1 style={{ fontSize: 36, color: C.pk, margin: "0 0 2px", fontWeight: 900, letterSpacing: 3, textShadow: `3px 3px 0 ${C.pkLL}` }}>猫咪数独</h1>
      <p style={{ color: C.txm, margin: "0 0 24px", fontSize: 13, letterSpacing: 2 }}>🐾 Nyan Sudoku 🐾</p>
      <div style={{ background: "white", borderRadius: 22, padding: "16px 20px", marginBottom: 16, boxShadow: "0 4px 20px rgba(255,133,161,.2)", width: "100%", maxWidth: 300 }}>
        <p style={{ color: C.tx, fontWeight: 700, textAlign: "center", margin: "0 0 12px", fontSize: 15 }}>选择难度 🎯</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {[["easy", "😸 简单"], ["medium", "🐱 普通"], ["hard", "😈 困难"]].map(([d, l]) => (
            <button key={d} onClick={() => setDiff(d)} style={{
              background: diff === d ? C.pk : "#F5F5F5", color: diff === d ? "white" : C.txm,
              border: `2px solid ${diff === d ? C.pk : "#DDD"}`, borderRadius: 12, padding: "8px 10px", fontSize: 12, fontWeight: 700,
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 260 }}>
        <Btn l="🎮  开始游戏" fn={() => startGame(diff)} />
        {saves.length > 0 && <Btn l={`📂 读取存档 (${saves.length})`} fn={() => setScreen("saved")} bg={C.pu} />}
        <Btn l="✏️  自定义出题" fn={() => { clearC(); setScreen("custom"); }} bg={C.mnL} tc={C.tx} />
        {cLib.length > 0 && <Btn l={`📚 自定义题库 (${cLib.length})`} fn={() => setScreen("clib")} bg={C.yeL} tc="#7a5c00" />}
      </div>
      <div style={{ marginTop: 20, fontSize: 12, color: C.txl, textAlign: "center", lineHeight: 2.2 }}>
        <div>🐾 键盘 1-9 输入  ·  Backspace 删除</div>
        <div>🐾 Ctrl+Z 撤销上一步</div>
      </div>
      <Toast />
    </div>
  );

  /* ═══════ GAME ═══════ */
  if (screen === "game") {
    const dl = { easy: "😸 简单", medium: "🐱 普通", hard: "😈 困难" }[diff];
    return (
      <div style={{ ...pageShell, background: bgMain, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px 28px" }}>
        <style>{css}</style>
        {/* 顶栏 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 400, marginBottom: 10 }}>
          <button onClick={() => { setRunning(false); setScreen("menu"); }} style={{ background: "white", border: `2px solid ${C.bd}`, borderRadius: 10, padding: "6px 10px", fontSize: 16 }}>🏠</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: C.txm, fontSize: 12, fontWeight: 700 }}>{dl}{animOn && " 🔍 解题中..."}</div>
            <div style={{ color: C.tx, fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>⏱ {fmtT(time)}</div>
          </div>
          <button onClick={saveGame} style={{ background: C.pu, color: "white", border: "none", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 12 }}>💾 保存</button>
        </div>
        {/* 进度条 */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 8 }}>
          <div style={{ height: 28, background: C.pkLL, borderRadius: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, background: `linear-gradient(90deg,${C.pk},${C.pkL})`, borderRadius: 20, transition: "width .65s cubic-bezier(.34,1.56,.64,1)" }} />
            <div style={{ position: "absolute", top: "50%", left: `calc(${progress}% - 13px)`, fontSize: 18, transform: "translateY(-50%)", lineHeight: 1, transition: "left .65s cubic-bezier(.34,1.56,.64,1)", pointerEvents: "none", userSelect: "none" }}>🐱</div>
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: progress > 70 ? "white" : C.txm }}>{progress}%</span>
          </div>
        </div>
        {/* 颜色图例 */}
        <Legend />
        {/* 棋盘 */}
        <BoardGrid bd={disp} ini={initB} nts={notes} selCell={sel} onSel={cell => { if (!animOn) setSel(cell); }} cflSet={cfl} accent={C.pk} isAnim={animOn} origBoard={board} />
        {/* 操作按钮 */}
        <div style={{ display: "flex", gap: 7, marginBottom: 10, marginTop: 12, flexWrap: "wrap", justifyContent: "center", maxWidth: 400 }}>
          <Btn l="↩️ 撤销" fn={undoMove} dis={!hist.length} bg={C.pu} sm />
          <Btn l={`💡 提示(${hintsLeft})`} fn={giveHint} dis={hintsLeft === 0 || animOn} bg={C.ye} tc={C.tx} sm />
          <Btn l={animOn ? "⏸ 解题中..." : "🔍 解题回溯"} fn={startAnim} dis={animOn || done} bg="#E3F2FD" tc={C.sv} sm />
          <Btn l="🔄 重开" fn={() => startGame(diff)} bg="#F5F5F5" tc={C.txm} sm />
        </div>
        {/* 数字键盘 */}
        <NumPad onN={inputNum} onE={eraseCell} nmA={nm} onNmT={() => setNm(m => !m)} />
        {/* 完成弹窗 */}
        {done && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(255,240,248,.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
            <div style={{ fontSize: 80, animation: "bob .8s ease-in-out infinite", userSelect: "none" }}>🎉</div>
            <div style={{ fontSize: 38, fontWeight: 900, animation: "rain 2s linear infinite", marginBottom: 6 }}>太棒了！</div>
            <div style={{ fontSize: 16, color: C.txm, marginBottom: 4 }}>完成时间：{fmtT(time)}</div>
            <div style={{ fontSize: 14, color: C.txl, marginBottom: 24 }}>🐱 你是数独高手！</div>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn l="🎮 再来一局" fn={() => startGame(diff)} />
              <Btn l="🏠 主菜单" fn={() => setScreen("menu")} bg={C.pu} />
            </div>
          </div>
        )}
        <Toast />
      </div>
    );
  }

  /* ═══════ SAVED GAMES ═══════ */
  if (screen === "saved") return (
    <div style={{ ...pageShell, background: bgMain, padding: "16px 16px 30px" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button onClick={() => setScreen("menu")} style={{ background: "white", border: `2px solid ${C.bd}`, borderRadius: 10, padding: "6px 12px", fontSize: 14 }}>← 返回</button>
          <h2 style={{ color: C.pu, margin: 0, fontSize: 22 }}>📂 读取存档</h2>
        </div>
        {!saves.length
          ? <div style={{ textAlign: "center", padding: "60px 20px", color: C.txl }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>😿</div>
              <div>还没有存档记录</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>游戏中点击"💾 保存"来创建存档</div>
            </div>
          : saves.map(s => (
            <div key={s.id} style={{ background: "white", borderRadius: 16, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 12px rgba(155,134,189,.15)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: C.tx, fontSize: 15 }}>{{ easy: "😸 简单", medium: "🐱 普通", hard: "😈 困难" }[s.diff]}</div>
                <div style={{ color: C.txl, fontSize: 12, marginTop: 2 }}>{s.date}</div>
                <div style={{ marginTop: 6, height: 6, background: "#F0E0F0", borderRadius: 4, overflow: "hidden", width: 130 }}>
                  <div style={{ height: "100%", width: `${s.progress}%`, background: C.pk, borderRadius: 4 }} />
                </div>
                <div style={{ color: C.txm, fontSize: 12, marginTop: 3 }}>进度 {s.progress}% · {fmtT(s.time)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => loadGame(s)} style={{ background: C.pk, color: "white", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13 }}>继续 ▶</button>
                <button onClick={() => setSaves(p => p.filter(x => x.id !== s.id))} style={{ background: "#FFEBEE", color: C.err, border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 12 }}>🗑️ 删除</button>
              </div>
            </div>
          ))
        }
      </div>
      <Toast />
    </div>
  );

  /* ═══════ CUSTOM INPUT ═══════ */
  if (screen === "custom") {
    const sz = "min(360px,95vw)";
    return (
      <div style={{ ...pageShell, background: "linear-gradient(145deg,#F0FFF4 0%,#E8F5E9 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 8px 28px" }}>
        <style>{css}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 400, marginBottom: 8 }}>
          <button onClick={() => setScreen("menu")} style={{ background: "white", border: `2px solid ${C.mnL}`, borderRadius: 10, padding: "6px 10px", fontSize: 16 }}>← 返回</button>
          <h2 style={{ color: "#2d7a4f", margin: 0, fontSize: 18 }}>✏️ 自定义出题</h2>
          {cLib.length > 0
            ? <button onClick={() => setScreen("clib")} style={{ background: C.yeL, border: "none", borderRadius: 10, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: "#7a5c00" }}>📚 {cLib.length}</button>
            : <div style={{ width: 40 }} />}
        </div>
        <p style={{ color: C.txm, fontSize: 13, margin: "0 0 4px", textAlign: "center" }}>
          点击格子 · 数字键 1-9 填入 · Backspace 删 · Ctrl+Z 撤销 🐾
        </p>
        {cCfl.size > 0 && (
          <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 10, padding: "7px 16px", marginBottom: 6, fontSize: 13, color: "#C62828", fontWeight: 700 }}>
            ⚠️ 发现 {cCfl.size} 处冲突，请修正！
          </div>
        )}
        {/* 棋盘：0 显示为完全空白 */}
        <div style={{ position: "relative", marginTop: 20, marginBottom: 12 }}>
          <div style={{ position: "absolute", top: -19, left: 20, width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderBottom: `19px solid ${C.mnL}`, zIndex: 2 }} />
          <div style={{ position: "absolute", top: -19, right: 20, width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderBottom: `19px solid ${C.mnL}`, zIndex: 2 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gridTemplateRows: "repeat(9,1fr)", border: `3px solid ${C.mnL}`, borderRadius: 14, overflow: "hidden", boxShadow: `0 8px 28px ${C.mnL}55`, background: "white", width: sz, height: sz, flexShrink: 0 }}>
            {Array.from({ length: 81 }, (_, i) => {
              const r = i / 9 | 0, c = i % 9;
              const val = cBoard[r][c] > 0 ? cBoard[r][c] : null; // 0 → null → 空白
              const isSel = cSel && cSel[0] === r && cSel[1] === c;
              const isCfl = cCfl.has(`${r},${c}`);
              const br = c === 2 || c === 5 ? `2.5px solid ${C.mnL}` : `1px solid ${C.bd}`;
              const bb = r === 2 || r === 5 ? `2.5px solid ${C.mnL}` : `1px solid ${C.bd}`;
              return (
                <div key={i} onClick={() => setCSel([r, c])} style={{ background: isSel ? "#D4EDE2" : isCfl ? "#FFEBEE" : "white", borderRight: br, borderBottom: bb, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "hidden", minWidth: 0, minHeight: 0 }}>
                  {val !== null && (
                    <span style={{ fontSize: "clamp(13px,3.8vw,20px)", fontWeight: 700, color: isCfl ? C.err : "#2d7a4f", userSelect: "none", lineHeight: 1 }}>{val}</span>
                  )}
                  {isSel && <div style={{ position: "absolute", inset: 1, border: `2.5px solid ${C.mnL}`, borderRadius: 3, pointerEvents: "none" }} />}
                </div>
              );
            })}
          </div>
        </div>
        {/* 自定义键盘 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7, maxWidth: 360, width: "100%", marginBottom: 10 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "✕"].map(n => (
            <button key={n} onClick={() => typeof n === "number" ? inputC(n) : eraseC()} style={{ background: typeof n === "number" ? "white" : "#F0FFF4", color: typeof n === "number" ? C.tx : C.mn, border: `2px solid ${typeof n === "number" ? C.bd : C.mnL}`, borderRadius: 11, padding: "13px 0", fontSize: typeof n === "number" ? 20 : 16, fontWeight: 700 }}>{n}</button>
          ))}
          <button onClick={undoC} disabled={!cHist.length} style={{ background: cHist.length ? C.puLL : "#EEE", color: cHist.length ? C.puD : "#BBB", border: `2px solid ${cHist.length ? C.puL : "#DDD"}`, borderRadius: 11, padding: "13px 0", fontSize: 12, fontWeight: 700 }}>↩️ 撤销</button>
        </div>
        {/* 确认区域 */}
        <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(92,184,92,.15)", width: "100%", maxWidth: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: C.txm }}>已填：<b>{cBoard.flat().filter(Boolean).length}</b> 个（至少17个）</div>
            <button onClick={clearC} style={{ background: "#FFF9E6", color: "#9a6b00", border: `2px solid ${C.yeL}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700 }}>🗑️ 清空</button>
          </div>
          <input value={cName} onChange={e => setCName(e.target.value)} placeholder="题目名称（可选）" style={{ width: "100%", border: `2px solid ${C.bd}`, borderRadius: 10, padding: "8px 12px", fontSize: 14, color: C.tx, marginBottom: 10, display: "block" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={confirmC} style={{ flex: 2, background: C.mnL, color: "white", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, boxShadow: "0 3px 10px rgba(92,184,92,.3)" }}>✅ 确定保存到题库</button>
            {cLib.length > 0 && <button onClick={() => setScreen("clib")} style={{ flex: 1, background: C.yeL, color: "#7a5c00", border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 700 }}>📚 题库</button>}
          </div>
        </div>
        <Toast />
      </div>
    );
  }

  /* ═══════ CUSTOM LIBRARY ═══════ */
  if (screen === "clib") return (
    <div style={{ ...pageShell, background: "linear-gradient(145deg,#FFFDE7 0%,#FFF8E1 100%)", padding: "16px 16px 30px" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button onClick={() => setScreen("custom")} style={{ background: "white", border: `2px solid ${C.yeL}`, borderRadius: 10, padding: "6px 12px", fontSize: 14 }}>← 返回</button>
          <h2 style={{ color: "#9a6b00", margin: 0, fontSize: 22 }}>📚 自定义题库</h2>
        </div>
        {!cLib.length
          ? <div style={{ textAlign: "center", padding: "60px 20px", color: C.txl }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>😺</div>
              <div>还没有自定义题目</div>
              <button onClick={() => setScreen("custom")} style={{ marginTop: 16, background: C.mnL, color: "white", border: "none", borderRadius: 16, padding: "10px 20px", fontWeight: 700 }}>✏️ 去出题</button>
            </div>
          : cLib.map(p => (
            <div key={p.id} style={{ background: "white", borderRadius: 16, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 12px rgba(240,192,96,.2)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: C.tx, fontSize: 15 }}>✏️ {p.name}</div>
                <div style={{ color: C.txl, fontSize: 12, marginTop: 2 }}>{p.date}</div>
                <div style={{ color: C.mn, fontSize: 12, marginTop: 2 }}>初始数字：{p.board.flat().filter(Boolean).length} 个</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => startGame(null, p.board)} style={{ background: C.mnL, color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>▶ 开始</button>
                <button onClick={() => setCLib(p2 => p2.filter(x => x.id !== p.id))} style={{ background: "#FFEBEE", color: C.err, border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12 }}>🗑️</button>
              </div>
            </div>
          ))
        }
      </div>
      <Toast />
    </div>
  );

  return null;
}
