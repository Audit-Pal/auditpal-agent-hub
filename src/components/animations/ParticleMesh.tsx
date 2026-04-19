"use client";

import { useEffect, useRef, memo } from "react";

export const ParticleMesh = memo(function ParticleMesh() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion || window.innerWidth < 1280) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let animationFrameId = 0;
        let isRunning = !document.hidden;

        const mouse = { x: Number.NaN, y: Number.NaN };
        const particles: Particle[] = [];

        let PARTICLE_COUNT = 44;
        let CONNECTION_DISTANCE = 130;
        const MOUSE_DISTANCE = 180;

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.35;
                this.vy = (Math.random() - 0.5) * 0.35;
                this.size = Math.random() * 1.5 + 0.8;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                if (!Number.isNaN(mouse.x) && !Number.isNaN(mouse.y)) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 0 && distance < MOUSE_DISTANCE) {
                        const force = (MOUSE_DISTANCE - distance) / MOUSE_DISTANCE;
                        this.vx -= (dx / distance) * force * 0.35;
                        this.vy -= (dy / distance) * force * 0.35;
                    }
                }

                this.vx *= 0.992;
                this.vy *= 0.992;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(0, 212, 168, 0.28)";
                ctx.fill();
            }
        }

        const rebuildParticles = () => {
            particles.length = 0;
            for (let index = 0; index < PARTICLE_COUNT; index += 1) {
                particles.push(new Particle());
            }
        };

        const syncCanvasSize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            PARTICLE_COUNT = width >= 1600 ? 56 : 44;
            CONNECTION_DISTANCE = width >= 1600 ? 150 : 130;
            rebuildParticles();
        };

        const animate = () => {
            if (!isRunning || !ctx) return;

            ctx.clearRect(0, 0, width, height);

            for (const particle of particles) {
                particle.update();
                particle.draw();
            }

            for (let leftIndex = 0; leftIndex < particles.length; leftIndex += 1) {
                for (let rightIndex = leftIndex + 1; rightIndex < particles.length; rightIndex += 1) {
                    const dx = particles[leftIndex].x - particles[rightIndex].x;
                    const dy = particles[leftIndex].y - particles[rightIndex].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONNECTION_DISTANCE) {
                        if (!ctx) continue;
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(0, 212, 168, ${0.12 - (distance / CONNECTION_DISTANCE) * 0.12})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[leftIndex].x, particles[leftIndex].y);
                        ctx.lineTo(particles[rightIndex].x, particles[rightIndex].y);
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            syncCanvasSize();
        };

        const handleMouseMove = (event: MouseEvent) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        };

        const handleMouseLeave = () => {
            mouse.x = Number.NaN;
            mouse.y = Number.NaN;
        };

        const handleVisibilityChange = () => {
            isRunning = !document.hidden;

            if (isRunning) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = requestAnimationFrame(animate);
                return;
            }

            cancelAnimationFrame(animationFrameId);
        };

        syncCanvasSize();
        animationFrameId = requestAnimationFrame(animate);

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        window.addEventListener("mouseleave", handleMouseLeave);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            isRunning = false;
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseleave", handleMouseLeave);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-0 opacity-30 mix-blend-screen"
        />
    );
});
