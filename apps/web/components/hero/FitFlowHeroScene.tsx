"use client";

import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export function FitFlowHeroScene() {
    const group = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (!group.current) return;

        group.current.rotation.y = t * 0.25;
        group.current.rotation.x = Math.sin(t * 0.25) * 0.06;
        group.current.position.y = Math.sin(t * 1.1) * 0.04;
    });

    const barY = -0.45;

    const Plate = ({
                       x,
                       radius,
                       width,
                       color,
                   }: {
        x: number;
        radius: number;
        width: number;
        color: string;
    }) => (
        <mesh
            castShadow
            position={[x, barY, 0]}
            rotation-z={Math.PI / 2}
        >
            <cylinderGeometry args={[radius, radius * 0.96, width, 64]} />
            <meshStandardMaterial
                color={color}
                metalness={0.9}
                roughness={0.28}
            />
        </mesh>
    );

    return (
        <group ref={group}>
            {/* PODIUM */}
            <mesh position={[0, -0.85, 0]} receiveShadow>
                <cylinderGeometry args={[1.25, 1.25, 0.14, 64]} />
                <meshStandardMaterial color="#020617" roughness={0.4} />
            </mesh>

            {/* GLOW */}
            <mesh rotation-x={-Math.PI / 2} position={[0, -0.92, 0]}>
                <circleGeometry args={[1.5, 64]} />
                <meshBasicMaterial
                    color="#22c55e"
                    transparent
                    opacity={0.12}
                />
            </mesh>

            {/* BAR */}
            <mesh
                castShadow
                position={[0, barY, 0]}
                rotation-z={Math.PI / 2}
            >
                <cylinderGeometry args={[0.045, 0.045, 2.3, 64]} />
                <meshStandardMaterial
                    color="#e5e7eb"
                    metalness={0.95}
                    roughness={0.12}
                />
            </mesh>

            {/* CENTER KNURL */}
            <mesh
                castShadow
                position={[0, barY, 0]}
                rotation-z={Math.PI / 2}
            >
                <cylinderGeometry args={[0.048, 0.048, 0.45, 64]} />
                <meshStandardMaterial
                    color="#9ca3af"
                    metalness={0.9}
                    roughness={0.35}
                />
            </mesh>

            {/* PLATES RIGHT — largest plate sits closest to the bar collar,
                smallest on the outside (real-barbell ordering). */}
            <Plate x={0.62} radius={0.26} width={0.16} color="#22c55e" />
            <Plate x={0.80} radius={0.22} width={0.12} color="#16a34a" />
            <Plate x={0.95} radius={0.18} width={0.10} color="#38bdf8" />

            {/* PLATES LEFT */}
            <Plate x={-0.62} radius={0.26} width={0.16} color="#22c55e" />
            <Plate x={-0.80} radius={0.22} width={0.12} color="#16a34a" />
            <Plate x={-0.95} radius={0.18} width={0.10} color="#38bdf8" />

            {/* COLLARS */}
            <mesh
                castShadow
                position={[1.1, barY, 0]}
                rotation-z={Math.PI / 2}
            >
                <coneGeometry args={[0.09, 0.14, 32]} />
                <meshStandardMaterial metalness={0.9} roughness={0.2} />
            </mesh>

            <mesh
                castShadow
                position={[-1.1, barY, 0]}
                rotation-z={Math.PI / 2}
            >
                <coneGeometry args={[0.09, 0.14, 32]} />
                <meshStandardMaterial metalness={0.9} roughness={0.2} />
            </mesh>
        </group>
    );
}
