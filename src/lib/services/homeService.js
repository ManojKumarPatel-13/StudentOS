/**
 * homeService.js - Optimized for StudentOS 2026
 * Handles all Firestore operations for the Dashboard.
 */

import {
    collection, addDoc, getDocs, updateDoc,
    query, where, orderBy, doc, Timestamp, limit, onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── DAILY OUTLOOK ─────────────────────────────────────────────────────────────

/**
 * calculateDailyOutlook()
 * Calculates productivity metrics for today.
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

    // Optimized Day Progress: 6 AM to 11:59 PM window
    const now = new Date();
    const startOfDay = new Date(); startOfDay.setHours(6, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    const dayProgressPercent = Math.max(0, Math.min(100, Math.round(
        ((now - startOfDay) / (endOfDay - startOfDay)) * 100
    )));

    let status = "Not Started";
    if (percent >= 80) status = "Crushing It";
    else if (percent >= 50) status = "On Track";
    else if (percent >= 20) status = "In Progress";
    else if (total > 0) status = "Falling Behind";

    return { status, completedCount: completed, totalCount: total, percent, dayProgressPercent };
}

// ── TASKS (SUB-COLLECTION PATTERN) ───────────────────────────────────────────

/**
 * getUpcomingTasks()
 * Fetches next 3 non-completed tasks for today.
 */
export async function getUpcomingTasks(uid) {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const ref = collection(db, "users", uid, "tasks");
    const q = query(
        ref,
        where("date", "==", today),
        where("completed", "==", false),
        orderBy("scheduledAt", "asc")
    );

    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.scheduledAt >= currentTime)
        .slice(0, 3);
}

/**
 * getTodaysTasks()
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
 * Intelligent task creation.
 */
export async function addTask(uid, task) {
    const ref = collection(db, "users", uid, "tasks");
    const docRef = await addDoc(ref, {
        ...task,
        completed: false,
        createdAt: Timestamp.now(),
        date: task.date || new Date().toISOString().split("T")[0]
    });
    return docRef.id;
}

export async function markTaskComplete(uid, taskId) {
    const ref = doc(db, "users", uid, "tasks", taskId);
    await updateDoc(ref, { completed: true });
}

// ── FOCUS & MOMENTUM ──────────────────────────────────────────────────────────

/**
 * logFocusSession()
 * Saves focus data to 'studySessions' for the Intelligence Pulse chart.
 */
export async function logFocusSession(uid, { subject, durationMinutes, focusScore }) {
    const today = new Date().toISOString().split("T")[0];
    const ref = collection(db, "users", uid, "studySessions");
    await addDoc(ref, {
        date: today,
        subject,
        hours: parseFloat((durationMinutes / 60).toFixed(2)),
        focusScore,
        retention: Math.round(focusScore * 0.85),
        energy: Math.round(focusScore * 0.9),
        createdAt: Timestamp.now(),
    });
}

/**
 * getWeeklyMomentum()
 * Calculates the Momentum Score (Consistency + Volume + Quality).
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

// ── COMMAND UTILITIES ─────────────────────────────────────────────────────────

export function parseCommand(input) {
    const text = input.trim();
    const timeRegex = /\b(\d{1,2}(:\d{2})?\s?(am|pm)|(\d{2}:\d{2}))\b/i;
    const taskKeywords = /\b(remind|schedule|study|review|complete|finish|meet|call|gym|workout|read)\b/i;
    const insightKeywords = /^(note:|insight:|think:|feel:)/i;

    if (insightKeywords.test(text)) {
        return { type: "insight", content: text.replace(insightKeywords, "").trim() };
    }
    if (timeRegex.test(text) || taskKeywords.test(text)) {
        const timeMatch = text.match(timeRegex);
        let timeStr = timeMatch ? timeMatch[0] : "12:00";
        // Simple normalization: convert '8pm' style to '20:00'
        if (timeStr.toLowerCase().includes('pm') && !timeStr.includes('12')) {
            let [h] = timeStr.split(/[:am|pm]/);
            timeStr = `${parseInt(h) + 12}:00`;
        } else if (timeStr.toLowerCase().includes('am') && timeStr.includes('12')) {
            timeStr = "00:00";
        }
        const title = text.replace(timeRegex, "").replace(taskKeywords, "").trim();
        return { type: "task", title: title || "New Task", scheduledAt: timeStr, raw: text };
    }
    return { type: "note", content: text };
}

// ── AGENTIC INFERENCE ─────────────────────────────────────────────────────────

export function generateAIInference({ outlookPercent, activeDays, totalHoursToday, currentHour, upcomingTasks }) {
    const tips = [];
    if (totalHoursToday === 0 && currentHour >= 11) {
        tips.push({ type: "ALERT", msg: "Morning momentum is missing. A 15-min 'Warmup' session is recommended." });
    }
    if (activeDays >= 5) {
        tips.push({ type: "INSIGHT", msg: "High consistency detected. You are currently in a 'Flow State' week." });
    }
    if (upcomingTasks?.length > 2) {
        tips.push({ type: "ANALYSIS", msg: "Afternoon density is high. Consider moving one task to 'Low Energy' mode." });
    }
    if (tips.length === 0) {
        tips.push({ type: "SYSTEM", msg: "Neural Hub synchronized. Performance metrics are optimal." });
    }
    return tips;
}