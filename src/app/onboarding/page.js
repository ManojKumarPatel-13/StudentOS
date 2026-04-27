"use client";
import React, { useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { GraduationCap, BookOpen, School, CheckCircle2 } from 'lucide-react';

export default function Onboarding() {
    const [step, setStep] = useState(1);
    const [college, setCollege] = useState('');
    const [branch, setBranch] = useState('');
    const [standard, setStandard] = useState(''); // Essential for 8th - College target
    const router = useRouter();

    // Add a loading state
    const [isSaving, setIsSaving] = useState(false);

    const finishOnboarding = async () => {
        const user = auth.currentUser;
        if (user) {
            setIsSaving(true);
            try {
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    displayName: user.displayName || "Student",
                    email: user.email,
                    college: college,
                    branch: branch,
                    standard: standard,
                    onboardingComplete: true,
                    createdAt: new Date(),
                    currentStatus: "On Track"
                }, { merge: true });
                router.push('/home');
            } catch (error) {
                console.error("Schema Write Error:", error);
                setIsSaving(false);
            }
        }
    };

    return (
        <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8 text-center">

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 mb-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`h-1 w-12 rounded-full transition-all ${step >= i ? 'bg-blue-500' : 'bg-white/10'}`} />
                    ))}
                </div>

                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <GraduationCap className="mx-auto text-blue-400 mb-4" size={48} />
                        <h2 className="text-2xl font-black text-white">Where do you study?</h2>
                        <p className="text-white/40 mb-6 text-sm">This helps StudentOS personalize your resources.</p>
                        <input
                            value={college}
                            onChange={(e) => setCollege(e.target.value)}
                            placeholder="College or School Name"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:outline-none focus:border-blue-500"
                        />
                        <button onClick={() => setStep(2)} className="w-full mt-6 py-4 bg-blue-600 rounded-2xl font-bold text-white">Next Step</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <BookOpen className="mx-auto text-blue-400 mb-4" size={48} />
                        <h2 className="text-2xl font-black text-white">What's your focus?</h2>
                        <p className="text-white/40 mb-6 text-sm">Enter your Class or Major.</p>
                        <select
                            value={standard}
                            onChange={(e) => setStandard(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:outline-none focus:border-blue-500 mb-4"
                        >
                            <option value="" className="bg-[#0A1628]">Select Level</option>
                            <option value="Middle School" className="bg-[#0A1628]">Middle School (6th-8th)</option>
                            <option value="High School" className="bg-[#0A1628]">High School (9th-12th)</option>
                            <option value="College" className="bg-[#0A1628]">College / University</option>
                        </select>
                        <input
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            placeholder="Branch / Stream (e.g. Science, CSE)"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:outline-none focus:border-blue-500"
                        />
                        <button onClick={() => setStep(3)} className="w-full mt-6 py-4 bg-blue-600 rounded-2xl font-bold text-white">Almost there</button>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CheckCircle2 className="mx-auto text-green-400 mb-4" size={48} />
                        <h2 className="text-2xl font-black text-white">System Ready.</h2>
                        <p className="text-white/40 mb-8 text-sm">Your StudentOS environment is calibrated and ready for use.</p>
                        // Update your Step 3 button
                        <button
                            onClick={finishOnboarding}
                            disabled={isSaving}
                            className={`w-full py-4 rounded-2xl font-bold text-white transition-all ${isSaving ? 'bg-green-800 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}
                        >
                            {isSaving ? "Calibrating..." : "Launch Dashboard"}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}