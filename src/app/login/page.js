"use client";
import { auth, googleProvider } from "../../lib/firebase.js";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    const handleGoogleLogin = async () => {

        try {
            const result = await signInWithPopup(auth, googleProvider);
            // Success! User info is in result.user
            console.log("Logged in as:", result.user.displayName);

            // Redirect to the main dashboard
            router.push("/dashboard");
        } catch (error) {
            console.error("Login failed:", error.message);
            alert("Something went wrong with Google Login. Check the console.");
        }
    };

    const handleEmailLogin = (e) => {
        e.preventDefault();
        console.log("Email login clicked - we'll set this up later!");
    };

    return (
        <main className="min-h-screen w-full flex flex-col md:flex-row bg-[#FDFDFF] font-sans text-slate-900">

            {/* LEFT PANEL: The Brand Side */}
            <section className="hidden md:flex w-1/2 bg-[#F8F9FF] flex-col justify-center px-16 relative overflow-hidden border-r border-slate-100">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50/50 to-transparent"></div>

                <div className="relative z-10 space-y-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                            <span className="text-white font-bold text-2xl">S</span>
                        </div>
                        <span className="text-3xl font-bold tracking-tight text-indigo-900">StudentOS</span>
                    </div>

                    <h1 className="text-6xl font-extrabold leading-[1.1] text-slate-900">
                        Your AI-powered <br />
                        <span className="text-indigo-600 font-black">study system</span>
                    </h1>

                    <p className="text-xl text-slate-500 max-w-md leading-relaxed">
                        Capture lectures, plan smarter, and learn faster with AI.
                    </p>

                    <div className="space-y-8 pt-4">
                        <FeatureRow icon="🎙️" title="Capture lectures instantly" desc="Record and transcribe with AI-powered notes" />
                        <FeatureRow icon="✨" title="Generate smart quizzes" desc="Test your knowledge with AI-generated questions" />
                        <FeatureRow icon="📅" title="Plan your study day with AI" desc="Optimize your schedule for maximum productivity" />
                    </div>

                    <div className="pt-10 flex items-center gap-2 text-sm text-emerald-600 font-semibold italic">
                        <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-[10px]">✓</span>
                        Trusted by 10,000+ students worldwide
                    </div>
                </div>
            </section>

            {/* RIGHT PANEL: The Login Card */}
            <section className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
                <div className="w-full max-w-md bg-white border border-slate-100 p-10 rounded-[40px] shadow-2xl shadow-slate-100">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-4xl font-black text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-500 font-medium">Login to your account</p>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-sm font-bold text-slate-700">Password</label>
                                <button type="button" className="text-xs font-bold text-indigo-600 hover:underline">Forgot Password?</button>
                            </div>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-300"
                            />
                        </div>

                        <button type="submit" className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Login
                        </button>

                        <div className="relative py-4 flex items-center gap-4">
                            <div className="flex-1 h-[1px] bg-slate-100"></div>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">or continue with</span>
                            <div className="flex-1 h-[1px] bg-slate-100"></div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            className="flex items-center justify-center gap-3 w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-[#F5F0E8] transition-all"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" className="w-5 h-5" alt="Google" />
                            Continue with Google
                        </button>
                    </form>

                    <p className="mt-10 text-center text-sm font-medium text-slate-400">
                        Don't have an account? <button className="text-indigo-600 font-black hover:underline ml-1">Sign up</button>
                    </p>
                </div>
            </section>
        </main>
    );
}

// Helper Component for Features
function FeatureRow({ icon, title, desc }) {
    return (
        <div className="flex gap-5 items-start">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl border border-slate-50">
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
                <p className="text-slate-500 font-medium leading-snug">{desc}</p>
            </div>
        </div>
    );
}