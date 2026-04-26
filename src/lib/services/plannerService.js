/**
 * plannerService.js
 * Firestore backend for the Planner page.
 *
 * Firestore Structure:
 *   users/{uid}/plannerTasks/{taskId}
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
        collection(db, "users", uid, "plannerTasks"),
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
        const ref = collection(db, "users", uid, "plannerTasks");
        const docRef = await addDoc(ref, {
            title: taskData.title || "Untitled Task",
            time: taskData.time || "09:00",
            end: taskData.end || "10:00",
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
        await updateDoc(doc(db, "users", uid, "plannerTasks", taskId), {
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
        await deleteDoc(doc(db, "users", uid, "plannerTasks", taskId));
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
        await updateDoc(doc(db, "users", uid, "plannerTasks", taskId), {
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