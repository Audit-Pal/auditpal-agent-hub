"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import type { Agent } from "../../types/platform";

interface HolographicCardProps {
    agent?: Agent;
}

export const HolographicCard = memo(function HolographicCard({ agent }: HolographicCardProps) {
    const barHeights = useMemo(
        () => Array.from({ length: 16 }, () => `${20 + Math.random() * 60}%`),
        []
    );

    return (
        <div className="group relative h-[240px] w-full perspective-[1000px]">
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
                className="relative h-full w-full overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-[rgba(10,20,30,0.9)] to-black shadow-2xl"
            >
                <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" style={{ mixBlendMode: 'overlay' }} />
                <div className="absolute left-0 top-0 z-10 h-1/2 w-full bg-gradient-to-b from-white/10 to-transparent opacity-50" />

                <div className="relative z-30 flex h-full flex-col justify-between p-5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                <Shield className="h-4 w-4 text-[var(--accent)]" />
                            </div>
                            <div>
                                <div className="line-clamp-1 text-[11px] font-bold uppercase tracking-widest text-white">{agent?.name || "Node Active"}</div>
                                <div className="line-clamp-1 text-[9px] font-mono text-zinc-500">{agent?.headline || "Benchmark Pending"}</div>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-[9px] font-bold uppercase text-green-500">
                            <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                            Active
                        </div>
                    </div>

                    <div className="flex flex-1 items-end gap-1.5 py-4">
                        {barHeights.map((height, index) => (
                            <div
                                key={index}
                                className="relative w-full overflow-hidden rounded-t-sm bg-[var(--accent)]/10"
                                style={{
                                    height,
                                    animation: `barHeight 2.5s ease-in-out infinite alternate ${index * 0.12}s`
                                }}
                            >
                                <div className="absolute bottom-0 inset-x-0 h-full bg-gradient-to-t from-[var(--accent)]/60 to-transparent opacity-40" />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-3">
                        <div>
                            <div className="mb-0.5 text-[9px] uppercase tracking-wider text-zinc-500">Rank</div>
                            <div className="text-xs font-mono font-bold text-white">#{agent?.rank || "--"}</div>
                        </div>
                        <div>
                            <div className="mb-0.5 text-[9px] uppercase tracking-wider text-zinc-500">Stability Score</div>
                            <div className="text-xs font-mono font-bold text-[var(--accent)]">{agent?.score?.toFixed(1) || "0.0"}</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
});
