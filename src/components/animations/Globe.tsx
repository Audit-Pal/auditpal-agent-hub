"use client";

import { useEffect, useRef, memo } from "react";
import { motion } from "framer-motion";

const CANVAS_SIZE = 420;

export const Globe = memo(function Globe() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width = CANVAS_SIZE;
        const height = canvas.height = CANVAS_SIZE;
        const globeRadius = 160;
        const dotRadius = 1.15;
        const dotCount = window.innerWidth >= 1280 ? 520 : 360;
        const rotationSpeed = 0.0016;

        const points: { x: number; y: number; z: number }[] = [];
        const phi = Math.PI * (3 - Math.sqrt(5));

        for (let index = 0; index < dotCount; index += 1) {
            const y = 1 - (index / (dotCount - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * index;
            const x = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;

            points.push({ x: x * globeRadius, y: y * globeRadius, z: z * globeRadius });
        }

        let animationFrameId = 0;
        let isRunning = !document.hidden;
        let rotation = 0;

        const render = () => {
            if (!isRunning) return;

            ctx.clearRect(0, 0, width, height);
            rotation += rotationSpeed;

            const rotatedPoints = points
                .map((point) => {
                    const x = point.x * Math.cos(rotation) - point.z * Math.sin(rotation);
                    const z = point.x * Math.sin(rotation) + point.z * Math.cos(rotation);
                    return { x, y: point.y, z };
                })
                .sort((left, right) => left.z - right.z);

            for (const point of rotatedPoints) {
                const fov = 780;
                const scale = fov / (fov - point.z);
                const px = width / 2 + point.x * scale;
                const py = height / 2 + point.y * scale;
                const alpha = (point.z + globeRadius) / (2 * globeRadius);
                const opacity = Math.max(0.08, Math.min(0.85, alpha * 0.72));

                ctx.beginPath();
                ctx.arc(px, py, dotRadius * scale, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 212, 168, ${opacity})`;
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        const handleVisibilityChange = () => {
            isRunning = !document.hidden;

            if (isRunning) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            cancelAnimationFrame(animationFrameId);
        };

        animationFrameId = requestAnimationFrame(render);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            isRunning = false;
            cancelAnimationFrame(animationFrameId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <motion.canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="h-full w-full object-contain opacity-55"
            />
        </div>
    );
});
