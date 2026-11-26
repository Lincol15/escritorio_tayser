/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/Viewer3D.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Visor 3D.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Edges, Environment, GizmoHelper, GizmoViewport, Grid, Html, Lightformer, Line, OrbitControls, TransformControls } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { wrgjBuildItem } from '../core/items';
import type { WRGJResolvedPiece, WRGJSceneItem, WRGJSize3, WRGJVec3 } from '../core/types';
import { wrgjCylinderGeometry, wrgjGeometryKey, wrgjPanelGeometry, wrgjPlaneQuaternion, wrgjTenonBox } from '../three/geometry';
import { wrgjGetMeshMaterial, type WRGJMatState } from '../three/materials3d';
import { WRGJ_DEG, wrgjFmtLen, wrgjNormDeg, wrgjRound } from '../core/units';

const WRGJ_BG = { dark: '#17181b', gray: '#3a3f47', light: '#dfe3de' };

export default function WRGJViewer3D({ presentation = false }: { presentation?: boolean }) {
  const items = useStore((s) => s.project.items);
  const sceneBg = useStore((s) => s.sceneBg);
  const select = useStore((s) => s.select);
  const bg = presentation ? '#20242c' : WRGJ_BG[sceneBg];
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [3.2, 2.4, 4.2], fov: 42, near: 0.01, far: 400 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={(e) => {
        if (e.type === 'click' && !presentation) select(null);
      }}
    >
      <color attach="background" args={[bg]} />
      <WRGJLights presentation={presentation} />
      <group name="scene-root" scale={0.001}>
        {items.map((it) => (
          <WRGJItemNode key={it.id} item={it} presentation={presentation} />
        ))}
      </group>
      {!presentation && (
        <Grid
          position={[0, -0.0005, 0]}
          infiniteGrid
          cellSize={0.1}
          sectionSize={1}
          cellColor={sceneBg === 'light' ? '#c7cdc6' : '#2c2f34'}
          sectionColor={sceneBg === 'light' ? '#a3aba3' : '#43474e'}
          fadeDistance={35}
          fadeStrength={1.5}
        />
      )}
      {presentation && <ContactShadows position={[0, 0.0015, 0]} opacity={0.5} scale={24} blur={2.2} far={5} resolution={1024} />}
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
      <WRGJCameraRig />
      {!presentation && <WRGJGizmo />}
      {!presentation && (
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#5b8fd4']} labelColor="white" />
        </GizmoHelper>
      )}
    </Canvas>
  );
}

function WRGJLights({ presentation }: { presentation: boolean }) {
  return (
    <>
      <ambientLight intensity={presentation ? 0.3 : 0.55} />
      <hemisphereLight args={['#e0ecff', '#4a4238', presentation ? 0.45 : 0.6]} />
      <directionalLight position={[4, 7, 5]} intensity={presentation ? 1.7 : 1.3} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}>
        <orthographicCamera attach="shadow-camera" args={[-8, 8, 8, -8, 0.1, 40]} />
      </directionalLight>
      <directionalLight position={[-5, 4, -3]} intensity={0.35} />
      {presentation && (
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2.2} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
          <Lightformer intensity={1.2} position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} color="#fff4e0" />
          <Lightformer intensity={0.9} position={[6, 2, 3]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} color="#e0ecff" />
        </Environment>
      )}
    </>
  );
}

function WRGJItemNode({ item, presentation }: { item: WRGJSceneItem; presentation: boolean }) {
  const built = useMemo(() => wrgjBuildItem(item), [item]);
  const selectedId = useStore((s) => s.selectedId);
  const selectedPiece = useStore((s) => s.selectedPiece);
  const showDims = useStore((s) => s.showDims);
  const dimsAll = useStore((s) => s.dimsAll);
  const step = useStore((s) => s.assemblyStep);
  const select = useStore((s) => s.select);
  if (item.hidden) return null;
  const isSel = !presentation && selectedId === item.id;
  const stepped = step !== null && (item.category === 'module' || item.category === 'piece');
  const { w, d } = built.size;
  return (
    <group name={`item-${item.id}`} position={item.position} rotation={[0, item.rotationY * WRGJ_DEG, 0]}>
      <group position={[-w / 2, 0, -d / 2]}>
        {built.pieces.map((p) => {
          if (item.hiddenPieces.includes(p.key)) return null;
          if (stepped && p.step > step!) return null;
          const state: WRGJMatState = isSel && selectedPiece === p.key ? 'selected' : stepped && p.step === step ? 'step' : 'normal';
          return (
            <WRGJPieceMesh
              key={p.key}
              piece={p}
              state={state}
              edgeColor={isSel ? '#3f8f66' : presentation ? '#3b3b3b' : '#101113'}
              animate={stepped && p.step === step}
              onClick={(e) => {
                if (presentation) return;
                e.stopPropagation();
                select(item.id, p.key);
              }}
            />
          );
        })}
      </group>
      {!presentation && showDims && (dimsAll || isSel) && item.category !== 'floor' && <WRGJDimensions size={built.size} />}
    </group>
  );
}

function WRGJPieceMesh({ piece, state, edgeColor, animate, onClick }: { piece: WRGJResolvedPiece; state: WRGJMatState; edgeColor: string; animate: boolean; onClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const gkey = wrgjGeometryKey(piece);
  const geom = useMemo(() => (piece.kind === 'cylinder' ? wrgjCylinderGeometry(piece) : wrgjPanelGeometry(piece)), [gkey]); // eslint-disable-line react-hooks/exhaustive-deps
  const material = wrgjGetMeshMaterial(piece.materialId, piece.kind === 'cylinder' ? 'cyl' : 'panel', state);
  const quat = wrgjPlaneQuaternion(piece.plane);
  const anim = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  useEffect(() => {
    if (animate) t0.current = performance.now();
  }, [animate]);
  useFrame(() => {
    if (!anim.current) return;
    if (!animate) {
      if (anim.current.position.y !== 0) anim.current.position.y = 0;
      return;
    }
    const k = Math.min(1, (performance.now() - t0.current) / 700);
    anim.current.position.y = (1 - (1 - Math.pow(1 - k, 3))) * 250;
  });
  const rot = (piece.rotation ?? [0, 0, 0]).map((v) => v * WRGJ_DEG) as [number, number, number];
  const thinEdges = piece.role === 'pared' || piece.role === 'piso';
  return (
    <group ref={anim}>
      <group position={piece.position} rotation={rot}>
        {piece.kind === 'cylinder' ? (
          <mesh geometry={geom} material={material} castShadow receiveShadow onClick={onClick}>
            <Edges threshold={40} color={edgeColor} />
          </mesh>
        ) : (
          <group quaternion={quat}>
            <mesh geometry={geom} material={material} castShadow={piece.role !== 'piso'} receiveShadow onClick={onClick}>
              {!thinEdges && <Edges threshold={15} color={edgeColor} />}
            </mesh>
            {piece.features.tenons.map((t) => {
              const b = wrgjTenonBox(piece, t);
              return (
                <mesh key={t.id} position={b.pos} material={material} castShadow onClick={onClick}>
                  <boxGeometry args={b.size} />
                  <Edges color={edgeColor} />
                </mesh>
              );
            })}
          </group>
        )}
      </group>
    </group>
  );
}

function WRGJDimLine({ a, b, label }: { a: WRGJVec3; b: WRGJVec3; label: string }) {
  const mid: WRGJVec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const vertical = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) + Math.abs(b[2] - a[2]);
  const tk = 35;
  const tick = (p: WRGJVec3): [WRGJVec3, WRGJVec3] => (vertical ? [[p[0] - tk, p[1], p[2]], [p[0] + tk, p[1], p[2]]] : [[p[0], p[1] - tk, p[2]], [p[0], p[1] + tk, p[2]]]);
  return (
    <group>
      <Line points={[a, b]} color="#fbbf24" lineWidth={1.6} depthTest={false} renderOrder={10} />
      <Line points={tick(a)} color="#fbbf24" lineWidth={1.6} depthTest={false} renderOrder={10} />
      <Line points={tick(b)} color="#fbbf24" lineWidth={1.6} depthTest={false} renderOrder={10} />
      <Html position={mid} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
        <div className="dim-label">{label}</div>
      </Html>
    </group>
  );
}

function WRGJDimensions({ size }: { size: WRGJSize3 }) {
  const unit = useStore((s) => s.unit);
  const { w, h, d } = size;
  const o = 90;
  return (
    <group>
      <WRGJDimLine a={[-w / 2, 0, d / 2 + o]} b={[w / 2, 0, d / 2 + o]} label={wrgjFmtLen(w, unit)} />
      {h > 1 && <WRGJDimLine a={[w / 2 + o, 0, d / 2]} b={[w / 2 + o, h, d / 2]} label={wrgjFmtLen(h, unit)} />}
      <WRGJDimLine a={[w / 2 + o, h + 20, -d / 2]} b={[w / 2 + o, h + 20, d / 2]} label={wrgjFmtLen(d, unit)} />
    </group>
  );
}

function WRGJCameraRig() {
  const req = useStore((s) => s.viewRequest);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update(): void } | null;
  useEffect(() => {
    if (!controls) return;
    const root = scene.getObjectByName('scene-root');
    const box = new THREE.Box3();
    if (root) box.setFromObject(root);
    if (box.isEmpty()) box.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1));
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    const r = Math.max(s.x, s.y, s.z);
    const dist = r * 1.25 + 1.2;
    const dirs: Record<string, [number, number, number]> = { front: [0, 0.12, 1], top: [0, 1, 0.0001], side: [1, 0.12, 0], iso: [0.8, 0.62, 1] };
    const dir = new THREE.Vector3(...dirs[req.view]).normalize();
    camera.position.copy(c).addScaledVector(dir, dist);
    camera.lookAt(c);
    controls.target.copy(c);
    controls.update();
  }, [req.n, controls]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function WRGJGizmo() {
  const id = useStore((s) => s.selectedId);
  const mode = useStore((s) => s.gizmo);
  const rotSnap = useStore((s) => s.rotSnap);
  const items = useStore((s) => s.project.items);
  const scene = useThree((s) => s.scene);
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    setObj(id ? scene.getObjectByName(`item-${id}`) ?? null : null);
  }, [id, items, scene]);
  if (!obj || !id || mode === 'none') return null;
  return (
    <TransformControls
      object={obj}
      mode={mode}
      size={0.8}
      translationSnap={0.01}
      rotationSnap={rotSnap * WRGJ_DEG}
      showX={mode === 'translate'}
      showZ={mode === 'translate'}
      showY
      onMouseUp={() => {
        const e = new THREE.Euler().setFromQuaternion(obj.quaternion, 'YXZ');
        useStore.getState().updateItem(id, {
          position: [wrgjRound(obj.position.x), wrgjRound(Math.max(0, obj.position.y)), wrgjRound(obj.position.z)],
          rotationY: wrgjNormDeg(e.y / WRGJ_DEG),
        });
      }}
    />
  );
}
