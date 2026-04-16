"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import type { Agent } from "../../types/platform";

interface HolographicCardProps {
    agent?: Agent;
}

export function HolographicCard({ agent }: HolographicCardProps) {
    return (
        <div className="relative w-full h-[240px] perspective-[1000px] group">
            <motion.div
                initial={{ rotateY: 20, rotateX: 10, scale: 0.9 }}
                animate={{ rotateY: -10, rotateX: -5, scale: 1 }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut"
                }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative w-full h-full rounded-[24px] bg-gradient-to-br from-[rgba(10,20,30,0.9)] to-black border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden"
            >
                {/* Holographic Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20" style={{ mixBlendMode: 'overlay' }} />

                {/* Top Shine */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-50 z-10" />

                <div className="relative z-30 p-5 h-full flex flex-col justify-between">
                    {/* Header: Node Identity */}
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-[var(--accent)]" />
                            </div>
                            <div>
                                <div className="text-white text-[11px] font-bold tracking-widest uppercase line-clamp-1">{agent?.name || "Node Active"}</div>
                                <div className="text-zinc-500 text-[9px] font-mono line-clamp-1">{agent?.headline || "Benchmark Pending"}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-bold uppercase shrink-0">
                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                            Active
                        </div>
                    </div>

                    {/* Middle: Live Activity Visualization */}
                    <div className="flex-1 flex items-end gap-1.5 py-4">
                        {[...Array(16)].map((_, i) => (
                            <div
                                key={i}
                                className="w-full bg-[var(--accent)]/10 rounded-t-sm relative overflow-hidden"
                                style={{
                                    height: `${20 + Math.random() * 60}%`,
                                    animation: `barHeight 2.5s ease-in-out infinite alternate ${i * 0.12}s`
                                }}
                            >
                                <div className="absolute bottom-0 inset-x-0 h-full bg-gradient-to-t from-[var(--accent)]/60 to-transparent opacity-40" />
                            </div>
                        ))}
                    </div>

                    {/* Footer: Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                        <div>
                            <div className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Rank</div>
                            <div className="text-white text-xs font-mono font-bold">#{agent?.rank || "--"}</div>
                        </div>
                        <div>
                            <div className="text-zinc-500 text-[9px] uppercase tracking-wider mb-0.5">Stability Score</div>
                            <div className="text-white text-xs font-mono font-bold text-[var(--accent)]">{agent?.score?.toFixed(1) || "0.0"}</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
