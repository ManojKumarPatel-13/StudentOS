'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    User, Edit2, Share2, Flame, Clock, FileText,
    Sparkles, Code, Target, Plus, Globe, LogOut,
    ChevronRight, Eye, EyeOff, Check, X, Camera, Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import Sidebar from '@/components/shared/sidebar';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/authContext';
import { getCareerSuggestions } from "@/lib/services/mentorService";
import {
    loadFullProfile,
    subscribeToProfileStats,
    saveHeroData,
    saveAboutText,
    saveSkills,
    updateAccountField,
    saveAppearancePreferences,
    saveNotificationSettings,
    saveSocialLinks,
    subscribeToGoals,
    addGoal,
    updateGoalProgress,
    deleteGoal,
} from '@/lib/services/profileService';

// ─── GOAL COLOR OPTIONS ───────────────────────────────────────────────────────
const GOAL_COLORS = [
    { label: 'Blue', value: 'bg-blue-400' },
    { label: 'Pink', value: 'bg-pink-500' },
    { label: 'Green', value: 'bg-emerald-500' },
    { label: 'Orange', value: 'bg-orange-400' },
    { label: 'Purple', value: 'bg-purple-500' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);   // global save indicator

    // Hero
    const [heroData, setHeroData] = useState({
        name: '', major: '', university: '', tagline: '',
    });

    // Stats (real-time)
    const [stats, setStats] = useState({ streak: 0, totalHours: 0, notesCount: 0 });

    // About & skills
    const [aboutText, setAboutText] = useState('');
    const [skillsList, setSkillsList] = useState([]);
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [newSkill, setNewSkill] = useState('');
    const [showSkillInput, setShowSkillInput] = useState(false);
    const [careerSuggestions, setCareerSuggestions] = useState([]);
    const [careerLoading, setCareerLoading] = useState(false);

    // Account
    const [account, setAccount] = useState({
        username: '', fullName: '', email: '', joinedDate: '', is2FAEnabled: false,
    });
    const [editingField, setEditingField] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Appearance & notifications
    const [theme, setTheme] = useState('dark');
    const [landingPage, setLandingPage] = useState('Home');
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState({
        studyReminders: true, achievementAlerts: true,
        aiSuggestions: false, emailDigest: true,
    });

    // Social links
    const [socialLinks, setSocialLinks] = useState({ github: '', linkedin: '', website: '' });
    const [editingSocial, setEditingSocial] = useState(null); // 'github' | 'linkedin' | 'website' | null

    // Goals
    const [goals, setGoals] = useState([]);
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [newGoalLabel, setNewGoalLabel] = useState('');
    const [newGoalColor, setNewGoalColor] = useState('bg-blue-400');

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);


    useEffect(() => {
        if (!user) return;
        getCareerSuggestions(user.uid, { branch: heroData.major }).then(s => {
            if (s) setCareerSuggestions(s);
        });
    }, [user, heroData.major]);

    // ── LOAD DATA ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push('/login'); return; }

        const uid = user.uid;

        loadFullProfile(uid).then((profile) => {
            if (!profile) return;
            setHeroData(profile.heroData);
            setAboutText(profile.aboutText);
            setSkillsList(profile.skillsList);
            setAccount(profile.account);
            setTheme(profile.theme);
            setLandingPage(profile.landingPage);
            setNotifications(profile.notifications);
            setSocialLinks(profile.socialLinks);
            setLoading(false);
        });

        // Real-time listeners
        const unsubStats = subscribeToProfileStats(uid, setStats);
        const unsubGoals = subscribeToGoals(uid, setGoals);

        return () => { unsubStats(); unsubGoals(); };
    }, [user, authLoading, router]);

    // ── HERO / EDIT PROFILE MODAL ─────────────────────────────────────────────
    const handleProfileUpdate = async (newData) => {
        setHeroData(newData);
        setIsModalOpen(false);
        await saveHeroData(user.uid, newData);
    };

    // ── ABOUT ─────────────────────────────────────────────────────────────────
    const handleSaveAbout = async () => {
        setIsEditingAbout(false);
        await saveAboutText(user.uid, aboutText);
    };

    // ── SKILLS ───────────────────────────────────────────────────────────────
    const handleAddSkill = async () => {
        const trimmed = newSkill.trim();
        if (!trimmed || skillsList.includes(trimmed)) return;
        const updated = [...skillsList, trimmed];
        setSkillsList(updated);
        setNewSkill('');
        setShowSkillInput(false);
        await saveSkills(user.uid, updated);
    };

    const handleRemoveSkill = async (skill) => {
        const updated = skillsList.filter((s) => s !== skill);
        setSkillsList(updated);
        await saveSkills(user.uid, updated);
    };

    // ── ACCOUNT FIELDS ────────────────────────────────────────────────────────
    const handleUpdateAccountField = async (field, value) => {
        setAccount((prev) => ({ ...prev, [field]: value }));
        setEditingField(null);
        await updateAccountField(user.uid, field, value);
    };

    // ── THEME ─────────────────────────────────────────────────────────────────
    const handleThemeChange = async (val) => {
        setTheme(val);
        await saveAppearancePreferences(user.uid, { theme: val, landingPage });
    };

    // ── LANDING PAGE ──────────────────────────────────────────────────────────
    const handleLandingPageChange = async (val) => {
        setLandingPage(val);
        setIsOpen(false);
        await saveAppearancePreferences(user.uid, { theme, landingPage: val });
    };

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    const handleToggleNotification = async (key) => {
        const updated = { ...notifications, [key]: !notifications[key] };
        setNotifications(updated);
        await saveNotificationSettings(user.uid, updated);
    };

    // ── SOCIAL LINKS ──────────────────────────────────────────────────────────
    const handleSaveSocial = async (key, value) => {
        const updated = { ...socialLinks, [key]: value };
        setSocialLinks(updated);
        setEditingSocial(null);
        await saveSocialLinks(user.uid, updated);
    };

    // ── GOALS ─────────────────────────────────────────────────────────────────
    const handleAddGoal = async () => {
        if (!newGoalLabel.trim()) return;
        await addGoal(user.uid, { label: newGoalLabel.trim(), progress: 0, color: newGoalColor });
        setNewGoalLabel('');
        setNewGoalColor('bg-blue-400');
        setShowGoalForm(false);
    };

    const handleProgressChange = async (goalId, value) => {
        // Optimistic update
        setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, progress: value } : g));
        await updateGoalProgress(user.uid, goalId, value);
    };

    const handleDeleteGoal = async (goalId) => {
        await deleteGoal(user.uid, goalId);
    };

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    // ── LOADING STATE ─────────────────────────────────────────────────────────
    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#0A1628] flex items-center justify-center text-[#C9A84C] font-black uppercase tracking-widest text-xs">
                Initializing StudentOS...
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex min-h-screen bg-[#0A1628] text-[#F5F0E8] font-sans selection:bg-[#185FA5]/30">
            <Sidebar activePage="profile" />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* ── HERO ──────────────────────────────────────────────── */}
                    <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8 backdrop-blur-xl">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="flex gap-8 items-center">
                                {/* Avatar */}
                                <div className="relative w-32 h-32 flex-shrink-0">
                                    <div className="absolute -inset-1 bg-gradient-to-tr from-[#185FA5] to-purple-500 rounded-full blur opacity-40" />
                                    <div className="relative w-full h-full rounded-full bg-[#0A1628] border-4 border-[#0C2D5E] flex items-center justify-center overflow-hidden">
                                        {user?.photoURL ? (
                                            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl font-black text-[#C9A84C]">
                                                {heroData.name?.charAt(0)?.toUpperCase() || 'S'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Name & Info */}
                                <div>
                                    <h1 className="text-4xl font-black">{heroData.name || 'New Student'}</h1>
                                    <p className="text-[#F5F0E8]/50 font-bold text-sm mt-1">
                                        {heroData.major || 'Major not set'} • {heroData.university || 'University not set'}
                                    </p>
                                    <p className="text-[#F5F0E8]/40 text-sm mt-3 max-w-xl leading-relaxed">
                                        {heroData.tagline || 'Building with StudentOS'}
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 flex-shrink-0">
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-[#185FA5]/20 border border-[#185FA5]/30 text-white rounded-2xl font-bold text-sm hover:bg-[#185FA5]/30 transition-all"
                                >
                                    <Edit2 size={16} /> Edit Profile
                                </button>
                                <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                                    <Share2 size={20} className="text-[#F5F0E8]/60" />
                                </button>
                            </div>
                        </div>

                        {/* Stats Grid — live from Firestore */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                            <StatCard icon={<Flame className="text-orange-500" />} val={stats.streak} label="Day Streak" />
                            <StatCard icon={<Clock className="text-blue-400" />} val={stats.totalHours} label="Study Hours" />
                            <StatCard icon={<FileText className="text-purple-400" />} val={stats.notesCount} label="Notes" />
                        </div>
                    </div>

                    {/* ── ABOUT & SKILLS ────────────────────────────────────── */}
                    <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8 backdrop-blur-xl space-y-8">

                        {/* About Me */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <Sparkles size={20} className="text-[#C9A84C]" /> About Me
                                </h3>
                                <button
                                    onClick={isEditingAbout ? handleSaveAbout : () => setIsEditingAbout(true)}
                                    className="p-2 bg-[#185FA5]/20 border border-[#185FA5]/30 rounded-xl text-blue-400 hover:bg-[#185FA5]/30 transition-all"
                                >
                                    {isEditingAbout ? <Check size={18} /> : <Edit2 size={18} />}
                                </button>
                            </div>

                            {isEditingAbout ? (
                                <textarea
                                    value={aboutText}
                                    onChange={(e) => setAboutText(e.target.value)}
                                    className="w-full bg-[#0A1628]/60 border border-[#C9A84C]/30 rounded-3xl p-6 text-[#F5F0E8]/80 text-sm leading-relaxed focus:outline-none focus:border-[#C9A84C] h-32 resize-none"
                                />
                            ) : (
                                <div className="bg-[#0A1628]/40 border border-[#185FA5]/10 rounded-3xl p-6 text-[#F5F0E8]/60 text-sm leading-relaxed min-h-[80px]">
                                    {aboutText || <span className="italic opacity-40">Click edit to add your bio...</span>}
                                </div>
                            )}
                        </div>

                        {/* Skills */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                                    <Code size={18} className="text-[#F5F0E8]/40" /> Skills & Interests
                                </h3>
                                <div className="flex gap-2">
                                    {isDeleteMode && (
                                        <button
                                            onClick={() => setIsDeleteMode(false)}
                                            className="p-2 bg-red-500/20 text-red-400 rounded-xl transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (isDeleteMode) { setIsDeleteMode(false); return; }
                                            setShowSkillInput(true);
                                        }}
                                        onContextMenu={(e) => { e.preventDefault(); setIsDeleteMode(true); }}
                                        title="Click to add • Right-click to delete"
                                        className="p-2 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-all"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Add skill input */}
                            {showSkillInput && (
                                <div className="flex gap-2 mb-4">
                                    <input
                                        autoFocus
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSkill(); if (e.key === 'Escape') setShowSkillInput(false); }}
                                        placeholder="e.g. Python, DSA, Design..."
                                        className="flex-1 bg-[#0A1628]/60 border border-[#C9A84C]/30 rounded-2xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C]"
                                    />
                                    <button onClick={handleAddSkill} className="px-4 py-2 bg-[#C9A84C]/20 border border-[#C9A84C]/30 rounded-2xl text-[#C9A84C] font-bold text-sm hover:bg-[#C9A84C]/30 transition-all">
                                        Add
                                    </button>
                                    <button onClick={() => setShowSkillInput(false)} className="px-3 py-2 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                {skillsList.length === 0 && (
                                    <p className="text-[#F5F0E8]/30 text-sm italic">No skills added yet. Click + to add one.</p>
                                )}
                                {skillsList.map((skill) => (
                                    <div key={skill} className="relative group">
                                        <span className="bg-[#185FA5]/20 border border-[#185FA5]/30 px-5 py-2.5 rounded-full text-xs font-black text-white shadow-lg">
                                            {skill}
                                        </span>
                                        {isDeleteMode && (
                                            <button
                                                onClick={() => handleRemoveSkill(skill)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                                            >
                                                <X size={10} strokeWidth={4} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {!isDeleteMode && skillsList.length > 0 && (
                                <p className="text-[#F5F0E8]/20 text-[10px] mt-3">Right-click the + button to enter delete mode</p>
                            )}
                        </div>
                    </div>

                    {/* ── LEARNING GOALS ───────────────────────────────────── */}
                    <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <Target size={22} className="text-emerald-400" /> Learning Goals
                            </h3>
                            <button
                                onClick={() => setShowGoalForm(!showGoalForm)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold text-xs hover:bg-emerald-500/20 transition-all"
                            >
                                <Plus size={14} /> Add Goal
                            </button>
                        </div>

                        {/* Add goal form */}
                        {showGoalForm && (
                            <div className="bg-[#0A1628]/60 border border-[#185FA5]/20 rounded-3xl p-6 mb-6 space-y-4">
                                <input
                                    autoFocus
                                    value={newGoalLabel}
                                    onChange={(e) => setNewGoalLabel(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddGoal(); }}
                                    placeholder="e.g. Master Advanced React Patterns"
                                    className="w-full bg-[#0A1628]/60 border border-[#185FA5]/20 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]"
                                />
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-[#F5F0E8]/40 text-xs font-bold uppercase tracking-widest">Color:</span>
                                    {GOAL_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            onClick={() => setNewGoalColor(c.value)}
                                            className={`w-6 h-6 rounded-full ${c.value} transition-all ${newGoalColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A1628] scale-125' : ''}`}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleAddGoal} className="px-5 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl font-bold text-sm hover:bg-emerald-500/30 transition-all">
                                        Save Goal
                                    </button>
                                    <button onClick={() => setShowGoalForm(false)} className="px-4 py-2 bg-white/5 rounded-2xl text-white/40 font-bold text-sm hover:text-white transition-all">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {goals.length === 0 && (
                                <p className="text-[#F5F0E8]/30 text-sm italic text-center py-4">No goals yet. Add one to get started.</p>
                            )}
                            {goals.map((goal) => (
                                <div key={goal.id} className="group space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-[#F5F0E8]/80">{goal.label}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-white">{goal.progress}%</span>
                                            <button
                                                onClick={() => handleDeleteGoal(goal.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-red-400/60 hover:text-red-400 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="relative h-2 w-full bg-[#185FA5]/10 rounded-full overflow-hidden cursor-pointer"
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                            handleProgressChange(goal.id, pct);
                                        }}
                                    >
                                        <div
                                            className={`h-full ${goal.color || 'bg-blue-400'} rounded-full transition-all duration-300`}
                                            style={{ width: `${goal.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-[#F5F0E8]/20 opacity-0 group-hover:opacity-100 transition-all">Click the bar to update progress</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Career Roadmap */}
                    <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                🎯 Career Roadmap
                            </h3>
                            <button
                                onClick={async () => {
                                    setCareerLoading(true);
                                    // Force refresh by clearing cache not needed — just refetch
                                    const s = await getCareerSuggestions(user.uid, { branch: heroData.major });
                                    if (s) setCareerSuggestions(s);
                                    setCareerLoading(false);
                                }}
                                className="text-xs font-bold px-4 py-2 rounded-2xl text-blue-400 border border-[#185FA5]/30 hover:bg-[#185FA5]/20 transition-all">
                                {careerLoading ? "Loading..." : "↻ Refresh"}
                            </button>
                        </div>

                        {careerSuggestions.length === 0 ? (
                            <p className="text-[#F5F0E8]/30 text-sm italic text-center py-4">
                                {careerLoading ? "Astra is mapping your career path..." : "Take a few quizzes first — Astra will suggest certifications based on your topics."}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {careerSuggestions.map((cert, i) => (
                                    <div key={i} className="bg-[#0A1628]/40 border border-[#185FA5]/10 rounded-3xl p-5 flex items-center justify-between group hover:border-[#185FA5]/30 transition-all">
                                        <div>
                                            <p className="font-bold text-white text-sm">{cert.title}</p>
                                            <p className="text-[#F5F0E8]/40 text-xs mt-1">{cert.provider} · {cert.duration}</p>
                                        </div>
                                        <a href={cert.link} target="_blank" rel="noopener noreferrer"
                                            className="px-4 py-2 rounded-2xl text-xs font-bold text-blue-400 border border-[#185FA5]/30 hover:bg-[#185FA5]/20 transition-all opacity-0 group-hover:opacity-100">
                                            Learn More →
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── SETTINGS HEADER ───────────────────────────────────── */}
                    <h2 className="text-3xl font-black text-white pt-8">Settings</h2>

                    {/* ── ACCOUNT INFORMATION ───────────────────────────────── */}
                    <div className="w-full bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-6 backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <User size={20} className="text-blue-400" />
                            <h2 className="text-xl font-black text-white">Account Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <EditableField
                                label="Username"
                                value={account.username}
                                isEditing={editingField === 'username'}
                                onEdit={() => setEditingField('username')}
                                onSave={(val) => handleUpdateAccountField('username', val)}
                            />
                            <EditableField
                                label="Full Name"
                                value={account.fullName}
                                isEditing={editingField === 'fullName'}
                                onEdit={() => setEditingField('fullName')}
                                onSave={(val) => handleUpdateAccountField('fullName', val)}
                            />
                            <EditableField
                                label="Email"
                                value={account.email}
                                isEditing={false}
                                onEdit={() => { }}
                                onSave={() => { }}
                                readOnly
                            />
                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/60">Joined Date</p>
                                <div className="bg-[#0A1628]/60 border border-[#185FA5]/20 px-4 h-[60px] rounded-2xl flex items-center text-sm font-bold text-[#F5F0E8]/40">
                                    {account.joinedDate}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-[#185FA5]/20 to-transparent my-6" />

                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black text-[#F5F0E8]/30 uppercase tracking-[0.3em]">Security</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Password */}
                                <div className="bg-[#0A1628]/60 border border-[#185FA5]/10 p-4 rounded-2xl flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase text-blue-400/40 mb-1">Password</p>
                                        <p className="font-mono text-sm tracking-widest text-white truncate">
                                            {showPassword ? 'StudentOS#2026' : '••••••••••••'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button onClick={() => setShowPassword(!showPassword)} className="p-2 text-[#F5F0E8]/20 hover:text-white transition-colors">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <button className="px-3 py-1.5 bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600/20 text-[9px] font-black uppercase transition-all">
                                            Change
                                        </button>
                                    </div>
                                </div>

                                {/* 2FA */}
                                <div className="bg-[#0A1628]/60 border border-[#185FA5]/10 p-4 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-emerald-400/40 mb-1">Security Level</p>
                                        <p className="font-bold text-xs text-white">Two-Factor Auth</p>
                                    </div>
                                    <div
                                        onClick={() => handleUpdateAccountField('is2FAEnabled', !account.is2FAEnabled)}
                                        className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-all flex items-center ${account.is2FAEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full transition-all ${account.is2FAEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── SETTINGS GRID ─────────────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Appearance */}
                        <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8">
                            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">Appearance</h3>
                            <div className="flex bg-[#0A1628]/60 p-1 rounded-2xl border border-white/5">
                                {['dark', 'light'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => handleThemeChange(t)}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all capitalize ${theme === t ? 'bg-[#185FA5] text-white shadow-lg' : 'text-slate-500'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preferences */}
                        <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8 relative">
                            <h3 className="text-lg font-black text-white mb-6">Preferences</h3>
                            <p className="text-[10px] font-black uppercase text-[#F5F0E8]/30 mb-2 tracking-widest">Default Landing Page</p>
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="w-full bg-[#0A1628]/60 border border-[#185FA5]/20 p-4 rounded-2xl flex justify-between items-center"
                            >
                                <span className="font-bold">{landingPage}</span>
                                <ChevronRight className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} size={18} />
                            </button>
                            {isOpen && (
                                <div className="absolute left-8 right-8 mt-2 bg-[#0C2D5E] border border-[#185FA5]/40 rounded-2xl z-50 overflow-hidden shadow-2xl">
                                    {['Home', 'AI Assistant', 'Planner', 'Analysis'].map((item) => (
                                        <div
                                            key={item}
                                            onClick={() => handleLandingPageChange(item)}
                                            className="p-4 hover:bg-[#185FA5]/40 cursor-pointer font-bold border-b border-white/5 last:border-none"
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notifications */}
                        <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8">
                            <h3 className="text-lg font-black text-white mb-8">Notifications</h3>
                            <div className="space-y-6">
                                <SwitchItem label="Study Reminders" active={notifications.studyReminders} onToggle={() => handleToggleNotification('studyReminders')} />
                                <SwitchItem label="Achievement Alerts" active={notifications.achievementAlerts} onToggle={() => handleToggleNotification('achievementAlerts')} />
                                <SwitchItem label="AI Suggestions" active={notifications.aiSuggestions} onToggle={() => handleToggleNotification('aiSuggestions')} />
                                <SwitchItem label="Email Digest" active={notifications.emailDigest} onToggle={() => handleToggleNotification('emailDigest')} />
                            </div>
                        </div>

                        {/* Social Profiles */}
                        <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8">
                            <h3 className="text-lg font-black text-white mb-6">Social Profiles</h3>
                            <div className="space-y-3">
                                {[
                                    { key: 'github', icon: <FaGithub size={18} />, placeholder: 'github.com/username' },
                                    { key: 'linkedin', icon: <FaLinkedin size={18} />, placeholder: 'linkedin.com/in/username' },
                                    { key: 'website', icon: <Globe size={18} />, placeholder: 'yoursite.com' },
                                ].map(({ key, icon, placeholder }) => (
                                    <SocialField
                                        key={key}
                                        icon={icon}
                                        value={socialLinks[key]}
                                        placeholder={placeholder}
                                        isEditing={editingSocial === key}
                                        onEdit={() => setEditingSocial(key)}
                                        onSave={(val) => handleSaveSocial(key, val)}
                                        onCancel={() => setEditingSocial(null)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Session / Logout */}
                        <div className="md:col-span-2 bg-red-500/5 border border-red-500/10 rounded-[40px] p-8 space-y-6">
                            <h3 className="text-lg font-black text-red-400 flex items-center gap-3">
                                <LogOut size={20} /> Session
                            </h3>
                            <button
                                onClick={handleLogout}
                                className="w-full py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 font-bold flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all"
                            >
                                <LogOut size={18} /> Logout from StudentOS
                            </button>
                        </div>

                    </div>
                </div>

                {/* Edit Profile Modal */}
                <EditProfileModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    currentData={heroData}
                    onSave={handleProfileUpdate}
                />
            </main>
        </div>
    );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatCard({ icon, val, label }) {
    return (
        <div className="bg-[#0A1628]/40 border border-[#185FA5]/10 rounded-3xl p-8 flex flex-col items-center justify-center hover:border-[#185FA5]/30 transition-all group">
            <div className="mb-4 transform group-hover:scale-110 transition-transform">{icon}</div>
            <span className="text-4xl font-black text-white leading-none">{val}</span>
            <span className="text-xs font-bold text-[#F5F0E8]/30 uppercase tracking-widest mt-2">{label}</span>
        </div>
    );
}

function SwitchItem({ label, active, onToggle }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-[#F5F0E8]/70">{label}</span>
            <div
                onClick={onToggle}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${active ? 'bg-blue-600' : 'bg-white/10'}`}
            >
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${active ? 'translate-x-6' : ''}`} />
            </div>
        </div>
    );
}

function EditableField({ label, value, isEditing, onEdit, onSave, readOnly }) {
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => { setTempValue(value); }, [value]);

    return (
        <div className="space-y-2 group">
            <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60">{label}</p>
                {!isEditing && !readOnly && (
                    <Edit2
                        size={12}
                        className="text-[#F5F0E8]/20 cursor-pointer hover:text-[#C9A84C] transition-all opacity-0 group-hover:opacity-100"
                        onClick={onEdit}
                    />
                )}
                {readOnly && (
                    <span className="text-[9px] text-[#F5F0E8]/20 uppercase tracking-widest">read-only</span>
                )}
            </div>

            {isEditing ? (
                <div className="relative flex items-center">
                    <input
                        autoFocus
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => onSave(tempValue)}
                        onKeyDown={(e) => e.key === 'Enter' && onSave(tempValue)}
                        className="w-full bg-[#0C2D5E] border border-[#C9A84C] p-5 rounded-2xl font-bold text-sm text-white outline-none shadow-[0_0_15px_rgba(201,168,76,0.1)]"
                    />
                    <Check size={16} className="absolute right-5 text-emerald-400 cursor-pointer" onClick={() => onSave(tempValue)} />
                </div>
            ) : (
                <div
                    onClick={!readOnly ? onEdit : undefined}
                    className={`bg-[#0A1628]/60 border border-[#185FA5]/10 p-5 rounded-2xl font-bold text-sm text-[#F5F0E8] transition-all ${!readOnly ? 'cursor-text hover:border-[#185FA5]/40' : 'opacity-50'}`}
                >
                    {value || <span className="opacity-30 italic">Not set</span>}
                </div>
            )}
        </div>
    );
}

function SocialField({ icon, value, placeholder, isEditing, onEdit, onSave, onCancel }) {
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => { setTempValue(value); }, [value]);

    return (
        <div className="bg-[#0A1628]/60 border border-[#185FA5]/20 p-4 rounded-2xl group hover:border-[#C9A84C]/30 transition-all">
            {isEditing ? (
                <div className="flex items-center gap-3">
                    <span className="text-[#F5F0E8]/40 flex-shrink-0">{icon}</span>
                    <input
                        autoFocus
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') onSave(tempValue); if (e.key === 'Escape') onCancel(); }}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent text-sm font-bold text-white focus:outline-none placeholder:text-white/20"
                    />
                    <button onClick={() => onSave(tempValue)} className="p-1 text-emerald-400"><Check size={16} /></button>
                    <button onClick={onCancel} className="p-1 text-white/30 hover:text-white"><X size={16} /></button>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-[#F5F0E8]/40">{icon}</span>
                        <span className="text-sm font-bold text-[#F5F0E8]/60">
                            {value || <span className="italic opacity-40">{placeholder}</span>}
                        </span>
                    </div>
                    <Edit2
                        size={14}
                        className="text-[#F5F0E8]/20 hover:text-[#C9A84C] cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                        onClick={onEdit}
                    />
                </div>
            )}
        </div>
    );
}

function EditProfileModal({ isOpen, onClose, currentData, onSave }) {
    const [formData, setFormData] = useState(currentData);

    useEffect(() => { setFormData(currentData); }, [currentData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0A1628]/60 backdrop-blur-xl" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-[#0C2D5E]/90 border border-white/10 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

                <div className="p-8 space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Edit Profile</h2>
                            <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mt-1">Personal Identity & Academic Info</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Avatar placeholder */}
                        <div className="md:col-span-2 flex items-center gap-6 bg-white/5 p-6 rounded-[32px] border border-white/5">
                            <div className="relative w-20 h-20 rounded-full bg-[#0A1628] border-2 border-blue-500/30 flex items-center justify-center overflow-hidden">
                                <Camera className="text-blue-500" size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Profile Picture</h4>
                                <p className="text-xs text-[#F5F0E8]/40 mt-1">Synced from your Google account.</p>
                            </div>
                        </div>

                        <ModalInput label="Full Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. Manoj Patel" />
                        <ModalInput label="Branch / Major" value={formData.major} onChange={(v) => setFormData({ ...formData, major: v })} placeholder="e.g. Computer Science" />
                        <ModalInput label="University / Org" value={formData.university} onChange={(v) => setFormData({ ...formData, university: v })} placeholder="e.g. LPU" />

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60 ml-2">Tagline</label>
                            <textarea
                                value={formData.tagline}
                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                placeholder="A short line that describes you..."
                                className="w-full bg-[#0A1628]/40 border border-white/5 p-4 rounded-2xl text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-all h-24 resize-none placeholder:text-white/10"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-white/60 hover:bg-white/10 transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={() => onSave(formData)}
                            className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModalInput({ label, value, onChange, placeholder }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60 ml-2">{label}</label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#0A1628]/40 border border-white/5 p-4 rounded-2xl text-sm font-bold text-white placeholder:text-white/10 focus:border-blue-500/50 focus:bg-[#0A1628]/80 outline-none transition-all"
            />
        </div>
    );
}