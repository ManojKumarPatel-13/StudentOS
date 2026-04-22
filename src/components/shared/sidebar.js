'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, MessageSquare, Book, Rss, BarChart2, User } from 'lucide-react';

export default function Sidebar({ activePage }) {
    const router = useRouter();
    const pathname = usePathname(); // ✅ added

    const menuItems = [
        { icon: <Home size={20} />, label: "Home", path: "/dashboard", id: "home" },

        // ✅ ONLY CHANGE HERE
        { icon: <MessageSquare size={20} />, label: "Study Tools", path: "/study-tools", id: "study-tools" },

        { icon: <Book size={20} />, label: "Journal", path: "/journal", id: "journal" },
        { icon: <Rss size={20} />, label: "Feed", path: "/feed", id: "feed" },
        { icon: <BarChart2 size={20} />, label: "Analysis", path: "/analysis", id: "analysis" },
        { icon: <User size={20} />, label: "Profile", path: "/profile", id: "profile" },
    ];

    return (
        <aside className="w-64 border-r border-[#185FA5]/10 bg-[#0C2D5E]/20 backdrop-blur-xl p-6 flex flex-col fixed h-full z-50">
            
            {/* LOGO */}
            <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
                <div className="w-8 h-8 bg-[#0C2D5E] border border-[#185FA5] rounded-lg flex items-center justify-center">
                    <span className="font-bold text-[#C9A84C]">S</span>
                </div>
                <span className="text-xl font-black tracking-tighter text-white">StudentOS</span>
            </div>

            {/* NAV ITEMS */}
            <nav className="space-y-2 flex-grow">
                {menuItems.map((item) => {
                    // ✅ NEW ACTIVE LOGIC (no prop dependency)
                    const isActive = pathname.startsWith(item.path);

                    return (
                        <div
                            key={item.id}
                            onClick={() => router.push(item.path)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                                isActive
                                    ? 'bg-[#185FA5]/20 text-[#C9A84C] border border-[#185FA5]/20'
                                    : 'text-[#F5F0E8]/40 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            {item.icon}
                            <span className="font-bold text-sm tracking-wide">{item.label}</span>
                        </div>
                    );
                })}
            </nav>

            {/* SYSTEM STATUS */}
            <div className="mt-auto p-4 bg-[#185FA5]/5 rounded-2xl border border-[#185FA5]/10">
                <p className="text-[10px] text-[#185FA5] font-black uppercase tracking-widest mb-1">Status</p>
                <p className="text-[10px] text-[#F5F0E8]/40 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Gemini 3.1 Live
                </p>
            </div>
        </aside>
    );
}