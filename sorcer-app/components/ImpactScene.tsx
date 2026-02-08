"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";
import type { ImpactStats } from "@/types/gamification";

// ─── Tree Trunk ──────────────────────────────────────────────────────────────

function Trunk() {
  return (
    <mesh position={[0, 0.4, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.12, 0.8, 6]} />
      <meshStandardMaterial color="#8B6914" roughness={0.9} flatShading />
    </mesh>
  );
}

// ─── Tree Canopy ─────────────────────────────────────────────────────────────

function Canopy() {
  return (
    <group position={[0, 1.1, 0]}>
      <mesh castShadow>
        <coneGeometry args={[0.55, 0.8, 7]} />
        <meshStandardMaterial color="#4B6A4C" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <coneGeometry args={[0.4, 0.65, 7]} />
        <meshStandardMaterial color="#5a8a5c" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <coneGeometry args={[0.25, 0.5, 6]} />
        <meshStandardMaterial color="#6a9a6c" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

// ─── Ground ──────────────────────────────────────────────────────────────────

function Ground() {
  return (
    <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[1.5, 8]} />
      <meshStandardMaterial color="#3d5a3e" roughness={0.95} flatShading />
    </mesh>
  );
}

// ─── Fairy Lights ────────────────────────────────────────────────────────────

function FairyLights({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const clamped = Math.max(Math.min(Math.round(count), 80), 15);

  const [positions, velocities, phases] = useMemo(() => {
    const pos = new Float32Array(clamped * 3);
    const vel = new Float32Array(clamped * 3);
    const ph = new Float32Array(clamped);
    for (let i = 0; i < clamped; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 1.8;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = 0.3 + Math.random() * 2.0;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      vel[i * 3] = (Math.random() - 0.5) * 0.002;
      vel[i * 3 + 1] = 0.001 + Math.random() * 0.003;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return [pos, vel, ph];
  }, [clamped]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = clock.getElapsedTime();

    for (let i = 0; i < clamped; i++) {
      // Gentle drift
      arr[i * 3] += Math.sin(t * 0.5 + phases[i]) * 0.001;
      arr[i * 3 + 1] += velocities[i * 3 + 1];
      arr[i * 3 + 2] += Math.cos(t * 0.3 + phases[i]) * 0.001;

      // Reset when too high
      if (arr[i * 3 + 1] > 2.8) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.3 + Math.random() * 1.8;
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = 0.3;
        arr[i * 3 + 2] = Math.sin(a) * r;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={clamped} />
      </bufferGeometry>
      <pointsMaterial
        color="#DDA059"
        size={0.06}
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Main Scene ──────────────────────────────────────────────────────────────

function SceneContent({ stats }: { stats: ImpactStats }) {
  const fairyCount = Math.max(15, Math.min(stats.totalTokensSaved / 40, 80));

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[2, 3, 2]} color="#ffe8c0" intensity={0.8} />
      <pointLight position={[-2, 1, -1]} color="#4B6A4C" intensity={0.3} />

      <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.15}>
        <Ground />
        <Trunk />
        <Canopy />
      </Float>

      <FairyLights count={fairyCount} />

      <OrbitControls
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.4}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 5}
      />
      <fog attach="fog" args={["#1a1610", 5, 14]} />
    </>
  );
}

export function ImpactScene({ stats }: { stats: ImpactStats }) {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-oak/10"
      style={{
        height: 340,
        background: "linear-gradient(180deg, #1a1610, #0f0d08)",
      }}
    >
      <Canvas
        camera={{ position: [0, 1.8, 4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <SceneContent stats={stats} />
      </Canvas>
    </div>
  );
}
