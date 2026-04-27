"use client";
import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    sendEmailVerification
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { FaGithub, FaGoogle } from 'react-icons/fa';
import { initializeProfileIfNew } from "@/lib/services/profileService";

export default function AuthPortal() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // 1. Social Login Handler (Google & GitHub)
    const handleSocialLogin = async (provider) => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, provider);
            await initializeProfileIfNew(result.user); // ← ADD
            router.push('/home');
        } catch (error) {
            console.error("Social Auth Error:", error.code);
            // Error handling for account-link issues (Top 100 detail)
            if (error.code === 'auth/account-exists-with-different-credential') {
                alert("This email is already linked with another provider. Try logging in with Google.");
            }
        } finally {
            setLoading(false);
        }
    };

    // 2. Email/Password Logic
    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                // LOGIN WORKINGS
                await signInWithEmailAndPassword(auth, email, password);
                router.push('/home');
            } else {
                // SIGNUP WORKINGS
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(userCredential.user);
                await initializeProfileIfNew(userCredential.user); // ← ADD
                router.push('/onboarding');
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6 overflow-hidden relative">
            {/* Background Decorative Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-[#0C2D5E]/30 border border-white/10 rounded-[40px] backdrop-blur-3xl overflow-hidden shadow-2xl">

                {/* Left Side: Form */}
                <div className="p-8 lg:p-16 flex flex-col justify-center space-y-8">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                            <Sparkles className="text-blue-400" /> {isLogin ? 'Welcome Back' : 'Initialize OS'}
                        </h1>
                        <p className="text-[#F5F0E8]/40 mt-2 font-medium">
                            {isLogin ? 'Access your neural command center.' : 'Start your journey with StudentOS.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {!isLogin && (
                            <AuthInput icon={<User size={18} />} placeholder="Full Name" type="text" value={name} onChange={setName} />
                        )}
                        <AuthInput icon={<Mail size={18} />} placeholder="University Email" type="email" value={email} onChange={setEmail} />
                        <AuthInput icon={<Lock size={18} />} placeholder="Secure Password" type="password" value={password} onChange={setPassword} />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all group shadow-lg shadow-blue-600/20"
                        >
                            {loading ? 'Processing...' : (isLogin ? 'Sync Identity' : 'Create Profile')}
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-[#F5F0E8]/20 bg-transparent px-2">Or continue with</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <SocialButton
                            icon={<FaGoogle size={18} />}
                            label="Google"
                            onClick={() => handleSocialLogin(googleProvider)}
                        />
                        <SocialButton
                            icon={<FaGithub size={18} />}
                            label="GitHub"
                            onClick={() => handleSocialLogin(githubProvider)}
                        />
                    </div>

                    <p className="text-center text-sm text-[#F5F0E8]/40">
                        {isLogin ? "Don't have an account?" : "Already a member?"}
                        <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-blue-400 font-bold hover:underline">
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>

                {/* Right Side: Visual Brand */}
                <div className="hidden lg:flex bg-[#0A1628]/60 border-l border-white/5 relative items-center justify-center p-12 overflow-hidden">
                    <div className="space-y-6 relative z-10 text-center">
                        <div className="w-24 h-24 bg-blue-600/20 rounded-3xl border border-blue-500/30 flex items-center justify-center mx-auto mb-8 shadow-inner animate-pulse">
                            <Sparkles size={48} className="text-blue-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white">The future of study starts here.</h2>
                        <p className="text-[#F5F0E8]/40 text-sm max-w-xs mx-auto leading-relaxed">
                            Quantify your mastery, automate your schedule, and unleash your academic potential with StudentOS.
                        </p>
                    </div>
                    {/* Abstract decoration */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
                </div>
            </div>
        </main>
    );
}

// Helper Components
function AuthInput({ icon, placeholder, type, value, onChange }) {
    return (
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors">
                {icon}
            </div>
            <input
                required
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-white/10"
            />
        </div>
    );
}

function SocialButton({ icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center justify-center gap-3 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-white/10 transition-all"
        >
            {icon} {label}
        </button>
    );
}