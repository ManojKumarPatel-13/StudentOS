/**
 * profileService.js
 * Complete Firestore backend for the Profile page.
 *
 * Firestore Structure:
 *
 *   users/{uid}                          ← root user document
 *     - displayName     : string
 *     - email           : string
 *     - username        : string
 *     - photoURL        : string | null
 *     - branch          : string         (major)
 *     - college         : string         (university)
 *     - about           : string
 *     - skills          : string[]
 *     - createdAt       : Timestamp
 *
 *   users/{uid}/profile/hero             ← single doc for hero section
 *     - name            : string
 *     - major           : string
 *     - university      : string
 *     - tagline         : string
 *
 *   users/{uid}/accountInfo/settings     ← single doc for account settings
 *     - username        : string
 *     - fullName        : string
 *     - is2FAEnabled    : boolean
 *     - theme           : "dark" | "light"
 *     - landingPage     : string
 *     - notifications   : {
 *         studyReminders    : boolean,
 *         achievementAlerts : boolean,
 *         aiSuggestions     : boolean,
 *         emailDigest       : boolean,
 *       }
 *
 *   users/{uid}/social/links             ← single doc for social links
 *     - github          : string
 *     - linkedin        : string
 *     - website         : string
 *
 *   users/{uid}/goals/{goalId}           ← learning goals collection
 *     - label           : string
 *     - progress        : number  (0–100)
 *     - color           : string  (tailwind bg class)
 *     - createdAt       : Timestamp
 *     - updatedAt       : Timestamp
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    getDocs,
    deleteDoc,
    collection,
    serverTimestamp,
    onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — FULL PROFILE LOAD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * loadFullProfile()
 * Loads every piece of data the profile page needs in one call.
 * Returns a structured object so the page can hydrate all its state at once.
 *
 * @param {string} uid
 * @returns {Promise<ProfileSnapshot>}
 */
export async function loadFullProfile(uid) {
    if (!uid) return null;

    try {
        // Parallel fetch — all reads happen simultaneously
        const [rootSnap, heroSnap, settingsSnap, socialSnap, goalsSnap] =
            await Promise.all([
                getDoc(doc(db, "users", uid)),
                getDoc(doc(db, "users", uid, "profile", "hero")),
                getDoc(doc(db, "users", uid, "accountInfo", "settings")),
                getDoc(doc(db, "users", uid, "social", "links")),
                getDocs(collection(db, "users", uid, "goals")),
            ]);

        const root = rootSnap.exists() ? rootSnap.data() : {};
        const hero = heroSnap.exists() ? heroSnap.data() : {};
        const settings = settingsSnap.exists() ? settingsSnap.data() : {};
        const social = socialSnap.exists() ? socialSnap.data() : {};
        const goals = goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        return {
            // Hero section
            heroData: {
                name: hero.name || root.displayName || "New Student",
                major: hero.major || root.branch || "Not Set",
                university: hero.university || root.college || "Not Set",
                tagline: hero.tagline || "Building with StudentOS",
            },

            // About & skills
            aboutText: root.about || "",
            skillsList: root.skills || [],

            // Account info
            account: {
                username: settings.username || root.username || root.email?.split("@")[0] || "",
                fullName: settings.fullName || root.displayName || "",
                email: root.email || "",
                joinedDate: root.createdAt
                    ? root.createdAt.toDate().toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    })
                    : "April 2026",
                is2FAEnabled: settings.is2FAEnabled || false,
            },

            // Appearance & preferences
            theme: settings.theme || "dark",
            landingPage: settings.landingPage || "Home",

            // Notifications
            notifications: {
                studyReminders: settings.notifications?.studyReminders ?? true,
                achievementAlerts: settings.notifications?.achievementAlerts ?? true,
                aiSuggestions: settings.notifications?.aiSuggestions ?? false,
                emailDigest: settings.notifications?.emailDigest ?? true,
            },

            // Social links
            socialLinks: {
                github: social.github || "",
                linkedin: social.linkedin || "",
                website: social.website || "",
            },

            // Learning goals
            goals,
        };
    } catch (err) {
        console.error("loadFullProfile error:", err);
        return null;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — REAL-TIME STATS LISTENER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * subscribeToProfileStats()
 * Real-time listener for the stats shown in the hero card
 * (streak, total hours, notes count).
 * Pulls from users/{uid}/meta/stats which is maintained by analysisService.
 *
 * @param {string} uid
 * @param {function} callback  — called with { streak, totalHours, notesCount }
 * @returns {function} unsubscribe
 */
export function subscribeToProfileStats(uid, callback) {
    if (!uid) return () => { };

    const statsRef = doc(db, "users", uid, "meta", "stats");
    return onSnapshot(statsRef, (snap) => {
        if (snap.exists()) {
            const d = snap.data();
            callback({
                streak: d.streak || 0,
                totalHours: d.totalHours || 0,
                notesCount: d.notesCount || 0,
            });
        } else {
            callback({ streak: 0, totalHours: 0, notesCount: 0 });
        }
    });
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — HERO SECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * saveHeroData()
 * Saves the hero section (name, major, university, tagline) from the
 * Edit Profile modal. Also keeps the root displayName, branch, college in sync.
 *
 * @param {string} uid
 * @param {{ name, major, university, tagline }} heroData
 */
export async function saveHeroData(uid, heroData) {
    if (!uid) return;
    try {
        await setDoc(
            doc(db, "users", uid, "profile", "hero"),
            {
                name: heroData.name,
                major: heroData.major,
                university: heroData.university,
                tagline: heroData.tagline,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        // Keep root document in sync so home page greeting stays correct
        await updateDoc(doc(db, "users", uid), {
            displayName: heroData.name,
            branch: heroData.major,
            college: heroData.university,
        });
    } catch (err) {
        console.error("saveHeroData error:", err);
        throw err;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — ABOUT & SKILLS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * saveAboutText()
 * Persists the "About Me" textarea value to the root user document.
 *
 * @param {string} uid
 * @param {string} aboutText
 */
export async function saveAboutText(uid, aboutText) {
    if (!uid) return;
    try {
        await updateDoc(doc(db, "users", uid), {
            about: aboutText,
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error("saveAboutText error:", err);
        throw err;
    }
}

/**
 * saveSkills()
 * Overwrites the full skills array on the root user document.
 * Call this whenever a skill is added or removed.
 *
 * @param {string} uid
 * @param {string[]} skills
 */
export async function saveSkills(uid, skills) {
    if (!uid) return;
    try {
        await updateDoc(doc(db, "users", uid), {
            skills,
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error("saveSkills error:", err);
        throw err;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — ACCOUNT INFORMATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * updateAccountField()
 * Updates a single account info field (username, fullName, is2FAEnabled).
 * Writes to accountInfo/settings and keeps root doc in sync for displayName.
 *
 * @param {string} uid
 * @param {string} field   — "username" | "fullName" | "is2FAEnabled"
 * @param {any}    value
 */
export async function updateAccountField(uid, field, value) {
    if (!uid) return;
    try {
        await setDoc(
            doc(db, "users", uid, "accountInfo", "settings"),
            { [field]: value, updatedAt: serverTimestamp() },
            { merge: true }
        );

        // Mirror fullName → root displayName so home page greeting stays correct
        if (field === "fullName") {
            await updateDoc(doc(db, "users", uid), { displayName: value });
        }
        if (field === "username") {
            await updateDoc(doc(db, "users", uid), { username: value });
        }
    } catch (err) {
        console.error("updateAccountField error:", err);
        throw err;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — APPEARANCE & PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * saveAppearancePreferences()
 * Saves theme and landingPage preference together.
 *
 * @param {string} uid
 * @param {{ theme: string, landingPage: string }} prefs
 */
export async function saveAppearancePreferences(uid, prefs) {
    if (!uid) return;
    try {
        await setDoc(
            doc(db, "users", uid, "accountInfo", "settings"),
            {
                theme: prefs.theme,
                landingPage: prefs.landingPage,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (err) {
        console.error("saveAppearancePreferences error:", err);
        throw err;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * saveNotificationSettings()
 * Writes the full notifications object at once.
 * Call this whenever any single toggle changes.
 *
 * @param {string} uid
 * @param {{ studyReminders, achievementAlerts, aiSuggestions, emailDigest }} notifications
 */
export async function saveNotificationSettings(uid, notifications) {
    if (!uid) return;
    try {
        await setDoc(
            doc(db, "users", uid, "accountInfo", "settings"),
            { notifications, updatedAt: serverTimestamp() },
            { merge: true }
        );
    } catch (err) {
        console.error("saveNotificationSettings error:", err);
        throw err;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — SOCIAL LINKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * saveSocialLinks()
 * Saves github, linkedin, website links to social/links sub-document.
 *
 * @param {string} uid
 * @param {{ github: string, linkedin: string, website: string }} links
 */
export async function saveSocialLinks(uid, links) {
    if (!uid) return;
    try {
        await setDoc(
            doc(db, "users", uid, "social", "links"),
            { ...links, updatedAt: serverTimestamp() },
            { merge: true }
        );
    } catch (err) {
        console.error("saveSocialLinks error:", err);
        throw err;
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — LEARNING GOALS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * addGoal()
 * Creates a new learning goal.
 *
 * @param {string} uid
 * @param {{ label: string, progress: number, color: string }} goalData
 * @returns {Promise<string>} new goal document ID
 */
export async function addGoal(uid, goalData) {
    if (!uid) return null;
    try {
        const ref = await addDoc(collection(db, "users", uid, "goals"), {
            label: goalData.label || "New Goal",
            progress: goalData.progress ?? 0,
            color: goalData.color || "bg-blue-400",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return ref.id;
    } catch (err) {
        console.error("addGoal error:", err);
        return null;
    }
}

/**
 * updateGoalProgress()
 * Updates the progress % of a single goal.
 *
 * @param {string} uid
 * @param {string} goalId
 * @param {number} progress  — 0 to 100
 */
export async function updateGoalProgress(uid, goalId, progress) {
    if (!uid || !goalId) return;
    try {
        await updateDoc(doc(db, "users", uid, "goals", goalId), {
            progress: Math.min(100, Math.max(0, progress)),
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error("updateGoalProgress error:", err);
        throw err;
    }
}

/**
 * deleteGoal()
 * Permanently removes a learning goal.
 *
 * @param {string} uid
 * @param {string} goalId
 */
export async function deleteGoal(uid, goalId) {
    if (!uid || !goalId) return;
    try {
        await deleteDoc(doc(db, "users", uid, "goals", goalId));
    } catch (err) {
        console.error("deleteGoal error:", err);
        throw err;
    }
}

/**
 * subscribeToGoals()
 * Real-time listener for learning goals.
 * Returns unsubscribe function.
 *
 * @param {string} uid
 * @param {function} callback
 * @returns {function} unsubscribe
 */
export function subscribeToGoals(uid, callback) {
    if (!uid) return () => { };
    return onSnapshot(collection(db, "users", uid, "goals"), (snap) => {
        const goals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(goals);
    });
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — FIRST-TIME PROFILE INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * initializeProfileIfNew()
 * Called once after Google sign-in (from onboarding or authContext).
 * Creates the root user doc and all sub-documents with safe defaults
 * so the profile page never loads blank for a first-time user.
 *
 * @param {import("firebase/auth").User} firebaseUser
 */
export async function initializeProfileIfNew(firebaseUser) {
    if (!firebaseUser) return;
    const { uid, displayName, email, photoURL } = firebaseUser;

    try {
        const rootRef = doc(db, "users", uid);
        const existing = await getDoc(rootRef);

        if (existing.exists()) return; // Already initialized

        const username = email?.split("@")[0] || "student";

        await setDoc(rootRef, {
            displayName: displayName || "New Student",
            email: email || "",
            username,
            photoURL: photoURL || null,
            branch: "",
            college: "",
            about: "",
            skills: [],
            createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, "users", uid, "profile", "hero"), {
            name: displayName || "New Student",
            major: "",
            university: "",
            tagline: "Building with StudentOS",
            updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, "users", uid, "accountInfo", "settings"), {
            username,
            fullName: displayName || "",
            is2FAEnabled: false,
            theme: "dark",
            landingPage: "Home",
            notifications: {
                studyReminders: true,
                achievementAlerts: true,
                aiSuggestions: false,
                emailDigest: true,
            },
            updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, "users", uid, "social", "links"), {
            github: "",
            linkedin: "",
            website: "",
            updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, "users", uid, "meta", "stats"), {
            streak: 0,
            totalHours: 0,
            notesCount: 0,
            topicsMastered: 0,
            avgFocusScore: 0,
            lastActiveDate: null,
        });

        await addDoc(collection(db, "users", uid, "goals"), {
            label: "Get started with StudentOS",
            progress: 10,
            color: "bg-blue-400",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        console.log("Profile initialized for:", uid);
    } catch (err) {
        console.error("initializeProfileIfNew error:", err);
    }
}