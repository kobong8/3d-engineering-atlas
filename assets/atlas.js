import { furniturePlans, gridPath, overlaps } from "./algorithms.js";

const lessons = [...document.querySelectorAll(".lesson")];
const mode = document.querySelector("#mode");
const controls = document.querySelector(".slide-controls");
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");
const page = document.querySelector("#page");
const labs = [];
let pageIndex = 0;

function showSlide() {
  const presenting = mode.getAttribute("aria-pressed") === "true";
  document.body.classList.toggle("presentation", presenting);
  controls.hidden = !presenting;
  lessons.forEach((lesson, index) => {
    lesson.hidden = presenting && index !== pageIndex;
  });
  page.textContent = `${pageIndex + 1} / ${lessons.length}`;
  previous.disabled = pageIndex === 0;
  next.disabled = pageIndex === lessons.length - 1;
}

mode.addEventListener("click", () => {
  const starting = mode.getAttribute("aria-pressed") === "false";
  const linked = lessons.findIndex(lesson => `#${lesson.id}` === location.hash);
  if (starting && linked !== -1) pageIndex = linked;
  mode.setAttribute("aria-pressed", String(starting));
  mode.textContent = starting ? "스크롤 모드" : "발표 모드";
  showSlide();
});
previous.addEventListener("click", () => {
  pageIndex -= 1;
  showSlide();
  if (previous.disabled) next.focus();
});
next.addEventListener("click", () => {
  pageIndex += 1;
  showSlide();
  if (next.disabled) previous.focus();
});

const B = window.BABYLON;

function createLab(id, color) {
  const canvas = document.querySelector(`#${id}-view`);
  const engine = new B.Engine(canvas, true, { limitDeviceRatio: 1.5 }, true);
  const scene = new B.Scene(engine);
  const lab = { engine, scene };
  labs.push(lab);
  const background = B.Color3.FromHexString(color);
  scene.clearColor = new B.Color4(background.r, background.g, background.b, 1);
  const camera = new B.ArcRotateCamera("orbit", -Math.PI / 3, Math.PI / 3, 8, B.Vector3.Zero(), scene);
  camera.lowerRadiusLimit = 4;
  camera.upperRadiusLimit = 15;
  camera.attachControl(canvas, true);
  const light = new B.HemisphericLight("hemisphere", new B.Vector3(0, 1, 0), scene);
  light.intensity = 0.9;
  const render = () => scene.render();
  const visibility = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      engine.resize();
      engine.runRenderLoop(render);
    } else {
      engine.stopRenderLoop(render);
    }
  });
  visibility.observe(canvas);
  const resize = new ResizeObserver(() => {
    if (canvas.clientWidth && canvas.clientHeight) engine.resize();
  });
  resize.observe(canvas);
  Object.assign(lab, { visibility, resize });
  return { scene, camera, engine };
}

function material(scene, name, color) {
  const result = new B.StandardMaterial(name, scene);
  result.diffuseColor = B.Color3.FromHexString(color);
  result.specularColor = B.Color3.Black();
  return result;
}

function buildCoordinates() {
  const { scene } = createLab("coordinates", "#e8f1fb");
  for (const [axis, end, color] of [
    ["X", new B.Vector3(4, 0, 0), "#b73246"],
    ["Y", new B.Vector3(0, 2.8, 0), "#08764b"],
    ["Z", new B.Vector3(0, 0, 3), "#2559a4"],
  ]) {
    const line = B.MeshBuilder.CreateLines(axis, { points: [end.negate(), end] }, scene);
    line.color = B.Color3.FromHexString(color);
    line.isPickable = false;
  }
  const box = B.MeshBuilder.CreateBox("coordinate-box", {}, scene);
  const normal = material(scene, "default", "#6999dc");
  const selected = material(scene, "selected", "#d47740");
  box.material = normal;
  const selectBox = active => {
    box.material = active ? selected : normal;
    document.querySelector("#selection").textContent = active ? "상자가 선택되었습니다." : "상자를 클릭해 선택하세요.";
  };
  scene.onPointerObservable.add(event => selectBox(event.pickInfo?.pickedMesh === box), B.PointerEventTypes.POINTERPICK);
  box.onReset = () => selectBox(false);
  const slider = document.querySelector("#position");
  slider.addEventListener("input", () => {
    box.position.x = slider.valueAsNumber;
    document.querySelector("#position-value").value = box.position.x.toFixed(1);
  });
}

function buildMesh() {
  const { scene, camera } = createLab("mesh", "#fff1b8");
  camera.alpha = -Math.PI / 2;
  camera.beta = Math.PI / 2.4;
  camera.radius = 5.5;
  const corners = [
    new B.Vector3(-1.4, -1, 0), new B.Vector3(1.4, -1, 0),
    new B.Vector3(1.4, 1, 0), new B.Vector3(-1.4, 1, 0),
  ];
  const surface = new B.Mesh("indexed-quad", scene);
  surface.material = material(scene, "quad", "#e7b555");
  surface.material.backFaceCulling = false;
  surface.material.zOffset = 1;
  const markerMaterial = material(scene, "vertices", "#54417e");
  corners.forEach((corner, index) => {
    const marker = B.MeshBuilder.CreateSphere(`vertex-${index}`, { diameter: 0.15, segments: 10 }, scene);
    marker.position.copyFrom(corner);
    marker.material = markerMaterial;
  });
  const diagonal = B.MeshBuilder.CreateLines("diagonal", {
    points: [corners[0], corners[2]], updatable: true,
  }, scene);
  diagonal.color = B.Color3.FromHexString("#54417e");
  const data = new B.VertexData();
  data.positions = corners.flatMap(corner => corner.asArray());
  data.indices = [0, 1, 2, 0, 2, 3];
  data.normals = [];
  B.VertexData.ComputeNormals(data.positions, data.indices, data.normals);
  data.applyToMesh(surface);
  let flipped = false;
  const button = document.querySelector("#diagonal");
  button.addEventListener("click", () => {
    flipped = !flipped;
    const indices = flipped ? [0, 1, 3, 1, 2, 3] : data.indices;
    surface.setIndices(indices);
    const points = flipped ? [corners[1], corners[3]] : [corners[0], corners[2]];
    B.MeshBuilder.CreateLines("diagonal", { points, instance: diagonal }, scene);
    button.setAttribute("aria-pressed", String(flipped));
    document.querySelector("#indices").textContent = `[${indices.join(", ")}]`;
  });
}

function buildBounds() {
  const { scene } = createLab("bounds", "#e9e3ff");
  const box = B.MeshBuilder.CreateBox("rotating-box", { width: 3, height: 1.2, depth: 1.3 }, scene);
  box.material = material(scene, "solid", "#9e88cb");
  const square = z => [
    new B.Vector3(-0.5, -0.5, z), new B.Vector3(0.5, -0.5, z),
    new B.Vector3(0.5, 0.5, z), new B.Vector3(-0.5, 0.5, z),
  ];
  const front = square(-0.5);
  const back = square(0.5);
  const frame = B.MeshBuilder.CreateLineSystem("aabb", {
    lines: [
      [...front, front[0]], [...back, back[0]],
      ...front.map((corner, index) => [corner, back[index]]),
    ],
  }, scene);
  frame.color = B.Color3.FromHexString("#4a347b");
  const oriented = frame.clone("obb");
  oriented.color = B.Color3.FromHexString("#ad3e35");
  oriented.scaling.set(3.02, 1.22, 1.32);
  oriented.parent = box;
  watchControls(["show-obb"], () => oriented.setEnabled(document.querySelector("#show-obb").checked));
  const slider = document.querySelector("#rotation");
  const update = () => {
    const angle = slider.valueAsNumber;
    box.rotation.y = angle * Math.PI / 180;
    box.computeWorldMatrix(true);
    const { maximumWorld, minimumWorld } = box.getBoundingInfo().boundingBox;
    const size = maximumWorld.subtract(minimumWorld);
    frame.position.copyFrom(maximumWorld.add(minimumWorld).scale(0.5));
    frame.scaling.copyFrom(size);
    document.querySelector("#rotation-value").value = `${angle}°`;
    document.querySelector("#dimensions").textContent = `X ${size.x.toFixed(2)} · Z ${size.z.toFixed(2)}`;
  };
  slider.addEventListener("input", update);
  update();
}

function disposeLabs() {
  for (const { visibility, resize, engine } of labs.splice(0)) {
    visibility?.disconnect();
    resize?.disconnect();
    engine.dispose();
  }
}

window.addEventListener("pagehide", event => {
  if (!event.persisted) disposeLabs();
});

function watchControls(ids, update) {
  for (const id of ids) document.getElementById(id).addEventListener("input", update);
  update();
}

function buildCollision() {
  const { scene } = createLab("collision", "#e8f1fb");
  const a = B.MeshBuilder.CreateBox("fixed-box", { size: 2 }, scene);
  const b = B.MeshBuilder.CreateBox("moving-box", { size: 2 }, scene);
  a.material = material(scene, "fixed", "#7aa7db");
  const clear = material(scene, "separated", "#8473bb");
  const touching = material(scene, "intersecting", "#da775e");
  watchControls(["separation"], () => {
    const distance = document.querySelector("#separation").valueAsNumber;
    a.position.x = -distance / 2;
    b.position.x = distance / 2;
    const bounds = mesh => {
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      return { min: box.minimumWorld.asArray(), max: box.maximumWorld.asArray() };
    };
    const hit = overlaps(bounds(a), bounds(b));
    b.material = hit ? touching : clear;
    document.querySelector("#collision-status").textContent =
      `${distance.toFixed(1)} m · ${hit ? "접촉 또는 겹침" : "분리"}`;
  });
}

function buildCamera() {
  const { scene, camera } = createLab("camera", "#e8f1fb");
  camera.alpha = -Math.PI / 2;
  camera.beta = Math.PI / 2.8;
  const base = material(scene, "fov-boxes", "#6c88cb");
  for (let x = -3; x <= 3; x++) {
    const box = B.MeshBuilder.CreateBox(`fov-${x}`, { size: 0.8 }, scene);
    box.position.x = x * 1.2;
    box.material = base;
  }
  watchControls(["fov"], () => {
    const angle = document.querySelector("#fov").valueAsNumber;
    camera.fov = angle * Math.PI / 180;
    document.querySelector("#fov-value").value = `${angle}°`;
  });
}

function buildLight() {
  const { scene } = createLab("light", "#fff1b8");
  scene.getLightByName("hemisphere").intensity = 0.22;
  const light = new B.PointLight("key", new B.Vector3(-2.5, 3, -3), scene);
  const sphere = B.MeshBuilder.CreateSphere("surface", { diameter: 3, segments: 32 }, scene);
  const surface = new B.PBRMaterial("ceramic", scene);
  surface.albedoColor = B.Color3.FromHexString("#cd7954");
  surface.metallic = 0;
  sphere.material = surface;
  watchControls(["roughness", "intensity"], () => {
    surface.roughness = document.querySelector("#roughness").valueAsNumber;
    light.intensity = document.querySelector("#intensity").valueAsNumber;
  });
}

function buildInstances() {
  const { scene, camera, engine } = createLab("instances", "#e9e3ff");
  camera.radius = 18;
  camera.upperRadiusLimit = 40;
  camera.lowerRadiusLimit = 8;
  const size = 12;
  const count = size * size;
  const source = B.MeshBuilder.CreateBox("thin-source", { size: 0.56 }, scene);
  source.material = material(scene, "boxes", "#5469bd");
  const matrices = new Float32Array(count * 16);
  const meshes = [];
  for (let index = 0; index < count; index++) {
    const x = index % size - (size - 1) / 2;
    const z = Math.floor(index / size) - (size - 1) / 2;
    const matrix = B.Matrix.Translation(x, 0, z);
    matrix.copyToArray(matrices, index * 16);
    const box = source.clone(`box-${index}`, null);
    box.position.set(x, 0, z);
    meshes.push(box);
  }
  source.thinInstanceSetBuffer("matrix", matrices, 16, true);
  const sceneMetrics = new B.SceneInstrumentation(scene);
  sceneMetrics.captureRenderTime = true;
  const engineMetrics = new B.EngineInstrumentation(engine);
  engineMetrics.captureGPUFrameTime = Boolean(engine.getCaps().timerQuery);
  let times = [];
  let lastFrame = 0;
  const output = document.querySelector("#instance-metrics");
  scene.onAfterRenderObservable.add(() => {
    const now = performance.now();
    if (lastFrame && now - lastFrame < 250) times.push(now - lastFrame);
    lastFrame = now;
    if (times.length < 25) return;
    times.sort((a, b) => a - b);
    const p50 = times[12];
    const p95 = times[23];
    const gpu = engineMetrics.gpuFrameTimeCounter.current;
    output.textContent = `${count}개 · draw calls ${sceneMetrics.drawCallsCounter.current} · 삼각형 ${count * 12} · ${(1000 / p50).toFixed(1)} FPS · 프레임 p50 ${p50.toFixed(1)} ms / p95 ${p95.toFixed(1)} ms · CPU 렌더 ${sceneMetrics.renderTimeCounter.current.toFixed(2)} ms · GPU ${gpu > 0 ? (gpu / 1e6).toFixed(2) + " ms" : "측정 불가"} · 행렬 버퍼 ${(matrices.byteLength / 1024).toFixed(1)} KiB`;
    times = [];
  });
  scene.onDisposeObservable.add(() => {
    sceneMetrics.dispose();
    engineMetrics.dispose();
  });
  watchControls(["instance-mode"], () => {
    const thin = document.querySelector("#instance-mode").value === "thin";
    source.setEnabled(thin);
    meshes.forEach(mesh => mesh.setEnabled(!thin));
    times = [];
    lastFrame = 0;
    output.textContent = "프레임 측정 중…";
  });
}

function planCanvas(id, ids, draw) {
  const canvas = document.querySelector(`#${id}-view`);
  canvas.dataset.plan = "";
  const context = canvas.getContext("2d");
  const update = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height || !context) return;
    const ratio = Math.min(devicePixelRatio, 1.5);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);
    draw(context, width, height);
  };
  const observer = new ResizeObserver(update);
  observer.observe(canvas);
  window.addEventListener("pagehide", event => {
    if (!event.persisted) observer.disconnect();
  });
  watchControls(ids, update);
}

function buildPath() {
  const columns = 12;
  const rows = 8;
  const start = 13;
  const goal = 82;
  planCanvas("path", ["path-method", "closed-door"], (ctx, width, height) => {
    const blocked = new Set(Array.from({ length: rows }, (_, row) => row * columns + 5));
    if (!document.querySelector("#closed-door").checked) blocked.delete(3 * columns + 5);
    const astar = document.querySelector("#path-method").value === "astar";
    const { path, visited } = gridPath(columns, rows, blocked, start, goal, astar);
    const size = Math.min((width - 24) / columns, (height - 24) / rows);
    const x = (width - columns * size) / 2;
    const y = (height - rows * size) / 2;
    const marked = new Set(path);
    for (let cell = 0; cell < columns * rows; cell++) {
      const px = x + cell % columns * size;
      const py = y + Math.floor(cell / columns) * size;
      ctx.fillStyle = blocked.has(cell) ? "#253654" : marked.has(cell) ? "#668de4" : visited.has(cell) ? "#bcd6ef" : "#f8fbff";
      ctx.fillRect(px, py, size - 1, size - 1);
      if (cell === start || cell === goal) {
        ctx.fillStyle = "#122141";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(cell === start ? "S" : "G", px + 4, py + 15);
      }
    }
    document.querySelector("#path-status").textContent =
      `${path.length ? `${path.length - 1}칸 이동` : "도달할 수 없음"} · 방문 ${visited.size}칸`;
  });
}

function buildLayout() {
  planCanvas("layout", ["room-width", "layout-rank"], (ctx, width, height) => {
    const room = document.querySelector("#room-width").valueAsNumber;
    const rank = Number(document.querySelector("#layout-rank").value);
    const depth = 5;
    const { door, best } = furniturePlans(room, depth);
    const plan = best[rank];
    const scale = Math.min((width - 26) / room, (height - 26) / depth);
    const x = (width - room * scale) / 2;
    const y = (height - depth * scale) / 2;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, room * scale, depth * scale);
    ctx.strokeStyle = "#52627c";
    ctx.strokeRect(x, y, room * scale, depth * scale);
    const drawBox = (box, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + box.min[0] * scale, y + (depth - box.max[1]) * scale,
        (box.max[0] - box.min[0]) * scale, (box.max[1] - box.min[1]) * scale);
    };
    drawBox(door, "#fff1b8");
    drawBox({ min: [room / 2 - 1, depth - 0.12], max: [room / 2 + 1, depth] }, "#447acc");
    plan?.items.forEach((item, index) => drawBox(item, ["#a3bee6", "#dbaac0", "#b8a7dc"][index]));
    document.querySelector("#layout-status").textContent = plan
      ? `폭 ${room} m · 후보 ${rank + 1}위 · 거리 점수 ${plan.score.toFixed(2)} · 제약 위반 0`
      : `폭 ${room} m · 해당 순위의 후보 없음`;
  });
}

const builders = { coordinates: buildCoordinates, mesh: buildMesh, bounds: buildBounds,
  collision: buildCollision, camera: buildCamera, light: buildLight, instances: buildInstances };
const pending = new Map();
const initialize = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    initialize.unobserve(entry.target);
    pending.get(entry.target)?.();
  }
}, { rootMargin: "160px" });

for (const lesson of lessons) {
  const id = lesson.id;
  const builder = builders[id];
  const fields = [...lesson.querySelectorAll("input, select")].map(field => [field, field.value, field.checked]);
  const button = document.createElement("button");
  button.className = "reset-lab";
  button.textContent = "실습 초기화";
  lesson.firstElementChild.append(button);
  let resetScene;
  if (builder) {
    pending.set(lesson, () => {
      pending.delete(lesson);
      try {
        builder();
        const { scene } = labs.at(-1);
        const camera = scene.activeCamera;
        const initial = [camera.alpha, camera.beta, camera.radius];
        resetScene = () => {
          [camera.alpha, camera.beta, camera.radius] = initial;
          camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0;
          scene.getMeshByName("coordinate-box")?.onReset();
        };
      } catch (error) {
        lesson.querySelector("canvas").hidden = true;
        lesson.querySelector(".lab-fallback").hidden = false;
        document.querySelector("#lab-error").hidden = false;
        console.error(error);
      }
    });
    initialize.observe(lesson);
    lesson.addEventListener("focusin", () => {
      initialize.unobserve(lesson);
      pending.get(lesson)?.();
    }, { once: true });
  }
  button.addEventListener("click", () => {
    for (const [field, value, checked] of fields) {
      field.value = value;
      if (field.type === "checkbox") field.checked = checked;
      field.dispatchEvent(new Event("input"));
    }
    lesson.querySelector('#diagonal[aria-pressed="true"]')?.click();
    resetScene?.();
  });
}
window.addEventListener("pagehide", event => {
  if (!event.persisted) initialize.disconnect();
});
buildPath();
buildLayout();
