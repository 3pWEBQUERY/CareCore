"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowCounterClockwise, Minus, Plus } from "@phosphor-icons/react";

export type BodyPoint = { x: number; y: number; z: number };
export type BodyMapObservation = BodyPoint & {
  id: string;
  kind: "redness" | "wound" | "fracture" | "other";
  label: string;
};

type Props = {
  gender: string | null | undefined;
  observations: BodyMapObservation[];
  selectedId: string | null;
  placing: boolean;
  onSelect: (id: string) => void;
  onPlace: (point: BodyPoint) => void;
};

const colors: Record<BodyMapObservation["kind"], number> = {
  redness: 0xba7621,
  wound: 0xcc4d41,
  fracture: 0x285ddd,
  other: 0x28746e,
};

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
  const [modelError, setModelError] = useState("");

  useEffect(() => {
    callbacks.current = { onSelect, onPlace, placing };
  }, [onSelect, onPlace, placing]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      const timer = window.setTimeout(() => setSupported(false), 0);
      return () => window.clearTimeout(timer);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xffffff, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Drehbares Körpermodell. Ziehen zum Drehen, klicken zum Markieren einer Körperstelle.",
    );
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.45, 1.45, 2.05, -2.05, 0.1, 40);
    camera.position.set(0, 1.78, 8);
    camera.lookAt(0, 1.78, 0);
    cameraRef.current = camera;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb6c6d9, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.15);
    key.position.set(-3, 5, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd7e8ff, 1.25);
    fill.position.set(3, 2, -5);
    scene.add(fill);
    const model = new THREE.Group();
    scene.add(model);
    modelRef.current = model;
    const modelSex = gender === "female" ? "female" : "male";
    const modelController = new AbortController();
    fetch(`/body-surfaces/${modelSex}.bin`, { signal: modelController.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Körpermodell konnte nicht geladen werden.");
        const buffer = await response.arrayBuffer();
        const header = new DataView(buffer);
        const vertexCount = header.getUint32(0, true);
        const indexCount = header.getUint32(4, true);
        const expectedBytes = 8 + vertexCount * 18 + indexCount * 4;
        if (buffer.byteLength !== expectedBytes) throw new Error("Körpermodell ist unvollständig.");
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(buffer, 8, vertexCount * 3);
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute(
          "normal",
          new THREE.BufferAttribute(new Int16Array(buffer, 8 + vertexCount * 12, vertexCount * 3), 3, true),
        );
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, 8 + vertexCount * 18, indexCount), 1));
        const suit = new THREE.Color("#d9e3ee");
        const skin = new THREE.Color("#d8bbaa");
        const colors = new Float32Array(vertexCount * 3);
        const height = modelSex === "female" ? 1.65778 : 1.71948;
        for (let i = 0; i < vertexCount; i++) {
          const x = Math.abs(positions[i * 3]);
          const y = positions[i * 3 + 1];
          const exposed =
            y > height - 0.23 || y < 0.105 || (x > (modelSex === "female" ? 0.34 : 0.27) && y > 0.43 && y < 0.9);
          const color = exposed ? skin : suit;
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const surface = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            vertexColors: true,
            roughness: 0.87,
            metalness: 0,
            side: THREE.DoubleSide,
          }),
        );
        surface.scale.setScalar(modelSex === "female" ? 3.55 / 1.65778 : 3.55 / 1.71948);
        surface.userData.body = true;
        if (modelController.signal.aborted) {
          geometry.dispose();
          (surface.material as THREE.Material).dispose();
          return;
        }
        model.add(surface);
        setModelError("");
      })
      .catch((error) => {
        if (!modelController.signal.aborted)
          setModelError(error instanceof Error ? error.message : "Körpermodell konnte nicht geladen werden.");
      });
    const markerGroup = new THREE.Group();
    model.add(markerGroup);
    markerRef.current = markerGroup;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let start: { x: number; y: number; yaw: number } | null = null;
    let dragged = false;
    const pointerDown = (event: PointerEvent) => {
      start = { x: event.clientX, y: event.clientY, yaw: targetYaw.current };
      dragged = false;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!start) return;
      const distance = event.clientX - start.x;
      if (Math.abs(distance) > 3 || Math.abs(event.clientY - start.y) > 3) dragged = true;
      if (dragged) {
        targetYaw.current = start.yaw + distance * 0.011;
        setAngle((Math.round((((((targetYaw.current * 180) / Math.PI) % 360) + 360) % 360) / 5) * 5) % 360);
      }
    };
    const pointerUp = (event: PointerEvent) => {
      if (!start) return;
      start = null;
      if (dragged) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(model.children, true);
      const marker = hits.find((hit) => typeof hit.object.userData.observationId === "string");
      if (marker) {
        callbacks.current.onSelect(marker.object.userData.observationId as string);
        return;
      }
      if (callbacks.current.placing) {
        const body = hits.find((hit) => hit.object.userData.body);
        if (body) {
          const local = model.worldToLocal(body.point.clone());
          callbacks.current.onPlace({ x: +local.x.toFixed(3), y: +local.y.toFixed(3), z: +local.z.toFixed(3) });
        }
      }
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      targetZoom.current = THREE.MathUtils.clamp(targetZoom.current - Math.sign(event.deltaY) * 0.18, 1, 3);
      setZoom(targetZoom.current);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height, false);
      const aspect = width / height;
      camera.left = -2.05 * aspect;
      camera.right = 2.05 * aspect;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let frame = 0;
    const render = () => {
      model.rotation.y += (targetYaw.current - model.rotation.y) * 0.15;
      camera.zoom += (targetZoom.current - camera.zoom) * 0.16;
      camera.position.y += (targetFocus.current - camera.position.y) * 0.15;
      camera.lookAt(0, camera.position.y, 0);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();
    return () => {
      modelController.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("wheel", wheel);
      host.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      modelRef.current = null;
      markerRef.current = null;
      cameraRef.current = null;
    };
  }, [gender]);

  useEffect(() => {
    const group = markerRef.current;
    if (!group) return;
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    group.clear();
    for (const observation of observations) {
      const selected = observation.id === selectedId;
      const color = colors[observation.kind];
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(selected ? 0.054 : 0.037, 16, 12),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.1, roughness: 0.35 }),
      );
      dot.position.set(observation.x, observation.y, observation.z);
      dot.userData.observationId = observation.id;
      group.add(dot);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(selected ? 0.075 : 0.056, 16, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: selected ? 0.2 : 0.13, depthWrite: false }),
      );
      halo.position.copy(dot.position);
      halo.userData.observationId = observation.id;
      group.add(halo);
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
    const timer = window.setTimeout(() => {
      setAngle(Math.round(((((targetYaw.current * 180) / Math.PI) % 360) + 360) % 360));
      setZoom(2.1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedId, observations]);

  const rotate = (degrees: number) => {
    targetYaw.current += THREE.MathUtils.degToRad(degrees);
    setAngle(Math.round(((((targetYaw.current * 180) / Math.PI) % 360) + 360) % 360));
  };
  const changeZoom = (delta: number) => {
    targetZoom.current = THREE.MathUtils.clamp(targetZoom.current + delta, 1, 3);
    setZoom(targetZoom.current);
  };
  const reset = () => {
    targetYaw.current = 0;
    targetZoom.current = 1;
    targetFocus.current = 1.78;
    setAngle(0);
    setZoom(1);
  };
  return (
    <div className="clinical-body-viewer">
      <div className={`clinical-body-canvas ${placing ? "placing" : ""}`} ref={containerRef}>
        {!supported && <p>Die 3D-Ansicht ist auf diesem Gerät nicht verfügbar.</p>}
        {modelError && (
          <p className="clinical-body-model-error" role="alert">
            {modelError}
          </p>
        )}
      </div>
      <div className="clinical-body-toolbar" aria-label="Körperansicht steuern">
        <button type="button" onClick={() => rotate(-45)} aria-label="Nach links drehen">
          ↶
        </button>
        <input
          type="range"
          min="0"
          max="360"
          step="5"
          value={angle}
          onChange={(event) => {
            const value = Number(event.target.value);
            targetYaw.current = THREE.MathUtils.degToRad(value);
            setAngle(value);
          }}
          aria-label="Körper um 360 Grad drehen"
        />
        <button type="button" onClick={() => rotate(45)} aria-label="Nach rechts drehen">
          ↷
        </button>
        <button type="button" onClick={() => changeZoom(-0.35)} aria-label="Verkleinern">
          <Minus aria-hidden="true" />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => changeZoom(0.35)} aria-label="Vergrössern">
          <Plus aria-hidden="true" />
        </button>
        <button type="button" onClick={reset} aria-label="Ansicht zurücksetzen">
          <ArrowCounterClockwise aria-hidden="true" />
        </button>
      </div>
      <p className="clinical-body-hint">
        {placing
          ? "Körperstelle antippen, um den Befund dort zu erfassen."
          : "Ziehen zum Drehen · Mausrad oder Tasten zum Vergrössern"}
      </p>
    </div>
  );
}
