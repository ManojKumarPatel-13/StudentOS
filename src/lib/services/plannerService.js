/**
 * plannerService.js
 * Firestore backend for the Planner page.
 *
 * Firestore Structure:
 *   users/{uid}/tasks/{taskId}
 *     - title        : string
 *     - time         : string  "HH:MM"
 *     - end          : string  "HH:MM"
 *     - energy       : string  "Low" | "Medium" | "High"
 *     - category     : string  "Coding" | "Study" | "Admin" | "Health" | "Other"
 *     - type         : string  "deep" | "light" | "break" | "meeting" | "ai"
 *     - confidence   : number  0–100
 *     - completed    : boolean
 *     - subtasks     : string[]
 *     - date         : string  "YYYY-MM-DD"
 *     - createdAt    : Timestamp
 *
 *   users/{uid}/plannerChats/{chatId}
 *     - role         : "user" | "ai"
 *     - text         : string
 *     - suggestion   : { title: string, accepted: boolean | null } | null
 *     - date         : string  "YYYY-MM-DD"
 *     - createdAt    : Timestamp
 */

import {
    collection, addDoc, getDocs, updateDoc, deleteDoc,
    query, where, orderBy, doc, serverTimestamp, onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const TODAY = () => new Date().toISOString().split("T")[0];

// ── PLANNER TASKS ─────────────────────────────────────────────────────────────

/**
 * subscribeTodaysPlannerTasks()
 * Real-time listener for today's planner tasks.
 * Returns unsubscribe function.
 */
export const subscribeTodaysPlannerTasks = (uid, callback) => {
    if (!uid) return () => { };
    const q = query(
        collection(db, "users", uid, "tasks"),
        where("date", "==", TODAY()),
        orderBy("time", "asc")
    );
    return onSnapshot(
        q,
        (snap) => {
            const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            callback(tasks);
        },
        (err) => console.error("Planner tasks listener error:", err)
    );
};

/**
 * addPlannerTask()
 * Creates a new planner task for today.
 */
export const addPlannerTask = async (uid, taskData) => {
    if (!uid) return null;
    try {
        const ref = collection(db, "users", uid, "tasks");
        const docRef = await addDoc(ref, {
            title: taskData.title || "Untitled Task",
            time: taskData.time || "09:00",
            end: taskData.end || "10:00",
            scheduledAt: taskData.time || "09:00",
            subject: taskData.category || "Study",
            energyLevel: taskData.energy || "Medium",
            urgent: taskData.urgent ?? false,
            important: taskData.important ?? true,
            energy: taskData.energy || "Medium",
            category: taskData.category || "Study",
            type: taskData.type || "light",
            confidence: taskData.confidence ?? 85,
            completed: false,
            subtasks: taskData.subtasks || [],
            date: TODAY(),
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Add planner task error:", e);
        return null;
    }
};

/**
 * completePlannerTask()
 * Marks a planner task as completed.
 */
export const completePlannerTask = async (uid, taskId) => {
    if (!uid || !taskId) return;
    try {
        await updateDoc(doc(db, "users", uid, "tasks", taskId), {
            completed: true,
            completedAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("Complete planner task error:", e);
    }
};

/**
 * deletePlannerTask()
 * Removes a planner task permanently.
 */
export const deletePlannerTask = async (uid, taskId) => {
    if (!uid || !taskId) return;
    try {
        await deleteDoc(doc(db, "users", uid, "tasks", taskId));
    } catch (e) {
        console.error("Delete planner task error:", e);
    }
};

/**
 * updatePlannerTask()
 * Partial update of any task fields (e.g. time, title, confidence).
 */
export const updatePlannerTask = async (uid, taskId, updates) => {
    if (!uid || !taskId) return;
    try {
        await updateDoc(doc(db, "users", uid, "tasks", taskId), {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("Update planner task error:", e);
    }
};

// ── PLANNER CHAT (AI Console) ─────────────────────────────────────────────────

/**
 * subscribeTodaysPlannerChat()
 * Real-time listener for today's AI chat messages.
 * Returns unsubscribe function.
 */
export const subscribeTodaysPlannerChat = (uid, callback) => {
    if (!uid) return () => { };
    const q = query(
        collection(db, "users", uid, "plannerChats"),
        where("date", "==", TODAY()),
        orderBy("createdAt", "asc")
    );
    return onSnapshot(
        q,
        (snap) => {
            const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            callback(messages);
        },
        (err) => console.error("Planner chat listener error:", err)
    );
};

/**
 * saveChatMessage()
 * Persists a single chat message (user or AI) to Firestore.
 */
export const saveChatMessage = async (uid, message) => {
    if (!uid) return null;
    try {
        const ref = collection(db, "users", uid, "plannerChats");
        const docRef = await addDoc(ref, {
            role: message.role || "user",
            text: message.text || "",
            suggestion: message.suggestion || null,
            date: TODAY(),
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Save chat message error:", e);
        return null;
    }
};

/**
 * updateChatSuggestion()
 * Updates the accepted field of a suggestion inside a chat message.
 */
export const updateChatSuggestion = async (uid, chatId, accepted) => {
    if (!uid || !chatId) return;
    try {
        await updateDoc(doc(db, "users", uid, "plannerChats", chatId), {
            "suggestion.accepted": accepted,
        });
    } catch (e) {
        console.error("Update suggestion error:", e);
    }
};

export const updateTaskMatrix = async (uid, taskId, urgent, important) => {
    if (!uid || !taskId) return;
    try {
        await updateDoc(doc(db, "users", uid, "plannerTasks", taskId), {
            urgent,
            important,
            updatedAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("updateTaskMatrix error:", e);
    }
};

export const rescheduleDay = async (uid, reason = "Sick") => {
    if (!uid) return { redistributed: 0 };
    try {
        const today = TODAY();

        // Fetch all incomplete tasks for today
        const q = query(
            collection(db, "users", uid, "plannerTasks"),
            where("date", "==", today),
            where("completed", "==", false)
        );
        const snap = await getDocs(q);
        const incompleteTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (!incompleteTasks.length) return { redistributed: 0 };

        // Sort by priority: urgent+important first
        const sorted = incompleteTasks.sort((a, b) => {
            const scoreA = (a.urgent ? 2 : 0) + (a.important ? 1 : 0);
            const scoreB = (b.urgent ? 2 : 0) + (b.important ? 1 : 0);
            return scoreB - scoreA;
        });

        // Distribute across next 4 days: 40% / 30% / 20% / 10%
        const distribution = [0.4, 0.3, 0.2, 0.1];
        const total = sorted.length;
        const buckets = distribution.map(pct => Math.max(1, Math.round(pct * total)));

        // Fix rounding so all tasks are assigned
        let assigned = 0;
        const dayAssignments = [];
        buckets.forEach((count, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i + 1);
            const dateStr = date.toISOString().split("T")[0];
            const taskSlice = sorted.slice(assigned, assigned + count);
            taskSlice.forEach(t => dayAssignments.push({ id: t.id, date: dateStr }));
            assigned += count;
        });

        // Assign remaining tasks (rounding leftover) to day 1
        if (assigned < total) {
            const date = new Date();
            date.setDate(date.getDate() + 1);
            const dateStr = date.toISOString().split("T")[0];
            sorted.slice(assigned).forEach(t =>
                dayAssignments.push({ id: t.id, date: dateStr })
            );
        }

        // Batch write all date updates
        const { writeBatch } = await import("firebase/firestore");
        const batch = writeBatch(db);
        dayAssignments.forEach(({ id, date }) => {
            batch.update(doc(db, "users", uid, "plannerTasks", id), {
                date,
                rescheduledFrom: today,
                rescheduledReason: reason,
                updatedAt: serverTimestamp(),
            });
        });
        await batch.commit();

        // Log a system entry in planner chat
        await addDoc(collection(db, "users", uid, "plannerChats"), {
            role: "ai",
            text: `Day marked as "${reason}". ${dayAssignments.length} tasks redistributed across the next 4 days using priority weighting. Your high-priority tasks go first. 💙`,
            suggestion: null,
            date: today,
            createdAt: serverTimestamp(),
        });

        return { redistributed: dayAssignments.length };
    } catch (e) {
        console.error("rescheduleDay error:", e);
        return { redistributed: 0 };
    }
};