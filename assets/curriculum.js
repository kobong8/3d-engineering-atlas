const courses = [...document.querySelectorAll(".course")];
const normalize = value => value.normalize("NFKC").toLowerCase();
const matches = (text, query) => normalize(query).trim().split(/\s+/).every(term => text.includes(term));
const select = document.querySelector("#chapter-select");
const chapterOptions = [...select.options];
const mode = document.querySelector("#reading-mode");
const controls = document.querySelector("#chapter-controls");
const previous = document.querySelector("#chapter-previous");
const next = document.querySelector("#chapter-next");
const position = document.querySelector("#chapter-position");
const progress = document.querySelector("#chapter-progress");
const viewport = document.querySelector("#curriculum-lessons");
const reader = viewport.closest(".course-layout");
const focusButton = document.querySelector("#reader-focus");
const menu = document.querySelector("#reader-menu");
const overlay = document.querySelector("#reader-overlay");
const rail = document.querySelector("#lecture-outline");
const chapterOutline = rail.querySelector(".chapter-outline");
const slideOutline = rail.querySelector(".slide-outline");
const breadcrumb = document.querySelector("#reader-breadcrumb");
const mobile = matchMedia("(max-width: 900px)");
const search = document.querySelector("#lecture-search");
const copyDialog = document.querySelector("#link-copy");
const searchInput = search.querySelector("input");
const copyButton = document.querySelector("#reader-copy");
const slides = new Map();
let state;
let drawer = false;
let collapsed = false;
let focused = false;
let opener;
let copyTimer;

// Each heading and review exercise becomes a slide. The same blocks remain in reading order in scroll mode.
for (const course of courses) {
  const body = course.querySelector(".body-blocks");
  const title = course.querySelector("h2").textContent;
  const pages = [];
  function addPage(label) {
    const section = document.createElement("div");
    section.className = "lecture-slide";
    body.append(section);
    pages.push({ label, section });
    return section;
  }
  const blocks = [...body.children];
  let page = addPage("시작하기");
  for (const block of blocks) {
    if (block.matches("h3, .self-check")) {
      page = addPage(block.matches("h3") ? block.textContent : "확인 문제");
    }
    page.append(block);
  }
  slides.set(course, { title, pages });
}

const query = document.querySelector("#track-query");
const results = document.querySelector("#track-results");
const tracks = [...document.querySelectorAll("[data-track]")].map(item => ({
  item,
  text: normalize(document.getElementById(item.dataset.track).textContent),
}));
query.addEventListener("input", () => {
  const filtered = query.value.trim().length > 0;
  let found = 0;
  for (const { item, text } of tracks) {
    item.hidden = !matches(text, query.value);
    if (!item.hidden) found++;
  }
  for (const group of document.querySelectorAll(".track-group")) {
    group.hidden = !group.querySelector("[data-track]:not([hidden])");
  }
  results.hidden = !filtered;
  results.textContent = found ? `${found}개 트랙` : "일치하는 트랙이 없습니다.";
});

function route() {
  const [id, page] = location.hash.replace(/^#(?:present\/)?/, "").split("/");
  const course = courses.find(item => item.id === id);
  const module = slides.get(course);
  const presenting = Boolean(module) && location.hash.startsWith("#present/");
  const index = presenting && /^[1-9]\d*$/.test(page) ? Number(page) - 1 : 0;
  return { course, module, presenting, index: index < (module?.pages.length ?? 0) ? index : 0 };
}
function slideHash(course, index) {
  return `#present/${course.id}${index ? `/${index + 1}` : ""}`;
}
function go(index) {
  if (!state.presenting || index < 0 || index >= state.module.pages.length || index === state.index) return;
  history.replaceState(null, "", slideHash(state.course, index));
  sync();
}

function sidebar() {
  const open = mobile.matches ? drawer : !collapsed;
  const drawerVisible = state.presenting && mobile.matches && drawer;
  document.body.classList.toggle("reader-drawer", drawerVisible);
  viewport.inert = controls.inert = drawerVisible;
  document.body.classList.toggle("reader-collapsed", collapsed);
  menu.hidden = !state.presenting || focused;
  overlay.hidden = !drawerVisible;
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "목차 접기" : "목차 열기");
  menu.textContent = open ? "‹" : "☰";
}
function closeDrawer(restore = false) {
  drawer = false;
  sidebar();
  if (restore) menu.focus();
}
menu.addEventListener("click", () => {
  if (mobile.matches) drawer = !drawer;
  else collapsed = !collapsed;
  sidebar();
  if (drawer) slideOutline.querySelector("[aria-current]")?.focus();
});
overlay.addEventListener("click", () => closeDrawer(true));
mobile.addEventListener("change", () => closeDrawer());

function setFocus(enabled) {
  focused = enabled;
  drawer = false;
  document.body.classList.toggle("reader-focused", enabled);
  focusButton.setAttribute("aria-pressed", String(enabled));
  focusButton.textContent = enabled ? "집중 모드 종료 · Esc" : "집중 모드 · F";
  sidebar();
}
async function toggleFocus() {
  setFocus(!focused);
  try {
    if (focused) await document.documentElement.requestFullscreen?.();
    else if (document.fullscreenElement) await document.exitFullscreen();
  } catch { /* The reader layout also works without browser fullscreen. */ }
}
focusButton.addEventListener("click", toggleFocus);
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && focused) setFocus(false);
});

function sync() {
  const last = state;
  state = route();
  const { course, presenting, module, index } = state;
  reader.hidden = !course;
  document.body.classList.toggle("course-reading", Boolean(course) && !presenting);
  document.body.classList.toggle("course-presentation", presenting);
  for (const item of courses) {
    item.hidden = item !== course;
    for (const [i, page] of slides.get(item).pages.entries()) page.section.hidden = presenting && i !== index;
  }
  chapterOutline.hidden = presenting;
  slideOutline.hidden = !presenting;
  controls.hidden = progress.hidden = focusButton.hidden = breadcrumb.hidden = !presenting;
  mode.setAttribute("aria-pressed", String(presenting));
  mode.textContent = presenting ? "스크롤 모드" : "발표 모드";
  if (presenting) {
    const { title, pages } = module;
    if (last?.course !== course || !last.presenting) {
      slideOutline.replaceChildren(...pages.map(({ label }, i) => {
        const item = document.createElement("li");
        const anchor = document.createElement("a");
        const number = document.createElement("span");
        number.textContent = String(i + 1).padStart(2, "0");
        anchor.href = slideHash(course, i);
        anchor.append(number, label);
        anchor.addEventListener("click", event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          go(i);
          closeDrawer();
          course.focus({ preventScroll: true });
        });
        item.append(anchor);
        return item;
      }));
      select.replaceChildren(...pages.map(({ label }, i) => new Option(label, String(i))));
    }
    select.value = String(index);
    const active = slideOutline.children[index].firstElementChild;
    slideOutline.querySelector("[aria-current]")?.removeAttribute("aria-current");
    active.setAttribute("aria-current", "step");
    breadcrumb.textContent = `Atlas / ${title}`;
    previous.disabled = index === 0;
    next.disabled = index === pages.length - 1;
    progress.max = pages.length;
    progress.value = index + 1;
    position.textContent = `${String(index + 1).padStart(2, "0")} / ${pages.length}`;
    closeDrawer();
    viewport.scrollTop = 0;
    if (!mobile.matches && !collapsed && !focused) active.scrollIntoView({ block: "nearest" });
    course.focus({ preventScroll: true });
  } else {
    if (focused) {
      setFocus(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
    closeDrawer();
    select.replaceChildren(...chapterOptions);
    if (course) {
      select.value = course.id;
      window.scrollTo(0, 0);
    } else if (last?.course) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    }
  }
}
previous.addEventListener("click", () => go(state.index - 1));
next.addEventListener("click", () => go(state.index + 1));
mode.addEventListener("click", () => {
  const course = state.course ?? courses.find(item => item.getBoundingClientRect().bottom > 100) ?? courses[0];
  location.hash = state.presenting ? course.id : slideHash(course, 0);
});
select.addEventListener("change", () => {
  if (state.presenting) go(Number(select.value));
  else location.hash = select.value;
});
window.addEventListener("hashchange", sync);

const searchable = courses.flatMap(course => {
  const { title, pages } = slides.get(course);
  return pages.map(({ label, section }, index) => ({
    title, label, href: slideHash(course, index), text: normalize(`${title} ${label} ${section.textContent}`),
  }));
});
function openSearch(trigger) {
  if (search.open || copyDialog.open) return;
  opener = trigger ?? document.activeElement;
  search.showModal();
  searchInput.focus();
  searchInput.select();
}
document.querySelectorAll("[data-open-search]").forEach(button => {
  button.addEventListener("click", () => openSearch(button));
});
for (const dialog of [search, copyDialog]) {
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
}
search.addEventListener("close", () => opener?.focus({ preventScroll: true }));
search.querySelector("form").addEventListener("submit", event => {
  event.preventDefault();
  if (!searchInput.value.trim()) return;
  const found = searchable.filter(entry => matches(entry.text, searchInput.value));
  search.querySelector("[role=status]").textContent = found.length ? `${found.length}개 슬라이드` : "검색 결과가 없습니다.";
  search.querySelector("ul").replaceChildren(...found.map(({ title, label, href }) => {
    const item = document.createElement("li");
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = `${title} · ${label}`;
    anchor.addEventListener("click", event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      search.close();
      if (location.hash === href) requestAnimationFrame(() => state.course.focus({ preventScroll: true }));
    });
    item.append(anchor);
    return item;
  }));
});
searchInput.addEventListener("keydown", event => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    search.querySelector("ul a")?.focus();
  }
});
copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    copyButton.textContent = "복사 완료";
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyButton.textContent = "링크 복사"; }, 1800);
  } catch {
    const address = copyDialog.querySelector("input");
    address.value = location.href;
    copyDialog.showModal();
    address.select();
  }
});

document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.isComposing) return;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && !event.altKey && key === "k") {
    event.preventDefault();
    openSearch();
    return;
  }
  if (!state.presenting || search.open || copyDialog.open || event.altKey || event.ctrlKey || event.metaKey ||
      event.target.closest("input, select, textarea, [contenteditable]")) return;
  if (key === "escape" && drawer) { closeDrawer(true); return; }
  if ((key === "escape" && focused) || key === "f") {
    event.preventDefault();
    toggleFocus();
    return;
  }
  if (key === "t") {
    event.preventDefault();
    document.querySelector(".reader-theme").click();
    return;
  }
  if (drawer || key === " " && event.target.closest("button, a, summary")) return;
  const destinations = {
    arrowleft: state.index - 1, pageup: state.index - 1,
    arrowright: state.index + 1, pagedown: state.index + 1, " ": state.index + 1,
    home: 0, end: state.module.pages.length - 1,
  };
  if (Object.hasOwn(destinations, key)) {
    event.preventDefault();
    go(destinations[key]);
  }
});
for (const code of document.querySelectorAll(".course pre > code")) {
  const button = document.createElement("button");
  button.textContent = "코드 복사";
  code.parentElement.before(button);
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent);
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
