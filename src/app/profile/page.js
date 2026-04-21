'use client';

import React, { useState, useEffect } from 'react';
import {
    User, Edit2, Share2, Flame, Clock, FileText,
    Sparkles, Code, Target, Plus, Globe, LogOut,
    ChevronRight, Eye, EyeOff, Check, X
} from 'lucide-react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import Sidebar from '@/components/shared/sidebar';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // Toggle Logic for Appearance
    const [theme, setTheme] = useState('dark');

    // Toggle Logic for Notifications (Individual states for simplicity)
    const [studyReminders, setStudyReminders] = useState(true);
    const [achievementAlerts, setAchievementAlerts] = useState(true);
    const [aiSuggestions, setAiSuggestions] = useState(false);
    const [emailDigest, setEmailDigest] = useState(true);

    // Dropdown Logic for Preferences
    const [landingPage, setLandingPage] = useState('Home');
    const [isOpen, setIsOpen] = useState(false);

    // State for Account Info
    const [account, setAccount] = useState({
        username: 'manojkpatel',
        fullName: 'Manoj Kumar Patel',
        email: 'manoj@studentos.dev',
        joinedDate: 'April 19, 2026',
        is2FAEnabled: false
    });

    // State to track which specific field is being edited
    const [editingField, setEditingField] = useState(null);

    // Security States
    const [showPassword, setShowPassword] = useState(false);

    // Function to sync individual fields to Firestore
    const updateAccountField = async (field, value) => {
        setAccount({ ...account, [field]: value });
        setEditingField(null); // Close edit mode

        if (auth.currentUser) {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, {
                [`accountInfo.${field}`]: value
            });
        }
    };

    const [aboutText, setAboutText] = useState("Hey! I'm Manoj, a Computer Science student at LPU...");
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [skillsList, setSkillsList] = useState(['React', 'TypeScript', 'Node.js', 'AI/ML', 'UI/UX Design', 'Python']);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [heroData, setHeroData] = useState({
        name: 'Manoj Kumar Patel',
        major: 'Computer Science',
        university: 'LPU',
        tagline: 'Building StudentOS & learning full-stack development. Passionate about AI...',
        photoURL: null
    });

    // Function to handle saving from the Modal
    const handleProfileUpdate = async (newData) => {
        setHeroData(newData);
        setIsModalOpen(false);

        if (auth.currentUser) {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, {
                "profile.hero": newData
            });
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-[#0A1628] flex items-center justify-center text-[#C9A84C] font-black uppercase tracking-widest text-xs">
            Initializing StudentOS...
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#0A1628] text-[#F5F0E8] font-sans selection:bg-[#185FA5]/30">
            <Sidebar activePage="profile" />

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* --- TOP SECTION: IDENTITY HERO --- */}
                    <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8 backdrop-blur-xl">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="flex gap-8 items-center">
                                {/* Avatar */}
                                <div className="relative w-32 h-32">
                                    <div className="absolute -inset-1 bg-gradient-to-tr from-[#185FA5] to-purple-500 rounded-full blur opacity-40"></div>
                                    <div className="relative w-full h-full rounded-full bg-[#0A1628] border-4 border-[#0C2D5E] flex items-center justify-center overflow-hidden">
                                        {user?.photoURL ? (
                                            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl font-black text-[#C9A84C]">MK</span>
                                        )}
                                    </div>
                                </div>
                                {/* Name & Bio */}
                                <div>
                                    <h1 className="text-4xl font-black">{heroData.name}</h1>
                                    <p className="...">
                                        {heroData.major} • {heroData.university}
                                    </p>
                                    <p className="text-[#F5F0E8]/40 text-sm mt-4 max-w-xl leading-relaxed">
                                        Building StudentOS & learning full-stack development. Passionate about AI, web technologies, and creating tools that help students learn better.
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsModalOpen(true)} // This triggers the modal
                                    className="..."
                                >
                                    <Edit2 size={16} /> Edit Profile
                                </button>
                                <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                                    <Share2 size={20} className="text-[#F5F0E8]/60" />
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                            <StatCard icon={<Flame className="text-orange-500" />} val="12" label="Day Streak" />
                            <StatCard icon={<Clock className="text-blue-400" />} val="156" label="Hours" />
                            <StatCard icon={<FileText className="text-purple-400" />} val="47" label="Notes" />
                        </div>
                    </div>

                    <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8 backdrop-blur-xl space-y-8">
                        {/* About Me Section */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <Sparkles size={20} className="text-[#C9A84C]" /> About Me
                                </h3>
                                <button
                                    onClick={() => setIsEditingAbout(!isEditingAbout)}
                                    className="p-2 hover:bg-white/5 rounded-xl text-[#F5F0E8]/20 hover:text-[#C9A84C] transition-all"
                                >
                                    {isEditingAbout ? <Check size={18} /> : <Edit2 size={18} />}
                                </button>
                            </div>

                            {isEditingAbout ? (
                                <textarea
                                    value={aboutText}
                                    onChange={(e) => setAboutText(e.target.value)}
                                    className="w-full bg-[#0A1628]/60 border border-[#C9A84C]/30 rounded-3xl p-6 text-[#F5F0E8]/60 text-sm leading-relaxed focus:outline-none focus:border-[#C9A84C] h-32"
                                />
                            ) : (
                                <div className="bg-[#0A1628]/40 border border-[#185FA5]/10 rounded-3xl p-6 text-[#F5F0E8]/60 text-sm leading-relaxed">
                                    {aboutText}
                                </div>
                            )}
                        </div>

                        {/* Skills Section */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                                    <Code size={18} className="text-[#F5F0E8]/40" /> Skills & Interests
                                </h3>
                                <button
                                    onClick={() => setIsDeleteMode(!isDeleteMode)}
                                    className={`p-2 rounded-xl transition-all ${isDeleteMode ? 'bg-red-500/20 text-red-400' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'}`}
                                >
                                    {isDeleteMode ? <X size={18} /> : <Plus size={18} />}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {skillsList.map((skill) => (
                                    <div key={skill} className="relative group">
                                        <SkillTag label={skill} color="bg-[#185FA5]/20 border border-[#185FA5]/30" />
                                        {isDeleteMode && (
                                            <button
                                                onClick={() => setSkillsList(skillsList.filter(s => s !== skill))}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                                            >
                                                <X size={10} strokeWidth={4} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- LEARNING GOALS --- */}
                    <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <Target size={22} className="text-emerald-400" /> Current Learning Goals
                            </h3>
                            <a
                                href="/journal" // This points to your journal page
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#185FA5] hover:text-blue-400 transition-colors group"
                            >
                                View Goals <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                        <div className="space-y-6">
                            <ProgressBar label="Master Advanced React Patterns" progress={75} color="bg-blue-400" />
                            <ProgressBar label="Complete Full-Stack Development Course" progress={60} color="bg-pink-500" />
                            <ProgressBar label="Build 3 Real-World Projects" progress={33} color="bg-emerald-500" />
                            <ProgressBar label="Contribute to Open Source" progress={45} color="bg-orange-500" />
                        </div>
                    </div>

                    {/* --- SETTINGS SECTION --- */}
                    <h2 className="text-3xl font-black text-white pt-8">Settings</h2>

                    {/* Account Info */}
                    <div className="w-full bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-6 backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-6"> {/* Reduced margin-bottom */}
                            <User size={20} className="text-blue-400" />
                            <h2 className="text-xl font-black text-white">Account Information</h2>
                        </div>

                        {/* IDENTITY GRID - 4 Columns for better space usage */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Reduced gap */}
                            <EditableField
                                label="Username"
                                value={account.username}
                                isEditing={editingField === 'username'}
                                onEdit={() => setEditingField('username')}
                                onSave={(val) => updateAccountField('username', val)}
                            />
                            <EditableField
                                label="Full Name"
                                value={account.fullName}
                                isEditing={editingField === 'fullName'}
                                onEdit={() => setEditingField('fullName')}
                                onSave={(val) => updateAccountField('fullName', val)}
                            />
                            <EditableField
                                label="Email"
                                value={account.email}
                                isEditing={editingField === 'email'}
                                onEdit={() => setEditingField('email')}
                                onSave={(val) => updateAccountField('email', val)}
                            />
                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/60">Joined Date</p>
                                <div className="bg-[#0A1628]/60 border border-[#185FA5]/20 px-8 h-[60px] rounded-2xl flex items-center text-sm font-bold text-[#F5F0E8]/40">
                                    {account.joinedDate}
                                </div>
                            </div>
                        </div>

                        {/* SECURITY DIVIDER - Tightened */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[#185FA5]/20 to-transparent my-6" /> {/* Reduced vertical margin */}

                        {/* SECURITY SECTION - Side by side */}
                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black text-[#F5F0E8]/30 uppercase tracking-[0.3em]">Security</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Side-by-side on desktop */}
                                {/* Password Management */}
                                <div className="bg-[#0A1628]/60 border border-[#185FA5]/10 p-4 rounded-2xl flex items-center justify-between"> {/* Reduced padding */}
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase text-blue-400/40 mb-1">Password</p>
                                        <p className="font-mono text-sm tracking-widest text-white truncate">
                                            {showPassword ? "StudentOS#2026" : "••••••••••••"}
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

                                {/* 2FA Toggle */}
                                <div className="bg-[#0A1628]/60 border border-[#185FA5]/10 p-4 rounded-2xl flex items-center justify-between"> {/* Reduced padding */}
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-emerald-400/40 mb-1">Security Level</p>
                                        <p className="font-bold text-xs text-white">Two-Factor Auth</p>
                                    </div>
                                    <div
                                        onClick={() => updateAccountField('is2FAEnabled', !account.is2FAEnabled)}
                                        className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-all flex items-center ${account.is2FAEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full transition-all ${account.is2FAEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Appearance Card */}
                        <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8">
                            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">Appearance</h3>
                            <div className="flex bg-[#0A1628]/60 p-1 rounded-2xl border border-white/5">
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${theme === 'dark' ? 'bg-[#185FA5] text-white shadow-lg' : 'text-slate-500'}`}
                                >
                                    Dark
                                </button>
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${theme === 'light' ? 'bg-[#185FA5] text-white shadow-lg' : 'text-slate-500'}`}
                                >
                                    Light
                                </button>
                            </div>
                        </div>

                        {/* Preferences Card (Dropdown) */}
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
                                    {['Home', 'AI Assistant', 'Journal', 'Analysis'].map((item) => (
                                        <div
                                            key={item}
                                            onClick={() => { setLandingPage(item); setIsOpen(false); }}
                                            className="p-4 hover:bg-[#185FA5]/40 cursor-pointer font-bold border-b border-white/5 last:border-none"
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notifications Card */}
                        <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8">
                            <h3 className="text-lg font-black text-white mb-8">Notifications</h3>
                            <div className="space-y-6">
                                <SwitchItem label="Study Reminders" active={studyReminders} onToggle={() => setStudyReminders(!studyReminders)} />
                                <SwitchItem label="Achievement Alerts" active={achievementAlerts} onToggle={() => setAchievementAlerts(!achievementAlerts)} />
                                <SwitchItem label="AI Suggestions" active={aiSuggestions} onToggle={() => setAiSuggestions(!aiSuggestions)} />
                                <SwitchItem label="Email Digest" active={emailDigest} onToggle={() => setEmailDigest(!emailDigest)} />
                            </div>
                        </div>

                        {/* Social Profiles Card */}
                        <div className="bg-[#0C2D5E]/20 border border-[#185FA5]/10 rounded-[40px] p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-white">Social Profiles</h3>
                                <button className="p-2 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/40 transition-all">
                                    <Plus size={18} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { icon: <FaGithub size={18} />, url: 'github.com/manojkpatel' },
                                    { icon: <FaLinkedin size={18} />, url: 'linkedin.com/in/manojkpatel' },
                                    { icon: <Globe size={18} />, url: 'manojpatel.dev' }
                                ].map((social, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-[#0A1628]/60 border border-[#185FA5]/20 p-4 rounded-2xl group hover:border-[#C9A84C]/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[#F5F0E8]/40">{social.icon}</span>
                                            <span className="text-sm font-bold">{social.url}</span>
                                        </div>
                                        <Edit2 size={14} className="text-[#F5F0E8]/20 hover:text-[#C9A84C] cursor-pointer transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Session Management */}
                        <div className="md:col-span-2 bg-red-500/5 border border-red-500/10 rounded-[40px] p-8 space-y-6">
                            <h3 className="text-lg font-black text-red-400 flex items-center gap-3">
                                <LogOut size={20} /> Session
                            </h3>
                            <button className="w-full py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 font-bold flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all">
                                <LogOut size={18} /> Logout from StudentOS
                            </button>
                        </div>
                    </div>
                </div >
                <EditProfileModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    currentData={heroData}
                    onSave={handleProfileUpdate}
                />
            </main >
        </div >
    );
}

// --- SUB-COMPONENTS (Built into same file as requested) ---

function StatCard({ icon, val, label }) {
    return (
        <div className="bg-[#0A1628]/40 border border-[#185FA5]/10 rounded-3xl p-8 flex flex-col items-center justify-center hover:border-[#185FA5]/30 transition-all group">
            <div className="mb-4 transform group-hover:scale-110 transition-transform">{icon}</div>
            <span className="text-4xl font-black text-white leading-none">{val}</span>
            <span className="text-xs font-bold text-[#F5F0E8]/30 uppercase tracking-widest mt-2">{label}</span>
        </div>
    );
}

function SkillTag({ label, color }) {
    return (
        <span className={`${color} px-5 py-2.5 rounded-full text-xs font-black text-white shadow-lg`}>
            {label}
        </span>
    );
}

function ProgressBar({ label, progress, color }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#F5F0E8]/80">{label}</span>
                <span className="text-xs font-black text-white">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-[#185FA5]/10 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}

function InputGroup({ label, value, color }) {
    return (
        <div className="space-y-2 group">
            <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${color} opacity-60`}>
                <span className="mr-2 opacity-50">•</span> {label}
            </label>
            <div className="bg-[#0A1628]/60 border border-[#185FA5]/20 p-5 rounded-2xl font-bold text-sm text-white/80 group-hover:border-[#185FA5]/40 transition-all">
                {value}
            </div>
        </div>
    );
}

function ToggleItem({ label, active }) {
    return (
        <div className="flex justify-between items-center py-1">
            <span className="font-bold text-sm text-[#F5F0E8]/80">{label}</span>
            <div className={`w-11 h-6 rounded-full relative cursor-pointer p-1 transition-all ${active ? 'bg-[#185FA5]' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${active ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
        </div>
    );
}

function SocialItem({ icon, label }) {
    return (
        <div className="flex items-center gap-4 bg-[#0A1628]/60 border border-[#185FA5]/20 p-4 rounded-2xl group cursor-pointer hover:border-[#185FA5]/40 transition-all">
            <div className="text-[#F5F0E8]/40 group-hover:text-emerald-400 transition-all">{icon}</div>
            <span className="text-sm font-bold text-[#F5F0E8]/60 group-hover:text-[#F5F0E8] transition-all">{label}</span>
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

function EditableField({ label, value, isEditing, onEdit, onSave }) {
    const [tempValue, setTempValue] = useState(value);

    return (
        <div className="space-y-2 group">
            <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60">{label}</p>
                {!isEditing && (
                    <Edit2
                        size={12}
                        className="text-[#F5F0E8]/20 cursor-pointer hover:text-[#C9A84C] transition-all opacity-0 group-hover:opacity-100"
                        onClick={onEdit}
                    />
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
                    <Check
                        size={16}
                        className="absolute right-5 text-emerald-400 cursor-pointer"
                        onClick={() => onSave(tempValue)}
                    />
                </div>
            ) : (
                <div
                    onClick={onEdit}
                    className="bg-[#0A1628]/60 border border-[#185FA5]/10 p-5 rounded-2xl font-bold text-sm text-[#F5F0E8] cursor-text hover:border-[#185FA5]/40 transition-all"
                >
                    {value}
                </div>
            )}
        </div>
    );
}

function EditProfileModal({ isOpen, onClose, currentData, onSave }) {
    const [formData, setFormData] = useState(currentData);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with heavy blur */}
            <div className="absolute inset-0 bg-[#0A1628]/40 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />

            {/* Modal Window */}
            <div className="relative w-full max-w-2xl bg-[#0C2D5E]/80 border border-white/10 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Glow Header decorative element */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

                <div className="p-8 space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Profile Settings</h2>
                            <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mt-1">Personal Identity & Academic Info</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Avatar Edit Section */}
                        <div className="md:col-span-2 flex items-center gap-6 bg-white/5 p-6 rounded-[32px] border border-white/5">
                            <div className="relative group">
                                <div className="w-20 h-20 rounded-full bg-[#0A1628] border-2 border-blue-500/30 flex items-center justify-center overflow-hidden">
                                    <Camera className="text-blue-500 group-hover:scale-110 transition-transform" size={24} />
                                </div>
                                <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                                    <Plus size={20} className="text-white" />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Profile Picture</h4>
                                <p className="text-xs text-[#F5F0E8]/40 mt-1">PNG or JPG. Max 5MB.</p>
                            </div>
                        </div>

                        <ModalInput label="Full Name" value={formData.name} onChange={(val) => setFormData({ ...formData, name: val })} placeholder="e.g. Manoj Patel" />
                        <ModalInput label="Branch / Major" value={formData.major} onChange={(val) => setFormData({ ...formData, major: val })} placeholder="e.g. Computer Science" />
                        <ModalInput label="University / Org" value={formData.university} onChange={(val) => setFormData({ ...formData, university: val })} placeholder="e.g. LPU" />

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60 ml-2">Heading Tagline</label>
                            <textarea
                                value={formData.tagline}
                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                className="w-full bg-[#0A1628]/40 border border-white/5 p-4 rounded-2xl text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-all h-24 resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-white/60 hover:bg-white/10 transition-all">Cancel</button>
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

// Helper Input for Modal
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