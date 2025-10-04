// Minimal Three.js scene with a stylized cartoon character (simple low-poly proxy) and gentle animation
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

(function () {
  const container = document.getElementById("scene-container");
  const width = container.clientWidth;
  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xeef6ff, 0.0012);

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(1.5, 1.6, 2.8);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.6);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(5, 10, 7);
  dir.castShadow = true;
  dir.shadow.bias = -0.001;
  dir.shadow.mapSize.set(2048, 2048);
  scene.add(dir);

  // Ground soft shadow
  const groundGeo = new THREE.PlaneGeometry(10, 10);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.08 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.85;
  ground.receiveShadow = true;
  scene.add(ground);

  // Attempt to load a GLTF character model from /models/character.glb
  const loader = new GLTFLoader();
  let char = new THREE.Group();
  function createFallbackCharacter() {
    const g = new THREE.Group();
    const bodyGeo = new THREE.CapsuleGeometry(0.18, 0.6, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x061a40,
      metalness: 0.1,
      roughness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = -0.05;
    g.add(body);
    const shirt = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.28, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6 })
    );
    shirt.position.y = -0.08;
    g.add(shirt);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 32, 24),
      new THREE.MeshStandardMaterial({ color: 0xffe0d6 })
    );
    head.position.y = 0.42;
    head.castShadow = true;
    g.add(head);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.185, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1f2937 })
    );
    hair.position.set(0, 0.47, 0);
    hair.rotation.x = -0.1;
    hair.castShadow = true;
    g.add(hair);
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x061a40 })
    );
    arm.position.set(0.28, 0.06, 0);
    arm.rotation.z = -0.9;
    arm.castShadow = true;
    g.add(arm);
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffe0d6 })
    );
    hand.position.set(0.55, -0.1, 0);
    hand.castShadow = true;
    g.add(hand);
    g.position.set(-0.6, -0.2, 0);
    g.scale.set(1.6, 1.6, 1.6);
    return g;
  }

  loader.load(
    "/models/character.glb",
    (gltf) => {
      char = gltf.scene;
      char.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
          if (n.material) {
            n.material.roughness = n.material.roughness ?? 0.5;
          }
        }
      });
      char.position.set(-0.6, -0.2, 0);
      char.scale.set(1.2, 1.2, 1.2);
      scene.add(char);
    },
    undefined,
    (err) => {
      console.warn("GLTF load failed, using fallback primitives", err);
      char = createFallbackCharacter();
      scene.add(char);
    }
  );

  // Floating rounded card proxy (for interaction lighting/reflection)
  const cardGeo = new THREE.BoxGeometry(1.2, 0.75, 0.1);
  const cardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.05,
  });
  const cardMesh = new THREE.Mesh(cardGeo, cardMat);
  cardMesh.position.set(0.7, -0.05, 0);
  cardMesh.rotation.y = -0.08;
  cardMesh.castShadow = true;
  cardMesh.receiveShadow = true;
  cardMesh.scale.set(0.9, 0.9, 1);
  cardMesh.material.transparent = true;
  scene.add(cardMesh);

  // controls (subtle)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = 1.0;
  controls.maxPolarAngle = 1.8;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;

  // Resize handling
  window.addEventListener("resize", onResize);
  function onResize() {
    const w = container.clientWidth,
      h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // subtle bob animation
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    char.rotation.y = Math.sin(t * 0.5) * 0.08;
    char.position.y = Math.sin(t * 0.8) * 0.015 - 0.2;
    cardMesh.position.y = -0.05 + Math.sin(t * 0.9) * 0.01;
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // expose debug access
  window._three_login = { scene, camera, renderer, char, cardMesh };
})();
