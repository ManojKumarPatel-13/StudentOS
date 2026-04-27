"use client";
import React, { useState, useEffect, useRef } from "react";
import {
    Play, CheckCircle2, Move, Zap, Clock, Brain,
    Coffee, Send, ChevronRight, Calendar, BarChart2,
    Activity, Target, Plus, X, Loader, Trash2
} from "lucide-react";
import Sidebar from "@/components/shared/sidebar";
import { useAuth } from "@/context/authContext";
import { generatePlan } from "@/lib/gemini";
import {
    subscribeTodaysPlannerTasks,
    addPlannerTask,
    completePlannerTask,
    deletePlannerTask,
    subscribeTodaysPlannerChat,
    saveChatMessage,
    updateChatSuggestion,
    updateTaskMatrix,
    rescheduleDay
} from "@/lib/services/plannerService";
import { getWeakSubjects } from "@/lib/services/mentorService";
import { computeTimeOfDayStats, computeConsistencyScore } from "@/lib/services/analysisService";

// ── THEME ─────────────────────────────────────────────────────────────────────
const C = {
    bg: "#0A1628", primary: "#0C2D5E", accent: "#185FA5",
    gold: "#C9A84C", white: "#FFFFFF",
    border: "rgba(24,95,165,0.18)", borderGold: "rgba(201,168,76,0.22)",
    muted: "rgba(245,240,232,0.38)", dim: "rgba(245,240,232,0.14)",
    success: "#10B981", danger: "#EF4444", purple: "#8B5CF6",
};

// ── FALLBACK TASKS (shown when Firestore has no tasks yet for today) ──────────
const FALLBACK_TASKS = [
    { id: "f1", title: "Deep Focus: Algorithm Design", time: "09:00", end: "11:00", energy: "High", category: "Coding", confidence: 92, type: "deep", completed: false, subtasks: ["Review Big-O notation", "Solve 3 LeetCode problems", "Document solutions"] },
    { id: "f2", title: "Coffee Break", time: "11:00", end: "11:15", energy: "Low", category: "Health", confidence: 100, type: "break", completed: false, subtasks: [] },
    { id: "f3", title: "Study: Data Structures", time: "12:00", end: "13:30", energy: "High", category: "Study", confidence: 78, type: "deep", completed: false, subtasks: ["Trees & Graphs chapter", "Practice problems", "Make summary notes"] },
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
function TaskCard({ task, isActive, onComplete, onExpand, onDelete, expanded, isFirestore, onMatrixToggle }) {
    const ts = TYPE_STYLES[task.type] || TYPE_STYLES.light;
    const isBreak = task.type === "break";

    if (isBreak) {
        return (
            <div
                className="my-1.5 px-[18px] py-2.5 rounded-full flex items-center gap-2.5 cursor-pointer transition-all"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
                onClick={() => onComplete(task.id)}
            >
                <Coffee size={14} color={C.success} />
                <span className="text-[13px] font-semibold" style={{ color: C.success }}>{task.title}</span>
                <span className="text-[11px] font-mono ml-auto" style={{ color: C.muted }}>{task.time || task.scheduledAt} – {task.end || ""}
                </span>
                {isFirestore && (
                    <button onClick={e => { e.stopPropagation(); onDelete(task.id); }}
                        className="ml-2 opacity-30 hover:opacity-80 transition-opacity border-none bg-transparent cursor-pointer">
                        <Trash2 size={11} color={C.danger} />
                    </button>
                )}
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
            <div className="p-4 cursor-pointer" onClick={() => onExpand(task.id)}>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: CATEGORY_COLORS[task.category] || C.muted }} />
                            <span className="text-[9px] font-mono tracking-[0.1em] uppercase"
                                style={{ color: CATEGORY_COLORS[task.category] || C.muted }}>
                                {task.category}
                            </span>

                            {task.type === "ai" && (
                                <span className="text-[9px] font-mono px-1.5 py-px rounded"
                                    style={{ color: C.muted, border: `1px dashed ${C.border}` }}>AI</span>
                            )}

                            // ADD after the category color dot and category text
                            {!isBreak && (
                                <>
                                    <span
                                        onClick={e => { e.stopPropagation(); onMatrixToggle?.(task.id, !task.urgent, task.important); }}
                                        title="Toggle Urgent"
                                        className="text-[8px] font-mono px-1.5 py-px rounded cursor-pointer transition-all"
                                        style={{
                                            background: task.urgent ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                                            border: `1px solid ${task.urgent ? "rgba(239,68,68,0.4)" : C.border}`,
                                            color: task.urgent ? "#EF4444" : C.dim,
                                        }}>U</span>
                                    <span
                                        onClick={e => { e.stopPropagation(); onMatrixToggle?.(task.id, task.urgent, !task.important); }}
                                        title="Toggle Important"
                                        className="text-[8px] font-mono px-1.5 py-px rounded cursor-pointer transition-all"
                                        style={{
                                            background: task.important ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                                            border: `1px solid ${task.important ? "rgba(201,168,76,0.4)" : C.border}`,
                                            color: task.important ? C.gold : C.dim,
                                        }}>I</span>
                                </>
                            )}
                        </div>
                        <h4 className="text-[14px] font-bold m-0 tracking-[-0.01em]"
                            style={{ color: task.completed ? C.muted : C.white, textDecoration: task.completed ? "line-through" : "none" }}>
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
                            <div className="h-full rounded-sm"
                                style={{ width: `${task.confidence}%`, background: confidenceColor(task.confidence) }} />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mt-2">
                    <button
                        onClick={e => { e.stopPropagation(); onComplete(task.id); }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer border-none text-white"
                        style={{ background: C.accent }}>
                        <Play size={10} fill="currentColor" /> Launch
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onComplete(task.id); }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-transparent text-[11px] cursor-pointer"
                        style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                        <CheckCircle2 size={10} /> Complete
                    </button>
                    {isFirestore && (
                        <button
                            onClick={e => { e.stopPropagation(); onDelete(task.id); }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-transparent text-[11px] cursor-pointer ml-auto"
                            style={{ border: `1px solid rgba(239,68,68,0.2)`, color: "rgba(239,68,68,0.5)" }}>
                            <Trash2 size={10} /> Delete
                        </button>
                    )}
                </div>
            </div>

            {expanded && task.subtasks?.length > 0 && (
                <div className="px-4 pb-3.5" style={{ borderTop: `1px solid ${C.border}` }}>
                    <p className="text-[9px] font-mono tracking-[0.15em] uppercase mt-3 mb-2" style={{ color: C.muted }}>
                        Subtasks
                    </p>
                    {task.subtasks.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 py-[5px]"
                            style={{ borderBottom: i < task.subtasks.length - 1 ? `1px solid ${C.dim}` : "none" }}>
                            <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ border: `1.5px solid ${C.border}` }} />
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
        1: tasks.slice(0, 3), 2: tasks.slice(1, 4), 3: [tasks[0], tasks[3]].filter(Boolean),
        4: tasks.slice(2, 5), 5: [tasks[4], tasks[6]].filter(Boolean), 6: [], 0: [tasks[1]].filter(Boolean),
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
                            <p className="text-[9px] font-mono uppercase tracking-[0.1em] m-0"
                                style={{ color: isToday ? C.gold : C.muted }}>{day}</p>
                            {isToday && <div className="w-1 h-1 rounded-full mx-auto mt-[3px]" style={{ background: C.gold }} />}
                        </div>
                        {dayTasks.map((t, ti) => (
                            <div key={ti} className="px-1.5 py-[5px] rounded-[7px] cursor-pointer"
                                style={{ background: `${CATEGORY_COLORS[t.category]}18`, border: `1px solid ${CATEGORY_COLORS[t.category]}35` }}>
                                <p className="text-[9px] font-semibold m-0 overflow-hidden text-ellipsis whitespace-nowrap"
                                    style={{ color: CATEGORY_COLORS[t.category] }}>{t.title}</p>
                                <p className="text-[8px] font-mono mt-0.5 mb-0" style={{ color: C.dim }}>{t.time}</p>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

// ── VECTOR VIEW ───────────────────────────────────────────────────────────────
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
                            <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none"
                                stroke={CATEGORY_COLORS[n.category]} strokeWidth="1" strokeOpacity={0.4} />
                        )}
                        <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="monospace">
                            {n.time}
                        </text>
                    </g>
                ))}
            </svg>
            {hovered && (
                <div className="absolute pointer-events-none z-10 rounded-[10px] p-[10px_14px] min-w-[160px]"
                    style={{ left: hovered.x + 15, top: hovered.y - 20, background: C.primary, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                    <p className="text-[12px] font-bold mb-1 m-0" style={{ color: C.white }}>{hovered.title}</p>
                    <p className="text-[10px] font-mono m-0" style={{ color: C.muted }}>{hovered.time} · {hovered.energy} energy</p>
                    <div className="flex gap-1.5 mt-1.5">
                        <span className="text-[9px] font-mono px-[7px] py-0.5 rounded"
                            style={{ background: `${CATEGORY_COLORS[hovered.category]}20`, color: CATEGORY_COLORS[hovered.category] }}>
                            {hovered.category}
                        </span>
                        <span className="text-[9px] font-mono px-[7px] py-0.5 rounded"
                            style={{ background: "rgba(255,255,255,0.05)", color: confidenceColor(hovered.confidence) }}>
                            {hovered.confidence}%
                        </span>
                    </div>
                </div>
            )}
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

function MatrixView({ tasks, onMatrixToggle, onComplete, onDelete, uid }) {
    const draggingId = React.useRef(null);

    const quadrants = [
        { label: "Do First", sub: "Urgent + Important", urgent: true, important: true, color: "#EF4444", bg: "rgba(239,68,68,0.05)" },
        { label: "Schedule", sub: "Important, Not Urgent", urgent: false, important: true, color: "#C9A84C", bg: "rgba(201,168,76,0.05)" },
        { label: "Delegate", sub: "Urgent, Not Important", urgent: true, important: false, color: "#185FA5", bg: "rgba(24,95,165,0.05)" },
        { label: "Eliminate", sub: "Neither", urgent: false, important: false, color: "#6B7280", bg: "rgba(107,114,128,0.05)" },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 h-full p-1">
            {quadrants.map(q => {
                const qtasks = tasks.filter(t =>
                    (t.urgent ?? false) === q.urgent &&
                    (t.important ?? true) === q.important
                );
                return (
                    <div key={q.label}
                        className="rounded-2xl p-4 flex flex-col gap-2 min-h-[250px]"
                        style={{ background: q.bg, border: `1px solid ${q.color}25` }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                            if (draggingId.current)
                                onMatrixToggle(draggingId.current, q.urgent, q.important);
                            draggingId.current = null;
                        }}>

                        <div className="mb-1">
                            <p className="text-[11px] font-bold m-0" style={{ color: q.color }}>{q.label}</p>
                            <p className="text-[9px] font-mono m-0 mt-0.5" style={{ color: "rgba(245,240,232,0.3)" }}>{q.sub}</p>
                        </div>

                        {qtasks.length === 0 && (
                            <p className="text-[10px] font-mono text-center mt-4"
                                style={{ color: "rgba(245,240,232,0.15)" }}>
                                Drop tasks here
                            </p>
                        )}

                        {qtasks.map(task => (
                            <div key={task.id}
                                draggable
                                onDragStart={() => { draggingId.current = task.id; }}
                                className="px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing transition-all"
                                style={{
                                    background: "rgba(12,45,94,0.6)",
                                    border: `1px solid ${q.color}30`,
                                    opacity: task.completed ? 0.4 : 1,
                                }}>
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-[12px] font-semibold m-0 leading-snug flex-1"
                                        style={{
                                            color: task.completed ? "rgba(245,240,232,0.3)" : "white",
                                            textDecoration: task.completed ? "line-through" : "none"
                                        }}>
                                        {task.title}
                                    </p>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button onClick={() => onComplete(task.id)}
                                            className="p-1 rounded-lg border-none cursor-pointer transition-all"
                                            style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                                            <CheckCircle2 size={10} />
                                        </button>
                                        <button onClick={() => onDelete(task.id)}
                                            className="p-1 rounded-lg border-none cursor-pointer transition-all"
                                            style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[9px] font-mono mt-1 m-0"
                                    style={{ color: "rgba(245,240,232,0.3)" }}>
                                    {task.time} · {task.category}
                                </p>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PlannerPage() {
    const { user } = useAuth();
    const uid = user?.uid;

    // ── State ──
    const [tasks, setTasks] = useState([]);
    const [tasksLoaded, setTasksLoaded] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatLoaded, setChatLoaded] = useState(false);
    const [activeView, setActiveView] = useState("timeline");
    const [expandedId, setExpandedId] = useState(null);
    const [command, setCommand] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [nowMinutes, setNowMinutes] = useState(getNowMinutes());
    const [addingTask, setAddingTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: "", time: "", end: "", energy: "Medium", category: "Study", type: "light", subtasks: "", urgent: false, important: true });
    const chatRef = useRef(null);
    const [dayStatus, setDayStatus] = useState("Normal");
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState(null);
    const [rescheduling, setRescheduling] = useState(false);
    const [generatingDay, setGeneratingDay] = useState(false);

    // ── Real-time task listener ──
    useEffect(() => {
        if (!uid) return;
        const unsub = subscribeTodaysPlannerTasks(uid, (data) => {
            setTasks(data);
            setTasksLoaded(true);
        });
        return unsub;
    }, [uid]);

    // ── Real-time chat listener ──
    useEffect(() => {
        if (!uid) return;
        const unsub = subscribeTodaysPlannerChat(uid, (data) => {
            setChatMessages(data);
            setChatLoaded(true);
        });
        return unsub;
    }, [uid]);

    // ── Seed welcome message once if chat is empty ──
    useEffect(() => {
        if (!uid || !chatLoaded) return;
        if (chatMessages.length === 0) {
            saveChatMessage(uid, {
                role: "ai",
                text: "Astra online. Your planner is ready. Add tasks or ask me to build your schedule.",
                suggestion: null,
            });
        }
    }, [uid, chatLoaded]);

    // ── Clock tick ──
    useEffect(() => {
        const t = setInterval(() => setNowMinutes(getNowMinutes()), 60000);
        return () => clearInterval(t);
    }, []);

    // ── Auto-scroll chat ──
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [chatMessages]);

    // ── Displayed tasks: Firestore data or fallback ──
    const displayTasks = tasksLoaded && tasks.length > 0 ? tasks : FALLBACK_TASKS;
    const isUsingFallback = tasksLoaded && tasks.length === 0;

    // ── Handlers ──
    const handleComplete = async (id) => {
        const isFallback = FALLBACK_TASKS.find(t => t.id === id);
        if (isFallback || !uid) return; // fallback tasks are read-only
        await completePlannerTask(uid, id);
    };

    const handleDelete = async (id) => {
        if (!uid) return;
        await deletePlannerTask(uid, id);
    };

    const handleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const handleAddTask = async () => {
        if (!newTask.title || !newTask.time) return;

        // Auto-calculate end time if not provided (default +1 hour)
        let end = newTask.end;
        if (!end) {
            const endHour = parseInt(newTask.time.split(":")[0]) + 1;
            end = `${String(endHour).padStart(2, "0")}:${newTask.time.split(":")[1]}`;
        }

        // Parse subtasks from comma-separated string
        const subtasksArr = newTask.subtasks
            ? newTask.subtasks.split(",").map(s => s.trim()).filter(Boolean)
            : [];

        if (uid) {
            await addPlannerTask(uid, {
                ...newTask,
                end,
                subtasks: subtasksArr,
                confidence: 85,
            });
        }

        setAddingTask(false);
        setNewTask({ title: "", time: "", end: "", energy: "Medium", category: "Study", type: "light", subtasks: "" });
    };

    const handleGenerateDay = async () => {
        if (!uid || generatingDay) return;
        setGeneratingDay(true);

        try {
            // Collect cross-feature context
            const [weakSubjects, timeStats, consistency] = await Promise.all([
                getWeakSubjects(uid),
                computeTimeOfDayStats(uid),
                computeConsistencyScore(uid),
            ]);

            const existingTitles = tasks.map(t => t.title).join(", ") || "none";
            const bestWindow = timeStats?.bestWindow || "Morning";
            const weakStr = weakSubjects.length ? weakSubjects.join(", ") : "none detected";

            const prompt = `You are Astra, a student planner AI. Generate a full study day schedule.

Student context:
- Weak subjects needing attention: ${weakStr}
- Best productivity window: ${bestWindow}
- Consistency score: ${consistency}/100
- Tasks already planned today: ${existingTitles}

Rules:
1. Schedule weak subjects during the best productivity window.
2. Include at least one break.
3. Keep sessions 45–90 minutes max.
4. Return ONLY a JSON array of tasks, no extra text:
[{"title":"...","time":"HH:MM","end":"HH:MM","energy":"Low|Medium|High","category":"Study|Coding|Health|Admin|Other","type":"deep|light|break"}]`;

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [{ role: "user", text: prompt }] }),
            });

            const data = await res.json();
            const raw = data.reply?.replace(/```json|```/g, "").trim() || "[]";

            let generated = [];
            try {
                const parsed = JSON.parse(raw.startsWith("[") ? raw : "[]");
                generated = Array.isArray(parsed) ? parsed : [];
            } catch { generated = []; }

            if (!generated.length) {
                await saveChatMessage(uid, {
                    role: "ai",
                    text: "I couldn't generate a plan right now. Try adding a few tasks manually first.",
                    suggestion: null,
                });
                setGeneratingDay(false);
                return;
            }

            // Save each task to Firestore
            for (const task of generated) {
                await addPlannerTask(uid, {
                    ...task,
                    confidence: 88,
                    subtasks: [],
                    type: task.type || "light",
                });
            }

            await saveChatMessage(uid, {
                role: "ai",
                text: `Generated ${generated.length} tasks for your day. ${weakSubjects.length ? `I prioritised your weak areas: ${weakSubjects.slice(0, 2).join(" and ")}.` : ""} Scheduled around your best window: ${bestWindow}. 🗓️`,
                suggestion: null,
            });

        } catch (e) {
            console.error("handleGenerateDay error:", e);
        }

        setGeneratingDay(false);
    };

    const handleMatrixToggle = async (taskId, urgent, important) => {
        if (!uid) return;
        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, urgent, important } : t
        ));
        await updateTaskMatrix(uid, taskId, urgent, important);
    };

    const handleCommand = async (e) => {
        e.preventDefault();
        if (!command.trim() || !uid) return;

        const cmd = command;
        setCommand("");

        await saveChatMessage(uid, { role: "user", text: cmd, suggestion: null });

        setIsThinking(true);
        try {

            // AFTER — update the prompt to include student context
            const weakSubjects = uid ? await getWeakSubjects(uid).catch(() => []) : [];
            const timeStats = uid ? await computeTimeOfDayStats(uid).catch(() => null) : null;

            const prompt = `You are Astra, a student planner AI.
Student weak subjects: ${weakSubjects.join(", ") || "none"}.
Best study window: ${timeStats?.bestWindow || "not yet determined"}.

The user says: "${cmd}"

If the user is asking to add, schedule, or create a task — respond ONLY with this JSON (no extra text):
{"action":"add_task","task":{"title":"...","time":"HH:MM","end":"HH:MM","energy":"Low|Medium|High","category":"Study|Coding|Health|Admin|Other","type":"deep|light|break"},"reply":"one sentence confirming what you added"}

If asking anything else — reply in 1-2 helpful sentences as plain text. Personalise the response using their weak subjects or study window where relevant.`;

            const res = await generatePlan(prompt);
            const raw = res?.trim() || "";

            // Try to parse as JSON first
            let parsed = null;
            try {
                // Gemini sometimes wraps in ```json ... ```
                const cleaned = raw.replace(/```json|```/g, "").trim();
                if (cleaned.startsWith("{")) parsed = JSON.parse(cleaned);
            } catch {
                parsed = null;
            }

            if (parsed?.action === "add_task" && parsed.task?.title) {
                // Actually create the task in Firestore
                await addPlannerTask(uid, {
                    title: parsed.task.title,
                    time: parsed.task.time || "09:00",
                    end: parsed.task.end || "10:00",
                    energy: parsed.task.energy || "Medium",
                    category: parsed.task.category || "Study",
                    type: parsed.task.type || "light",
                    confidence: 85,
                    subtasks: [],
                });

                const confirmText = parsed.reply || `Added "${parsed.task.title}" at ${parsed.task.time}.`;
                await saveChatMessage(uid, { role: "ai", text: `✓ ${confirmText}`, suggestion: null });
            } else {
                // Plain text reply
                const aiText = raw.substring(0, 300) || "Schedule noted. I'll optimize accordingly.";
                await saveChatMessage(uid, { role: "ai", text: aiText, suggestion: null });
            }

        } catch {
            await saveChatMessage(uid, { role: "ai", text: "Understood. Schedule updated.", suggestion: null });
        }
        setIsThinking(false);
    };
    const handleSuggestionResponse = async (chatId, accepted) => {
        if (!uid) return;
        await updateChatSuggestion(uid, chatId, accepted);
    };

    // ── Stats ──
    const totalPlanned = displayTasks.reduce((s, t) => {
        const start = timeToMinutes(t.time);
        const end = timeToMinutes(t.end);
        return s + Math.max(0, end - start);
    }, 0);
    const completedCount = displayTasks.filter(t => t.completed).length;
    const availableMinutes = 18 * 60;
    const remainingMinutes = availableMinutes - totalPlanned;

    // ── Timeline config ──
    const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
    const TIMELINE_START = 8 * 60;
    const TIMELINE_END = 21 * 60;
    const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START;
    const nowPct = Math.max(0, Math.min(100, ((nowMinutes - TIMELINE_START) / TIMELINE_RANGE) * 100));

    return (
        <div className="flex min-h-screen overflow-hidden text-white"
            style={{ background: C.bg, fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
                @keyframes scanDown { 0%{opacity:0.7} 50%{opacity:1} 100%{opacity:0.7} }
                @keyframes slideIn { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
                @keyframes fadeUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
                .task-anim { animation: fadeUp 0.3s ease forwards; }
                .view-btn:hover { background: rgba(24,95,165,0.1) !important; }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(24,95,165,0.25); border-radius: 2px; }
                input::placeholder { color: rgba(245,240,232,0.2); }
                select option { background: #0C2D5E; }
            `}</style>

            <Sidebar activePage="planner" />

            <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-64">

                {/* ── TOP BAR ── */}
                <header className="flex items-center gap-4 px-5 py-3 shrink-0 backdrop-blur-[12px]"
                    style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(10,22,40,0.8f)" }}>

                    <div className="flex items-center gap-2.5">
                        <h2 className="text-[15px] font-bold m-0 tracking-[-0.01em]">Today's Timeline</h2>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${C.borderGold}` }}>
                            <Clock size={11} color={C.gold} />
                            <span className="text-[11px] font-mono" style={{ color: C.gold }}>{getCurrentTimeStr()}</span>
                        </div>
                        {isUsingFallback && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(201,168,76,0.08)", border: `1px solid ${C.borderGold}`, color: C.gold }}>
                                Sample Data — Add your tasks
                            </span>
                        )}
                    </div>

                    {/* Time Budget */}
                    <div className="flex items-center gap-4 ml-2">
                        {[
                            { label: "Planned", val: `${Math.floor(totalPlanned / 60)}h ${totalPlanned % 60}m`, color: C.gold },
                            { label: "Completed", val: `${completedCount}/${displayTasks.length}`, color: C.success },
                            { label: "Free", val: `${Math.floor(Math.abs(remainingMinutes) / 60)}h ${Math.abs(remainingMinutes) % 60}m`, color: C.muted },
                        ].map(r => (
                            <div key={r.label} className="flex items-center gap-1">
                                <span className="text-[10px] font-mono" style={{ color: C.dim }}>{r.label}:</span>
                                <span className="text-[11px] font-mono font-semibold" style={{ color: r.color }}>{r.val}</span>
                            </div>
                        ))}
                    </div>

                    {/* View switcher */}
                    <div className="flex gap-1 p-1 rounded-[10px] ml-auto"
                        style={{ background: "rgba(12,45,94,0.5)", border: `1px solid ${C.border}` }}>
                        {[
                            { key: "timeline", icon: <Activity size={13} />, label: "Timeline" },
                            { key: "matrix", icon: <Target size={13} />, label: "Matrix" },
                            { key: "calendar", icon: <Calendar size={13} />, label: "Calendar" },
                            { key: "vector", icon: <BarChart2 size={13} />, label: "Vector" },
                        ].map(v => (
                            <button key={v.key}
                                className="view-btn flex items-center gap-1.5 px-3 py-[5px] rounded-[7px] border-none cursor-pointer text-[11px] font-semibold transition-all duration-200 font-mono"
                                onClick={() => setActiveView(v.key)}
                                style={{
                                    background: activeView === v.key ? C.accent : "transparent",
                                    color: activeView === v.key ? C.white : C.muted,
                                }}>
                                {v.icon} {v.label}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => setAddingTask(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[11px] font-bold cursor-pointer"
                        style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${C.borderGold}`, color: C.gold }}>
                        <Plus size={13} /> Add Task
                    </button>

                    <button
                        onClick={handleGenerateDay}
                        disabled={generatingDay}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[11px] font-bold cursor-pointer transition-all"
                        style={{
                            background: generatingDay ? "rgba(139,92,246,0.05)" : "rgba(139,92,246,0.12)",
                            border: "1px solid rgba(139,92,246,0.3)",
                            color: generatingDay ? "rgba(139,92,246,0.4)" : "#8B5CF6",
                        }}>
                        <Brain size={13} />
                        {generatingDay ? "Building..." : "Generate My Day"}
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowRescheduleModal(true)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[11px] font-bold cursor-pointer transition-all"
                            style={{
                                background: dayStatus !== "Normal" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${dayStatus !== "Normal" ? "rgba(239,68,68,0.3)" : C.border}`,
                                color: dayStatus !== "Normal" ? "#EF4444" : C.muted,
                            }}>
                            <Activity size={13} />
                            Day: {dayStatus}
                        </button>
                    </div>
                </header>

                {/* ── ADD TASK MODAL ── */}
                {addingTask && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.6)" }}>
                        <div className="rounded-2xl p-6 w-[400px]"
                            style={{ background: C.primary, border: `1px solid ${C.border}` }}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="m-0 text-[15px] font-bold">New Task</h3>
                                <button onClick={() => setAddingTask(false)}
                                    className="bg-transparent border-none cursor-pointer" style={{ color: C.muted }}>
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Title */}
                            {[
                                { label: "Title", field: "title", type: "text", placeholder: "Task name..." },
                                { label: "Start Time", field: "time", type: "time", placeholder: "09:00" },
                                { label: "End Time", field: "end", type: "time", placeholder: "10:00" },
                                { label: "Subtasks (comma separated)", field: "subtasks", type: "text", placeholder: "Read chapter, Solve problems..." },
                            ].map(f => (
                                <div key={f.field} className="mb-3">
                                    <label className="text-[10px] font-mono uppercase tracking-[0.1em] block mb-1" style={{ color: C.muted }}>
                                        {f.label}
                                    </label>
                                    <input type={f.type} value={newTask[f.field]}
                                        onChange={e => setNewTask(p => ({ ...p, [f.field]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className="w-full px-3 py-2 rounded-lg text-[13px] outline-none font-mono box-border"
                                        style={{ background: "rgba(10,22,40,0.8)", border: `1px solid ${C.border}`, color: C.white }} />
                                </div>
                            ))}

                            <div className="grid grid-cols-3 gap-2.5 mb-4">
                                {[
                                    { label: "Energy", field: "energy", opts: ["Low", "Medium", "High"] },
                                    { label: "Category", field: "category", opts: Object.keys(CATEGORY_COLORS) },
                                    { label: "Type", field: "type", opts: Object.keys(TYPE_STYLES) },
                                ].map(f => (
                                    <div key={f.field}>
                                        <label className="text-[10px] font-mono uppercase tracking-[0.1em] block mb-1" style={{ color: C.muted }}>
                                            {f.label}
                                        </label>
                                        <select value={newTask[f.field]}
                                            onChange={e => setNewTask(p => ({ ...p, [f.field]: e.target.value }))}
                                            className="w-full px-2.5 py-2 rounded-lg text-[12px] outline-none font-mono"
                                            style={{ background: "rgba(10,22,40,0.8)", border: `1px solid ${C.border}`, color: C.white }}>
                                            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            // ADD this after the 3 existing select columns
                            <div className="col-span-3 grid grid-cols-2 gap-2 mt-1">
                                {[
                                    { label: "Urgent", field: "urgent", color: "#EF4444" },
                                    { label: "Important", field: "important", color: C.gold },
                                ].map(f => (
                                    <div key={f.field}
                                        onClick={() => setNewTask(p => ({ ...p, [f.field]: !p[f.field] }))}
                                        className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all"
                                        style={{
                                            background: newTask[f.field] ? `${f.color}12` : "rgba(255,255,255,0.03)",
                                            border: `1px solid ${newTask[f.field] ? `${f.color}40` : C.border}`,
                                        }}>
                                        <span className="text-[11px] font-mono" style={{ color: newTask[f.field] ? f.color : C.muted }}>
                                            {f.label}
                                        </span>
                                        <div className="w-8 h-4 rounded-full p-0.5 transition-all"
                                            style={{ background: newTask[f.field] ? f.color : "rgba(255,255,255,0.1)" }}>
                                            <div className="w-3 h-3 bg-white rounded-full transition-all"
                                                style={{ transform: newTask[f.field] ? "translateX(16px)" : "translateX(0)" }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleAddTask}
                                className="w-full py-2.5 rounded-[10px] border-none text-white text-[13px] font-bold cursor-pointer"
                                style={{ background: C.accent }}>
                                Add to Timeline
                            </button>
                        </div>
                    </div>
                )}

                {/* ── MAIN CONTENT ── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Timeline / Calendar / Vector */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 min-w-0">

                        {activeView === "timeline" && (
                            <div className="relative">
                                {/* NOW scanner beam */}
                                <div className="absolute left-0 right-0 z-[5]"
                                    style={{ top: `${nowPct}%`, height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, animation: "scanDown 3s ease-in-out infinite" }}>
                                    <div className="absolute left-0 text-[9px] font-mono px-1.5 py-px rounded"
                                        style={{ top: -8, color: C.gold, background: C.bg }}>NOW</div>
                                </div>

                                {/* Hour ticks */}
                                {HOURS.map(h => {
                                    const pct = ((h * 60 - TIMELINE_START) / TIMELINE_RANGE) * 100;
                                    return (
                                        <div key={h} className="absolute left-0 w-full pointer-events-none z-0" style={{ top: `${pct}%` }}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-mono w-8 shrink-0" style={{ color: C.dim }}>
                                                    {String(h).padStart(2, "0")}:00
                                                </span>
                                                <div className="flex-1 h-px" style={{ background: "rgba(24,95,165,0.08)" }} />
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Task blocks */}
                                <div className="pl-11 pt-2 min-h-[600px] relative">
                                    {displayTasks
                                        .slice()
                                        .sort((a, b) => (a.time || a.scheduledAt || "").localeCompare(b.time || b.scheduledAt || ""))
                                        .map((task, i) => {
                                            const isActive = nowMinutes >= timeToMinutes(task.time) && nowMinutes < timeToMinutes(task.end);
                                            const isFallback = FALLBACK_TASKS.find(f => f.id === task.id);
                                            return (
                                                <div key={task.id} className="task-anim mb-2" style={{ animationDelay: `${i * 0.05}s` }}>
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
                                                                onDelete={handleDelete}
                                                                expanded={expandedId === task.id}
                                                                isFirestore={!isFallback && !!uid}
                                                                onMatrixToggle={handleMatrixToggle}
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
                                <CalendarView tasks={displayTasks} />
                            </div>
                        )}

                        {activeView === "vector" && (
                            <div className="h-[calc(100vh-120px)] relative">
                                <VectorView tasks={displayTasks} />
                            </div>
                        )}

                        {activeView === "matrix" && (
                            <div className="h-[calc(100vh-120px)]">
                                <MatrixView
                                    tasks={displayTasks}
                                    onMatrixToggle={handleMatrixToggle}
                                    onComplete={handleComplete}
                                    onDelete={handleDelete}
                                    uid={uid}
                                />
                            </div>
                        )}

                    </div>

                    {/* ── AGENT CONSOLE ── */}
                    <div className="w-[300px] flex flex-col shrink-0"
                        style={{ borderLeft: `1px solid ${C.border}`, background: "rgba(6,13,26,0.85)" }}>

                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3.5"
                            style={{ borderBottom: `1px solid ${C.border}` }}>
                            <div>
                                <p className="text-[8px] font-mono uppercase tracking-[0.15em] m-0" style={{ color: C.muted }}>Agent Console</p>
                                <h3 className="text-[13px] font-bold mt-0.5 mb-0">AI Brain</h3>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-[3px] rounded-full"
                                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                <div className="w-[5px] h-[5px] rounded-full"
                                    style={{ background: C.success, animation: "pulse 1.5s infinite" }} />
                                <span className="text-[9px] font-mono" style={{ color: C.success }}>Active</span>
                            </div>
                        </div>

                        {/* Chat messages */}
                        <div ref={chatRef} className="flex-1 overflow-y-auto px-3.5 pb-2.5 flex flex-col gap-2 pt-2">
                            {chatMessages.map((msg, i) => (
                                <div key={msg.id || i}>
                                    {msg.role === "user" ? (
                                        <div className="flex justify-end">
                                            <div className="px-3 py-2 max-w-[85%]"
                                                style={{ background: "rgba(24,95,165,0.2)", border: `1px solid ${C.border}`, borderRadius: "12px 12px 4px 12px" }}>
                                                <p className="text-[11px] font-mono m-0" style={{ color: C.white }}>{msg.text}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5">
                                            <div className="px-3 py-2"
                                                style={{ background: "rgba(12,45,94,0.4)", border: `1px solid ${C.border}`, borderRadius: "12px 12px 12px 4px" }}>
                                                <p className="text-[11px] font-mono m-0 leading-[1.5]"
                                                    style={{ color: "rgba(245,240,232,0.75)" }}>{msg.text}</p>
                                            </div>
                                            {msg.suggestion && (
                                                <div className="px-3 py-2.5 rounded-[10px]"
                                                    style={{ background: "rgba(12,45,94,0.35)", border: `1px solid ${C.border}` }}>
                                                    <p className="text-[11px] font-semibold mb-1.5 m-0" style={{ color: C.white }}>
                                                        {msg.suggestion.title}
                                                    </p>
                                                    {msg.suggestion.accepted === null && (
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => handleSuggestionResponse(msg.id, true)}
                                                                className="flex-1 py-[5px] rounded-[7px] border-none text-white text-[10px] font-bold cursor-pointer"
                                                                style={{ background: C.success }}>✓ Accept</button>
                                                            <button onClick={() => handleSuggestionResponse(msg.id, false)}
                                                                className="px-2.5 py-[5px] rounded-[7px] bg-transparent text-[10px] cursor-pointer"
                                                                style={{ border: `1px solid ${C.border}`, color: C.muted }}>✕</button>
                                                        </div>
                                                    )}
                                                    {msg.suggestion.accepted !== null && (
                                                        <p className="text-[9px] font-mono m-0"
                                                            style={{ color: msg.suggestion.accepted ? C.success : C.muted }}>
                                                            {msg.suggestion.accepted ? "✓ Accepted" : "✕ Dismissed"}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex items-center gap-2 px-3 py-2"
                                    style={{ background: "rgba(12,45,94,0.3)", border: `1px solid ${C.border}`, borderRadius: "12px 12px 12px 4px" }}>
                                    <Loader size={11} style={{ animation: "pulse 1s infinite", color: C.gold }} />
                                    <span className="text-[10px] font-mono" style={{ color: C.muted }}>Thinking...</span>
                                </div>
                            )}
                        </div>

                        {/* Command Input */}
                        <div className="px-3.5 py-2.5 mt-auto" style={{ borderTop: `1px solid ${C.border}` }}>
                            <p className="text-[8px] font-mono uppercase tracking-[0.15em] mb-2 m-0" style={{ color: C.dim }}>
                                Command Input
                            </p>
                            <form onSubmit={handleCommand} className="flex gap-1.5">
                                <input value={command} onChange={e => setCommand(e.target.value)}
                                    placeholder="E.g., 'move math to evening'"
                                    className="flex-1 px-2.5 py-2 rounded-lg text-[11px] outline-none font-mono text-white"
                                    style={{ background: "rgba(10,22,40,0.8)", border: `1px solid ${C.border}` }} />
                                <button type="submit" disabled={isThinking}
                                    className="flex items-center px-2.5 py-2 rounded-lg border-none text-white cursor-pointer"
                                    style={{ background: C.accent }}>
                                    {isThinking ? <Loader size={13} style={{ animation: "pulse 1s infinite" }} /> : <Send size={13} />}
                                </button>
                            </form>
                        </div>

                        {/* Gemini badge */}
                        <div className="flex gap-2 items-center px-3.5 py-2.5" style={{ borderTop: `1px solid ${C.border}` }}>
                            <div className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-[11px] shrink-0"
                                style={{ background: `linear-gradient(135deg, #4285F4, ${C.accent})` }}>✦</div>
                            <div>
                                <p className="text-[9px] font-semibold m-0" style={{ color: "rgba(245,240,232,0.7)" }}>Gemini Flash</p>
                                <p className="text-[8px] font-mono m-0" style={{ color: C.dim }}>Autonomous planner</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showRescheduleModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="rounded-2xl p-6 w-[360px]"
                        style={{ background: "#0C2D5E", border: "1px solid rgba(239,68,68,0.2)" }}>

                        <h3 className="text-[15px] font-bold m-0 mb-1 text-white">Mark Day As</h3>
                        <p className="text-[11px] font-mono mb-4 m-0" style={{ color: C.muted }}>
                            Incomplete tasks will be redistributed across the next 4 days.
                        </p>

                        <div className="grid grid-cols-3 gap-2 mb-5">
                            {["Sick", "Burned Out", "Holiday"].map(status => (
                                <button key={status}
                                    onClick={() => setPendingStatus(status)}
                                    className="py-2.5 rounded-xl text-[11px] font-bold border-none cursor-pointer transition-all"
                                    style={{
                                        background: pendingStatus === status ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                                        border: `1px solid ${pendingStatus === status ? "rgba(239,68,68,0.4)" : C.border}`,
                                        color: pendingStatus === status ? "#EF4444" : C.muted,
                                    }}>
                                    {status}
                                </button>
                            ))}
                        </div>

                        {pendingStatus && (
                            <div className="px-3 py-2.5 rounded-xl mb-4"
                                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                                <p className="text-[11px] font-mono m-0" style={{ color: "rgba(239,68,68,0.8)" }}>
                                    This will move {tasks.filter(t => !t.completed).length} incomplete task(s) across the next 4 days.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button onClick={() => { setShowRescheduleModal(false); setPendingStatus(null); }}
                                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold cursor-pointer border-none"
                                style={{ background: "rgba(255,255,255,0.05)", color: C.muted }}>
                                Cancel
                            </button>
                            <button
                                disabled={!pendingStatus || rescheduling}
                                onClick={async () => {
                                    if (!pendingStatus || !uid) return;
                                    setRescheduling(true);
                                    await rescheduleDay(uid, pendingStatus);
                                    setDayStatus(pendingStatus);
                                    setRescheduling(false);
                                    setShowRescheduleModal(false);
                                    setPendingStatus(null);
                                }}
                                className="flex-[2] py-2.5 rounded-xl text-[12px] font-bold cursor-pointer border-none transition-all"
                                style={{
                                    background: pendingStatus ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.05)",
                                    color: pendingStatus ? "white" : C.dim,
                                }}>
                                {rescheduling ? "Redistributing..." : "Confirm & Reschedule"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}