"use client";
import Sidebar from "@/components/shared/sidebar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, FileDown, RefreshCw, FileText, ImageIcon, ArrowLeft } from "lucide-react";

export default function NotesPage() {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("text");

  // 🔥 FEEDBACK STATES
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [regen, setRegen] = useState(false);

  // 🔥 HANDLERS
  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  };

  const handleRegen = () => {
    setRegen(true);
    setTimeout(() => setRegen(false), 1200);
  };

  return (
    <div className="flex min-h-screen bg-[#071326] text-white">
      <Sidebar />

      <div className="flex-1 ml-64 px-10 py-8">

        {/* 🔙 BACK BUTTON */}
        <div
          onClick={() => router.push("/study-tools")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 cursor-pointer mb-4 transition"
        >
          <ArrowLeft size={16} />
          Back to Study Tools
        </div>

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-semibold text-cyan-400">
              Notes Generator
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Generate structured notes from text, images, or PDFs
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3">

            {/* COPY */}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300
                ${copied
                  ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
            >
              <Copy size={16} />
              {copied ? "Copied!" : "Copy"}
            </button>

            {/* PDF */}
            <button
              onClick={handleDownload}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300
                ${downloaded
                  ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
            >
              <FileDown size={16} />
              {downloaded ? "Downloaded!" : "PDF"}
            </button>

            {/* REGENERATE */}
            <button
              onClick={handleRegen}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300
                ${regen
                  ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                  : "border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
                }`}
            >
              <RefreshCw size={16} />
              {regen ? "Done!" : "Regenerate"}
            </button>

          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-2 gap-8">

          {/* LEFT */}
          <div className="space-y-6">

            <div className="bg-[#0d1b2f]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl">

              <label className="text-sm text-gray-400 mb-2 block">
                Topic or Subject
              </label>

              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic (e.g. DBMS Normalization)"
                className="w-full px-4 py-3 rounded-xl bg-[#071326] border border-white/10 focus:outline-none focus:border-cyan-400"
              />

              {/* MODE */}
              <div className="mt-5">
                <p className="text-sm text-gray-400 mb-2">Input Mode</p>

                <div className="flex bg-[#071326] rounded-xl p-1 border border-white/10">
                  {[
                    { key: "text", label: "Text", icon: FileText },
                    { key: "images", label: "Images", icon: ImageIcon },
                    { key: "pdf", label: "PDF", icon: FileDown },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setMode(key)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition ${mode === key
                          ? "bg-cyan-500 text-black font-medium shadow-md"
                          : "text-gray-400 hover:text-white"
                        }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* UPLOAD */}
              {mode !== "text" && (
                <div className="mt-5 border border-dashed border-white/20 rounded-xl p-6 text-center bg-[#071326] hover:border-cyan-400 transition">
                  <p className="text-cyan-400 font-medium">
                    {mode === "images"
                      ? "Upload multiple images"
                      : "Upload PDF file"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Drag & drop or click to browse
                  </p>
                </div>
              )}

              <button className="mt-6 w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-[1.02] transition">
                ✨ Generate Notes
              </button>
            </div>

            {/* TIPS */}
            <div className="bg-[#0d1b2f]/80 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-cyan-400 mb-2">
                💡 Pro Tips
              </h3>

              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Upload clear, high-resolution images</li>
                <li>• Combine text + images for best results</li>
                <li>• PDFs are automatically structured</li>
                <li>• Export notes easily as PDF</li>
              </ul>
            </div>
          </div>

          {/* RIGHT OUTPUT */}
          <div className="bg-[#0d1b2f]/80 border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-xl relative">

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                ✨
              </div>

              <p className="text-lg font-medium text-gray-300">
                Your generated notes will appear here
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Enter a topic, upload images or PDFs, then click Generate
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}