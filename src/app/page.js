"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, MessageSquare, Camera, Calendar, BookOpen } from "lucide-react";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Control sidebar toggle

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A1628] text-[#FFFFFF] font-sans overflow-x-hidden w-full relative">
      {/* 1. NAVBAR */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#185FA5]/20 backdrop-blur-xl bg-[#0A1628]/90">
        <div className="w-full px-8 h-20 flex items-center">

          <div className="flex items-center gap-5 flex-none">
            {/* FUNCTIONAL HAMBURGER */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group relative z-[60]"
            >
              {isSidebarOpen ? (
                <X className="w-6 h-6 text-[#C9A84C]" />
              ) : (
                <Menu className="w-6 h-6 text-[#F5F0E8]/70 group-hover:text-[#C9A84C]" />
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0C2D5E] border border-[#185FA5] rounded-xl flex items-center justify-center shadow-lg">
                <span className="font-bold text-xl text-[#C9A84C]">S</span>
              </div>
              <span className="text-2xl font-black tracking-tighter">StudentOS</span>
            </div>
          </div>

          <div className="hidden md:flex flex-grow justify-center items-center gap-10 text-[11px] font-black text-[#F5F0E8]/40 uppercase tracking-[0.2em]">
            <Link href="#about" className="hover:text-[#C9A84C] transition-colors tracking-widest">About</Link>
            <Link href="#features" className="hover:text-[#C9A84C] transition-colors tracking-widest">Features</Link>
            <Link href="#faqs" className="hover:text-[#C9A84C] transition-colors tracking-widest">FAQs</Link>
          </div>

          <div className="flex items-center gap-8 flex-none mr-4">
            <Link href="/login" className="text-sm font-bold text-[#F5F0E8]/50 hover:text-[#FFFFFF] transition-colors">Login</Link>
            <Link href="/login">
              <button className="px-7 py-2.5 bg-[#0C2D5E] border border-[#185FA5] hover:bg-[#185FA5] text-[#FFFFFF] rounded-full text-sm font-bold shadow-lg transition-all active:scale-95">
                Sign Up
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="grid lg:grid-cols-[auto_1fr] pt-20 min-h-screen">

        {/* 2. FIXED SIDEBAR */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              animate={{
                width: isSidebarOpen ? (isScrolled ? 70 : 200) : 0, // Synced to 200
                x: isSidebarOpen ? 0 : -200
              }}
              className={`fixed left-0 top-20 h-[calc(100vh-80px)] bg-[#0C2D5E]/40 border-r border-[#185FA5]/10 flex flex-col p-5 z-[40] backdrop-blur-sm overflow-hidden ${isScrolled ? 'items-center' : 'items-start'}`}
            >
              <div className="space-y-4 pt-4">
                <SidebarItem icon={<MessageSquare size={18} />} label="Ask AI" shrunk={isScrolled} />
                <SidebarItem icon={<Camera size={18} />} label="Capture" shrunk={isScrolled} />
                <SidebarItem icon={<Calendar size={18} />} label="Planner" shrunk={isScrolled} />
                <SidebarItem icon={<BookOpen size={18} />} label="Quiz" shrunk={isScrolled} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* 3. MAIN CONTENT AREA */}
        <main
          className="transition-all duration-300 ease-in-out min-h-screen bg-[#0A1628]"
          style={{ paddingLeft: isSidebarOpen ? (isScrolled ? '70px' : '200px') : '0px' }}
        >
          {/* The 'flex-grow' ensures this section takes up all available space below the navbar */}
          <section className="relative px-8 lg:px-16 flex items-center min-h-[calc(100vh-80px)] overflow-hidden">
            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

              {/* LEFT CONTENT */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0C2D5E] border border-[#185FA5]/30 text-[9px] font-black text-[#C9A84C] tracking-[0.2em] uppercase w-fit">
                    Integrated Study Platform
                  </div>

                  <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] tracking-tight text-white">
                    Your AI-powered <br />
                    <span className="bg-gradient-to-r from-[#185FA5] via-[#C9A84C] to-[#C9A84C] bg-clip-text text-transparent italic">
                      study system
                    </span>
                  </h1>

                  <p className="text-base text-[#F5F0E8]/40 max-w-sm leading-relaxed pt-2">
                    Capture lectures, plan smarter, and learn faster with the central nervous system for students.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 pt-8">
                  <button className="px-10 py-4 bg-[#C9A84C] text-[#0A1628] rounded-2xl font-black text-lg shadow-xl shadow-[#C9A84C]/20 hover:scale-105 transition-transform active:scale-95">
                    Get Started
                  </button>
                  <button className="px-10 py-4 border-2 border-[#185FA5] text-[#FFFFFF] rounded-2xl font-black text-lg hover:bg-[#185FA5]/10 transition-all">
                    Try Demo
                  </button>
                </div>
              </div>

              {/* RIGHT CARD */}
              <div className="lg:col-span-5 flex items-center justify-end">
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="w-full max-w-[480px] relative group"
                >
                  <div className="bg-[#F5F0E8]/5 border border-[#185FA5]/20 backdrop-blur-3xl rounded-[40px] p-8 lg:p-10 shadow-2xl relative z-10">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="space-y-6">
                        <div className="p-5 bg-[#0C2D5E]/60 rounded-2xl border border-[#185FA5]/20">
                          <p className="text-[10px] text-[#C9A84C] uppercase font-black mb-1 tracking-widest">Your Question:</p>
                          <p className="font-bold text-lg text-[#F5F0E8]">Explain Newton's Laws</p>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 text-[#C9A84C] font-black text-xs uppercase tracking-widest">
                            <span className="w-5 h-5 bg-[#C9A84C]/20 rounded-lg flex items-center justify-center">✨</span>
                            AI Response
                          </div>
                          <p className="text-[#F5F0E8]/70 text-sm lg:text-base leading-relaxed">
                            1. <strong className="text-white">First Law (Inertia)</strong>: An object at rest stays at rest unless acted upon by an external force...
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                  <div className="absolute -inset-4 bg-[#185FA5]/10 blur-3xl -z-10 rounded-full"></div>
                </motion.div>
              </div>

            </div>
          </section>

          {/*ABOUT SECTION */}
          <section id="about" className="relative px-8 lg:px-16 min-h-screen flex items-center bg-[#0A1628] border-t border-[#185FA5]/10">

            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

              {/* Visual Side: The "App Preview" */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative order-2 lg:order-1"
              >
                {/* Decorative Glow behind the preview */}
                <div className="absolute -inset-10 bg-[#C9A84C]/5 blur-[100px] rounded-full" />

                <div className="relative z-10 bg-[#0C2D5E]/30 border border-[#185FA5]/20 backdrop-blur-2xl rounded-[32px] p-6 shadow-2xl overflow-hidden group">
                  {/* Mock App Header */}
                  <div className="flex items-center gap-2 mb-6 border-b border-[#185FA5]/10 pb-4">
                    <div className="w-3 h-3 rounded-full bg-[#185FA5]/30" />
                    <div className="w-3 h-3 rounded-full bg-[#185FA5]/30" />
                    <div className="w-3 h-3 rounded-full bg-[#185FA5]/30" />
                  </div>

                  {/* Mock UI Content */}
                  <div className="space-y-4">
                    <div className="h-4 w-1/3 bg-[#C9A84C]/20 rounded-md" />
                    <div className="h-32 w-full bg-[#185FA5]/10 rounded-xl border border-[#185FA5]/10 flex items-center justify-center">
                      <div className="text-[#C9A84C]/40 font-black text-xs tracking-tighter uppercase">Workspace Preview</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-20 bg-[#F5F0E8]/5 rounded-xl border border-[#185FA5]/10" />
                      <div className="h-20 bg-[#F5F0E8]/5 rounded-xl border border-[#185FA5]/10" />
                    </div>
                  </div>

                  {/* Floating Label */}
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute top-1/2 -right-4 bg-[#C9A84C] text-[#0A1628] px-4 py-2 rounded-lg font-black text-[10px] shadow-xl"
                  >
                    v1.0 LIVE
                  </motion.div>
                </div>
              </motion.div>

              {/* Text Side: The "What is StudentOS" */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-1 lg:order-2 space-y-8"
              >
                <div className="space-y-4">
                  <h2 className="text-[#C9A84C] text-xs font-black uppercase tracking-[0.4em]">The Platform</h2>
                  <h3 className="text-4xl lg:text-6xl font-black text-white leading-tight">
                    Everything you need, <br />
                    <span className="text-[#F5F0E8]/30 italic">in one place.</span>
                  </h3>
                </div>

                <p className="text-lg text-[#F5F0E8]/60 leading-relaxed max-w-lg">
                  StudentOS is an all-in-one productivity engine built specifically for students. We’ve combined a high-performance workspace with custom AI models to manage your notes, track your assignments, and tutor you through complex topics.
                </p>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div>
                    <h4 className="text-white font-black text-xl mb-1">99.9%</h4>
                    <p className="text-xs text-[#F5F0E8]/40 uppercase font-bold tracking-widest">Uptime Reliable</p>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-xl mb-1">0.1s</h4>
                    <p className="text-xs text-[#F5F0E8]/40 uppercase font-bold tracking-widest">AI Response Time</p>
                  </div>
                </div>
              </motion.div>

            </div>
          </section>
        </main>
      </div>
    </div >
  );
}

function SidebarItem({ icon, label, shrunk }) {
  return (
    <div className={`flex items-center gap-4 p-3.5 rounded-xl cursor-pointer hover:bg-[#185FA5]/10 transition-all group ${shrunk ? "justify-center" : ""}`}>
      <span className="text-[#F5F0E8]/30 group-hover:text-[#C9A84C] transition-colors">{icon}</span>
      {!shrunk && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-bold text-xs text-[#F5F0E8]/30 group-hover:text-[#C9A84C] whitespace-nowrap uppercase tracking-wider"
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}