"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { ImpactStats } from "@/types/gamification";

// ─── Floating Crystal ────────────────────────────────────────────────────────

function MagicCrystal({ isReckless }: { isReckless: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const healthyColor = useMemo(() => new THREE.Color("#66ddff"), []);
  const sickColor = useMemo(() => new THREE.Color("#882222"), []);
  const healthyEmissive = useMemo(() => new THREE.Color("#3399cc"), []);
  const sickEmissive = useMemo(() => new THREE.Color("#661111"), []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.y = t * 0.4;
      const bob = Math.sin(t * 1.5) * 0.15;
      meshRef.current.position.y = 1.0 + bob;
      const pulse = 1 + Math.sin(t * 3) * (isReckless ? 0.06 : 0.03);
      meshRef.current.scale.setScalar(pulse);
    }
    if (matRef.current) {
      matRef.current.color.lerp(isReckless ? sickColor : healthyColor, 0.03);
      matRef.current.emissive.lerp(isReckless ? sickEmissive : healthyEmissive, 0.03);
      matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, isReckless ? 0.4 : 0.85, 0.03);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 1, 0]}>
      <octahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial
        ref={matRef}
        color="#66ddff"
        emissive="#3399cc"
        emissiveIntensity={1.2}
        transparent
        opacity={0.85}
        roughness={0.1}
        metalness={0.3}
      />
    </mesh>
  );
}

// ─── Rune Ring ───────────────────────────────────────────────────────────────

function RuneRing({ isReckless }: { isReckless: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const healthyColor = useMemo(() => new THREE.Color("#44aaff"), []);
  const sickColor = useMemo(() => new THREE.Color("#553333"), []);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.getElapsedTime() * (isReckless ? -0.15 : 0.3);
      const targetScale = isReckless ? 0.7 : 1;
      ringRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.02);
    }
    if (matRef.current) {
      matRef.current.color.lerp(isReckless ? sickColor : healthyColor, 0.03);
      matRef.current.emissive.lerp(isReckless ? sickColor : healthyColor, 0.03);
      matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, isReckless ? 0.15 : 0.5, 0.03);
    }
  });

  return (
    <mesh ref={ringRef} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.8, 0.03, 8, 48]} />
      <meshStandardMaterial
        ref={matRef}
        color="#44aaff"
        emissive="#44aaff"
        emissiveIntensity={0.8}
        transparent
        opacity={0.5}
        roughness={0.2}
      />
    </mesh>
  );
}

// ─── Arcane Orbs (orbiting) ──────────────────────────────────────────────────

function ArcaneOrbs({ count, isReckless }: { count: number; isReckless: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const clamped = Math.min(Math.max(count, 3), 8);

  const orbs = useMemo(() => {
    return Array.from({ length: clamped }, (_, i) => ({
      angle: (i / clamped) * Math.PI * 2,
      radius: 2.0 + Math.random() * 0.4,
      height: 0.6 + Math.random() * 1.0,
      speed: 0.4 + Math.random() * 0.3,
      color: new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.8, 0.6),
      sickColor: new THREE.Color().setHSL(0.0 + Math.random() * 0.05, 0.5, 0.3),
    }));
  }, [clamped]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const orb = orbs[i];
      if (!orb) return;
      const t = clock.getElapsedTime() * orb.speed + orb.angle;
      const r = isReckless ? orb.radius * 0.5 : orb.radius;
      child.position.x = Math.cos(t) * r;
      child.position.z = Math.sin(t) * r;
      child.position.y = orb.height + Math.sin(t * 2) * 0.3;
      const s = isReckless ? 0.04 : 0.07;
      child.scale.setScalar(s);
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} scale={0.07}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color={isReckless ? orb.sickColor : orb.color}
            emissive={isReckless ? orb.sickColor : orb.color}
            emissiveIntensity={isReckless ? 0.3 : 1.5}
            transparent
            opacity={isReckless ? 0.3 : 0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Spell Particles ─────────────────────────────────────────────────────────

function SpellParticles({ count, isReckless }: { count: number; isReckless: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const clamped = Math.max(Math.min(Math.round(count), 150), 30);

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(clamped * 3);
    const vel = new Float32Array(clamped * 3);
    for (let i = 0; i < clamped; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 3;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.random() * 3.5;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      vel[i * 3] = (Math.random() - 0.5) * 0.003;
      vel[i * 3 + 1] = 0.004 + Math.random() * 0.008;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
    }
    return [pos, vel];
  }, [clamped]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const dir = isReckless ? -1 : 1;

    for (let i = 0; i < clamped; i++) {
      arr[i * 3] += velocities[i * 3];
      arr[i * 3 + 1] += velocities[i * 3 + 1] * dir;
      arr[i * 3 + 2] += velocities[i * 3 + 2];

      if (arr[i * 3 + 1] > 4 || arr[i * 3 + 1] < -0.5) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.5 + Math.random() * 3;
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = isReckless ? 4 : -0.3;
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
        color={isReckless ? "#662222" : "#88ccff"}
        size={isReckless ? 0.025 : 0.04}
        transparent
        opacity={isReckless ? 0.3 : 0.8}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Stone Platform ──────────────────────────────────────────────────────────

function Platform({ isReckless }: { isReckless: boolean }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const healthyColor = useMemo(() => new THREE.Color("#556677"), []);
  const sickColor = useMemo(() => new THREE.Color("#3a2a2a"), []);

  useFrame(() => {
    if (matRef.current) {
      matRef.current.color.lerp(isReckless ? sickColor : healthyColor, 0.03);
    }
  });

  return (
    <mesh position={[0, -0.3, 0]} receiveShadow>
      <cylinderGeometry args={[2.2, 2.5, 0.4, 6, 1]} />
      <meshStandardMaterial ref={matRef} color="#556677" roughness={0.95} flatShading />
    </mesh>
  );
}

// ─── Main Scene ──────────────────────────────────────────────────────────────

function SceneContent({ isReckless, stats }: { isReckless: boolean; stats: ImpactStats }) {
  return (
    <>
      <ambientLight intensity={isReckless ? 0.15 : 0.3} />
      <pointLight position={[0, 3, 0]} color={isReckless ? "#661111" : "#66ddff"} intensity={isReckless ? 0.6 : 1.5} distance={10} />
      <pointLight position={[4, 2, 4]} color={isReckless ? "#442222" : "#4488cc"} intensity={isReckless ? 0.2 : 0.6} />
      <pointLight position={[-3, 1, -3]} color={isReckless ? "#331111" : "#88aaff"} intensity={isReckless ? 0.1 : 0.4} />

      <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.3}>
        <Platform isReckless={isReckless} />
        <MagicCrystal isReckless={isReckless} />
        <RuneRing isReckless={isReckless} />
        <ArcaneOrbs count={Math.min(Math.max(stats.promptsCached, 3), 8)} isReckless={isReckless} />
      </Float>

      <SpellParticles count={Math.max(stats.totalTokensSaved / 30, 40)} isReckless={isReckless} />

      {!isReckless && <Stars radius={60} depth={40} count={300} factor={2} saturation={0.8} fade />}

      <OrbitControls
        enableZoom={false}
        autoRotate
        autoRotateSpeed={isReckless ? 0.3 : 0.6}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 5}
      />
      <fog attach="fog" args={[isReckless ? "#1a1010" : "#0a1525", 6, 18]} />
    </>
  );
}

export function ImpactScene({ isReckless, stats }: { isReckless: boolean; stats: ImpactStats }) {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border transition-colors duration-1000"
      style={{
        height: 380,
        borderColor: isReckless ? "rgba(100,20,20,0.3)" : "rgba(100,180,255,0.2)",
        background: isReckless
          ? "linear-gradient(180deg, #1a1010, #0d0808)"
          : "linear-gradient(180deg, #0a1525, #0d1a2e)",
      }}
    >
      <Canvas
        camera={{ position: [0, 2.5, 5.5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <SceneContent isReckless={isReckless} stats={stats} />
      </Canvas>
    </div>
  );
}
