(() => {
  const root = document.documentElement;
  const key = "kobong-theme";
  function restore() {
    try {
      root.dataset.theme = localStorage.getItem(key) === "dark" ? "dark" : "light";
    } catch {
      root.dataset.theme ||= "light";
    }
  }
  function updateButton() {
    const button = document.querySelector("[data-theme-toggle]");
    if (!button) return;
    const dark = root.dataset.theme === "dark";
    button.hidden = false;
    button.setAttribute("aria-pressed", String(dark));
    button.textContent = dark ? "☀ 라이트 모드" : "☾ 다크 모드";
  }
  function toggle() {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(key, root.dataset.theme); } catch {}
    updateButton();
  }
  restore();
  document.addEventListener("DOMContentLoaded", () => {
    updateButton();
    document.querySelector("[data-theme-toggle]")?.addEventListener("click", toggle);
  });
  window.addEventListener("storage", event => {
    if (event.key === key || event.key === null) {
      restore();
      updateButton();
    }
  });
})();
