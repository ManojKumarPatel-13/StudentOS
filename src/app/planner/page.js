"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Play, CheckCircle2, Move, Zap, Clock, Brain,
    Coffee, Send, ChevronRight, Calendar, BarChart2,
    Activity, Target, Plus, X, Loader
} from "lucide-react";
import Sidebar from "@/components/shared/sidebar";
import { generatePlan } from "@/lib/gemini";

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
    bg: "#0A1628", primary: "#0C2D5E", accent: "#185FA5",
    gold: "#C9A84C", white: "#FFFFFF",
    border: "rgba(24,95,165,0.18)", borderGold: "rgba(201,168,76,0.22)",
    muted: "rgba(245,240,232,0.38)", dim: "rgba(245,240,232,0.14)",
    success: "#10B981", danger: "#EF4444", purple: "#8B5CF6",
};

// ── INITIAL TASKS ─────────────────────────────────────────────────────────────
const INITIAL_TASKS = [
    { id: "t1", title: "Deep Focus: Algorithm Design", time: "09:00", end: "11:00", energy: "High", category: "Coding", confidence: 92, type: "deep", completed: false, subtasks: ["Review Big-O notation", "Solve 3 LeetCode problems", "Document solutions"] },
    { id: "t2", title: "Coffee Break", time: "11:00", end: "11:15", energy: "Low", category: "Health", confidence: 100, type: "break", completed: false, subtasks: [] },
    { id: "t3", title: "Review Pull Requests", time: "11:15", end: "12:00", energy: "Medium", category: "Coding", confidence: 88, type: "light", completed: false, subtasks: ["Check open PRs", "Leave comments", "Merge approved"] },
    { id: "t4", title: "Study: Data Structures", time: "12:00", end: "13:30", energy: "High", category: "Study", confidence: 78, type: "deep", completed: false, subtasks: ["Trees & Graphs chapter", "Practice problems", "Make summary notes"] },
    { id: "t5", title: "Database Optimization", time: "14:00", end: "15:30", energy: "High", category: "Coding", confidence: 71, type: "deep", completed: false, subtasks: ["Index analysis", "Query optimization"] },
    { id: "t6", title: "Mind Reset", time: "15:30", end: "15:45", energy: "Low", category: "Health", confidence: 100, type: "break", completed: false, subtasks: [] },
    { id: "t7", title: "Team Standup", time: "16:00", end: "17:00", energy: "Medium", category: "Admin", confidence: 95, type: "meeting", completed: false, subtasks: ["Prepare update", "List blockers"] },
];

const CATEGORY_COLORS = {
    Coding: "#185FA5", Study: "#C9A84C", Admin: "#8B5CF6",
    Health: "#10B981", Other: "#6B7280",
};

const TYPE_STYLES = {
    deep: { border: C.gold, glow: "rgba(201,168,76,0.15)", label: "Deep Work" },
    light: { border: C.accent, glow: "rgba(24,95,165,0.12)", label: "Light Task" },
    break: { border: C.success, glow: "rgba(16,185,129,0.1)", label: "Break" },
    meeting: { border: C.purple, glow: "rgba(139,92,246,0.12)", label: "Meeting" },
    ai: { border: "rgba(245,240,232,0.2)", glow: "rgba(245,240,232,0.04)", label: "AI Task" },
};

const AI_LOGS = [
    { time: "09:42", msg: "Analyzing workload distribution..." },
    { time: "09:43", msg: "Fatigue pattern detected in afternoon schedule", highlight: true },
    { time: "09:44", msg: "Inserting recovery block at 4:00 PM", highlight: true },
    { time: "09:45", msg: "Optimizing deep work placement based on circadian rhythm" },
    { time: "09:46", msg: "Algorithm Design moved to morning peak window" },
    { time: "09:47", msg: "Context switching reduced by 34% vs original plan" },
];

const AI_SUGGESTIONS = [
    { id: "s1", title: "Add 15-min reset before database optimization?", reason: "Low energy + heavy tasks stacked. Short break will improve focus by ~23%.", accepted: null },
    { id: "s2", title: "Move team standup to 2:00 PM?", reason: "Current placement interrupts peak focus window. Afternoon slot aligns better with team availability.", accepted: null },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}
function getNowMinutes() {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
}
function getCurrentTimeStr() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}
function confidenceColor(c) {
    if (c >= 85) return C.success;
    if (c >= 70) return C.gold;
    return C.danger;
}

// ── TASK CARD ─────────────────────────────────────────────────────────────────
function TaskCard({ task, isActive, onComplete, onExpand, expanded }) {
    const ts = TYPE_STYLES[task.type] || TYPE_STYLES.light;
    const isBreak = task.type === "break";

    if (isBreak) {
        return (
            <div
                className="my-1.5 px-[18px] py-2.5 rounded-full flex items-center gap-2.5 cursor-pointer transition-all"
                style={{
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.2)",
                }}
                onClick={() => onComplete(task.id)}
            >
                <Coffee size={14} color={C.success} />
                <span className="text-[13px] font-semibold" style={{ color: C.success }}>{task.title}</span>
                <span className="text-[11px] font-mono ml-auto" style={{ color: C.muted }}>{task.time} – {task.end}</span>
            </div>
        );
    }

    return (
        <div
            className="mb-2.5 rounded-[14px] overflow-hidden transition-all duration-[250ms] ease-in-out"
            style={{
                background: isActive ? "rgba(12,45,94,0.7)" : "rgba(12,45,94,0.4)",
                border: `1px solid ${isActive ? ts.border : C.border}`,
                boxShadow: isActive ? `0 0 20px ${ts.glow}, inset 0 1px 0 rgba(255,255,255,0.04)` : "none",
                opacity: task.completed ? 0.45 : 1,
            }}
        >
            {/* Card header */}
            <div className="p-4 cursor-pointer" onClick={() => onExpand(task.id)}>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: CATEGORY_COLORS[task.category] || C.muted }}
                            />
                            <span
                                className="text-[9px] font-mono tracking-[0.1em] uppercase"
                                style={{ color: CATEGORY_COLORS[task.category] || C.muted }}
                            >
                                {task.category}
                            </span>
                            {task.type === "ai" && (
                                <span
                                    className="text-[9px] font-mono px-1.5 py-px rounded"
                                    style={{ color: C.muted, border: `1px dashed ${C.border}` }}
                                >
                                    AI
                                </span>
                            )}
                        </div>
                        <h4
                            className="text-[14px] font-bold m-0 tracking-[-0.01em]"
                            style={{
                                color: task.completed ? C.muted : C.white,
                                textDecoration: task.completed ? "line-through" : "none",
                            }}
                        >
                            {task.title}
                        </h4>
                        <p className="text-[11px] font-mono mt-1 mb-0" style={{ color: C.muted }}>
                            {task.time} – {task.end} &nbsp;·&nbsp; Energy: {task.energy}
                        </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                        <div className="text-[11px] font-mono font-bold" style={{ color: confidenceColor(task.confidence) }}>
                            {task.confidence}% confidence
                        </div>
                        <div className="mt-1 h-[3px] w-[60px] rounded-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                            <div
                                className="h-full rounded-sm"
                                style={{ width: `${task.confidence}%`, background: confidenceColor(task.confidence) }}
                            />
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={e => { e.stopPropagation(); }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer border-none text-white"
                        style={{ background: C.accent }}
                    >
                        <Play size={10} fill="currentColor" /> Launch
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-transparent text-[11px] cursor-pointer"
                        style={{ border: `1px solid ${C.border}`, color: C.muted }}
                    >
                        <Move size={10} /> Move
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onComplete(task.id); }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-transparent text-[11px] cursor-pointer"
                        style={{ border: `1px solid ${C.border}`, color: C.muted }}
                    >
                        <CheckCircle2 size={10} /> Complete
                    </button>
                </div>
            </div>

            {/* Expanded subtasks */}
            {expanded && task.subtasks.length > 0 && (
                <div className="px-4 pb-3.5" style={{ borderTop: `1px solid ${C.border}` }}>
                    <p className="text-[9px] font-mono tracking-[0.15em] uppercase mt-3 mb-2" style={{ color: C.muted }}>
                        Subtasks
                    </p>
                    {task.subtasks.map((s, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 py-[5px]"
                            style={{ borderBottom: i < task.subtasks.length - 1 ? `1px solid ${C.dim}` : "none" }}
                        >
                            <div
                                className="w-3.5 h-3.5 rounded-full shrink-0"
                                style={{ border: `1.5px solid ${C.border}` }}
                            />
                            <span className="text-[12px]" style={{ color: C.muted }}>{s}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── CALENDAR VIEW ─────────────────────────────────────────────────────────────
function CalendarView({ tasks }) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date().getDay();
    const weekTasks = {
        1: tasks.slice(0, 3),
        2: tasks.slice(1, 4),
        3: [tasks[0], tasks[3]],
        4: tasks.slice(2, 5),
        5: [tasks[4], tasks[6]],
        6: [],
        0: [tasks[1]],
    };

    return (
        <div className="grid grid-cols-7 gap-1.5 h-full px-1">
            {days.map((day, i) => {
                const dayNum = i + 1;
                const isToday = dayNum === (today === 0 ? 7 : today);
                const dayTasks = weekTasks[dayNum] || [];
                return (
                    <div key={day} className="flex flex-col gap-1">
                        <div className="text-center py-1.5 mb-1">
                            <p
                                className="text-[9px] font-mono uppercase tracking-[0.1em] m-0"
                                style={{ color: isToday ? C.gold : C.muted }}
                            >
                                {day}
                            </p>
                            {isToday && (
                                <div
                                    className="w-1 h-1 rounded-full mx-auto mt-[3px]"
                                    style={{ background: C.gold }}
                                />
                            )}
                        </div>
                        {dayTasks.map((t, ti) => (
                            <div
                                key={ti}
                                className="px-1.5 py-[5px] rounded-[7px] cursor-pointer"
                                style={{
                                    background: `${CATEGORY_COLORS[t.category]}18`,
                                    border: `1px solid ${CATEGORY_COLORS[t.category]}35`,
                                }}
                            >
                                <p
                                    className="text-[9px] font-semibold m-0 overflow-hidden text-ellipsis whitespace-nowrap"
                                    style={{ color: CATEGORY_COLORS[t.category] }}
                                >
                                    {t.title}
                                </p>
                                <p className="text-[8px] font-mono mt-0.5 mb-0" style={{ color: C.dim }}>
                                    {t.time}
                                </p>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

// ── VECTOR / NEURAL VIEW ──────────────────────────────────────────────────────
function VectorView({ tasks }) {
    const [hovered, setHovered] = useState(null);
    const nodes = tasks.map((t, i) => ({
        ...t,
        x: 80 + (i % 4) * 130 + (Math.floor(i / 4) % 2) * 50,
        y: 60 + Math.floor(i / 4) * 120 + (i % 3) * 15,
        r: t.type === "deep" ? 10 : t.type === "break" ? 6 : 8,
    }));

    return (
        <div className="relative w-full h-full overflow-hidden">
            <svg width="100%" height="100%" className="absolute inset-0">
                {nodes.map((n, i) =>
                    nodes.slice(i + 1, i + 3).map((m, j) => (
                        <line key={`${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y}
                            stroke="rgba(24,95,165,0.15)" strokeWidth="1" strokeDasharray="3 4" />
                    ))
                )}
                {nodes.map((n) => (
                    <g key={n.id} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
                        <circle cx={n.x} cy={n.y} r={n.r + 4} fill={`${CATEGORY_COLORS[n.category]}10`} />
                        <circle cx={n.x} cy={n.y} r={n.r} fill={CATEGORY_COLORS[n.category]} fillOpacity={0.85} />
                        {hovered?.id === n.id && (
                            <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke={CATEGORY_COLORS[n.category]} strokeWidth="1" strokeOpacity={0.4} />
                        )}
                        <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="monospace">{n.time}</text>
                    </g>
                ))}
            </svg>

            {/* Hover tooltip — position is dynamic so stays inline */}
            {hovered && (
                <div
                    className="absolute pointer-events-none z-10 rounded-[10px] p-[10px_14px] min-w-[160px]"
                    style={{
                        left: hovered.x + 15,
                        top: hovered.y - 20,
                        background: C.primary,
                        border: `1px solid ${C.border}`,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                >
                    <p className="text-[12px] font-bold mb-1 m-0" style={{ color: C.white }}>{hovered.title}</p>
                    <p className="text-[10px] font-mono m-0" style={{ color: C.muted }}>{hovered.time} · {hovered.energy} energy</p>
                    <div className="flex gap-1.5 mt-1.5">
                        <span
                            className="text-[9px] font-mono px-[7px] py-0.5 rounded"
                            style={{ background: `${CATEGORY_COLORS[hovered.category]}20`, color: CATEGORY_COLORS[hovered.category] }}
                        >
                            {hovered.category}
                        </span>
                        <span
                            className="text-[9px] font-mono px-[7px] py-0.5 rounded"
                            style={{ background: "rgba(255,255,255,0.05)", color: confidenceColor(hovered.confidence) }}
                        >
                            {hovered.confidence}%
                        </span>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex gap-3">
                {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
                    <div key={cat} className="flex items-center gap-1.5">
                        <div className="w-[7px] h-[7px] rounded-full" style={{ background: col }} />
                        <span className="text-[9px] font-mono" style={{ color: C.muted }}>{cat}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PlannerPage() {
    const [tasks, setTasks] = useState(INITIAL_TASKS);
    const [activeView, setActiveView] = useState("timeline");
    const [expandedId, setExpandedId] = useState(null);
    const [suggestions, setSuggestions] = useState(AI_SUGGESTIONS);
    const [aiLogs, setAiLogs] = useState([]);
    const [command, setCommand] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [nowMinutes, setNowMinutes] = useState(getNowMinutes());
    const [focusMode, setFocusMode] = useState("Balanced");
    const [addingTask, setAddingTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: "", time: "", energy: "Medium", category: "Study" });
    const logRef = useRef(null);
    const chatRef = useRef(null);

    const [chatMessages, setChatMessages] = useState([
        { role: "ai", text: "Analyzing workload distribution...", suggestion: null },
        { role: "ai", text: "⚠ Fatigue pattern detected in afternoon schedule. Inserting recovery block at 4:00 PM.", suggestion: null },
        { role: "ai", text: "Optimizing deep work placement based on circadian rhythm. Context switching reduced by 34%.", suggestion: null },
        { role: "ai", text: "Schedule looks good! You have 7h 15m planned today. Want me to optimize further?", suggestion: null },
        { role: "ai", text: "I suggest adding a recovery block before Database Optimization.", suggestion: { title: "Recovery block at 3:30 PM", accepted: null } },
    ]);

    // Tick clock
    useEffect(() => {
        const t = setInterval(() => setNowMinutes(getNowMinutes()), 60000);
        return () => clearInterval(t);
    }, []);

    // Stream AI logs
    useEffect(() => {
        AI_LOGS.forEach((log, i) => {
            setTimeout(() => {
                setAiLogs(prev => [...prev, log]);
                if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
            }, 800 + i * 600);
        });
    }, []);

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [chatMessages]);

    const handleComplete = (id) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
    };

    const handleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const handleSuggestion = (id, decision) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, accepted: decision } : s));
        if (decision === "accept") {
            setAiLogs(prev => [...prev, { time: getCurrentTimeStr(), msg: `Suggestion accepted — schedule updated.`, highlight: true }]);
        }
    };

    const handleCommand = async (e) => {
        e.preventDefault();
        if (!command.trim()) return;
        const cmd = command;
        setCommand("");
        setChatMessages(prev => [...prev, { role: "user", text: cmd }]);
        setIsThinking(true);
        try {
            const res = await generatePlan(`You are a student planner AI. User says: "${cmd}". Reply in 1-2 short sentences.`);
            setChatMessages(prev => [...prev, { role: "ai", text: res.substring(0, 150), suggestion: null }]);
        } catch {
            setChatMessages(prev => [...prev, { role: "ai", text: "Schedule updated.", suggestion: null }]);
        }
        setIsThinking(false);
    };

    const handleAddTask = () => {
        if (!newTask.title || !newTask.time) return;
        const endHour = parseInt(newTask.time.split(":")[0]) + 1;
        const end = `${String(endHour).padStart(2, "0")}:${newTask.time.split(":")[1]}`;
        setTasks(prev => [...prev, {
            id: `t${Date.now()}`, ...newTask, end,
            confidence: 85, type: "light", completed: false, subtasks: [],
        }]);
        setAddingTask(false);
        setNewTask({ title: "", time: "", energy: "Medium", category: "Study" });
    };

    const acceptSuggestion = (msgIndex) => {
        setChatMessages(prev => prev.map((m, i) =>
            i === msgIndex && m.suggestion ? { ...m, suggestion: { ...m.suggestion, accepted: true } } : m
        ));
    };
    const rejectSuggestion = (msgIndex) => {
        setChatMessages(prev => prev.map((m, i) =>
            i === msgIndex && m.suggestion ? { ...m, suggestion: { ...m.suggestion, accepted: false } } : m
        ));
    };

    // Stats
    const totalPlanned = tasks.reduce((s, t) => s + (timeToMinutes(t.end) - timeToMinutes(t.time)), 0);
    const completedCount = tasks.filter(t => t.completed).length;
    const availableMinutes = 18 * 60;
    const remainingMinutes = availableMinutes - totalPlanned;

    // Timeline: hours 8–20
    const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
    const TIMELINE_START = 8 * 60;
    const TIMELINE_END = 21 * 60;
    const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START;

    const nowPct = Math.max(0, Math.min(100, ((nowMinutes - TIMELINE_START) / TIMELINE_RANGE) * 100));

    const FOCUS_MODES = ["Deep Work", "Exam Mode", "Recovery", "Balanced"];

    return (
        <div
            className="flex min-h-screen overflow-hidden text-white"
            style={{ background: C.bg, fontFamily: "'DM Sans', 'Inter', sans-serif" }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
                @keyframes scanDown { 0%{opacity:0.7} 50%{opacity:1} 100%{opacity:0.7} }
                @keyframes slideIn { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
                @keyframes fadeUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
                @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes breathe { 0%,100%{box-shadow:0 0 8px rgba(24,95,165,0.3)} 50%{box-shadow:0 0 18px rgba(24,95,165,0.6)} }
                .log-entry { animation: slideIn 0.25s ease forwards; }
                .task-anim { animation: fadeUp 0.3s ease forwards; }
                .sug-card:hover { border-color: rgba(24,95,165,0.35) !important; }
                .view-btn:hover { background: rgba(24,95,165,0.1) !important; }
                .mode-btn:hover { background: rgba(201,168,76,0.08) !important; }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(24,95,165,0.25); border-radius: 2px; }
                input::placeholder { color: rgba(245,240,232,0.2); }
                select option { background: #0C2D5E; }
            `}</style>

            {/* ── SHARED SIDEBAR ── */}
            <Sidebar activePage="planner" />

            {/* ── MAIN AREA ── */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-64">

                {/* Top Bar */}
                <header
                    className="flex items-center gap-4 px-5 py-3 shrink-0 backdrop-blur-[12px]"
                    style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(10,22,40,0.8)" }}
                >
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-[15px] font-bold m-0 tracking-[-0.01em]">Today's Timeline</h2>
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${C.borderGold}` }}
                        >
                            <Clock size={11} color={C.gold} />
                            <span className="text-[11px] font-[DM_Mono,monospace]" style={{ color: C.gold }}>{getCurrentTimeStr()}</span>
                        </div>
                    </div>

                    {/* Time Budget */}
                    <div className="flex items-center gap-4 ml-2">
                        {[
                            { label: "Available", val: "9h", color: C.muted },
                            { label: "Planned", val: `${Math.floor(totalPlanned / 60)}h ${totalPlanned % 60}m`, color: C.gold },
                            { label: "Free", val: `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`, color: C.success },
                        ].map(r => (
                            <div key={r.label} className="flex items-center gap-1">
                                <span className="text-[10px] font-mono" style={{ color: C.dim }}>{r.label}:</span>
                                <span className="text-[11px] font-mono font-semibold" style={{ color: r.color }}>{r.val}</span>
                            </div>
                        ))}
                    </div>

                    {/* View switcher */}
                    <div
                        className="flex gap-1 p-1 rounded-[10px] ml-auto"
                        style={{ background: "rgba(12,45,94,0.5)", border: `1px solid ${C.border}` }}
                    >
                        {[
                            { key: "timeline", icon: <Activity size={13} />, label: "Timeline" },
                            { key: "calendar", icon: <Calendar size={13} />, label: "Calendar" },
                            { key: "vector", icon: <BarChart2 size={13} />, label: "Vector" },
                        ].map(v => (
                            <button
                                key={v.key}
                                className="view-btn flex items-center gap-1.5 px-3 py-[5px] rounded-[7px] border-none cursor-pointer text-[11px] font-semibold transition-all duration-200 font-mono"
                                onClick={() => setActiveView(v.key)}
                                style={{
                                    background: activeView === v.key ? C.accent : "transparent",
                                    color: activeView === v.key ? C.white : C.muted,
                                }}
                            >
                                {v.icon} {v.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setAddingTask(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[11px] font-bold cursor-pointer"
                        style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${C.borderGold}`, color: C.gold }}
                    >
                        <Plus size={13} /> Add Task
                    </button>
                </header>

                {/* Add Task Modal */}
                {addingTask && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
                        <div
                            className="rounded-2xl p-6 w-[360px]"
                            style={{ background: C.primary, border: `1px solid ${C.border}` }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="m-0 text-[15px] font-bold">New Task</h3>
                                <button
                                    onClick={() => setAddingTask(false)}
                                    className="bg-transparent border-none cursor-pointer"
                                    style={{ color: C.muted }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {[
                                { label: "Title", field: "title", type: "text", placeholder: "Task name..." },
                                { label: "Time", field: "time", type: "time", placeholder: "09:00" },
                            ].map(f => (
                                <div key={f.field} className="mb-3">
                                    <label
                                        className="text-[10px] font-mono uppercase tracking-[0.1em] block mb-1"
                                        style={{ color: C.muted }}
                                    >
                                        {f.label}
                                    </label>
                                    <input
                                        type={f.type}
                                        value={newTask[f.field]}
                                        onChange={e => setNewTask(p => ({ ...p, [f.field]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className="w-full px-3 py-2 rounded-lg text-[13px] outline-none font-mono box-border"
                                        style={{
                                            background: "rgba(10,22,40,0.8)",
                                            border: `1px solid ${C.border}`,
                                            color: C.white,
                                        }}
                                    />
                                </div>
                            ))}

                            <div className="grid grid-cols-2 gap-2.5 mb-4">
                                {[
                                    { label: "Energy", field: "energy", opts: ["Low", "Medium", "High"] },
                                    { label: "Category", field: "category", opts: Object.keys(CATEGORY_COLORS) },
                                ].map(f => (
                                    <div key={f.field}>
                                        <label
                                            className="text-[10px] font-mono uppercase tracking-[0.1em] block mb-1"
                                            style={{ color: C.muted }}
                                        >
                                            {f.label}
                                        </label>
                                        <select
                                            value={newTask[f.field]}
                                            onChange={e => setNewTask(p => ({ ...p, [f.field]: e.target.value }))}
                                            className="w-full px-2.5 py-2 rounded-lg text-[12px] outline-none font-mono"
                                            style={{
                                                background: "rgba(10,22,40,0.8)",
                                                border: `1px solid ${C.border}`,
                                                color: C.white,
                                            }}
                                        >
                                            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleAddTask}
                                className="w-full py-2.5 rounded-[10px] border-none text-white text-[13px] font-bold cursor-pointer"
                                style={{ background: C.accent }}
                            >
                                Add to Timeline
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">

                    {/* ── TIMELINE / CALENDAR / VECTOR ── */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 min-w-0">

                        {activeView === "timeline" && (
                            <div className="relative">
                                {/* Now scanner beam — top% is dynamic */}
                                <div
                                    className="absolute left-0 right-0 z-[5]"
                                    style={{
                                        top: `${nowPct}%`,
                                        height: 1,
                                        background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
                                        animation: "scanDown 3s ease-in-out infinite",
                                    }}
                                >
                                    <div
                                        className="absolute left-0 text-[9px] font-mono px-1.5 py-px rounded"
                                        style={{ top: -8, color: C.gold, background: C.bg }}
                                    >
                                        NOW
                                    </div>
                                </div>

                                {/* Hour ticks — top% is dynamic */}
                                {HOURS.map(h => {
                                    const pct = ((h * 60 - TIMELINE_START) / TIMELINE_RANGE) * 100;
                                    return (
                                        <div
                                            key={h}
                                            className="absolute left-0 w-full pointer-events-none z-0"
                                            style={{ top: `${pct}%` }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="text-[9px] font-mono w-8 shrink-0"
                                                    style={{ color: C.dim }}
                                                >
                                                    {String(h).padStart(2, "0")}:00
                                                </span>
                                                <div className="flex-1 h-px" style={{ background: "rgba(24,95,165,0.08)" }} />
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Task blocks */}
                                <div className="pl-11 pt-2 min-h-[600px] relative">
                                    {tasks
                                        .slice()
                                        .sort((a, b) => a.time.localeCompare(b.time))
                                        .map((task, i) => {
                                            const isActive = nowMinutes >= timeToMinutes(task.time) && nowMinutes < timeToMinutes(task.end);
                                            return (
                                                <div
                                                    key={task.id}
                                                    className="task-anim mb-2"
                                                    style={{ animationDelay: `${i * 0.05}s` }}
                                                >
                                                    <div className="flex gap-3 items-start">
                                                        <div className="w-11 shrink-0 pt-4 text-right">
                                                            <span className="text-[9px] font-mono" style={{ color: "rgba(245,240,232,0.15)" }}>
                                                                {task.time}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <TaskCard
                                                                task={task}
                                                                isActive={isActive}
                                                                onComplete={handleComplete}
                                                                onExpand={handleExpand}
                                                                expanded={expandedId === task.id}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {activeView === "calendar" && (
                            <div className="h-[calc(100vh-120px)]">
                                <CalendarView tasks={tasks} />
                            </div>
                        )}

                        {activeView === "vector" && (
                            <div className="h-[calc(100vh-120px)] relative">
                                <VectorView tasks={tasks} />
                            </div>
                        )}
                    </div>

                    {/* ── AGENT CONSOLE ── */}
                    <div
                        className="w-[300px] flex flex-col shrink-0"
                        style={{ borderLeft: `1px solid ${C.border}`, background: "rgba(6,13,26,0.85)" }}
                    >
                        {/* Header */}
                        <div
                            className="flex justify-between items-center px-4 py-3.5"
                            style={{ borderBottom: `1px solid ${C.border}` }}
                        >
                            <div>
                                <p className="text-[8px] font-mono uppercase tracking-[0.15em] m-0" style={{ color: C.muted }}>
                                    Agent Console
                                </p>
                                <h3 className="text-[13px] font-bold mt-0.5 mb-0">AI Brain</h3>
                            </div>
                            <div
                                className="flex items-center gap-1.5 px-2.5 py-[3px] rounded-full"
                                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
                            >
                                <div
                                    className="w-[5px] h-[5px] rounded-full"
                                    style={{ background: C.success, animation: "pulse 1.5s infinite" }}
                                />
                                <span className="text-[9px] font-mono" style={{ color: C.success }}>Active</span>
                            </div>
                        </div>

                        {/* Unified Chat */}
                        <div
                            ref={chatRef}
                            className="flex-1 overflow-y-auto px-3.5 pb-2.5 flex flex-col gap-2"
                        >
                            {chatMessages.map((msg, i) => (
                                <div key={i}>
                                    {msg.role === "user" ? (
                                        <div className="flex justify-end">
                                            <div
                                                className="px-3 py-2 max-w-[85%]"
                                                style={{
                                                    background: "rgba(24,95,165,0.2)",
                                                    border: `1px solid ${C.border}`,
                                                    borderRadius: "12px 12px 4px 12px",
                                                }}
                                            >
                                                <p className="text-[11px] font-mono m-0" style={{ color: C.white }}>{msg.text}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5">
                                            <div
                                                className="px-3 py-2"
                                                style={{
                                                    background: "rgba(12,45,94,0.4)",
                                                    border: `1px solid ${C.border}`,
                                                    borderRadius: "12px 12px 12px 4px",
                                                }}
                                            >
                                                <p
                                                    className="text-[11px] font-mono m-0 leading-[1.5]"
                                                    style={{ color: "rgba(245,240,232,0.75)" }}
                                                >
                                                    {msg.text}
                                                </p>
                                            </div>
                                            {msg.suggestion && (
                                                <div
                                                    className="px-3 py-2.5 rounded-[10px]"
                                                    style={{ background: "rgba(12,45,94,0.35)", border: `1px solid ${C.border}` }}
                                                >
                                                    <p className="text-[11px] font-semibold mb-1.5 m-0" style={{ color: C.white }}>
                                                        {msg.suggestion.title}
                                                    </p>
                                                    {msg.suggestion.accepted === null && (
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                onClick={() => acceptSuggestion(i)}
                                                                className="flex-1 py-[5px] rounded-[7px] border-none text-white text-[10px] font-bold cursor-pointer"
                                                                style={{ background: C.success }}
                                                            >
                                                                ✓ Accept
                                                            </button>
                                                            <button
                                                                onClick={() => rejectSuggestion(i)}
                                                                className="px-2.5 py-[5px] rounded-[7px] bg-transparent text-[10px] cursor-pointer"
                                                                style={{ border: `1px solid ${C.border}`, color: C.muted }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    )}
                                                    {msg.suggestion.accepted !== null && (
                                                        <p
                                                            className="text-[9px] font-mono m-0"
                                                            style={{ color: msg.suggestion.accepted ? C.success : C.muted }}
                                                        >
                                                            {msg.suggestion.accepted ? "✓ Accepted" : "✕ Dismissed"}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Command Input */}
                        <div className="px-3.5 py-2.5 mt-auto" style={{ borderTop: `1px solid ${C.border}` }}>
                            <p className="text-[8px] font-mono uppercase tracking-[0.15em] mb-2 m-0" style={{ color: C.dim }}>
                                Command Input
                            </p>
                            <form onSubmit={handleCommand} className="flex gap-1.5">
                                <input
                                    value={command}
                                    onChange={e => setCommand(e.target.value)}
                                    placeholder="E.g., 'move math to evening'"
                                    className="flex-1 px-2.5 py-2 rounded-lg text-[11px] outline-none font-mono text-white"
                                    style={{
                                        background: "rgba(10,22,40,0.8)",
                                        border: `1px solid ${C.border}`,
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={isThinking}
                                    className="flex items-center px-2.5 py-2 rounded-lg border-none text-white cursor-pointer"
                                    style={{ background: C.accent }}
                                >
                                    {isThinking
                                        ? <Loader size={13} style={{ animation: "pulse 1s infinite" }} />
                                        : <Send size={13} />
                                    }
                                </button>
                            </form>
                        </div>

                        {/* Gemini badge */}
                        <div className="flex gap-2 items-center px-3.5 py-2.5" style={{ borderTop: `1px solid ${C.border}` }}>
                            <div
                                className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-[11px] shrink-0"
                                style={{ background: `linear-gradient(135deg, #4285F4, ${C.accent})` }}
                            >
                                ✦
                            </div>
                            <div>
                                <p className="text-[9px] font-semibold m-0" style={{ color: "rgba(245,240,232,0.7)" }}>
                                    Gemini 1.5 Flash
                                </p>
                                <p className="text-[8px] font-mono m-0" style={{ color: C.dim }}>
                                    Autonomous planner
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}