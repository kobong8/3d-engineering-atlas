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
  const engine = new B.Engine(canvas, true, {}, true);
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
  return { scene, camera };
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
  scene.onPointerObservable.add(event => {
    const active = event.pickInfo?.pickedMesh === box;
    box.material = active ? selected : normal;
    document.querySelector("#selection").textContent = active ? "상자가 선택되었습니다." : "상자를 클릭해 선택하세요.";
  }, B.PointerEventTypes.POINTERPICK);
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
  document.querySelector("#diagonal").addEventListener("click", () => {
    flipped = !flipped;
    const indices = flipped ? [0, 1, 3, 1, 2, 3] : data.indices;
    surface.setIndices(indices);
    const points = flipped ? [corners[1], corners[3]] : [corners[0], corners[2]];
    B.MeshBuilder.CreateLines("diagonal", { points, instance: diagonal }, scene);
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
try {
  buildCoordinates();
  buildMesh();
  buildBounds();
} catch (error) {
  disposeLabs();
  document.querySelector("#lab-error").hidden = false;
  console.error(error);
}
