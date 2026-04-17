"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useEffect, useState, memo } from "react";

export const HolographicShield = memo(function HolographicShield() {
    const [stats, setStats] = useState({
        validators: 12,
        miners: 48,
        isReal: false
    });

    // Mocking the fetch stats logic for now as we don't have the API endpoints in this simplified version
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                ...prev,
                validators: 12 + Math.floor(Math.random() * 3),
                miners: 45 + Math.floor(Math.random() * 10)
            }));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-full perspective-[1000px] flex items-center justify-center">
            <motion.div
                initial={{ rotateY: 10 }}
                animate={{ rotateY: -10 }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut"
                }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative w-full aspect-[4/5] max-w-[240px]"
            >
                {/* The Shield Container */}
                <div className="absolute inset-0">
                    {/* SVG Border Layer */}
                    <svg viewBox="0 0 320 400" className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
                        <defs>
                            <filter id="glow-border" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>
                        <path
                            d="M160 0 L320 60 V180 C320 280 260 360 160 400 C60 360 0 280 0 180 V60 L160 0 Z"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="1"
                        />
                        <path
                            d="M160 0 L320 60 V180 C320 280 260 360 160 400 C60 360 0 280 0 180 V60 L160 0 Z"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeDasharray="10 10"
                            className="animate-[dash_30s_linear_infinite]"
                            filter="url(#glow-border)"
                            style={{ strokeDashoffset: 0 }}
                        />
                    </svg>

                    {/* Main Glass Body */}
                    <div
                        className="w-full h-full bg-transparent backdrop-blur-md border-t border-l border-white/5 relative z-10"
                        style={{
                            clipPath: "path('M160 0 L320 60 V180 C320 280 260 360 160 400 C60 360 0 280 0 180 V60 L160 0 Z')"
                        }}
                    >
                        {/* Background Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,168,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,168,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

                        {/* Internal Glow */}
                        {/* <div className="absolute top-0 inset-x-0 h-2/3 bg-gradient-to-b from-[var(--accent)]/10 to-transparent opacity-60" /> */}

                        {/* Content Container - Adjusted Padding for Fit */}
                        <div className="absolute inset-0 flex flex-col items-center pt-12 pb-20 px-6 text-center">

                            {/* Icon - Moved Up */}
                            <div className="relative mb-4">
                                <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/50 shadow-[0_0_30px_rgba(0,212,168,0.3)] animate-pulse">
                                    <Lock className="w-8 h-8 text-[var(--accent)]" />
                                </div>
                                <div className="absolute -inset-2 border border-dashed border-[var(--accent)]/30 rounded-full animate-[spin_10s_linear_infinite]" />
                            </div>

                            {/* Text */}
                            <h3 className="text-lg font-bold text-white tracking-widest uppercase mb-1 leading-tight">Intelligence<br />Core</h3>
                            <div className="flex items-center gap-1.5 mb-6">
                                <p className="text-[10px] text-[var(--accent)] font-mono tracking-widest uppercase">Nodes active</p>
                                <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-[var(--accent)]/20 text-[var(--accent)] font-black animate-pulse border border-[var(--accent)]/30">LIVE</span>
                            </div>

                            {/* Stats Row - Compact & Centered */}
                            <div className="w-full max-w-[220px] grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
                                <div className="flex flex-col items-center p-2 rounded-lg bg-white/5 border border-white/5">
                                    <span className="text-lg font-bold text-white font-mono">{stats.validators}</span>
                                    <span className="text-[8px] text-[var(--accent)] uppercase tracking-wider">Signals</span>
                                </div>
                                <div className="flex flex-col items-center p-2 rounded-lg bg-white/5 border border-white/5">
                                    <span className="text-lg font-bold text-white font-mono">{stats.miners}</span>
                                    <span className="text-[8px] text-[var(--accent)] uppercase tracking-wider">Agents</span>
                                </div>
                            </div>
                        </div>

                        {/* Animated Scanner Line */}
                        {/* <motion.div
                            animate={{ top: ["5%", "95%", "5%"] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-[1px] bg-[var(--accent)]/50 shadow-[0_0_15px_var(--accent)] z-30"
                        /> */}
                    </div>
                </div>
            </motion.div>
        </div>
    );
});

// Add these to index.css if not already there, but including here for context
/*
@keyframes dash {
  to { stroke-dashoffset: -1000; }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
*/
