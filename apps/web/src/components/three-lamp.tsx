"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

function disposeModel(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

export default function ThreeLamp({
  colour,
  onStatusChange,
}: {
  colour: string;
  onStatusChange: (status: "loading" | "ready" | "error") => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latestColour = useRef(colour);
  const paintedMaterials = useRef<THREE.MeshStandardMaterial[]>([]);
  const renderScene = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    latestColour.current = colour;
    paintedMaterials.current.forEach((material) => material.color.set(colour));
    renderScene.current?.();
  }, [colour]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    setReady(false);
    onStatusChange("loading");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: element,
        alpha: true,
        antialias: true,
      });
    } catch {
      // Ordering remains available when WebGL cannot be created.
      onStatusChange("error");
      return;
    }
    let disposed = false;
    let model: THREE.Object3D | undefined;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    camera.position.set(0, 0.7, 6);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.65;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a806e, 1.5));
    const key = new THREE.DirectionalLight(0xfff4e5, 3);
    key.position.set(-3, 5, 4);
    scene.add(key);

    const controls = new OrbitControls(camera, element);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.rotateSpeed = 0.5;
    controls.minAzimuthAngle = -Math.PI / 3;
    controls.maxAzimuthAngle = Math.PI / 3;
    // Keep the lamp upright and prevent orbiting behind or far underneath it.
    controls.minPolarAngle = THREE.MathUtils.degToRad(55);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(95);
    // Let vertical touch gestures keep scrolling the page.
    element.style.touchAction = "pan-y";
    const render = () => {
      if (!disposed) renderer.render(scene, camera);
    };
    renderScene.current = render;
    controls.addEventListener("change", render);
    const resize = () => {
      const parent = element.parentElement!;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const limitingFov = Math.min(
        verticalFov,
        2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect),
      );
      const distance = 1.8 / Math.tan(limitingFov / 2);
      const direction = camera.position.clone().sub(controls.target);
      if (!direction.lengthSq()) direction.set(0, 0.12, 1);
      camera.position
        .copy(controls.target)
        .add(direction.normalize().multiplyScalar(distance));
      camera.updateProjectionMatrix();
      controls.update();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element.parentElement!);
    const onKey = (event: KeyboardEvent) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta = THREE.MathUtils.clamp(
        spherical.theta +
          (event.key === "ArrowLeft"
            ? -0.12
            : event.key === "ArrowRight"
              ? 0.12
              : 0),
        controls.minAzimuthAngle,
        controls.maxAzimuthAngle,
      );
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi +
          (event.key === "ArrowUp"
            ? -0.1
            : event.key === "ArrowDown"
              ? 0.1
              : 0),
        controls.minPolarAngle,
        controls.maxPolarAngle,
      );
      camera.position
        .copy(controls.target)
        .add(new THREE.Vector3().setFromSpherical(spherical));
      controls.update();
      render();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setReady(false);
      onStatusChange("error");
    };
    element.addEventListener("keydown", onKey);
    element.addEventListener("webglcontextlost", onContextLost);
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15000);
    async function load() {
      try {
        const response = await fetch("/assets/Lampa.glb", {
          signal: abort.signal,
        });
        if (!response.ok) throw new Error("Lamp asset unavailable");
        const gltf = await new GLTFLoader().parseAsync(
          await response.arrayBuffer(),
          "/assets/",
        );
        if (disposed) {
          disposeModel(gltf.scene);
          return;
        }
        model = gltf.scene;
        const base = model.getObjectByName("Base");
        if (!base) throw new Error("Lamp Base is missing");
        base.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => {
            if (
              material instanceof THREE.MeshStandardMaterial &&
              material.name === "LampColor"
            ) {
              material.color.set(latestColour.current);
              paintedMaterials.current.push(material);
            }
          });
        });
        if (!paintedMaterials.current.length)
          throw new Error("LampColor material is missing");
        // Hide the exported oversized floor; only the lamp determines framing.
        const plane = model.getObjectByName("Plane");
        if (plane) plane.visible = false;
        const bounds = new THREE.Box3().setFromObject(base);
        const bulb = model.getObjectByName("Bola");
        if (bulb) bounds.union(new THREE.Box3().setFromObject(bulb));
        const size = bounds.getSize(new THREE.Vector3());
        const centre = bounds.getCenter(new THREE.Vector3());
        const scale = 3 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        model.position.copy(centre).multiplyScalar(-scale);
        scene.add(model);
        model.updateMatrixWorld(true);
        if (bulb) {
          // glTF emission is preserved. A light also illuminates nearby lamp surfaces;
          // emissive materials alone do not cast light in this renderer.
          const glow = new THREE.PointLight(0xffd58a, 4, 5, 2);
          new THREE.Box3().setFromObject(bulb).getCenter(glow.position);
          glow.position.y -= 0.12;
          scene.add(glow);
        }
        resize();
        setReady(true);
        onStatusChange("ready");
      } catch {
        if (!disposed) {
          setReady(false);
          onStatusChange("error");
        }
      } finally {
        clearTimeout(timeout);
      }
    }
    void load();
    return () => {
      disposed = true;
      abort.abort();
      clearTimeout(timeout);
      observer.disconnect();
      element.removeEventListener("keydown", onKey);
      element.removeEventListener("webglcontextlost", onContextLost);
      controls.dispose();
      if (model) disposeModel(model);
      environment.dispose();
      paintedMaterials.current = [];
      renderScene.current = null;
      renderer.dispose();
    };
  }, [onStatusChange]);

  return (
    <canvas
      ref={canvas}
      className="lamp-canvas"
      data-ready={ready}
      tabIndex={ready ? 0 : -1}
      aria-label="3D lamp. Drag or use arrow keys to orbit within the viewing limits."
      aria-hidden={!ready}
    />
  );
}
