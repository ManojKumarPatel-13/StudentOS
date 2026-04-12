"use client";
import React from 'react';
import { Calendar, CheckCircle2, Zap, Play, Target, Book, Clock, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
    return (
        <div className="grid grid-cols-12 gap-8">

            {/* LEFT & CENTER: CORE CONTENT (9 Columns) */}
            <div className="col-span-9 space-y-8">

                {/* TOP ROW: SCHEDULE & TASKS */}
                <div className="grid grid-cols-2 gap-8">
                    <SectionCard title="Today's Schedule" icon={<Calendar size={18} />}>
                        <div className="space-y-4">
                            <ScheduleItem time="09:00 AM" subject="Mathematics" color="#185FA5" />
                            <ScheduleItem time="11:30 AM" subject="Physics" color="#C9A84C" />
                            <ScheduleItem time="02:00 PM" subject="Chemistry" color="#185FA5" />
                            <ScheduleItem time="04:30 PM" subject="Biology" color="#2DD4BF" />
                        </div>
                    </SectionCard>

                    <SectionCard title="Ongoing Tasks" icon={<Target size={18} />}>
                        <div className="space-y-5">
                            <TaskItem label="Complete Physics Assignment" progress={60} />
                            <TaskItem label="Review Calculus Notes" progress={45} />
                            <TaskItem label="Prepare for Chemistry Quiz" progress={80} highlight />
                            <button className="w-full py-3 rounded-xl border border-[#185FA5]/20 text-[#F5F0E8]/30 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-colors">
                                + Add Task
                            </button>
                        </div>
                    </SectionCard>
                </div>

                {/* FOCUS SESSION WIDGET */}
                <div className="p-8 rounded-[32px] bg-gradient-to-br from-[#0C2D5E] to-[#0A1628] border border-[#185FA5]/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8">
                        <div className="w-20 h-20 rounded-full border-4 border-[#C9A84C] flex items-center justify-center font-black text-xl text-white">
                            42:15
                        </div>
                    </div>
                    <div className="space-y-6 max-w-md">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#185FA5]/20 border border-[#185FA5]/30 text-[10px] font-black text-[#C9A84C] tracking-widest uppercase">
                            ✨ AI Recommended
                        </div>
                        <h2 className="text-3xl font-black text-white">Next Focus Session</h2>
                        <p className="text-[#F5F0E8]/40 text-sm leading-relaxed">Deep work session optimized for your peak productivity hours.</p>
                        <div className="flex items-center gap-4 bg-[#0A1628]/40 p-4 rounded-2xl border border-[#185FA5]/10">
                            <div className="w-12 h-12 bg-[#185FA5] rounded-xl flex items-center justify-center shadow-lg"><Book size={24} /></div>
                            <div>
                                <h4 className="font-bold text-white">Advanced Calculus</h4>
                                <p className="text-xs text-[#F5F0E8]/40">Chapter 5: Integration Techniques</p>
                            </div>
                            <div className="ml-auto flex gap-4 text-sm font-bold">
                                <span className="text-[#C9A84C]">45 mins</span>
                                <span className="text-[#F5F0E8]/40">3:00 PM</span>
                            </div>
                        </div>
                        <button className="w-full py-4 bg-[#185FA5] hover:bg-[#185FA5]/80 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all">
                            <Play size={20} fill="currentColor" /> Start Session Now
                        </button>
                    </div>
                </div>

            </div>

            {/* RIGHT SIDEBAR: STATS & AI (3 Columns) */}
            <aside className="col-span-3 space-y-8">

                {/* QUOTE OF THE DAY */}
                <div className="p-6 rounded-3xl bg-[#C9A84C]/5 border border-[#C9A84C]/20 space-y-3">
                    <div className="flex items-center gap-2 text-[#C9A84C]">
                        <Zap size={16} fill="currentColor" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Quote of the day</span>
                    </div>
                    <p className="italic text-sm text-[#F5F0E8]/70 leading-relaxed font-medium">
                        "Success is the sum of small efforts repeated day in and day out."
                    </p>
                </div>

                {/* QUICK STATS */}
                <div className="p-8 rounded-[40px] bg-[#0C2D5E]/20 border border-[#185FA5]/10 text-center space-y-6">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Quick Stats</h4>
                    <div className="relative w-32 h-32 mx-auto">
                        <div className="absolute inset-0 rounded-full border-8 border-[#185FA5]/10" />
                        <div className="absolute inset-0 rounded-full border-8 border-[#C9A84C] border-t-transparent -rotate-45" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white leading-none">72%</span>
                            <span className="text-[8px] font-black text-[#F5F0E8]/40 uppercase tracking-tighter">Study Time</span>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-[#F5F0E8]/40 uppercase tracking-widest flex items-center justify-center gap-2">
                        <Clock size={12} /> 5.2 hours today
                    </div>
                    <div className="pt-4 space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-[#F5F0E8]/40">Weekly Progress</span>
                            <span className="text-[#C9A84C]">85%</span>
                        </div>
                        <div className="h-2 w-full bg-[#185FA5]/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#C9A84C]" style={{ width: '85%' }} />
                        </div>
                    </div>
                </div>

                {/* AI SUGGESTIONS */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#F5F0E8]/40">
                        <MessageSquare size={16} />
                        <span className="text-xs font-black uppercase tracking-widest">AI Suggestions</span>
                    </div>
                    <SuggestionCard label="Revise Physics Unit 3" sub="Based on your quiz performance" />
                    <SuggestionCard label="Try a quiz on Calculus" sub="You haven't practiced in 2 days" />
                </div>

            </aside>

        </div>
    );
}

// --- SUB-COMPONENTS ---

function SectionCard({ title, icon, children }) {
    return (
        <div className="p-8 rounded-[40px] bg-[#0C2D5E]/20 border border-[#185FA5]/10 space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
                <div className="text-[#F5F0E8]/20">{icon}</div>
            </div>
            {children}
        </div>
    );
}

function ScheduleItem({ time, subject, color }) {
    return (
        <div className="flex items-center gap-6">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <div className="flex-grow">
                <h4 className="font-bold text-white text-base">{subject}</h4>
                <p className="text-xs text-[#F5F0E8]/30 flex items-center gap-2"><Clock size={10} /> {time}</p>
            </div>
        </div>
    );
}

function TaskItem({ label, progress, highlight = false }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-[#185FA5]/30" />
                <span className="font-bold text-sm text-[#F5F0E8]/80">{label}</span>
            </div>
            <div className="pl-8 space-y-2">
                <div className="h-1.5 w-full bg-[#185FA5]/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#185FA5]" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#F5F0E8]/30 uppercase">{progress}% complete</span>
                    {highlight && <span className="text-[8px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-2 py-0.5 rounded-full">Almost done!</span>}
                </div>
            </div>
        </div>
    );
}

function SuggestionCard({ label, sub }) {
    return (
        <div className="p-5 rounded-3xl bg-[#0C2D5E]/20 border border-[#185FA5]/10 hover:border-[#C9A84C]/40 transition-all group cursor-pointer">
            <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#185FA5]/20 flex items-center justify-center text-[#185FA5] group-hover:text-[#C9A84C]">
                    <Zap size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-sm text-white">{label}</h4>
                    <p className="text-[10px] text-[#F5F0E8]/30 font-medium">{sub}</p>
                </div>
            </div>
        </div>
    );
}