const courses = [...document.querySelectorAll(".course")];
const tracks = [...document.querySelectorAll("[data-track]")].map(item => ({
  item,
  text: document.getElementById(item.dataset.track).textContent.normalize("NFKC").toLowerCase(),
}));
const query = document.querySelector("#track-query");
const results = document.querySelector("#track-results");
const select = document.querySelector("#chapter-select");
const mode = document.querySelector("#reading-mode");
const controls = document.querySelector("#chapter-controls");
const previous = document.querySelector("#chapter-previous");
const next = document.querySelector("#chapter-next");
const position = document.querySelector("#chapter-position");
const progress = document.querySelector("#chapter-progress");
const outline = [...document.querySelectorAll(".course-outline a")];
const groups = [...document.querySelectorAll(".track-group")];
progress.max = courses.length;
let active = 0;

query.addEventListener("input", () => {
  const terms = query.value.normalize("NFKC").toLowerCase().trim().split(/\s+/).filter(Boolean);
  let found = 0;
  for (const { item, text } of tracks) {
    item.hidden = !terms.every(term => text.includes(term));
    if (!item.hidden) found++;
  }
  for (const group of groups) group.hidden = !group.querySelector("[data-track]:not([hidden])");
  results.hidden = terms.length === 0;
  results.textContent = found ? `${found}개 트랙` : "일치하는 트랙이 없습니다.";
});

function locationState() {
  const presenting = location.hash.startsWith("#present/");
  const id = location.hash.slice(presenting ? 9 : 1);
  const index = courses.findIndex(course => course.id === id);
  return { presenting: presenting && index >= 0, index };
}

function sync() {
  const { presenting, index } = locationState();
  if (index >= 0) active = index;
  document.body.classList.toggle("course-presentation", presenting);
  select.value = courses[active].id;
  controls.hidden = !presenting;
  progress.hidden = !presenting;
  progress.value = active + 1;
  outline.forEach((link, index) => {
    if (index === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  mode.setAttribute("aria-pressed", String(presenting));
  mode.textContent = presenting ? "스크롤 모드" : "발표 모드";
  courses.forEach((course, index) => {
    course.hidden = presenting && index !== active;
  });
  previous.disabled = active === 0;
  next.disabled = active === courses.length - 1;
  position.textContent = `${active + 1} / ${courses.length}`;
  if (presenting) courses[active].focus({ preventScroll: true });
  if (index >= 0) courses[index].scrollIntoView({ block: "start" });
}
function go(index, presenting = locationState().presenting) {
  if (index < 0 || index >= courses.length) return;
  location.hash = `${presenting ? "present/" : ""}${courses[index].id}`;
}
function move(offset) { go(active + offset); }

previous.addEventListener("click", () => move(-1));
next.addEventListener("click", () => move(1));
mode.addEventListener("click", () => {
  if (!locationState().presenting && locationState().index < 0) {
    const visible = courses.findIndex(course => course.getBoundingClientRect().bottom > 100);
    if (visible >= 0) active = visible;
  }
  go(active, !locationState().presenting);
});
select.addEventListener("change", () => go(select.selectedIndex));
for (const [index, link] of outline.entries()) {
  link.addEventListener("click", event => {
    if (!locationState().presenting || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    go(index);
  });
}
window.addEventListener("hashchange", sync);
document.addEventListener("keydown", event => {
  if (!locationState().presenting || event.altKey || event.ctrlKey || event.metaKey ||
      event.target.closest("input, select, textarea, button, a")) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  }
});
for (const code of document.querySelectorAll(".course pre > code")) {
  const pre = code.parentElement;
  const button = document.createElement("button");
  button.textContent = "코드 복사";
  pre.before(button);
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent);
      button.textContent = "복사 완료";
    } catch {
      button.textContent = "복사할 수 없습니다";
    }
  });
}
for (const table of document.querySelectorAll(".course table")) {
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrap";
  wrapper.tabIndex = 0;
  table.before(wrapper);
  wrapper.append(table);
}
sync();
