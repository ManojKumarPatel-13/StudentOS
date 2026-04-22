"use client";

import Sidebar from "@/components/shared/sidebar";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

export default function StudyTools() {
  const router = useRouter();
<div className="ml-64 min-h-screen px-10 py-10"></div>
  return (
    <div className="flex min-h-screen bg-[#071326] text-white">

      {/* SIDEBAR */}
      <div className="w-[260px] shrink-0">
        <Sidebar activePage="assistant" />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 px-10 py-10 relative overflow-hidden">

        {/* BACKGROUND LIGHT */}
        <div className="absolute top-[-200px] left-[200px] w-[500px] h-[500px] bg-blue-600/20 blur-[150px]"></div>
        <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-purple-600/20 blur-[150px]"></div>

        {/* HEADER */}
        <h1 className="text-5xl font-bold mb-2">Study Tools</h1>
        <p className="text-gray-400 mb-8">
          Powerful tools to supercharge your learning
        </p>

        {/* SEARCH */}
        <div className="flex gap-3 mb-10 max-w-xl">
          <input
            placeholder="Search tools..."
            className="flex-1 px-5 py-3 rounded-xl bg-[#0d1b2f] border border-white/10 focus:outline-none focus:border-blue-500"
          />
          
          {/* ✅ FILTER ICON BUTTON */}
          <button className="px-4 rounded-xl bg-[#0d1b2f] border border-white/10 hover:bg-white/5 transition flex items-center justify-center">
            <SlidersHorizontal size={18} className="text-gray-300" />
          </button>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-3 gap-8">

          {/* LEFT CARDS */}
          <div className="col-span-2 grid grid-cols-2 gap-8">

            {[
              {
                title: "AI Assistant",
                desc: "Get instant answers to any question. Powered by advanced AI to help you learn faster and understand complex topics.",
                btn: "Start Chat →",
                gradient: "from-blue-500 to-cyan-500",
                path: "/study-tools/ai",
              },
              {
                title: "Notes Generator",
                desc: "Transform your ideas into well-structured, organized notes instantly with intelligent formatting and categorization.",
                btn: "Create Notes →",
                gradient: "from-pink-500 to-purple-500",
                path: "/study-tools/note",
              },
              {
                title: "Study Planner",
                desc: "Create personalized study plans based on your goals and time.",
                btn: "Create Plan →",
                gradient: "from-indigo-500 to-purple-500",
                path: "/study-tools/planner",
              },
              {
                title: "Quiz Generator",
                desc: "Create custom quizzes from any topic to test your knowledge effectively.",
                btn: "Generate Quiz →",
                gradient: "from-cyan-500 to-blue-500",
                path: "/study-tools/quiz",
              },
            ].map((tool, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative p-7 rounded-2xl 
                bg-gradient-to-br from-[#0f1c34]/80 to-[#0a1628]/80 
                border border-white/5 
                backdrop-blur-2xl 
                shadow-[0_10px_40px_rgba(0,0,0,0.6)] 
                overflow-hidden group transition duration-300"
              >

                {/* HOVER LIGHT */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-white/10 via-transparent to-transparent"></div>

                <div className="relative z-10">
                  <h2 className="text-xl font-semibold mb-3">
                    {tool.title}
                  </h2>

                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    {tool.desc}
                  </p>

                  <motion.button
                    onClick={() => router.push(tool.path)}
                    whileHover={{ backgroundPosition: "100% 0%" }}
                    transition={{ duration: 0.4 }}
                    className={`w-full py-2 rounded-lg bg-gradient-to-r ${tool.gradient} bg-[length:200%_100%]`}
                  >
                    {tool.btn}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* RIGHT PANEL */}
          <div className="space-y-6">

            <div className="p-6 rounded-2xl bg-[#0d1b2f]/80 border border-white/5 backdrop-blur-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>

              <div className="space-y-3 text-sm text-gray-400">
                <div>AI Assistant • 2 min ago</div>
                <div>Quiz Generator • 15 min ago</div>
                <div>Notes Generator • 1 hour ago</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-700/40 to-pink-600/40 border border-purple-500/20 backdrop-blur-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Recommended</h3>

              <p className="text-gray-300 text-sm mb-4">
                Study Planner helps you organize your schedule with AI-powered planning.
              </p>

              <motion.button
                whileHover={{ backgroundPosition: "100% 0%" }}
                transition={{ duration: 0.4 }}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 bg-[length:200%_100%]"
              >
                Try it now →
              </motion.button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}