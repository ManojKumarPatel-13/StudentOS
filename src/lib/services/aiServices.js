/**
 * aiServices.js
 * Firestore backend for Astra AI chat memory.
 *
 * Firestore Structure:
 *   users/{uid}/mentorChats/{msgId}
 *     - role      : "user" | "model"
 *     - text      : string
 *     - createdAt : Timestamp
 */

import {
    collection, addDoc, getDocs,
    query, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const HISTORY_LIMIT = 20; // last 20 messages = long-term memory window

/**
 * saveChatMessage()
 * Persists a single message to the mentor chat history.
 * Call for BOTH user messages and model replies.
 *
 * @param {string} uid
 * @param {{ role: "user"|"model", text: string }} message
 */
export async function saveChatMessage(uid, message) {
    if (!uid || !message?.text) return;
    try {
        await addDoc(collection(db, "users", uid, "mentorChats"), {
            role: message.role || "user",
            text: message.text.slice(0, 5000),
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("saveChatMessage error:", e);
    }
}

/**
 * loadChatHistory()
 * Fetches the last N messages ordered oldest → newest.
 * Pass this array to startChatSession() in gemini.js.
 *
 * @param {string} uid
 * @returns {Promise<Array<{role: string, text: string}>>}
 */
export async function loadChatHistory(uid) {
    if (!uid) return [];
    try {
        const q = query(
            collection(db, "users", uid, "mentorChats"),
            orderBy("createdAt", "desc"),
            limit(HISTORY_LIMIT)
        );
        const snap = await getDocs(q);
        // reverse so oldest is first (Gemini needs chronological order)
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .reverse();
    } catch (e) {
        console.error("loadChatHistory error:", e);
        return [];
    }
}