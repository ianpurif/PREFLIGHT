"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import type { DemoRoutePoint } from "./demo-data";

type TwinRoute = "unsafe" | "corrected" | "mutated";

interface Point {
  readonly x: number;
  readonly z: number;
}

const SCENE = Object.freeze({
  // Illustrative labels align with the projected public trace; the evaluator's private envelope
  // remains server/TEE-only and is never read by this component.
  restricted: Object.freeze({ x: 3, z: 3, width: 2.4, depth: 2.1 }),
  human: Object.freeze({ x: -1, z: -1, width: 2.5, depth: 1.7 }),
  forklift: Object.freeze({ x: 0.1, z: 3.5, width: 8.5, depth: 0.75 }),
});

function routeFor(routePoints: readonly DemoRoutePoint[]): readonly Point[] {
  return routePoints.map((point) => ({
    // The twin is an explanatory projection of public behavior points, not the private envelope.
    x: point.xMm / 1_000 - 5,
    z: point.yMm / 1_000 - 5,
  }));
}

function Route({
  kind,
  routePoints,
}: {
  readonly kind: TwinRoute;
  readonly routePoints: readonly DemoRoutePoint[];
}) {
  const points = useMemo(() => routeFor(routePoints), [routePoints]);
  const color = kind === "corrected" ? "#55e6b5" : "#ff6b72";
  return (
    <>
      {points.slice(1).map((point, index) => {
        const previous = points[index];
        if (previous === undefined) return null;
        const dx = point.x - previous.x;
        const dz = point.z - previous.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        return (
          <mesh
            key={`${previous.x}-${previous.z}-${point.x}-${point.z}`}
            position={[(previous.x + point.x) / 2, 0.08, (previous.z + point.z) / 2]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[length, 0.04, 0.12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} />
          </mesh>
        );
      })}
    </>
  );
}

function WarehouseShell() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <planeGeometry args={[14, 9]} />
        <meshStandardMaterial color="#111923" />
      </mesh>
      <mesh position={[0, 0.45, -4.35]}>
        <boxGeometry args={[14, 0.9, 0.18]} />
        <meshStandardMaterial color="#283649" />
      </mesh>
      <mesh position={[-6.9, 0.45, 0]}>
        <boxGeometry args={[0.18, 0.9, 9]} />
        <meshStandardMaterial color="#283649" />
      </mesh>
      <mesh position={[6.9, 0.45, 0]}>
        <boxGeometry args={[0.18, 0.9, 9]} />
        <meshStandardMaterial color="#283649" />
      </mesh>
      {[-4.4, 0, 4.4].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.28, -2.5]}>
            <boxGeometry args={[2.6, 0.55, 0.42]} />
            <meshStandardMaterial color="#37465a" />
          </mesh>
          <mesh position={[x, 0.28, 1.2]}>
            <boxGeometry args={[2.6, 0.55, 0.42]} />
            <meshStandardMaterial color="#37465a" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function TwinZones() {
  return (
    <>
      <mesh position={[SCENE.restricted.x, 0.01, SCENE.restricted.z]}>
        <boxGeometry args={[SCENE.restricted.width, 0.03, SCENE.restricted.depth]} />
        <meshStandardMaterial color="#e95863" transparent opacity={0.42} />
      </mesh>
      <mesh position={[SCENE.human.x, 0.015, SCENE.human.z]}>
        <boxGeometry args={[SCENE.human.width, 0.03, SCENE.human.depth]} />
        <meshStandardMaterial color="#f0b85b" transparent opacity={0.4} />
      </mesh>
      <mesh position={[SCENE.forklift.x, 0.02, SCENE.forklift.z]}>
        <boxGeometry args={[SCENE.forklift.width, 0.025, SCENE.forklift.depth]} />
        <meshStandardMaterial color="#527494" transparent opacity={0.26} />
      </mesh>
    </>
  );
}

function Robot({
  kind,
  routePoints,
}: {
  readonly kind: TwinRoute;
  readonly routePoints: readonly DemoRoutePoint[];
}) {
  const points = routeFor(routePoints);
  const finalPoint = points[points.length - 1] ?? { x: 0, z: 0 };
  return (
    <group position={[finalPoint.x, 0.32, finalPoint.z]}>
      <mesh>
        <boxGeometry args={[0.65, 0.42, 0.52]} />
        <meshStandardMaterial color="#e5edf7" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 20]} />
        <meshStandardMaterial color={kind === "corrected" ? "#55e6b5" : "#ff6b72"} />
      </mesh>
    </group>
  );
}

function ViolationMarkers({ kind }: { readonly kind: TwinRoute }) {
  if (kind === "corrected") return null;
  return (
    <>
      <mesh position={[3, 0.12, 3]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ff6b72" emissive="#ff6b72" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-1, 0.12, -1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#f0b85b" emissive="#f0b85b" emissiveIntensity={0.7} />
      </mesh>
    </>
  );
}

export function DigitalTwin({
  kind,
  routePoints,
}: {
  readonly kind: TwinRoute;
  readonly routePoints: readonly DemoRoutePoint[];
}) {
  const accessibleLabel =
    kind === "corrected"
      ? "Warehouse digital twin showing the corrected public robot route projection"
      : "Warehouse digital twin showing the unsafe public robot route projection";
  return (
    <div className="twin-canvas" role="img" aria-label={accessibleLabel} data-testid="digital-twin">
      <Canvas orthographic camera={{ position: [0, 10, 0], zoom: 57 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.8} />
        <directionalLight position={[2, 8, 4]} intensity={2.3} />
        <WarehouseShell />
        <TwinZones />
        <Route kind={kind} routePoints={routePoints} />
        <Robot kind={kind} routePoints={routePoints} />
        <ViolationMarkers kind={kind} />
      </Canvas>
      <div className="twin-legend" aria-hidden="true">
        <span>
          <i className="legend-dot restricted" /> Restricted
        </span>
        <span>
          <i className="legend-dot human" /> Human-only
        </span>
        <span>
          <i className="legend-dot route" /> Route
        </span>
      </div>
    </div>
  );
}
