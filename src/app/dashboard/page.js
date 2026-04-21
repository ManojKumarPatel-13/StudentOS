"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import {
    Play, Pause, Square, Zap, Target, Clock,
    ChevronRight, Search, Bell, Send, CheckCircle2,
    TrendingUp, BookOpen, Brain, Coffee
} from "lucide-react";
import Sidebar from "@/components/shared/sidebar";
import { useAuth } from "@/context/authContext";
import {
    calculateDailyOutlook, getUpcomingTasks, getTodaysTasks,
    getWeeklyMomentum, parseCommand, saveCommand,
    logFocusSession, addTask, markTaskComplete, generateAIInference
} from "@/lib/services/homeService";

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
    bg: "#0A1628",
    primary: "#0C2D5E",
    accent: "#185FA5",
    gold: "#C9A84C",
    surface: "#F5F0E8",
    white: "#FFFFFF",
    border: "rgba(24,95,165,0.18)",
    muted: "rgba(245,240,232,0.4)",
    dim: "rgba(245,240,232,0.15)",
    success: "#10B981",
    danger: "#EF4444",
};

// ── FALLBACKS ─────────────────────────────────────────────────────────────────
const FB_OUTLOOK = { status: "On Track", completedCount: 3, totalCount: 6, percent: 50, dayProgressPercent: 58 };
const FB_TASKS = [
    { id: "1", title: "Advanced Calculus", subject: "Mathematics", scheduledAt: "15:00", duration: 45, energyCost: "high", completed: false },
    { id: "2", title: "Physics Lab Report", subject: "Physics", scheduledAt: "17:00", duration: 60, energyCost: "medium", completed: false },
    { id: "3", title: "DSA Practice", subject: "CS", scheduledAt: "19:30", duration: 30, energyCost: "low", completed: false },
];
const FB_MOMENTUM = {
    score: 72, activeDays: 5, totalHours: 18.4,
    chartData: [
        { day: "Mon", hours: 3.5, focus: 72 },
        { day: "Tue", hours: 4.2, focus: 85 },
        { day: "Wed", hours: 2.0, focus: 60 },
        { day: "Thu", hours: 5.0, focus: 91 },
        { day: "Fri", hours: 3.8, focus: 78 },
        { day: "Sat", hours: 0, focus: 0 },
        { day: "Sun", hours: 0, focus: 0 },
    ],
};
const FB_LOGS = [
    { type: "SYSTEM", msg: "System nominal. All metrics within optimal range." },
    { type: "PATTERN", msg: "Morning sessions yield 2.4× better recall — your peak window is 09:00–11:00." },
    { type: "INSIGHT", msg: "Calculus mastery at 68%. At current pace: 4 days to completion." },
    { type: "ANALYSIS", msg: "Retention for DSA dropping. A review session today would prevent an exam gap." },
    { type: "ALERT", msg: "Physics lab report due in 2 days. Recommend starting tonight." },
];

const LOG_COLORS = { SYSTEM: C.accent, ANALYSIS: C.gold, PATTERN: "#A78BFA", ALERT: C.danger, INSIGHT: C.success };
const ENERGY_COLORS = { low: C.success, medium: C.gold, high: C.danger };
const ENERGY_ICONS = { low: <Coffee size={12} />, medium: <Brain size={12} />, high: <Zap size={12} /> };

const STATUS_CONFIG = {
    "Crushing It": { color: C.success, bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
    "On Track": { color: C.accent, bg: "rgba(24,95,165,0.12)", border: "rgba(24,95,165,0.3)" },
    "In Progress": { color: C.gold, bg: "rgba(201,168,76,0.1)", border: "rgba(201,168,76,0.25)" },
    "Falling Behind": { color: C.danger, bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
    "Not Started": { color: C.muted, bg: "rgba(245,240,232,0.05)", border: C.border },
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getGreeting() {
    const h = new Date().getHours();
    if (h < 5) return "Burning midnight oil";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Studying late";
}

function fmtTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
}

// ── SVG FOCUS GAUGE ───────────────────────────────────────────────────────────
function FocusGauge({ percent, isRunning, timeLeft, subject, onToggle, onStop }) {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const dash = circ * (1 - percent / 100);

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", width: 148, height: 148 }}>
                <svg width="148" height="148" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="74" cy="74" r={r} fill="none" stroke={`rgba(24,95,165,0.15)`} strokeWidth="10" />
                    <circle
                        cx="74" cy="74" r={r} fill="none"
                        stroke={isRunning ? C.gold : C.accent}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={dash}
                        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
                    />
                </svg>
                <div style={{
                    position: "absolute", inset: 0, display: "flex",
                    flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: isRunning ? C.gold : C.white, fontFamily: "monospace", letterSpacing: "-0.04em" }}>
                        {fmtTime(timeLeft)}
                    </span>
                    <span style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace", marginTop: 2 }}>
                        {isRunning ? "focus" : "ready"}
                    </span>
                </div>
                {isRunning && (
                    <div style={{
                        position: "absolute", inset: -4, borderRadius: "50%",
                        boxShadow: `0 0 24px rgba(201,168,76,0.25)`,
                        animation: "pulseGlow 2s ease-in-out infinite",
                        pointerEvents: "none",
                    }} />
                )}
            </div>

            <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: 0 }}>{subject}</p>
                <p style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", margin: "2px 0 0" }}>Active focus session</p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onToggle} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "9px 20px",
                    background: isRunning ? `rgba(201,168,76,0.12)` : C.accent,
                    border: `1px solid ${isRunning ? C.gold : C.accent}`,
                    borderRadius: 12, color: isRunning ? C.gold : C.white,
                    fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                }}>
                    {isRunning ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                    {isRunning ? "Pause" : "Start"}
                </button>
                <button onClick={onStop} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 12, color: C.danger, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", transition: "all 0.2s",
                }}>
                    <Square size={13} fill="currentColor" /> End
                </button>
            </div>
        </div>
    );
}

// ── CARD ──────────────────────────────────────────────────────────────────────
function Card({ children, style = {}, className = "" }) {
    return (
        <div className={className} style={{
            background: `${C.primary}44`,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: 22,
            backdropFilter: "blur(14px)",
            ...style,
        }}>
            {children}
        </div>
    );
}

function Label({ text }) {
    return <p style={{ fontSize: 9, letterSpacing: "0.22em", color: C.muted, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>{text}</p>;
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function HomePage() {
    const { user } = useAuth();
    const uid = user?.uid;
    const router = useRouter();

    // State
    const [outlook, setOutlook] = useState(FB_OUTLOOK);
    const [tasks, setTasks] = useState(FB_TASKS);
    const [upcoming, setUpcoming] = useState(FB_TASKS);
    const [momentum, setMomentum] = useState(FB_MOMENTUM);
    const [aiLogs, setAiLogs] = useState([]);
    const [visLogs, setVisLogs] = useState([]);
    const [command, setCommand] = useState("");
    const [cmdResult, setCmdResult] = useState(null);
    const [cmdLoading, setCmdLoading] = useState(false);

    // Focus timer state
    const [focusActive, setFocusActive] = useState(false);
    const [focusPaused, setFocusPaused] = useState(false);
    const [focusSecs, setFocusSecs] = useState(25 * 60); // 25 min default
    const [focusTotal, setFocusTotal] = useState(25 * 60);
    const [focusSubject, setFocusSubject] = useState("Advanced Calculus");
    const timerRef = useRef(null);
    const logRef = useRef(null);

    const focusPercent = Math.round(((focusTotal - focusSecs) / focusTotal) * 100);

    // ── Fetch data ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid) return;
        Promise.all([
            calculateDailyOutlook(uid),
            getTodaysTasks(uid),
            getUpcomingTasks(uid),
            getWeeklyMomentum(uid),
        ]).then(([out, allTasks, upTasks, mom]) => {
            setOutlook(out);
            if (allTasks.length) setTasks(allTasks);
            if (upTasks.length) setUpcoming(upTasks);
            setMomentum(mom);

            // Generate rule-based AI tips
            const now = new Date();
            const logs = generateAIInference({
                outlookPercent: out.percent,
                activeDays: mom.activeDays,
                totalHoursToday: 0,
                currentHour: now.getHours(),
                upcomingTasks: upTasks,
            });
            setAiLogs(logs);
        }).catch(console.error);
    }, [uid]);

    // Stream AI logs
    useEffect(() => {
        const src = aiLogs.length ? aiLogs : FB_LOGS;
        setVisLogs([]);
        src.forEach((log, i) => {
            setTimeout(() => {
                setVisLogs(prev => [...prev, log]);
                if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
            }, i * 500);
        });
    }, [aiLogs]);

    // ── Focus Timer ────────────────────────────────────────────────────────
    const startTimer = useCallback(() => {
        setFocusActive(true);
        setFocusPaused(false);
        timerRef.current = setInterval(() => {
            setFocusSecs(s => {
                if (s <= 1) {
                    clearInterval(timerRef.current);
                    setFocusActive(false);
                    if (uid) logFocusSession(uid, { subject: focusSubject, durationMinutes: Math.round(focusTotal / 60), focusScore: 85 });
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
    }, [uid, focusSubject, focusTotal]);

    const pauseTimer = useCallback(() => {
        clearInterval(timerRef.current);
        setFocusPaused(true);
    }, []);

    const stopTimer = useCallback(() => {
        clearInterval(timerRef.current);
        const elapsed = focusTotal - focusSecs;
        if (elapsed > 60 && uid) {
            logFocusSession(uid, {
                subject: focusSubject,
                durationMinutes: Math.round(elapsed / 60),
                focusScore: 80,
            });
        }
        setFocusActive(false);
        setFocusPaused(false);
        setFocusSecs(focusTotal);
    }, [uid, focusSubject, focusSecs, focusTotal]);

    const toggleFocus = () => {
        if (!focusActive || focusPaused) startTimer();
        else pauseTimer();
    };

    useEffect(() => () => clearInterval(timerRef.current), []);

    // ── Command Palette ────────────────────────────────────────────────────
    const handleCommand = async (e) => {
        e.preventDefault();
        if (!command.trim()) return;
        setCmdLoading(true);
        const parsed = parseCommand(command);

        if (parsed.type === "task" && uid) {
            const today = new Date().toISOString().split("T")[0];
            await addTask(uid, {
                title: parsed.title || command,
                subject: "General",
                scheduledAt: parsed.scheduledAt || "00:00",
                duration: 30,
                energyCost: "medium",
                date: today,
            });
            setCmdResult({ icon: "✓", text: `Task added: "${parsed.title || command}"`, color: C.success });
            const updated = await getTodaysTasks(uid);
            setTasks(updated);
        } else if (parsed.type === "insight" && uid) {
            const { writeAILog } = await import("@/lib/services/analysisService");
            const now = new Date();
            await writeAILog(uid, {
                time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
                type: "INSIGHT",
                msg: parsed.content,
            });
            setCmdResult({ icon: "✦", text: `Insight saved to Analysis log`, color: C.gold });
        } else {
            setCmdResult({ icon: "→", text: `Noted: "${command}"`, color: C.muted });
        }

        setCommand("");
        setCmdLoading(false);
        setTimeout(() => setCmdResult(null), 3000);
    };

    const handleCheckTask = async (taskId) => {
        if (uid) await markTaskComplete(uid, taskId);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
        setUpcoming(prev => prev.filter(t => t.id !== taskId));
        if (uid) {
            const out = await calculateDailyOutlook(uid);
            setOutlook(out);
        } else {
            setOutlook(prev => ({
                ...prev,
                completedCount: prev.completedCount + 1,
                percent: Math.round(((prev.completedCount + 1) / prev.totalCount) * 100),
            }));
        }
    };

    const statusCfg = STATUS_CONFIG[outlook.status] || STATUS_CONFIG["Not Started"];

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "'DM Sans', 'Inter', sans-serif" }}>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
                @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes slideIn  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
                @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes pulseGlow{ 0%,100%{opacity:0.4} 50%{opacity:0.8} }
                @keyframes pulseDot { 0%,100%{transform:scale(1)} 50%{transform:scale(0.82)} }
                @keyframes shimmer  { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
                .fade-up  { animation: fadeUp 0.5s ease forwards; }
                .log-entry{ animation: slideIn 0.3s ease forwards; }
                .task-row:hover { background: rgba(24,95,165,0.1) !important; }
                .cmd-input:focus { border-color: ${C.gold} !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.1) !important; }
                .nav-btn:hover { background: rgba(24,95,165,0.12) !important; }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(24,95,165,0.3); border-radius: 2px; }
            `}</style>

            <Sidebar activePage="home" />

            <main style={{ flex: 1, marginLeft: 256, padding: "24px 28px 40px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>

                {/* ── TOP HEADER ── */}
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="fade-up">
                    <div>
                        <p style={{ fontSize: 11, color: C.muted, fontFamily: "DM Mono", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 2 }}>
                            {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
                            {getGreeting()}, {user?.displayName?.split(" ")[0] || "Student"} 👋
                        </h1>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button className="nav-btn" style={{ padding: "8px 10px", background: `${C.primary}55`, border: `1px solid ${C.border}`, borderRadius: 12, color: C.muted, cursor: "pointer", transition: "all 0.2s" }}>
                            <Search size={18} />
                        </button>
                        <button className="nav-btn" style={{ padding: "8px 10px", background: `${C.primary}55`, border: `1px solid ${C.border}`, borderRadius: 12, color: C.muted, cursor: "pointer", transition: "all 0.2s", position: "relative" }}>
                            <Bell size={18} />
                            <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, background: C.gold, borderRadius: "50%", border: `2px solid ${C.bg}` }} />
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: `rgba(24,95,165,0.08)`, border: `1px solid ${C.border}`, borderRadius: 100 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, animation: "pulseDot 2s infinite" }} />
                            <span style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono", letterSpacing: "0.1em" }}>GEMINI LIVE</span>
                        </div>
                    </div>
                </header>

                {/* ── TEMPORAL BRIEF (Hero) ── */}
                <Card style={{ padding: "20px 28px", animationDelay: "0.05s" }} className="fade-up">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <Label text="Temporal Brief — Daily Command" />
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Today's Outlook</h2>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 100, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color, fontFamily: "DM Mono" }}>
                                    {outlook.status}
                                </span>
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 28, fontWeight: 800, color: C.gold, margin: 0, fontFamily: "DM Mono", letterSpacing: "-0.03em" }}>
                                {outlook.completedCount}<span style={{ fontSize: 14, color: C.muted }}>/{outlook.totalCount}</span>
                            </p>
                            <p style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono", margin: "2px 0 0" }}>tasks done</p>
                        </div>
                    </div>

                    {/* Task completion bar */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono" }}>Task Completion</span>
                            <span style={{ fontSize: 10, color: C.gold, fontFamily: "DM Mono", fontWeight: 600 }}>{outlook.percent}%</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(24,95,165,0.12)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
                            <div style={{ height: "100%", width: `${outlook.percent}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.gold})`, borderRadius: 3, transition: "width 1s ease", position: "relative" }}>
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)", animation: "shimmer 2s infinite" }} />
                            </div>
                        </div>
                    </div>

                    {/* Day progress bar */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono" }}>Day Progress</span>
                            <span style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono" }}>{outlook.dayProgressPercent}% of the day elapsed</span>
                        </div>
                        <div style={{ height: 4, background: "rgba(245,240,232,0.06)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${outlook.dayProgressPercent}%`, background: "rgba(245,240,232,0.15)", borderRadius: 2, transition: "width 1s ease" }} />
                        </div>
                    </div>
                </Card>

                {/* ── MIDDLE ROW: Focus + Command + Upcoming ── */}
                <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 260px", gap: 16, animationDelay: "0.1s" }} className="fade-up">

                    {/* Focus Vial */}
                    <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
                        <Label text="Active Focus Vial" />
                        <div style={{ marginTop: 8, width: "100%" }}>
                            {/* Duration selector */}
                            {!focusActive && (
                                <div style={{ display: "flex", gap: 6, marginBottom: 16, justifyContent: "center" }}>
                                    {[15, 25, 45, 60].map(m => (
                                        <button key={m} onClick={() => { setFocusSecs(m * 60); setFocusTotal(m * 60); }} style={{
                                            padding: "3px 9px", borderRadius: 8, fontSize: 10,
                                            fontFamily: "DM Mono", cursor: "pointer", transition: "all 0.2s",
                                            background: focusTotal === m * 60 ? `${C.accent}30` : "transparent",
                                            border: `1px solid ${focusTotal === m * 60 ? C.accent : C.border}`,
                                            color: focusTotal === m * 60 ? C.accent : C.muted,
                                        }}>{m}m</button>
                                    ))}
                                </div>
                            )}
                            <FocusGauge
                                percent={focusPercent}
                                isRunning={focusActive && !focusPaused}
                                timeLeft={focusSecs}
                                subject={focusSubject}
                                onToggle={toggleFocus}
                                onStop={stopTimer}
                            />
                            {/* Subject selector */}
                            {!focusActive && (
                                <select value={focusSubject} onChange={e => setFocusSubject(e.target.value)} style={{
                                    marginTop: 14, width: "100%", padding: "8px 12px",
                                    background: `${C.primary}55`, border: `1px solid ${C.border}`,
                                    borderRadius: 10, color: C.white, fontSize: 12,
                                    fontFamily: "DM Mono", outline: "none", cursor: "pointer",
                                }}>
                                    {["Advanced Calculus", "Physics", "Data Structures", "Chemistry", "Networks", "React"].map(s => (
                                        <option key={s} value={s} style={{ background: C.primary }}>{s}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </Card>

                    {/* Center Column: Command + Momentum */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {/* Neural Command Palette */}
                        <Card style={{ flex: 0 }}>
                            <Label text="Neural Command — type anything" />
                            <p style={{ fontSize: 11, color: C.dim, fontFamily: "DM Mono", marginBottom: 12 }}>
                                Try: "Physics 3pm" → adds task &nbsp;|&nbsp; "note: feeling tired" → logs insight
                            </p>
                            <form onSubmit={handleCommand} style={{ display: "flex", gap: 10 }}>
                                <input
                                    className="cmd-input"
                                    value={command}
                                    onChange={e => setCommand(e.target.value)}
                                    placeholder="Gym 6pm / note: Physics is hard / Review DSA tomorrow..."
                                    style={{
                                        flex: 1, padding: "11px 16px",
                                        background: `rgba(6,13,26,0.6)`,
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 12, color: C.white, fontSize: 13,
                                        fontFamily: "DM Mono", outline: "none", transition: "all 0.2s",
                                    }}
                                />
                                <button type="submit" disabled={cmdLoading} style={{
                                    padding: "11px 16px", background: C.accent,
                                    border: "none", borderRadius: 12, color: C.white,
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                                    fontSize: 12, fontWeight: 600, transition: "all 0.2s",
                                    opacity: cmdLoading ? 0.6 : 1,
                                }}>
                                    <Send size={15} /> {cmdLoading ? "..." : "Send"}
                                </button>
                            </form>
                            {cmdResult && (
                                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: cmdResult.color, fontFamily: "DM Mono" }}>
                                    <span>{cmdResult.icon}</span> {cmdResult.text}
                                </div>
                            )}
                        </Card>

                        {/* Intelligence Pulse — Momentum */}
                        <Card style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                <div>
                                    <Label text="Intelligence Pulse" />
                                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Weekly Momentum</h3>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <p style={{ fontSize: 24, fontWeight: 800, color: momentum.score >= 70 ? C.success : momentum.score >= 40 ? C.gold : C.danger, margin: 0, fontFamily: "DM Mono" }}>
                                        {momentum.score}
                                    </p>
                                    <p style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono", margin: 0 }}>/ 100 score</p>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={90}>
                                <AreaChart data={momentum.chartData} margin={{ top: 5, right: 0, bottom: 0, left: -28 }}>
                                    <defs>
                                        <linearGradient id="momGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={C.accent} stopOpacity={0.4} />
                                            <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ background: C.primary, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10, fontFamily: "DM Mono" }} />
                                    <Area type="monotone" dataKey="hours" stroke={C.accent} fill="url(#momGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: C.accent }} />
                                </AreaChart>
                            </ResponsiveContainer>
                            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                                <div>
                                    <p style={{ fontSize: 16, fontWeight: 700, color: C.gold, margin: 0, fontFamily: "DM Mono" }}>{momentum.activeDays}<span style={{ fontSize: 10, color: C.muted }}>/7</span></p>
                                    <p style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono", margin: 0 }}>active days</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: 0, fontFamily: "DM Mono" }}>{momentum.totalHours}h</p>
                                    <p style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono", margin: 0 }}>total hours</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Next-Up Bento */}
                    <Card style={{ display: "flex", flexDirection: "column" }}>
                        <Label text="Next-Up Bento" />
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Upcoming Tasks</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                            {upcoming.slice(0, 3).map((task, i) => (
                                <div
                                    key={task.id}
                                    className="task-row fade-up"
                                    onClick={() => handleCheckTask(task.id)}
                                    style={{
                                        display: "flex", alignItems: "flex-start", gap: 12,
                                        padding: "10px 12px", borderRadius: 12,
                                        background: "rgba(12,45,94,0.4)",
                                        border: `1px solid ${C.border}`,
                                        cursor: "pointer", transition: "all 0.2s",
                                        animationDelay: `${0.15 + i * 0.08}s`,
                                        opacity: task.completed ? 0.4 : 1,
                                    }}
                                >
                                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${task.completed ? C.success : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, background: task.completed ? `${C.success}20` : "transparent" }}>
                                        {task.completed && <CheckCircle2 size={12} color={C.success} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: task.completed ? C.muted : C.white, textDecoration: task.completed ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</p>
                                        <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                                            <span style={{ fontSize: 9, color: C.muted, fontFamily: "DM Mono", display: "flex", alignItems: "center", gap: 3 }}>
                                                <Clock size={9} /> {task.scheduledAt}
                                            </span>
                                            <span style={{ fontSize: 9, color: ENERGY_COLORS[task.energyCost], fontFamily: "DM Mono", display: "flex", alignItems: "center", gap: 3 }}>
                                                {ENERGY_ICONS[task.energyCost]} {task.energyCost}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} color={C.dim} style={{ flexShrink: 0, marginTop: 2 }} />
                                </div>
                            ))}
                            {upcoming.length === 0 && (
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: 12, fontFamily: "DM Mono" }}>
                                    All clear ✓
                                </div>
                            )}
                        </div>
                        <button onClick={() => router.push("/planner")} style={{
                            marginTop: 12, width: "100%", padding: "9px", background: "transparent",
                            border: `1px solid ${C.border}`, borderRadius: 12,
                            color: C.muted, fontSize: 11, fontFamily: "DM Mono",
                            cursor: "pointer", transition: "all 0.2s",
                        }}>+ Open Planner</button>
                    </Card>
                </div>

                {/* ── BOTTOM ROW: Today's Schedule + AI Log ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, animationDelay: "0.15s" }} className="fade-up">

                    {/* Today's Schedule */}
                    <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div>
                                <Label text="Today's Schedule" />
                                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>All Tasks</h3>
                            </div>
                            <span style={{ fontSize: 10, color: C.gold, background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.2)`, padding: "3px 10px", borderRadius: 100, fontFamily: "DM Mono" }}>
                                {outlook.completedCount}/{outlook.totalCount} done
                            </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {tasks.map((task, i) => (
                                <div key={task.id} onClick={() => handleCheckTask(task.id)} style={{
                                    display: "flex", alignItems: "center", gap: 14,
                                    padding: "10px 14px", borderRadius: 12,
                                    background: task.completed ? "rgba(16,185,129,0.04)" : "rgba(12,45,94,0.35)",
                                    border: `1px solid ${task.completed ? "rgba(16,185,129,0.15)" : C.border}`,
                                    cursor: "pointer", transition: "all 0.2s",
                                    opacity: task.completed ? 0.55 : 1,
                                }}>
                                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${task.completed ? C.success : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: task.completed ? `${C.success}20` : "transparent" }}>
                                        {task.completed && <CheckCircle2 size={13} color={C.success} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, textDecoration: task.completed ? "line-through" : "none", color: task.completed ? C.muted : C.white }}>{task.title}</p>
                                        <p style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono", margin: "2px 0 0" }}>{task.subject}</p>
                                    </div>
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <p style={{ fontSize: 11, color: C.muted, fontFamily: "DM Mono", margin: 0 }}>{task.scheduledAt}</p>
                                        <p style={{ fontSize: 10, color: ENERGY_COLORS[task.energyCost], fontFamily: "DM Mono", margin: "2px 0 0" }}>{task.duration}m</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Agentic Log */}
                    <Card style={{ background: "rgba(6,13,26,0.9)", display: "flex", flexDirection: "column" }}>
                        <div style={{ marginBottom: 12 }}>
                            <Label text="Agentic Log — AI System" />
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Live Inference</h3>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, animation: "pulseDot 1.5s infinite" }} />
                            </div>
                        </div>

                        <div ref={logRef} style={{ flex: 1, overflowY: "auto", maxHeight: 260, display: "flex", flexDirection: "column", gap: 8 }}>
                            {visLogs.map((log, i) => (
                                <div key={i} className="log-entry" style={{ padding: "8px 10px", background: "rgba(12,45,94,0.3)", borderRadius: 8, borderLeft: `2px solid ${LOG_COLORS[log.type] || C.accent}` }}>
                                    <span style={{ fontSize: 9, color: LOG_COLORS[log.type], fontFamily: "DM Mono", fontWeight: 700, letterSpacing: "0.06em", display: "block", marginBottom: 3 }}>[{log.type}]</span>
                                    <p style={{ fontSize: 11, color: "rgba(245,240,232,0.65)", fontFamily: "DM Mono", lineHeight: 1.55, margin: 0 }}>{log.msg}</p>
                                </div>
                            ))}
                            {visLogs.length < (aiLogs.length || FB_LOGS.length) && (
                                <span style={{ fontSize: 11, color: C.dim, fontFamily: "DM Mono" }}>
                                    <span style={{ animation: "blink 1s infinite" }}>█</span> inferring...
                                </span>
                            )}
                        </div>

                        <div style={{ marginTop: 14, padding: "8px 12px", background: `rgba(24,95,165,0.06)`, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", gap: 10, alignItems: "center" }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, #4285F4, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✦</div>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 600, margin: 0, color: "rgba(245,240,232,0.8)" }}>Powered by Gemini 1.5 Flash</p>
                                <p style={{ fontSize: 9, color: C.dim, margin: 0, fontFamily: "DM Mono" }}>Proactive intelligence engine</p>
                            </div>
                        </div>
                    </Card>
                </div>

            </main>
        </div>
    );
}