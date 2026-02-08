"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";

// ─── Dummy Data ──────────────────────────────────────────────────────────────

const DUMMY_PROMPTS = [
  { prompt: "Explain quantum computing basics", tokens: 42, cached: true, hitTokens: 38, similarity: 0.0 },
  { prompt: "What is quantum computing?", tokens: 28, cached: true, hitTokens: 28, similarity: 0.85 },
  { prompt: "How do quantum computers work?", tokens: 34, cached: true, hitTokens: 30, similarity: 0.72 },
  { prompt: "Write a Python sorting algorithm", tokens: 56, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "Python quicksort implementation", tokens: 38, cached: true, hitTokens: 35, similarity: 0.68 },
  { prompt: "Sort a list in Python", tokens: 30, cached: true, hitTokens: 28, similarity: 0.55 },
  { prompt: "What is machine learning?", tokens: 32, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "Explain ML algorithms", tokens: 36, cached: true, hitTokens: 32, similarity: 0.62 },
  { prompt: "Deep learning vs machine learning", tokens: 44, cached: true, hitTokens: 40, similarity: 0.58 },
  { prompt: "Neural network architecture", tokens: 48, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "How do neural networks learn?", tokens: 40, cached: true, hitTokens: 36, similarity: 0.65 },
  { prompt: "Backpropagation explained", tokens: 52, cached: true, hitTokens: 48, similarity: 0.45 },
  { prompt: "What is React Server Components?", tokens: 38, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "React RSC vs client components", tokens: 42, cached: true, hitTokens: 38, similarity: 0.7 },
  { prompt: "Next.js app router guide", tokens: 46, cached: true, hitTokens: 42, similarity: 0.52 },
  { prompt: "CSS grid layout tutorial", tokens: 34, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "Flexbox vs CSS grid", tokens: 30, cached: true, hitTokens: 26, similarity: 0.6 },
  { prompt: "Responsive design patterns", tokens: 36, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "TypeScript generics explained", tokens: 44, cached: true, hitTokens: 40, similarity: 0.0 },
  { prompt: "Advanced TypeScript types", tokens: 50, cached: true, hitTokens: 46, similarity: 0.75 },
  { prompt: "TypeScript utility types guide", tokens: 42, cached: true, hitTokens: 38, similarity: 0.68 },
  { prompt: "Docker container basics", tokens: 36, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "Kubernetes vs Docker", tokens: 32, cached: true, hitTokens: 28, similarity: 0.55 },
  { prompt: "Container orchestration guide", tokens: 48, cached: true, hitTokens: 44, similarity: 0.48 },
  { prompt: "GraphQL vs REST API", tokens: 40, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "GraphQL query optimization", tokens: 46, cached: true, hitTokens: 42, similarity: 0.62 },
  { prompt: "API design best practices", tokens: 38, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "WebSocket real-time communication", tokens: 44, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "Server-sent events vs WebSocket", tokens: 42, cached: true, hitTokens: 38, similarity: 0.58 },
  { prompt: "Redis caching strategies", tokens: 36, cached: true, hitTokens: 32, similarity: 0.0 },
  { prompt: "Cache invalidation patterns", tokens: 40, cached: true, hitTokens: 36, similarity: 0.65 },
  { prompt: "Database indexing strategies", tokens: 44, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "SQL query optimization tips", tokens: 38, cached: true, hitTokens: 34, similarity: 0.52 },
  { prompt: "PostgreSQL performance tuning", tokens: 46, cached: true, hitTokens: 42, similarity: 0.6 },
  { prompt: "MongoDB aggregation pipeline", tokens: 50, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "NoSQL database comparison", tokens: 42, cached: true, hitTokens: 38, similarity: 0.48 },
  { prompt: "Git branching strategies", tokens: 34, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "Git rebase vs merge", tokens: 30, cached: true, hitTokens: 26, similarity: 0.72 },
  { prompt: "CI/CD pipeline setup", tokens: 40, cached: false, hitTokens: 0, similarity: 0.0 },
  { prompt: "GitHub Actions workflow", tokens: 38, cached: true, hitTokens: 34, similarity: 0.55 },
];

interface CacheNode3D {
  id: number;
  prompt: string;
  tokens: number;
  cached: boolean;
  hitTokens: number;
  x: number;
  y: number;
  z: number;
}

interface CacheEdge3D {
  from: number;
  to: number;
  isHit: boolean;
  strength: number;
}

function buildGraph(): { nodes: CacheNode3D[]; edges: CacheEdge3D[]; stats: CacheStats } {
  const nodes: CacheNode3D[] = DUMMY_PROMPTS.map((p, i) => {
    const angle = (i / DUMMY_PROMPTS.length) * Math.PI * 2;
    const layer = Math.floor(i / 8);
    const r = 2.5 + layer * 1.2 + (Math.random() - 0.5) * 0.8;
    return {
      id: i,
      prompt: p.prompt,
      tokens: p.tokens,
      cached: p.cached,
      hitTokens: p.hitTokens,
      x: Math.cos(angle + layer * 0.3) * r,
      y: (Math.random() - 0.5) * 3,
      z: Math.sin(angle + layer * 0.3) * r,
    };
  });

  const edges: CacheEdge3D[] = [];
  // Connect similar prompts in clusters
  const clusters = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11],
    [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
    [24, 25, 26], [27, 28], [29, 30], [31, 32, 33],
    [34, 35], [36, 37], [38, 39],
  ];
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        const a = DUMMY_PROMPTS[cluster[i]];
        const b = DUMMY_PROMPTS[cluster[j]];
        const isHit = a.cached || b.cached;
        edges.push({ from: cluster[i], to: cluster[j], isHit, strength: 0.5 + Math.random() * 0.5 });
      }
    }
  }
  // Cross-cluster connections
  edges.push({ from: 6, to: 9, isHit: true, strength: 0.4 });
  edges.push({ from: 12, to: 18, isHit: false, strength: 0.3 });
  edges.push({ from: 29, to: 32, isHit: true, strength: 0.5 });
  edges.push({ from: 3, to: 31, isHit: false, strength: 0.25 });

  const totalTokens = DUMMY_PROMPTS.reduce((s, p) => s + p.tokens, 0);
  const hitTokens = DUMMY_PROMPTS.reduce((s, p) => s + p.hitTokens, 0);
  const cachedCount = DUMMY_PROMPTS.filter(p => p.cached).length;
  const hitRate = Math.round((cachedCount / DUMMY_PROMPTS.length) * 100);
  const energySaved_kWh = hitTokens * 0.0000035;
  const carbonSaved_g = energySaved_kWh * 400;
  const waterSaved_mL = energySaved_kWh * 1.8;

  return {
    nodes,
    edges,
    stats: { totalTokens, hitTokens, cachedCount, total: DUMMY_PROMPTS.length, hitRate, energySaved_kWh, carbonSaved_g, waterSaved_mL },
  };
}

export interface CacheStats {
  totalTokens: number;
  hitTokens: number;
  cachedCount: number;
  total: number;
  hitRate: number;
  energySaved_kWh: number;
  carbonSaved_g: number;
  waterSaved_mL: number;
}

// ─── 3D Node ─────────────────────────────────────────────────────────────────

function CacheNodeMesh({ node }: { node: CacheNode3D }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const size = 0.06 + (node.tokens / 500);
  const isHit = node.cached && node.hitTokens > 0;

  const color = isHit ? "#44ff88" : node.cached ? "#4488ff" : "#ff4466";
  const emissive = isHit ? "#22cc66" : node.cached ? "#2266cc" : "#cc2244";
  const intensity = isHit ? 2.0 : node.cached ? 1.2 : 0.6;

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const pulse = 1 + Math.sin(t * 2 + node.id) * 0.15;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <mesh ref={meshRef} position={[node.x, node.y, node.z]}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={intensity}
        transparent
        opacity={0.9}
        roughness={0.2}
      />
    </mesh>
  );
}

// ─── 3D Edge ─────────────────────────────────────────────────────────────────

function CacheEdgeLine({ edge, nodes }: { edge: CacheEdge3D; nodes: CacheNode3D[] }) {
  const a = nodes[edge.from];
  const b = nodes[edge.to];

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [a, b]);

  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: edge.isHit ? "#44ff88" : "#4488ff",
      transparent: true,
      opacity: edge.isHit ? 0.3 : 0.08,
    });
  }, [edge.isHit]);

  return <primitive object={new THREE.Line(geometry, material)} />;
}

// ─── Fairy Dust Particles ────────────────────────────────────────────────────

function FairyDust() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 200;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 5;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      vel[i * 3] = (Math.random() - 0.5) * 0.002;
      vel[i * 3 + 1] = 0.003 + Math.random() * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return [pos, vel];
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 3];
      arr[i * 3 + 1] += velocities[i * 3 + 1];
      arr[i * 3 + 2] += velocities[i * 3 + 2];
      if (arr[i * 3 + 1] > 3.5) {
        const a = Math.random() * Math.PI * 2;
        const r = 1 + Math.random() * 5;
        arr[i * 3] = Math.cos(a) * r;
        arr[i * 3 + 1] = -2.5;
        arr[i * 3 + 2] = Math.sin(a) * r;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial color="#88bbff" size={0.03} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────

function CacheScene({ nodes, edges }: { nodes: CacheNode3D[]; edges: CacheEdge3D[] }) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 4, 0]} color="#4488ff" intensity={1.0} distance={12} />
      <pointLight position={[5, 2, 3]} color="#44ff88" intensity={0.5} distance={10} />
      <pointLight position={[-4, -1, -3]} color="#ff4466" intensity={0.3} distance={8} />

      <Float speed={0.5} rotationIntensity={0.05} floatIntensity={0.1}>
        <group>
          {edges.map((e, i) => (
            <CacheEdgeLine key={i} edge={e} nodes={nodes} />
          ))}
          {nodes.map((n) => (
            <CacheNodeMesh key={n.id} node={n} />
          ))}
        </group>
      </Float>

      <FairyDust />

      <OrbitControls
        enableZoom
        autoRotate
        autoRotateSpeed={0.4}
        maxDistance={12}
        minDistance={3}
      />
      <fog attach="fog" args={["#080c18", 8, 20]} />
    </>
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export function useSemanticCacheData() {
  return useMemo(() => buildGraph(), []);
}

export function SemanticCacheGraph3D({ nodes, edges }: { nodes: CacheNode3D[]; edges: CacheEdge3D[] }) {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-[rgba(68,136,255,0.15)]"
      style={{
        height: 480,
        background: "linear-gradient(180deg, #080c18, #0a1020)",
      }}
    >
      <Canvas
        camera={{ position: [0, 3, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <CacheScene nodes={nodes} edges={edges} />
      </Canvas>
    </div>
  );
}
