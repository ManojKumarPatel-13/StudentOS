/**
 * homeService.js
 * Complete Firestore backend for the Home/Dashboard page.
 *
 * Firestore Collections:
 *   users/{uid}/tasks/{taskId}
 *     - title, subject, energyLevel, date, completed, focusTimeSpent, scheduledAt, createdAt
 *
 *   users/{uid}/studySessions/{id}
 *     - subject, duration, hours, focusScore, retention, energy, date, taskId, createdAt
 *
 *   users/{uid}/system_logs/{id}
 *     - message, type ("info" | "alert"), timestamp
 *
 *   users/{uid}/neural_assets/brain_dump  (single document)
 *     - content, lastUpdated / initializedAt
 */

import {
    collection, addDoc, getDocs, updateDoc,
    query, where, orderBy, doc, Timestamp,
    setDoc, getDoc, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const TODAY = () => new Date().toISOString().split("T")[0];

// ── SYSTEM LOGS ───────────────────────────────────────────────────────────────

/**
 * addSystemLog()
 * Writes an event to the Astra log feed.
 * type: "info" | "alert"
 */
export const addSystemLog = async (uid, message, type = "info") => {
    if (!uid) return;
    try {
        await addDoc(collection(db, "users", uid, "system_logs"), {
            message,
            type,
            timestamp: serverTimestamp(),
        });
    } catch (e) {
        console.error("System log error:", e);
    }
};

/**
 * getSystemLogs()
 * Returns last N system log entries ordered by timestamp desc.
 */
export const getSystemLogs = async (uid, limitCount = 20) => {
    if (!uid) return [];
    try {
        const q = query(
            collection(db, "users", uid, "system_logs"),
            orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        return snap.docs
            .slice(0, limitCount)
            .map(d => ({ id: d.id, ...d.data() }))
            .reverse();
    } catch (e) {
        console.error("Get logs error:", e);
        return [];
    }
};

/**
 * subscribeToSystemLogs()
 * Real-time listener for the Astra log feed.
 * Returns unsubscribe function.
 */
export const subscribeToSystemLogs = (uid, callback, limitCount = 15) => {
    if (!uid) return () => { };
    const q = query(
        collection(db, "users", uid, "system_logs"),
        orderBy("timestamp", "desc")
    );
    return onSnapshot(q, snap => {
        const logs = snap.docs
            .slice(0, limitCount)
            .map(d => ({ id: d.id, ...d.data() }))
            .reverse();
        callback(logs);
    });
};

// ── TASKS ─────────────────────────────────────────────────────────────────────

/**
 * addTask()
 * Creates a new task and logs it to the Astra feed.
 */
export const addTask = async (uid, title, subject = "General", options = {}) => {
    if (!uid) return null;
    try {
        const taskRef = collection(db, "users", uid, "tasks");
        const docRef = await addDoc(taskRef, {
            title,
            subject,
            energyLevel: options.energyLevel || "Medium",
            energyCost: options.energyCost || "medium",
            scheduledAt: options.scheduledAt || "09:00",
            date: options.date || TODAY(),
            completed: false,
            focusTimeSpent: 0,
            createdAt: serverTimestamp(),
        });
        await addSystemLog(uid, `Objective acquired: ${title}`, "info");
        return docRef.id;
    } catch (e) {
        console.error("Add task error:", e);
        return null;
    }
};

/**
 * markTaskComplete()
 * Marks a task done and logs the event.
 */
export const markTaskComplete = async (uid, taskId, taskTitle = "") => {
    if (!uid || !taskId) return;
    try {
        await updateDoc(doc(db, "users", uid, "tasks", taskId), {
            completed: true,
            completedAt: serverTimestamp(),
        });
        await addSystemLog(uid, `Objective complete: ${taskTitle}`, "info");
    } catch (e) {
        console.error("Mark complete error:", e);
    }
};

/**
 * subscribeTodaysTasks()
 * Real-time listener for today's tasks via onSnapshot.
 * Returns unsubscribe function.
 */
export const subscribeTodaysTasks = (uid, callback) => {
    if (!uid) return () => { };
    const q = query(
        collection(db, "users", uid, "tasks"),
        where("date", "==", TODAY()),
        orderBy("scheduledAt", "asc")
    );
    return onSnapshot(q, snap => {
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(tasks);
    });
};

/**
 * getTodaysTasks()
 * One-time fetch of today's tasks.
 */
export const getTodaysTasks = async (uid) => {
    if (!uid) return [];
    try {
        const q = query(
            collection(db, "users", uid, "tasks"),
            where("date", "==", TODAY()),
            orderBy("scheduledAt", "asc")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error("Get tasks error:", e);
        return [];
    }
};

// ── FOCUS SESSIONS ────────────────────────────────────────────────────────────

/**
 * saveFocusSession()
 * Saves a completed focus session to studySessions collection.
 * Also feeds data into the Analysis page.
 */
export const saveFocusSession = async (uid, sessionData) => {
    if (!uid) return;
    try {
        await addDoc(collection(db, "users", uid, "studySessions"), {
            subject: sessionData.subject || "General",
            duration: sessionData.duration || 25,       // minutes
            hours: parseFloat(((sessionData.duration || 25) / 60).toFixed(2)),
            focusScore: sessionData.focusScore || 80,
            retention: Math.round((sessionData.focusScore || 80) * 0.85),
            energy: Math.round((sessionData.focusScore || 80) * 0.9),
            taskId: sessionData.taskId || null,
            date: TODAY(),
            createdAt: serverTimestamp(),
        });
        await addSystemLog(
            uid,
            `Focus session complete: ${sessionData.subject} — ${sessionData.duration}min`,
            "info"
        );
    } catch (e) {
        console.error("Save session error:", e);
    }
};

// ── NEURAL SNAP (BRAIN DUMP) ──────────────────────────────────────────────────

/**
 * initializeUserAssets()
 * Creates the brain_dump document if it doesn't exist yet.
 * Call this once on first login.
 */
export const initializeUserAssets = async (uid) => {
    if (!uid) return;
    try {
        const snapRef = doc(db, "users", uid, "neural_assets", "brain_dump");
        const existing = await getDoc(snapRef);
        if (!existing.exists()) {
            await setDoc(snapRef, {
                content: "",
                initializedAt: serverTimestamp(),
            });
        }
    } catch (e) {
        console.error("Init assets error:", e);
    }
};

/**
 * loadNeuralSnap()
 * Fetches the brain dump content for a user.
 */
export const loadNeuralSnap = async (uid) => {
    if (!uid) return "";
    try {
        const snapRef = doc(db, "users", uid, "neural_assets", "brain_dump");
        const res = await getDoc(snapRef);
        return res.exists() ? res.data().content || "" : "";
    } catch (e) {
        console.error("Load snap error:", e);
        return "";
    }
};

/**
 * syncNeuralSnap()
 * Debounced auto-save for the brain dump textarea.
 * Uses setDoc with merge so it works even if document doesn't exist.
 */
export const syncNeuralSnap = async (uid, content) => {
    if (!uid) return;
    try {
        const snapRef = doc(db, "users", uid, "neural_assets", "brain_dump");
        await setDoc(snapRef, {
            content,
            lastUpdated: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.error("Sync snap error:", e);
    }
};

// ── DAILY OUTLOOK ─────────────────────────────────────────────────────────────

/**
 * calculateDailyOutlook()
 * Derives task completion % and day progress % for the progress bars.
 */
export const calculateDailyOutlook = async (uid) => {
    const tasks = await getTodaysTasks(uid);
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const now = new Date();
    const start = new Date(); start.setHours(6, 0, 0, 0);
    const end = new Date(); end.setHours(24, 0, 0, 0);
    const dayProgressPercent = Math.min(100, Math.max(0,
        Math.round(((now - start) / (end - start)) * 100)
    ));

    let status = "Not Started";
    if (percent >= 80) status = "Crushing It";
    else if (percent >= dayProgressPercent) status = "On Track";
    else if (percent >= 20) status = "In Progress";
    else if (total > 0) status = "Falling Behind";

    return { status, completedCount: completed, totalCount: total, percent, dayProgressPercent };
};

// ── SUBJECT MASTERY ───────────────────────────────────────────────────────────

/**
 * getSubjectMastery()
 * Aggregates studySessions by subject to calculate mastery percentages.
 * Mastery = weighted average of focusScore across sessions, capped at 100.
 */
export const getSubjectMastery = async (uid) => {
    if (!uid) return [];
    try {
        const snap = await getDocs(collection(db, "users", uid, "studySessions"));
        const sessions = snap.docs.map(d => d.data());

        const subjectMap = {};
        sessions.forEach(s => {
            const sub = s.subject || "General";
            if (!subjectMap[sub]) subjectMap[sub] = { totalScore: 0, count: 0, hours: 0 };
            subjectMap[sub].totalScore += s.focusScore || 0;
            subjectMap[sub].count += 1;
            subjectMap[sub].hours += s.hours || 0;
        });

        const COLORS = ["#185FA5", "#C9A84C", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B"];
        return Object.entries(subjectMap)
            .map(([subject, data], i) => ({
                subject,
                percent: Math.min(100, Math.round(data.totalScore / data.count)),
                hours: parseFloat(data.hours.toFixed(1)),
                color: COLORS[i % COLORS.length],
            }))
            .sort((a, b) => b.percent - a.percent)
            .slice(0, 5);
    } catch (e) {
        console.error("Get mastery error:", e);
        return [];
    }
};

// ── KNOWLEDGE GAPS ────────────────────────────────────────────────────────────

/**
 * getKnowledgeGaps()
 * Returns subjects not studied in 3+ days based on studySessions history.
 */
export const getKnowledgeGaps = async (uid) => {
    if (!uid) return [];
    try {
        const snap = await getDocs(collection(db, "users", uid, "studySessions"));
        const sessions = snap.docs.map(d => d.data());

        // Latest date per subject
        const latestMap = {};
        sessions.forEach(s => {
            const sub = s.subject;
            if (!sub || sub === "General") return;
            if (!latestMap[sub] || s.date > latestMap[sub]) latestMap[sub] = s.date;
        });

        const today = new Date();
        const gaps = [];
        Object.entries(latestMap).forEach(([subject, lastDate]) => {
            const last = new Date(lastDate);
            const daysAgo = Math.floor((today - last) / (1000 * 60 * 60 * 24));
            if (daysAgo >= 3) {
                gaps.push({
                    subject,
                    daysAgo,
                    reason: daysAgo >= 5
                        ? `No sessions in ${daysAgo} days. Exam gap forming.`
                        : `Retention dropping. Review recommended.`,
                    priority: daysAgo >= 5 ? "high" : "medium",
                });
            }
        });

        return gaps.sort((a, b) => b.daysAgo - a.daysAgo).slice(0, 3);
    } catch (e) {
        console.error("Get gaps error:", e);
        return [];
    }
};