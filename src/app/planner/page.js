"use client";
import PlannerChat from "@/components/ui/PlannerChat";

export default function PlannerPage() {
    return (
        /* This container now has NO header, allowing the sidebar to touch the top */
        <main className="w-screen h-screen bg-[#0A1628] overflow-hidden">
            <PlannerChat />
        </main>
    );
}