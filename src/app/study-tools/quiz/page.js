"use client";

import Sidebar from "@/components/shared/sidebar";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useState } from "react";

export default function QuizPage() {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questions, setQuestions] = useState(5);

  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);

  const handleStartQuiz = async () => {
      console.log("BUTTON CLICKED");   // 👈 add this
  try {
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        difficulty,
        questions,
      }),
    });

    const data = await res.json();
    console.log("API RESPONSE:", data);

    if (data.success) {
      localStorage.setItem("quiz", JSON.stringify(data.quiz));
      router.push("/study-tools/quiz/play");
    }

  } catch (err) {
    console.log(err);
  }
};


  return (
    // ✅ FIX 1: removed min-h-screen → added h-screen + overflow-hidden
    <div className="flex h-screen overflow-hidden bg-[#071326] text-white">

      {/* ✅ SIDEBAR */}
      <Sidebar />

      {/* ✅ MAIN CONTENT */}
      {/* ✅ FIX 2: reduced vertical padding + prevent overflow */}
      <div className="flex-1 ml-64 px-10 py-6 overflow-hidden">

        {/* 🔙 BACK */}
        <div
          onClick={() => router.push("/study-tools")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer mb-5 transition"
        >
          <ArrowLeft size={16} />
          Back to Study Tools
        </div>

        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="text-cyan-400" />
            <h1 className="text-4xl font-bold">Quiz Generator</h1>
          </div>
          <p className="text-gray-400 mt-2">
            Test your knowledge with interactive quizzes
          </p>
        </div>

        {/* GRID */}
        {/* ✅ FIX 3: slightly reduce gap */}
        <div className="grid grid-cols-3 gap-6 h-full">

          {/* LEFT SIDE */}
          <div className="col-span-2">

            <div className="bg-[#0d1b2f]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">

              {/* BADGE */}
              <span className="inline-block mb-5 px-3 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded-full">
                AI Powered Quiz
              </span>

              {/* TOPIC */}
              <div className="mb-5">
                <label className="text-sm text-gray-300 mb-2 block">
                  Topic
                </label>

                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. DBMS, Physics, DSA..."
                  className="w-full px-4 py-3 rounded-xl bg-[#071326] border border-white/10 focus:outline-none focus:border-cyan-400"
                />

                <p className="text-xs text-gray-400 mt-2">
                  💡 Example: "Binary Trees"
                </p>
              </div>

              {/* CUSTOM DROPDOWNS */}
              <div className="grid grid-cols-2 gap-5 mb-5 relative z-50">

                {/* DIFFICULTY */}
                <div className="relative">
                  <div
                    onClick={() => {
                      setShowDifficulty(!showDifficulty);
                      setShowQuestions(false);
                    }}
                    className="px-4 py-3 rounded-xl bg-[#071326] border border-white/10 cursor-pointer hover:border-cyan-400 transition"
                  >
                    {difficulty}
                  </div>

                  {showDifficulty && (
                    <div className="absolute top-full mt-2 w-full bg-[#0d1b2f] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                      {["Easy", "Medium", "Hard"].map((item) => (
                        <div
                          key={item}
                          onClick={() => {
                            setDifficulty(item);
                            setShowDifficulty(false);
                          }}
                          className={`px-4 py-3 cursor-pointer hover:bg-cyan-500/10 ${
                            difficulty === item
                              ? "bg-cyan-500/20 text-cyan-400"
                              : ""
                          }`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* QUESTIONS */}
                <div className="relative">
                  <div
                    onClick={() => {
                      setShowQuestions(!showQuestions);
                      setShowDifficulty(false);
                    }}
                    className="px-4 py-3 rounded-xl bg-[#071326] border border-white/10 cursor-pointer hover:border-cyan-400 transition"
                  >
                    {questions} Questions
                  </div>

                  {showQuestions && (
                    <div className="absolute top-full mt-2 w-full bg-[#0d1b2f] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                      {[5, 10, 15].map((num) => (
                        <div
                          key={num}
                          onClick={() => {
                            setQuestions(num);
                            setShowQuestions(false);
                          }}
                          className={`px-4 py-3 cursor-pointer hover:bg-cyan-500/10 ${
                            questions === num
                              ? "bg-cyan-500/20 text-cyan-400"
                              : ""
                          }`}
                        >
                          {num} Questions
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* HARD MODE INFO */}
              {difficulty === "Hard" && (
                <p className="text-xs text-orange-400 mb-3">
                  ⚡ Hard mode gives more XP
                </p>
              )}

              {/* BUTTON */}
              <button
              onClick={handleStartQuiz} 
                disabled={!topic}
                className={`w-full py-3 rounded-xl font-semibold transition ${
                  topic
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90"
                    : "bg-gray-600 cursor-not-allowed"
                }`}
              >
                Start Quiz 🚀
              </button>

              <p className="text-xs text-gray-500 text-center mt-2">
                Takes ~2 mins to complete
              </p>

            </div>

            {/* QUICK TOPICS */}
            <div className="flex gap-3 mt-4">
              {["DBMS", "OS", "Java", "DSA"].map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-full hover:bg-cyan-500/10 cursor-pointer"
                  onClick={() => setTopic(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* PRO TIP */}
            <div className="mt-4 p-4 rounded-2xl bg-[#0d1b2f] border border-white/10 flex justify-between">
              <span>💡 Tip: Mix topics to train better memory retention</span>
              <span className="text-cyan-400 text-sm">Pro Tip</span>
            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-5">

            <div className="bg-[#0d1b2f]/80 border border-white/10 rounded-2xl p-5">
              <h3 className="font-semibold mb-2">Recent Activity</h3>
              <p className="text-sm text-gray-400">
                Start your first quiz 🚀
              </p>
            </div>

            <div className="bg-[#0d1b2f]/80 border border-white/10 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">Your Stats</h3>
              <p className="text-sm text-gray-400 mb-2">Accuracy</p>
              <div className="w-full h-2 bg-gray-700 rounded-full">
                <div className="h-2 bg-cyan-400 rounded-full w-[40%]" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-white/10 rounded-2xl p-5">
              <h3 className="font-semibold mb-2">Tip</h3>
              <p className="text-sm text-gray-300">
                Choose harder difficulty to improve faster 🚀
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}