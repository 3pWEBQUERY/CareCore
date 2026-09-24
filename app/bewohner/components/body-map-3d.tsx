"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowCounterClockwise, Minus, Plus } from "@phosphor-icons/react";

export type BodyPoint = { x: number; y: number; z: number };
export type BodyMapObservation = BodyPoint & { id: string; kind: "redness" | "wound" | "fracture" | "other"; label: string };

type Props = { gender: string | null | undefined; observations: BodyMapObservation[]; selectedId: string | null; placing: boolean; onSelect: (id: string) => void; onPlace: (point: BodyPoint) => void };

const colors: Record<BodyMapObservation["kind"], number> = { redness: 0xba7621, wound: 0xcc4d41, fracture: 0x285ddd, other: 0x28746e };

export function BodyMap3D({ gender, observations, selectedId, placing, onSelect, onPlace }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSelect, onPlace, placing });
  const modelRef = useRef<THREE.Group | null>(null);
  const markerRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const targetYaw = useRef(0);
  const targetZoom = useRef(1);
  const targetFocus = useRef(1.78);
  const [angle, setAngle] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [supported, setSupported] = useState(true);

  useEffect(() => { callbacks.current = { onSelect, onPlace, placing }; }, [onSelect, onPlace, placing]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
    catch { const timer = window.setTimeout(() => setSupported(false), 0); return () => window.clearTimeout(timer); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xffffff, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", "Drehbares Körpermodell. Ziehen zum Drehen, klicken zum Markieren einer Körperstelle.");
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.45, 1.45, 2.05, -2.05, 0.1, 40);
    camera.position.set(0, 1.78, 8); camera.lookAt(0, 1.78, 0);
    cameraRef.current = camera;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb6c6d9, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.15); key.position.set(-3, 5, 6); scene.add(key);
    const fill = new THREE.DirectionalLight(0xd7e8ff, 1.25); fill.position.set(3, 2, -5); scene.add(fill);
    const model = new THREE.Group(); scene.add(model); modelRef.current = model;
    const skin = new THREE.MeshStandardMaterial({ color: 0xc6d6e7, roughness: 0.76, metalness: 0.02 });
    const skinDark = new THREE.MeshStandardMaterial({ color: 0xafc3d8, roughness: 0.82 });
    const makePart = (name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, material = skin, rotation = 0) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
      mesh.name = name; mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.rotation.z = rotation;
      mesh.userData.body = true; model.add(mesh); return mesh;
    };
    const female = gender === "female";
    const shoulder = female ? 0.48 : gender === "male" ? 0.57 : 0.52;
    const hip = female ? 0.49 : gender === "male" ? 0.39 : 0.44;
    makePart("Kopf", 0, 3.23, 0, female ? 0.25 : 0.26, 0.33, 0.24);
    makePart("Hals", 0, 2.89, 0, 0.15, 0.16, 0.15, skinDark);
    makePart("Brustkorb", 0, 2.43, 0, shoulder, 0.52, 0.31);
    makePart("Bauch", 0, 1.95, 0, female ? 0.36 : 0.40, 0.32, 0.28);
    makePart("Becken", 0, 1.66, 0, hip, 0.30, 0.31);
    if (female) {
      makePart("Brust links", -0.22, 2.49, 0.24, 0.23, 0.18, 0.17);
      makePart("Brust rechts", 0.22, 2.49, 0.24, 0.23, 0.18, 0.17);
    }
    for (const side of [-1, 1]) {
      const s = side;
      makePart("Oberarm", s * (shoulder + 0.12), 2.38, 0, 0.19, 0.43, 0.20, skin, s * 0.11);
      makePart("Unterarm", s * (shoulder + 0.21), 1.72, 0, 0.145, 0.37, 0.16, skin, s * 0.06);
      makePart("Hand", s * (shoulder + 0.24), 1.31, 0.02, 0.12, 0.17, 0.10);
      makePart("Oberschenkel", s * 0.23, 1.16, 0, female ? 0.235 : 0.22, 0.48, 0.25, skin, -s * 0.035);
      makePart("Unterschenkel", s * 0.24, 0.48, 0, 0.16, 0.42, 0.17);
      makePart("Fuss", s * 0.24, 0.095, 0.13, 0.18, 0.10, 0.32);
    }
    const markerGroup = new THREE.Group(); model.add(markerGroup); markerRef.current = markerGroup;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let start: { x: number; y: number; yaw: number } | null = null;
    let dragged = false;
    const pointerDown = (event: PointerEvent) => { start = { x: event.clientX, y: event.clientY, yaw: targetYaw.current }; dragged = false; renderer.domElement.setPointerCapture(event.pointerId); };
    const pointerMove = (event: PointerEvent) => {
      if (!start) return;
      const distance = event.clientX - start.x;
      if (Math.abs(distance) > 3 || Math.abs(event.clientY - start.y) > 3) dragged = true;
      if (dragged) { targetYaw.current = start.yaw + distance * 0.011; setAngle((Math.round(((targetYaw.current * 180 / Math.PI) % 360 + 360) % 360 / 5) * 5) % 360); }
    };
    const pointerUp = (event: PointerEvent) => {
      if (!start) return;
      start = null;
      if (dragged) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(model.children, true);
      const marker = hits.find((hit) => typeof hit.object.userData.observationId === "string");
      if (marker) { callbacks.current.onSelect(marker.object.userData.observationId as string); return; }
      if (callbacks.current.placing) {
        const body = hits.find((hit) => hit.object.userData.body);
        if (body) { const local = model.worldToLocal(body.point.clone()); callbacks.current.onPlace({ x: +local.x.toFixed(3), y: +local.y.toFixed(3), z: +local.z.toFixed(3) }); }
      }
    };
    const wheel = (event: WheelEvent) => { event.preventDefault(); targetZoom.current = THREE.MathUtils.clamp(targetZoom.current - Math.sign(event.deltaY) * 0.18, 1, 3); setZoom(targetZoom.current); };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    const resize = () => { const width = host.clientWidth; const height = host.clientHeight; renderer.setSize(width, height, false); const aspect = width / height; camera.left = -2.05 * aspect; camera.right = 2.05 * aspect; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    let frame = 0;
    const render = () => { model.rotation.y += (targetYaw.current - model.rotation.y) * 0.15; camera.zoom += (targetZoom.current - camera.zoom) * 0.16; camera.position.y += (targetFocus.current - camera.position.y) * 0.15; camera.lookAt(0, camera.position.y, 0); camera.updateProjectionMatrix(); renderer.render(scene, camera); frame = requestAnimationFrame(render); };
    render();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointermove", pointerMove); renderer.domElement.removeEventListener("pointerup", pointerUp); renderer.domElement.removeEventListener("wheel", wheel);
      host.removeChild(renderer.domElement); scene.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()); } }); renderer.dispose(); modelRef.current = null; markerRef.current = null; cameraRef.current = null;
    };
  }, [gender]);

  useEffect(() => {
    const group = markerRef.current;
    if (!group) return;
    group.children.forEach((child) => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); (child.material as THREE.Material).dispose(); } });
    group.clear();
    for (const observation of observations) {
      const selected = observation.id === selectedId;
      const color = colors[observation.kind];
      const dot = new THREE.Mesh(new THREE.SphereGeometry(selected ? 0.054 : 0.037, 16, 12), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.1, roughness: 0.35 }));
      dot.position.set(observation.x, observation.y, observation.z); dot.userData.observationId = observation.id; group.add(dot);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(selected ? 0.075 : 0.056, 16, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: selected ? 0.20 : 0.13, depthWrite: false }));
      halo.position.copy(dot.position); halo.userData.observationId = observation.id; group.add(halo);
    }
  }, [observations, selectedId, gender]);

  useEffect(() => {
    if (!selectedId) return;
    const observation = observations.find((item) => item.id === selectedId);
    if (!observation) return;
    const yaw = -Math.atan2(observation.x, observation.z || 0.001);
    const turns = Math.round((targetYaw.current - yaw) / (Math.PI * 2));
    targetYaw.current = yaw + turns * Math.PI * 2;
    targetZoom.current = 2.1;
    targetFocus.current = THREE.MathUtils.clamp(observation.y, 0.42, 3.18);
    const timer = window.setTimeout(() => { setAngle(Math.round(((targetYaw.current * 180 / Math.PI) % 360 + 360) % 360)); setZoom(2.1); }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedId, observations]);

  const rotate = (degrees: number) => { targetYaw.current += THREE.MathUtils.degToRad(degrees); setAngle(Math.round(((targetYaw.current * 180 / Math.PI) % 360 + 360) % 360)); };
  const changeZoom = (delta: number) => { targetZoom.current = THREE.MathUtils.clamp(targetZoom.current + delta, 1, 3); setZoom(targetZoom.current); };
  const reset = () => { targetYaw.current = 0; targetZoom.current = 1; targetFocus.current = 1.78; setAngle(0); setZoom(1); };
  return <div className="clinical-body-viewer">
    <div className={`clinical-body-canvas ${placing ? "placing" : ""}`} ref={containerRef}>{!supported && <p>Die 3D-Ansicht ist auf diesem Gerät nicht verfügbar.</p>}</div>
    <div className="clinical-body-toolbar" aria-label="Körperansicht steuern">
      <button type="button" onClick={() => rotate(-45)} aria-label="Nach links drehen">↶</button>
      <input type="range" min="0" max="360" step="5" value={angle} onChange={(event) => { const value = Number(event.target.value); targetYaw.current = THREE.MathUtils.degToRad(value); setAngle(value); }} aria-label="Körper um 360 Grad drehen"/>
      <button type="button" onClick={() => rotate(45)} aria-label="Nach rechts drehen">↷</button>
      <button type="button" onClick={() => changeZoom(-0.35)} aria-label="Verkleinern"><Minus aria-hidden="true"/></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" onClick={() => changeZoom(0.35)} aria-label="Vergrössern"><Plus aria-hidden="true"/></button>
      <button type="button" onClick={reset} aria-label="Ansicht zurücksetzen"><ArrowCounterClockwise aria-hidden="true"/></button>
    </div>
    <p className="clinical-body-hint">{placing ? "Körperstelle antippen, um den Befund dort zu erfassen." : "Ziehen zum Drehen · Mausrad oder Tasten zum Vergrössern"}</p>
  </div>;
}
