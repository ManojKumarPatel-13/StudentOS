"use client";

import { useEffect, useState } from "react";

export default function QuizPlay() {
  const [quiz, setQuiz] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [time, setTime] = useState(30);
  const [finished, setFinished] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // LOAD QUIZ
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("quiz"));
    if (data) setQuiz(data);
  }, []);

  // TIMER
  useEffect(() => {
    if (finished) return;

    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          handleNext();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [current, finished]);

  useEffect(() => {
    if (!examMode) return;
    document.documentElement.requestFullscreen?.().catch(() => { });
    const block = e => e.preventDefault();
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.addEventListener("cut", block);
    return () => {
      document.exitFullscreen?.().catch(() => { });
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("cut", block);
    };
  }, [examMode]);

  // ANSWER
  const handleAnswer = (opt) => {
    if (showResult) return;

    setSelected(opt);
    setShowResult(true);

    setAnswers((prev) => ({
      ...prev,
      [current]: opt,
    }));

    setTimeout(() => handleNext(), 800);
  };

  // NEXT
  const handleNext = () => {
    setSelected(null);
    setShowResult(false);
    setTime(30);

    if (current + 1 < quiz.length) {
      setCurrent((prev) => prev + 1);
    } else {
      setFinished(true);
    }
  };

  // EXIT
  const handleExit = () => {
    if (confirm("Exit quiz? Progress will be lost.")) {
      localStorage.removeItem("quiz");
      window.location.href = "/study-tools/quiz";
    }
  };

  // SCORE
  const getScore = () => {
    let score = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.answer) score++;
    });
    return score;
  };

  if (!quiz.length) return null;

  const q = quiz[current];
  const letters = ["A", "B", "C", "D"];

  // ================= RESULT SCREEN =================
  if (finished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#071326] to-[#0d1b2f] text-white p-6">
        <div className="max-w-2xl w-full text-center space-y-6">

          <h1 className="text-5xl font-bold">🎉 Quiz Finished</h1>

          <p className="text-2xl text-cyan-400">
            Score: {getScore()} / {quiz.length}
          </p>

          {/* TABLE */}
          <div className="bg-[#0d1b2f] rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#071326] text-gray-300">
                <tr>
                  <th className="p-3 text-left">Q</th>
                  <th className="p-3 text-left">Your</th>
                  <th className="p-3 text-left">Correct</th>
                </tr>
              </thead>
              <tbody>
                {quiz.map((item, i) => {
                  const correct = answers[i] === item.answer;

                  return (
                    <tr
                      key={i}
                      className={`border-t ${correct ? "bg-green-500/10" : "bg-red-500/10"
                        }`}
                    >
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">{answers[i] || "—"}</td>
                      <td className="p-3 text-cyan-400">{item.answer}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => (window.location.href = "/study-tools/quiz")}
              className="px-5 py-2 bg-gray-600 rounded-lg hover:scale-105 transition"
            >
              Back
            </button>

            <button
              onClick={() => {
                setCurrent(0);
                setAnswers({});
                setFinished(false);
                setTime(30);
              }}
              className="px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg hover:scale-105 transition"
            >
              Retry
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ================= QUIZ UI =================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071326] to-[#0d1b2f] text-white flex">

      {/* LEFT PANEL */}
      <div className="w-64 bg-[#0b1f3a]/50 border-r border-white/10 p-6 hidden md:block">
        <h2 className="text-lg font-semibold mb-4 text-cyan-400">Quiz Stats</h2>

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-gray-400">Question</p>
            <p className="text-xl font-bold">{current + 1}/{quiz.length}</p>
          </div>

          <div>
            <p className="text-gray-400">Score</p>
            <p className="text-xl font-bold">{getScore()}</p>
          </div>

          <div>
            <p className="text-gray-400">Accuracy</p>
            <p className="text-xl font-bold">
              {Math.round((getScore() / (current || 1)) * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-300">
              Question {current + 1} / {quiz.length}
            </span>

            <div className="flex gap-4 items-center">
              <span className="text-cyan-400 text-lg font-semibold">
                ⏳ {time}s
              </span>

              <button
                onClick={handleExit}
                className="text-red-400 hover:text-red-300"
              >
                Exit
              </button>
            </div>
          </div>

          {/* PROGRESS */}
          <div className="w-full h-2 bg-gray-700 rounded-full mb-8">
            <div
              className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{
                width: `${((current + 1) / quiz.length) * 100}%`,
              }}
            />
          </div>

          {/* QUESTION */}
          <div className="bg-[#0d1b2f]/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">

            <h2 className="text-2xl font-semibold mb-8">
              {q.question}
            </h2>

            <div className="grid gap-5">
              {q.options.map((opt, i) => {
                let style =
                  "bg-[#0b1f3a]/70 border border-white/10 hover:border-cyan-400 hover:scale-[1.03]";

                if (showResult) {
                  if (opt === q.answer) {
                    style =
                      "bg-green-500/20 border-green-400 text-green-300 shadow-lg";
                  } else if (opt === selected) {
                    style =
                      "bg-red-500/20 border-red-400 text-red-300 shadow-lg";
                  }
                }

                return (
                  <div
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    className={`p-5 rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-5 ${style}`}
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-cyan-500/20 rounded-full text-cyan-400 font-bold">
                      {letters[i]}
                    </div>

                    <span>{opt}</span>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}