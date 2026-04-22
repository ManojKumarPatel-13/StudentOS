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
            <div style={{
                margin: "6px 0", padding: "10px 18px",
                borderRadius: 100, background: "rgba(16,185,129,0.06)",
                border: `1px solid rgba(16,185,129,0.2)`,
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", transition: "all 0.2s",
            }} onClick={() => onComplete(task.id)}>
                <Coffee size={14} color={C.success} />
                <span style={{ fontSize: 13, color: C.success, fontWeight: 600 }}>{task.title}</span>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginLeft: "auto" }}>{task.time} – {task.end}</span>
            </div>
        );
    }

    return (
        <div style={{
            marginBottom: 10, borderRadius: 14,
            background: isActive ? `rgba(12,45,94,0.7)` : `rgba(12,45,94,0.4)`,
            border: `1px solid ${isActive ? ts.border : C.border}`,
            boxShadow: isActive ? `0 0 20px ${ts.glow}, inset 0 1px 0 rgba(255,255,255,0.04)` : "none",
            transition: "all 0.25s ease",
            opacity: task.completed ? 0.45 : 1,
            overflow: "hidden",
        }}>
            {/* Card header */}
            <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => onExpand(task.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: CATEGORY_COLORS[task.category] || C.muted, flexShrink: 0 }} />
                            <span style={{ fontSize: 9, color: CATEGORY_COLORS[task.category] || C.muted, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>{task.category}</span>
                            {task.type === "ai" && <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", border: `1px dashed ${C.border}`, padding: "1px 6px", borderRadius: 4 }}>AI</span>}
                        </div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: task.completed ? C.muted : C.white, textDecoration: task.completed ? "line-through" : "none", letterSpacing: "-0.01em" }}>{task.title}</h4>
                        <p style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", margin: "4px 0 0" }}>{task.time} – {task.end} &nbsp;·&nbsp; Energy: {task.energy}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 11, color: confidenceColor(task.confidence), fontFamily: "monospace", fontWeight: 700 }}>{task.confidence}% confidence</div>
                        <div style={{ marginTop: 4, height: 3, width: 60, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${task.confidence}%`, background: confidenceColor(task.confidence), borderRadius: 2 }} />
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={e => { e.stopPropagation(); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 8, background: C.accent, border: "none", color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        <Play size={10} fill="currentColor" /> Launch
                    </button>
                    <button onClick={e => { e.stopPropagation(); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: "pointer" }}>
                        <Move size={10} /> Move
                    </button>
                    <button onClick={e => { e.stopPropagation(); onComplete(task.id); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: "pointer" }}>
                        <CheckCircle2 size={10} /> Complete
                    </button>
                </div>
            </div>

            {/* Expanded subtasks */}
            {expanded && task.subtasks.length > 0 && (
                <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", margin: "12px 0 8px" }}>Subtasks</p>
                    {task.subtasks.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < task.subtasks.length - 1 ? `1px solid ${C.dim}` : "none" }}>
                            <div style={{ width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${C.border}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: C.muted }}>{s}</span>
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
    // Sample week data
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, height: "100%", padding: "0 4px" }}>
            {days.map((day, i) => {
                const dayNum = i + 1;
                const isToday = dayNum === (today === 0 ? 7 : today);
                const dayTasks = weekTasks[dayNum] || [];
                return (
                    <div key={day} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ textAlign: "center", padding: "6px 0", marginBottom: 4 }}>
                            <p style={{ fontSize: 9, color: isToday ? C.gold : C.muted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{day}</p>
                            {isToday && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.gold, margin: "3px auto 0" }} />}
                        </div>
                        {dayTasks.map((t, ti) => (
                            <div key={ti} style={{ padding: "5px 6px", borderRadius: 7, background: `${CATEGORY_COLORS[t.category]}18`, border: `1px solid ${CATEGORY_COLORS[t.category]}35`, cursor: "pointer" }}>
                                <p style={{ fontSize: 9, color: CATEGORY_COLORS[t.category], fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                                <p style={{ fontSize: 8, color: C.dim, fontFamily: "monospace", margin: "2px 0 0" }}>{t.time}</p>
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
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                {/* Neural connections */}
                {nodes.map((n, i) =>
                    nodes.slice(i + 1, i + 3).map((m, j) => (
                        <line key={`${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y}
                            stroke="rgba(24,95,165,0.15)" strokeWidth="1" strokeDasharray="3 4" />
                    ))
                )}
                {/* Nodes */}
                {nodes.map((n) => (
                    <g key={n.id} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
                        <circle cx={n.x} cy={n.y} r={n.r + 4} fill={`${CATEGORY_COLORS[n.category]}10`} />
                        <circle cx={n.x} cy={n.y} r={n.r} fill={CATEGORY_COLORS[n.category]} fillOpacity={0.85} />
                        {hovered?.id === n.id && (
                            <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke={CATEGORY_COLORS[n.category]} strokeWidth="1" strokeOpacity={0.4} />
                        )}
                        <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="monospace">{n.time}</text>
                    </g>
                ))}
            </svg>

            {/* Hover tooltip */}
            {hovered && (
                <div style={{
                    position: "absolute", left: hovered.x + 15, top: hovered.y - 20,
                    background: C.primary, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "10px 14px", pointerEvents: "none",
                    zIndex: 10, minWidth: 160,
                    boxShadow: `0 8px 24px rgba(0,0,0,0.4)`,
                }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.white, margin: "0 0 4px" }}>{hovered.title}</p>
                    <p style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", margin: 0 }}>{hovered.time} · {hovered.energy} energy</p>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                        <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: `${CATEGORY_COLORS[hovered.category]}20`, color: CATEGORY_COLORS[hovered.category], fontFamily: "monospace" }}>{hovered.category}</span>
                        <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: confidenceColor(hovered.confidence), fontFamily: "monospace" }}>{hovered.confidence}%</span>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div style={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 12 }}>
                {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: col }} />
                        <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace" }}>{cat}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PlannerPage() {
    const [tasks, setTasks] = useState(INITIAL_TASKS);
    const [activeView, setActiveView] = useState("timeline"); // timeline | calendar | vector
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
        setIsThinking(true);
        setAiLogs(prev => [...prev, { time: getCurrentTimeStr(), msg: `Processing: "${cmd}"` }]);
        try {
            const res = await generatePlan(`You are a student planner AI. The user says: "${cmd}". Respond in 1-2 short sentences with a specific, actionable scheduling suggestion.`);
            setAiLogs(prev => [...prev, { time: getCurrentTimeStr(), msg: res.replace(/\*\*/g, "").substring(0, 120), highlight: true }]);
        } catch {
            setAiLogs(prev => [...prev, { time: getCurrentTimeStr(), msg: "Command processed. Schedule updated." }]);
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

    // Stats
    const totalPlanned = tasks.reduce((s, t) => s + (timeToMinutes(t.end) - timeToMinutes(t.time)), 0);
    const completedCount = tasks.filter(t => t.completed).length;
    const availableMinutes = 18 * 60; // 6am-midnight
    const remainingMinutes = availableMinutes - totalPlanned;

    // Timeline: hours 8–20
    const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
    const TIMELINE_START = 8 * 60;
    const TIMELINE_END = 21 * 60;
    const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START;

    const nowPct = Math.max(0, Math.min(100, ((nowMinutes - TIMELINE_START) / TIMELINE_RANGE) * 100));

    const FOCUS_MODES = ["Deep Work", "Exam Mode", "Recovery", "Balanced"];

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "'DM Sans', 'Inter', sans-serif", overflow: "hidden" }}>

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
            <Sidebar activePage="planner" style="marginLeft: 0," />

            {/* ── MAIN AREA ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

                {/* Top Bar */}
                <header style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16, background: `rgba(10,22,40,0.8)`, backdropFilter: "blur(12px)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Today's Timeline</h2>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(201,168,76,0.1)", border: `1px solid ${C.borderGold}`, borderRadius: 100 }}>
                            <Clock size={11} color={C.gold} />
                            <span style={{ fontSize: 11, color: C.gold, fontFamily: "DM Mono" }}>{getCurrentTimeStr()}</span>
                        </div>
                    </div>

                    {/* Time Budget in header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: 8 }}>
                        {[
                            { label: "Available", val: "9h", color: C.muted },
                            { label: "Planned", val: `${Math.floor(totalPlanned / 60)}h ${totalPlanned % 60}m`, color: C.gold },
                            { label: "Free", val: `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`, color: C.success },
                        ].map(r => (
                            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 10, color: C.dim, fontFamily: "DM Mono" }}>{r.label}:</span>
                                <span style={{ fontSize: 11, color: r.color, fontFamily: "DM Mono", fontWeight: 600 }}>{r.val}</span>
                            </div>
                        ))}
                    </div>

                    {/* View switcher */}
                    <div style={{ display: "flex", gap: 4, background: `rgba(12,45,94,0.5)`, padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, marginLeft: "auto" }}>
                        {[
                            { key: "timeline", icon: <Activity size={13} />, label: "Timeline" },
                            { key: "calendar", icon: <Calendar size={13} />, label: "Calendar" },
                            { key: "vector", icon: <BarChart2 size={13} />, label: "Vector" },
                        ].map(v => (
                            <button key={v.key} className="view-btn" onClick={() => setActiveView(v.key)} style={{
                                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                                borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                                transition: "all 0.2s", fontFamily: "DM Mono",
                                background: activeView === v.key ? C.accent : "transparent",
                                color: activeView === v.key ? C.white : C.muted,
                            }}>
                                {v.icon} {v.label}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => setAddingTask(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: `rgba(201,168,76,0.1)`, border: `1px solid ${C.borderGold}`, borderRadius: 10, color: C.gold, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        <Plus size={13} /> Add Task
                    </button>
                </header>

                {/* Add Task Modal */}
                {addingTask && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ background: C.primary, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: 360 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>New Task</h3>
                                <button onClick={() => setAddingTask(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={16} /></button>
                            </div>
                            {[
                                { label: "Title", field: "title", type: "text", placeholder: "Task name..." },
                                { label: "Time", field: "time", type: "time", placeholder: "09:00" },
                            ].map(f => (
                                <div key={f.field} style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>{f.label}</label>
                                    <input type={f.type} value={newTask[f.field]} onChange={e => setNewTask(p => ({ ...p, [f.field]: e.target.value }))} placeholder={f.placeholder}
                                        style={{ width: "100%", padding: "8px 12px", background: "rgba(10,22,40,0.8)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "DM Mono" }} />
                                </div>
                            ))}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                                {[
                                    { label: "Energy", field: "energy", opts: ["Low", "Medium", "High"] },
                                    { label: "Category", field: "category", opts: Object.keys(CATEGORY_COLORS) },
                                ].map(f => (
                                    <div key={f.field}>
                                        <label style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>{f.label}</label>
                                        <select value={newTask[f.field]} onChange={e => setNewTask(p => ({ ...p, [f.field]: e.target.value }))}
                                            style={{ width: "100%", padding: "8px 10px", background: "rgba(10,22,40,0.8)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.white, fontSize: 12, outline: "none", fontFamily: "DM Mono" }}>
                                            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddTask} style={{ width: "100%", padding: "10px", background: C.accent, border: "none", borderRadius: 10, color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add to Timeline</button>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                    {/* ── TIMELINE / CALENDAR / VECTOR ── */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", minWidth: 0 }}>

                        {activeView === "timeline" && (
                            <div style={{ position: "relative" }}>
                                {/* Now scanner beam */}
                                <div style={{
                                    position: "absolute", left: 0, right: 0,
                                    top: `${nowPct}%`,
                                    height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
                                    zIndex: 5, animation: "scanDown 3s ease-in-out infinite",
                                }}>
                                    <div style={{ position: "absolute", left: 0, top: -8, fontSize: 9, color: C.gold, fontFamily: "DM Mono", background: C.bg, padding: "1px 6px", borderRadius: 4 }}>NOW</div>
                                </div>

                                {/* Hour ticks */}
                                {HOURS.map(h => {
                                    const pct = ((h * 60 - TIMELINE_START) / TIMELINE_RANGE) * 100;
                                    return (
                                        <div key={h} style={{ position: "absolute", left: 0, top: `${pct}%`, width: "100%", pointerEvents: "none", zIndex: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 9, color: C.dim, fontFamily: "DM Mono", width: 32, flexShrink: 0 }}>{String(h).padStart(2, "0")}:00</span>
                                                <div style={{ flex: 1, height: 1, background: "rgba(24,95,165,0.08)" }} />
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Task blocks */}
                                <div style={{ paddingLeft: 44, paddingTop: 8, minHeight: 600, position: "relative" }}>
                                    {tasks
                                        .slice()
                                        .sort((a, b) => a.time.localeCompare(b.time))
                                        .map((task, i) => {
                                            const startMin = timeToMinutes(task.time) - TIMELINE_START;
                                            const durMin = timeToMinutes(task.end) - timeToMinutes(task.time);
                                            const isActive = nowMinutes >= timeToMinutes(task.time) && nowMinutes < timeToMinutes(task.end);
                                            return (
                                                <div key={task.id} className="task-anim" style={{
                                                    marginBottom: 8,
                                                    animationDelay: `${i * 0.05}s`,
                                                }}>
                                                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                                        <div style={{ width: 44, flexShrink: 0, paddingTop: 16, textAlign: "right" }}>
                                                            <span style={{ fontSize: 9, color: "rgba(245,240,232,0.15)", fontFamily: "DM Mono" }}>{task.time}</span>
                                                        </div>
                                                        <div style={{ flex: 1 }}>
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
                            <div style={{ height: "calc(100vh - 120px)" }}>
                                <CalendarView tasks={tasks} />
                            </div>
                        )}

                        {activeView === "vector" && (
                            <div style={{ height: "calc(100vh - 120px)", position: "relative" }}>
                                <VectorView tasks={tasks} />
                            </div>
                        )}
                    </div>

                    {/* ── AGENT CONSOLE ── */}
                    <div style={{ width: 300, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: "rgba(6,13,26,0.85)", flexShrink: 0 }}>

                        {/* Header */}
                        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={{ fontSize: 8, color: C.muted, fontFamily: "DM Mono", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Agent Console</p>
                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: "2px 0 0" }}>AI Brain</h3>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 100 }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.success, animation: "pulse 1.5s infinite" }} />
                                <span style={{ fontSize: 9, color: C.success, fontFamily: "DM Mono" }}>Active</span>
                            </div>
                        </div>

                        {/* AI Log Stream */}
                        <div style={{ padding: "10px 14px 6px" }}>
                            <p style={{ fontSize: 8, color: C.dim, fontFamily: "DM Mono", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 8px" }}>AI Log Stream</p>
                        </div>
                        <div ref={logRef} style={{ flex: "0 0 auto", maxHeight: 180, overflowY: "auto", padding: "0 14px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
                            {aiLogs.map((log, i) => (
                                <div key={i} className="log-entry" style={{ padding: "5px 8px", borderRadius: 6, background: log.highlight ? "rgba(201,168,76,0.06)" : "rgba(12,45,94,0.2)", borderLeft: `2px solid ${log.highlight ? C.gold : C.border}` }}>
                                    <span style={{ fontSize: 9, color: C.dim, fontFamily: "DM Mono" }}>[{log.time}] </span>
                                    <span style={{ fontSize: 10, color: log.highlight ? "rgba(245,240,232,0.75)" : C.muted, fontFamily: "DM Mono", lineHeight: 1.5 }}>{log.msg}</span>
                                </div>
                            ))}
                            {isThinking && (
                                <div style={{ fontSize: 10, color: C.accent, fontFamily: "DM Mono", padding: "4px 8px" }}>
                                    <span style={{ animation: "blink 1s infinite" }}>█</span> processing...
                                </div>
                            )}
                        </div>

                        {/* AI Suggestions */}
                        <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}` }}>
                            <p style={{ fontSize: 8, color: C.dim, fontFamily: "DM Mono", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 8px" }}>AI Suggestions</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {suggestions.map(s => (
                                    <div key={s.id} className="sug-card" style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(12,45,94,0.35)", border: `1px solid ${C.border}`, transition: "border 0.2s", opacity: s.accepted !== null ? 0.5 : 1 }}>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: C.white, margin: "0 0 4px", lineHeight: 1.4 }}>{s.title}</p>
                                        <p style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono", margin: "0 0 8px", lineHeight: 1.4 }}>{s.reason}</p>
                                        {s.accepted === null ? (
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button onClick={() => handleSuggestion(s.id, "accept")} style={{ flex: 1, padding: "5px 0", background: C.success, border: "none", borderRadius: 7, color: C.white, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✓ Accept</button>
                                                <button onClick={() => handleSuggestion(s.id, "modify")} style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, fontSize: 10, cursor: "pointer" }}>Modify</button>
                                                <button onClick={() => handleSuggestion(s.id, "reject")} style={{ padding: "5px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, fontSize: 10, cursor: "pointer" }}>✕</button>
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: 9, color: s.accepted === "accept" ? C.success : C.muted, fontFamily: "DM Mono" }}>
                                                {s.accepted === "accept" ? "✓ Accepted" : "✕ Dismissed"}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Command Input */}
                        <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, marginTop: "auto" }}>
                            <p style={{ fontSize: 8, color: C.dim, fontFamily: "DM Mono", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 8px" }}>Command Input</p>
                            <form onSubmit={handleCommand} style={{ display: "flex", gap: 6 }}>
                                <input
                                    value={command}
                                    onChange={e => setCommand(e.target.value)}
                                    placeholder="E.g., 'move math to evening'"
                                    style={{
                                        flex: 1, padding: "8px 10px",
                                        background: "rgba(10,22,40,0.8)",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 8, color: C.white,
                                        fontSize: 11, outline: "none",
                                        fontFamily: "DM Mono",
                                    }}
                                />
                                <button type="submit" disabled={isThinking} style={{ padding: "8px 10px", background: C.accent, border: "none", borderRadius: 8, color: C.white, cursor: "pointer", display: "flex", alignItems: "center" }}>
                                    {isThinking ? <Loader size={13} style={{ animation: "pulse 1s infinite" }} /> : <Send size={13} />}
                                </button>
                            </form>
                        </div>

                        {/* Gemini badge */}
                        <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center" }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg, #4285F4, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✦</div>
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 600, margin: 0, color: "rgba(245,240,232,0.7)" }}>Gemini 1.5 Flash</p>
                                <p style={{ fontSize: 8, color: C.dim, margin: 0, fontFamily: "DM Mono" }}>Autonomous planner</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}