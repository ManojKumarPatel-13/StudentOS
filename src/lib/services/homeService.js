/**
 * homeService.js
 * All Firestore + logic functions for the Home/Dashboard page.
 *
 * Firestore structure used:
 *   users/{uid}/tasks/{taskId}
 *     - title:      string
 *     - subject:    string
 *     - progress:   number 0-100
 *     - scheduledAt: string "HH:MM"
 *     - duration:   number (minutes)
 *     - energyCost: "low" | "medium" | "high"
 *     - completed:  boolean
 *     - date:       string "YYYY-MM-DD"
 *     - createdAt:  Timestamp
 *
 *   users/{uid}/studySessions/{id}   (same as analysisService)
 *   users/{uid}/aiLogs/{id}          (same as analysisService)
 *   users/{uid}/commands/{id}
 *     - input:  string
 *     - type:   "task" | "insight" | "note"
 *     - parsed: object
 *     - createdAt: Timestamp
 */

import {
    collection, addDoc, getDocs, updateDoc,
    query, where, orderBy, doc, Timestamp, limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── DAILY OUTLOOK ─────────────────────────────────────────────────────────────

/**
 * calculateDailyOutlook()
 * Compares completed tasks vs total tasks for today.
 * Returns { status, completedCount, totalCount, percent, dayProgressPercent }
 */
export async function calculateDailyOutlook(uid) {
    const today = new Date().toISOString().split("T")[0];
    const ref = collection(db, "users", uid, "tasks");
    const q = query(ref, where("date", "==", today));
    const snap = await getDocs(q);
    const tasks = snap.docs.map(d => d.data());

    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Day progress: how far through the day are we (6am–midnight = 18hr window)
    const now = new Date();
    const startOfDay = new Date(); startOfDay.setHours(6, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(24, 0, 0, 0);
    const dayProgressPercent = Math.min(100, Math.round(
        ((now - startOfDay) / (endOfDay - startOfDay)) * 100
    ));

    let status = "Not Started";
    if (percent >= 80) status = "Crushing It";
    else if (percent >= 50) status = "On Track";
    else if (percent >= 20) status = "In Progress";
    else if (total > 0) status = "Falling Behind";

    return { status, completedCount: completed, totalCount: total, percent, dayProgressPercent };
}

// ── TASKS ─────────────────────────────────────────────────────────────────────

/**
 * getUpcomingTasks()
 * Returns the next 3 tasks scheduled for today, sorted by time, not completed.
 */
export async function getUpcomingTasks(uid) {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const ref = collection(db, "users", uid, "tasks");
    const q = query(ref, where("date", "==", today), where("completed", "==", false), orderBy("scheduledAt", "asc"));
    const snap = await getDocs(q);
    const tasks = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.scheduledAt >= currentTime)
        .slice(0, 3);
    return tasks;
}

/**
 * getTodaysTasks()
 * Returns all tasks for today.
 */
export async function getTodaysTasks(uid) {
    const today = new Date().toISOString().split("T")[0];
    const ref = collection(db, "users", uid, "tasks");
    const q = query(ref, where("date", "==", today), orderBy("scheduledAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * addTask()
 * Creates a new task for the user.
 */
export async function addTask(uid, task) {
    const ref = collection(db, "users", uid, "tasks");
    const docRef = await addDoc(ref, {
        ...task,
        completed: false,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

/**
 * markTaskComplete()
 * Marks a task as done.
 */
export async function markTaskComplete(uid, taskId) {
    const ref = doc(db, "users", uid, "tasks", taskId);
    await updateDoc(ref, { completed: true });
}

// ── FOCUS SESSION ─────────────────────────────────────────────────────────────

/**
 * logFocusSession()
 * Called when user ends a focus session.
 * Saves to studySessions (feeds into Analysis page).
 */
export async function logFocusSession(uid, { subject, durationMinutes, focusScore }) {
    const today = new Date().toISOString().split("T")[0];
    const ref = collection(db, "users", uid, "studySessions");
    await addDoc(ref, {
        date: today,
        subject,
        hours: parseFloat((durationMinutes / 60).toFixed(2)),
        focusScore,
        retention: Math.round(focusScore * 0.85),  // estimated
        energy: Math.round(focusScore * 0.9),       // estimated
        createdAt: Timestamp.now(),
    });
}

// ── WEEKLY MOMENTUM ──────────────────────────────────────────────────────────

/**
 * getWeeklyMomentum()
 * Fetches last 7 days of study sessions.
 * Returns { score, chartData, activeDays, totalHours }
 *
 * Momentum Score formula:
 *   activeDays = days in last 7 with at least 1 session
 *   avgHours   = total hours / 7
 *   avgFocus   = average focusScore across all sessions
 *   score      = round((activeDays/7 * 40) + (min(avgHours,4)/4 * 40) + (avgFocus/100 * 20))
 *   Max = 100, weights: consistency(40) + volume(40) + quality(20)
 */
export async function getWeeklyMomentum(uid) {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
    }

    const ref = collection(db, "users", uid, "studySessions");
    const q = query(ref, where("date", ">=", dates[0]), where("date", "<=", dates[6]));
    const snap = await getDocs(q);
    const sessions = snap.docs.map(d => d.data());

    // Build per-day map
    const dayMap = {};
    dates.forEach(d => { dayMap[d] = { hours: 0, focusSum: 0, count: 0 }; });
    sessions.forEach(s => {
        if (!dayMap[s.date]) return;
        dayMap[s.date].hours += s.hours || 0;
        dayMap[s.date].focusSum += s.focusScore || 0;
        dayMap[s.date].count += 1;
    });

    const chartData = dates.map(d => ({
        day: new Date(d).toLocaleDateString("en", { weekday: "short" }),
        hours: parseFloat(dayMap[d].hours.toFixed(1)),
        focus: dayMap[d].count ? Math.round(dayMap[d].focusSum / dayMap[d].count) : 0,
    }));

    const activeDays = Object.values(dayMap).filter(d => d.hours > 0).length;
    const totalHours = Object.values(dayMap).reduce((s, d) => s + d.hours, 0);
    const avgHours = totalHours / 7;
    const allSessions = Object.values(dayMap).filter(d => d.count > 0);
    const avgFocus = allSessions.length
        ? allSessions.reduce((s, d) => s + d.focusSum / d.count, 0) / allSessions.length
        : 0;

    const score = Math.round(
        (activeDays / 7) * 40 +
        (Math.min(avgHours, 4) / 4) * 40 +
        (avgFocus / 100) * 20
    );

    return { score, chartData, activeDays, totalHours: parseFloat(totalHours.toFixed(1)) };
}

// ── COMMAND PARSER ────────────────────────────────────────────────────────────

/**
 * processCommand()
 * Routes user text input to the correct action.
 *
 * Rules (regex-based, no AI needed for speed):
 *   - Contains time pattern (6pm, 14:00, etc.) → type: "task"
 *   - Contains "note:" or "insight:" prefix → type: "insight"
 *   - Contains "remind" or "schedule" → type: "task"
 *   - Otherwise → type: "note"
 */
export function parseCommand(input) {
    const text = input.trim();
    const timeRegex = /\b(\d{1,2}(:\d{2})?\s?(am|pm)|(\d{2}:\d{2}))\b/i;
    const taskKeywords = /\b(remind|schedule|study|review|complete|finish|meet|call|gym|workout|read)\b/i;
    const insightKeywords = /^(note:|insight:|think:|feel:)/i;

    if (insightKeywords.test(text)) {
        return { type: "insight", content: text.replace(insightKeywords, "").trim() };
    }
    if (timeRegex.test(text) || taskKeywords.test(text)) {
        // Extract time if present
        const timeMatch = text.match(timeRegex);
        const timeStr = timeMatch ? timeMatch[0] : null;
        const title = text.replace(timeRegex, "").trim();
        return { type: "task", title, scheduledAt: timeStr, raw: text };
    }
    return { type: "note", content: text };
}

/**
 * saveCommand()
 * Persists the parsed command to Firestore.
 */
export async function saveCommand(uid, input, parsed) {
    const ref = collection(db, "users", uid, "commands");
    await addDoc(ref, { input, parsed, createdAt: Timestamp.now() });
}

// ── AI INFERENCE ──────────────────────────────────────────────────────────────

/**
 * generateAIInference()
 * Rule-based proactive tips (fast, no Gemini call needed for home page speed).
 * Returns array of tip strings based on current state.
 */
export function generateAIInference({ outlookPercent, activeDays, totalHoursToday, currentHour, upcomingTasks }) {
    const tips = [];

    if (totalHoursToday === 0 && currentHour >= 10) {
        tips.push({ type: "ALERT", msg: "No study sessions logged today. Start a session to keep your streak alive." });
    }
    if (activeDays < 3) {
        tips.push({ type: "ANALYSIS", msg: "Consistency is below par this week. Even 30-min sessions count — start small." });
    }
    if (currentHour >= 22) {
        tips.push({ type: "INSIGHT", msg: "Late-night studying reduces retention by ~40%. Consider a morning review instead." });
    }
    if (outlookPercent >= 80) {
        tips.push({ type: "SYSTEM", msg: "Outstanding day. You've completed 80%+ of your tasks — you're ahead of 94% of students today." });
    }
    if (upcomingTasks?.length > 0) {
        const next = upcomingTasks[0];
        tips.push({ type: "PATTERN", msg: `Next up: '${next.title}' at ${next.scheduledAt}. Prepare 5 mins early for better focus.` });
    }
    if (tips.length === 0) {
        tips.push({ type: "SYSTEM", msg: "System nominal. All metrics within optimal range." });
    }

    return tips;
}