"use client";
import React, { useState } from 'react';
import { Plus, Folder, MessageSquare, MoreHorizontal, Send, Settings, Bell, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePlan } from "@/lib/gemini";

export default function PlannerChat() {
    const [input, setInput] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [isThinking, setIsThinking] = useState(false);

    const scrollRef = React.useRef(null);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [chatHistory]); // Runs every time a message is added

    const handleSend = async () => {
        if (!input.trim()) return;
        const userQ = input;

        setChatHistory(prev => [...prev, { q: userQ, a: null }]);
        setInput("");
        setIsThinking(true);

        try {
            // 2. Call the REAL Gemini Brain
            // This 'await' tells the code to wait until Google sends the answer back
            const aiResponse = await generatePlan(userQ);

            // 3. Find the last item (the one with a: null) and fill it with the real AI text
            setChatHistory(prev => {
                const updated = [...prev];
                updated[updated.length - 1].a = aiResponse;
                return updated;
            });
        } catch (error) {
            console.error("Error calling Gemini:", error);
            // Optional: Show an error message in the chat
        } finally {
            // Stop the "Thinking" animation regardless of success or failure
            setIsThinking(false);
        }
    };

    return (
        <div className="flex h-screen w-screen bg-[#0A1628] overflow-hidden text-white">

            {/* 1. SIDEBAR (Matching your green circles) */}
            <aside className="w-72 border-r border-[#185FA5]/10 flex flex-col p-6 bg-[#0C2D5E]/10 backdrop-blur-xl">
                {/* Brand Section */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-[#0C2D5E] border border-[#185FA5] rounded-lg flex items-center justify-center">
                        <span className="font-bold text-[#C9A84C]">S</span>
                    </div>
                    <span className="text-xl font-black tracking-tighter">StudentOS</span>
                </div>

                <button className="w-full py-3 bg-[#0C2D5E]/50 border border-[#185FA5]/30 rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:bg-[#185FA5]/20 transition-all mb-8">
                    <Plus size={16} /> New Chat +
                </button>

                {/* Folders & History */}
                <div className="flex-grow space-y-8 overflow-y-auto">
                    <div>
                        <div className="px-2 py-1 border border-[#185FA5]/20 rounded-md w-fit mb-4">
                            <p className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold">Folders</p>
                        </div>
                        <div className="space-y-3 px-2 text-[#F5F0E8]/40 text-sm">
                            <p className="hover:text-white cursor-pointer transition-colors flex items-center gap-2"><Folder size={14} /> Physics Notes</p>
                            <p className="hover:text-white cursor-pointer transition-colors flex items-center gap-2"><Folder size={14} /> Project OS</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[9px] uppercase tracking-widest text-[#F5F0E8]/20 font-bold mb-4 px-2">History</p>
                        <div className="space-y-4 px-2">
                            {['Exam Prep', 'Weekly Schedule'].map(chat => (
                                <div key={chat} className="flex justify-between items-center text-[#F5F0E8]/40 hover:text-white cursor-pointer group">
                                    <div className="flex items-center gap-2 text-sm"><MessageSquare size={14} /> {chat}</div>
                                    <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">0</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Profile Section (Bottom Green Circle) */}
                <div className="pt-6 border-t border-[#185FA5]/10 flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center font-bold text-xs text-[#C9A84C]">Y</div>
                        <span className="font-bold text-sm text-[#F5F0E8]/60 group-hover:text-white">Profile</span>
                    </div>
                    <Settings size={16} className="text-[#F5F0E8]/20" />
                </div>
            </aside>

            {/* 2. MAIN BODY (The Workspace) */}
            <main className="flex-grow flex flex-col relative bg-[#0A1628]">

                {/* Top Header (Matching Sketch Title/Disclaimer/Icons) */}
                <header className="p-6 border-b border-[#185FA5]/10 flex justify-between items-center bg-[#0A1628]">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F5F0E8]/20">Title</span>
                    <p className="text-[10px] font-medium text-[#F5F0E8]/20 italic">Disclaimer: AI plans are for guidance only.</p>
                    <div className="flex gap-3">
                        <div className="w-2.5 h-2.5 rounded-full border border-[#185FA5]/40 hover:bg-[#C9A84C]/40 cursor-pointer" />
                        <div className="w-2.5 h-2.5 rounded-full border border-[#185FA5]/40 hover:bg-[#C9A84C]/40 cursor-pointer" />
                        <div className="w-2.5 h-2.5 rounded-full border border-[#185FA5]/40 hover:bg-[#C9A84C]/40 cursor-pointer" />
                    </div>
                </header>

                {/* Chat Feed */}
                <div ref={scrollRef} className="flex-grow overflow-y-auto p-10 pt-16">
                    <div className="max-w-4xl mx-auto space-y-12">
                        {chatHistory.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-10">
                                <h1 className="text-6xl font-black uppercase tracking-tighter">StudentOS</h1>
                                <p className="font-bold tracking-[0.5em] uppercase text-xs mt-4">Autonomous Planner</p>
                            </div>
                        )}

                        <AnimatePresence>
                            {chatHistory.map((item, index) => (
                                <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                    {/* Question */}
                                    <div className="flex justify-end">
                                        <div className="bg-[#185FA5]/10 border border-[#185FA5]/20 px-6 py-4 rounded-3xl rounded-tr-none">
                                            <p className="text-[9px] uppercase font-black text-[#C9A84C] mb-2">Your Request</p>
                                            <p className="text-xl font-bold">{item.q}</p>
                                        </div>
                                    </div>
                                    {/* Response */}
                                    <div className="flex justify-start">
                                        <div className="w-full bg-[#0C2D5E]/20 border border-[#185FA5]/10 p-8 rounded-[40px] rounded-tl-none">
                                            <p className="text-[9px] uppercase font-black text-[#C9A84C] mb-4 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-[#C9A84C] rounded-full" /> AI Planner Response
                                            </p>
                                            {item.a ? (
                                                <p className="text-[#F5F0E8]/70 text-lg leading-relaxed">{item.a}</p>
                                            ) : (
                                                <div className="animate-pulse space-y-3">
                                                    <div className="h-4 w-3/4 bg-white/5 rounded-full" />
                                                    <div className="h-4 w-1/2 bg-white/5 rounded-full" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 3. FLOATING CHAT BOX (Centered like sketch) */}
                <div className="p-12">
                    <div className="max-w-3xl mx-auto relative group">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="What to ask?"
                            className="w-full bg-[#0A1628] border border-[#185FA5]/30 rounded-2xl py-6 px-10 outline-none focus:border-[#C9A84C] transition-all text-white text-lg font-medium shadow-2xl"
                        />
                        <button onClick={handleSend} className="absolute right-5 top-1/2 -translate-y-1/2 p-4 bg-[#C9A84C] text-[#0A1628] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#C9A84C]/20">
                            <Send size={22} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
