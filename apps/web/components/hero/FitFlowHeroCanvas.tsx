"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { Environment, Float, OrbitControls } from "@react-three/drei";
import { FitFlowHeroScene } from "./FitFlowHeroScene";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function FitFlowHeroCanvas() {
    const mx = useMotionValue(0);
    const my = useMotionValue(0);

    const rotX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), {
        stiffness: 120,
        damping: 20,
    });

    const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), {
        stiffness: 120,
        damping: 20,
    });

    const ref = useRef<HTMLDivElement>(null);

    const onMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={onMouseMove}
            className="relative h-full w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-[0_0_120px_rgba(16,185,129,0.25)]"
            style={{
                rotateX: rotX,
                rotateY: rotY,
                transformStyle: "preserve-3d",
            }}
        >
            <Canvas
                dpr={[1, 2]}
                shadows
                camera={{ position: [0, 0.35, 3.4], fov: 38 }}
            >
                <color attach="background" args={["#020617"]} />

                <Suspense fallback={null}>
                    <Environment preset="city" />

                    {/* LIGHT */}
                    <ambientLight intensity={0.35} />
                    <directionalLight
                        position={[4, 5, 6]}
                        intensity={1.3}
                        castShadow
                    />
                    <directionalLight
                        position={[-4, 2, -5]}
                        intensity={0.6}
                    />

                    <Float speed={1} rotationIntensity={0.4} floatIntensity={0.6}>
                        <FitFlowHeroScene />
                    </Float>
                </Suspense>

                <OrbitControls enableZoom={false} enableRotate={false} />
            </Canvas>

            {/* subtle gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(16,185,129,0.18),_transparent_60%)]" />
        </motion.div>
    );
}
