import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Stars, Line } from "@react-three/drei";
import * as THREE from "three";

interface PlanetProps {
  orbitalRadius: number;
  planetRadius: number;
  color: string;
  speed: number;
  name: string;
}

const Planet: React.FC<PlanetProps> = ({
  orbitalRadius,
  planetRadius,
  color,
  speed,
  name,
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const orbitRef = useRef<THREE.Group | null>(null);

  useFrame(({ clock }) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y = clock.getElapsedTime() * speed;
    }
  });

  // Generate orbit points (Vector3[]). Drei's <Line /> accepts this.
  const orbitPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segs = 128;
    for (let i = 0; i <= segs; i++) {
      const angle = (i / segs) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          Math.cos(angle) * orbitalRadius,
          0,
          Math.sin(angle) * orbitalRadius
        )
      );
    }
    return pts;
  }, [orbitalRadius]);

  return (
    <group>
      {/* Orbit path as a line (using drei Line which expects an array of points) */}
      <Line
        points={orbitPoints}
        color="#4a5568"
        lineWidth={1}
        transparent
        opacity={0.28}
      />
      {/* Planet orbit group */}
      <group ref={orbitRef}>
        <mesh ref={meshRef} position={[orbitalRadius, 0, 0]}>
          <sphereGeometry args={[planetRadius, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.08}
            roughness={0.7}
            metalness={0.15}
          />

          {/* Planet label */}
          <Text
            position={[0, planetRadius + 0.5, 0]}
            fontSize={0.28}
            color="white"
            anchorX="center"
            anchorY="middle"
            font="/fonts/roboto.woff"
          >
            {name}
          </Text>
        </mesh>
      </group>
    </group>
  );
};

const Star: React.FC = () => {
  const meshRef = useRef<THREE.Mesh | null>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color="#ffd700"
        emissive="#ffa500"
        emissiveIntensity={0.9}
        roughness={0.2}
        metalness={0.1}
      />

      {/* Star glow */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffa500"
          emissiveIntensity={0.35}
          transparent
          opacity={0.28}
        />
      </mesh>

      <Text
        position={[0, 2, 0]}
        fontSize={0.36}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        font="/fonts/roboto.woff"
      >
        Host Star
      </Text>
    </mesh>
  );
};

interface PlanetSystem3DProps {
  disposition: string;
  data: {
    columns: string[];
    rows: Record<string, any>[];
  };
}

const PlanetSystem3D: React.FC<PlanetSystem3DProps> = ({
  disposition,
  data,
}) => {
  // Build system config from the classified data
  const systemConfig = useMemo(() => {
    const filtered = (data?.rows || []).filter(
      (r) => String(r.Predicted_Disposition || "").toUpperCase() === disposition
    );

    // Map rows to planet configs (limit to first 8 planets)
    const planets = filtered.slice(0, 8).map((row, i) => {
      // Scale planet radius: use koi_prad if available, fallback to 1
      const prad = row.koi_prad ?? row.pl_rade ?? null;
      const planetRadius = prad ? Math.max(0.08, Number(prad) * 0.05) : 0.12;

      // Try use period to set orbit distance if available (koi_period or pl_orbper)
      const period = row.koi_period ?? row.pl_orbper ?? null;
      // Map period to orbital radius with a simple power law (so longer periods -> farther orbit)
      const orbitalRadius = period
        ? 1.8 + Math.pow(Number(period), 0.3)
        : 3 + i * 1.8;

      return {
        orbitalRadius,
        planetRadius,
        color: disposition === "CONFIRMED" ? "#3b82f6" : "#8b5cf6",
        speed: 0.25 + Math.random() * 0.7,
        name: row.kepoi_name ?? row.id ?? `Planet-${i + 1}`,
      };
    });

    return {
      planets,
      title:
        disposition === "CONFIRMED"
          ? "Confirmed Planetary System"
          : disposition === "CANDIDATE"
          ? "Candidate Planet System"
          : "No Planetary System Detected",
      detectedCount: planets.length,
    };
  }, [data, disposition]);

  if (!data || !Array.isArray(data.rows)) {
    return (
      <div className="text-slate-400 p-6">
        No data available for visualization.
      </div>
    );
  }

  if (disposition === "FALSE POSITIVE") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            3D System Visualization
          </h2>
          <p className="text-slate-400">
            No planetary system visualization for false positives
          </p>
        </div>

        <div className="bg-slate-700/30 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            False Positive Detection
          </h3>
          <p className="text-slate-400">
            This signal is likely caused by instrumental noise, stellar
            activity, or eclipsing binary systems rather than a planetary
            transit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          3D System Visualization
        </h2>
        <p className="text-slate-400">{systemConfig.title}</p>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="h-96 relative">
          <Canvas
            camera={{ position: [15, 8, 15], fov: 60 }}
            style={{ background: "transparent" }}
          >
            {/* lighting */}
            <ambientLight intensity={0.25} />
            <pointLight position={[0, 0, 0]} intensity={2} color="#ffd700" />
            <pointLight
              position={[10, 10, 10]}
              intensity={0.5}
              color="#ffffff"
            />

            {/* background stars */}
            <Stars
              radius={100}
              depth={50}
              count={4000}
              factor={4}
              saturation={0}
              fade
              speed={0.5}
            />

            {/* central star */}
            <Star />

            {/* planets */}
            {systemConfig.planets.map((planet, idx) => (
              <Planet key={idx} {...planet} />
            ))}

            {/* camera controls */}
            <OrbitControls
              enableZoom
              enablePan
              enableRotate
              autoRotate={false}
              minDistance={4}
              maxDistance={60}
            />
          </Canvas>

          {/* controls overlay */}
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3">
            <div className="text-xs text-slate-400 space-y-1">
              <div>🖱️ Drag to rotate</div>
              <div>🔍 Scroll to zoom</div>
              <div>⚡ Real-time orbital motion</div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-700/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {systemConfig.detectedCount}
              </div>
              <div className="text-sm text-slate-400">Detected Planets</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {systemConfig.detectedCount > 0 ? "Active" : "None"}
              </div>
              <div className="text-sm text-slate-400">Orbital Animation</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                G-Type
              </div>
              <div className="text-sm text-slate-400">Host Star Type</div>
            </div>
          </div>
        </div>
      </div>

      {systemConfig.planets.length > 0 && (
        <div className="bg-slate-700/30 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">
            System Properties
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">System Architecture:</span>
              <span className="text-white ml-2">Multi-planet system</span>
            </div>
            <div>
              <span className="text-slate-400">Orbital Dynamics:</span>
              <span className="text-white ml-2">Stable configuration</span>
            </div>
            <div>
              <span className="text-slate-400">Discovery Method:</span>
              <span className="text-white ml-2">Transit photometry</span>
            </div>
            <div>
              <span className="text-slate-400">Habitability:</span>
              <span className="text-white ml-2">Under evaluation</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanetSystem3D;
