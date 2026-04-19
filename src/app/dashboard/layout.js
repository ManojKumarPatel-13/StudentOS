import React from 'react';
import Sidebar from '../../components/shared/sidebar';
import { Home, MessageSquare, Book, Rss, BarChart2, User, Search, Bell } from 'lucide-react';

export default function DashboardLayout({ children }) {
    return (
        <div className="flex min-h-screen bg-[#0A1628] text-white font-sans">
            {/* SIDEBAR */}
            <Sidebar activePage="home" />


            {/* MAIN CONTENT AREA */}
            <main className="flex-grow ml-64 p-8">
                {/* HEADER */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3">
                            Welcome back, Yashraj <span className="animate-bounce">👋</span>
                        </h1>
                        <p className="text-[#F5F0E8]/40 text-sm font-medium mt-1">Your AI-powered study system</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2.5 rounded-xl bg-[#0C2D5E]/50 border border-[#185FA5]/20 text-[#F5F0E8]/40 hover:text-[#C9A84C]">
                            <Search size={20} />
                        </button>
                        <button className="p-2.5 rounded-xl bg-[#0C2D5E]/50 border border-[#185FA5]/20 text-[#F5F0E8]/40 hover:text-[#C9A84C] relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-[#C9A84C] rounded-full" />
                        </button>
                    </div>
                </header>

                {children}
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false }) {
    return (
        <div className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-[#185FA5]/20 text-[#C9A84C] border border-[#185FA5]/20' : 'text-[#F5F0E8]/40 hover:bg-white/5 hover:text-white'}`}>
            {icon}
            <span className="font-bold text-sm tracking-wide">{label}</span>
        </div>
    );
}