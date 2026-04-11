export default function Home() {
  return (
    // 'bg-[#020617]' is a very deep Navy/Midnight blue
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#020617] p-6">

      {/* The "Glow" - This creates the blue atmosphere */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] z-0" />

      <div className="relative z-10 text-center">
        <h2 className="text-blue-400 font-mono text-sm tracking-[0.3em] uppercase mb-4 animate-pulse">
          StudentOS Project
        </h2>

        <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white">
          COMING <br /> SOON
        </h1>

        <div className="mt-8 h-1 w-24 bg-blue-500 mx-auto rounded-full" />

        <p className="mt-8 text-slate-400 text-lg md:text-xl max-w-md mx-auto font-light">
          An AI-powered academic workspace for the <br />
          <span className="text-white font-medium">Google Solution Challenge 2026</span>
        </p>
      </div>
    </main>
  );
}